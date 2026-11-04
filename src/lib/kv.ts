export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryAdapter implements KeyValueStore {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const current = await this.get(key);
    const next = (current ? parseInt(current, 10) : 0) + 1;
    await this.set(key, String(next), ttlSeconds);
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiry = Date.now() + ttlSeconds * 1000;
      this.store.set(key, entry);
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

let upstashAdapter: KeyValueStore | null = null;

function getUpstashAdapter(): KeyValueStore {
  if (upstashAdapter) return upstashAdapter;
  // Lazy import so the Upstash SDK is optional when using the memory adapter.
  const { Redis } = require("@upstash/redis");
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis URL and token are required for the upstash adapter");
  }
  const redis = new Redis({ url, token });
  upstashAdapter = {
    async get(key: string) {
      return (await redis.get(key)) ?? null;
    },
    async set(key: string, value: string, ttlSeconds?: number) {
      if (ttlSeconds) await redis.setex(key, ttlSeconds, value);
      else await redis.set(key, value);
    },
    async incr(key: string, ttlSeconds?: number) {
      const next = await redis.incr(key);
      if (ttlSeconds) await redis.expire(key, ttlSeconds);
      return Number(next);
    },
    async expire(key: string, ttlSeconds: number) {
      await redis.expire(key, ttlSeconds);
    },
    async del(key: string) {
      await redis.del(key);
    },
  };
  return upstashAdapter;
}

export function createKVStore(): KeyValueStore {
  const adapter = process.env.KV_ADAPTER || "memory";
  if (adapter === "upstash") {
    return getUpstashAdapter();
  }
  return new MemoryAdapter();
}

export const kv = createKVStore();
