<script lang="ts">
  // ── Machine rule registry ──────────────────────────────────────────────────
  interface Rule {
    id: string;
    label: string;       // display label like "f(x) = 2x + 1"
    fn: (x: number) => number;
    symbolic: (inner: string) => string; // build symbolic expression from inner
  }

  const RULES: Rule[] = [
    {
      id: 'double_plus1',
      label: 'f(x) = 2x + 1',
      fn: x => 2 * x + 1,
      symbolic: inner => `2(${inner}) + 1`,
    },
    {
      id: 'square',
      label: 'g(x) = x²',
      fn: x => x * x,
      symbolic: inner => `(${inner})²`,
    },
    {
      id: 'plus3',
      label: 'h(x) = x + 3',
      fn: x => x + 3,
      symbolic: inner => `(${inner}) + 3`,
    },
    {
      id: 'triple',
      label: 'p(x) = 3x',
      fn: x => 3 * x,
      symbolic: inner => `3(${inner})`,
    },
  ];

  function ruleById(id: string): Rule {
    return RULES.find(r => r.id === id) ?? RULES[0];
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let slot1Id = $state('double_plus1');  // left machine
  let slot2Id = $state('square');        // right machine
  let swapped  = $state(false);          // false = slot1→slot2; true = slot2→slot1

  let wired    = $state(false);          // is there a wire connecting them?
  let pendingPort = $state<'out1' | 'out2' | null>(null); // which output port was clicked

  let inputX   = $state(3);
  let running  = $state(false);

  // Animation state
  let ballX    = $state(0);   // 0..1 normalized position along pipeline
  let ballVal  = $state<number | null>(null);
  let ballLabel = $state('');

  // Result state
  let lastSteps = $state<string>('');
  let lastRan   = $state(false);

  // Reduced-motion
  let prefersReduced = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced = mq.matches;
    const h = (e: MediaQueryListEvent) => { prefersReduced = e.matches; };
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const rule1 = $derived(ruleById(slot1Id));
  const rule2 = $derived(ruleById(slot2Id));

  // "First" machine is the one whose output feeds the other's input
  const machineA = $derived(swapped ? rule2 : rule1);  // runs first
  const machineB = $derived(swapped ? rule1 : rule2);  // runs second

  const compositeSymbol = $derived(
    wired ? machineB.symbolic(machineA.symbolic('x')) : '—'
  );

  const compositeResult = $derived(
    wired && lastRan
      ? machineB.fn(machineA.fn(inputX))
      : null
  );

  // ── SVG layout constants ───────────────────────────────────────────────────
  const W = 560;
  const H = 170;
  const BOX_W = 130;
  const BOX_H = 76;
  const BOX_Y = (H - BOX_H) / 2;           // vertically centered
  const PORT_R = 7;

  // Entry chute
  const ENTRY_X = 24;

  // Machine A
  const A_X = 72;
  const A_CX = A_X + BOX_W / 2;
  const A_IN_X  = A_X;
  const A_OUT_X = A_X + BOX_W;

  // Machine B
  const B_X = A_X + BOX_W + 82;
  const B_CX = B_X + BOX_W / 2;
  const B_IN_X  = B_X;
  const B_OUT_X = B_X + BOX_W;

  // Exit chute
  const EXIT_X = W - 20;

  const MID_Y = H / 2;

  // ── Wire click interaction ────────────────────────────────────────────────
  function clickPort(port: 'out1' | 'out2') {
    if (!pendingPort) {
      pendingPort = port;
    } else {
      // Any second port click completes the wire
      wired = true;
      pendingPort = null;
      lastRan = false;
      lastSteps = '';
    }
  }

  function disconnectWire() {
    wired = false;
    pendingPort = null;
    lastRan = false;
    lastSteps = '';
    running = false;
    ballVal = null;
    ballLabel = '';
  }

  // ── Run animation ─────────────────────────────────────────────────────────
  async function runPipeline() {
    if (!wired || running) return;
    running = true;
    lastRan = false;
    ballVal = null;
    ballLabel = '';

    const x0 = inputX;
    const mid = machineA.fn(x0);
    const end = machineB.fn(mid);

    const steps: [number, number, string][] = [
      // [startPos_0..1, endPos_0..1, labelAfter]
      [0.0, 0.22, `${x0}`],       // entry → machine A input
      [0.22, 0.5,  `${x0}`],      // through machine A
      [0.5, 0.62,  `${mid}`],     // machine A output → machine B input
      [0.62, 0.88, `${mid}`],     // through machine B
      [0.88, 1.0,  `${end}`],     // exit
    ];

    const STEP_MS = prefersReduced ? 0 : 320;

    ballX = 0;
    ballVal = x0;
    ballLabel = `${x0}`;

    for (let i = 0; i < steps.length; i++) {
      const [from, to, labelAfter] = steps[i];
      ballX = from;
      await animateTo(from, to, STEP_MS);
      ballLabel = labelAfter;
      if (i === 1) ballVal = mid;   // exiting machine A
      if (i === 3) ballVal = end;   // exiting machine B
      if (!prefersReduced) await delay(80);
    }

    lastSteps = `x = ${x0}  →  ${machineA.label.split('=')[0].trim()}  →  ${mid}  →  ${machineB.label.split('=')[0].trim()}  →  ${end}`;
    lastRan = true;
    running = false;

    // Fade out ball after a moment
    await delay(900);
    if (!running) ballVal = null;
  }

  function animateTo(from: number, to: number, ms: number): Promise<void> {
    return new Promise(resolve => {
      if (ms <= 0 || prefersReduced) {
        ballX = to;
        resolve();
        return;
      }
      const start = performance.now();
      function tick(now: number) {
        const t = Math.min((now - start) / ms, 1);
        ballX = from + (to - from) * easeInOut(t);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function easeInOut(t: number) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Ball SVG position ─────────────────────────────────────────────────────
  // Map ballX (0..1) to SVG x coordinate along the pipeline
  function ballSvgX(t: number): number {
    // Pipeline segments: entry(0-0.12) → machA(0.12-0.5) → gap(0.5-0.62) → machB(0.62-1)
    const segs = [
      [0,    0.22,  ENTRY_X,       A_IN_X],
      [0.22, 0.5,   A_IN_X,        A_OUT_X],
      [0.5,  0.78,  A_OUT_X,       B_IN_X],
      [0.78, 1.0,   B_IN_X,        EXIT_X],
    ];
    for (const [s, e, xs, xe] of segs) {
      if (t <= e) {
        const p = e === s ? 1 : (t - s) / (e - s);
        return xs + (xe - xs) * p;
      }
    }
    return EXIT_X;
  }

  // ── Swap ─────────────────────────────────────────────────────────────────
  function swapWiring() {
    swapped = !swapped;
    lastRan = false;
    lastSteps = '';
    running = false;
    ballVal = null;
  }
</script>

<div class="widget">
  <!-- ── Header ── -->
  <div class="header">
    <span class="title">Function Machines</span>
    <span class="badge">g ∘ f</span>
  </div>

  <!-- ── SVG Pipeline Stage ── -->
  <div class="stage">
    <svg
      viewBox="0 0 {W} {H}"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Function machine pipeline diagram"
    >
      <!-- ── Entry chute ── -->
      <line
        x1={ENTRY_X} y1={MID_Y}
        x2={A_IN_X} y2={MID_Y}
        class="pipe"
      />
      <text x={ENTRY_X - 2} y={MID_Y - 10} class="svg-label entry-label">x = {inputX}</text>
      <circle cx={ENTRY_X} cy={MID_Y} r="5" class="entry-dot" />

      <!-- ── Middle pipe (wired or dashed) ── -->
      {#if wired}
        <line
          x1={A_OUT_X} y1={MID_Y}
          x2={B_IN_X} y2={MID_Y}
          class="pipe pipe-live"
        />
      {:else}
        <line
          x1={A_OUT_X} y1={MID_Y}
          x2={B_IN_X} y2={MID_Y}
          class="pipe pipe-dashed"
        />
      {/if}

      <!-- ── Exit pipe ── -->
      <line
        x1={B_OUT_X} y1={MID_Y}
        x2={EXIT_X} y2={MID_Y}
        class="pipe"
      />
      <circle cx={EXIT_X} cy={MID_Y} r="5" class="exit-dot" />
      {#if lastRan && compositeResult !== null}
        <text x={EXIT_X + 4} y={MID_Y - 10} class="svg-label exit-label">{compositeResult}</text>
      {/if}

      <!-- ── Machine A box ── -->
      <rect
        x={A_X} y={BOX_Y}
        width={BOX_W} height={BOX_H}
        class="machine-box machine-a"
        rx="10"
      />
      <text x={A_CX} y={BOX_Y + BOX_H * 0.38} class="machine-name">
        {swapped ? 'B' : 'A'}
      </text>
      <text x={A_CX} y={BOX_Y + BOX_H * 0.7} class="machine-rule">
        {machineA.label.split('=')[1]?.trim() ?? ''}
      </text>

      <!-- Port: A input (left) -->
      <circle
        cx={A_IN_X} cy={MID_Y} r={PORT_R}
        class="port port-in"
      />

      <!-- Port: A output (right) — clickable -->
      <circle
        cx={A_OUT_X} cy={MID_Y} r={PORT_R}
        class="port port-out {pendingPort === 'out1' ? 'port-active' : ''}"
        role="button"
        tabindex="0"
        aria-label="Machine A output port — click to start wiring"
        onclick={() => clickPort('out1')}
        onkeydown={e => (e.key === 'Enter' || e.key === ' ') && clickPort('out1')}
      />

      <!-- ── Machine B box ── -->
      <rect
        x={B_X} y={BOX_Y}
        width={BOX_W} height={BOX_H}
        class="machine-box machine-b"
        rx="10"
      />
      <text x={B_CX} y={BOX_Y + BOX_H * 0.38} class="machine-name">
        {swapped ? 'A' : 'B'}
      </text>
      <text x={B_CX} y={BOX_Y + BOX_H * 0.7} class="machine-rule">
        {machineB.label.split('=')[1]?.trim() ?? ''}
      </text>

      <!-- Port: B input (left) — clickable (second half of wiring) -->
      <circle
        cx={B_IN_X} cy={MID_Y} r={PORT_R}
        class="port port-in {pendingPort ? 'port-target' : ''}"
        role="button"
        tabindex="0"
        aria-label="Machine B input port — click to complete wire"
        onclick={() => pendingPort && clickPort('out2')}
        onkeydown={e => (e.key === 'Enter' || e.key === ' ') && pendingPort && clickPort('out2')}
      />

      <!-- Port: B output (right) -->
      <circle
        cx={B_OUT_X} cy={MID_Y} r={PORT_R}
        class="port port-out"
      />

      <!-- ── Animated ball ── -->
      {#if ballVal !== null}
        <circle
          cx={ballSvgX(ballX)}
          cy={MID_Y}
          r="14"
          class="ball"
        />
        <text
          x={ballSvgX(ballX)}
          y={MID_Y + 4}
          class="ball-label"
        >{ballLabel}</text>
      {/if}

      <!-- ── "Pending wire" prompt ── -->
      {#if pendingPort && !wired}
        <text x={W / 2} y={H - 8} class="svg-hint">now click Machine B's input port</text>
      {/if}
    </svg>

    <!-- ── Wire disconnect button (shown when wired) ── -->
    {#if wired}
      <button class="disconnect-btn" onclick={disconnectWire} aria-label="Disconnect wire">
        disconnect wire ×
      </button>
    {/if}
  </div>

  <!-- ── Controls ── -->
  <div class="controls">
    <!-- Slot selectors -->
    <div class="slot-row">
      <div class="slot">
        <label class="slot-label" for="slot1-sel">
          <span class="slot-pill slot-a">Machine {swapped ? 'B' : 'A'} (runs first)</span>
        </label>
        <select id="slot1-sel" bind:value={slot1Id} onchange={() => { lastRan = false; lastSteps = ''; }}>
          {#each RULES as r (r.id)}
            <option value={r.id}>{r.label}</option>
          {/each}
        </select>
      </div>

      <button
        class="swap-btn"
        onclick={swapWiring}
        aria-label="Swap wiring order — flip which machine runs first"
        title="Swap wiring order"
      >
        ⇄ swap
      </button>

      <div class="slot">
        <label class="slot-label" for="slot2-sel">
          <span class="slot-pill slot-b">Machine {swapped ? 'A' : 'B'} (runs second)</span>
        </label>
        <select id="slot2-sel" bind:value={slot2Id} onchange={() => { lastRan = false; lastSteps = ''; }}>
          {#each RULES as r (r.id)}
            <option value={r.id}>{r.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Input + Run -->
    <div class="run-row">
      {#if !wired}
        <p class="wire-prompt">
          Click Machine A's output port, then Machine B's input port to wire them together.
        </p>
      {:else}
        <label class="x-label" for="x-input">
          Input <em>x</em> =
        </label>
        <input
          id="x-input"
          type="number"
          min="-3"
          max="5"
          step="1"
          bind:value={inputX}
          class="x-input"
          aria-label="Input value x"
        />
        <button
          class="run-btn"
          onclick={runPipeline}
          disabled={running}
          aria-label="Run the pipeline"
        >
          {running ? 'running…' : '▶ Run'}
        </button>
      {/if}
    </div>
  </div>

  <!-- ── Readout ── -->
  <div class="readout" aria-live="polite">
    <div class="composite-row">
      <span class="composite-label">composite:</span>
      <span class="composite-expr">{compositeSymbol}</span>
    </div>

    {#if lastRan && lastSteps}
      <div class="steps-row">
        <span class="steps-label">last run:</span>
        <span class="steps-val">{lastSteps}</span>
      </div>
      {#if compositeResult !== null}
        <div class="result-row">
          <span class="result-num">{compositeResult}</span>
        </div>
      {/if}
    {/if}

    <p class="hint">
      The rightmost machine in <em>g</em>(<em>f</em>(<em>x</em>)) runs FIRST — feed the ball into the first machine, then the second. Swap the wires and run again — usually a different answer!
    </p>
  </div>
</div>

<style>
  /* ── Card wrapper ─────────────────────────────────────────────────────── */
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0,0,0,0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--site-fg);
  }
  .badge {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: color-mix(in srgb, var(--ink-sea) 16%, transparent);
    color: var(--ink-sea);
    padding: 0.15rem 0.55rem;
    border-radius: var(--radius-pill);
    letter-spacing: 0.06em;
  }

  /* ── Stage ───────────────────────────────────────────────────────────── */
  .stage {
    position: relative;
    width: 100%;
    background: var(--demo-stage);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .stage svg {
    display: block;
    width: 100%;
    height: auto;
  }

  /* ── SVG elements ────────────────────────────────────────────────────── */
  .pipe {
    stroke: var(--site-border);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .pipe-live {
    stroke: var(--ink-teal);
    stroke-width: 3.5;
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--ink-teal) 60%, transparent));
  }
  .pipe-dashed {
    stroke: var(--site-fg-muted);
    stroke-width: 2;
    stroke-dasharray: 6 5;
    opacity: 0.45;
  }

  .entry-dot { fill: var(--ink-sun); }
  .exit-dot  { fill: var(--ink-coral); }

  .svg-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
    text-anchor: middle;
  }
  .entry-label { fill: var(--ink-sun); font-size: 10px; }
  .exit-label  { fill: var(--ink-coral); font-size: 10px; }

  .machine-box {
    fill: color-mix(in srgb, var(--demo-card) 95%, transparent);
    stroke-width: 2;
  }
  .machine-a {
    stroke: var(--ink-red);
    filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--ink-red) 25%, transparent));
  }
  .machine-b {
    stroke: var(--ink-sea);
    filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--ink-sea) 25%, transparent));
  }

  .machine-name {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    fill: var(--site-fg);
    text-anchor: middle;
  }
  .machine-rule {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
    text-anchor: middle;
  }

  /* Ports */
  .port {
    cursor: pointer;
    transition: r 0.15s ease, filter 0.15s ease;
  }
  .port-in {
    fill: color-mix(in srgb, var(--ink-teal) 20%, var(--demo-stage));
    stroke: var(--ink-teal);
    stroke-width: 2;
  }
  .port-out {
    fill: color-mix(in srgb, var(--ink-coral) 20%, var(--demo-stage));
    stroke: var(--ink-coral);
    stroke-width: 2;
  }
  .port-active {
    fill: var(--ink-coral);
    filter: drop-shadow(0 0 5px var(--ink-coral));
  }
  .port-target {
    fill: var(--ink-teal);
    stroke: var(--ink-teal);
    filter: drop-shadow(0 0 5px var(--ink-teal));
    animation: pulse-port 0.8s ease-in-out infinite alternate;
  }

  @keyframes pulse-port {
    from { opacity: 0.7; }
    to   { opacity: 1; }
  }

  /* Ball */
  .ball {
    fill: var(--ink-sun);
    filter: drop-shadow(0 1px 4px color-mix(in srgb, var(--ink-sun) 70%, transparent));
  }
  .ball-label {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 11px;
    fill: var(--site-fg);
    text-anchor: middle;
    pointer-events: none;
  }

  .svg-hint {
    font-family: var(--font-body);
    font-size: 10px;
    fill: var(--ink-teal);
    text-anchor: middle;
  }

  /* ── Disconnect button ───────────────────────────────────────────────── */
  .disconnect-btn {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: 1px solid color-mix(in srgb, var(--site-fg) 20%, transparent);
    border-radius: var(--radius-pill);
    padding: 0.15rem 0.6rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--site-fg-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .disconnect-btn:hover {
    color: var(--ink-coral);
    border-color: var(--ink-coral);
  }

  /* ── Controls ────────────────────────────────────────────────────────── */
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .slot-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .slot {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex: 1;
    min-width: 140px;
  }

  .slot-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .slot-pill {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    padding: 0.1rem 0.5rem;
    border-radius: var(--radius-pill);
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .slot-a {
    background: color-mix(in srgb, var(--ink-red) 14%, transparent);
    color: var(--ink-red);
  }
  .slot-b {
    background: color-mix(in srgb, var(--ink-sea) 14%, transparent);
    color: var(--ink-sea);
  }

  select {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
    background: var(--demo-card);
    border: 1px solid var(--site-border);
    border-radius: var(--radius-md);
    padding: 0.35rem 0.55rem;
    cursor: pointer;
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.6rem center;
    background-size: 8px;
    padding-right: 1.8rem;
  }
  select:focus {
    outline: 2px solid var(--site-focus);
    outline-offset: 1px;
  }

  .swap-btn {
    align-self: flex-end;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--ink-teal) 12%, transparent);
    border: 1.5px solid var(--ink-teal);
    border-radius: var(--radius-pill);
    color: var(--ink-teal);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.32rem 0.85rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.12s;
  }
  .swap-btn:hover {
    background: color-mix(in srgb, var(--ink-teal) 22%, transparent);
    transform: scale(1.04);
  }
  .swap-btn:active { transform: scale(0.97); }

  .run-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .wire-prompt {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--ink-teal);
    background: color-mix(in srgb, var(--ink-teal) 8%, transparent);
    border: 1px dashed color-mix(in srgb, var(--ink-teal) 35%, transparent);
    border-radius: var(--radius-md);
    padding: 0.45rem 0.75rem;
    width: 100%;
  }

  .x-label {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--site-fg);
    white-space: nowrap;
    cursor: default;
  }
  .x-label em {
    font-style: italic;
    font-family: var(--font-display);
    color: var(--ink-sun);
    font-size: 1.05em;
  }

  .x-input {
    width: 4.5rem;
    font-family: var(--font-mono);
    font-size: 1rem;
    color: var(--site-fg);
    background: var(--demo-card);
    border: 1.5px solid var(--site-border);
    border-radius: var(--radius-md);
    padding: 0.3rem 0.5rem;
    text-align: center;
  }
  .x-input:focus {
    outline: 2px solid var(--site-focus);
    outline-offset: 1px;
  }

  .run-btn {
    background: var(--ink-red);
    border: none;
    border-radius: var(--radius-pill);
    color: var(--on-color-fg);
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 0.9rem;
    padding: 0.38rem 1.1rem;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s;
  }
  .run-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.03); }
  .run-btn:active:not(:disabled) { transform: scale(0.97); }
  .run-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  /* ── Readout ─────────────────────────────────────────────────────────── */
  .readout {
    font-family: var(--font-mono);
    color: var(--site-fg);
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .composite-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .composite-label {
    font-size: 0.72rem;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .composite-expr {
    font-size: 1rem;
    color: var(--ink-sea);
    font-weight: 600;
  }

  .steps-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .steps-label {
    font-size: 0.72rem;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .steps-val {
    font-size: 0.82rem;
    color: var(--site-fg);
  }

  .result-row {
    display: flex;
    justify-content: flex-start;
  }
  .result-num {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--ink-coral);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .hint {
    margin: 0.25rem 0 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }
  .hint em {
    font-style: italic;
    font-family: var(--font-display);
  }

  /* ── Mobile ──────────────────────────────────────────────────────────── */
  @media (max-width: 520px) {
    .slot-row {
      flex-direction: column;
    }
    .swap-btn {
      align-self: stretch;
      text-align: center;
    }
    .slot { min-width: 0; }
    .run-row { flex-wrap: wrap; }
  }
</style>
