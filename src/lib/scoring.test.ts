import { describe, expect, it } from "vitest";
import { computePoints, priorFromPopularitySignal } from "@/lib/scoring";
import { GAME } from "@/config/game";

const TOP = 100;

describe("computePoints", () => {
  it("zero plays with seeded rarity gives near-seeded score", () => {
    const common = computePoints(3, 0, TOP);
    const rare = computePoints(80, 0, TOP);
    expect(rare.points).toBeGreaterThan(common.points);
    expect(rare.tier).toBe("Rare find");
    expect(common.tier).toBe("Uncommon");
  });

  it("zero plays with null seeded rarity falls back to prior 0", () => {
    const r = computePoints(null, 0, TOP);
    expect(r.points).toBeGreaterThan(0);
    expect(r.points).toBeLessThan(100);
  });

  it("accumulated plays reduce points (dominance)", () => {
    const rareButPopular = computePoints(80, 200, TOP);
    const uncommonButRarePlayed = computePoints(30, 0, TOP);
    expect(uncommonButRarePlayed.points).toBeGreaterThan(rareButPopular.points);
  });

  it("priorRarity override for judged answers uses neutral prior", () => {
    const seededNull = computePoints(null, 0, TOP);
    const judgedNeutral = computePoints(
      null,
      0,
      TOP,
      GAME.priorWeightK,
      GAME.neutralPriorRarity
    );
    expect(judgedNeutral.points).toBeGreaterThan(seededNull.points);
  });

  it("clamps points to 1-100", () => {
    const low = computePoints(1, 1000, TOP);
    expect(low.points).toBeGreaterThanOrEqual(1);
    const high = computePoints(99, 0, TOP);
    expect(high.points).toBeLessThanOrEqual(100);
  });
});

describe("priorFromPopularitySignal", () => {
  it("returns null for null signal", () => {
    expect(priorFromPopularitySignal(null, [10, 20, 30])).toBeNull();
  });

  it("returns null for empty reference set", () => {
    expect(priorFromPopularitySignal(5, [])).toBeNull();
  });

  it("lowest signal gets highest rarity (100)", () => {
    expect(priorFromPopularitySignal(1, [1, 10, 100])).toBe(100);
  });

  it("highest signal gets lowest rarity", () => {
    expect(priorFromPopularitySignal(100, [1, 10, 100])).toBe(34);
  });

  it("mid signal maps proportionally", () => {
    // 10 is at the 33rd percentile of [1, 10, 100] → rarity ≈ 67
    expect(priorFromPopularitySignal(10, [1, 10, 100])).toBe(67);
  });
});
