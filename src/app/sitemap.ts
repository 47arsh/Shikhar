import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { MetadataRoute } from "next";
import { validatePrompt, PromptContent } from "@/content/schema";

const promptsDir = join(process.cwd(), "content", "prompts");
const SITE_URL = "https://shikhar.example";

function getPrompts(): PromptContent[] {
  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".json"));
  const prompts: PromptContent[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(promptsDir, file), "utf-8"));
    prompts.push(validatePrompt(raw));
  }
  return prompts;
}

function getCategories(): string[] {
  const prompts = getPrompts();
  return [...new Set(prompts.map((p) => p.category))];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const prompts = getPrompts();
  const categories = getCategories();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/play/daily`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/play/free`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/admin`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/category/${category}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes];
}
