<script lang="ts">
  /**
   * ForwardVsReverseRaceTrack — M12.5. Race forward-mode vs reverse-mode
   * autodiff by edge-visit count. Forward-mode: one sweep per input (n).
   * Reverse-mode: one sweep per output (m). For neural-net losses,
   * m = 1 and n is in the millions → reverse-mode wins by a factor of n.
   */

  let n = $state(10); // input dimension
  let m = $state(10); // output dimension
  let lossMode = $state(false); // toggle pins m = 1

  // A "DAG" cost per single sweep — pretend the underlying graph has E edges
  const E = 100;

  const mEff = $derived(lossMode ? 1 : m);

  // Cost = sweeps × edges
  const fwdCost = $derived(n * E);
  const revCost = $derived(mEff * E);

  // Bar widths: normalize to the larger cost
  const maxCost = $derived(Math.max(fwdCost, revCost, 1));
  const fwdPct = $derived((fwdCost / maxCost) * 100);
  const revPct = $derived((revCost / maxCost) * 100);

  const ratio = $derived(revCost === 0 ? 1 : fwdCost / revCost);
  const winner = $derived<'forward' | 'reverse' | 'tie'>(
    fwdCost < revCost ? 'forward' : revCost < fwdCost ? 'reverse' : 'tie',
  );
</script>

<div class="widget">
  <header>
    <div class="title">forward-mode vs reverse-mode autodiff</div>
    <label class="toggle">
      <input type="checkbox" bind:checked={lossMode} />
      <span>loss-function mode (pins <code>m = 1</code>)</span>
    </label>
  </header>

  <div class="sliders">
    <label class="slider-field">
      <span class="slider-label">n = {n} <em>inputs</em></span>
      <input type="range" min="1" max="100" bind:value={n} />
    </label>
    <label class="slider-field" class:disabled={lossMode}>
      <span class="slider-label">
        m = {mEff} <em>outputs</em>
        {#if lossMode}<span class="locked">locked</span>{/if}
      </span>
      <input type="range" min="1" max="100" bind:value={m} disabled={lossMode} />
    </label>
  </div>

  <div class="bars">
    <div class="bar-row">
      <span class="bar-label" class:win={winner === 'forward'}>
        forward-mode (n sweeps)
      </span>
      <div class="track">
        <div class="bar fwd" style="width: {fwdPct}%"></div>
      </div>
      <span class="cost">{fwdCost.toLocaleString()} edge visits</span>
    </div>
    <div class="bar-row">
      <span class="bar-label" class:win={winner === 'reverse'}>
        reverse-mode (m sweeps)
      </span>
      <div class="track">
        <div class="bar rev" style="width: {revPct}%"></div>
      </div>
      <span class="cost">{revCost.toLocaleString()} edge visits</span>
    </div>
  </div>

  <div class="verdict tone-{winner}">
    {#if winner === 'forward'}
      <strong>forward-mode wins by {(1 / ratio).toFixed(1)}×</strong>
      <p>n &lt; m: there are fewer inputs to sweep over than outputs, so propagating one input forward at a time is cheaper.</p>
    {:else if winner === 'reverse'}
      <strong>reverse-mode wins by {ratio.toFixed(1)}×</strong>
      <p>
        m &lt; n: there are fewer outputs to sweep over than inputs, so seeding
        each output and walking back is cheaper.
        {#if lossMode}
          For a neural network loss, m = 1 and n can be in the millions — reverse
          mode is the only practical option, often by a factor of <code>n</code>.
        {/if}
      </p>
    {:else}
      <strong>tied</strong>
      <p>n = m. Either direction does the same amount of work.</p>
    {/if}
  </div>

  <p class="hint">
    Both algorithms compute the same Jacobian. They differ in <strong>which
    direction they traverse the graph</strong>. Forward needs one sweep per input
    column; reverse needs one sweep per output row. Whichever dimension is
    smaller, that direction wins. Deep learning has loss functions: m = 1,
    n = parameters. Reverse-mode is the entire reason gradient descent on huge
    networks is feasible.
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

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .title {
    font-family: var(--font-body);
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--site-fg);
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    cursor: pointer;
  }

  .toggle code {
    font-family: var(--font-mono);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    padding: 0.05em 0.3em;
    border-radius: 4px;
    color: var(--ink-red);
  }

  .sliders {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .slider-field {
    flex: 1 1 10rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .slider-field.disabled {
    opacity: 0.5;
  }

  .slider-label {
    font-family: var(--font-mono);
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--site-fg);
  }

  .slider-label em {
    color: var(--site-fg-muted);
    font-style: normal;
    font-weight: 400;
  }

  .locked {
    margin-left: 0.4rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-coral);
  }

  .slider-field input[type='range'] {
    width: 100%;
    accent-color: var(--ink-sea);
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 12rem 1fr 9rem;
    align-items: center;
    gap: 0.7rem;
  }

  .bar-label {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }

  .bar-label.win {
    color: var(--cta);
    font-weight: 600;
  }

  .track {
    height: 22px;
    background: color-mix(in srgb, var(--site-fg) 6%, var(--site-surface));
    border-radius: 6px;
    overflow: hidden;
  }

  .bar {
    height: 100%;
    border-radius: 6px;
    transition: width 220ms ease;
  }

  .bar.fwd {
    background: linear-gradient(90deg, var(--ink-coral), color-mix(in srgb, var(--ink-coral) 70%, var(--ink-sun)));
  }

  .bar.rev {
    background: linear-gradient(90deg, var(--ink-sea), color-mix(in srgb, var(--ink-sea) 70%, var(--ink-teal)));
  }

  .cost {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .verdict {
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .verdict.tone-reverse {
    background: color-mix(in srgb, var(--ink-sea) 14%, transparent);
    border-left: 3px solid var(--ink-sea);
  }

  .verdict.tone-forward {
    background: color-mix(in srgb, var(--ink-coral) 14%, transparent);
    border-left: 3px solid var(--ink-coral);
  }

  .verdict.tone-tie {
    background: color-mix(in srgb, var(--site-fg) 6%, transparent);
    border-left: 3px solid var(--site-fg-muted);
  }

  .verdict strong {
    font-family: var(--font-body);
    font-size: 0.92rem;
    color: var(--site-fg);
  }

  .verdict p {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.84rem;
    line-height: 1.55;
    color: var(--site-fg);
  }

  .verdict code {
    font-family: var(--font-mono);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    padding: 0.05em 0.3em;
    border-radius: 4px;
    color: var(--ink-red);
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.55;
  }

  @media (max-width: 580px) {
    .bar-row {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
    .cost {
      text-align: left;
    }
  }
</style>
