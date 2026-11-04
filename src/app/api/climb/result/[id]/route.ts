import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const climb = await prisma.climb.findUnique({
    where: { id },
    include: {
      rounds: {
        include: { prompt: true },
        orderBy: { round: "asc" },
      },
    },
  });

  if (!climb) {
    return NextResponse.json({ error: "Climb not found" }, { status: 404 });
  }

  const altitude = Math.round(
    Math.min(
      GAME_BASE + (climb.totalPoints * (SUMMIT - GAME_BASE)) / POINTS_TO_SUMMIT,
      SUMMIT
    )
  );

  return NextResponse.json({
    climbId: climb.id,
    mode: climb.mode,
    totalPoints: climb.totalPoints,
    outcome: climb.outcome,
    altitude,
    rounds: climb.rounds.map((r) => ({
      round: r.round,
      text: r.prompt.text,
      category: r.prompt.category,
      input: r.input,
      points: r.points,
      tier: r.tier,
      skipped: r.skipped,
    })),
  });
}

const GAME_BASE = 1780;
const SUMMIT = 8586;
const POINTS_TO_SUMMIT = 600;
