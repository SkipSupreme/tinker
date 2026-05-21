<script lang="ts">
  /**
   * Small calculator: an information quantity in one unit converts to every other
   * unit live. Perplexity is shown alongside so the learner sees that base
   * doesn't change perplexity.
   */

  interface Props {
    initialValue?: number;
    initialUnit?: 'bits' | 'nats' | 'bans';
  }

  let {
    initialValue = 1,
    initialUnit = 'bits',
  }: Props = $props();

  let value = $state(initialValue);
  let unit: 'bits' | 'nats' | 'bans' = $state(initialUnit);

  // Convert input value to nats (the canonical internal representation).
  const valueInNats = $derived.by(() => {
    if (unit === 'bits') return value * Math.LN2;
    if (unit === 'bans') return value * Math.LN10;
    return value; // nats
  });

  const inBits = $derived(valueInNats / Math.LN2);
  const inNats = $derived(valueInNats);
  const inBans = $derived(valueInNats / Math.LN10);
  const perplexity = $derived(Math.exp(valueInNats));

  function fmt(n: number, d = 4): string {
    if (!isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1000 || (Math.abs(n) > 0 && Math.abs(n) < 0.001)) return n.toExponential(2);
    return n.toFixed(d);
  }

  function setExample(label: string) {
    if (label === 'fair-coin-bit') { value = 1; unit = 'bits'; }
    else if (label === 'fair-die-bit') { value = Math.log2(6); unit = 'bits'; }
    else if (label === 'gpt3-bpc') { value = 1.73; unit = 'bits'; }
    else if (label === 'tiny-sh') { value = 1.5; unit = 'nats'; }
    else if (label === 'log27') { value = Math.log(27); unit = 'nats'; }
  }
</script>

<div class="widget">
  <div class="form-row">
    <label class="field">
      <span class="lbl">value</span>
      <input
        type="number"
        step="0.01"
        bind:value
        class="num-input"
      />
    </label>
    <label class="field">
      <span class="lbl">units</span>
      <select bind:value={unit} class="sel">
        <option value="bits">bits (log₂)</option>
        <option value="nats">nats (ln)</option>
        <option value="bans">bans (log₁₀)</option>
      </select>
    </label>
  </div>

  <div class="grid">
    <div class="cell">
      <span class="cell-label">bits</span>
      <span class="cell-val">{fmt(inBits)}</span>
    </div>
    <div class="cell">
      <span class="cell-label">nats</span>
      <span class="cell-val">{fmt(inNats)}</span>
    </div>
    <div class="cell">
      <span class="cell-label">bans</span>
      <span class="cell-val">{fmt(inBans)}</span>
    </div>
    <div class="cell perp">
      <span class="cell-label">perplexity = e^(nats) = 2^(bits)</span>
      <span class="cell-val pp">{fmt(perplexity, 3)}</span>
    </div>
  </div>

  <div class="examples">
    <span class="examples-label">Try:</span>
    <button type="button" class="btn" onclick={() => setExample('fair-coin-bit')}>fair coin (1 bit)</button>
    <button type="button" class="btn" onclick={() => setExample('fair-die-bit')}>fair die (log₂ 6 bits)</button>
    <button type="button" class="btn" onclick={() => setExample('log27')}>uniform on 27 (ln 27 nats)</button>
    <button type="button" class="btn" onclick={() => setExample('tiny-sh')}>tiny-shakespeare val (1.5 nats)</button>
    <button type="button" class="btn" onclick={() => setExample('gpt3-bpc')}>GPT-3 bpc (1.73 bits)</button>
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
  }
  .form-row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 140px;
  }
  .lbl {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .num-input, .sel {
    font-family: var(--font-mono);
    font-size: 16px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
  }
  .grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }
  .cell {
    background: var(--demo-stage);
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cell-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cell-val {
    font-family: var(--font-mono);
    font-size: 18px;
    color: var(--site-fg);
    font-weight: 600;
  }
  .cell.perp {
    background: color-mix(in srgb, var(--ink-sun) 12%, var(--demo-card));
    border: 1px solid var(--ink-sun);
  }
  .cell.perp .cell-label { color: color-mix(in srgb, var(--ink-sun) 70%, var(--site-fg-muted)); }
  .cell-val.pp {
    color: var(--ink-sun);
    font-size: 22px;
  }
  .examples {
    margin-top: 14px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .examples-label {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--site-fg-muted);
  }
  .btn {
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 120ms ease-out;
  }
  .btn:hover { transform: translateY(-1px); }
</style>
