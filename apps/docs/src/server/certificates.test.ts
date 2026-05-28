import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeTestDb, type TestDb } from '../../tests/support/d1';
import { user as userTbl, lessonView } from './schema';
import { getCompletedLessonDates, certScope, type CertLesson } from './certificates';

let db: TestDb;
const USER = 'u-cert';

beforeEach(async () => {
  db = makeTestDb();
  const now = new Date();
  await db.client.insert(userTbl).values({
    id: USER, email: 'cert@b.co', emailVerified: true, role: 'user', createdAt: now, updatedAt: now,
  });
});
afterEach(() => db.close());

async function seenAt(lessonSlug: string, completedAt: Date | null) {
  const t = completedAt ?? new Date();
  await db.client.insert(lessonView).values({
    userId: USER,
    courseSlug: 'ml-math',
    moduleSlug: 'm5-calculus',
    lessonSlug,
    firstSeenAt: t,
    lastSeenAt: t,
    viewCount: 1,
    completedAt,
  });
}

describe('getCompletedLessonDates', () => {
  it('returns only completed lessons, keyed by slug', async () => {
    const a = new Date('2026-01-02T00:00:00Z');
    await seenAt('lesson-a', a);
    await seenAt('lesson-b', null);
    const dates = await getCompletedLessonDates(db.client, USER);
    expect(dates.size).toBe(1);
    expect(dates.get('lesson-a')?.getTime()).toBe(a.getTime());
    expect(dates.has('lesson-b')).toBe(false);
  });

  it('is empty for a user with no views', async () => {
    const dates = await getCompletedLessonDates(db.client, USER);
    expect(dates.size).toBe(0);
  });
});

describe('certScope', () => {
  const lessons: CertLesson[] = [
    { slug: 'l1', title: 'One' },
    { slug: 'l2', title: 'Two' },
  ];

  it('returns null when the scope has no lessons', () => {
    expect(certScope({ scope: 'm', name: 'M', lessons: [], completed: new Map() })).toBeNull();
  });

  it('returns null when any lesson is unfinished', () => {
    const completed = new Map([['l1', new Date()]]);
    expect(certScope({ scope: 'm', name: 'M', lessons, completed })).toBeNull();
  });

  it('returns the scope when every lesson is completed', () => {
    const completed = new Map([
      ['l1', new Date('2026-01-01T00:00:00Z')],
      ['l2', new Date('2026-01-05T00:00:00Z')],
    ]);
    const cert = certScope({ scope: 'm5', name: 'Calculus', lessons, completed });
    expect(cert).not.toBeNull();
    expect(cert!.scope).toBe('m5');
    expect(cert!.name).toBe('Calculus');
    expect(cert!.lessons).toHaveLength(2);
  });

  it('stamps completedAt with the latest lesson completion', () => {
    const completed = new Map([
      ['l1', new Date('2026-01-05T00:00:00Z')],
      ['l2', new Date('2026-01-01T00:00:00Z')],
    ]);
    const cert = certScope({ scope: 'm', name: 'M', lessons, completed });
    expect(cert!.completedAt.toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });
});
