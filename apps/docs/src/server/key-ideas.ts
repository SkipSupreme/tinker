import { and, eq } from 'drizzle-orm';
import { keyIdea } from './schema';
import type { DB } from './db';

// One sentence. Generous cap so a thoughtful line fits, bounded so the
// column and the mantra banner stay sane.
export const KEY_IDEA_MAX_LEN = 500;

/**
 * Insert-or-update the learner's key idea for a module. There is exactly one
 * key idea per (user, module) — the module-end prompt overwrites rather than
 * appends.
 *
 * createdAt is set only on insert: onConflictDoUpdate touches text + updatedAt
 * so the "first wrote this" timestamp survives later edits.
 */
export async function upsertKeyIdea(
  db: DB,
  userId: string,
  moduleSlug: string,
  text: string,
): Promise<{ updatedAt: Date }> {
  const now = new Date();
  await db
    .insert(keyIdea)
    .values({ userId, moduleSlug, text, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [keyIdea.userId, keyIdea.moduleSlug],
      set: { text, updatedAt: now },
    });
  return { updatedAt: now };
}

export async function getKeyIdea(
  db: DB,
  userId: string,
  moduleSlug: string,
): Promise<{ text: string; updatedAt: Date } | null> {
  const row = await db
    .select()
    .from(keyIdea)
    .where(and(eq(keyIdea.userId, userId), eq(keyIdea.moduleSlug, moduleSlug)))
    .get();
  if (!row) return null;
  return { text: row.text, updatedAt: row.updatedAt };
}
