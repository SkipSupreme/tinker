import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestDb, type TestDb } from '../../tests/support/d1';
import {
  user as userTbl,
  stepCheck,
  fsrsCard,
  keyIdea,
  stepIdAlias,
  streakState,
} from './schema';

let db: TestDb;
const USER = 'u-schema';
const OTHER = 'u-other';

beforeEach(async () => {
  db = makeTestDb();
  const now = new Date();
  await db.client.insert(userTbl).values([
    { id: USER, email: 'a@b.co', emailVerified: true, role: 'user', createdAt: now, updatedAt: now },
    { id: OTHER, email: 'c@d.co', emailVerified: true, role: 'user', createdAt: now, updatedAt: now },
  ]);
});
afterEach(() => db.close());

describe('stepCheck table', () => {
  it('accepts an insert and reads it back', async () => {
    const now = new Date();
    await db.client.insert(stepCheck).values({
      id: 'sc-1',
      userId: USER,
      lessonSlug: 'derivative-intro',
      stepId: 'derivative-intro:check-1',
      answerJson: JSON.stringify({ choice: 'a' }),
      isCorrect: true,
      rating: 'good',
      attemptNo: 1,
      createdAt: now,
    });
    const rows = await db.client.select().from(stepCheck);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('sc-1');
    expect(rows[0].isCorrect).toBe(true);
    expect(rows[0].rating).toBe('good');
  });

  it('allows null rating', async () => {
    await db.client.insert(stepCheck).values({
      id: 'sc-2',
      userId: USER,
      lessonSlug: 'l',
      stepId: 's',
      answerJson: '{}',
      isCorrect: false,
      createdAt: new Date(),
    });
    const r = db.client.select().from(stepCheck).where(eq(stepCheck.id, 'sc-2')).get();
    expect(r?.rating).toBeNull();
  });
});

describe('fsrsCard table', () => {
  it('accepts an insert and reads it back', async () => {
    const due = new Date();
    await db.client.insert(fsrsCard).values({
      userId: USER,
      stepId: 'derivative-intro:check-1',
      lessonSlug: 'derivative-intro',
      moduleSlug: 'calc-1',
      knowledgeType: 'procedural',
      due,
      stability: 1.5,
      difficulty: 5.2,
      elapsedDays: 0,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      state: 1,
      lastReview: due,
    });
    const rows = await db.client.select().from(fsrsCard);
    expect(rows).toHaveLength(1);
    expect(rows[0].stability).toBeCloseTo(1.5);
    expect(rows[0].difficulty).toBeCloseTo(5.2);
    expect(rows[0].state).toBe(1);
    expect(rows[0].knowledgeType).toBe('procedural');
  });

  it('allows null lastReview for freshly-seeded cards', async () => {
    await db.client.insert(fsrsCard).values({
      userId: USER,
      stepId: 'fresh-step',
      lessonSlug: 'l',
      moduleSlug: 'm',
      due: new Date(),
      stability: 0,
      difficulty: 0,
    });
    const r = db.client.select().from(fsrsCard).where(eq(fsrsCard.stepId, 'fresh-step')).get();
    expect(r?.lastReview).toBeNull();
    expect(r?.state).toBe(0);
    expect(r?.reps).toBe(0);
  });

  it('enforces composite primary key on (userId, stepId)', async () => {
    const due = new Date();
    await db.client.insert(fsrsCard).values({
      userId: USER, stepId: 's1', lessonSlug: 'l', moduleSlug: 'm', due, stability: 1, difficulty: 1,
    });
    expect(() => {
      db.sqlite.prepare(
        `INSERT INTO fsrs_card (user_id, step_id, lesson_slug, module_slug, due, stability, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(USER, 's1', 'l', 'm', due.getTime(), 1, 1);
    }).toThrow();
  });

  it('allows the same stepId for different users', async () => {
    const due = new Date();
    await db.client.insert(fsrsCard).values([
      { userId: USER, stepId: 'shared', lessonSlug: 'l', moduleSlug: 'm', due, stability: 1, difficulty: 1 },
      { userId: OTHER, stepId: 'shared', lessonSlug: 'l', moduleSlug: 'm', due, stability: 1, difficulty: 1 },
    ]);
    const rows = await db.client.select().from(fsrsCard);
    expect(rows).toHaveLength(2);
  });
});

describe('keyIdea table', () => {
  it('accepts an insert and reads it back', async () => {
    const now = new Date();
    await db.client.insert(keyIdea).values({
      userId: USER,
      moduleSlug: 'calc-1',
      text: 'Derivatives measure instantaneous rate of change.',
      createdAt: now,
      updatedAt: now,
    });
    const rows = await db.client.select().from(keyIdea);
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toContain('Derivatives');
  });

  it('enforces composite primary key on (userId, moduleSlug)', async () => {
    const now = new Date();
    await db.client.insert(keyIdea).values({
      userId: USER, moduleSlug: 'calc-1', text: 'first', createdAt: now, updatedAt: now,
    });
    expect(() => {
      db.sqlite.prepare(
        `INSERT INTO key_idea (user_id, module_slug, text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(USER, 'calc-1', 'second', now.getTime(), now.getTime());
    }).toThrow();
  });

  it('allows the same module for different users', async () => {
    const now = new Date();
    await db.client.insert(keyIdea).values([
      { userId: USER, moduleSlug: 'calc-1', text: 'mine', createdAt: now, updatedAt: now },
      { userId: OTHER, moduleSlug: 'calc-1', text: 'theirs', createdAt: now, updatedAt: now },
    ]);
    const rows = await db.client.select().from(keyIdea);
    expect(rows).toHaveLength(2);
  });
});

describe('stepIdAlias table', () => {
  it('accepts an insert and reads it back', async () => {
    await db.client.insert(stepIdAlias).values({
      oldStepId: 'derivative-intro:old',
      newStepId: 'derivative-intro:check-1',
      renamedAt: new Date(),
    });
    const rows = await db.client.select().from(stepIdAlias);
    expect(rows).toHaveLength(1);
    expect(rows[0].newStepId).toBe('derivative-intro:check-1');
  });

  it('enforces uniqueness on oldStepId', async () => {
    const now = new Date();
    await db.client.insert(stepIdAlias).values({
      oldStepId: 'dup', newStepId: 'a', renamedAt: now,
    });
    expect(() => {
      db.sqlite.prepare(
        `INSERT INTO step_id_alias (old_step_id, new_step_id, renamed_at) VALUES (?, ?, ?)`
      ).run('dup', 'b', now.getTime());
    }).toThrow();
  });
});

describe('streakState table', () => {
  it('accepts an insert with defaults and reads it back', async () => {
    await db.client.insert(streakState).values({
      userId: USER,
      updatedAt: new Date(),
    });
    const r = db.client.select().from(streakState).where(eq(streakState.userId, USER)).get();
    expect(r?.enabled).toBe(false);
    expect(r?.current).toBe(0);
    expect(r?.longest).toBe(0);
    expect(r?.timezone).toBe('UTC');
    expect(r?.lastActiveDay).toBeNull();
  });

  it('stores lastActiveDay as YYYY-MM-DD text', async () => {
    await db.client.insert(streakState).values({
      userId: USER,
      enabled: true,
      current: 3,
      longest: 7,
      lastActiveDay: '2026-05-27',
      timezone: 'America/Los_Angeles',
      updatedAt: new Date(),
    });
    const r = db.client.select().from(streakState).where(eq(streakState.userId, USER)).get();
    expect(r?.lastActiveDay).toBe('2026-05-27');
    expect(r?.timezone).toBe('America/Los_Angeles');
    expect(r?.current).toBe(3);
  });
});

describe('cascade delete behavior', () => {
  it('cascades user delete to stepCheck, fsrsCard, keyIdea, streakState', async () => {
    const now = new Date();
    await db.client.insert(stepCheck).values({
      id: 'sc-cascade', userId: USER, lessonSlug: 'l', stepId: 's',
      answerJson: '{}', isCorrect: true, createdAt: now,
    });
    await db.client.insert(fsrsCard).values({
      userId: USER, stepId: 's', lessonSlug: 'l', moduleSlug: 'm',
      due: now, stability: 1, difficulty: 1,
    });
    await db.client.insert(keyIdea).values({
      userId: USER, moduleSlug: 'm', text: 't', createdAt: now, updatedAt: now,
    });
    await db.client.insert(streakState).values({
      userId: USER, updatedAt: now,
    });

    await db.client.delete(userTbl).where(eq(userTbl.id, USER));

    expect(await db.client.select().from(stepCheck)).toHaveLength(0);
    expect(await db.client.select().from(fsrsCard)).toHaveLength(0);
    expect(await db.client.select().from(keyIdea)).toHaveLength(0);
    expect(await db.client.select().from(streakState)).toHaveLength(0);
  });

  it('does NOT cascade user delete to stepIdAlias (no FK; authoring artifact)', async () => {
    const now = new Date();
    await db.client.insert(stepIdAlias).values({
      oldStepId: 'old-id', newStepId: 'new-id', renamedAt: now,
    });
    await db.client.delete(userTbl).where(eq(userTbl.id, USER));
    const rows = await db.client.select().from(stepIdAlias);
    expect(rows).toHaveLength(1);
    expect(rows[0].oldStepId).toBe('old-id');
  });
});
