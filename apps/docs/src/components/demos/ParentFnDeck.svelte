<script lang="ts">
  import { Mafs, Coordinates, Plot, Line, Point, Text } from 'svelte-mafs';

  type Parity = 'even' | 'odd' | 'neither';

  type FeatureMode = 'intercepts' | 'asymptotes' | 'symmetry' | 'end-behavior';

  interface ParentFn {
    label: string;
    formula: string; // latex
    tagline: string;
    parity: Parity;
    fn: (x: number) => number;
    intercepts: [number, number][];
    asymptote?: string; // plain-text description
    endBehavior: string;
    viewBox: { x: [number, number]; y: [number, number] };
  }

  const NAN = Number.NaN;

  const FUNCTIONS: ParentFn[] = [
    {
      label: 'Constant',
      formula: 'f(x)=1',
      tagline: 'constant, degree 0, even symmetry, flat horizontal line',
      parity: 'even',
      fn: () => 1,
      intercepts: [],
      endBehavior: 'flat: stays at y=1 in both directions',
      viewBox: { x: [-4, 4], y: [-3, 3] },
    },
    {
      label: 'Linear',
      formula: 'f(x)=x',
      tagline: 'polynomial, degree 1, odd symmetry, straight diagonal line',
      parity: 'odd',
      fn: (x) => x,
      intercepts: [[0, 0]],
      endBehavior: 'rises left-to-right: down on the left, up on the right',
      viewBox: { x: [-4, 4], y: [-4, 4] },
    },
    {
      label: 'Quadratic',
      formula: 'f(x)=x^2',
      tagline: 'polynomial, degree 2, even symmetry, U-shaped parabola',
      parity: 'even',
      fn: (x) => x * x,
      intercepts: [[0, 0]],
      endBehavior: 'opens upward: rises on both the left and the right',
      viewBox: { x: [-3.2, 3.2], y: [-1.5, 8] },
    },
    {
      label: 'Cubic',
      formula: 'f(x)=x^3',
      tagline: 'polynomial, degree 3, odd symmetry, S-shaped curve',
      parity: 'odd',
      fn: (x) => x * x * x,
      intercepts: [[0, 0]],
      endBehavior: 'falls on the left, rises on the right',
      viewBox: { x: [-2.4, 2.4], y: [-8, 8] },
    },
    {
      label: 'Square root',
      formula: 'f(x)=\\sqrt{x}',
      tagline: 'radical, domain x>=0, neither symmetry, half-curve',
      parity: 'neither',
      fn: (x) => (x < 0 ? NAN : Math.sqrt(x)),
      intercepts: [[0, 0]],
      endBehavior: 'starts at the origin and rises slowly to the right',
      viewBox: { x: [-1.5, 8], y: [-1.5, 4] },
    },
    {
      label: 'Absolute value',
      formula: 'f(x)=|x|',
      tagline: 'piecewise, even symmetry, V-shaped with a sharp corner',
      parity: 'even',
      fn: (x) => Math.abs(x),
      intercepts: [[0, 0]],
      endBehavior: 'rises on both the left and the right from the corner',
      viewBox: { x: [-4, 4], y: [-1.5, 5] },
    },
    {
      label: 'Exponential',
      formula: 'f(x)=2^x',
      tagline: 'exponential, neither symmetry, growth curve with a floor',
      parity: 'neither',
      fn: (x) => Math.pow(2, x),
      intercepts: [[0, 1]],
      asymptote: 'horizontal asymptote at the x-axis (y=0) on the left',
      endBehavior: 'hugs the x-axis on the left, shoots up on the right',
      viewBox: { x: [-4, 4], y: [-1.5, 8] },
    },
    {
      label: 'Logarithm',
      formula: 'f(x)=\\ln(x)',
      tagline: 'logarithmic, domain x>0, neither symmetry, slow-growth curve',
      parity: 'neither',
      fn: (x) => (x <= 0 ? NAN : Math.log(x)),
      intercepts: [[1, 0]],
      asymptote: 'vertical asymptote at the y-axis (x=0)',
      endBehavior: 'plunges near x=0, rises slowly to the right',
      viewBox: { x: [-1.5, 8], y: [-4, 4] },
    },
    {
      label: 'Sine',
      formula: 'f(x)=\\sin(x)',
      tagline: 'trigonometric, period 2pi, odd symmetry, wave through origin',
      parity: 'odd',
      fn: (x) => Math.sin(x),
      intercepts: [
        [0, 0],
        [Math.PI, 0],
        [-Math.PI, 0],
      ],
      endBehavior: 'oscillates forever between y=-1 and y=1',
      viewBox: { x: [-6.5, 6.5], y: [-2, 2] },
    },
    {
      label: 'Cosine',
      formula: 'f(x)=\\cos(x)',
      tagline: 'trigonometric, period 2pi, even symmetry, wave peaking at x=0',
      parity: 'even',
      fn: (x) => Math.cos(x),
      intercepts: [
        [Math.PI / 2, 0],
        [-Math.PI / 2, 0],
        [(3 * Math.PI) / 2, 0],
        [(-3 * Math.PI) / 2, 0],
      ],
      endBehavior: 'oscillates forever between y=-1 and y=1',
      viewBox: { x: [-6.5, 6.5], y: [-2, 2] },
    },
  ];

  const FEATURE_MODES: { id: FeatureMode; label: string }[] = [
    { id: 'intercepts', label: 'intercepts' },
    { id: 'asymptotes', label: 'asymptotes' },
    { id: 'symmetry', label: 'symmetry' },
    { id: 'end-behavior', label: 'end behavior' },
  ];

  let selectedIndex = $state(2);
  let featureMode = $state<FeatureMode>('intercepts');

  const selected = $derived(FUNCTIONS[selectedIndex]);

  const parityNote = $derived.by(() => {
    if (selected.parity === 'even') {
      return 'even: symmetric across the y-axis, so f(-x) = f(x)';
    }
    if (selected.parity === 'odd') {
      return 'odd: symmetric through the origin, so f(-x) = -f(x)';
    }
    return 'neither: no axis or origin symmetry';
  });

  // Asymptote segments to draw on the big canvas, sized to the selected viewBox.
  const asymptoteSegments = $derived.by(() => {
    const vb = selected.viewBox;
    const segs: { p1: [number, number]; p2: [number, number] }[] = [];
    if (selected.label === 'Exponential') {
      // horizontal asymptote y = 0
      segs.push({ p1: [vb.x[0], 0], p2: [vb.x[1], 0] });
    }
    if (selected.label === 'Logarithm') {
      // vertical asymptote x = 0
      segs.push({ p1: [0, vb.y[0]], p2: [0, vb.y[1]] });
    }
    return segs;
  });

  const featureSummary = $derived.by(() => {
    switch (featureMode) {
      case 'intercepts':
        if (selected.intercepts.length === 0) {
          return 'no axis crossings: this line never touches the x-axis';
        }
        return selected.intercepts
          .map(([x, y]) => `(${fmt(x)}, ${fmt(y)})`)
          .join('  ');
      case 'asymptotes':
        return selected.asymptote ?? 'no asymptotes: the curve has no boundary lines';
      case 'symmetry':
        return parityNote;
      case 'end-behavior':
        return selected.endBehavior;
    }
  });

  function fmt(n: number): string {
    if (Math.abs(n) < 1e-9) return '0';
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return n.toFixed(2);
  }
</script>

<div class="widget">
  <p class="intro">
    The ten parent functions: the simplest member of each family. Tap a card to
    study it up close, then switch the feature lens below.
  </p>

  <div class="deck" role="listbox" aria-label="parent functions">
    {#each FUNCTIONS as fnItem, i}
      <button
        type="button"
        class="card"
        class:selected={i === selectedIndex}
        role="option"
        aria-selected={i === selectedIndex}
        onclick={() => (selectedIndex = i)}
      >
        <span class="card-label">{fnItem.label}</span>
        <div class="card-stage">
          <Mafs
            width={150}
            height={110}
            viewBox={fnItem.viewBox}
            pan={false}
            zoom={false}
          >
            <Coordinates.Cartesian />
            <Plot.OfX y={fnItem.fn} color="var(--ink-red)" weight={2} />
          </Mafs>
        </div>
      </button>
    {/each}
  </div>

  <div class="modes" role="group" aria-label="feature lens">
    {#each FEATURE_MODES as mode}
      <button
        type="button"
        class="toggle"
        class:on={featureMode === mode.id}
        aria-pressed={featureMode === mode.id}
        onclick={() => (featureMode = mode.id)}
      >
        {mode.label}
      </button>
    {/each}
  </div>

  <div class="stage">
    <Mafs
      width={480}
      height={320}
      viewBox={selected.viewBox}
      pan={false}
      zoom={false}
    >
      <Coordinates.Cartesian />
      <Plot.OfX y={selected.fn} color="var(--ink-red)" weight={2.5} />

      {#if featureMode === 'asymptotes'}
        {#each asymptoteSegments as seg}
          <Line.Segment
            point1={seg.p1}
            point2={seg.p2}
            color="var(--ink-sea)"
            weight={2}
            opacity={0.85}
            svg={{ 'stroke-dasharray': '7 6' }}
          />
        {/each}
      {/if}

      {#if featureMode === 'intercepts'}
        {#each selected.intercepts as pt}
          <Point x={pt[0]} y={pt[1]} color="var(--ink-sun)" />
        {/each}
      {/if}

      {#if featureMode === 'symmetry'}
        {#if selected.parity === 'even'}
          <Line.Segment
            point1={[0, selected.viewBox.y[0]]}
            point2={[0, selected.viewBox.y[1]]}
            color="var(--ink-teal)"
            weight={2}
            opacity={0.8}
            svg={{ 'stroke-dasharray': '7 6' }}
          />
          <Text
            x={selected.viewBox.x[1] * 0.5}
            y={selected.viewBox.y[1] * 0.82}
            latex={'\\text{even: mirror across the y-axis}'}
            size={13}
            color="var(--ink-teal)"
          />
        {:else if selected.parity === 'odd'}
          <Point x={0} y={0} color="var(--ink-teal)" />
          <Text
            x={selected.viewBox.x[1] * 0.4}
            y={selected.viewBox.y[1] * 0.82}
            latex={'\\text{odd: 180 turn about the origin}'}
            size={13}
            color="var(--ink-teal)"
          />
        {:else}
          <Text
            x={selected.viewBox.x[1] * 0.4}
            y={selected.viewBox.y[1] * 0.82}
            latex={'\\text{neither: no symmetry}'}
            size={13}
            color="var(--ink-coral)"
          />
        {/if}
      {/if}

      {#if featureMode === 'end-behavior'}
        <Text
          x={selected.viewBox.x[0] * 0.7}
          y={selected.viewBox.y[1] * 0.82}
          latex={'\\text{left end}'}
          size={13}
          color="var(--ink-coral)"
        />
        <Text
          x={selected.viewBox.x[1] * 0.7}
          y={selected.viewBox.y[1] * 0.82}
          latex={'\\text{right end}'}
          size={13}
          color="var(--ink-coral)"
        />
      {/if}
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="line">
      <span class="key">function</span>
      <span class="val strong">{selected.label}</span>
    </div>
    <div class="line">
      <span class="key">formula</span>
      <span class="val mono-formula">{selected.formula.replace(/\\/g, '')}</span>
    </div>
    <div class="line">
      <span class="key">tagline</span>
      <span class="val">{selected.tagline}</span>
    </div>
    <div class="line feature">
      <span class="key">{featureMode.replace('-', ' ')}</span>
      <span class="val">{featureSummary}</span>
    </div>
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .intro {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--site-fg-muted);
  }

  .deck {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.55rem;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.4rem;
    background: var(--demo-stage);
    border: 2px solid var(--demo-card-border);
    border-radius: 12px;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      transform 0.12s ease;
  }

  .card:hover {
    transform: translateY(-2px);
  }

  .card.selected {
    border-color: var(--ink-sun);
  }

  .card-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--site-fg);
    text-align: center;
  }

  .card.selected .card-label {
    color: var(--ink-red);
  }

  .card-stage {
    border-radius: 8px;
    overflow: hidden;
    touch-action: none;
    pointer-events: none;
  }

  .card-stage :global(svg) {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
  }

  .modes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .toggle {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg);
    background: var(--demo-stage);
    border: 1px solid var(--demo-card-border);
    border-radius: 999px;
    padding: 0.4rem 0.85rem;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .toggle.on,
  .toggle[aria-pressed='true'] {
    background: color-mix(in srgb, var(--ink-sun) 22%, transparent);
    border-color: var(--ink-sun);
  }

  .stage {
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .stage :global(svg) {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
  }

  .readout {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
  }

  .line {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }

  .key {
    flex: 0 0 5.5rem;
    color: var(--site-fg-muted);
    text-transform: lowercase;
  }

  .val {
    flex: 1;
  }

  .val.strong {
    font-weight: 600;
  }

  .val.mono-formula {
    color: var(--ink-red);
    font-weight: 600;
  }

  .line.feature .val {
    color: var(--ink-sea);
  }

  @media (max-width: 520px) {
    .deck {
      grid-template-columns: repeat(2, 1fr);
    }

    .readout {
      font-size: 0.74rem;
    }

    .card-label,
    .toggle {
      font-size: 0.7rem;
    }

    .line {
      flex-direction: column;
      gap: 0.05rem;
    }

    .key {
      flex: none;
    }
  }
</style>
