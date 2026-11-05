import { Metadata } from "next";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { validatePrompt, PromptContent } from "@/content/schema";

const promptsDir = join(process.cwd(), "content", "prompts");

function getPromptsByCategory(category: string): PromptContent[] {
  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".json"));
  const prompts: PromptContent[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(promptsDir, file), "utf-8"));
    const prompt = validatePrompt(raw);
    if (prompt.category === category) {
      prompts.push(prompt);
    }
  }
  return prompts;
}

export const dynamicParams = true;

export function generateStaticParams() {
  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".json"));
  const categories = new Set<string>();
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(promptsDir, file), "utf-8"));
    categories.add(raw.category);
  }
  return Array.from(categories).map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const categoryName = category.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const prompts = getPromptsByCategory(category);

  return {
    title: `${categoryName} Trivia - Shikhar`,
    description: `Name Indian ${categoryName.toLowerCase()} answers. Explore ${prompts.length} prompts in the ${categoryName} category on Shikhar.`,
    openGraph: {
      title: `${categoryName} Trivia - Shikhar`,
      description: `Explore ${prompts.length} ${categoryName.toLowerCase()} prompts on Shikhar.`,
      type: "website",
    },
  };
}

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categoryName = category.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const prompts = getPromptsByCategory(category);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <nav className="mb-6">
          <a href="/" className="text-sm text-shikhar-dusk hover:text-shikhar-dusk/80">
            ← Back to Shikhar
          </a>
        </nav>
        <h1 className="text-3xl font-display font-bold text-shikhar-dusk mb-4">
          {categoryName}
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          {prompts.length} trivia prompts in the {categoryName.toLowerCase()} category.
        </p>
        <ul className="space-y-4">
          {prompts.map((prompt) => (
            <li key={prompt.id} className="p-4 bg-card border border-border rounded-xl">
              <h3 className="text-lg font-semibold text-shikhar-dusk mb-2">{prompt.text}</h3>
              <p className="text-sm text-slate-500 mb-3">{prompt.hint}</p>
              <button
                onClick={() => {
                  void window.location.assign(`/play/daily`);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 transition-all"
              >
                Play this prompt
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
