import { NextRequest, NextResponse } from "next/server";
import { validateAnswer } from "./schema";
import { prisma } from "@/lib/prisma";
import { kv } from "@/lib/kv";
import { env } from "@/lib/env";
import { GAME } from "@/config/game";
import { normalizeInput } from "@/lib/normalize";
import { fuzzyMatch } from "@/lib/matching";
import { computePoints } from "@/lib/scoring";

function getAnonId(req: NextRequest): string {
  return req.headers.get("x-anon-id") || req.cookies.get("anon_id")?.value || "anonymous";
}

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  env;

  const body = await req.json().catch(() => null);
  let input: { climbId: string; round: number; input: string };
  try {
    input = validateAnswer(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const anonId = getAnonId(req);
  const ip = getIp(req);

  for (const key of [`rl:ip:${ip}`, `rl:anon:${anonId}`]) {
    const count = await kv.incr(key, 60);
    if (count > 30) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
  }

  const climb = await prisma.climb.findUnique({
    where: { id: input.climbId },
    include: {
      rounds: { where: { round: input.round }, include: { prompt: { include: { answers: true } } } },
    },
  });

  if (!climb) {
    return NextResponse.json({ error: "Climb not found" }, { status: 404 });
  }
  if (climb.outcome !== "in_progress") {
    return NextResponse.json({ error: "Climb already completed" }, { status: 400 });
  }
  const round = climb.rounds[0];
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const normalized = normalizeInput(input.input);
  const answers = round.prompt.answers;

  // Exact match against canonical names and aliases
  let matchedAnswer: (typeof answers)[number] | null = null;
  for (const ans of answers) {
    if (normalizeInput(ans.canonicalName) === normalized) {
      matchedAnswer = ans;
      break;
    }
    for (const alias of (ans.aliases as string[])) {
      if (normalizeInput(alias) === normalized) {
        matchedAnswer = ans;
        break;
      }
    }
    if (matchedAnswer) break;
  }

  if (!matchedAnswer) {
    // Fuzzy match (skip if input/key contains digits)
    if (!/\d/.test(normalized)) {
      let best: { ans: (typeof answers)[number]; dist: number } | null = null;
      for (const ans of answers) {
        const d = fuzzyMatch(normalized, normalizeInput(ans.canonicalName));
        if (d != null && (best === null || d < best.dist)) best = { ans, dist: d };
        for (const alias of (ans.aliases as string[])) {
          const d2 = fuzzyMatch(normalized, normalizeInput(alias));
          if (d2 != null && (best === null || d2 < best.dist)) best = { ans: ans, dist: d2 };
        }
      }
      if (best) matchedAnswer = best.ans;
    }
  }

  if (matchedAnswer) {
    // Anti-poisoning: increment plays only first time anonId answers this prompt
    const playKey = `play:${anonId}:${round.promptId}`;
    const alreadyPlayed = await kv.get(playKey);
    if (!alreadyPlayed) {
      await prisma.answer.update({
        where: { id: matchedAnswer.id },
        data: { plays: { increment: 1 } },
      });
      await kv.set(playKey, "1", 86400 * 30);
    }

    const score = computePoints(
      matchedAnswer.seededRarity ?? null,
      matchedAnswer.plays,
      matchedAnswer.plays + 1
    );

    const updatedRound = await prisma.climbRound.update({
      where: { id: round.id },
      data: {
        input: input.input,
        canonicalId: matchedAnswer.id,
        points: score.points,
        tier: score.tier,
        attempts: round.attempts + 1,
      },
    });

    const newTotal = climb.totalPoints + score.points;
    const updatedClimb = await prisma.climb.update({
      where: { id: climb.id },
      data: { totalPoints: newTotal },
    });

    let outcome = updatedClimb.outcome;
    if (newTotal >= GAME.pointsToSummit) {
      outcome = "summited";
      await prisma.climb.update({
        where: { id: climb.id },
        data: { outcome: "summited", completedAt: new Date() },
      });
    } else if (climb.rounds.length >= GAME.roundsPerClimb) {
      outcome = "turned_back";
      await prisma.climb.update({
        where: { id: climb.id },
        data: { outcome: "turned_back", completedAt: new Date() },
      });
    }

    const altitude = Math.round(
      GAME.baseAltitudeM + (newTotal * (GAME.summitAltitudeM - GAME.baseAltitudeM)) / GAME.pointsToSummit
    );

    return NextResponse.json({
      result: "matched",
      canonicalName: matchedAnswer.canonicalName,
      points: score.points,
      tier: score.tier,
      altitude: Math.min(altitude, GAME.summitAltitudeM),
      totalPoints: newTotal,
      outcome,
      roundsCompleted: climb.rounds.length,
    });
  }

  // Unmatched
  const newAttempts = round.attempts + 1;
  await prisma.climbRound.update({
    where: { id: round.id },
    data: { input: input.input, attempts: newAttempts },
  });

  await prisma.unmatchedSubmission.upsert({
    where: { promptId_normalizedInput: { promptId: round.promptId, normalizedInput: normalized } },
    update: { count: { increment: 1 }, lastSeen: new Date() },
    create: { promptId: round.promptId, normalizedInput: normalized },
  });

  if (newAttempts >= GAME.maxAttemptsPerRound) {
    // Auto-score 0, move to next round or end
    await prisma.climbRound.update({
      where: { id: round.id },
      data: { points: 0, tier: "Everyone's answer" },
    });
    const allRounds = await prisma.climbRound.findMany({ where: { climbId: climb.id } });
    if (allRounds.filter((r) => r.input != null).length >= GAME.roundsPerClimb) {
      await prisma.climb.update({
        where: { id: climb.id },
        data: { outcome: "turned_back", completedAt: new Date() },
      });
      return NextResponse.json({ result: "out_of_attempts", attemptsLeft: 0, outcome: "turned_back" });
    }
    return NextResponse.json({ result: "out_of_attempts", attemptsLeft: 0 });
  }

  return NextResponse.json({
    result: "unmatched",
    attemptsLeft: GAME.maxAttemptsPerRound - newAttempts,
  });
}
