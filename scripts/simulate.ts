import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { computePoints } from "@/lib/scoring";
import { GAME } from "@/config/game";
import { validatePrompt, PromptContent } from "@/content/schema";

const promptsDir = join(process.cwd(), "content", "prompts");

type Prompt = PromptContent;

interface PlayerKnowledge {
  name: string;
  // Probability the player knows an answer of rarity r
  knowProbability: (rarity: number) => number;
}

const playerTypes: PlayerKnowledge[] = [
  {
    name: "casual",
    // Knows mostly common answers; rare answers are unlikely
    knowProbability: (r: number) => Math.max(0, 1 - r / 60) * 0.5,
  },
  {
    name: "average",
    knowProbability: (r: number) => Math.max(0, 1 - r / 100) * 0.85,
  },
  {
    name: "expert",
    knowProbability: (r: number) => Math.max(0, 1 - r / 140) * 0.95,
  },
];

function loadPrompts(): Prompt[] {
  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".json"));
  const prompts: Prompt[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(promptsDir, file), "utf-8"));
    prompts.push(validatePrompt(raw));
  }
  return prompts;
}

function selectPrompts(prompts: Prompt[], seed: number) {
  // 10 prompts, no two from the same category, deterministic from seed
  const byCategory = new Map<string, Prompt[]>();
  for (const p of prompts) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }
  const categories = Array.from(byCategory.keys());
  const chosen: Array<Prompt & { round: number }> = [];
  let s = seed;
  for (let i = 0; i < Math.min(10, categories.length); i++) {
    s = (s * 7919 + 13) % categories.length;
    const cat = categories[s];
    const catPrompts = byCategory.get(cat)!;
    const idx = (s * 17 + i) % catPrompts.length;
    chosen.push({ ...catPrompts[idx], round: i + 1 });
    categories.splice(s, 1);
  }
  return chosen.sort((a, b) => a.round - b.round);
}

function playerAnswer(
  prompt: Prompt,
  player: PlayerKnowledge,
  rng: () => number
): { rarity: number } | null {
  // Player picks the rarest answer they know
  const answers = [...prompt.answers].sort((a, b) => b.rarity - a.rarity);
  for (const ans of answers) {
    if (rng() < player.knowProbability(ans.rarity)) {
      return { rarity: ans.rarity };
    }
  }
  return null; // knows nothing, unmatched
}

function simulateClimb(
  player: PlayerKnowledge,
  pointsToSummit: number,
  prompts: Prompt[],
  rng: () => number
) {
  const seed = Math.floor(rng() * 1000000);
  const climbPrompts = selectPrompts(prompts, seed);
  let totalPoints = 0;

  for (const p of climbPrompts) {
    const ans = playerAnswer(p, player, rng);
    if (!ans) continue; // unmatched, no points
    // top' = max(K * r0) across all answers in this prompt (plays = 0 initially)
    const topAdjusted = Math.max(
      ...p.answers.map((a) => GAME.priorWeightK * Math.pow(1 - a.rarity / 100, 2))
    );
    const score = computePoints(ans.rarity, 0, topAdjusted, GAME.priorWeightK);
    totalPoints += score.points;
    if (totalPoints >= pointsToSummit) break;
  }

  return { totalPoints, summited: totalPoints >= pointsToSummit };
}

function runSimulation(
  pointsToSummit: number,
  climbsPerPlayer: number,
  prompts: Prompt[]
) {
  const results = new Map<
    string,
    { summited: number; total: number; points: number[] }
  >();
  for (const p of playerTypes) {
    results.set(p.name, { summited: 0, total: 0, points: [] });
  }

  const rngs = playerTypes.map(() => {
    let s = 12345;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  });

  for (let i = 0; i < climbsPerPlayer; i++) {
    for (let pi = 0; pi < playerTypes.length; pi++) {
      const player = playerTypes[pi];
      const rng = rngs[pi];
      const result = simulateClimb(player, pointsToSummit, prompts, rng);
      const agg = results.get(player.name)!;
      agg.total++;
      if (result.summited) agg.summited++;
      agg.points.push(result.totalPoints);
    }
  }

  return results;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.ceil((p / 100) * sorted.length) - 1, sorted.length - 1);
  return sorted[Math.max(idx, 0)];
}

function main() {
  const prompts = loadPrompts();
  console.log(`Loaded ${prompts.length} prompts`);
  console.log(`Player types: ${playerTypes.map((p) => p.name).join(", ")}\n`);

  // Scan pointsToSummit to find values matching target summit rates
  // Targets: casual 0-1%, average 3-8%, expert 25-40%
  const climbsPerPlayer = 5000;
  const candidates = [400, 450, 500, 520, 540, 550, 560, 570, 580, 600];

  console.log("pointsToSummit | casual% | average% | expert%");
  console.log("---------------|---------|----------|--------");

  let best: { pointsToSummit: number; rates: number[] } | null = null;
  let bestScore = Infinity;

  for (const pts of candidates) {
    const res = runSimulation(pts, climbsPerPlayer, prompts);
    const casualRate = (res.get("casual")!.summited / res.get("casual")!.total) * 100;
    const averageRate = (res.get("average")!.summited / res.get("average")!.total) * 100;
    const expertRate = (res.get("expert")!.summited / res.get("expert")!.total) * 100;

    console.log(
      `${String(pts).padStart(13)} | ${casualRate.toFixed(2).padStart(7)} | ${averageRate
        .toFixed(2)
        .padStart(8)} | ${expertRate.toFixed(2).padStart(8)}`
    );

    // Score: how far from targets (casual 0.5%, average 5.5%, expert 32.5%)
    const casualTarget = 0.5;
    const averageTarget = 5.5;
    const expertTarget = 32.5;
    const score =
      Math.abs(casualRate - casualTarget) +
      Math.abs(averageRate - averageTarget) +
      Math.abs(expertRate - expertTarget);
    if (score < bestScore) {
      bestScore = score;
      best = { pointsToSummit: pts, rates: [casualRate, averageRate, expertRate] };
    }
  }

  console.log(`\nTuned pointsToSummit: ${best!.pointsToSummit}`);
  console.log(
    `Resulting summit rates: casual ${best!.rates[0].toFixed(2)}%, average ${best!.rates[1].toFixed(2)}%, expert ${best!.rates[2].toFixed(2)}%`
  );
  console.log(`Targets: casual 0-1%, average 3-8%, expert 25-40%`);

  // Detailed distribution at the tuned value
  const res = runSimulation(best!.pointsToSummit, climbsPerPlayer, prompts);
  for (const p of playerTypes) {
    const agg = res.get(p.name)!;
    const sorted = agg.points.slice().sort((a, b) => a - b);
    console.log(`\n${p.name} (n=${agg.total}, summit=${((agg.summited / agg.total) * 100).toFixed(1)}%):`);
    console.log(`  p50 points: ${percentile(sorted, 50)}`);
    console.log(`  p90 points: ${percentile(sorted, 90)}`);
    console.log(`  max points: ${sorted[sorted.length - 1]}`);
  }
}

main();
