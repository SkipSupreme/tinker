import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeTestDb, type TestDb } from '../../tests/support/d1';
import { user as userTbl } from './schema';
import { upsertPlacement, getPlacement } from './placement';

let db: TestDb;
const USER = 'u-placement';
const COURSE = 'ml-math';

beforeEach(async () => {
  db = makeTestDb();
  const now = new Date();
  await db.client.insert(userTbl).values({
    id: USER,
    email: 'p@b.co',
    emailVerified: true,
    role: 'user',
    createdAt: now,
    updatedAt: now,
  });
});
afterEach(() => db.close());

const sample = {
  courseSlug: COURSE,
  entryModule: 'm5-calculus',
  entryLevel: '4',
  strandScores: JSON.stringify({ frontier: { lo: 3, hi: 4 } }),
  itemsAnswered: 6,
};

describe('placement', () => {
  it('upsert + get round-trip', async () => {
    await upsertPlacement(db.client, USER, sample);
    const r = await getPlacement(db.client, USER, COURSE);
    expect(r?.entryModule).toBe('m5-calculus');
    expect(r?.entryLevel).toBe('4');
    expect(r?.itemsAnswered).toBe(6);
  });

  it('retake overwrites (latest wins)', async () => {
    await upsertPlacement(db.client, USER, sample);
    const a = await getPlacement(db.client, USER, COURSE);
    await new Promise((r) => setTimeout(r, 5));
    await upsertPlacement(db.client, USER, {
      ...sample,
      entryModule: 'm10-optimization',
      entryLevel: 'cleared',
      itemsAnswered: 6,
    });
    const b = await getPlacement(db.client, USER, COURSE);
    expect(b?.entryModule).toBe('m10-optimization');
    expect(b?.entryLevel).toBe('cleared');
    expect(b!.takenAt.getTime()).toBeGreaterThan(a!.takenAt.getTime());
  });

  it('preserves a supplied takenAt (anon-merge keeps original timestamp)', async () => {
    const original = new Date('2026-05-01T12:00:00.000Z');
    await upsertPlacement(db.client, USER, { ...sample, takenAt: original });
    const r = await getPlacement(db.client, USER, COURSE);
    expect(r!.takenAt.getTime()).toBe(original.getTime());
  });

  it('returns null for a course with no placement', async () => {
    expect(await getPlacement(db.client, USER, 'other-course')).toBeNull();
  });

  it('isolates placements per user', async () => {
    const now = new Date();
    await db.client.insert(userTbl).values({
      id: 'u-other',
      email: 'o@b.co',
      emailVerified: true,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    });
    await upsertPlacement(db.client, USER, sample);
    expect(await getPlacement(db.client, 'u-other', COURSE)).toBeNull();
  });
});
