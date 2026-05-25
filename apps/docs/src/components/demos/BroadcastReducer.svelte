<script lang="ts">
  /**
   * BroadcastReducer — M12.4. Forward: bias vector `b` broadcasts across
   * a batch matrix `X`. Backward: dY has the same shape as Y; to push the
   * gradient back into `b`, the learner must sum over the axes that were
   * broadcast. Pick the wrong axis and you get a visible shape mismatch.
   */

  // Shapes are intentionally small so we can display real numbers.
  let N = $state(3); // batch
  let M = $state(4); // features

  // Lock to friendly sizes
  function setN(v: number) { N = Math.max(1, Math.min(6, Math.round(v))); randomize(); }
  function setM(v: number) { M = Math.max(1, Math.min(6, Math.round(v))); randomize(); }

  // Random-ish but stable values (seeded by a counter)
  let seed = $state(0);
  function randomize() {
    seed = (seed + 1) % 1000;
  }

  function rnd(i: number): number {
    // small deterministic pseudo-random in [-1, 1]
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return Math.round((x - Math.floor(x) - 0.5) * 2 * 100) / 100;
  }

  const dY = $derived(
    Array.from({ length: N }, (_, i) =>
      Array.from({ length: M }, (_, j) => rnd(i * 17 + j * 31)),
    ),
  );

  // The bias shape is (M,). dL/db should have shape (M,) too.
  // That requires summing dY over axis 0 (the batch axis).

  type Axis = 'none' | '0' | '1' | 'both';
  let pick = $state<Axis>('none');

  function sumOver(arr: number[][], axis: '0' | '1' | 'both'): number[][] | number[] | number {
    if (axis === '0') {
      const out: number[] = Array(arr[0].length).fill(0);
      for (let i = 0; i < arr.length; i++)
        for (let j = 0; j < arr[0].length; j++) out[j] += arr[i][j];
      return out.map((x) => Math.round(x * 100) / 100);
    }
    if (axis === '1') {
      return arr.map(
        (row) => Math.round(row.reduce((a, b) => a + b, 0) * 100) / 100,
      );
    }
    let s = 0;
    for (const row of arr) for (const v of row) s += v;
    return Math.round(s * 100) / 100;
  }

  const result = $derived.by(() => {
    if (pick === 'none') return null;
    return sumOver(dY, pick);
  });

  type Verdict = {
    tone: 'good' | 'bad';
    shape: string;
    msg: string;
  };

  const verdict = $derived.by<Verdict | null>(() => {
    if (pick === 'none' || result === null) return null;
    if (pick === '0') {
      return {
        tone: 'good',
        shape: `(${M},)`,
        msg: `Correct. Summing dY over axis 0 (the broadcast axis) gives db with shape (${M},), matching b.`,
      };
    }
    if (pick === '1') {
      return {
        tone: 'bad',
        shape: `(${N},)`,
        msg: `Wrong axis. You summed over the feature axis, producing shape (${N},). That cannot be assigned to b (shape (${M},)). The bias was broadcast along axis 0 (replicated across rows), so the backward must reduce-sum along axis 0.`,
      };
    }
    return {
      tone: 'bad',
      shape: `()`,
      msg: `Wrong. Summing over both axes collapses to a scalar — but b is a vector, not a scalar. Only axis 0 was broadcast in the forward; only axis 0 should be reduced in the backward.`,
    };
  });

  const fmt = (n: number) => (Math.abs(n) < 0.005 ? '0.00' : n.toFixed(2));
</script>

<div class="widget">
  <header>
    <div class="ctl">
      <label class="ctl-field">
        <span>batch N</span>
        <input type="range" min="1" max="6" bind:value={N} oninput={() => randomize()} />
        <span class="v">{N}</span>
      </label>
      <label class="ctl-field">
        <span>features M</span>
        <input type="range" min="1" max="6" bind:value={M} oninput={() => randomize()} />
        <span class="v">{M}</span>
      </label>
      <button type="button" class="ghost" onclick={randomize}>new values</button>
    </div>
  </header>

  <section class="phase phase-fwd">
    <h3>forward: <code>Y = X · W + b</code></h3>
    <p class="note">
      <code>b</code> has shape <code>(M,) = ({M},)</code>. Adding it to a batch
      matrix replicates it across <strong>{N} rows</strong>. That replication is
      a broadcast along axis 0.
    </p>
  </section>

  <section class="phase phase-bwd">
    <h3>backward: given <code>dY</code> of shape ({N}, {M}), what is <code>db</code>?</h3>

    <div class="matrix-block">
      <span class="m-label">dY</span>
      <table class="matrix">
        <tbody>
          {#each dY as row, i (i)}
            <tr>
              {#each row as v, j (j)}
                <td class="cell">{fmt(v)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <span class="m-shape">({N}, {M})</span>
    </div>

    <div class="picker">
      <span class="lbl">pick the axis to sum over:</span>
      <button
        type="button"
        class="opt"
        class:active={pick === '0'}
        onclick={() => (pick = '0')}
      >axis 0 (rows)</button>
      <button
        type="button"
        class="opt"
        class:active={pick === '1'}
        onclick={() => (pick = '1')}
      >axis 1 (cols)</button>
      <button
        type="button"
        class="opt"
        class:active={pick === 'both'}
        onclick={() => (pick = 'both')}
      >both</button>
    </div>

    {#if result !== null}
      <div class="result-block">
        <span class="m-label">db</span>
        {#if typeof result === 'number'}
          <table class="matrix"><tbody><tr><td class="cell">{fmt(result)}</td></tr></tbody></table>
          <span class="m-shape">()</span>
        {:else if Array.isArray(result) && Array.isArray(result[0])}
          <table class="matrix">
            <tbody>
              {#each result as row, i (i)}
                <tr>
                  {#each row as v, j (j)}
                    <td class="cell">{fmt(v)}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
          <span class="m-shape">({(result as number[][]).length}, {(result as number[][])[0].length})</span>
        {:else}
          <table class="matrix">
            <tbody>
              {#if pick === '0'}
                <tr>
                  {#each result as v, j (j)}
                    <td class="cell">{fmt(v as number)}</td>
                  {/each}
                </tr>
              {:else}
                {#each result as v, i (i)}
                  <tr><td class="cell">{fmt(v as number)}</td></tr>
                {/each}
              {/if}
            </tbody>
          </table>
          <span class="m-shape">({(result as number[]).length},)</span>
        {/if}
      </div>
    {/if}

    {#if verdict}
      <div class="verdict tone-{verdict.tone}" aria-live="polite">
        <strong>db shape: <code>{verdict.shape}</code></strong>
        <p>{verdict.msg}</p>
      </div>
    {/if}
  </section>

  <p class="hint">
    Rule of thumb: every axis that was <em>broadcast</em> in the forward must be
    <em>reduce-summed</em> in the backward. Forward broadcast = backward sum.
  </p>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border, var(--site-border));
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
  }

  .ctl-field {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }

  .ctl-field input[type='range'] {
    width: 6rem;
    accent-color: var(--ink-sea);
  }

  .ctl-field .v {
    font-weight: 600;
    color: var(--site-fg);
    min-width: 1rem;
    text-align: center;
  }

  .ghost {
    margin-left: auto;
    font-family: var(--font-body);
    font-size: 0.78rem;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg-muted);
    cursor: pointer;
  }

  .phase {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    padding: 0.7rem 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .phase h3 {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--site-fg);
  }

  .phase code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    padding: 0.06em 0.32em;
    border-radius: 4px;
    color: var(--ink-red);
  }

  .note {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.85rem;
    line-height: 1.55;
    color: var(--site-fg);
  }

  .matrix-block,
  .result-block {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .m-label {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-sea);
  }

  .m-shape {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--site-fg-muted);
  }

  .matrix {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }

  .matrix .cell {
    padding: 0.2rem 0.45rem;
    border: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    background: var(--site-surface);
    text-align: right;
    min-width: 2.6rem;
  }

  .picker {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .lbl {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    margin-right: 0.3rem;
  }

  .opt {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 0.32rem 0.7rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    cursor: pointer;
  }

  .opt.active {
    border-color: var(--ink-sea);
    background: color-mix(in srgb, var(--ink-sea) 14%, transparent);
    color: var(--site-fg);
  }

  .verdict {
    padding: 0.55rem 0.85rem;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .verdict.tone-good {
    background: color-mix(in srgb, var(--cta) 14%, transparent);
    border-left: 3px solid var(--cta);
  }

  .verdict.tone-bad {
    background: color-mix(in srgb, var(--ink-coral) 14%, transparent);
    border-left: 3px solid var(--ink-coral);
  }

  .verdict strong {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
  }

  .verdict p {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.84rem;
    line-height: 1.5;
    color: var(--site-fg);
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.5;
  }
</style>
