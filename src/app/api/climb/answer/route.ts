import { NextRequest, NextResponse } from "next/server";
import { validateAnswer } from "./schema";
import { prisma } from "@/lib/prisma";
import { kv } from "@/lib/kv";
import { env } from "@/lib/env";
import { GAME } from "@/config/game";
import { AnswerPipeline, createPipeline, type PipelineInput } from "@/lib/answer-pipeline";

function getAnonId(req: NextRequest): string {
  return req.headers.get("x-anon-id") || req.cookies.get("anon_id")?.value || "anonymous";
}

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
}

async function finalizeRoundAndClimb(
  climbId: string,
  roundId: string,
  attempts: number,
  points: number,
  tier: string,
  canonicalId: string | null,
  input: string,
  totalPointsBefore: number,
  roundsCount: number,
  roundsPerClimb: number,
  pointsToSummit: number,
  baseAltitudeM: number,
  summitAltitudeM: number,
) {
  const newTotal = totalPointsBefore + points;

  await prisma.climbRound.update({
    where: { id: roundId },
    data: {
      input,
      canonicalId,
      points,
      tier,
      attempts,
    },
  });

  const updatedClimb = await prisma.climb.update({
    where: { id: climbId },
    data: { totalPoints: newTotal },
  });

  let outcome = updatedClimb.outcome;
  if (newTotal >= pointsToSummit) {
    outcome = "summited";
    await prisma.climb.update({
      where: { id: climbId },
      data: { outcome: "summited", completedAt: new Date() },
    });
  } else if (roundsCount >= roundsPerClimb) {
    outcome = "turned_back";
    await prisma.climb.update({
      where: { id: climbId },
      data: { outcome: "turned_back", completedAt: new Date() },
    });
  }

  const altitude = Math.round(
    baseAltitudeM + (newTotal * (summitAltitudeM - baseAltitudeM)) / pointsToSummit
  );

  return {
    newTotal,
    outcome,
    altitude: Math.min(altitude, summitAltitudeM),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void env;

  const body = await req.json().catch(() => null);
  let input: { climbId: string; round: number; input: string };
  try {
    input = validateAnswer(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const anonId = getAnonId(req);
  const ip = getIp(req);
  const store = await kv;

  for (const key of [`rl:ip:${ip}`, `rl:anon:${anonId}`]) {
    const count = await store.incr(key, 60);
    if (count > 30) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
  }

  const climb = await prisma.climb.findUnique({
    where: { id: input.climbId },
    include: {
      rounds: { where: { round: input.round }, include: { prompt: true } },
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

  // Anti-poisoning: a round can only be answered once
  if (round.input != null || round.skipped) {
    return NextResponse.json({ error: "Round already answered or skipped" }, { status: 400 });
  }

  const pipeline: AnswerPipeline = await createPipeline();
  const pipelineInput: PipelineInput = {
    promptId: round.promptId,
    promptText: round.prompt.text,
    hint: round.prompt.hint,
    userInput: input.input,
    anonId,
  };

  const result = await pipeline.run(pipelineInput);

  // Scoring outcomes: matched or valid → award points
  if (result.outcome === "matched" || result.outcome === "valid") {
    const newAttempts = round.attempts + 1;
    const points = result.points ?? 0;
    const tier = result.tier ?? "Everyone's answer";

    const finish = await finalizeRoundAndClimb(
      climb.id,
      round.id,
      newAttempts,
      points,
      tier,
      result.answerId ?? null,
      input.input,
      climb.totalPoints,
      climb.rounds.length,
      GAME.roundsPerClimb,
      GAME.pointsToSummit,
      GAME.baseAltitudeM,
      GAME.summitAltitudeM,
    );

    return NextResponse.json({
      result: result.outcome,
      canonicalName: result.canonicalName,
      points,
      tier,
      firstAscent: result.firstAscent,
      altitude: finish.altitude,
      totalPoints: finish.newTotal,
      outcome: finish.outcome,
      roundsCompleted: climb.rounds.length,
    });
  }

  // Non-scoring outcomes: uncertain, invalid, unverified → count as attempt
  const newAttempts = round.attempts + 1;

  await prisma.climbRound.update({
    where: { id: round.id },
    data: { input: input.input, attempts: newAttempts },
  });

  if (newAttempts >= GAME.maxAttemptsPerRound) {
    await prisma.climbRound.update({
      where: { id: round.id },
      data: { points: 0, tier: "Everyone's answer" },
    });
    const allRounds = await prisma.climbRound.findMany({ where: { climbId: climb.id } });
    const answeredRounds = allRounds.filter((r) => r.input != null || r.skipped).length;
    if (answeredRounds >= GAME.roundsPerClimb) {
      await prisma.climb.update({
        where: { id: climb.id },
        data: { outcome: "turned_back", completedAt: new Date() },
      });
      return NextResponse.json({
        result: result.outcome,
        message: "We couldn't verify that one. Try another answer or skip.",
        attemptsLeft: 0,
        outcome: "turned_back",
      });
    }
    return NextResponse.json({
      result: result.outcome,
      message: "We couldn't verify that one. Try another answer or skip.",
      attemptsLeft: 0,
    });
  }

  return NextResponse.json({
    result: result.outcome,
    message: "We couldn't verify that one. Try another answer or skip.",
    attemptsLeft: GAME.maxAttemptsPerRound - newAttempts,
  });
}
