import type { APIRoute } from 'astro';
import { requireSession, jsonError, jsonOk } from '../../../../server/middleware';
import { getDueCardsForModules } from '../../../../server/steps';
import { loadModuleOrder, priorModuleSlugs } from '../../../../server/module-order';
import { getEnv } from '../../../../server/env';
import { withApiErrors } from '../../../../server/lesson-slugs';
import prompts from '../../../../generated/step-prompts.json';

export const prerender = false;

// How many prior-module cards the "Previously" panel shows. Three keeps the
// recap a glance, not a chore (the full queue lives at /review).
const RECAP_LIMIT = 3;

// Manifest entry shapes, narrowed from the loosely-typed JSON import. Mirrors
// the resolve step in src/pages/review/index.astro.
interface CheckPrompt {
  lessonSlug: string;
  title: string | null;
  hint: string | null;
  answerType: 'check';
  promptHTML: string;
  answer: number | null;
  answerLabel: string;
}
interface ChoicePrompt {
  lessonSlug: string;
  title: string | null;
  hint: string | null;
  answerType: 'choice';
  promptHTML: string;
  single: boolean;
  options: { html: string; correct: boolean }[];
}
type PromptEntry = CheckPrompt | ChoicePrompt;

const manifest = prompts as Record<string, PromptEntry>;

export const GET: APIRoute = async ({ request, params }) => {
  const env = getEnv();
  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const moduleSlug = params.moduleSlug;
  if (!moduleSlug) return jsonError(400, 'bad_request', 'Missing module slug');

  return withApiErrors('modules/recap', ctx.session.user.id, async () => {
    // Inside the error wrapper: content-layer access (loadModuleOrder) can
    // throw on a cold Worker, and we want that surfaced as a structured 500
    // with a log correlation id, not a bare unhandled rejection.
    const order = await loadModuleOrder();
    if (!order.has(moduleSlug)) {
      return jsonError(404, 'unknown_module', 'Unknown module slug');
    }

    const priors = await priorModuleSlugs(moduleSlug);
    const due = await getDueCardsForModules(ctx.db, ctx.session.user.id, priors, RECAP_LIMIT);

    // Resolve each due card to its build-time prompt. Drop any card whose
    // stepId is no longer in the manifest (renamed/removed step): we can't
    // render a prompt we don't have. The client renders prompt + reveal, so
    // we send the answer content too.
    const cards = due
      .map((c) => {
        const entry = manifest[c.stepId];
        if (!entry) return null;
        const base = {
          stepId: c.stepId,
          lessonSlug: entry.lessonSlug,
          moduleSlug: c.moduleSlug,
          title: entry.title,
          hint: entry.hint,
          promptHTML: entry.promptHTML,
        };
        if (entry.answerType === 'check') {
          return {
            ...base,
            answerType: 'check' as const,
            answer: entry.answer,
            answerLabel: entry.answerLabel,
          };
        }
        return {
          ...base,
          answerType: 'choice' as const,
          options: entry.options,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return jsonOk({ cards });
  });
};
