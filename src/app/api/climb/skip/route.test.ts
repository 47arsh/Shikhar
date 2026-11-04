import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  climb: {
    findUnique: vi.fn(),
  },
  climbRound: {
    update: vi.fn(),
    findMany: vi.fn(),
  },
}));

const mockKv = vi.hoisted(() => ({
  incr: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/kv", () => ({
  kv: mockKv,
}));

import { POST as skipPOST } from "./route";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/climb/skip", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockKv.incr.mockResolvedValue(1);
  mockPrisma.climb.findUnique.mockResolvedValue({
    id: "c1",
    outcome: "in_progress",
    rounds: [{ id: "r1", round: 1, input: null, skipped: false }],
  });
  mockPrisma.climbRound.update.mockResolvedValue({});
  mockPrisma.climbRound.findMany.mockResolvedValue([]);
});

describe("POST /api/climb/skip", () => {
  it("returns 400 for invalid body", async () => {
    const req = makeRequest({ climbId: "", round: 1 });
    const res = await skipPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockKv.incr.mockResolvedValue(31);
    const req = makeRequest({ climbId: "c1", round: 1 }, { "x-anon-id": "user-1" });
    const res = await skipPOST(req);
    expect(res.status).toBe(429);
  });

  it("returns 404 for missing climb", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue(null);
    const req = makeRequest({ climbId: "missing", round: 1 });
    const res = await skipPOST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 for completed climb", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "summited",
      rounds: [],
    });
    const req = makeRequest({ climbId: "c1", round: 1 });
    const res = await skipPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for round already answered or skipped", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      rounds: [{ id: "r1", round: 1, input: "ganga", skipped: false }],
    });
    const req = makeRequest({ climbId: "c1", round: 1 });
    const res = await skipPOST(req);
    expect(res.status).toBe(400);
  });

  it("skips a round successfully", async () => {
    mockPrisma.climbRound.findMany.mockResolvedValue([
      { id: "r1", round: 1, input: null, skipped: true },
    ]);

    const req = makeRequest({ climbId: "c1", round: 1 });
    const res = await skipPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBe("skipped");
    expect(mockPrisma.climbRound.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { skipped: true, points: 0, tier: "Everyone's answer" },
    });
  });

  it("returns 400 when no skips left", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      rounds: [
        { id: "r1", round: 1, input: null, skipped: false },
        { id: "r2", round: 2, input: null, skipped: true },
        { id: "r3", round: 3, input: null, skipped: true },
      ],
    });
    const req = makeRequest({ climbId: "c1", round: 1 });
    const res = await skipPOST(req);
    expect(res.status).toBe(400);
  });
});
