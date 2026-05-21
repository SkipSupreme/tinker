<script lang="ts">
  /**
   * Shannon's 1951 game.
   * A passage is revealed one character at a time. The learner types their
   * guess for the NEXT character. Wrong guess → counter++. Right guess →
   * advance and record (chars_guessed_in_N_attempts).
   *
   * After ≥ 10 characters, an implied bpc estimate is computed from the
   * learner's guess statistics, and compared against the reference bars for
   * Shannon, Cover-King, modern char-LMs, and the m18 capstone target.
   */

  // ~200-char Shakespeare excerpt (Sonnet 18). Public domain.
  const CORPUS = "shall i compare thee to a summer's day thou art more lovely and more temperate rough winds do shake the darling buds of may and summer's lease hath all too short a date";

  // After revealing first N characters as a free hint, the game starts.
  const HINT_LEN = 12;

  interface Props {
    maxChars?: number;
  }
  let { maxChars = 30 }: Props = $props();

  // The "cursor": index of the next character to be guessed.
  let cursor: number = $state(HINT_LEN);
  // Number of guesses spent on the current character so far.
  let currentGuesses: number = $state(0);
  // History of guesses-per-character, finalized when each char is solved.
  let history: number[] = $state([]);
  // Last wrong-guess feedback to show.
  let lastWrong: string | null = $state(null);
  // The learner's current text entry.
  let guess: string = $state('');

  function normalize(s: string): string { return s.toLowerCase(); }

  function submit() {
    if (cursor >= CORPUS.length) return;
    if (history.length >= maxChars) return;
    const want = normalize(CORPUS[cursor]);
    const have = normalize(guess.slice(0, 1) || ' ');
    if (!have) return;
    currentGuesses += 1;
    if (have === want) {
      history = [...history, currentGuesses];
      currentGuesses = 0;
      lastWrong = null;
      cursor += 1;
      // Auto-skip already-revealed spaces (which are "free"; count as one guess).
      while (cursor < CORPUS.length && CORPUS[cursor] === ' ' && history.length < maxChars) {
        history = [...history, 1];
        cursor += 1;
      }
    } else {
      lastWrong = have;
    }
    guess = '';
  }

  function skipChar() {
    if (cursor >= CORPUS.length) return;
    // "Give up" costs 27 guesses (upper bound: 26 letters + space).
    history = [...history, 27];
    cursor += 1;
    currentGuesses = 0;
    lastWrong = null;
    guess = '';
  }

  function reset() {
    cursor = HINT_LEN;
    currentGuesses = 0;
    history = [];
    lastWrong = null;
    guess = '';
  }

  const meanGuesses = $derived(
    history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0,
  );

  // Pedagogical estimator: bpc ≈ log₂(mean guesses).
  // (This is a rough proxy for Shannon's 1951 ranking-based bound; for
  // teaching purposes it gets the right magnitude without the full subtlety.)
  const impliedBpc = $derived(history.length > 0 ? Math.log2(Math.max(1, meanGuesses)) : 0);

  // Reference points for the side-by-side bar.
  const REFERENCES = [
    { name: 'Shannon 1951 lower', value: 0.6, color: 'var(--ink-sea)' },
    { name: 'Modern char-LM', value: 1.0, color: 'var(--ink-teal)' },
    { name: 'Cover & King 1978', value: 1.25, color: 'var(--ink-coral)' },
    { name: 'Shannon 1951 upper', value: 1.3, color: 'var(--ink-red)' },
    { name: 'Tiny-shakespeare capstone', value: 2.16, color: 'var(--ink-orange)' },
    { name: 'Uniform on 27', value: Math.log2(27), color: 'var(--site-fg-muted)' },
  ];

  function fmt(n: number, d = 2): string {
    if (!Number.isFinite(n)) return 'n/a';
    return n.toFixed(d);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  const done = $derived(history.length >= maxChars);
</script>

<div class="widget">
  <div class="passage">
    <span class="passage-label">passage</span>
    <span class="passage-body">
      {#each CORPUS.slice(0, cursor) as char, i}
        <span
          class="char"
          class:hint={i < HINT_LEN}
          class:solved={i >= HINT_LEN}
        >{char === ' ' ? '·' : char}</span>
      {/each}
      <span class="char target">{cursor < CORPUS.length ? '?' : '✓'}</span>
      {#each CORPUS.slice(cursor + 1, Math.min(CORPUS.length, cursor + 15)) as _char, _i}
        <span class="char masked">_</span>
      {/each}
      {#if cursor < CORPUS.length - 15}
        <span class="ellipsis">…</span>
      {/if}
    </span>
  </div>

  {#if !done && cursor < CORPUS.length}
    <div class="guess-row">
      <span class="guess-prompt">Guess the <strong>?</strong>:</span>
      <input
        type="text"
        maxlength="1"
        bind:value={guess}
        onkeydown={handleKeydown}
        class="guess-input"
        autocomplete="off"
        spellcheck="false"
        aria-label="Type your guess for the next character"
        autofocus
      />
      <button type="button" class="btn primary" onclick={submit}>Submit</button>
      <button type="button" class="btn ghost" onclick={skipChar}>Give up on this char</button>
      <div class="counter">
        {currentGuesses} guess{currentGuesses === 1 ? '' : 'es'} on this char
        {#if lastWrong} · last wrong: <span class="wrong">"{lastWrong}"</span>{/if}
      </div>
    </div>
  {:else}
    <div class="done-row">
      <strong>{done ? `Reached ${maxChars} characters!` : 'End of passage.'}</strong>
      <button type="button" class="btn ghost" onclick={reset}>Play again</button>
    </div>
  {/if}

  <div class="stats">
    <div class="stat">
      <div class="k">characters guessed</div>
      <div class="v">{history.length} / {maxChars}</div>
    </div>
    <div class="stat">
      <div class="k">avg guesses / char</div>
      <div class="v">{fmt(meanGuesses)}</div>
    </div>
    <div class="stat highlight">
      <div class="k">implied bpc ≈ log₂(avg)</div>
      <div class="v">{fmt(impliedBpc)} bits/char</div>
    </div>
  </div>

  <div class="floor-panel">
    <div class="floor-title">Where your bpc lands on the entropy ladder</div>
    <div class="floor-bar">
      {#each REFERENCES as ref}
        <div
          class="floor-marker"
          style={`left: ${(ref.value / 5.0) * 100}%`}
        >
          <span class="floor-tick" style={`background: ${ref.color}`}></span>
          <span class="floor-text" style={`color: ${ref.color}`}>{ref.name} = {ref.value.toFixed(2)}</span>
        </div>
      {/each}
      {#if history.length > 0}
        <div
          class="floor-marker you"
          style={`left: ${Math.min(100, (impliedBpc / 5.0) * 100)}%`}
        >
          <span class="floor-tick you-tick"></span>
          <span class="floor-text you-text">YOU = {fmt(impliedBpc)}</span>
        </div>
      {/if}
    </div>
  </div>

  <p class="caveat">
    Note: this widget uses a simple <code>bpc ≈ log₂(avg guesses)</code> proxy for Shannon's
    1951 ranking estimator. The real bound is tighter and depends on the full
    distribution of guess-ranks. The magnitudes match; the exact number is for
    intuition, not for a paper.
  </p>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
  }
  .passage {
    background: var(--demo-stage);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 12px;
    line-height: 1.7;
  }
  .passage-label {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
    display: block;
    margin-bottom: 6px;
  }
  .passage-body {
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--site-fg);
    word-break: break-all;
  }
  .char.hint { color: var(--site-fg-muted); }
  .char.solved { color: var(--ink-sea); font-weight: 600; }
  .char.target {
    color: var(--ink-red);
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .char.masked { color: color-mix(in srgb, var(--site-fg) 12%, transparent); }
  .ellipsis { color: var(--site-fg-muted); }

  .guess-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0;
    flex-wrap: wrap;
  }
  .guess-prompt {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--site-fg);
  }
  .guess-input {
    font-family: var(--font-mono);
    font-size: 22px;
    width: 50px;
    padding: 6px 10px;
    text-align: center;
    border-radius: 8px;
    border: 2px solid var(--ink-red);
    background: var(--demo-stage);
    color: var(--ink-red);
    font-weight: 700;
  }
  .counter {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--site-fg-muted);
  }
  .wrong { color: var(--ink-coral); font-weight: 700; }
  .done-row {
    margin: 12px 0;
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--site-fg);
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .stats {
    display: flex;
    gap: 14px;
    margin: 14px 0;
    flex-wrap: wrap;
  }
  .stat {
    flex: 1;
    min-width: 140px;
    padding: 10px 12px;
    background: var(--demo-stage);
    border-radius: 10px;
  }
  .stat .k {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--site-fg-muted);
    margin-bottom: 4px;
  }
  .stat .v {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 22px;
    color: var(--site-fg);
  }
  .stat.highlight {
    background: color-mix(in srgb, var(--ink-sun) 14%, var(--demo-card));
    border: 1px solid var(--ink-sun);
  }
  .stat.highlight .v { color: var(--ink-sun); }

  .floor-panel { margin-top: 14px; }
  .floor-title {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--site-fg-muted);
    margin-bottom: 36px;
  }
  .floor-bar {
    position: relative;
    height: 4px;
    background: color-mix(in srgb, var(--site-fg) 10%, transparent);
    border-radius: 4px;
    margin: 24px 0 38px;
  }
  .floor-marker {
    position: absolute;
    top: -4px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }
  .floor-tick {
    width: 2px;
    height: 14px;
    background: var(--site-fg-muted);
  }
  .floor-text {
    margin-top: 16px;
    font-family: var(--font-mono);
    font-size: 9px;
    white-space: nowrap;
    transform: rotate(-30deg);
    transform-origin: top left;
  }
  .floor-marker.you .you-tick {
    width: 4px;
    height: 22px;
    background: var(--ink-red);
    border-radius: 1px;
  }
  .floor-marker.you .you-text {
    color: var(--ink-red);
    font-weight: 700;
    font-size: 11px;
    transform: rotate(0deg);
    margin-top: 6px;
  }

  .btn {
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 120ms ease-out;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn.primary { background: var(--ink-red); color: white; border-color: var(--ink-red); }
  .btn.ghost { background: transparent; }
  .caveat {
    margin: 12px 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--site-fg-muted);
    line-height: 1.5;
  }
  .caveat code {
    background: var(--demo-stage);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
