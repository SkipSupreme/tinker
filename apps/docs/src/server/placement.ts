import { and, eq } from 'drizzle-orm';
import { placement } from './schema';
import type { DB } from './db';

export interface PlacementInput {
  courseSlug: string;
  entryModule: string;
  entryLevel: string;
  /** JSON blob: { strands, frontier }. Opaque to the DB layer. */
  strandScores: string;
  itemsAnswered: number;
  /** Defaults to now; accepted so an anon result keeps its original timestamp on merge. */
  takenAt?: Date;
}

export interface PlacementRow {
  courseSlug: string;
  entryModule: string;
  entryLevel: string;
  strandScores: string;
  itemsAnswered: number;
  takenAt: Date;
}

/** Upsert a learner's placement for a course. Retake overwrites (latest wins). */
export async function upsertPlacement(
  db: DB,
  userId: string,
  input: PlacementInput,
): Promise<{ takenAt: Date }> {
  const takenAt = input.takenAt ?? new Date();
  const set = {
    entryModule: input.entryModule,
    entryLevel: input.entryLevel,
    strandScores: input.strandScores,
    itemsAnswered: input.itemsAnswered,
    takenAt,
  };
  await db
    .insert(placement)
    .values({ userId, courseSlug: input.courseSlug, ...set })
    .onConflictDoUpdate({
      target: [placement.userId, placement.courseSlug],
      set,
    });
  return { takenAt };
}

export async function getPlacement(
  db: DB,
  userId: string,
  courseSlug: string,
): Promise<PlacementRow | null> {
  const row = await db
    .select()
    .from(placement)
    .where(and(eq(placement.userId, userId), eq(placement.courseSlug, courseSlug)))
    .get();
  if (!row) return null;
  return {
    courseSlug: row.courseSlug,
    entryModule: row.entryModule,
    entryLevel: row.entryLevel,
    strandScores: row.strandScores,
    itemsAnswered: row.itemsAnswered,
    takenAt: row.takenAt,
  };
}
