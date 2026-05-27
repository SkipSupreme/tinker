/**
 * Lesson-slug allowlist + handler-error wrapper.
 *
 * Lessons are file-backed (src/content/lessons/*.mdx) so the slug space is
 * known at request time. Validating against it stops a hijacked session from
 * inserting bogus rows into `lesson_view` / `lesson_completion`, which would
 * pollute the user's dashboard and grow D1 storage unboundedly.
 */
import { getCollection } from 'astro:content';

let cached: Set<string> | null = null;
let cachedPromise: Promise<Set<string>> | null = null;

export async function loadLessonSlugs(): Promise<Set<string>> {
  if (cached) return cached;
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const entries = await getCollection('lessons', (l) => !l.data.draft);
    cached = new Set(entries.map((e) => e.id));
    return cached;
  })();
  return cachedPromise;
}

export async function isKnownLesson(slug: string): Promise<boolean> {
  const slugs = await loadLessonSlugs();
  return slugs.has(slug);
}

/**
 * Wrap a body of API-handler work that may throw on DB / network errors.
 * Logs with route context and returns a JSON 500 the client can surface.
 * Use INSTEAD of a bare `await` when the call could fail and you want a
 * structured response rather than a generic 500.
 */
export async function withApiErrors<T>(
  route: string,
  userId: string | undefined,
  fn: () => Promise<T>,
): Promise<T | Response> {
  try {
    return await fn();
  } catch (e) {
    const errId = `${route}.${Date.now().toString(36)}`;
    console.error(`[api ${route}] (${errId}) user=${userId ?? 'anon'} failed:`, e);
    return new Response(
      JSON.stringify({
        error: {
          code: 'internal',
          message: 'Something went wrong on our end.',
          id: errId,
        },
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}
