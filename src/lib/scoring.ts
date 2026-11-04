import { GAME } from "@/config/game";

export type TierLabel =
  | "Everyone's answer"
  | "Fairly common"
  | "Uncommon"
  | "Rare find";

export interface ScoreResult {
  points: number;
  rarityRatio: number; // 0..1, most common answer = 1
  tier: TierLabel;
}

export function computePoints(
  seededRarity: number | null,
  plays: number,
  topAdjustedCount: number,
  priorWeightK: number = GAME.priorWeightK,
  priorRarity?: number // overrides seededRarity for judged answers
): ScoreResult {
  const effectiveRarity = priorRarity ?? seededRarity ?? 0;
  const r0 = Math.pow(1 - effectiveRarity / 100, 2);
  const cPrime = plays + priorWeightK * r0;
  const top = Math.max(topAdjustedCount, 1);
  const r = Math.max(0, Math.min(1, cPrime / top));
  const points = Math.max(1, Math.min(100, Math.round(100 * (1 - Math.sqrt(r)))));

  let tier: TierLabel;
  if (points < 10) tier = "Everyone's answer";
  else if (points < 30) tier = "Fairly common";
  else if (points < 60) tier = "Uncommon";
  else tier = "Rare find";

  return { points, rarityRatio: r, tier };
}

/**
 * Derive a 1-100 rarity prior from a popularity signal (e.g. sitelink count)
 * by percentile among the known answers of a prompt. More obscure (lower
 * signal) means higher rarity. Returns null when no signal or no reference set.
 */
export function priorFromPopularitySignal(
  signal: number | null,
  allSignals: number[]
): number | null {
  if (signal == null || allSignals.length === 0) return null;
  const below = allSignals.filter((s) => s < signal).length;
  const percentile = below / allSignals.length;
  return 100 - Math.round(percentile * 99);
}

export function altitudeForPoints(totalPoints: number): number {
  const raw =
    GAME.baseAltitudeM +
    totalPoints * ((GAME.summitAltitudeM - GAME.baseAltitudeM) / GAME.pointsToSummit);
  return Math.min(Math.max(raw, GAME.baseAltitudeM), GAME.summitAltitudeM);
}

export function hasSummited(totalPoints: number): boolean {
  return totalPoints >= GAME.pointsToSummit;
}
