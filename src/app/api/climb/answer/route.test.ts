import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  climb: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  climbRound: {
    update: vi.fn(),
    findMany: vi.fn(),
  },
  answer: {
    update: vi.fn(),
  },
  judgedAnswer: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  unmatchedSubmission: {
    upsert: vi.fn(),
  },
}));

const mockKv = vi.hoisted(() => ({
  incr: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/kv", () => ({
  kv: mockKv,
}));

vi.mock("@/lib/answer-pipeline", () => ({
  AnswerPipeline: vi.fn(),
  createPipeline: vi.fn(),
}));

import { POST as answerPOST } from "./route";
import { createPipeline, type AnswerPipeline } from "@/lib/answer-pipeline";

const mockPipeline = {
  run: vi.fn(),
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/climb/answer", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockKv.get.mockResolvedValue(null);
  mockKv.incr.mockResolvedValue(1);
  mockKv.set.mockResolvedValue(undefined);
  mockPrisma.climb.findUnique.mockResolvedValue(null);
  mockPrisma.climb.update.mockResolvedValue({ id: "c1", outcome: "in_progress", totalPoints: 0 });
  mockPrisma.climbRound.update.mockResolvedValue({});
  mockPrisma.climbRound.findMany.mockResolvedValue([]);
  mockPrisma.answer.update.mockResolvedValue({});
  mockPrisma.judgedAnswer.create.mockResolvedValue({});
  mockPrisma.unmatchedSubmission.upsert.mockResolvedValue({});
  vi.mocked(createPipeline).mockResolvedValue(mockPipeline as unknown as AnswerPipeline);
  mockPipeline.run.mockResolvedValue({
    outcome: "matched",
    canonicalName: "Ganga",
    answerId: "ans-1",
    points: 90,
    tier: "Rare find",
    firstAscent: false,
  });
});

describe("POST /api/climb/answer", () => {
  it("returns 400 for invalid body", async () => {
    const req = makeRequest({ climbId: "", round: 1, input: "" });
    const res = await answerPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockKv.incr.mockResolvedValue(31);
    const req = makeRequest({ climbId: "c1", round: 1, input: "ganga" }, { "x-anon-id": "user-1" });
    const res = await answerPOST(req);
    expect(res.status).toBe(429);
  });

  it("returns 404 for missing climb", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue(null);
    const req = makeRequest({ climbId: "missing", round: 1, input: "ganga" });
    const res = await answerPOST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 for completed climb", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "summited",
      rounds: [],
      totalPoints: 600,
    });
    const req = makeRequest({ climbId: "c1", round: 1, input: "ganga" });
    const res = await answerPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for round already answered", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      totalPoints: 0,
      rounds: [{ id: "r1", round: 1, input: "ganga", skipped: false, prompt: { id: "p1", text: "Name a river", hint: null } }],
    });
    const req = makeRequest({ climbId: "c1", round: 1, input: "yamuna" });
    const res = await answerPOST(req);
    expect(res.status).toBe(400);
  });

  it("handles matched seeded answer", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      totalPoints: 0,
      rounds: [{ id: "r1", round: 1, input: null, skipped: false, prompt: { id: "p1", text: "Name a river", hint: null } }],
    });
    mockPipeline.run.mockResolvedValue({
      outcome: "matched",
      canonicalName: "Ganga",
      answerId: "ans-1",
      points: 90,
      tier: "Rare find",
      firstAscent: false,
    });

    const req = makeRequest({ climbId: "c1", round: 1, input: "ganga" });
    const res = await answerPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBe("matched");
    expect(json.canonicalName).toBe("Ganga");
    expect(json.points).toBe(90);
    expect(mockPrisma.climbRound.update).toHaveBeenCalled();
  });

  it("handles valid judged answer with first ascent", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      totalPoints: 0,
      rounds: [{ id: "r1", round: 1, input: null, skipped: false, prompt: { id: "p1", text: "Name a river", hint: null } }],
    });
    mockPipeline.run.mockResolvedValue({
      outcome: "valid",
      canonicalName: "Brahmaputra",
      answerId: "ans-new",
      points: 80,
      tier: "Uncommon",
      firstAscent: true,
    });

    const req = makeRequest({ climbId: "c1", round: 1, input: "brahmaputra" });
    const res = await answerPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBe("valid");
    expect(json.firstAscent).toBe(true);
    expect(json.canonicalName).toBe("Brahmaputra");
  });

  it("handles uncertain judge verdict", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      totalPoints: 0,
      rounds: [{ id: "r1", round: 1, input: null, skipped: false, prompt: { id: "p1", text: "Name a river", hint: null }, attempts: 0 }],
    });
    mockPipeline.run.mockResolvedValue({
      outcome: "uncertain",
      canonicalName: "Some River",
      attemptsLeft: 4,
    });

    const req = makeRequest({ climbId: "c1", round: 1, input: "some river" });
    const res = await answerPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBe("uncertain");
    expect(json.message).toBe("We couldn't verify that one. Try another answer or skip.");
    expect(json.attemptsLeft).toBe(4);
  });

  it("handles invalid input", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      totalPoints: 0,
      rounds: [{ id: "r1", round: 1, input: null, skipped: false, prompt: { id: "p1", text: "Name a river", hint: null }, attempts: 0 }],
    });
    mockPipeline.run.mockResolvedValue({
      outcome: "invalid",
      attemptsLeft: 4,
    });

    const req = makeRequest({ climbId: "c1", round: 1, input: "asdfghjkl" });
    const res = await answerPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBe("invalid");
    expect(json.message).toBe("We couldn't verify that one. Try another answer or skip.");
  });

  it("handles unverified (judge timeout/cap)", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      totalPoints: 0,
      rounds: [{ id: "r1", round: 1, input: null, skipped: false, prompt: { id: "p1", text: "Name a river", hint: null }, attempts: 0 }],
    });
    mockPipeline.run.mockResolvedValue({
      outcome: "unverified",
      attemptsLeft: 4,
    });

    const req = makeRequest({ climbId: "c1", round: 1, input: "__timeout__" });
    const res = await answerPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBe("unverified");
  });

  it("returns out of attempts when max attempts reached", async () => {
    mockPrisma.climb.findUnique.mockResolvedValue({
      id: "c1",
      outcome: "in_progress",
      totalPoints: 0,
      rounds: [{ id: "r1", round: 1, input: null, skipped: false, prompt: { id: "p1", text: "Name a river", hint: null }, attempts: 4 }],
    });
    mockPrisma.climbRound.findMany.mockResolvedValue([
      { id: "r1", input: "x", skipped: false },
    ]);
    mockPipeline.run.mockResolvedValue({
      outcome: "invalid",
      attemptsLeft: 0,
    });

    const req = makeRequest({ climbId: "c1", round: 1, input: "invalid" });
    const res = await answerPOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.attemptsLeft).toBe(0);
    expect(mockPrisma.climbRound.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { points: 0, tier: "Everyone's answer" },
    });
  });

  it("rejects input over max length", async () => {
    const longInput = "a".repeat(61);
    const req = makeRequest({ climbId: "c1", round: 1, input: longInput });
    const res = await answerPOST(req);
    expect(res.status).toBe(400);
  });
});
