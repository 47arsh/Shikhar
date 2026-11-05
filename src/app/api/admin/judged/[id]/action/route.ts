import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const bodySchema = z.object({
  action: z.enum(["approve", "reject", "merge"]),
  answerId: z.string().optional(),
  canonicalName: z.string().optional(),
  source: z.enum(["approved"]).optional(),
  mergeIntoAnswerId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  void env;
  const secret = req.headers.get("x-admin-secret");
  if (secret !== env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  let input: { action: "approve" | "reject" | "merge"; answerId?: string; canonicalName?: string; mergeIntoAnswerId?: string };
  try {
    input = bodySchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const judged = await prisma.judgedAnswer.findUnique({
    where: { id },
    include: { prompt: true },
  });
  if (!judged) {
    return NextResponse.json({ error: "Judged answer not found" }, { status: 404 });
  }

  if (input.action === "reject") {
    // Mark as negative cache - already stored as valid=false, just mark reviewed
    await prisma.judgedAnswer.update({
      where: { id },
      data: { reason: judged.reason + " [rejected by admin]" },
    });
    return NextResponse.json({ ok: true, action: "reject" });
  }

  if (input.action === "merge") {
    if (!input.mergeIntoAnswerId) {
      return NextResponse.json({ error: "mergeIntoAnswerId required for merge" }, { status: 400 });
    }
    const targetAnswer = await prisma.answer.findUnique({
      where: { id: input.mergeIntoAnswerId },
    });
    if (!targetAnswer || targetAnswer.promptId !== judged.promptId) {
      return NextResponse.json({ error: "Target answer not found or wrong prompt" }, { status: 404 });
    }
    await prisma.judgedAnswer.update({
      where: { id },
      data: { answerId: targetAnswer.id, reason: judged.reason + " [merged by admin]" },
    });
    return NextResponse.json({ ok: true, action: "merge", answerId: targetAnswer.id });
  }

  // approve: create or link an Answer with source="approved"
  if (!input.canonicalName) {
    return NextResponse.json({ error: "canonicalName required for approve" }, { status: 400 });
  }

  let answerId: string;
  if (input.answerId) {
    // Link to existing answer
    const existing = await prisma.answer.findUnique({
      where: { id: input.answerId },
    });
    if (!existing || existing.promptId !== judged.promptId) {
      return NextResponse.json({ error: "Answer not found or wrong prompt" }, { status: 404 });
    }
    answerId = existing.id;
    await prisma.answer.update({
      where: { id: existing.id },
      data: { source: "approved" },
    });
  } else {
    // Create new approved answer
    const created = await prisma.answer.create({
      data: {
        promptId: judged.promptId,
        canonicalName: input.canonicalName,
        seededRarity: null,
        source: "approved",
        entityId: judged.entityId,
        popularitySignal: null,
        aliases: [],
        plays: 0,
      },
    });
    answerId = created.id;
  }

  await prisma.judgedAnswer.update({
    where: { id },
    data: { answerId, reason: judged.reason + " [approved by admin]" },
  });

  return NextResponse.json({ ok: true, action: "approve", answerId });
}
