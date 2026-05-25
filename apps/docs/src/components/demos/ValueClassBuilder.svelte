<script lang="ts">
  /**
   * ValueClassBuilder — M12.3. A scaffolded micrograd Value class runs in
   * the browser via Pyodide. Learner writes the body of each _backward
   * closure (add, mul, pow, tanh, exp) one at a time; the widget runs a
   * targeted test for that op and compares the resulting grads to a
   * precomputed JS reference. ~10 MB Pyodide download triggered lazily
   * on the first "Run test" click.
   */

  type ExerciseId = 'add' | 'mul' | 'pow' | 'tanh' | 'exp' | 'diamond';

  interface Exercise {
    id: ExerciseId;
    label: string;
    /** One-line prompt shown above the editor. */
    prompt: string;
    /** Marker inside SCAFFOLD that gets replaced with the learner's body. */
    slot: string;
    /** Default content of the editor — starts empty/wrong, learner fills in. */
    starter: string;
    /** Canonical solution (for the "show solution" button). */
    solution: string;
    /** Python expression(s) appended after the class def to exercise this op. */
    test: string;
    /** Expected gradients keyed by Python variable name. */
    expected: Record<string, number>;
    /** Optional commentary printed after a pass. */
    aha?: string;
  }

  const SCAFFOLD = `import math

class Value:
    """A scalar wrapped with autograd. Same shape as Karpathy's micrograd."""

    def __init__(self, data, _children=(), _op=''):
        self.data = float(data)
        self.grad = 0.0
        self._prev = list(_children)
        self._op = _op
        self._backward = lambda: None

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), '+')
        def _backward():
{{ADD_BACKWARD}}
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), '*')
        def _backward():
{{MUL_BACKWARD}}
        out._backward = _backward
        return out

    def __pow__(self, n):
        assert isinstance(n, (int, float))
        out = Value(self.data ** n, (self,), f'**{n}')
        def _backward():
{{POW_BACKWARD}}
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), 'tanh')
        def _backward():
{{TANH_BACKWARD}}
        out._backward = _backward
        return out

    def exp(self):
        e = math.exp(self.data)
        out = Value(e, (self,), 'exp')
        def _backward():
{{EXP_BACKWARD}}
        out._backward = _backward
        return out

    def __radd__(self, other): return self + other
    def __neg__(self):         return self * -1
    def __sub__(self, other):  return self + (-other)
    def __rsub__(self, other): return other + (-self)
    def __rmul__(self, other): return self * other
    def __truediv__(self, other): return self * other ** -1

    def backward(self):
        topo, visited = [], set()
        def build(v):
            if id(v) in visited: return
            visited.add(id(v))
            for c in v._prev: build(c)
            topo.append(v)
        build(self)
        self.grad = 1.0
        for v in reversed(topo):
            v._backward()
`;

  const EXERCISES: Exercise[] = [
    {
      id: 'add',
      label: '__add__',
      prompt:
        'Fill in _backward for addition. Hint: an addition node copies the upstream gradient to both inputs.',
      slot: '{{ADD_BACKWARD}}',
      starter:
        '            # self.grad  += ?\n            # other.grad += ?\n            pass',
      solution:
        '            self.grad  += out.grad\n            other.grad += out.grad',
      test: `a = Value(2.0); b = Value(3.0)
c = a + b
c.backward()
print('a.grad', a.grad)
print('b.grad', b.grad)
print('c.data', c.data)`,
      expected: { 'a.grad': 1.0, 'b.grad': 1.0, 'c.data': 5.0 },
      aha: 'Addition is the simplest case: the upstream gradient passes straight through to both inputs.',
    },
    {
      id: 'mul',
      label: '__mul__',
      prompt:
        'Fill in _backward for multiplication. Each parent\'s gradient gets the upstream gradient times *the other parent\'s data*.',
      slot: '{{MUL_BACKWARD}}',
      starter:
        '            # self.grad  += ? * out.grad\n            # other.grad += ? * out.grad\n            pass',
      solution:
        '            self.grad  += other.data * out.grad\n            other.grad += self.data  * out.grad',
      test: `# 1. ordinary product
a = Value(3.0); b = Value(4.0)
c = a * b
c.backward()
print('a.grad', a.grad)
print('b.grad', b.grad)

# 2. a node used twice — this is the += test
x = Value(3.0)
y = x * x
y.backward()
print('x.grad', x.grad)`,
      expected: { 'a.grad': 4.0, 'b.grad': 3.0, 'x.grad': 6.0 },
      aha: 'The second test (x * x) is the one that fails if you wrote `=` instead of `+=`. With `+=`, both contributions accumulate and you get 6 instead of 3. Karpathy fixes this bug on camera in the spelled-out video.',
    },
    {
      id: 'pow',
      label: '__pow__',
      prompt:
        'Fill in _backward for a constant exponent. Local derivative is n · a^(n-1).',
      slot: '{{POW_BACKWARD}}',
      starter: '            # self.grad += ? * out.grad\n            pass',
      solution:
        '            self.grad += (n * self.data ** (n - 1)) * out.grad',
      test: `a = Value(3.0)
b = a ** 2
b.backward()
print('a.grad', a.grad)`,
      expected: { 'a.grad': 6.0 },
    },
    {
      id: 'tanh',
      label: 'tanh',
      prompt:
        'Fill in _backward for tanh. The output value `out.data` is already tanh(self.data), so the local derivative simplifies.',
      slot: '{{TANH_BACKWARD}}',
      starter: '            # self.grad += ? * out.grad\n            pass',
      solution: '            self.grad += (1 - out.data ** 2) * out.grad',
      test: `a = Value(0.5)
b = a.tanh()
b.backward()
print('a.grad', a.grad)`,
      expected: { 'a.grad': 1 - Math.tanh(0.5) ** 2 },
    },
    {
      id: 'exp',
      label: 'exp',
      prompt:
        'Fill in _backward for exp. Local derivative of e^x is e^x — which is exactly out.data.',
      slot: '{{EXP_BACKWARD}}',
      starter: '            # self.grad += ? * out.grad\n            pass',
      solution: '            self.grad += out.data * out.grad',
      test: `a = Value(1.0)
b = a.exp()
b.backward()
print('a.grad', a.grad)`,
      expected: { 'a.grad': Math.E },
    },
    {
      id: 'diamond',
      label: 'diamond',
      prompt:
        'Final test: the whole class with all five backwards filled in. The diamond from lesson 12.2: a=2, b=a+1, c=a·3, d=b·c. Expect ∂d/∂a = 15.',
      slot: '__not_a_slot__',
      starter:
        '# (no input — this runs only after every _backward is correct.)',
      solution: '# (no input — this is just a verification test.)',
      test: `a = Value(2.0)
b = a + 1
c = a * 3
d = b * c
d.backward()
print('a.grad', a.grad)
print('b.data', b.data)
print('c.data', c.data)
print('d.data', d.data)`,
      expected: { 'a.grad': 15.0, 'd.data': 18.0 },
      aha:
        'You just trained micrograd on a graph with reused subexpressions. The += inside __mul__ is what makes both paths through `a` contribute. The topological sort inside .backward() is what makes them arrive in the right order. This is the entire engine, in ~80 lines of Python.',
    },
  ];

  // ---------- component state ----------
  let active = $state<ExerciseId>('add');
  const exercise = $derived(EXERCISES.find((e) => e.id === active)!);

  // Per-exercise saved code (so flipping tabs preserves work)
  let codes = $state<Record<ExerciseId, string>>(
    EXERCISES.reduce(
      (acc, e) => ({ ...acc, [e.id]: e.starter }),
      {} as Record<ExerciseId, string>,
    ),
  );

  // ---------- Pyodide loading ----------
  let pyState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let pyError = $state<string>('');
  let pyodide: any = null;

  function loadPyodideScript(): Promise<any> {
    if (typeof window === 'undefined') return Promise.reject('no window');
    return new Promise((resolve, reject) => {
      const w = window as any;
      if (w.loadPyodide) return resolve(w.loadPyodide);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js';
      s.async = true;
      s.onload = () => resolve(w.loadPyodide);
      s.onerror = () => reject(new Error('failed to load pyodide.js'));
      document.head.appendChild(s);
    });
  }

  async function ensurePyodide() {
    if (pyodide) return pyodide;
    pyState = 'loading';
    try {
      const loadPyodide = await loadPyodideScript();
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
        stdout: () => undefined,
        stderr: () => undefined,
      });
      pyState = 'ready';
      return pyodide;
    } catch (err: any) {
      pyState = 'error';
      pyError = err?.message ?? String(err);
      throw err;
    }
  }

  // ---------- run a test ----------
  type RunOutcome =
    | { kind: 'pass'; output: string; checks: { name: string; got: number; want: number }[] }
    | { kind: 'fail'; output: string; checks: { name: string; got: number; want: number }[]; reason: string }
    | { kind: 'error'; output: string; reason: string };

  let outcome = $state<RunOutcome | null>(null);
  let running = $state(false);

  function buildProgram(ex: Exercise): string {
    let prog = SCAFFOLD;
    // Replace every slot with that op's body. For ops we have a saved
    // user body, use it; for others, fall back to the canonical solution
    // so the class compiles even when only one closure is being tested.
    for (const e of EXERCISES) {
      if (e.id === 'diamond') continue;
      const body = e.id === ex.id ? codes[ex.id] : EXERCISES.find((x) => x.id === e.id)?.solution ?? '';
      // If learner's body is empty, fall back to canonical to keep the class valid
      const finalBody = body.trim() ? body : (EXERCISES.find((x) => x.id === e.id)?.solution ?? '            pass');
      prog = prog.replace(e.slot, finalBody);
    }
    // For the diamond test, force all canonical solutions in (learner has
    // had a chance to fill each; here we just verify the integration).
    if (ex.id === 'diamond') {
      prog = SCAFFOLD;
      for (const e of EXERCISES) {
        if (e.id === 'diamond') continue;
        const useUser = codes[e.id]?.trim() && !codes[e.id].includes('pass');
        const body = useUser ? codes[e.id] : e.solution;
        prog = prog.replace(e.slot, body);
      }
    }
    return prog + '\n\n' + ex.test;
  }

  async function runTest() {
    if (running) return;
    running = true;
    outcome = null;
    let stdoutLines: string[] = [];
    try {
      const py = await ensurePyodide();
      py.setStdout({ batched: (s: string) => stdoutLines.push(s) });
      py.setStderr({ batched: (s: string) => stdoutLines.push('!! ' + s) });
      const prog = buildProgram(exercise);
      py.runPython(prog);
      const output = stdoutLines.join('\n');

      // Parse "name value" pairs from stdout
      const got: Record<string, number> = {};
      for (const line of stdoutLines) {
        const m = line.match(/^(\S+)\s+(-?\d+\.?\d*(?:e-?\d+)?)/);
        if (m) got[m[1]] = Number(m[2]);
      }
      const checks: { name: string; got: number; want: number }[] = [];
      let fail: string | null = null;
      for (const [name, want] of Object.entries(exercise.expected)) {
        const g = got[name];
        if (g === undefined) {
          fail = `missing output: expected a print statement for ${name}`;
          checks.push({ name, got: NaN, want });
          continue;
        }
        checks.push({ name, got: g, want });
        if (Math.abs(g - want) > 1e-5) {
          fail = `${name} = ${g.toFixed(4)} (expected ${want.toFixed(4)})`;
        }
      }
      outcome = fail
        ? { kind: 'fail', output, checks, reason: fail }
        : { kind: 'pass', output, checks };
    } catch (err: any) {
      outcome = {
        kind: 'error',
        output: stdoutLines.join('\n'),
        reason: err?.message ?? String(err),
      };
    } finally {
      running = false;
    }
  }

  function showSolution() {
    codes = { ...codes, [active]: exercise.solution };
  }

  function reset() {
    codes = { ...codes, [active]: exercise.starter };
    outcome = null;
  }

  function fmtNum(n: number) {
    if (Number.isNaN(n)) return '—';
    if (Math.abs(n) < 1e-4 && n !== 0) return n.toExponential(2);
    return n.toFixed(4);
  }
</script>

<div class="widget">
  <header>
    <div class="title">
      <span class="badge">M12.3</span>
      <span>micrograd in your browser, line by line</span>
    </div>
    <div class={`pystate ${pyState}`}>
      {#if pyState === 'idle'}
        Python runtime: not loaded (will load on first Run, ~10 MB)
      {:else if pyState === 'loading'}
        ⟳ loading Python runtime via Pyodide…
      {:else if pyState === 'ready'}
        ✓ Pyodide ready
      {:else}
        ⚠ Pyodide failed to load: {pyError}
      {/if}
    </div>
  </header>

  <nav class="tabs" role="tablist">
    {#each EXERCISES as e (e.id)}
      <button
        type="button"
        role="tab"
        class="tab"
        class:active={active === e.id}
        aria-selected={active === e.id}
        onclick={() => {
          active = e.id;
          outcome = null;
        }}
      >
        <code>{e.label}</code>
      </button>
    {/each}
  </nav>

  <p class="prompt">{exercise.prompt}</p>

  {#if exercise.id !== 'diamond'}
    <details class="scaffold-details">
      <summary>show full <code>Value</code> class (the part you're editing is highlighted)</summary>
      <pre class="scaffold"><code>{SCAFFOLD.replace(
            exercise.slot,
            `            # ← your _backward body goes here (currently testing this one)`,
          )}</code></pre>
    </details>

    <label class="editor-field">
      <span class="lbl">your <code>_backward</code> body</span>
      <textarea
        spellcheck="false"
        autocorrect="off"
        autocomplete="off"
        bind:value={codes[active]}
        rows={6}
      ></textarea>
    </label>
  {:else}
    <p class="diamond-note">
      This test runs the full Value class using your bodies for any op you
      have filled in, falling back to the canonical solution for the rest.
      Expect <code>a.grad = 15</code>.
    </p>
  {/if}

  <div class="controls">
    <button type="button" class="run" onclick={runTest} disabled={running}>
      {#if running}running…{:else}▶ run test{/if}
    </button>
    {#if exercise.id !== 'diamond'}
      <button type="button" class="ghost" onclick={showSolution}>show solution</button>
      <button type="button" class="ghost" onclick={reset}>reset</button>
    {/if}
  </div>

  {#if outcome}
    <div class={`result ${outcome.kind}`} aria-live="polite">
      {#if outcome.kind === 'pass'}
        <strong>✓ passed</strong>
        {#if exercise.aha}
          <p class="aha">{exercise.aha}</p>
        {/if}
      {:else if outcome.kind === 'fail'}
        <strong>✗ failed</strong>
        <p class="reason">{outcome.reason}</p>
      {:else}
        <strong>⚠ runtime error</strong>
        <p class="reason">{outcome.reason}</p>
      {/if}

      {#if outcome.kind !== 'error'}
        <table class="checks">
          <thead>
            <tr><th>output</th><th>got</th><th>expected</th><th>delta</th></tr>
          </thead>
          <tbody>
            {#each outcome.checks as c (c.name)}
              <tr class:bad={Math.abs(c.got - c.want) > 1e-5}>
                <td><code>{c.name}</code></td>
                <td>{fmtNum(c.got)}</td>
                <td>{fmtNum(c.want)}</td>
                <td>{fmtNum(c.got - c.want)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

      {#if outcome.output}
        <details class="stdout">
          <summary>stdout</summary>
          <pre>{outcome.output}</pre>
        </details>
      {/if}
    </div>
  {/if}
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-body);
    font-size: 0.92rem;
    color: var(--site-fg);
  }

  .badge {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-pill, 999px);
    background: color-mix(in srgb, var(--ink-red) 18%, transparent);
    color: var(--ink-red);
    font-weight: 700;
  }

  .pystate {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--site-fg-muted);
  }

  .pystate.loading { color: var(--ink-sun); }
  .pystate.ready { color: var(--cta); }
  .pystate.error { color: var(--ink-coral); }

  .tabs {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    border-bottom: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    padding-bottom: 0.4rem;
  }

  .tab {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--site-fg-muted);
    cursor: pointer;
  }

  .tab.active {
    background: color-mix(in srgb, var(--ink-red) 12%, transparent);
    border-color: var(--ink-red);
    color: var(--site-fg);
  }

  .prompt {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.92rem;
    line-height: 1.5;
    color: var(--site-fg);
  }

  .scaffold-details summary {
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    cursor: pointer;
  }

  .scaffold {
    max-height: 320px;
    overflow: auto;
    padding: 0.7rem 0.85rem;
    border-radius: 8px;
    background: color-mix(in srgb, var(--site-fg) 4%, var(--site-surface));
    font-family: var(--font-mono);
    font-size: 0.76rem;
    line-height: 1.5;
    color: var(--site-fg);
  }

  .editor-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .lbl {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--site-fg-muted);
  }

  .editor-field textarea {
    font-family: var(--font-mono);
    font-size: 0.86rem;
    line-height: 1.55;
    padding: 0.6rem 0.7rem;
    border-radius: 8px;
    border: 1px solid var(--site-border);
    background: color-mix(in srgb, var(--site-fg) 3%, var(--site-surface));
    color: var(--site-fg);
    resize: vertical;
    min-height: 6rem;
  }

  .editor-field textarea:focus {
    outline: none;
    border-color: var(--ink-red);
  }

  .diamond-note {
    margin: 0;
    padding: 0.6rem 0.85rem;
    border-radius: 8px;
    background: color-mix(in srgb, var(--ink-sun) 12%, transparent);
    border-left: 3px solid var(--ink-sun);
    font-family: var(--font-body);
    font-size: 0.86rem;
    color: var(--site-fg);
  }

  .controls {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .controls button {
    font-family: var(--font-body);
    font-size: 0.85rem;
    padding: 0.4rem 1rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--ink-red);
    background: var(--ink-red);
    color: white;
    cursor: pointer;
    font-weight: 600;
  }

  .controls button.ghost {
    background: var(--site-surface);
    color: var(--site-fg-muted);
    border-color: var(--site-border);
    font-weight: 400;
  }

  .controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .result {
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-family: var(--font-body);
    font-size: 0.88rem;
  }

  .result.pass {
    background: color-mix(in srgb, var(--cta) 14%, transparent);
    border-left: 3px solid var(--cta);
  }

  .result.fail,
  .result.error {
    background: color-mix(in srgb, var(--ink-coral) 14%, transparent);
    border-left: 3px solid var(--ink-coral);
  }

  .reason {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
  }

  .aha {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.55;
    color: var(--site-fg);
  }

  .checks {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }

  .checks th,
  .checks td {
    text-align: left;
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid color-mix(in srgb, var(--site-fg) 8%, transparent);
  }

  .checks th {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
  }

  .checks tr.bad td {
    color: var(--ink-coral);
  }

  .stdout summary {
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .stdout pre {
    margin: 0.4rem 0 0;
    padding: 0.5rem 0.7rem;
    background: color-mix(in srgb, var(--site-fg) 5%, var(--site-surface));
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--site-fg);
    overflow-x: auto;
  }
</style>
