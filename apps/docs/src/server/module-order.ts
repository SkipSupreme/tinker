/**
 * Module-order lookup, cached per worker instance.
 *
 * The `modules` content collection owns each module's `order` (m1 = 1,
 * m2 = 2, ...). "Prior modules" — the ones whose retention the /review
 * recap pulls from — are exactly those with a lower order than the module
 * a learner is currently starting.
 *
 * Mirrors loadLessonSlugs in lesson-slugs.ts: content-layer access is the
 * same `getCollection` call, cached so the recap endpoint doesn't re-read
 * the collection on every request.
 */
import { getCollection } from 'astro:content';

let cached: Map<string, number> | null = null;
let cachedPromise: Promise<Map<string, number>> | null = null;

export async function loadModuleOrder(): Promise<Map<string, number>> {
  if (cached) return cached;
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const entries = await getCollection('modules');
    cached = new Map(entries.map((e) => [e.id, e.data.order]));
    return cached;
  })();
  return cachedPromise;
}

/**
 * The module slugs that come strictly before `moduleSlug` in course order.
 * Returns [] when the slug is unknown or is the first module.
 */
export async function priorModuleSlugs(moduleSlug: string): Promise<string[]> {
  const order = await loadModuleOrder();
  const current = order.get(moduleSlug);
  if (current === undefined) return [];
  const prior: string[] = [];
  for (const [slug, ord] of order) {
    if (ord < current) prior.push(slug);
  }
  return prior;
}
