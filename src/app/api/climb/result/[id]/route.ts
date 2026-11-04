import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GAME } from "@/config/game";

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
      GAME.baseAltitudeM +
        (climb.totalPoints * (GAME.summitAltitudeM - GAME.baseAltitudeM)) /
          GAME.pointsToSummit,
      GAME.summitAltitudeM
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
