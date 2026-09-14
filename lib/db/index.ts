import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Check your .env.local file and Vercel env vars.'
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Lazy singleton — only instantiated on first use, not at import time.
// This means a bad env var breaks a request, not the whole build.
type Db = ReturnType<typeof createDb>;
let cached: Db | null = null;

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!cached) cached = createDb();
    return Reflect.get(cached, prop, receiver);
  },
});