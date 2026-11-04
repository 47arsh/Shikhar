import { NextRequest, NextResponse } from "next/server";
import { validateSkip } from "./schema";
import { prisma } from "@/lib/prisma";
import { kv } from "@/lib/kv";
import { env } from "@/lib/env";
import { GAME } from "@/config/game";

function getAnonId(req: NextRequest): string {
  return req.headers.get("x-anon-id") || req.cookies.get("anon_id")?.value || "anonymous";
}

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void env;

  const body = await req.json().catch(() => null);
  let input: { climbId: string; round: number };
  try {
    input = validateSkip(body);
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
    include: { rounds: { where: { round: input.round } } },
  });

  if (!climb) return NextResponse.json({ error: "Climb not found" }, { status: 404 });
  if (climb.outcome !== "in_progress") {
    return NextResponse.json({ error: "Climb already completed" }, { status: 400 });
  }

  const round = climb.rounds[0];
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  if (round.input != null || round.skipped) {
    return NextResponse.json({ error: "Round already answered or skipped" }, { status: 400 });
  }

  const skipsUsed = climb.rounds.filter((r) => r.skipped).length;
  if (skipsUsed >= GAME.skipsPerClimb) {
    return NextResponse.json({ error: "No skips left" }, { status: 400 });
  }

  await prisma.climbRound.update({
    where: { id: round.id },
    data: { skipped: true, points: 0, tier: "Everyone's answer" },
  });

  const allRounds = await prisma.climbRound.findMany({ where: { climbId: climb.id } });
  const completed = allRounds.filter((r) => r.input != null || r.skipped).length;

  let outcome = climb.outcome;
  if (completed >= GAME.roundsPerClimb) {
    outcome = "turned_back";
    await prisma.climb.update({
      where: { id: climb.id },
      data: { outcome: "turned_back", completedAt: new Date() },
    });
  }

  return NextResponse.json({
    result: "skipped",
    skipsLeft: GAME.skipsPerClimb - skipsUsed - 1,
    roundsCompleted: completed,
    outcome,
  });
}
