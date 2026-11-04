import { NextRequest, NextResponse } from "next/server";
import { validateStart } from "./schema";
import { prisma } from "@/lib/prisma";
import { kv } from "@/lib/kv";
import { env } from "@/lib/env";
import { GAME } from "@/config/game";

const RATE_LIMIT_WINDOW = 60;
const MAX_RATE = 30;

function getAnonId(req: NextRequest): string {
  return req.headers.get("x-anon-id") || req.cookies.get("anon_id")?.value || "anonymous";
}

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void env;

  const body = await req.json().catch(() => null);
  let input: { mode: string };
  try {
    input = validateStart(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const anonId = getAnonId(req);
  const ip = getIp(req);
  const store = await kv;

  for (const key of [`rl:ip:${ip}`, `rl:anon:${anonId}`]) {
    const count = await store.incr(key, RATE_LIMIT_WINDOW);
    if (count > MAX_RATE) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
  }

  let dateKey: string | undefined;
  let promptPicks: Array<{ id: string; round: number; text: string; hint: string | null; category: string }>;

  if (input.mode === "daily") {
    const now = new Date();
    const istDate = new Date(now.toLocaleString("en-US", { timeZone: GAME.dayBoundaryTz }));
    dateKey = istDate.toISOString().slice(0, 10);

    const existing = await prisma.climb.findFirst({
      where: { anonId, mode: "daily", dateKey },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Daily climb already started today", climbId: existing.id },
        { status: 409 }
      );
    }

    const seed = parseInt(dateKey.replaceAll("-", ""), 10);
    const categories = await prisma.prompt.findMany({
      where: { active: true },
      select: { category: true },
      distinct: ["category"],
    });
    const chosenCategories = categories.slice().sort(() => 0.5 - Math.sin(seed * 0.1)).slice(0, 10);

    promptPicks = [];
    for (let i = 0; i < chosenCategories.length; i++) {
      const cat = chosenCategories[i].category;
      const catPrompts = await prisma.prompt.findMany({ where: { category: cat, active: true } });
      if (catPrompts.length === 0) continue;
      const idx = (seed + i * 7919) % catPrompts.length;
      const p = catPrompts[idx];
      promptPicks.push({ id: p.id, round: i + 1, text: p.text, hint: p.hint, category: p.category });
    }
  } else {
    const categories = await prisma.prompt.findMany({
      where: { active: true },
      select: { category: true },
      distinct: ["category"],
    });
    const chosenCategories = categories.slice().sort(() => Math.random() - 0.5).slice(0, 10);
    promptPicks = [];
    for (let i = 0; i < chosenCategories.length; i++) {
      const cat = chosenCategories[i].category;
      const catPrompts = await prisma.prompt.findMany({ where: { category: cat, active: true } });
      if (catPrompts.length === 0) continue;
      const idx = Math.floor(Math.random() * catPrompts.length);
      const p = catPrompts[idx];
      promptPicks.push({ id: p.id, round: i + 1, text: p.text, hint: p.hint, category: p.category });
    }
  }

  const climb = await prisma.climb.create({
    data: {
      anonId,
      mode: input.mode,
      dateKey,
      totalPoints: 0,
      outcome: "in_progress",
      rounds: {
        create: promptPicks.map((p) => ({
          round: p.round,
          promptId: p.id,
        })),
      },
    },
    include: { rounds: { include: { prompt: true }, orderBy: { round: "asc" } } },
  });

  return NextResponse.json({
    climbId: climb.id,
    prompts: climb.rounds.map((r) => ({
      round: r.round,
      text: r.prompt.text,
      hint: r.prompt.hint,
      category: r.prompt.category,
    })),
  });
}
