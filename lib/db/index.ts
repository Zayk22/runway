import {
  neon,
  neonConfig,
  type NeonQueryFunction,
} from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ============================================
// RETRY WRAPPER — via custom fetch
//
// Neon's HTTP driver uses `fetch` under the hood. We inject a fetch
// that retries on transient network failures (cold start, DNS hiccup,
// parallel requests). Non-network errors pass through immediately.
// ============================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

function isRetryableFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("error connecting") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound")
  );
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastErr = err;
      if (!isRetryableFetchError(err) || attempt === MAX_RETRIES - 1) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

// Register once — Neon reads this on every query
neonConfig.fetchFunction = fetchWithRetry;

// ============================================
// LAZY SINGLETON
// ============================================

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Check your .env.local file and Vercel env vars."
    );
  }
  const sql: NeonQueryFunction<false, false> = neon(url);
  return drizzle(sql, { schema });
}

type Db = ReturnType<typeof createDb>;
let cached: Db | null = null;

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!cached) cached = createDb();
    return Reflect.get(cached, prop, receiver);
  },
});