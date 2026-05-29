import prompts from '../generated/step-prompts.json';

interface PromptEntry {
  lessonSlug: string;
}

const manifest = prompts as Record<string, PromptEntry>;

export function resolveKnownStep(stepId: string, lessonSlug: string): PromptEntry | null {
  const entry = manifest[stepId];
  if (!entry || entry.lessonSlug !== lessonSlug) return null;
  return entry;
}
