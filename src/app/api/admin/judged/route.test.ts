import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  judgedAnswer: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  answer: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  prompt: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as judgedGET } from "./route";
import { POST as judgedPOST } from "./[id]/action/route";

function makeRequest(url: string, headers: Record<string, string> = {}) {
  const h = new Headers(headers);
  return new NextRequest(url, {
    method: "GET",
    headers: h,
  });
}

function makePostRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  const h = new Headers(headers);
  h.set("content-type", "application/json");
  return new NextRequest(url, {
    method: "POST",
    headers: h,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/judged", () => {
  it("returns 401 without admin secret", async () => {
    const req = makeRequest("http://localhost:3000/api/admin/judged");
    const res = await judgedGET(req);
    expect(res.status).toBe(401);
  });

  it("returns judged answers with valid secret", async () => {
    mockPrisma.judgedAnswer.findMany.mockResolvedValue([
      {
        id: "ja-1",
        promptId: "p1",
        normalizedInput: "ganga",
        valid: true,
        canonicalName: "Ganga",
        entityId: "Q123",
        confidence: 0.95,
        reason: "Matched known entity",
        answerId: null,
        createdAt: new Date(),
        prompt: { id: "p1", text: "Name a river", category: "geography" },
      },
    ]);

    const req = makeRequest(
      "http://localhost:3000/api/admin/judged?unreviewedOnly=true&take=10",
      { "x-admin-secret": "dev-secret" }
    );
    const res = await judgedGET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.judged.length).toBe(1);
    expect(json.judged[0].canonicalName).toBe("Ganga");
    expect(mockPrisma.judgedAnswer.findMany).toHaveBeenCalledWith({
      where: { answerId: null, confidence: { gte: 0, lte: 1 } },
      include: { prompt: true },
      orderBy: [{ confidence: "asc" }, { createdAt: "desc" }],
      take: 10,
    });
  });

  it("filters by confidence range", async () => {
    mockPrisma.judgedAnswer.findMany.mockResolvedValue([]);
    const req = makeRequest(
      "http://localhost:3000/api/admin/judged?minConfidence=0.5&maxConfidence=0.8",
      { "x-admin-secret": "dev-secret" }
    );
    await judgedGET(req);
    expect(mockPrisma.judgedAnswer.findMany).toHaveBeenCalledWith({
      where: { answerId: null, confidence: { gte: 0.5, lte: 0.8 } },
      include: { prompt: true },
      orderBy: [{ confidence: "asc" }, { createdAt: "desc" }],
      take: 50,
    });
  });
});

describe("POST /api/admin/judged/[id]/action", () => {
  it("returns 401 without admin secret", async () => {
    const req = makePostRequest(
      "http://localhost:3000/api/admin/judged/ja-1/action",
      { action: "reject" }
    );
    const res = await judgedPOST(req, { params: Promise.resolve({ id: "ja-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent judged answer", async () => {
    mockPrisma.judgedAnswer.findUnique.mockResolvedValue(null);
    const req = makePostRequest(
      "http://localhost:3000/api/admin/judged/ja-1/action",
      { action: "reject" },
      { "x-admin-secret": "dev-secret" }
    );
    const res = await judgedPOST(req, { params: Promise.resolve({ id: "ja-1" }) });
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe("Judged answer not found");
  });

  it("reject marks judged answer", async () => {
    mockPrisma.judgedAnswer.findUnique.mockResolvedValue({
      id: "ja-1",
      promptId: "p1",
      reason: "Not valid",
    });
    mockPrisma.judgedAnswer.update.mockResolvedValue({});

    const req = makePostRequest(
      "http://localhost:3000/api/admin/judged/ja-1/action",
      { action: "reject" },
      { "x-admin-secret": "dev-secret" }
    );
    const res = await judgedPOST(req, { params: Promise.resolve({ id: "ja-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("reject");
    expect(mockPrisma.judgedAnswer.update).toHaveBeenCalledWith({
      where: { id: "ja-1" },
      data: { reason: "Not valid [rejected by admin]" },
    });
  });

  it("approve creates new approved answer", async () => {
    mockPrisma.judgedAnswer.findUnique.mockResolvedValue({
      id: "ja-1",
      promptId: "p1",
      reason: "Valid answer",
      entityId: "Q123",
    });
    mockPrisma.answer.findFirst.mockResolvedValue(null);
    mockPrisma.answer.create.mockResolvedValue({ id: "ans-new" });
    mockPrisma.judgedAnswer.update.mockResolvedValue({});

    const req = makePostRequest(
      "http://localhost:3000/api/admin/judged/ja-1/action",
      { action: "approve", canonicalName: "Ganga" },
      { "x-admin-secret": "dev-secret" }
    );
    const res = await judgedPOST(req, { params: Promise.resolve({ id: "ja-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("approve");
    expect(mockPrisma.answer.create).toHaveBeenCalledWith({
      data: {
        promptId: "p1",
        canonicalName: "Ganga",
        seededRarity: null,
        source: "approved",
        entityId: "Q123",
        popularitySignal: null,
        aliases: [],
        plays: 0,
      },
    });
  });

  it("merge links to existing answer", async () => {
    mockPrisma.judgedAnswer.findUnique.mockResolvedValue({
      id: "ja-1",
      promptId: "p1",
      reason: "Valid answer",
    });
    mockPrisma.answer.findUnique.mockResolvedValue({
      id: "ans-existing",
      promptId: "p1",
    });
    mockPrisma.judgedAnswer.update.mockResolvedValue({});

    const req = makePostRequest(
      "http://localhost:3000/api/admin/judged/ja-1/action",
      { action: "merge", mergeIntoAnswerId: "ans-existing" },
      { "x-admin-secret": "dev-secret" }
    );
    const res = await judgedPOST(req, { params: Promise.resolve({ id: "ja-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.action).toBe("merge");
    expect(json.answerId).toBe("ans-existing");
    expect(mockPrisma.judgedAnswer.update).toHaveBeenCalledWith({
      where: { id: "ja-1" },
      data: { answerId: "ans-existing", reason: "Valid answer [merged by admin]" },
    });
  });

  it("merge with wrong prompt returns 404", async () => {
    mockPrisma.judgedAnswer.findUnique.mockResolvedValue({
      id: "ja-1",
      promptId: "p1",
      reason: "Valid answer",
    });
    mockPrisma.answer.findUnique.mockResolvedValue({
      id: "ans-wrong",
      promptId: "p2",
    });

    const req = makePostRequest(
      "http://localhost:3000/api/admin/judged/ja-1/action",
      { action: "merge", mergeIntoAnswerId: "ans-wrong" },
      { "x-admin-secret": "dev-secret" }
    );
    const res = await judgedPOST(req, { params: Promise.resolve({ id: "ja-1" }) });
    expect(res.status).toBe(404);
  });
});
