import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.local');
}

// Make the Neon serverless driver work in a plain Node CLI environment.
// At runtime on Vercel, this is handled automatically. In a local terminal,
// it needs a WebSocket polyfill.
neonConfig.webSocketConstructor = ws;

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});