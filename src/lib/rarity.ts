import { prisma } from "@/lib/prisma";
import { GAME } from "@/config/game";
import { computePoints } from "@/lib/scoring";

/**
 * Recompute cached rarity for all answers in a prompt based on current plays.
 * Uses the scoring formula: points = clamp(round(100 * (1 - sqrt(r_i))), 1, 100)
 * where r_i = (plays_i + K * r0_i) / top', r0_i = (1 - seededRarity/100)^2.
 *
 * Returns the number of answers updated.
 */
export async function recomputeRarityForPrompt(promptId: string): Promise<number> {
  const answers = await prisma.answer.findMany({
    where: { promptId },
    select: { id: true, canonicalName: true, seededRarity: true, plays: true },
  });

  if (answers.length === 0) return 0;

  const K = GAME.priorWeightK;

  // Compute adjusted counts for all answers
  const adjustedCounts = answers.map((a) => {
    const r0 = a.seededRarity == null ? 0 : Math.pow(1 - a.seededRarity / 100, 2);
    return a.plays + K * r0;
  });

  const topAdjusted = Math.max(...adjustedCounts, 1);

  const updates = answers.map((a) => {
    const score = computePoints(a.seededRarity, a.plays, topAdjusted, K);
    return prisma.answer.update({
      where: { id: a.id },
      data: { cachedRarity: score.points },
    });
  });

  await Promise.all(updates);
  return answers.length;
}

/**
 * Recompute cached rarity for all prompts.
 * Returns total number of answers updated across all prompts.
 */
export async function recomputeAllRarity(): Promise<number> {
  const prompts = await prisma.prompt.findMany({
    select: { id: true },
  });

  let total = 0;
  for (const p of prompts) {
    total += await recomputeRarityForPrompt(p.id);
  }
  return total;
}
