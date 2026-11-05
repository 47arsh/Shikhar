import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const promptId = searchParams.get("promptId");

  const where = promptId ? { promptId } : {};

  const answers = await prisma.answer.findMany({
    where,
    select: {
      id: true,
      canonicalName: true,
      plays: true,
      seededRarity: true,
      source: true,
      promptId: true,
    },
    orderBy: { plays: "desc" },
    take: 100,
  });

  return NextResponse.json({ answers });
}
