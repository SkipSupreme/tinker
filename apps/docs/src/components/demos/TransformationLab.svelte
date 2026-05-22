<script lang="ts">
  import { Mafs, Coordinates, Plot, MovablePoint, Line, Text } from 'svelte-mafs';

  type Parent = { label: string; fn: (x: number) => number };

  const PARENTS: Parent[] = [
    { label: 'x^2', fn: (x) => x * x },
    { label: 'sin x', fn: Math.sin },
    { label: '|x|', fn: Math.abs },
    { label: 'sqrt x', fn: (x) => (x >= 0 ? Math.sqrt(x) : NaN) },
    { label: 'x^3', fn: (x) => x * x * x },
  ];

  // --- state ---
  let parentLabel = $state('x^2');
  let h = $state(0);
  let v = $state(0);
  let a = $state(1);
  let k = $state(1);

  const parent = $derived(
    (PARENTS.find((p) => p.label === parentLabel) ?? PARENTS[0]).fn,
  );

  // transformed curve g(x) = a * f(k*(x - h)) + v
  const g = $derived((x: number) => a * parent(k * (x - h)) + v);

  // snap a raw value to the nearest 0.5 for clean numbers
  const snapHalf = (n: number) => Math.round(n * 2) / 2;

  // --- handle constraints ---
  // h, v handle: free drag; sets the whole shift.
  function constrainShift([x, y]: [number, number]): [number, number] {
    return [snapHalf(x), snapHalf(y)];
  }

  // a handle: locked to vertical line x = h, lives at (h, v + a).
  function constrainScaleA([, y]: [number, number]): [number, number] {
    return [h, snapHalf(y)];
  }

  // k handle: locked to horizontal line y = v, lives at (h + k, v).
  function constrainScaleK([x]: [number, number]): [number, number] {
    return [snapHalf(x), v];
  }

  // handle positions, kept in sync with the parameters
  let shiftX = $state(0);
  let shiftY = $state(0);
  let aX = $state(0);
  let aY = $state(1);
  let kX = $state(1);
  let kY = $state(0);

  // when a handle moves, derive the parameter; when a parameter changes
  // elsewhere, reposition every handle. A small epsilon avoids feedback loops.
  const near = (p: number, q: number) => Math.abs(p - q) < 1e-6;

  $effect(() => {
    // shift handle -> h, v
    if (!near(shiftX, h) || !near(shiftY, v)) {
      h = shiftX;
      v = shiftY;
    }
  });

  $effect(() => {
    // a handle -> a (vertical distance from v)
    const nextA = aY - v;
    if (!near(nextA, a)) a = nextA;
  });

  $effect(() => {
    // k handle -> k (horizontal distance from h), guarded near 0
    let nextK = kX - h;
    if (Math.abs(nextK) < 0.5) nextK = nextK < 0 ? -0.5 : 0.5;
    if (!near(nextK, k)) k = nextK;
  });

  $effect(() => {
    // reposition handles whenever the parameters settle
    if (!near(shiftX, h)) shiftX = h;
    if (!near(shiftY, v)) shiftY = v;
    if (!near(aX, h)) aX = h;
    if (!near(aY, v + a)) aY = v + a;
    if (!near(kX, h + k)) kX = h + k;
    if (!near(kY, v)) kY = v;
  });

  // round for display
  const r = (n: number) => {
    const x = Math.round(n * 10) / 10;
    return Object.is(x, -0) ? 0 : x;
  };

  // formula readout, e.g. g(x) = -2 f(1(x - 3)) + 5
  const formula = $derived.by(() => {
    const aTxt = r(a) === 1 ? '' : `${r(a)}`;
    const kTxt = `${r(k)}`;
    const hAbs = Math.abs(r(h));
    const inner =
      r(h) === 0
        ? `${kTxt}x`
        : r(h) > 0
          ? `${kTxt}(x - ${hAbs})`
          : `${kTxt}(x + ${hAbs})`;
    const vTxt =
      r(v) === 0 ? '' : r(v) > 0 ? ` + ${r(v)}` : ` - ${Math.abs(r(v))}`;
    return `g(x) = ${aTxt}f(${inner})${vTxt}`;
  });

  // plain-English step list, skipping identity values
  const steps = $derived.by(() => {
    const out: { text: string; tone: string }[] = [];
    const rh = r(h);
    const rv = r(v);
    const ra = r(a);
    const rk = r(k);

    if (rk < 0) {
      out.push({ text: 'reflect across the y-axis', tone: 'teal' });
    }
    if (Math.abs(rk) !== 1) {
      const factor = Math.abs(rk);
      out.push(
        factor > 1
          ? { text: `horizontal compression by ${factor}`, tone: 'teal' }
          : { text: `horizontal stretch by ${1 / factor}`, tone: 'teal' },
      );
    }
    if (rh !== 0) {
      out.push({
        text: rh > 0 ? `right ${Math.abs(rh)}` : `left ${Math.abs(rh)}`,
        tone: 'coral',
      });
    }
    if (ra < 0) {
      out.push({ text: 'reflect across the x-axis', tone: 'sun' });
    }
    if (Math.abs(ra) !== 1) {
      const factor = Math.abs(ra);
      out.push(
        factor > 1
          ? { text: `vertical stretch by ${factor}`, tone: 'sun' }
          : { text: `vertical compression by ${factor}`, tone: 'sun' },
      );
    }
    if (rv !== 0) {
      out.push({
        text: rv > 0 ? `up ${Math.abs(rv)}` : `down ${Math.abs(rv)}`,
        tone: 'coral',
      });
    }
    return out;
  });

  function reset() {
    h = 0;
    v = 0;
    a = 1;
    k = 1;
    shiftX = 0;
    shiftY = 0;
    aX = 0;
    aY = 1;
    kX = 1;
    kY = 0;
  }
</script>

<div class="widget">
  <div class="controls">
    <label class="num-field">
      <span>parent f(x)</span>
      <select class="dropdown" bind:value={parentLabel}>
        {#each PARENTS as p}
          <option value={p.label}>{p.label}</option>
        {/each}
      </select>
    </label>
    <button type="button" class="toggle" onclick={reset}>reset</button>
  </div>

  <div class="formula" aria-live="polite">{formula}</div>

  <div class="stage">
    <Mafs width={560} height={420} viewBox={{ x: [-8, 8], y: [-6, 8] }}>
      <Coordinates.Cartesian />

      <!-- faint parent curve f(x) for reference -->
      <Plot.OfX y={parent} color="var(--ink-sea)" weight={1.5} opacity={0.3} />

      <!-- guide lines the scale handles ride along -->
      <Line.Segment
        point1={[h, -6]}
        point2={[h, 8]}
        color="var(--ink-sun)"
        weight={1}
        opacity={0.25}
      />
      <Line.Segment
        point1={[-8, v]}
        point2={[8, v]}
        color="var(--ink-teal)"
        weight={1}
        opacity={0.25}
      />

      <!-- transformed curve g(x), bold -->
      <Plot.OfX y={g} color="var(--ink-red)" weight={3} />

      <!-- handle labels -->
      <Text x={h + 0.35} y={v + a} latex="a" size={13} color="var(--ink-sun)" />
      <Text x={h + k} y={v - 0.45} latex="k" size={13} color="var(--ink-teal)" />
      <Text
        x={h + 0.35}
        y={v + 0.35}
        latex="(h, v)"
        size={13}
        color="var(--ink-coral)"
      />

      <!-- k handle: horizontal scale, rides y = v -->
      <MovablePoint
        bind:x={kX}
        bind:y={kY}
        constrain={constrainScaleK}
        color="var(--ink-teal)"
        label="horizontal scale k"
      />

      <!-- a handle: vertical scale, rides x = h -->
      <MovablePoint
        bind:x={aX}
        bind:y={aY}
        constrain={constrainScaleA}
        color="var(--ink-sun)"
        label="vertical scale a"
      />

      <!-- h, v handle: free shift of the whole graph -->
      <MovablePoint
        bind:x={shiftX}
        bind:y={shiftY}
        constrain={constrainShift}
        color="var(--ink-coral)"
        label="horizontal and vertical shift"
      />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="params">
      <span class="chip coral">h = {r(h)}</span>
      <span class="chip coral">v = {r(v)}</span>
      <span class="chip sun">a = {r(a)}</span>
      <span class="chip teal">k = {r(k)}</span>
    </div>
    <div class="steps">
      {#if steps.length === 0}
        <p class="step identity">no transformation yet - g(x) equals f(x)</p>
      {:else}
        <ol>
          {#each steps as s, i}
            <li class="step {s.tone}">
              <span class="step-num">{i + 1}</span>{s.text}
            </li>
          {/each}
        </ol>
      {/if}
    </div>
    <p class="hint">
      drag the colored handles - coral shifts, gold scales up, teal scales sideways
    </p>
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
    gap: 0.8rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .num-field {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .dropdown {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
    background: var(--demo-stage);
    border: 1px solid var(--demo-card-border);
    border-radius: 8px;
    padding: 0.3rem 0.45rem;
    cursor: pointer;
  }

  .toggle {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg);
    background: var(--demo-stage);
    border: 1px solid var(--demo-card-border);
    border-radius: 999px;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .toggle:hover {
    border-color: var(--ink-coral);
  }

  .formula {
    font-family: var(--font-mono);
    font-size: clamp(0.95rem, 2.4vw, 1.2rem);
    font-weight: 600;
    color: var(--site-fg);
    background: var(--demo-stage);
    border: 1px solid var(--demo-card-border);
    border-radius: 12px;
    padding: 0.6rem 0.85rem;
    letter-spacing: 0.01em;
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
    gap: 0.55rem;
  }

  .params {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chip {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    border-radius: 999px;
    padding: 0.22rem 0.6rem;
    border: 1px solid transparent;
  }

  .chip.coral {
    color: var(--ink-coral);
    border-color: color-mix(in srgb, var(--ink-coral) 45%, transparent);
    background: color-mix(in srgb, var(--ink-coral) 12%, transparent);
  }

  .chip.sun {
    color: var(--ink-sun);
    border-color: color-mix(in srgb, var(--ink-sun) 45%, transparent);
    background: color-mix(in srgb, var(--ink-sun) 14%, transparent);
  }

  .chip.teal {
    color: var(--ink-teal);
    border-color: color-mix(in srgb, var(--ink-teal) 45%, transparent);
    background: color-mix(in srgb, var(--ink-teal) 12%, transparent);
  }

  .steps ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  .step {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin: 0;
  }

  .step-num {
    flex: 0 0 1.3rem;
    height: 1.3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-size: 0.72rem;
    background: color-mix(in srgb, var(--site-fg) 10%, transparent);
    color: var(--site-fg-muted);
  }

  .step.coral {
    color: var(--ink-coral);
  }

  .step.sun {
    color: var(--ink-sun);
  }

  .step.teal {
    color: var(--ink-teal);
  }

  .step.identity {
    color: var(--site-fg-muted);
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .readout {
      font-size: 0.74rem;
    }

    .formula {
      font-size: 0.9rem;
    }

    .num-field,
    .toggle,
    .dropdown {
      font-size: 0.72rem;
    }

    .hint {
      font-size: 0.72rem;
    }
  }
</style>
