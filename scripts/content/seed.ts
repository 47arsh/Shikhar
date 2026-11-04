import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { validatePrompt } from "@/content/schema";

const prisma = new PrismaClient();
const promptsDir = join(process.cwd(), "content", "prompts");

async function main(): Promise<void> {
  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".json"));
  let created = 0;
  let updated = 0;

  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(promptsDir, file), "utf-8"));
    const content = validatePrompt(raw);

    const existing = await prisma.prompt.findUnique({ where: { id: content.id } });

    if (existing) {
      await prisma.prompt.update({
        where: { id: content.id },
        data: {
          category: content.category,
          text: content.text,
          hint: content.hint,
          active: true,
        },
      });
      updated++;
    } else {
      await prisma.prompt.create({
        data: {
          id: content.id,
          category: content.category,
          text: content.text,
          hint: content.hint,
          active: true,
        },
      });
      created++;
    }

    // Upsert answers
    const existingAnswers = await prisma.answer.findMany({
      where: { promptId: content.id },
    });
    const existingByName = new Map(
      existingAnswers.map((a) => [a.canonicalName.toLowerCase(), a])
    );

    for (const ans of content.answers) {
      const key = ans.name.toLowerCase();
      const existing = existingByName.get(key);
      if (existing) {
        await prisma.answer.update({
          where: { id: existing.id },
          data: {
            canonicalName: ans.name,
            seededRarity: ans.rarity,
            aliases: ans.aliases,
          },
        });
      } else {
        await prisma.answer.create({
          data: {
            promptId: content.id,
            canonicalName: ans.name,
            seededRarity: ans.rarity,
            aliases: ans.aliases,
            plays: 0,
          },
        });
      }
    }
  }

  console.log(`Seeded ${created} new prompts, updated ${updated} existing prompts`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
