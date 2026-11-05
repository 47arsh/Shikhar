"use server";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

interface JudgedAnswer {
  id: string;
  promptId: string;
  normalizedInput: string;
  valid: boolean;
  canonicalName: string;
  entityId: string | null;
  confidence: number;
  reason: string;
  answerId: string | null;
  createdAt: Date;
  prompt: {
    id: string;
    text: string;
    category: string;
  };
}

export async function getJudgedAnswers(secret: string): Promise<{
  judged: JudgedAnswer[];
  error: string | null;
  authed: boolean;
}> {
  if (secret !== env.ADMIN_SECRET) {
    return { judged: [], error: "Unauthorized", authed: false };
  }

  try {
    const judged = await prisma.judgedAnswer.findMany({
      where: { answerId: null },
      include: { prompt: true },
      orderBy: [{ confidence: "asc" }, { createdAt: "desc" }],
      take: 50,
    });
    return { judged, error: null, authed: true };
  } catch (err) {
    return {
      judged: [],
      error: err instanceof Error ? err.message : "Failed to load review queue",
      authed: true,
    };
  }
}

export async function approveJudged(
  secret: string,
  id: string,
  canonicalName: string
): Promise<{ ok: boolean; error: string | null }> {
  if (secret !== env.ADMIN_SECRET) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const judged = await prisma.judgedAnswer.findUnique({
      where: { id },
    });
    if (!judged) return { ok: false, error: "Judged answer not found" };

    let answerId: string;
    const existing = await prisma.answer.findFirst({
      where: {
        promptId: judged.promptId,
        canonicalName,
      },
    });
    if (existing) {
      answerId = existing.id;
      await prisma.answer.update({
        where: { id: existing.id },
        data: { source: "approved" },
      });
    } else {
      const created = await prisma.answer.create({
        data: {
          promptId: judged.promptId,
          canonicalName,
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
    return { ok: true, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Approve failed",
    };
  }
}

export async function rejectJudged(
  secret: string,
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  if (secret !== env.ADMIN_SECRET) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const judged = await prisma.judgedAnswer.findUnique({
      where: { id },
    });
    if (!judged) return { ok: false, error: "Judged answer not found" };

    await prisma.judgedAnswer.update({
      where: { id },
      data: { reason: judged.reason + " [rejected by admin]" },
    });
    return { ok: true, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Reject failed",
    };
  }
}

export async function mergeJudged(
  secret: string,
  id: string,
  mergeIntoAnswerId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (secret !== env.ADMIN_SECRET) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const judged = await prisma.judgedAnswer.findUnique({
      where: { id },
    });
    if (!judged) return { ok: false, error: "Judged answer not found" };

    const target = await prisma.answer.findUnique({
      where: { id: mergeIntoAnswerId },
    });
    if (!target || target.promptId !== judged.promptId) {
      return { ok: false, error: "Target answer not found or wrong prompt" };
    }

    await prisma.judgedAnswer.update({
      where: { id },
      data: {
        answerId: mergeIntoAnswerId,
        reason: judged.reason + " [merged by admin]",
      },
    });
    return { ok: true, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Merge failed",
    };
  }
}
