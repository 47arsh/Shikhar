import { normalizeInput } from "@/lib/normalize";
import { fuzzyMatch } from "@/lib/matching";
import { computePoints } from "@/lib/scoring";
import { Judge, createJudge, type EntityCandidate, type JudgeVerdict } from "@/lib/judge";
import { EntityLookup, createEntityLookup } from "@/lib/entity-lookup";
import { KeyValueStore, kv } from "@/lib/kv";
import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/sanitize";
import { GAME } from "@/config/game";

export interface SeededAnswer {
  id: string;
  canonicalName: string;
  aliases: string[];
  seededRarity: number | null;
  plays: number;
  source: string;
}

export interface PipelineInput {
  promptId: string;
  promptText: string;
  hint: string | null;
  userInput: string;
  anonId: string;
}

export interface PipelineResult {
  outcome: "matched" | "valid" | "uncertain" | "invalid" | "unverified";
  canonicalName?: string;
  answerId?: string;
  points?: number;
  tier?: string;
  firstAscent?: boolean;
  attemptsLeft?: number;
}

export interface AnswerPipelineDB {
  getSeededAnswers(promptId: string): Promise<SeededAnswer[]>;
  getJudgedAnswer(promptId: string, normalizedInput: string): Promise<{
    valid: boolean;
    canonicalName: string;
    entityId: string | null;
    confidence: number;
    reason: string;
    answerId: string | null;
  } | null>;
  createJudgedAnswer(data: {
    promptId: string;
    normalizedInput: string;
    valid: boolean;
    canonicalName: string;
    entityId: string | null;
    confidence: number;
    reason: string;
    answerId: string | null;
  }): Promise<void>;
  getAllAnswersWithSignals(promptId: string): Promise<Array<{
    seededRarity: number | null;
    popularitySignal: number | null;
    plays: number;
    source: string;
  }>>;
  upsertAnswer(data: {
    promptId: string;
    canonicalName: string;
    source: "judged" | "approved";
    entityId: string | null;
    popularitySignal: number | null;
    aliases: string[];
  }): Promise<{ id: string; canonicalName: string }>;
  incrementPlays(answerId: string): Promise<void>;
}

class PrismaAnswerPipelineDB implements AnswerPipelineDB {
  async getSeededAnswers(promptId: string): Promise<SeededAnswer[]> {
    const answers = await prisma.answer.findMany({
      where: { promptId },
      select: {
        id: true,
        canonicalName: true,
        aliases: true,
        seededRarity: true,
        plays: true,
        source: true,
      },
    });
    return answers.map((a) => ({
      id: a.id,
      canonicalName: a.canonicalName,
      aliases: (a.aliases as string[]) ?? [],
      seededRarity: a.seededRarity,
      plays: a.plays,
      source: a.source,
    }));
  }

  async getJudgedAnswer(promptId: string, normalizedInput: string) {
    const ja = await prisma.judgedAnswer.findUnique({
      where: { promptId_normalizedInput: { promptId, normalizedInput } },
    });
    if (!ja) return null;
    return {
      valid: ja.valid,
      canonicalName: ja.canonicalName,
      entityId: ja.entityId,
      confidence: ja.confidence,
      reason: ja.reason,
      answerId: ja.answerId ?? null,
    };
  }

  async createJudgedAnswer(data: {
    promptId: string;
    normalizedInput: string;
    valid: boolean;
    canonicalName: string;
    entityId: string | null;
    confidence: number;
    reason: string;
    answerId: string | null;
  }): Promise<void> {
    await prisma.judgedAnswer.create({
      data: {
        promptId: data.promptId,
        normalizedInput: data.normalizedInput,
        valid: data.valid,
        canonicalName: data.canonicalName,
        entityId: data.entityId,
        confidence: data.confidence,
        reason: data.reason,
        answerId: data.answerId,
      },
    });
  }

  async getAllAnswersWithSignals(promptId: string) {
    return prisma.answer.findMany({
      where: { promptId },
      select: { seededRarity: true, popularitySignal: true, plays: true, source: true },
    });
  }

  async upsertAnswer(data: {
    promptId: string;
    canonicalName: string;
    source: "judged" | "approved";
    entityId: string | null;
    popularitySignal: number | null;
    aliases: string[];
  }): Promise<{ id: string; canonicalName: string }> {
    if (data.entityId) {
      const existingByEntity = await prisma.answer.findFirst({
        where: { promptId: data.promptId, entityId: data.entityId },
      });
      if (existingByEntity) {
        return { id: existingByEntity.id, canonicalName: existingByEntity.canonicalName };
      }
    }
    const normName = normalizeInput(data.canonicalName);
    const allAnswers = await prisma.answer.findMany({
      where: { promptId: data.promptId },
    });
    const byName = allAnswers.find((a) => normalizeInput(a.canonicalName) === normName);
    if (byName) {
      return { id: byName.id, canonicalName: byName.canonicalName };
    }
    const created = await prisma.answer.create({
      data: {
        promptId: data.promptId,
        canonicalName: data.canonicalName,
        source: data.source,
        entityId: data.entityId,
        popularitySignal: data.popularitySignal,
        aliases: data.aliases,
        plays: 0,
      },
      select: { id: true, canonicalName: true },
    });
    return { id: created.id, canonicalName: created.canonicalName };
  }

  async incrementPlays(answerId: string): Promise<void> {
    await prisma.answer.update({
      where: { id: answerId },
      data: { plays: { increment: 1 } },
    });
  }
}

export class AnswerPipeline {
  constructor(
    private db: AnswerPipelineDB,
    private judge: Judge,
    private entityLookup: EntityLookup,
    private kv: KeyValueStore
  ) {}

  async run(input: PipelineInput): Promise<PipelineResult> {
    // 1. Sanitize
    const sanitized = sanitizeInput(input.userInput);
    if (!sanitized.ok) {
      return { outcome: "invalid", attemptsLeft: GAME.maxAttemptsPerRound - 1 };
    }
    const value = sanitized.value;
    const normalized = normalizeInput(value);

    // 2. Layer 1: seeded match (exact, alias, fuzzy)
    const seeded = await this.db.getSeededAnswers(input.promptId);
    const matched = this.layer1Match(normalized, seeded);
    if (matched) {
      const playKey = `play:${input.anonId}:${input.promptId}`;
      const alreadyPlayed = await this.kv.get(playKey);
      if (!alreadyPlayed) {
        await this.db.incrementPlays(matched.id);
        await this.kv.set(playKey, "1", 86400 * 30);
      }
      const score = computePoints(
        matched.seededRarity ?? null,
        matched.plays,
        matched.plays + 1,
        GAME.priorWeightK
      );
      return {
        outcome: "matched",
        answerId: matched.id,
        canonicalName: matched.canonicalName,
        points: score.points,
        tier: score.tier,
      };
    }

    // 3. Layer 2a: judged cache
    const cached = await this.db.getJudgedAnswer(input.promptId, normalized);
    if (cached) {
      if (cached.valid) {
        const score = computePoints(
          null,
          0,
          1,
          GAME.priorWeightK,
          GAME.neutralPriorRarity
        );
        return {
          outcome: "valid",
          answerId: cached.answerId ?? undefined,
          canonicalName: cached.canonicalName,
          points: score.points,
          tier: score.tier,
          firstAscent: cached.answerId == null,
        };
      }
      return { outcome: "invalid", attemptsLeft: GAME.maxAttemptsPerRound - 1 };
    }

    // 4. Layer 2b: candidate lookup
    let candidates: EntityCandidate[] = [];
    try {
      candidates = await this.entityLookup.lookup(value);
    } catch {
      // Entity lookup (e.g., Wikidata) is down — proceed without candidates
      candidates = [];
    }

    // 5. Layer 2c: judge (with cap and timeout)
    const capKey = `judge:daily:${new Date().toISOString().slice(0, 10)}`;
    const capCount = await this.kv.incr(capKey);
    if (capCount > GAME.judgeDailyCallCap) {
      return { outcome: "unverified", attemptsLeft: GAME.maxAttemptsPerRound - 1 };
    }

    let verdict: JudgeVerdict;
    try {
      verdict = await this.withTimeout(
        this.judge.judge(input.promptText, input.hint, value, candidates),
        GAME.judgeTimeoutMs
      );
    } catch {
      return { outcome: "unverified", attemptsLeft: GAME.maxAttemptsPerRound - 1 };
    }

    // 6. Store verdict
    const prior = this.derivePrior(verdict, candidates);
    let answerId: string | null = null;
    let firstAscent = false;

    if (verdict.valid) {
      const upserted = await this.db.upsertAnswer({
        promptId: input.promptId,
        canonicalName: verdict.canonicalName,
        source: "judged",
        entityId: verdict.entityId,
        popularitySignal: this.popularitySignal(candidates, verdict.entityId),
        aliases: [],
      });
      answerId = upserted.id;
      firstAscent = true;
      await this.db.incrementPlays(upserted.id);
    }

    await this.db.createJudgedAnswer({
      promptId: input.promptId,
      normalizedInput: normalized,
      valid: verdict.valid,
      canonicalName: verdict.canonicalName,
      entityId: verdict.entityId,
      confidence: verdict.confidence,
      reason: verdict.reason,
      answerId,
    });

    if (verdict.valid && answerId) {
      const score = computePoints(null, 1, 1, GAME.priorWeightK, prior);
      return {
        outcome: "valid",
        answerId,
        canonicalName: verdict.canonicalName,
        points: score.points,
        tier: score.tier,
        firstAscent,
      };
    }

    if (verdict.confidence >= GAME.judgeReviewConfidence) {
      return {
        outcome: "uncertain",
        canonicalName: verdict.canonicalName,
        attemptsLeft: GAME.maxAttemptsPerRound - 1,
      };
    }

    return { outcome: "invalid", attemptsLeft: GAME.maxAttemptsPerRound - 1 };
  }

  private layer1Match(
    normalized: string,
    answers: SeededAnswer[]
  ): SeededAnswer | null {
    for (const ans of answers) {
      if (normalizeInput(ans.canonicalName) === normalized) return ans;
      for (const alias of ans.aliases) {
        if (normalizeInput(alias) === normalized) return ans;
      }
    }
    if (!/[0-9]/.test(normalized)) {
      let best: { ans: SeededAnswer; dist: number } | null = null;
      for (const ans of answers) {
        const d = fuzzyMatch(normalized, normalizeInput(ans.canonicalName));
        if (d != null && (best === null || d < best.dist)) best = { ans, dist: d };
        for (const alias of ans.aliases) {
          const d2 = fuzzyMatch(normalized, normalizeInput(alias));
          if (d2 != null && (best === null || d2 < best.dist)) best = { ans, dist: d2 };
        }
      }
      if (best) return best.ans;
    }
    return null;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
  }

  private derivePrior(
    verdict: JudgeVerdict,
    candidates: EntityCandidate[]
  ): number | undefined {
    const signal = this.popularitySignal(candidates, verdict.entityId);
    if (signal == null) return GAME.neutralPriorRarity;
    return Math.max(1, Math.min(100, 100 - Math.min(signal, 99)));
  }

  private popularitySignal(
    candidates: EntityCandidate[],
    entityId: string | null
  ): number | null {
    if (!entityId) return null;
    const c = candidates.find((x) => x.id === entityId);
    return c?.sitelinkCount ?? null;
  }
}

export async function createPipeline(): Promise<AnswerPipeline> {
  const db: AnswerPipelineDB = new PrismaAnswerPipelineDB();
  // Mock adapters are used in development and tests (C.5 local-first rule).
  // Real adapters (LLM API, Wikidata) are selected by env vars in Phase 3.
  const judge: Judge = createJudge();
  const entityLookup: EntityLookup = createEntityLookup();
  const store: KeyValueStore = await kv;
  return new AnswerPipeline(db, judge, entityLookup, store);
}
