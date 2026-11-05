import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  answer: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  prompt: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { recomputeRarityForPrompt, recomputeAllRarity } from "@/lib/rarity";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("recomputeRarityForPrompt", () => {
  it("returns 0 for empty prompt", async () => {
    mockPrisma.answer.findMany.mockResolvedValue([]);
    const result = await recomputeRarityForPrompt("prompt-1");
    expect(result).toBe(0);
    expect(mockPrisma.answer.update).not.toHaveBeenCalled();
  });

  it("computes cached rarity for seeded answers with plays", async () => {
    mockPrisma.answer.findMany.mockResolvedValue([
      { id: "a1", canonicalName: "Ganga", seededRarity: 2, plays: 0 },
      { id: "a2", canonicalName: "Yamuna", seededRarity: 9, plays: 5 },
    ]);
    mockPrisma.answer.update.mockResolvedValue({});

    const result = await recomputeRarityForPrompt("prompt-1");
    expect(result).toBe(2);
    expect(mockPrisma.answer.update).toHaveBeenCalledTimes(2);

    // First update should be for Ganga (rarity 2, 0 plays)
    const [firstCall] = mockPrisma.answer.update.mock.calls[0];
    expect(firstCall.where.id).toBe("a1");
    expect(firstCall.data.cachedRarity).toBeGreaterThan(0);
    expect(firstCall.data.cachedRarity).toBeLessThanOrEqual(100);

    // Second update for Yamuna (rarity 9, 5 plays)
    const [secondCall] = mockPrisma.answer.update.mock.calls[1];
    expect(secondCall.where.id).toBe("a2");
    expect(secondCall.data.cachedRarity).toBeGreaterThan(0);
    expect(secondCall.data.cachedRarity).toBeLessThanOrEqual(100);
  });

  it("clamps rarity to 1-100", async () => {
    mockPrisma.answer.findMany.mockResolvedValue([
      { id: "a1", canonicalName: "Common", seededRarity: 1, plays: 1000 },
      { id: "a2", canonicalName: "Rare", seededRarity: 99, plays: 0 },
    ]);
    mockPrisma.answer.update.mockResolvedValue({});

    await recomputeRarityForPrompt("prompt-1");

    const calls = mockPrisma.answer.update.mock.calls.map(
      (c) => c[0].data.cachedRarity
    );
    for (const rarity of calls) {
      expect(rarity).toBeGreaterThanOrEqual(1);
      expect(rarity).toBeLessThanOrEqual(100);
    }
  });
});

describe("recomputeAllRarity", () => {
  it("recomputes for all prompts", async () => {
    mockPrisma.prompt.findMany.mockResolvedValue([
      { id: "p1" },
      { id: "p2" },
    ]);
    mockPrisma.answer.findMany.mockResolvedValue([
      { id: "a1", canonicalName: "X", seededRarity: 5, plays: 0 },
    ]);
    mockPrisma.answer.update.mockResolvedValue({});

    const result = await recomputeAllRarity();
    expect(result).toBe(2);
    expect(mockPrisma.prompt.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.answer.update).toHaveBeenCalledTimes(2);
  });

  it("returns 0 when no prompts exist", async () => {
    mockPrisma.prompt.findMany.mockResolvedValue([]);
    const result = await recomputeAllRarity();
    expect(result).toBe(0);
  });
});
