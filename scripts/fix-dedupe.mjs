import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const promptsDir = join(process.cwd(), "content", "prompts");
const files = ["festivals-india.json", "indian-dals.json", "indian-sweets.json"];

function dedupeAnswers(answers) {
  const seen = new Map();
  return answers.map((a) => {
    const key = a.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return a;
    return { ...a, name: `${a.name} (${count + 1})` };
  });
}

for (const f of files) {
  let text = readFileSync(join(promptsDir, f), "utf-8");
  text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  text = text.replace(/,\s*([\]}])/g, "$1");
  const data = JSON.parse(text);
  data.answers = dedupeAnswers(data.answers);
  writeFileSync(join(promptsDir, f), JSON.stringify(data, null, 2));
  console.log(`Fixed ${f} (${data.answers.length} answers)`);
}
