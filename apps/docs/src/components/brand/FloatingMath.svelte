<script lang="ts">
  /**
   * FloatingMath — five drifting math symbols in the hero band.
   * DESIGN.md §Decoration: max 5 per hero, teal/orange/pink only,
   * Fraunces italic, opacity 0.18–0.35, freeze under reduced-motion.
   */
  const symbols = [
    { ch: 'π', color: 'var(--ink-teal)',   top: '12%', left: '8%',  delay: '0s',   d: '6.2s' },
    { ch: '∫', color: 'var(--ink-orange)', top: '24%', left: '78%', delay: '1.4s', d: '7.0s' },
    { ch: '∂', color: 'var(--ink-pink)',   top: '62%', left: '18%', delay: '2.8s', d: '5.4s' },
    { ch: 'Δ', color: 'var(--ink-teal)',   top: '78%', left: '70%', delay: '0.6s', d: '6.8s' },
    { ch: '∑', color: 'var(--ink-orange)', top: '40%', left: '46%', delay: '3.2s', d: '5.8s' },
  ];
</script>

<div class="floating-math" aria-hidden="true">
  {#each symbols as s}
    <span
      class="sym"
      style="
        top: {s.top};
        left: {s.left};
        color: {s.color};
        animation-delay: {s.delay};
        animation-duration: {s.d};
      "
    >{s.ch}</span>
  {/each}
</div>

<style>
  .floating-math {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .sym {
    position: absolute;
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic;
    font-weight: 600;
    font-size: clamp(2rem, 4vw, 3.25rem);
    opacity: 0.26;
    animation: drift-y ease-in-out infinite;
  }
  @keyframes drift-y {
    0%, 100% { transform: translateY(0)     translateX(0); }
    25%      { transform: translateY(-14px) translateX(4px); }
    50%      { transform: translateY(0)     translateX(-6px); }
    75%      { transform: translateY(12px)  translateX(2px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sym { animation-play-state: paused; }
  }
</style>
