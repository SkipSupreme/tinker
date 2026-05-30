<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * The Course Atlas: "The Climb".
   *
   * Renders the entire course as a vertical journey spine: arcs -> modules ->
   * lessons. Every module node expands inline to reveal all of its lessons, so
   * the homepage finally shows the whole course (all 92 lessons), not a 4-arc
   * teaser.
   *
   * Server-rendered with the real, final numbers and the full anon view so the
   * page is complete without JS. On mount it progressively enhances:
   *   - count-up animation on the stat strip (skipped under reduced motion),
   *   - mastery glow from /api/me/state for logged-in learners (completed
   *     lessons, per-module progress, a "jump back in" deep-link). This is the
   *     DESIGN.md mastery register, not streaks/badges.
   */

  interface AtlasLesson {
    slug: string;
    title: string;
    order: number;
    minutes: number;
  }
  interface AtlasModule {
    id: string;
    anchor: string;
    order: number;
    title: string;
    summary: string;
    minutes: number;
    keystone: boolean;
    lessons: AtlasLesson[];
  }
  interface AtlasArc {
    id: string;
    title: string;
    description: string;
    color: string;
    modules: AtlasModule[];
    moduleCount: number;
    lessonCount: number;
    minutes: number;
  }
  interface Totals {
    arcs: number;
    modules: number;
    lessons: number;
    minutes: number;
  }
  interface ProgressRow {
    moduleSlug: string;
    viewCount: number;
    completedAt: string | null;
    lastSeenAt: string;
  }

  let { arcs, totals }: { arcs: AtlasArc[]; totals: Totals } = $props();

  // --- Static lookups built once from props (props are build-time constant). ---
  const flatSlugs: string[] = arcs.flatMap((a) =>
    a.modules.flatMap((m) => m.lessons.map((l) => l.slug)),
  );
  const lessonIndex = new Map<string, { title: string; anchor: string }>();
  for (const a of arcs)
    for (const m of a.modules)
      for (const l of m.lessons) lessonIndex.set(l.slug, { title: l.title, anchor: m.anchor });

  const totalHours = Math.max(1, Math.round(totals.minutes / 60));

  // --- Expand / collapse. Keystone opens by default so the expand affordance
  // is obvious; an authed learner's current module is opened after load. ---
  let open = $state<Record<string, boolean>>(
    Object.fromEntries(
      arcs.flatMap((a) => a.modules).filter((m) => m.keystone).map((m) => [m.id, true]),
    ),
  );
  const anyExpandable = arcs.some((a) => a.modules.some((m) => m.lessons.length > 0));
  let allOpen = $state(false);

  function toggle(id: string) {
    open = { ...open, [id]: !open[id] };
  }
  function setAll(value: boolean) {
    allOpen = value;
    const next: Record<string, boolean> = {};
    for (const a of arcs) for (const m of a.modules) if (m.lessons.length) next[m.id] = value;
    open = next;
  }

  // --- Progress (authed only). ---
  let progress = $state<Record<string, ProgressRow>>({});
  let progressLoaded = $state(false);

  function isDone(slug: string): boolean {
    return Boolean(progress[slug]?.completedAt);
  }
  function moduleDone(m: AtlasModule): number {
    let n = 0;
    for (const l of m.lessons) if (isDone(l.slug)) n++;
    return n;
  }

  const totalCompleted = $derived(
    progressLoaded ? flatSlugs.reduce((n, s) => n + (isDone(s) ? 1 : 0), 0) : 0,
  );

  const continueLesson = $derived.by(() => {
    if (!progressLoaded) return null;
    const entries = Object.entries(progress);
    if (entries.length === 0) return null;
    const inProgress = entries
      .filter(([, v]) => !v.completedAt)
      .sort((a, b) => (a[1].lastSeenAt < b[1].lastSeenAt ? 1 : -1));
    let slug: string | undefined = inProgress[0]?.[0];
    if (!slug) slug = flatSlugs.find((s) => !progress[s]); // everything seen is done -> next unstarted
    if (!slug) return null;
    const meta = lessonIndex.get(slug);
    return meta ? { slug, ...meta } : null;
  });

  // --- Sticky arc rail: track the arc currently in view. ---
  let activeArc = $state(arcs[0]?.id ?? '');
  let prefersReduced = false;

  function scrollToArc(id: string) {
    const el = document.getElementById(`arc-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  }

  // --- Count-up. SSR/initial render shows the real totals; after mount we drop
  // to 0 and animate up, but only when motion is allowed and the strip is seen. ---
  let shown = $state({ arcs: totals.arcs, modules: totals.modules, lessons: totals.lessons, hours: totalHours });
  let statsEl: HTMLElement | undefined = $state();

  function countUp() {
    const start = performance.now();
    const DURATION = 900;
    const target = { arcs: totals.arcs, modules: totals.modules, lessons: totals.lessons, hours: totalHours };
    function frame(now: number) {
      const t = Math.min(1, (now - start) / DURATION);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      shown = {
        arcs: Math.round(target.arcs * e),
        modules: Math.round(target.modules * e),
        lessons: Math.round(target.lessons * e),
        hours: Math.round(target.hours * e),
      };
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  onMount(() => {
    prefersReduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mastery glow for logged-in learners.
    void (async () => {
      try {
        const res = await fetch('/api/me/state?course=ml-math', {
          credentials: 'same-origin',
          headers: { accept: 'application/json' },
        });
        if (!res.ok) return; // 401/403 anon, or transient: stay in anon view
        const body = (await res.json()) as { progress?: Record<string, ProgressRow> };
        progress = body.progress ?? {};
        progressLoaded = true;
        const cur = continueLesson;
        if (cur) {
          const mod = arcs.flatMap((a) => a.modules).find((m) => m.anchor === cur.anchor);
          if (mod && mod.lessons.length) open = { ...open, [mod.id]: true };
        }
      } catch {
        /* fail silent: anon view */
      }
    })();

    // Count-up when the stat strip scrolls into view.
    let counted = false;
    let statObserver: IntersectionObserver | undefined;
    if (statsEl && !prefersReduced && typeof IntersectionObserver === 'function') {
      shown = { arcs: 0, modules: 0, lessons: 0, hours: 0 };
      statObserver = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting && !counted) {
              counted = true;
              countUp();
              statObserver?.disconnect();
            }
          }
        },
        { threshold: 0.4 },
      );
      statObserver.observe(statsEl);
    }

    // Active-arc tracking for the sticky rail.
    let arcObserver: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'function') {
      arcObserver = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              const id = (en.target as HTMLElement).dataset.arc;
              if (id) activeArc = id;
            }
          }
        },
        { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
      );
      for (const el of document.querySelectorAll<HTMLElement>('[data-arc]')) arcObserver.observe(el);
    }

    return () => {
      statObserver?.disconnect();
      arcObserver?.disconnect();
    };
  });
</script>

<section class="atlas" aria-label="The whole course, arc by arc">
  <!-- Stat strip -->
  <div class="stats" bind:this={statsEl}>
    <div class="stat"><span class="stat-num">{shown.arcs}</span><span class="stat-label">arcs</span></div>
    <div class="stat-div" aria-hidden="true"></div>
    <div class="stat"><span class="stat-num">{shown.modules}</span><span class="stat-label">modules</span></div>
    <div class="stat-div" aria-hidden="true"></div>
    <div class="stat"><span class="stat-num">{shown.lessons}</span><span class="stat-label">lessons</span></div>
    <div class="stat-div" aria-hidden="true"></div>
    <div class="stat"><span class="stat-num">~{shown.hours}h</span><span class="stat-label">of interactive math</span></div>
  </div>

  <!-- Sticky arc rail -->
  <nav class="rail" aria-label="Jump to an arc">
    {#each arcs as arc, i (arc.id)}
      <button
        class="rail-chip"
        class:active={activeArc === arc.id}
        style:--arc={arc.color}
        onclick={() => scrollToArc(arc.id)}
      >
        <span class="rail-dot"></span>
        <span class="rail-name">{arc.title}</span>
        <span class="rail-count">{arc.lessonCount}</span>
      </button>
    {/each}
  </nav>

  <!-- Continue banner (authed) -->
  {#if continueLesson}
    <a class="continue" href={`/lessons/${continueLesson.slug}`}>
      <span class="continue-label">Jump back in</span>
      <span class="continue-title">{continueLesson.title}</span>
      <span class="continue-meta">{totalCompleted} / {totals.lessons} lessons complete</span>
      <span class="continue-arrow" aria-hidden="true">→</span>
    </a>
  {:else if anyExpandable}
    <div class="expand-row">
      <button class="expand-all" onclick={() => setAll(!allOpen)}>
        {allOpen ? 'Collapse all modules' : 'Expand every module'}
      </button>
    </div>
  {/if}

  <ol class="arcs">
    {#each arcs as arc, i (arc.id)}
      <li class="arc" id={`arc-${arc.id}`} data-arc={arc.id} style:--arc={arc.color}>
        <header class="arc-head">
          <span class="arc-tag">Arc {i}</span>
          <h3 class="arc-title">{arc.title}</h3>
          <p class="arc-desc">{arc.description}</p>
          <p class="arc-meta">
            {arc.moduleCount} module{arc.moduleCount === 1 ? '' : 's'} · {arc.lessonCount} lessons · ~{Math.max(1, Math.round(arc.minutes / 60))}h
          </p>
        </header>

        <ol class="modules">
          {#each arc.modules as m (m.id)}
            {@const done = moduleDone(m)}
            {@const mastered = progressLoaded && m.lessons.length > 0 && done === m.lessons.length}
            <li class="mod" class:keystone={m.keystone} class:mastered id={m.anchor}>
              <div class="spine" aria-hidden="true"><span class="node"></span></div>

              <div class="mod-card">
                {#if m.lessons.length > 0}
                  <button class="mod-head" aria-expanded={!!open[m.id]} onclick={() => toggle(m.id)}>
                    <span class="mod-num">M{m.order}</span>
                    <span class="mod-body">
                      <span class="mod-title">
                        {m.title}
                        {#if m.keystone}<span class="keystone-badge">keystone</span>{/if}
                      </span>
                      <span class="mod-summary">{m.summary}</span>
                      <span class="mod-meta">
                        <span>{m.lessons.length} lessons</span>
                        <span class="dot">·</span>
                        <span>~{m.minutes} min</span>
                        {#if progressLoaded && done > 0}
                          <span class="dot">·</span><span class="done-count">{done}/{m.lessons.length} done</span>
                        {/if}
                      </span>
                      {#if progressLoaded}
                        <span class="mod-progress" aria-hidden="true">
                          <span class="mod-progress-fill" style:width={`${Math.round((done / m.lessons.length) * 100)}%`}></span>
                        </span>
                      {/if}
                    </span>
                    <span class="mod-toggle" aria-hidden="true">{open[m.id] ? '−' : '+'}</span>
                  </button>

                  <div class="lessons-wrap" class:open={open[m.id]}>
                    <ol class="lessons">
                      {#each m.lessons as l (l.slug)}
                        <li>
                          <a class="lesson" class:done={isDone(l.slug)} href={`/lessons/${l.slug}`}>
                            <span class="l-order">{String(l.order).padStart(2, '0')}</span>
                            <span class="l-title">{l.title}</span>
                            <span class="l-min">{l.minutes}m</span>
                            {#if isDone(l.slug)}<span class="l-check" aria-label="completed">✓</span>{/if}
                          </a>
                        </li>
                      {/each}
                    </ol>
                  </div>
                {:else}
                  <div class="mod-head mod-head-static">
                    <span class="mod-num">M{m.order}</span>
                    <span class="mod-body">
                      <span class="mod-title">{m.title}</span>
                      <span class="mod-summary">{m.summary}</span>
                      <span class="mod-meta"><span class="placement-tag">Optional · placement</span></span>
                    </span>
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      </li>
    {/each}
  </ol>
</section>

<style>
  .atlas {
    max-width: var(--max-shell);
    margin: 0 auto;
    position: relative;
  }

  /* === Stat strip === */
  .stats {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.4rem 1.4rem;
    margin: 0 0 2.5rem;
    padding: 1.1rem 1.25rem;
    border: 1px solid var(--site-border);
    border-radius: var(--radius-lg);
    background: var(--demo-card);
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 5.5rem;
  }
  .stat-num {
    font-family: var(--font-game);
    font-weight: 700;
    font-size: clamp(1.6rem, 3.4vw, 2.4rem);
    line-height: 1;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }
  .stat-label {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
    margin-top: 0.35rem;
    text-align: center;
  }
  .stat-div {
    width: 1px;
    align-self: stretch;
    background: var(--site-border);
  }
  @media (max-width: 560px) {
    .stat-div { display: none; }
    .stats { gap: 1rem 1.4rem; }
  }

  /* === Sticky arc rail === */
  .rail {
    position: sticky;
    top: calc(var(--nav-height) + 0.5rem);
    z-index: 4;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.55rem;
    margin: 0 auto 1.5rem;
    border: 1px solid var(--site-border);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--site-bg) 86%, transparent);
    backdrop-filter: saturate(1.4) blur(8px);
    -webkit-backdrop-filter: saturate(1.4) blur(8px);
    width: fit-content;
    max-width: 100%;
  }
  .rail-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.85rem;
    border: 1px solid transparent;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--site-fg-muted);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
    white-space: nowrap;
  }
  .rail-dot {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: var(--arc);
    flex: none;
  }
  .rail-count {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--site-fg-muted);
    background: color-mix(in srgb, var(--site-fg) 8%, transparent);
    border-radius: 999px;
    padding: 0.05rem 0.4rem;
    font-variant-numeric: tabular-nums;
  }
  .rail-chip:hover { color: var(--site-fg); background: color-mix(in srgb, var(--arc) 10%, transparent); }
  .rail-chip.active {
    color: var(--site-fg);
    border-color: color-mix(in srgb, var(--arc) 55%, transparent);
    background: color-mix(in srgb, var(--arc) 14%, transparent);
  }
  @media (max-width: 680px) {
    .rail {
      flex-wrap: nowrap;
      overflow-x: auto;
      width: 100%;
      border-radius: var(--radius-lg);
      justify-content: flex-start;
      scrollbar-width: none;
    }
    .rail::-webkit-scrollbar { display: none; }
    .rail-name { display: none; }
  }

  /* === Continue banner === */
  .continue {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 0.25rem 0.9rem;
    padding: 0.95rem 1.25rem;
    margin: 0 0 2rem;
    border-radius: var(--radius-lg);
    border: 1.5px solid color-mix(in srgb, var(--cta) 45%, transparent);
    background: color-mix(in srgb, var(--cta) 10%, var(--demo-card));
    text-decoration: none;
    color: var(--site-fg);
    transition: transform 140ms ease, box-shadow 160ms ease, border-color 160ms ease;
  }
  .continue:hover {
    transform: translateY(-1px);
    border-color: var(--cta);
    box-shadow: 0 14px 28px -16px color-mix(in srgb, var(--cta) 70%, transparent);
  }
  .continue-label {
    grid-row: 1 / 3;
    font-family: var(--font-game);
    font-weight: 700;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--cta-hover);
  }
  .continue-title {
    font-family: var(--font-display);
    font-weight: 650;
    font-size: 1.05rem;
    min-width: 0;
  }
  .continue-meta {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    white-space: nowrap;
  }
  .continue-arrow { font-size: 1.3rem; color: var(--cta-hover); }
  @media (max-width: 560px) {
    .continue { grid-template-columns: auto 1fr auto; }
    .continue-meta { grid-column: 2 / 4; font-size: 0.72rem; }
  }

  .expand-row { display: flex; justify-content: flex-end; margin: 0 0 1.25rem; }
  .expand-all {
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ink-red);
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--ink-red) 30%, transparent);
    border-radius: var(--radius-pill);
    padding: 0.4rem 0.95rem;
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease;
  }
  .expand-all:hover { background: color-mix(in srgb, var(--ink-red) 8%, transparent); border-color: var(--ink-red); }

  /* === Arcs === */
  .arcs { list-style: none; padding: 0; margin: 0; }
  .arc {
    scroll-margin-top: calc(var(--nav-height) + 1rem);
    padding: 1.5rem 0 0.5rem;
  }
  .arc-head { margin: 0 0 1.25rem; padding-left: 2.5rem; position: relative; }
  .arc-head::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.15rem;
    width: 6px;
    height: calc(100% - 0.3rem);
    min-height: 2.5rem;
    border-radius: 999px;
    background: var(--arc);
  }
  .arc-tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    color: var(--arc);
    margin: 0 0 0.3rem;
  }
  .arc-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(1.4rem, 3vw, 2rem);
    letter-spacing: -0.02em;
    margin: 0 0 0.35rem;
    text-wrap: balance;
  }
  .arc-desc {
    margin: 0 0 0.5rem;
    color: var(--site-fg-muted);
    font-size: 0.98rem;
    line-height: 1.5;
    max-width: 60ch;
  }
  .arc-meta {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  /* === Modules on the spine === */
  .modules { list-style: none; padding: 0; margin: 0; }
  .mod {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    align-items: stretch;
  }
  .spine { position: relative; display: flex; justify-content: center; }
  /* The connecting line behind nodes. */
  .spine::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: -0.9rem;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    background: color-mix(in srgb, var(--arc) 35%, transparent);
  }
  .mod:last-child .spine::before { bottom: auto; height: 1.85rem; }
  .node {
    position: relative;
    z-index: 1;
    width: 15px;
    height: 15px;
    margin-top: 1.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--arc) 70%, var(--demo-card));
    border: 2.5px solid var(--arc);
    flex: none;
    transition: transform 160ms ease, box-shadow 200ms ease;
  }
  .mod.keystone .node {
    width: 21px;
    height: 21px;
    border-width: 3px;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--arc) 22%, transparent);
  }
  .mod.mastered .node {
    background: var(--cta);
    border-color: var(--cta-hover);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--cta) 28%, transparent);
  }

  .mod-card { padding: 0.9rem 0 0.9rem; min-width: 0; }
  .mod-head {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: start;
    gap: 0.4rem 0.9rem;
    width: 100%;
    text-align: left;
    background: var(--demo-card);
    border: 1.5px solid var(--demo-card-border, var(--site-border));
    border-radius: var(--radius-lg);
    padding: 1rem 1.1rem;
    font: inherit;
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 150ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }
  .mod-head-static { cursor: default; }
  .mod-head:hover:not(.mod-head-static) {
    transform: translateX(2px);
    border-color: color-mix(in srgb, var(--arc) 55%, transparent);
    box-shadow: 0 14px 28px -20px color-mix(in srgb, var(--arc) 70%, transparent);
  }
  .mod-num {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 800;
    font-size: 1.5rem;
    line-height: 1;
    color: color-mix(in srgb, var(--arc) 85%, var(--site-fg));
    font-variant-numeric: tabular-nums;
  }
  .mod.keystone .mod-num { font-size: 1.8rem; }
  .mod-body { min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .mod-title {
    font-family: var(--font-display);
    font-weight: 650;
    font-size: 1.12rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .keystone-badge {
    font-family: var(--font-game);
    font-weight: 700;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--arc);
    background: color-mix(in srgb, var(--arc) 16%, transparent);
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
    transform: translateY(-1px);
  }
  .mod-summary {
    color: var(--site-fg-muted);
    font-size: 0.9rem;
    line-height: 1.5;
    max-width: 62ch;
  }
  .mod-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--site-fg-muted);
    margin-top: 0.15rem;
  }
  .mod-meta .dot { opacity: 0.5; }
  .done-count { color: var(--cta-hover); font-weight: 600; }
  .placement-tag {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--site-fg-muted);
    border: 1px dashed color-mix(in srgb, var(--arc) 45%, transparent);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
  }

  .mod-progress {
    margin-top: 0.5rem;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--site-fg) 10%, transparent);
    overflow: hidden;
  }
  .mod-progress-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--cta);
    transition: width 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .mod-toggle {
    font-family: var(--font-mono);
    font-size: 1.3rem;
    line-height: 1;
    color: var(--site-fg-muted);
    width: 1.4rem;
    text-align: center;
    align-self: center;
  }
  .mod-head:hover .mod-toggle { color: var(--arc); }

  /* Expand animation via grid-template-rows. */
  .lessons-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .lessons-wrap.open { grid-template-rows: 1fr; }
  .lessons {
    overflow: hidden;
    list-style: none;
    padding: 0;
    margin: 0;
    min-height: 0;
  }
  .lessons > li { margin-top: 0.4rem; }
  .lessons > li:first-child { margin-top: 0.55rem; }
  .lesson {
    display: grid;
    grid-template-columns: 1.9rem 1fr auto auto;
    align-items: baseline;
    gap: 0.7rem;
    padding: 0.55rem 0.85rem;
    border: 1px solid color-mix(in srgb, var(--site-fg) 9%, transparent);
    border-radius: var(--radius-md, 8px);
    background: color-mix(in srgb, var(--site-bg) 60%, transparent);
    text-decoration: none;
    color: var(--site-fg);
    transition: border-color 150ms ease, background 150ms ease, transform 120ms ease;
  }
  .lesson:hover {
    border-color: var(--arc);
    background: color-mix(in srgb, var(--arc) 6%, transparent);
    transform: translateX(2px);
  }
  .l-order {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    font-variant-numeric: tabular-nums;
  }
  .l-title { font-size: 0.95rem; line-height: 1.35; min-width: 0; }
  .l-min {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--site-fg-muted);
    white-space: nowrap;
  }
  .l-check {
    color: var(--cta-hover);
    font-weight: 700;
    font-size: 0.9rem;
  }
  .lesson.done { border-color: color-mix(in srgb, var(--cta) 35%, transparent); background: color-mix(in srgb, var(--cta) 7%, transparent); }
  .lesson.done .l-title { color: var(--site-fg-muted); }

  @media (max-width: 560px) {
    .mod { grid-template-columns: 1.6rem 1fr; }
    .mod-head { grid-template-columns: auto 1fr; }
    .mod-toggle { display: none; }
    .lesson { grid-template-columns: 1.6rem 1fr auto; }
    .lesson .l-min { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lessons-wrap,
    .mod-progress-fill,
    .node,
    .mod-head,
    .lesson,
    .continue { transition: none; }
  }
</style>
