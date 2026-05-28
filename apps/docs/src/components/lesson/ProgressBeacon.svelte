<script lang="ts">
  let { lessonSlug, courseSlug, moduleSlug } = $props<{
    lessonSlug: string;
    courseSlug: string;
    moduleSlug: string;
  }>();

  async function postAuthed(): Promise<boolean> {
    try {
      const res = await fetch('/api/progress/view', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          lesson_slug: lessonSlug,
          course_slug: courseSlug,
          module_slug: moduleSlug,
        }),
        keepalive: true,
      });
      // 401/403 means anon/session expired/same-origin guard failed; fall
      // back to local progress so the merge path can recover later.
      if (res.status === 401 || res.status === 403) return false;
      // 429 means rate-limited; user will re-emit on next nav. Expected.
      if (res.status === 429) return true;
      // Anything else is worth at least a breadcrumb and local fallback.
      if (!res.ok) {
        console.error('[progress-beacon] view returned', res.status);
        return false;
      }
      return true;
    } catch (e) {
      // Network failure is fine; user will re-emit on next nav.
      console.warn('[progress-beacon] view fetch failed', e);
      return false;
    }
  }

  function recordAnon() {
    try {
      const KEY = 'tinker:progress:v1';
      const raw = localStorage.getItem(KEY);
      const arr: Array<{
        lesson_slug: string;
        course_slug: string;
        module_slug: string;
        first_seen_at: string;
        last_seen_at: string;
        view_count?: number;
      }> = raw ? JSON.parse(raw) : [];
      const now = new Date().toISOString();
      const existing = arr.find((e) => e.lesson_slug === lessonSlug);
      if (existing) {
        existing.last_seen_at = now;
        existing.view_count = (existing.view_count ?? 1) + 1;
      } else {
        arr.push({
          lesson_slug: lessonSlug,
          course_slug: courseSlug,
          module_slug: moduleSlug,
          first_seen_at: now,
          last_seen_at: now,
          view_count: 1,
        });
      }
      // Cap at 500 entries; drop oldest by lastSeenAt.
      if (arr.length > 500) {
        arr.sort((a, b) => Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at));
        arr.length = 500;
      }
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch {
      // localStorage may be disabled; fail quietly
    }
  }

  async function emit() {
    const storedServerSide = await postAuthed();
    if (!storedServerSide) recordAnon();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    timer = setTimeout(emit, 2000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') emit();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  });
</script>
