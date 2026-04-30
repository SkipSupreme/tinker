# Module 17 — Tokenization, Training & Sampling — Research Brief

### 1. Concept dependency graph

1. `m17-token-id` — A token is a non-negative integer index into a fixed vocabulary; the model never reads characters or bytes. *Prereqs:* m11-neural-networks (embedding lookup), m14-sequence-modeling.
2. `m17-vocab-artifact` — The vocabulary plus its encode/decode rules is a frozen artifact shipped with the weights; changing it changes the meaning of every id. *Prereqs:* m17-token-id.
3. `m17-char-tokenizer` — Character-level tokenization treats each Unicode codepoint as a token; `vocab_size ≈ 65` for tiny-shakespeare. *Prereqs:* m17-token-id.
4. `m17-word-tokenizer` — Word-level tokenization treats whitespace-separated tokens as units; suffers vocab explosion and OOV. *Prereqs:* m17-token-id.
5. `m17-subword-motivation` — Subword units compromise between long sequences (chars) and huge vocab + OOV (words). *Prereqs:* m17-char-tokenizer, m17-word-tokenizer.
6. `m17-bpe-train` — BPE trains: from a base alphabet, repeatedly merge the most frequent adjacent pair until vocab budget is hit; output is an ordered merge list. *Prereqs:* m17-subword-motivation, m8-probability.
7. `m17-bpe-encode` — At inference, BPE encoding deterministically applies the saved merges in training order to any input string. *Prereqs:* m17-bpe-train.
8. `m17-byte-bpe` — Byte-level BPE (GPT-2/3) starts from the 256 raw UTF-8 bytes; the tokenizer is total — every string is representable, no UNK. *Prereqs:* m17-bpe-train.
9. `m17-vocab-size-tradeoff` — Bigger vocab → shorter sequences but larger embedding/unembedding matrices; sequence length T and `|V|` trade off against each other. *Prereqs:* m17-vocab-artifact, m16-transformer-block.
10. `m17-tok-failure-modes` — Tokenization shape determines what is hard for the model: counting letters, multi-digit math, leading-space variants, capital-letter prompts. *Prereqs:* m17-bpe-encode, m17-byte-bpe.
11. `m17-corpus-stream` — A corpus is encoded once into a single 1-D tensor of token ids; this is what the trainer slices from. *Prereqs:* m17-token-id.
12. `m17-data-loader` — `get_batch` samples B random offsets `i`; `x = data[i:i+T]`, `y = data[i+1:i+T+1]`. *Prereqs:* m17-corpus-stream, m14-sequence-modeling.
13. `m17-train-val-split` — Hold out a contiguous suffix of the stream so val tokens are unseen; for tiny-shakespeare this is a 90/10 char split. *Prereqs:* m17-corpus-stream, m13-training-dynamics.
14. `m17-loss-everywhere` — NLL is averaged over all `B·T` predicted positions per step, not just the last. *Prereqs:* m16-transformer-block, m9-information-theory.
15. `m17-train-loop` — One step = forward → loss → backward → AdamW.step → zero_grad; loop until `max_iters`. *Prereqs:* m12-backpropagation, m10-optimization, m17-data-loader, m17-loss-everywhere.
16. `m17-grad-clip` — `clip_grad_norm_(params, 1.0)` rescales the gradient if its global L2 norm exceeds 1; cheap insurance against rare loss spikes. *Prereqs:* m17-train-loop.
17. `m17-warmup-cosine` — Linear warmup over W iters (e.g. 100 iters) then cosine decay from `lr` to `min_lr` over `lr_decay_iters`. *Prereqs:* m10-optimization.
18. `m17-loss-trajectory` — On char tiny-shakespeare, train loss starts near `ln 65 ≈ 4.17`, drops fast in the first ~500 iters, then settles near val NLL ≈ 1.5 (perplexity ≈ 4–5) for a small model. *Prereqs:* m17-train-loop, m9-information-theory.
19. `m17-overfit-signal` — On tiny corpora train loss keeps dropping while val loss bottoms out and rises; nanoGPT only saves checkpoints when val improves. *Prereqs:* m17-train-val-split, m13-training-dynamics.
20. `m17-autoregressive-loop` — Generation: forward prompt → take last-position logits → pick next id → append → repeat; crop context to `block_size`. *Prereqs:* m16-transformer-block.
21. `m17-greedy-fail` — argmax decoding on a generative LM produces repetitive, mode-collapsed text — the "I don't know I don't know I don't know" failure of maximization. *Prereqs:* m17-autoregressive-loop.
22. `m17-temperature` — `softmax(logits / τ)`: τ→0 ⇒ argmax, τ→∞ ⇒ uniform, τ=1 ⇒ unmodified model distribution. *Prereqs:* m7-linear-algebra (softmax), m17-autoregressive-loop.
23. `m17-top-k` — Keep the k highest-logit tokens (set the rest to `-∞`), renormalize, sample. *Prereqs:* m17-temperature.
24. `m17-top-p` — Sort by probability; keep the smallest prefix whose cumulative mass ≥ p; renormalize, sample. *Prereqs:* m17-temperature, m8-probability.
25. `m17-sampler-pipeline` — Conventional order: temperature → top-k → top-p → categorical sample; apply on logits, softmax once at the end. *Prereqs:* m17-temperature, m17-top-k, m17-top-p.
26. `m17-beam-search-not` — Beam search maximizes joint sequence likelihood; great for translation, bad for open-ended LM because it concentrates on degenerate high-likelihood paths. *Prereqs:* m17-greedy-fail.
27. `m17-kv-cache-callback` — During autoregressive sampling KV cache turns per-token cost from O(T²) (recompute K,V for all past tokens) to O(T) (one new K,V row). *Prereqs:* m15-attention.
28. `m17-seed-determinism` — At fixed weights and fixed (τ, k, p), the RNG seed is the only source of variation across runs. *Prereqs:* m8-probability, m17-sampler-pipeline.
29. `m17-prompt-control` — A frozen model is steered entirely from outside via prompt + sampling settings; no weight changes. *Prereqs:* m17-autoregressive-loop, m17-sampler-pipeline.

---

### 2. Canonical worked examples

**E1. BPE merge by hand on a toy corpus (Hugging Face / Sennrich 2016 default).**
Statement: Corpus word counts: $\{\text{hug}:10,\ \text{pug}:5,\ \text{pun}:12,\ \text{bun}:4,\ \text{hugs}:5\}$. Base vocab is the set of letters $\{b,g,h,n,p,s,u\}$. Run two BPE merges; report the final tokenization of `"hugs"`.
Solution: Initial split `h u g`, `p u g`, `p u n`, `b u n`, `h u g s`. Pair counts: `(u,g)=10+5+5=20`, `(h,u)=10+5=15`, `(p,u)=5+12=17`, `(u,n)=12+4=16`, `(g,s)=5`. Merge ① `(u,g)→ug`. New splits: `h ug`, `p ug`, `p u n`, `b u n`, `h ug s`. Pair counts now: `(h,ug)=15`, `(p,ug)=5`, `(p,u)=12`, `(u,n)=16`, `(ug,s)=5`. Merge ② `(u,n)→un`. Final tokenization of `"hugs"` ⇒ `[h, ug, s]`.
Pedagogical point: BPE is a deterministic, ordered, frequency-driven greedy merge; the merge list *is* the tokenizer.
Most common mistake: Recomputing pair counts from the *original* characters at every step instead of from the *current* token sequences.

**E2. Tokenize "strawberry" with the GPT-4 (cl100k_base) tokenizer.**
Statement: Show the token sequence and explain the "how many R's in strawberry" failure.
Solution: `"strawberry"` ⇒ tokens `["st", "raw", "berry"]` ⇒ ids `[496, 675, 15717]`. The model receives 3 integers; the letters `r` are inside chunks the model has no built-in operation to introspect.
Pedagogical point: The model's atomic unit is the token id, not the character. Letter-counting tasks are off-distribution because they require operations that don't exist at the embedding layer.
Most common mistake: Believing the model is "looking at letters and miscounting." It is not looking at letters at all.

**E3. Compute initial expected NLL on tiny-shake-char.**
Statement: Tiny-shakespeare has $|V|=65$. Predict the cross-entropy of an *untrained* model that has been initialized so its output distribution is approximately uniform. Then state in nats.
Solution: A uniform distribution over 65 classes assigns each class probability $1/65$. NLL per token $= -\log(1/65) = \ln 65 \approx 4.174$.
Pedagogical point: This is the loss-axis "ceiling." If iter-0 train loss is far from $\ln |V|$, your initialization or loss reduction is broken.
Most common mistake: Using $\log_2$ and reporting bits when nanoGPT/PyTorch report nats.

**E4. The shifted-by-one batch (Karpathy "Let's build GPT").**
Statement: A 1-D tensor `data` holds 1{,}003{,}854 token ids. With `B=4`, `T=8`, write the recipe for one batch and explain why `y = x` shifted by 1 gives free supervision at every position.
Solution: Sample 4 random offsets $i_1,\dots,i_4 \sim \mathrm{Uniform}\{0,\dots,N{-}T{-}1\}$. Stack `x_b = data[i_b : i_b+T]`, `y_b = data[i_b+1 : i_b+T+1]`. The transformer's causal mask means position $t$ in the forward pass has only seen `x[:t+1]`, so predicting `y[t]` from that prefix is honest next-token supervision; one batch yields $B \cdot T = 32$ training examples.
Pedagogical point: A causal LM trains $T$ examples in parallel per row at no extra forward cost.
Most common mistake: Computing loss only at the *last* position (sequence-level NLL), throwing away $\sim T{-}1$ × of the gradient signal.

**E5. Temperature transforms a 3-token distribution.**
Statement: Logits $\ell = (2.0,\, 1.0,\, 0.0)$. Compute $p$ at $\tau \in \{0.5,\, 1.0,\, 2.0\}$.
Solution: At $\tau=1$: $p \propto e^{2}, e^{1}, e^{0}$ ⇒ $(0.665, 0.245, 0.090)$. At $\tau=0.5$ (logits become $4,2,0$): $p \propto e^{4},e^{2},e^{0}$ ⇒ $(0.867, 0.117, 0.016)$. At $\tau=2$ (logits become $1, 0.5, 0$): $p \propto e^{1}, e^{0.5}, e^{0}$ ⇒ $(0.506, 0.307, 0.186)$.
Pedagogical point: Temperature is a *non-linear* sharpening/softening because softmax exponentiates; equal scaling of logits is **not** equal scaling of probabilities.
Most common mistake: "If I scale logits the ratios stay the same" — true for raw logits, false after softmax.

**E6. Top-p (nucleus) cutoff arithmetic.**
Statement: After softmax, sorted probabilities are $(0.50, 0.20, 0.15, 0.08, 0.05, 0.02)$. With $p=0.9$, identify the nucleus, renormalize, and give the resulting distribution.
Solution: Cumulative sums: $0.50, 0.70, 0.85, 0.93, \dots$. Smallest prefix with cumsum $\geq 0.9$ is the first **four** tokens (cumsum $= 0.93$). Discard the last two; renormalize: divide each kept prob by $0.93$ ⇒ $(0.538, 0.215, 0.161, 0.086)$.
Pedagogical point: The nucleus is *dynamic* — its size depends on how confident the model is at this step.
Most common mistake: Stopping at the first cumsum *strictly greater than* p and dropping the boundary token, or forgetting to renormalize.

**E7. nanoGPT character-level training trajectory.**
Statement: Using nanoGPT's `train_shakespeare_char.py` defaults (`n_layer=6, n_head=6, n_embd=384, block_size=256, batch_size=64, lr=1e-3, dropout=0.2, max_iters=5000`), what loss trajectory should a learner expect, and what is the validation-loss target Karpathy reports?
Solution: Iter 0: train loss ≈ $\ln 65 \approx 4.17$. By ~500 iters the train loss is ≈ 1.7; by 2000 iters ≈ 1.3; final best val ≈ **1.47** on an A100 in ~3 minutes. Capstone (4 layers, 4 heads, $d=128$, $T=64$, ~200k params) plateaus higher — expect val NLL around 1.5–1.7, perplexity ≈ 4.5–5.5.
Pedagogical point: The loss curve is not "smaller is always better" — it is "follows the expected shape." A plateau at $\ln |V|$ is broken init; a plateau above 2.0 is undertrained or under-parameterized.
Most common mistake: Reporting val loss before the warmup completes (val often jumps in the first ~100 iters and looks alarming).

**E8. Greedy decoding produces a loop.**
Statement: A bigram-flavored toy LM has, after seeing context "the cat sat on the", a next-token distribution $p(\text{mat})=0.30,\ p(\text{cat})=0.25,\ p(\text{the})=0.20,\ \dots$. Argmax-decode three steps and explain why this fails for open-ended LM.
Solution: Step 1 → "mat". Step 2 (context "...the mat"): argmax may now be "the". Step 3 (context "...mat the"): argmax may again be "mat". Output spirals into "the mat the mat the mat".
Pedagogical point: Maximum-likelihood paths in a generative LM concentrate on degenerate cycles (Holtzman et al., "Curious Case of Neural Text Degeneration"). Diversity is a feature, not a bug, of stochastic sampling.
Most common mistake: Confusing this with *translation*, where beam search works because the output space is constrained by the source.

**E9. Top-k vs top-p on a long-tailed step.**
Statement: Suppose the model is uncertain: top 50 tokens each have probability ≈ 0.018, summing to ≈ 0.9. With `top_k=10` vs `top_p=0.9`, which is more permissive and why?
Solution: top-k=10 keeps only 10 tokens (cum mass ≈ 0.18) — very restrictive, will sound forced. top-p=0.9 keeps ≈ 50 tokens — preserves the model's actual uncertainty. When the model is *confident* (one token has 0.99 of mass) top-p collapses to that one token while top-k=10 still allows nine low-quality tokens.
Pedagogical point: top-k has fixed cardinality; top-p has fixed mass. Use top-p when you want to track confidence.
Most common mistake: Picking top-k=1 thinking it equals temperature 0; it does (deterministically), but advertising it as "small variety" is wrong.

**E10. KV-cache speedup arithmetic.**
Statement: For a single-head model with $T = 64$, $d_{\text{head}} = 32$, count the per-token attention FLOPs at step $t$ with vs without a KV cache.
Solution: Without cache: at step $t$, recompute $K, V$ for all $t$ tokens ⇒ $\mathrm{FLOPs}\approx 2 \cdot t \cdot d_{\text{head}}\cdot d_{\text{model}}$ for projections plus $\mathrm{O}(t)$ attention dot-products — total grows linearly with $t$, summed across $T$ steps gives $\mathrm{O}(T^2)$ work for a full sample. With cache: at step $t$, project only the new token's $K,V$ ($\mathrm{O}(1)$ in $t$), then one $\mathrm{O}(t)$ attention pass — total $\mathrm{O}(T)$ per step → $\mathrm{O}(T^2)$ overall but with a much smaller constant; and the dominant *recompute* is gone.
Pedagogical point: The cache turns inference from "redo all the past work each step" into "do one new step's work and look up the rest."
Most common mistake: Believing the cache also helps training. It does not — training already has all positions in parallel.

---

### 3. Common misconceptions

1. **"Tokens are words."** Natural because that's how humans segment language. Counterexample: paste `"strawberry"` into [tiktokenizer.vercel.app](https://tiktokenizer.vercel.app) — three tokens, none of which is a word. Reframe: a token is whatever the tokenizer's merge table produced; it can be a letter, a fragment, a leading space + letters, or a whole compound.

2. **"Bigger vocabulary is always better."** Adult engineers recognize "more dimensions = more expressiveness." Counterexample: doubling vocab doubles the embedding table and the unembedding matrix (which together are ≥30% of params in a small model); sequence length only shrinks logarithmically. Visualization: a slider trading vocab size against parameter count and average token-length.

3. **"Tokenization is a learned part of the model."** Comes from the framing "everything in deep learning is learned." Counterexample: BPE merges are computed once by a frequency-counting MapReduce job; no gradients, no nn.Module. Reframe: the tokenizer is a fixed pre-processor shipped *with* the weights; if you swap it the weights become noise.

4. **"The model 'sees' the text."** Carryover from standard programming where strings are strings. Counterexample: hand `[496, 675, 15717]` to the model with no decoder and ask it to count R's. It can't — it never had access to the string. Visualization: a "byte → token id → embedding" pipeline animation where the original string is greyed out after step 1.

5. **"Train loss going down means the model is learning."** Engineers trust the plot. Counterexample: split tiny-shakespeare 50/50 and overfit on 5k chars — train loss goes to 0 while val loss explodes upwards. Mitigation: every loss plot must show *both* curves; the moment they diverge is the moment you stop.

6. **"Temperature is a creativity dial."** Marketing framing reinforced by API docs. Counterexample: at $\tau=2$ on a confident step, the second-most-likely token (often a typo or stop word) gets enough mass to actually win; that's not creativity, it's noise injection. Reframe: temperature is *exactly* `logits / τ` before softmax — a re-shaping of the existing distribution, never the addition of new ideas.

7. **"top-p = top-k with k = number of tokens kept."** Plausible because both 'truncate.' Counterexample: in a confident step (one token has 0.99 of mass), top-p=0.9 keeps **one** token; top-k=10 keeps ten. They diverge most when you most need them to differ.

8. **"Greedy decoding is the 'most accurate'."** Comes from classifier intuition where argmax is correct. Counterexample: greedy on a small Shakespeare model produces "the the the the" within ~20 tokens. Reframe: in a generative LM, the *joint* maximum-likelihood path is rarely a *good* path — Holtzman et al. quantified this.

9. **"Beam search is universally better than sampling."** Inherited from MT/summarization courses. Counterexample: GPT-2/3/4 use sampling, not beam search. Beam search collapses creative generation; it works for tasks where the answer is constrained by the source (translation).

10. **"Adding a KV cache speeds up training."** It only helps inference. During training all positions are computed in parallel in one matrix multiply; there is no "past" to cache.

11. **"If I keep the seed fixed and the prompt fixed I get the same output regardless of sampler settings."** Half-true: same seed + same sampler = same output, but changing $\tau, k, p$ (or even floating-point order on a different GPU) changes the trajectory. Reframe: the seed selects a path through a *given* distribution; if you reshape the distribution, the same seed selects a different path.

12. **"The training loss should reach 0."** Plausible from supervised-learning heritage. Counterexample: language has irreducible entropy; cross-entropy on tiny-shakespeare-char bottoms out around ~1.4 nats no matter how big the model — that's the data, not the model.

---

### 4. Interactive widget suggestions

**1. `bpeMergeStepper`**
- **Manipulates:** the user types a small corpus (≤200 chars) and clicks "merge once" or scrubs a step counter.
- **Live updates:** the current token sequence is rendered with merged pairs highlighted; a side-panel shows the live pair-frequency histogram with the winning bar pulsing; the merge list grows; vocab size and compression ratio update.
- **Concept:** BPE is a deterministic frequency-greedy loop, not magic.
- **Beats slider:** the learner *grabs the merge step itself* — they can rewind to see why a particular pair won, edit the corpus, and re-watch. The pair-frequency histogram is the mathematical object the algorithm consults.
- **Prior art:** [bpe-visualizer.com](https://www.bpe-visualizer.com/), [byte-pairing.vercel.app](https://byte-pairing.vercel.app/), and the BPE step-through in the [Hugging Face NLP course Ch.6](https://huggingface.co/learn/llm-course/chapter6/5).

**2. `tokenInspector`**
- **Manipulates:** a textarea where the learner pastes text, plus a tokenizer dropdown (`char-tiny`, `gpt-2 byte-BPE`, `cl100k_base`).
- **Live updates:** colored chunks rendered inline (one color per token, persistent across re-runs); per-token id; total token count; a "bytes→tokens compression" readout.
- **Concept:** tokenization is the fixed interface; identical text yields radically different sequences across tokenizers; "strawberry" becomes 3 tokens but each character is reachable in `char-tiny`.
- **Beats slider:** the learner can *type their own name*, *paste code*, or *paste numbers* and watch the segmentation. They can directly probe the "how many R's in strawberry" failure mode.
- **Prior art:** [tiktokenizer.vercel.app](https://tiktokenizer.vercel.app), [OpenAI Tokenizer playground](https://platform.openai.com/tokenizer), Anthropic's tokenizer demo.

**3. `lossLandscapeRunner`**
- **Manipulates:** a "Step" button that runs N (chooseable: 1, 10, 100) training iterations on a pre-quantized 200k-param char model in WebGPU/WebAssembly; a "reset" button; a "data subset size" knob (full corpus / 10k chars / 1k chars).
- **Live updates:** dual loss curve (train + val) drawn live; under each curve a sample of 80 generated chars from the *current* model; alongside, the embedding-table heatmap and a parameter histogram.
- **Concept:** loss curves have *shape*, not just direction; overfitting is what you *see* when the dataset is shrunk.
- **Beats slider:** the learner is grabbing the optimizer's step. They can deliberately overfit by shrinking the corpus and watch val loss diverge — they don't read about overfitting, they cause it.
- **Prior art:** the [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) (live GPT-2 in browser, MIT) and the in-browser training scenes in [TensorFlow.js examples](https://www.tensorflow.org/js/demos).

**4. `samplerPlayground`**
- **Manipulates:** a frozen, shipped 200k-param char-Shakespeare checkpoint; the learner drags τ, k, p simultaneously and clicks "sample."
- **Live updates:** for the **current** decoding step, three stacked bar charts show: raw softmax → after temperature → after top-k → after top-p. A "kept tokens" badge counts surviving tokens. A side text panel shows three parallel completions sharing the same seed but different (τ,k,p), so the learner can directly compare.
- **Concept:** the sampler is a *pipeline of distribution transforms*; temperature ≠ creativity; greedy at τ→0 ≠ "best".
- **Beats slider:** the learner grabs the **distribution itself** — bars they can see grow and shrink — not an opaque "creativity" knob. Direct comparison forces the τ-vs-top-p distinction.
- **Prior art:** the temperature slider in [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) (which the paper explicitly cites as anti-anthropomorphism scaffolding); [perplexity.vercel.app](https://perplexity.vercel.app)-style sampling demos.

**5. `autoregressiveStepper`**
- **Manipulates:** the learner types a prompt, then clicks "next token" repeatedly; each click runs one forward pass, draws the next-token distribution, and animates the chosen token sliding into the context buffer.
- **Live updates:** prompt buffer (tokenized chunks colored), live next-token bar chart, the cumulative output, a timing readout showing per-step ms, and a toggle "KV cache: ON/OFF" that recolors the recomputed cells in the K/V matrices.
- **Concept:** generation is a sequential loop; the KV cache makes the dotted "already computed" cells stop relighting on each step.
- **Beats slider:** the learner is grabbing the **generation step** itself; the KV-cache toggle makes a previously abstract claim ("O(T²)→O(T)") visible in the recompute pattern.
- **Prior art:** the autoregressive walkthrough in Polo Club's Transformer Explainer; [bbycroft.net/llm](https://bbycroft.net/llm) (3D LLM visualizer).

**6. `vocabSizeTradeoff`**
- **Manipulates:** a slider over `|V|` from 65 (chars) → 256 (bytes) → 8k → 50k (GPT-2-like) trained tokenizers (precomputed offline on tiny-shakespeare).
- **Live updates:** for a fixed sample passage, the rendered token chunks and total token count change live; alongside, a parameter-budget bar splits into "embedding+unembedding" vs "blocks" with concrete byte counts; a derived "tokens/sec at fixed FLOP budget" estimator.
- **Concept:** vocabulary size is a real, painful hyperparameter; it shifts compute from the blocks to the boundary.
- **Beats slider:** the slider here moves a *real artifact* (the merge table) and the learner watches the same passage re-segment. The parameter-budget pie is the mathematical object; the slider is the named knob.
- **Prior art:** Hugging Face's tokenizer-comparison tables; this widget would be original.

**7. `controlPanelChallenge`**
- **Manipulates:** an end-of-module assessment widget. The learner is shown a short Shakespeare-style passage as a *target* style (e.g. heavy iambic, short lines) and must hit a "stylistic match score" target by adjusting (prompt prefix, τ, k, p, seed) only — weights frozen.
- **Live updates:** generated sample, computed stylometry score (line-length entropy + character-bigram KL to target), per-attempt history.
- **Concept:** prompt + sampler is the entire control surface of a frozen LM; "controlling the model" is parameter-free engineering.
- **Beats slider:** it has a *goal*. The learner is in dialogue with the artifact.
- **Prior art:** [openai-playground](https://platform.openai.com/playground) sampling controls; gamified versions in [LLM Arena](https://chat.lmsys.org/) but without the parameter exposure.

---

### 5. Key formulas

**Cross-entropy / NLL / perplexity**
- `\mathcal{L} = -\frac{1}{B T}\sum_{b=1}^{B}\sum_{t=1}^{T} \log p_\theta\!\left(y_{b,t}\mid x_{b,1{:}t}\right)`
- `\mathrm{NLL} = -\log p_\theta(y\mid x)`
- `\mathrm{PPL} = \exp(\mathcal{L})`
- `\mathcal{L}_{\text{uniform}} = \log |V|`

**Softmax with temperature**
- `\mathrm{softmax}_\tau(\ell)_i = \dfrac{\exp(\ell_i / \tau)}{\sum_{j=1}^{|V|} \exp(\ell_j / \tau)}`
- `\lim_{\tau \to 0^+}\ \mathrm{softmax}_\tau(\ell) = \mathbf{1}_{\arg\max \ell}`
- `\lim_{\tau \to \infty}\ \mathrm{softmax}_\tau(\ell) = \frac{1}{|V|}\mathbf{1}`

**Top-k filtering**
- `\ell'_i = \begin{cases} \ell_i & i \in \mathrm{TopK}(\ell, k) \\ -\infty & \text{otherwise}\end{cases}`
- `p_i = \mathrm{softmax}(\ell')_i`

**Top-p (nucleus) sampling**
- `\pi = \mathrm{argsort}_{\downarrow}(p),\quad C_j = \sum_{i=1}^{j} p_{\pi_i}`
- `n^* = \min\{\,j : C_j \geq p\,\}`
- `\tilde p_{\pi_i} = \begin{cases} p_{\pi_i}/C_{n^*} & i \leq n^* \\ 0 & i > n^* \end{cases}`

**BPE training step**
- `(a^*, b^*) = \arg\max_{(a,b) \in \mathcal{V}^2}\ \mathrm{count}\bigl((a,b);\ \text{corpus}\bigr)`
- `\mathcal{V} \leftarrow \mathcal{V} \cup \{a^* b^*\}`

**Data loader (sliding window)**
- `i \sim \mathrm{Uniform}\{0, \dots, N-T-1\}`
- `x = \mathrm{data}[i\,{:}\,i+T],\quad y = \mathrm{data}[i+1\,{:}\,i+T+1]`

**Training step**
- `\theta \leftarrow \mathrm{AdamW}(\theta,\ \nabla_\theta \mathcal{L},\ \mathrm{lr}_t,\ \beta_1, \beta_2, \lambda)`

**Gradient clipping (global L2)**
- `g \leftarrow g \cdot \min\!\left(1,\ \dfrac{c}{\lVert g \rVert_2}\right)`

**Linear-warmup + cosine LR schedule**
- `\mathrm{lr}_t = \begin{cases} \mathrm{lr}_{\max}\cdot t/W & t < W \\ \mathrm{lr}_{\min} + \tfrac{1}{2}(\mathrm{lr}_{\max}-\mathrm{lr}_{\min})\!\left[1+\cos\!\left(\pi\,\tfrac{t-W}{D-W}\right)\right] & W \leq t \leq D \\ \mathrm{lr}_{\min} & t > D \end{cases}`

**Autoregressive next token**
- `x_{T+1} \sim p_\theta(\cdot \mid x_{1:T})`
- `p_\theta(x_{1:T}) = \prod_{t=1}^{T} p_\theta(x_t \mid x_{<t})`

**KV-cache cost**
- `\mathrm{Cost}_{\text{no-cache}}(T) = \mathcal{O}(T^2)\quad,\quad \mathrm{Cost}_{\text{cache}}(T) = \mathcal{O}(T)`

---

### 6. Lesson decomposition

#### Lesson 17.1 — "Text becomes integers"
**Summary:** The model never sees characters; it sees ids. We meet character-level, word-level, and subword tokenization, and learn why each fails or wins at scale. **Estimated:** 18 min.
**Steps:**
1. Hook — paste "strawberry" into the live tokenizer; show 3 tokens. *(prose + `tokenInspector`)*
2. Definition — tokens, vocab, encode, decode. *(prose)*
3. Char-level tokenization on tiny-shakespeare: vocab=65, train=1{,}003{,}854 tokens, val=111{,}540. *(prose + `tokenInspector` set to `char-tiny`)*
4. **StepCheck:** "What is `vocab_size` for tiny-shakespeare-char?" Expected: **65**.
5. Costs of char-level: long sequences, every operation per character. *(prose with diagram)*
6. Word-level: vocab explosion, OOV. *(prose + `tokenInspector` set to a naive whitespace tokenizer)*
7. **StepCheck:** "If a word-level English tokenizer holds 500{,}000 entries and the embedding dim is 128 (float32 bytes), how many MB does the embedding table cost?" Expected: **256** (= 500000·128·4/10⁶).
8. The subword compromise — preview BPE. *(prose)*
9. Endgame callback line.

#### Lesson 17.2 — "How a tokenizer is built (BPE)"
**Summary:** BPE trains by greedy frequency merges; at inference it deterministically replays the merge list; byte-level BPE makes the tokenizer total. **Estimated:** 22 min.
**Steps:**
1. Problem framing — between chars and words. *(prose)*
2. The merge loop, step by step on the `hug/pug/pun/bun/hugs` corpus. *(prose + `bpeMergeStepper`)*
3. **StepCheck:** "After merge ① on the corpus above, what is the count of pair `(p, ug)`?" Expected: **5**.
4. Encoding new text with a saved merge list. *(prose + `bpeMergeStepper` in "encode" mode)*
5. **StepCheck:** "After two merges with that table, how many tokens does `'hugs'` produce?" Expected: **3**.
6. Bytes vs codepoints; UTF-8; why GPT-2 chose byte-level. *(prose with diagram)*
7. Total tokenizer = no UNK; emoji and Cyrillic just work. *(prose + `tokenInspector`)*
8. The tokenizer is a *frozen artifact* shipped with the model. *(prose)*
9. The "strawberry" failure as a *consequence*, not a bug. *(prose + `tokenInspector`)*
10. **StepCheck:** "GPT-2 byte-BPE base vocab size before any merges?" Expected: **256**.
11. Endgame callback line.

#### Lesson 17.3 — "Wrapping the training loop around the transformer"
**Summary:** From a long stream of token ids to a working data loader, batched NLL across all positions, and AdamW with warmup + cosine + grad-clip. **Estimated:** 22 min.
**Steps:**
1. Recap of m16 forward pass; we are wiring the *outside* of it. *(prose)*
2. The corpus as one long 1-D tensor of ids. *(prose with diagram)*
3. Train/val split by contiguous suffix. *(prose)*
4. **StepCheck:** "tiny-shakespeare-char has 1{,}115{,}394 chars; with a 90/10 split, how many *train* tokens?" Expected: **1003854** (or close: accept 1003855±1).
5. The shifted-by-one batch (Karpathy `get_batch`). *(prose with code; widget showing `x` and `y` row by row)*
6. Why loss is averaged over all `B·T` positions. *(prose)*
7. **StepCheck:** "If `B=64, T=64`, how many supervised next-token predictions per step?" Expected: **4096**.
8. The training loop: forward, loss, backward, step, zero_grad. *(prose + code)*
9. Gradient clipping at 1.0. *(prose)*
10. Linear warmup (100 iters) + cosine decay to `min_lr = lr/10`. *(prose with curve plot)*
11. **StepCheck:** "On tiny-shakespeare-char, what is the expected initial loss in nats? (uniform over vocab=65)" Expected: **4.17** (accept 4.1–4.2).
12. Run the live trainer. *(prose + `lossLandscapeRunner`)*
13. Endgame callback line.

#### Lesson 17.4 — "What the loss curve is telling you"
**Summary:** Loss has *shape*. Train vs val tells you when to stop; plateau values tell you whether to scale model, data, or both. **Estimated:** 12 min.
**Steps:**
1. The expected curve: 4.17 → ~1.7 by 500 iters → plateau ≈ 1.5. *(prose + `lossLandscapeRunner`)*
2. **StepCheck:** "If val NLL = 1.5, what is val perplexity to one decimal?" Expected: **4.5** (accept 4.4–4.5).
3. Overfitting on a shrunken corpus. *(prose + `lossLandscapeRunner` with `data subset = 1k`)*
4. The "loss is going down ergo it's working" trap. *(prose)*
5. **StepCheck:** "Train loss = 0.4, val loss = 2.1 — is the model healthy? (1 = yes, 0 = no)" Expected: **0**.
6. nanoGPT's "only save when val improves" idiom. *(prose with code snippet)*
7. Endgame callback line.

#### Lesson 17.5 — "Sampling: how distributions become text"
**Summary:** The autoregressive loop, why argmax fails, and the sampler pipeline (temperature → top-k → top-p) demystified as logit-space transforms. **Estimated:** 22 min.
**Steps:**
1. The autoregressive loop. *(prose + `autoregressiveStepper`)*
2. Greedy / argmax: live demo of "the the the the". *(prose + `autoregressiveStepper` with τ→0)*
3. **StepCheck:** "At τ → 0, top-k = ?" Expected: **1**.
4. Temperature as `logits / τ`. *(prose with E5 worked example)*
5. **StepCheck:** "Logits (2.0, 1.0, 0.0), τ = 1, p₁ to two decimals?" Expected: **0.67** (accept 0.66–0.67).
6. **StepCheck:** "Same logits, τ = 0.5, p₁ to two decimals?" Expected: **0.87**.
7. Top-k as `logit ← -∞`. *(prose + `samplerPlayground`)*
8. Top-p (nucleus) as cumulative-mass cutoff. *(prose + E6 worked example)*
9. **StepCheck:** "Sorted probs (0.5, 0.2, 0.15, 0.08, 0.05, 0.02), p = 0.9 — nucleus size?" Expected: **4**.
10. Pipeline order: temperature → top-k → top-p → sample. *(prose + `samplerPlayground`)*
11. Beam search and why we don't use it for open-ended LM. *(prose; cite Holtzman degeneration)*
12. KV cache callback to m15. *(prose + `autoregressiveStepper` with cache toggle)*
13. **StepCheck:** "Without a KV cache, generating T tokens has compute complexity O(T^?)." Expected: **2**.
14. Seeds, determinism, and prompt+sampler as the entire control surface. *(prose + `controlPanelChallenge`)*
15. Endgame callback line.

---

### 7. Problem bank

1. **(novice / computation / `m17-loss-everywhere`, `m17-loss-trajectory`)** Tiny-shakespeare has $|V|=65$. Compute the expected initial cross-entropy loss in nats for a uniformly initialized model. **Answer:** $\ln 65 \approx 4.174$.
2. **(novice / computation / `m17-vocab-size-tradeoff`)** A character tokenizer has $|V|=65$ and $d_{\text{model}}=128$. How many parameters does the embedding table contain? **Answer:** $65 \times 128 = 8320$.
3. **(novice / computation / `m17-data-loader`)** `B=64, T=64` per step; how many supervised next-token predictions per gradient update? **Answer:** $4096$.
4. **(novice / computation / `m17-temperature`)** Logits $(2,\,1,\,0)$, $\tau=1$. Give $p_1$ to 3 decimals. **Answer:** $0.665$.
5. **(novice / interpretation / `m17-tok-failure-modes`)** GPT-4's tokenizer breaks `"strawberry"` into `["st","raw","berry"]`. In one sentence, why can the model nevertheless miscount the R's? **Answer:** It only sees three integer ids; it has no built-in operation that accesses the characters inside a token, so "count the R's" is off-distribution.
6. **(novice / computation / `m17-loss-trajectory`)** If validation NLL = 1.5 nats, what is perplexity? **Answer:** $e^{1.5} \approx 4.48$.
7. **(intermediate / computation / `m17-bpe-train`)** Corpus: `hug:10, pug:5, pun:12, bun:4, hugs:5`. Compute the count of pair `(u,n)` after merge $(u,g)\to ug$. **Answer:** $16$ (12 from `pun` + 4 from `bun`).
8. **(intermediate / construction / `m17-bpe-encode`)** Given merge list $[(u,g)\to ug,\ (u,n)\to un,\ (h,ug)\to hug]$ in that order, tokenize `"hugs"`. **Answer:** $[hug,\,s]$.
9. **(intermediate / computation / `m17-temperature`)** Logits $(2,\,1,\,0)$, $\tau=0.5$. Give $p_1$ to 3 decimals. **Answer:** $0.867$.
10. **(intermediate / computation / `m17-top-p`)** Sorted probs $(0.50, 0.20, 0.15, 0.08, 0.05, 0.02)$, $p=0.9$. Identify the nucleus size and renormalized $p_1$ to 3 decimals. **Answer:** size = $4$; renormalized $p_1 = 0.50/0.93 \approx 0.538$.
11. **(intermediate / computation / `m17-train-val-split`)** Tiny-shakespeare-char has 1{,}115{,}394 chars, split 90/10. How many val tokens (rounded to nearest int)? **Answer:** $111{,}539$ (accept 111{,}540 per nanoGPT default).
12. **(intermediate / interpretation / `m17-overfit-signal`)** Train loss at iter 5000 is 0.45; val loss is 2.30. Should you ship this checkpoint? Justify in one sentence. **Answer:** No — val loss is more than 5× train loss, indicating severe overfitting; the best checkpoint is whichever earlier iter had the lowest val loss.
13. **(intermediate / construction / `m17-train-loop`)** Write the four-line PyTorch inner training step (forward, loss, backward, step, zero_grad). **Answer:** `logits, loss = model(x, y); optimizer.zero_grad(set_to_none=True); loss.backward(); optimizer.step()` (with optional `clip_grad_norm_` between backward and step).
14. **(intermediate / debugging / `m17-loss-everywhere`)** A learner reports iter-0 train loss = 11.2 on tiny-shakespeare-char (vocab 65). Diagnose. **Answer:** $\ln 65 \approx 4.17$; loss of 11.2 means the output distribution is far from uniform, almost certainly the wrong vocab size is being used (e.g. they kept GPT-2's 50257) or labels are misaligned.
15. **(intermediate / interpretation / `m17-greedy-fail`, `m17-beam-search-not`)** Why does beam search work for English→French but produce repetitive Shakespeare? **Answer:** In translation the source constrains the target distribution sharply, so the joint maximum-likelihood path is genuinely good; in open-ended generation the joint MLE concentrates on degenerate, repetitive cycles (Holtzman et al.), so beam search systematically picks bad paths.
16. **(intermediate / computation / `m17-kv-cache-callback`)** Generating 64 new tokens with a model of context 64 and head dim 32; estimate the speedup factor of KV-cached vs uncached attention's *quadratic-in-T* term. **Answer:** Roughly $T/2 = 32\times$ in the dominant attention recompute term (formal answer: $\mathcal{O}(T^2)\to \mathcal{O}(T)$).
17. **(advanced / construction / `m17-sampler-pipeline`)** Implement `sample_next(logits, tau, k, p)` in pseudocode using the conventional pipeline order. **Answer:** `l = logits / tau; if k: keep top-k indices, others ← -∞; if p: sort, find smallest prefix with cumsum(softmax(l)) ≥ p, others ← -∞; return categorical(softmax(l)).sample()`.
18. **(advanced / proof-scaffold / `m17-temperature`)** Show that as $\tau \to 0^+$, $\mathrm{softmax}_\tau(\ell)$ converges to a one-hot at $\arg\max_i \ell_i$ (assume the argmax is unique). **Answer:** Let $i^* = \arg\max \ell_i$ and $\Delta_j = \ell_{i^*}-\ell_j > 0$ for $j\neq i^*$. Then $p_{i^*} = 1/(1+\sum_{j\neq i^*}e^{-\Delta_j/\tau})$; as $\tau \to 0^+$ each $e^{-\Delta_j/\tau}\to 0$, so $p_{i^*}\to 1$ and $p_j \to 0$.
19. **(advanced / construction / `m17-vocab-size-tradeoff`)** A char model uses $|V|=65, T=512$; a byte-BPE model uses $|V|=8192, T=128$. Both target $d_{\text{model}}=128$. Compare embedding+unembedding parameter counts (assume tied) and total tokens-per-batch at $B=64$. **Answer:** Char: $65\times 128 = 8320$ params, $64\times 512 = 32768$ tokens/batch. BPE: $8192\times 128 = 1{,}048{,}576$ params, $64\times 128 = 8192$ tokens/batch. Trade: BPE has ~126× more boundary parameters but ~4× shorter sequences (cheaper attention, $\propto T^2$ ⇒ ~16× cheaper attention).
20. **(advanced / debugging / `m17-loss-trajectory`, `m17-warmup-cosine`)** A learner's val loss spikes from 1.6 to 2.4 at iter 100, then settles to 1.5 by iter 500. Is anything wrong? **Answer:** No — iter 100 is the end of warmup; effective LR has just reached its peak and the cosine decay has not yet begun. A transient bump there is expected, especially at small batch sizes; only worry if the spike persists past ~25% of `lr_decay_iters`.

---

### 8. Endgame callback — refined

The starter is solid but slightly long. Three sharper candidates:

1. **"Bytes become vectors. Vectors become loss. Loss becomes weights. Weights become bytes again. Next module: you run the loop."**
2. **"Tokenization is the encoder. Training is the editor. Sampling is the decoder. Next module: you run all three in your browser."**
3. **(recommended)** **"A tokenizer makes text countable. A loop makes a model learnable. A sampler makes a model talk. Next module: do it for real."**

We recommend **option 3**: it pattern-matches the module title's three-act structure, ends on action, and avoids "vectors" framing that some readers will conflate with embeddings.

---

### 9. Sources (licensing-aware)

1. **Karpathy — `nanoGPT` repository** — https://github.com/karpathy/nanoGPT — *code repo* — **MIT** (verified `LICENSE` file). **[ADAPT]**. Use for: the canonical training loop, `get_batch`, `generate(idx, temperature, top_k)`, and the `train_shakespeare_char.py` config (6 layers, 6 heads, 384 embd, lr=1e-3, warmup=100, dropout=0.2, 5000 iters, val ≈ 1.47). Worked-example source for E4, E7, the lesson 17.3 code, and the live `lossLandscapeRunner` widget.

2. **Karpathy — `minbpe` repository** — https://github.com/karpathy/minbpe — *code repo* — **MIT** (verified). **[ADAPT]**. Use for: a clean reference implementation of byte-level BPE training and encoding to back the `bpeMergeStepper` widget. Karpathy's `lecture.md` is also in this repo and is usable for adaptation under MIT.

3. **Karpathy — "Let's build the GPT Tokenizer" video** — https://www.youtube.com/watch?v=zduSFxRajkE — *video* — **YouTube ToS, copyrighted**. **[REFERENCE-ONLY]**. Use for: pedagogical structure of Lesson 17.2, the exact ordering of unicode → utf-8 → BPE → byte-BPE, and the "strawberry" framing.

4. **Hugging Face — NLP Course Chapter 6 ("Byte-Pair Encoding tokenization")** — https://huggingface.co/learn/llm-course/chapter6/5 — *interactive textbook* — **Apache 2.0** (verified — the HF course is Apache-licensed). **[ADAPT]**. Use for: the canonical `hug/pug/pun/bun/hugs` worked example (E1, E8), the exact merge counts, and the BPE-vs-WordPiece-vs-Unigram comparison framing.

5. **Polo Club of Data Science (Cho, Kim, Karpekov, et al.) — Transformer Explainer** — https://poloclub.github.io/transformer-explainer/ and source https://github.com/poloclub/transformer-explainer — *interactive widget + IEEE VIS 2024 poster* — **MIT** (verified). **[ADAPT]**. Use for: the live in-browser GPT-2, the temperature slider design, and the explicit framing ("temperature is not a 'creativity' control"). The arXiv paper is at https://arxiv.org/abs/2408.04619 — reference-only.

6. **Holtzman, Buys, Du, Forbes, Choi (2020) — "The Curious Case of Neural Text Degeneration"** — https://arxiv.org/abs/1904.09751 — *paper* — **arXiv (default arXiv non-exclusive license — not CC)**. **[REFERENCE-ONLY]**. Use for: the empirical justification of nucleus sampling, the "beam search degenerates on open-ended LMs" finding cited in Lesson 17.5, and the figure showing human vs model probability tails.

7. **Sennrich, Haddow, Birch (2016) — "Neural Machine Translation of Rare Words with Subword Units"** — https://aclanthology.org/P16-1162/ — *paper* — **ACL Anthology / arXiv (default; not CC-BY in general)**. **[REFERENCE-ONLY]**. Use for: the original BPE-for-NLP citation in Lesson 17.2 prose; do not reproduce figures.

8. **Radford, Wu, Child, Luan, Amodei, Sutskever (2019) — "Language Models are Unsupervised Multitask Learners" (GPT-2 paper)** — https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf — *paper* — **OpenAI distribution; not CC**. **[REFERENCE-ONLY]**. Use for: byte-level BPE motivation (the "no UNK, total tokenizer, every Unicode string representable" framing) and the 50{,}257 vocab-size figure.

9. **OpenAI — `tiktoken` library** — https://github.com/openai/tiktoken — *code* — **MIT** (verified). **[ADAPT]**. Use for: the GPT-2/GPT-4 tokenizer behavior in the `tokenInspector` widget; can be loaded as WASM in the browser via the `tiktoken` npm package — perfect for our Astro+Svelte stack.

10. **dqbd — Tiktokenizer** — https://tiktokenizer.vercel.app — *web demo* — source at https://github.com/dqbd/tiktokenizer is **MIT**. **[REFERENCE-ONLY for the deployed UI; ADAPT components from the source repo as needed]**. Use as direct prior art for the `tokenInspector` widget and as the canonical demo learners are linked to in Lesson 17.1's hook.

11. **Karpathy — `tiny_shakespeare` dataset (`input.txt`)** — https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt — *data* — Karpathy's `char-rnn` repo is **MIT**; the underlying text is **public-domain Shakespeare**. **[ADAPT]**. Use for: training corpus shipped with the capstone; 1{,}115{,}394 chars, vocab=65, train/val=1003854/111540 by nanoGPT's split.

12. **Wikipedia — "Byte-pair encoding"** — https://en.wikipedia.org/wiki/Byte-pair_encoding — *encyclopedia* — **CC BY-SA**. **[REFERENCE-ONLY]**. Use for: historical facts (Gage 1994), the original compression-algorithm framing.

---

### 10. Pedagogical traps

1. **Trap: "Tokenization is preprocessing, just skip it."**
*Why it happens:* Self-learners come from web/data engineering where preprocessing is boilerplate; they want to "get to the model." But tokenization shapes every downstream behavior — the strawberry failure, multi-digit math weakness, GPT-2's leading-space tokens, "SolidGoldMagikarp" — are all tokenizer artifacts.
*Mitigation:* Open Lesson 17.1 with a *concrete*, *user-typed* failure (the `tokenInspector` paste-in). Make the strawberry failure the first interactive moment of the module, not a footnote in Lesson 17.2.

2. **Trap: "Train loss going down means it's working."**
*Why it happens:* Engineers trust monotone curves; they trust progress bars. Tiny corpora overfit silently — train loss can go to zero while val loss explodes.
*Mitigation:* Every loss plot in Lessons 17.3 and 17.4 is dual-curve from iter 0 — there is no single-curve mode. The first `lossLandscapeRunner` exercise *forces* the learner to shrink the corpus to 1k chars and observe the divergence themselves. Add a StepCheck (problem 12 / Lesson 17.4 step 5) where a clearly-overfit run is presented and the learner must answer "ship: yes/no."

3. **Trap: "Temperature is the creativity knob."**
*Why it happens:* OpenAI/Anthropic API documentation describes it this way; it's the dominant cultural framing. But this anthropomorphizes a logit transform and obscures why $\tau$ alone is not enough (the tail still gets sampled), why $\tau{+}p$ is needed, and why $\tau{=}0$ is not "no creativity" but rather "deterministic = repetitive."
*Mitigation:* Always introduce $\tau$ as `logits / τ` *before* discussing its qualitative effect. The `samplerPlayground` widget shows the bar chart transforming under each pipeline stage so the learner sees three distinct distributions (raw → temp-scaled → truncated). Cite Polo Club's explicit anti-anthropomorphism framing. Add Problem 5 (interpretation, strawberry) and Problem 18 (proof scaffold, $\tau \to 0$) to lock the intuition mathematically.

4. **Trap: "More vocab = more powerful."**
*Why it happens:* Generic "bigger model is better" pattern matching. But vocab is paid in embedding+unembedding parameters and in slower softmax, while the gain (shorter sequences) saturates after $\sim$8k–32k for English.
*Mitigation:* Problem 19 forces the parameter-budget computation directly. The optional `vocabSizeTradeoff` widget makes it visible. In prose, frame `|V|` as a *budget split*, not a quality dial.

5. **Trap: "The training loop is the model."**
*Why it happens:* Karpathy's videos are so canonical that learners mentally fuse `train.py` with the architecture. Then they can't transfer to inference (which has no loss, no optimizer, no batch dimension) and they don't see why KV cache only helps generation.
*Mitigation:* Lesson 17.3 explicitly frames the loop as "wrapping the m16 forward pass." Lesson 17.5 explicitly frames sampling as "the same forward pass, no loss, output one token, append, repeat." The KV-cache callback in Lesson 17.5 step 12 must reference m15 by name to anchor the connection.

6. **Trap: "Sampling parameters are independent knobs."**
*Why it happens:* They're presented in API docs as separate fields; each looks like a slider. But $\tau$ changes the distribution top-k and top-p truncate, so naive combinations interact. Worse, learners try $\tau{=}0$ + $k{=}50$ and wonder why diversity didn't return.
*Mitigation:* The `samplerPlayground` widget shows the *ordered pipeline* — bar chart at each stage — and disables impossible combinations gracefully (e.g. $\tau \to 0$ collapses everything before truncation runs). Problem 17 forces the learner to write the pipeline in the conventional order. The prose in Lesson 17.5 step 10 is unambiguous: temperature → top-k → top-p → sample, every time.
