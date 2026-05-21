<script lang="ts">
  // --- frequency bands -----------------------------------------------------
  const wavelengths = [1, 10, 100, 1000];
  const bandLabel = (w: number) => (w === 1 ? "" : `/${w}`);

  let p = $state(7);
  let bands = $state([true, true, true, true]);

  function toggleBand(i: number) {
    bands[i] = !bands[i];
  }
  function step(d: number) {
    p = Math.max(0, Math.min(100, p + d));
  }

  // active components, in order: for each active band -> sin then cos
  type Comp = { kind: "sin" | "cos"; w: number; label: string };
  const activeComps = $derived.by<Comp[]>(() => {
    const out: Comp[] = [];
    wavelengths.forEach((w, i) => {
      if (!bands[i]) return;
      out.push({ kind: "sin", w, label: `sin p${bandLabel(w)}` });
      out.push({ kind: "cos", w, label: `cos p${bandLabel(w)}` });
    });
    return out;
  });

  const valueAt = (c: Comp, pos: number) =>
    c.kind === "sin" ? Math.sin(pos / c.w) : Math.cos(pos / c.w);

  const vector = $derived(activeComps.map((c) => valueAt(c, p)));

  const readout = $derived(
    activeComps.length === 0
      ? "no bands active"
      : activeComps
          .map((c, i) => `${c.label} = ${vector[i].toFixed(3)}`)
          .join("   ·   "),
  );

  // --- bar chart geometry --------------------------------------------------
  const barW = 760;
  const barH = 240;
  const barPadX = 56;
  const barMidY = barH / 2 - 14;
  const barHalf = barH / 2 - 34;
  const barSlot = $derived(
    activeComps.length > 0 ? (barW - barPadX * 2) / activeComps.length : 0,
  );

  function fillFor(c: Comp) {
    return c.kind === "sin" ? "var(--ink-red)" : "var(--ink-sea)";
  }

  // --- heatmap geometry ----------------------------------------------------
  const rows = Array.from({ length: 31 }, (_, i) => i);
  const hmLeft = 40;
  const hmTop = 48;
  const hmCellW = 60;
  const hmCellH = 16;
  const hmW = $derived(hmLeft + activeComps.length * hmCellW + 8);
  const hmH = hmTop + rows.length * hmCellH + 8;

  function cellFill(v: number) {
    const mag = Math.round(Math.abs(v) * 85);
    const tok = v >= 0 ? "var(--ink-red)" : "var(--ink-sea)";
    return `color-mix(in srgb, ${tok} ${mag}%, transparent)`;
  }
</script>

<div class="widget">
  <div class="controls">
    <div class="pos-row">
      <button class="step" onclick={() => step(-1)} aria-label="decrease position">−1</button>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        bind:value={p}
        aria-label="position index p"
      />
      <button class="step" onclick={() => step(1)} aria-label="increase position">+1</button>
      <span class="ptag">p = {p}</span>
    </div>
    <div class="band-row">
      {#each wavelengths as w, i}
        <button
          class="band"
          class:on={bands[i]}
          onclick={() => toggleBand(i)}
          aria-pressed={bands[i]}
        >
          band w={w}
        </button>
      {/each}
    </div>
  </div>

  <!-- TOP: bar chart of active components at current p -->
  <figure class="chart">
    <figcaption>Fingerprint vector at p = {p}</figcaption>
    <svg viewBox={`0 0 ${barW} ${barH}`} role="img" aria-label={`bar chart of positional encoding vector at position ${p}`}>
      <line
        x1={barPadX}
        x2={barW - barPadX}
        y1={barMidY}
        y2={barMidY}
        stroke="var(--site-fg-muted)"
        stroke-width="1"
        stroke-dasharray="3 4"
        opacity="0.5"
      />
      {#each activeComps as c, i}
        {@const v = vector[i]}
        {@const cx = barPadX + barSlot * (i + 0.5)}
        {@const h = Math.abs(v) * barHalf}
        <rect
          x={cx - barSlot * 0.32}
          y={v >= 0 ? barMidY - h : barMidY}
          width={barSlot * 0.64}
          height={Math.max(h, 0.5)}
          rx="3"
          fill={fillFor(c)}
        />
        <text
          x={cx}
          y={barH - 16}
          text-anchor="middle"
          class="bar-label"
        >{c.label}</text>
        <text
          x={cx}
          y={v >= 0 ? barMidY - h - 6 : barMidY + h + 14}
          text-anchor="middle"
          class="bar-val"
        >{v.toFixed(2)}</text>
      {/each}
      {#if activeComps.length === 0}
        <text x={barW / 2} y={barMidY} text-anchor="middle" class="empty">
          enable a frequency band
        </text>
      {/if}
    </svg>
  </figure>

  <!-- BOTTOM: heatmap, rows = positions 0..30, columns = active components -->
  <figure class="chart">
    <figcaption>Same vector across positions 0 – 30 (current p highlighted)</figcaption>
    <svg viewBox={`0 0 ${hmW} ${hmH}`} role="img" aria-label="heatmap of positional encoding across positions">
      {#each activeComps as c, ci}
        <text
          x={hmLeft + hmCellW * (ci + 0.5)}
          y={hmTop - 14}
          text-anchor="middle"
          class="col-label"
        >{c.label}</text>
      {/each}
      {#each rows as r}
        {#if r % 10 === 0}
          <text
            x={hmLeft - 8}
            y={hmTop + hmCellH * (r + 0.7)}
            text-anchor="end"
            class="row-label"
          >{r}</text>
        {/if}
        {#each activeComps as c, ci}
          <rect
            x={hmLeft + hmCellW * ci}
            y={hmTop + hmCellH * r}
            width={hmCellW - 1.5}
            height={hmCellH - 1.5}
            fill={cellFill(valueAt(c, r))}
          />
        {/each}
        {#if r === p && p <= 30}
          <rect
            x={hmLeft - 1.5}
            y={hmTop + hmCellH * r - 1.5}
            width={activeComps.length * hmCellW + 1.5}
            height={hmCellH + 1.5}
            fill="none"
            stroke="var(--ink-coral)"
            stroke-width="2.5"
          />
        {/if}
      {/each}
      {#if activeComps.length === 0}
        <text x={hmW / 2} y={hmTop + 60} text-anchor="middle" class="empty">
          enable a frequency band
        </text>
      {/if}
    </svg>
  </figure>

  <div class="readout" aria-live="polite">{readout}</div>

  <p class="caption">
    Every position gets a unique vector of sines and cosines sampled at many
    frequencies. This is the positional encoding inside a transformer —
    PE(p, 2i) = sin(p / 10000^(2i/d)), PE(p, 2i+1) = cos(p / 10000^(2i/d)).
    You will build it again in the transformer module.
  </p>
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
      0 24px 48px -28px color-mix(in srgb, var(--ink-sea) 50%, transparent);
    font-family: var(--font-body);
    color: var(--site-fg);
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .pos-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .pos-row input[type="range"] {
    flex: 1;
    min-width: 140px;
    accent-color: var(--ink-coral);
  }

  .step {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    min-width: 2.6rem;
    padding: 0.32rem 0.5rem;
    border-radius: 9px;
    border: 1px solid var(--demo-card-border, var(--site-border));
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
  }
  .step:hover {
    border-color: var(--ink-coral);
  }

  .ptag {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--ink-red);
  }

  .band-row {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .band {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 0.34rem 0.6rem;
    border-radius: 999px;
    border: 1px solid var(--site-border);
    background: var(--demo-stage);
    color: var(--site-fg-muted);
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .band.on {
    background: color-mix(in srgb, var(--ink-teal) 22%, transparent);
    border-color: var(--ink-teal);
    color: var(--site-fg);
  }

  .chart {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  figcaption {
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    background: var(--demo-stage);
    border-radius: 12px;
  }

  .bar-label {
    font-family: var(--font-mono);
    font-size: 13px;
    fill: var(--site-fg-muted);
  }
  .bar-val {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg);
  }
  .col-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
  }
  .row-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
  }
  .empty {
    font-family: var(--font-mono);
    font-size: 13px;
    fill: var(--site-fg-muted);
  }

  .readout {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--site-fg);
    background: var(--demo-stage);
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    word-break: break-word;
  }

  .caption {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .bar-label,
    .empty {
      font-size: 11px;
    }
    .bar-val,
    .col-label,
    .row-label {
      font-size: 9.5px;
    }
    .readout {
      font-size: 0.74rem;
    }
    .band {
      font-size: 0.72rem;
    }
  }
</style>
