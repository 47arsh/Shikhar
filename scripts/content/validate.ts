import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { validatePrompt, PromptContent } from "@/content/schema";

const promptsDir = join(process.cwd(), "content", "prompts");

function loadPrompts(): PromptContent[] {
  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".json"));
  const prompts: PromptContent[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(promptsDir, file), "utf-8"));
    prompts.push(validatePrompt(raw));
  }
  return prompts;
}

function checkDuplicatesAndCollisions(prompts: PromptContent[]): string[] {
  const errors: string[] = [];
  for (const prompt of prompts) {
    const seen = new Set<string>();
    const allNames: Array<{ type: string; value: string }> = [];

    for (const ans of prompt.answers) {
      const normName = ans.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(normName)) {
        errors.push(`${prompt.id}: duplicate canonical name "${ans.name}"`);
      }
      seen.add(normName);
      allNames.push({ type: "canonical", value: ans.name });

      for (const alias of ans.aliases) {
        const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seen.has(normAlias)) {
          errors.push(`${prompt.id}: alias "${alias}" collides with existing name in "${prompt.id}"`);
        }
        seen.add(normAlias);
        allNames.push({ type: "alias", value: alias });
      }
    }
  }
  return errors;
}

function checkRarityDistribution(prompts: PromptContent[]): string[] {
  const errors: string[] = [];
  for (const prompt of prompts) {
    const low = prompt.answers.filter((a) => a.rarity >= 1 && a.rarity <= 8).length;
    const mid = prompt.answers.filter((a) => a.rarity >= 9 && a.rarity <= 40).length;
    const high = prompt.answers.filter((a) => a.rarity >= 60).length;

    if (low < 3) {
      errors.push(`${prompt.id}: needs at least 3 answers with rarity 1-8, has ${low}`);
    }
    if (mid < 8) {
      errors.push(`${prompt.id}: needs at least 8 answers with rarity 9-40, has ${mid}`);
    }
    if (high < 6) {
      errors.push(`${prompt.id}: needs at least 6 answers with rarity 60+, has ${high}`);
    }
  }
  return errors;
}

function checkCategoryCounts(prompts: PromptContent[]): void {
  const counts = new Map<string, number>();
  for (const p of prompts) {
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  }
  console.log("Prompt counts by category:");
  for (const [cat, count] of Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${cat}: ${count}`);
  }
  const total = prompts.length;
  console.log(`\nTotal prompts: ${total}`);
  console.log(`Categories: ${counts.size}`);
}

function main(): void {
  let prompts: PromptContent[];
  try {
    prompts = loadPrompts();
  } catch (err) {
    console.error("Validation failed to load prompts:");
    console.error(err);
    process.exit(1);
  }

  console.log(`Loaded ${prompts.length} prompts\n`);

  const dupErrors = checkDuplicatesAndCollisions(prompts);
  const rarityErrors = checkRarityDistribution(prompts);

  const allErrors = [...dupErrors, ...rarityErrors];

  if (allErrors.length > 0) {
    console.error("VALIDATION ERRORS:");
    for (const err of allErrors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log("All prompts passed basic validation.\n");
  checkCategoryCounts(prompts);
}

main();
