import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type DB = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(binding: D1Database): DB {
  if (!binding) {
    throw new Error('D1 binding missing — check wrangler.jsonc and Astro.locals.runtime.env');
  }
  return drizzle(binding, { schema });
}
