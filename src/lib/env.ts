import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().default("postgresql://postgres:postgres@localhost:5432/shikhar?schema=public"),
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  KV_ADAPTER: z.enum(["memory", "upstash"]).default("memory"),
  ADMIN_SECRET: z.string().min(1).default("dev-secret"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

type Env = z.infer<typeof envSchema>;

const envDefaults = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/shikhar?schema=public",
  KV_ADAPTER: "memory",
  ADMIN_SECRET: "dev-secret",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NODE_ENV: "development",
} as const;

export function loadEnv(): Env {
  if (process.env.NODE_ENV === "production") {
    const missing = ["DATABASE_URL"].filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.error("[Shikhar] Missing required production env vars:");
      for (const k of missing) {
        console.error(`- ${k}`);
      }
      process.exit(1);
    }
  }

  const env = envSchema.safeParse({
    ...envDefaults,
    ...process.env,
  });

  if (!env.success) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Shikhar] Missing or invalid production env vars:");
      for (const [path] of Object.entries(env.error.flatten().fieldErrors)) {
        console.error(`- ${path}`);
      }
      process.exit(1);
    }
    console.warn("[Shikhar] Running with mock/dev env fallbacks. Set real values for production.");
    return envSchema.parse(envDefaults);
  }

  return env.data;
}

export const env = loadEnv();
