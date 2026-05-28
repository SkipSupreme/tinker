import { eq } from 'drizzle-orm';
import { lessonView } from './schema';
import type { DB } from './db';

export interface CertLesson {
  slug: string;
  title: string;
}

export interface CertScope {
  /** Module slug, or the literal `all` for the whole course. */
  scope: string;
  /** Module title or course title — the human name on the certificate. */
  name: string;
  /** Latest lesson-completion in the scope: the moment it was actually done. */
  completedAt: Date;
  lessons: CertLesson[];
}

/** lessonSlug -> completedAt for every lesson this user has finished. */
export async function getCompletedLessonDates(
  db: DB,
  userId: string,
): Promise<Map<string, Date>> {
  const rows = await db
    .select({ slug: lessonView.lessonSlug, completedAt: lessonView.completedAt })
    .from(lessonView)
    .where(eq(lessonView.userId, userId));
  const dates = new Map<string, Date>();
  for (const r of rows) {
    if (r.completedAt) dates.set(r.slug, r.completedAt);
  }
  return dates;
}

/**
 * Build a certificate scope only if EVERY lesson in it is completed — a
 * certificate is all-or-nothing. Returns null for an empty scope or any
 * unfinished lesson. completedAt is the latest lesson completion, i.e. the
 * moment the scope was genuinely finished.
 */
export function certScope(input: {
  scope: string;
  name: string;
  lessons: CertLesson[];
  completed: Map<string, Date>;
}): CertScope | null {
  const { scope, name, lessons, completed } = input;
  if (lessons.length === 0) return null;
  let latest = 0;
  for (const lesson of lessons) {
    const at = completed.get(lesson.slug);
    if (!at) return null;
    latest = Math.max(latest, at.getTime());
  }
  return { scope, name, completedAt: new Date(latest), lessons };
}
