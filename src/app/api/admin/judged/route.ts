import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const querySchema = z.object({
  unreviewedOnly: z.enum(["true", "false"]).optional().default("true"),
  minConfidence: z.string().optional().default("0"),
  maxConfidence: z.string().optional().default("1"),
  take: z.string().optional().default("50"),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  void env;
  const secret = req.headers.get("x-admin-secret");
  if (secret !== env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    unreviewedOnly: searchParams.get("unreviewedOnly") ?? undefined,
    minConfidence: searchParams.get("minConfidence") ?? undefined,
    maxConfidence: searchParams.get("maxConfidence") ?? undefined,
    take: searchParams.get("take") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  const { unreviewedOnly, minConfidence, maxConfidence, take } = parsed.data;

  const where: Record<string, unknown> = {};
  if (unreviewedOnly === "true") {
    where.answerId = null; // not yet linked to an Answer = needs review
  }
  where.confidence = {
    gte: parseFloat(minConfidence),
    lte: parseFloat(maxConfidence),
  };

  const judged = await prisma.judgedAnswer.findMany({
    where,
    include: { prompt: true },
    orderBy: [{ confidence: "asc" }, { createdAt: "desc" }],
    take: parseInt(take),
  });

  return NextResponse.json({ judged });
}
