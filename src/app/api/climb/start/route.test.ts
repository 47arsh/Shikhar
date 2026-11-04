import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  climb: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  prompt: {
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

import { POST as startPOST } from "./route";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/climb/start", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockKv.incr.mockResolvedValue(1);
  mockPrisma.climb.findFirst.mockResolvedValue(null);
  mockPrisma.prompt.findMany.mockResolvedValue([
    { id: "p1", category: "geography", text: "Name a river", hint: null },
    { id: "p2", category: "geography", text: "Name a mountain", hint: null },
    { id: "p3", category: "food", text: "Name a dish", hint: null },
    { id: "p4", category: "food", text: "Name a spice", hint: null },
    { id: "p5", category: "music", text: "Name an instrument", hint: null },
    { id: "p6", category: "music", text: "Name a raga", hint: null },
    { id: "p7", category: "cricket", text: "Name a captain", hint: null },
    { id: "p8", category: "cricket", text: "Name a stadium", hint: null },
    { id: "p9", category: "history", text: "Name a freedom fighter", hint: null },
    { id: "p10", category: "history", text: "Name a monument", hint: null },
  ]);
});

describe("POST /api/climb/start", () => {
  it("returns 400 for invalid body", async () => {
    const req = makeRequest({ mode: "invalid" });
    const res = await startPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockKv.incr.mockResolvedValue(31);
    const req = makeRequest({ mode: "daily" }, { "x-anon-id": "user-1" });
    const res = await startPOST(req);
    expect(res.status).toBe(429);
  });

  it("starts a daily climb with prompts from different categories", async () => {
    mockPrisma.climb.create.mockResolvedValue({
      id: "c1",
      rounds: [
        { round: 1, promptId: "p1", prompt: { id: "p1", text: "Name a river", hint: null, category: "geography" } },
        { round: 2, promptId: "p3", prompt: { id: "p3", text: "Name a dish", hint: null, category: "food" } },
        { round: 3, promptId: "p5", prompt: { id: "p5", text: "Name an instrument", hint: null, category: "music" } },
        { round: 4, promptId: "p7", prompt: { id: "p7", text: "Name a captain", hint: null, category: "cricket" } },
        { round: 5, promptId: "p9", prompt: { id: "p9", text: "Name a freedom fighter", hint: null, category: "history" } },
      ],
    });

    const req = makeRequest({ mode: "daily" }, { "x-anon-id": "user-1" });
    const res = await startPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.climbId).toBe("c1");
    expect(json.prompts.length).toBeGreaterThan(0);
    expect(mockPrisma.climb.create).toHaveBeenCalled();
  });

  it("rejects second daily start for same anonId/day", async () => {
    mockPrisma.climb.findFirst.mockResolvedValue({
      id: "existing",
      mode: "daily",
      dateKey: "2026-11-04",
    });

    const req = makeRequest({ mode: "daily" }, { "x-anon-id": "user-1" });
    const res = await startPOST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe("Daily climb already started today");
  });

  it("starts a free climb with random prompts", async () => {
    mockPrisma.climb.create.mockResolvedValue({
      id: "c2",
      rounds: [
        { round: 1, promptId: "p1", prompt: { id: "p1", text: "Name a river", hint: null, category: "geography" } },
      ],
    });

    const req = makeRequest({ mode: "free" }, { "x-anon-id": "user-1" });
    const res = await startPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.climbId).toBe("c2");
    expect(json.prompts.length).toBeGreaterThan(0);
  });
});
