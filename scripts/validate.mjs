import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { z } from "zod";

const promptsDir = join(process.cwd(), "content", "prompts");

const answerSchema = z.object({
  name: z.string().min(1).max(100),
  rarity: z.number().int().min(1).max(100),
  aliases: z.array(z.string().min(1).max(100)).default([]),
});

const promptSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  category: z.string().min(1).max(50),
  text: z.string().min(1).max(300),
  hint: z.string().min(1).max(200).optional(),
  verified: z.boolean().default(true),
  answers: z.array(answerSchema).min(30),
});

const files = readdirSync(promptsDir).filter((f) => f.endsWith(".json"));
let totalErrors = 0;

console.log(`Validating ${files.length} prompt files...\n`);

for (const file of files) {
  let text = readFileSync(join(promptsDir, file), "utf-8");
  // Lenient JSON: quote unquoted property names, strip trailing commas
  text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  text = text.replace(/,\s*([\]}])/g, "$1");
  const raw = JSON.parse(text);
  const errors = [];

  try {
    promptSchema.parse(raw);
  } catch (err) {
    errors.push(`Schema validation failed: ${err.message}`);
  }

  // Check for duplicate names within prompt
  const names = new Set();
  for (const a of raw.answers) {
    const norm = a.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (names.has(norm)) {
      errors.push(`Duplicate name: "${a.name}"`);
    }
    names.add(norm);
  }

  // Check rarity distribution
  const low = raw.answers.filter((a) => a.rarity >= 1 && a.rarity <= 8).length;
  const mid = raw.answers.filter((a) => a.rarity >= 9 && a.rarity <= 40).length;
  const high = raw.answers.filter((a) => a.rarity >= 60).length;

  if (low < 3) errors.push(`Only ${low} answers with rarity 1-8 (need 3)`);
  if (mid < 8) errors.push(`Only ${mid} answers with rarity 9-40 (need 8)`);
  if (high < 6) errors.push(`Only ${high} answers with rarity 60+ (need 6)`);

  if (errors.length > 0) {
    totalErrors += errors.length;
    console.log(`FAIL: ${file}`);
    for (const e of errors) console.log(`  - ${e}`);
  } else {
    console.log(`PASS: ${file} (${raw.answers.length} answers)`);
  }
}

console.log(`\n${files.length - totalErrors}/${files.length} files passed, ${totalErrors} total errors`);
if (totalErrors > 0) process.exit(1);
