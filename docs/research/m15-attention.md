# Module 15 Research Brief — Attention

### 1. Concept dependency graph

Topologically sorted; each entry: `concept-id` — definition — prerequisites.

1. `weighted-average-as-aggregator` — A weighted sum ∑ wᵢvᵢ where weights wᵢ form a probability distribution over a set of value vectors. — m02-linear-algebra (dot product, sum), m04-softmax.
1. `soft-dictionary-lookup` — A differentiable analog of a hash-table lookup: instead of an exact match returning one entry, every entry is returned with a weight that depends on similarity. — `weighted-average-as-aggregator`.
1. `query-key-value-roles` — Three role labels for the same row of a sequence: the query asks, the key advertises, the value carries content. — `soft-dictionary-lookup`, m14-sequence-modeling.
1. `dot-product-as-similarity` — A real number whose magnitude grows when two vectors point in the same direction in ℝᵈ; used as the unnormalized score between a query and a key. — m02-linear-algebra.
1. `unscaled-attention-score` — sᵢⱼ = qᵢ·kⱼ; raw similarity logit before softmax. — `dot-product-as-similarity`, `query-key-value-roles`.
1. `softmax-saturation-problem` — When a softmax input vector has large magnitude its output collapses to a one-hot, killing gradients. — m04-softmax, m13-training-dynamics.
1. `1-over-sqrt-dk-scale` — Dividing scores by √dₖ keeps the variance of qᵢ·kⱼ at O(1) for unit-variance Q, K, preventing softmax saturation. — `unscaled-attention-score`, `softmax-saturation-problem`.
1. `attention-weights-row` — αᵢ = softmax_j(sᵢⱼ/√dₖ); a probability distribution over time steps for query i. — `1-over-sqrt-dk-scale`, m04-softmax.
1. `single-head-attention-output` — oᵢ = ∑ⱼ αᵢⱼ vⱼ; a context-mixed vector for position i. — `attention-weights-row`, `weighted-average-as-aggregator`.
1. `learned-projections-WqWkWv` — Three independent linear layers that map an input row x ∈ ℝᵈ into qᵢ, kᵢ, vᵢ in their own subspaces. — m11-mlp-forward, `query-key-value-roles`.
1. `self-attention` — Attention where Q, K, V are all linear projections of the same sequence X. — `learned-projections-WqWkWv`, `single-head-attention-output`.
1. `cross-attention` — Attention where Q comes from one sequence and K, V come from another (canonical example: decoder attending to encoder). — `self-attention`.
1. `attention-formula-matrix-form` — Attention(Q,K,V) = softmax(QKᵀ/√dₖ + M) V, the packed-batch form. — `self-attention`, m02-linear-algebra (matmul).
1. `shape-calculus-attention` — The shape passport: X (T,d) → Q,K,V (T,dₖ); QKᵀ (T,T); softmax over last axis; output (T,dᵥ). — `attention-formula-matrix-form`.
1. `permutation-equivariance` — A function f satisfies f(PX) = P f(X) for any permutation P; raw self-attention has this property over the time axis. — `self-attention`.
1. `positional-encoding-need` — Because self-attention is permutation-equivariant, sequence order must be injected into the input or into the QK product. — `permutation-equivariance`.
1. `sinusoidal-pe` — A fixed map pos → vector of sines and cosines at geometrically spaced wavelengths, added to token embeddings. — `positional-encoding-need`, m02-linear-algebra.
1. `learned-absolute-pe` — A learned lookup table with one row per position, added to token embeddings (used by GPT-2/3). — `positional-encoding-need`, m14-sequence-modeling (embedding lookup).
1. `rope-rotary-pe` — Rotates each pair of dimensions of qᵢ and kⱼ by an angle proportional to position; the dot product then depends only on (i−j). — `positional-encoding-need`, m02-linear-algebra (2D rotation).
1. `causal-mask` — An upper-triangular matrix M with 0 on/below the diagonal and −∞ above, added to scores so future positions get zero weight. — `attention-formula-matrix-form`, m14-sequence-modeling (autoregressive factorization).
1. `multi-head-split` — Reshape (T, d) into (T, h, d/h) so h independent attention computations run in parallel, each in its own dₖ/h subspace. — `self-attention`, `shape-calculus-attention`.
1. `multi-head-concat-and-Wo` — Concatenate the h head outputs along the feature axis and apply a learned W_O ∈ ℝᵈˣᵈ projection. — `multi-head-split`.
1. `attention-quadratic-complexity` — The QKᵀ step is O(T²·dₖ) FLOPs and O(T²) memory; this is the cost that defines modern LLM economics. — `attention-formula-matrix-form`.
1. `kv-cache` — During autoregressive decoding, the K and V tensors for past tokens are stored and reused so each new token costs O(T·d) instead of O(T²·d). — `causal-mask`, `attention-quadratic-complexity`.
1. `attention-not-explanation` — Empirically, attention weights are not faithful feature-importance scores; alternative weight distributions can give the same predictions. — `attention-weights-row`.

-----

### 2. Canonical worked examples

These are the examples that appear, in some form, in nearly every credible source on attention. Each is calibrated for the lesson.

**Example 1 — Hand-compute single-head self-attention on a 3-token, dₖ=2 sequence.**
Problem: Given $Q=K=V=\begin{bmatrix}1&0\\0&1\\1&1\end{bmatrix}$ with $d_k=2$, compute $\text{Attention}(Q,K,V)=\text{softmax}(QK^\top/\sqrt{d_k})V$ row by row.
Solution: $QK^\top=\begin{bmatrix}1&0&1\\0&1&1\\1&1&2\end{bmatrix}$, divide by $\sqrt{2}\approx 1.414$ to get scores $\begin{bmatrix}.707&0&.707\\0&.707&.707\\.707&.707&1.414\end{bmatrix}$; softmax each row, then multiply by $V$.
Pedagogical point: the output of attention is *another* sequence of vectors of the same length T, not a scalar; every token gets re-mixed.
Most common student mistake: applying softmax over the wrong axis (column instead of row) and getting an output that doesn't sum to a probability per query.

**Example 2 — Why √dₖ? Variance argument with random Q, K.**
Problem: Let $q,k\in\mathbb{R}^{d_k}$ have i.i.d. components with mean 0 and variance 1. Compute $\mathbb{E}[q\cdot k]$ and $\operatorname{Var}(q\cdot k)$. Then explain what happens to the softmax of T such scores when $d_k=512$ vs. $d_k=2$.
Solution: $\mathbb{E}[q\cdot k]=0$, $\operatorname{Var}(q\cdot k)=d_k$. Standard deviation grows like $\sqrt{d_k}$. Without the $1/\sqrt{d_k}$ factor, scores have stdev ≈ 22 at $d_k=512$, the softmax becomes nearly one-hot, and gradients through positions other than the argmax vanish.
Pedagogical point: the scale is not aesthetic; it is a softmax-saturation patch.
Most common student mistake: treating "scale by $\sqrt{d_k}$" as a hyperparameter that could just as well be 1.

**Example 3 — Causal mask via tril & −∞ on T=4.**
Problem: Given raw scores $S\in\mathbb{R}^{4\times 4}$, construct the causal mask $M$ and produce the row-stochastic post-softmax pattern.
Solution: $M_{ij}=0$ if $j\le i$, $-\infty$ otherwise. After softmax of $S+M$, row 0 is $[1,0,0,0]$; row 1 is a 2-element distribution over positions 0,1; row 2 is over 0,1,2; row 3 is full. Resulting matrix is lower-triangular and each row sums to 1.
Pedagogical point: the mask lives in score-space, not in the data; the same Q,K,V trains both as a bidirectional encoder and as a causal decoder by toggling the mask.
Most common student mistake: zeroing the *attention weights* (post-softmax) instead of the *scores* (pre-softmax), which leaves rows that don't sum to 1.

**Example 4 — Karpathy's "averaging past tokens" arrived at by matmul with a triangular mask.**
Problem: Show that taking, for each row i, the mean of rows 0..i of $X$ is exactly $W X$ where $W$ is a row-normalized lower-triangular matrix of ones. Then show how setting $W=\text{softmax}(\text{tril mask of zeros})$ recovers the same uniform-attention baseline.
Solution: $W_{ij}=1/(i+1)$ for $j\le i$, else 0; uniform softmax over $i+1$ items gives the same distribution. This is the bridge from "average everything in the past" to learned attention.
Pedagogical point: causal self-attention is a *learned* generalization of cumulative averaging — a structurally innocuous baseline.
Most common student mistake: thinking the bridge requires a different operation; it doesn't, just a different choice of $W$.

**Example 5 — The "it" coreference example (Illustrated Transformer / 3B1B).**
Problem: For the sentence "The animal didn't cross the street because **it** was too tired", explain qualitatively (no numbers required) what query, key, and value vectors at the position of "it" should look like so that the attention head transports a piece of "animal"'s value into "it"'s output.
Solution: query of "it" is "what entity does this pronoun refer to?"; key of "animal" is "I am an animate noun, plausible antecedent"; their dot product is large; the value of "animal" carries the entity-features that "it" needs in order to be processed correctly downstream.
Pedagogical point: attention is broadcast/match/pull, not a magic spotlight.
Most common student mistake: conflating "meaning of the word" with the value vector and forgetting that the *same* token has separate q, k, v projections.

**Example 6 — Multi-head as parallel subspace specialization.**
Problem: With $d_{\text{model}}=8$, $h=2$, $d_k=d_v=4$ per head, write the shape passport: input $X\in\mathbb{R}^{T\times 8}$ → per-head $Q^{(j)},K^{(j)},V^{(j)}\in\mathbb{R}^{T\times 4}$ → per-head output $\in\mathbb{R}^{T\times 4}$ → concat $\in\mathbb{R}^{T\times 8}$ → $W_O$ → output $\in\mathbb{R}^{T\times 8}$. Count parameters and FLOPs vs. a single $d_k=8$ head.
Solution: Per-head W_q is $8\times 4$; total Q-params = $h\cdot 8\cdot 4 = 64 = 8\cdot 8$. Total compute is the same as one big head, but each head has its own subspace and its own attention pattern.
Pedagogical point: multi-head is *wider in parallel*, not *deeper*. Same params, same FLOPs as one head; gain is structural diversity.
Most common student mistake: assuming multi-head means stacking attention layers (it doesn't — that's depth, which comes in m16).

**Example 7 — KV-cache savings on autoregressive generation.**
Problem: A decoder generates T=1024 tokens one at a time. Without a KV-cache, what is the total attention compute? With a KV-cache?
Solution: Without cache, step t recomputes K and V for tokens 0..t-1 (cost ∝ t·d) and attention (cost ∝ t·dₖ); total ≈ ∑t² ∝ T³. With cache, step t reuses past K,V; new work is just one new (K,V) row plus attention against t cached keys ∝ t·dₖ; total ≈ ∑t ∝ T². Savings: a factor of ~T.
Pedagogical point: KV-cache trades memory (storing 2·N·T·d floats per layer) for compute; it is what makes ChatGPT-style streaming feasible.
Most common student mistake: thinking the cache stores the queries too. Queries are recomputed every step because only the *new* token issues a query.

**Example 8 — Sinusoidal PE: why "you can read off relative position".**
Problem: Show that for sinusoidal PE, $\text{PE}_{\text{pos}+k}$ is a *linear function* of $\text{PE}_{\text{pos}}$ for any fixed offset $k$.
Solution: For each frequency band $\omega_i=10000^{-2i/d}$, the pair $(\sin(\omega_i\,\text{pos}),\cos(\omega_i\,\text{pos}))$ is a 2D rotation; advancing pos by $k$ is left-multiplication by $R(\omega_i k)$. So PE encodes position in a way that the model can convert to relative position via a fixed linear map.
Pedagogical point: the 10000-wavelength choice was not arbitrary — it gives a multi-scale clock that the attention head can use as a relative-position feature.
Most common student mistake: trying to read meaning out of individual PE entries instead of the *pairs* that form a 2D rotation.

**Example 9 — RoPE: rotate Q and K, not the embeddings.**
Problem: Given a 2D query $q_m=(a,b)$ at position $m$ and a key $k_n=(c,d)$ at position $n$, compute the dot product after applying rotations $R(\theta m)$ and $R(\theta n)$.
Solution: $(R_\theta^m q)\cdot(R_\theta^n k)=q^\top R_\theta^{n-m} k$, which depends only on $n-m$. RoPE generalizes this to all dimension pairs at geometrically spaced frequencies.
Pedagogical point: position lives inside the *similarity score*, not in the embedding sum; absolute positions are encoded but only their *difference* survives the dot product.
Most common student mistake: thinking RoPE is added to the embedding like sinusoidal PE; it is *applied* to q and k inside attention.

**Example 10 — Permutation-equivariance counterexample.**
Problem: Take a length-3 sequence $X=[x_1,x_2,x_3]$ and compute self-attention output $Y$. Now permute to $X'=[x_3,x_1,x_2]$ and compute $Y'$. Show $Y'$ is just $Y$ permuted the same way (no positional encoding present).
Solution: All Q, K, V are row-wise functions of X; QKᵀ undergoes the same row+column permutation; softmax is row-wise; so $Y$ is permuted exactly as $X$ was. Hence "attention has no notion of space, operates over sets" (Karpathy).
Pedagogical point: this is not a bug to patch later; it is *the* reason we need positional encodings.
Most common student mistake: assuming the model "sees" order because the input is a list in a particular order; without PE, the attention layer cannot tell.

-----

### 3. Common misconceptions

1. **"Q, K, V are three different things in the input."** Why natural: the database analogy reads as if you had three separate inputs. Counterexample/reframe: in self-attention, Q, K, V are *three projections of the same X*; show pseudocode `qkv = Linear(d, 3*d)(x); q,k,v = qkv.split(d, dim=-1)` (the canonical nanoGPT pattern). The lesson should *never* introduce QKV before the projection step, or this misconception is guaranteed.
1. **"Attention is a learned alignment, like in seq2seq with RNNs."** Why natural: Bahdanau-style attention was the historical entry point; many introductions still teach it first. Reframe: that was *cross*-attention with one query (decoder state) and many keys (encoder hidden states), used to fix an RNN bottleneck. Modern self-attention has T queries, T keys, no RNN, and is *what does the actual modeling*, not a side-channel patch. Visualization: side-by-side animation of "Bahdanau alignment over an RNN" vs. "T×T self-attention pattern with no RNN".
1. **"The 1/√dₖ is just a normalization convention."** Why natural: it looks like the kind of magic constant you ignore. Counterexample: simulate attention scores at $d_k=2$ vs. $d_k=512$ with random unit-variance Q, K; with no scaling the latter saturates softmax to one-hot and gradient w.r.t. all but one position is zero. The widget `softmaxSatExplorer` (see §4) is the kill shot.
1. **"Multi-head means deeper / more layers."** Why natural: "multiple" sounds like stacking. Reframe: heads run *in parallel* at the same depth; total compute and parameters are the same as one big head, but the model gets several independent attention patterns. The pedagogical visualization is the shape passport from Example 6 plus a side-by-side rendering of two heads' attention matrices on the same input — they look different.
1. **"Causal masking happens in the data (you delete the future)."** Why natural: "don't peek at the future" sounds like a data-side rule. Counterexample: show that during training, the model receives the *entire* T-length sequence in one forward pass; the future is hidden inside the score matrix by adding −∞ to the upper triangle, so each row of the softmax becomes a distribution over only past+present positions. This is also why training is parallel over T while inference is sequential.
1. **"Positional encodings are added because order is a feature."** Why natural: order obviously is a feature, so the move feels self-explanatory. Reframe: order isn't the *reason* — it's that the attention operation as written is permutation-equivariant; without PE the model literally cannot distinguish "dog bites man" from "man bites dog". Demonstrate with the swap-tokens widget.
1. **"Attention weights are interpretable as importance / explanations."** Why natural: heatmaps look interpretable, and many product UIs (BertViz screenshots in news articles) suggest this. Counterexample: cite Jain & Wallace 2019 — adversarially altered attention weights can yield the same prediction, and attention weights are frequently uncorrelated with gradient-based feature importance. Honest framing per Wiegreffe & Pinter 2019: attention is a useful diagnostic but not a faithful explanation.
1. **"Cross-attention and self-attention are different mechanisms."** Why natural: encoder-decoder diagrams distinguish them visually. Reframe: same operation, different argument bindings. Self-attention: Q=K=V from the same sequence. Cross-attention: Q from sequence A, K and V from sequence B. *One implementation, two call patterns.*
1. **"The softmax is over the feature axis."** Why natural: softmax is most often introduced as the classifier head. Reframe: in attention, softmax is over the *time/key axis* — for query i it normalizes scores across positions j. Show the shape: $(T,T)$ → softmax along $\dim=-1$ → each row sums to 1.
1. **"KV-cache also stores queries."** Why natural: Q, K, V always travel together. Reframe: at inference, only the *new* token issues a query; all past tokens have already been "spoken to" and don't need to query anything. So we cache only K and V — the broadcast and the payload — not Q.
1. **"Position encodings matter only for the input."** Why natural: "added once at the bottom" is how sinusoidal PE is usually drawn. Reframe (especially for RoPE/ALiBi): position information has to *survive* through the attention dot product. RoPE injects it inside every layer. The lesson should distinguish "embedding-additive" from "score-acting" PEs.
1. **"Attention is O(N) because softmax is fast."** Why natural: people remember the softmax cost without remembering the QKᵀ shape. Reframe: the bottleneck is QKᵀ, which produces a T×T matrix; that's O(T²·dₖ) FLOPs and O(T²) memory regardless of softmax. This is *the* reason context windows are expensive.

-----

### 4. Interactive widget suggestions

Each widget grabs a *named* mathematical object the lesson has already introduced; sliders on opaque numbers are explicitly avoided.

**Widget 1 — `qkVectorPlayground`**

- User manipulates: drag the tips of three named 2-D vectors q, k₁, k₂ on a Mafs plane.
- Live updates: scalar dot products q·k₁, q·k₂; the 2-element softmax(q·k/√dₖ); a horizontal "weight bar" showing the resulting attention weights; an output vector o = α₁v₁+α₂v₂ rendered as a third arrow.
- Concept made tangible: *attention weights are softmaxed inner products of vectors you can see*; rotating q toward k₁ shifts mass to position 1 in real time.
- Why it beats a slider: the user is directly manipulating the named objects q and k, not a slider labeled "attention to position 1".
- Prior art: BertViz "neuron view" by Jesse Vig (https://github.com/jessevig/bertviz) shows q, k components but is read-only; Tensor2Tensor's attention-viz; 3Blue1Brown's "attention pattern" visualization (https://www.3blue1brown.com/lessons/attention/).

**Widget 2 — `softmaxSatExplorer`**

- User manipulates: a slider over the *named* parameter $d_k$ (1 → 512), and a "scale on/off" toggle for the $1/\sqrt{d_k}$ factor; or alternatively grabs the q vector and stretches its length.
- Live updates: histogram of $T=8$ scores sampled from $\mathcal N(0, d_k)$; the softmax distribution rendered as bars; a meter showing entropy of the distribution; a "gradient survival" indicator (∂loss/∂score for non-argmax positions).
- Concept made tangible: as $d_k$ grows, the softmax collapses to one-hot and gradients to other positions die — *unless* the scale is on, in which case the distribution stays diffuse.
- Why it beats a slider on an unlabeled number: the slider is labeled with a quantity (dₖ) the lesson named; outputs are entropy and a gradient-survival readout the lesson defined.
- Prior art: 3B1B's softmax temperature animation; Lilian Weng's blog illustration of saturated softmax. We are not aware of an interactive version specifically for this argument; this is a candidate original widget.

**Widget 3 — `attentionMatrixHeatmap`**

- User manipulates: click any cell (i,j) in a T×T heatmap of attention weights to "lock" it and see what it depends on; drag a token in the input row to swap two tokens (firing the permutation-equivariance demonstration); toggle the causal mask.
- Live updates: highlighted row sums to 1, becomes a horizontal weight strip; output sequence Y updates; the "before mask / after mask" dual view shows how −∞ in the upper triangle becomes 0 after softmax.
- Concept made tangible: the attention matrix *is* the model's per-step routing; the mask is an additive change in score space.
- Why it beats a slider: the user is manipulating the matrix M and the input X — both already named.
- Prior art: BertViz "head view" and "model view" (https://github.com/jessevig/bertviz); Transformer Explainer by Polo Club at Georgia Tech (https://poloclub.github.io/transformer-explainer/).

**Widget 4 — `permutationEquivarianceLab`**

- User manipulates: drag-to-reorder tokens in a 4-token input X (a tiny "abcd" character string); toggle "positional encoding ON/OFF".
- Live updates: side-by-side rendering of attention output Y and Y' under the new ordering; a Boolean "Y' = permute(Y)?" indicator; with PE off, indicator stays green for every permutation; with PE on, it turns red.
- Concept made tangible: the operation literally cannot tell ordering apart without PE — and adding PE breaks the symmetry on purpose.
- Why it beats a slider: the user grabs and reorders the *named* sequence X.
- Prior art: no widely-known prior version; conceptually inspired by the Karpathy "operates over sets" remark in Let's-build-GPT and the Set-Transformer literature.

**Widget 5 — `multiHeadSplitter`**

- User manipulates: drag a head-count selector $h\in\{1,2,4,8\}$ that splits the named $d_{\text{model}}$ axis into $h$ subspaces; click any head to highlight it.
- Live updates: shape passport renders live (T,d) → (T,h,d/h); the h attention matrices are shown side by side, each with its own pattern on the same input; concat-and-W_O produces the output Y; param/FLOP counter stays constant across $h$.
- Concept made tangible: heads are parallel subspaces with the same total budget; their patterns differ.
- Why it beats a slider: the user is splitting the named model dimension d, not adjusting an opaque "complexity" knob.
- Prior art: Transformer Explainer (Polo Club) animates this for GPT-2 small; BertViz "model view" shows real heads of trained models. We recommend a smaller pedagogical version with a randomly-initialized model so students can see *structurally why* heads differ rather than memorize what trained heads look like.

**Widget 6 — `kvCacheTimeline`**

- User manipulates: step a "generate next token" button; optionally toggle "cache ON/OFF".
- Live updates: a growing K-stack and V-stack drawn as columns being appended; a per-step FLOP counter; a cumulative wall-clock estimate; a side panel that shows what would have been recomputed had the cache been off.
- Concept made tangible: the cache is *literally* an append-only ledger of K and V rows; without it, every step pays the full prefix cost.
- Why it beats a slider: the user steps the named decoding loop; the visible objects are the K-cache and V-cache.
- Prior art: Brendan Bycroft's `bbycroft.net/llm` 3D walkthrough animates a single inference step (https://bbycroft.net/llm); HuggingFace's KV-cache blog posts illustrate the idea statically. A *time-stepped*, toggleable version is novel and pedagogically high-value.

**Widget 7 — `ropeRotationDial`**

- User manipulates: drag two tokens $i, j$ along an integer position axis; the dial shows query and key as 2-D arrows being rotated by $R(\theta i)$ and $R(\theta j)$.
- Live updates: the dot product before and after rotation; a "depends only on $j-i$?" check.
- Concept made tangible: RoPE encodes position as a *rotation*, and the attention score reads off relative position.
- Why it beats a slider: the user grabs i and j directly; the rotated q and k are first-class named objects.
- Prior art: EleutherAI's RoPE blog post (https://blog.eleuther.ai/rotary-embeddings/) has static rotation diagrams; we are not aware of an interactive draggable version.

-----

### 5. Key formulas

```latex
% Single query against many keys (vector form)
o = \sum_{j=1}^{T} \alpha_j \, v_j
\alpha_j = \frac{\exp\!\left(q\cdot k_j / \sqrt{d_k}\right)}{\sum_{j'=1}^{T} \exp\!\left(q\cdot k_{j'} / \sqrt{d_k}\right)}
```

```latex
% Scaled dot-product attention (matrix form)
\mathrm{Attention}(Q, K, V) \;=\; \mathrm{softmax}\!\left(\frac{QK^{\!\top}}{\sqrt{d_k}} + M\right) V
```

```latex
% Variance argument for the scale
\mathbb{E}[q\cdot k] = 0,\qquad
\mathrm{Var}(q\cdot k) = d_k,\qquad
\mathrm{Var}\!\left(\tfrac{q\cdot k}{\sqrt{d_k}}\right) = 1
```

```latex
% Self-attention: Q, K, V all projections of the same X
Q = X W_Q,\quad K = X W_K,\quad V = X W_V,\qquad
W_Q, W_K \in \mathbb{R}^{d \times d_k},\;\; W_V \in \mathbb{R}^{d \times d_v}
```

```latex
% Cross-attention
Q = X^{(\mathrm{tgt})} W_Q,\qquad K = X^{(\mathrm{src})} W_K,\qquad V = X^{(\mathrm{src})} W_V
```

```latex
% Causal mask
M_{ij} = \begin{cases} 0 & j \le i \\ -\infty & j > i \end{cases}
```

```latex
% Multi-head attention
\mathrm{head}_h = \mathrm{Attention}(Q W^{(h)}_Q,\, K W^{(h)}_K,\, V W^{(h)}_V)
\mathrm{MHA}(X) = \mathrm{Concat}(\mathrm{head}_1,\dots,\mathrm{head}_H) \, W_O
```

```latex
% Shape passport (single head, batchless)
X \in \mathbb{R}^{T\times d}\;\to\; Q,K\in\mathbb{R}^{T\times d_k},\;V\in\mathbb{R}^{T\times d_v}
QK^{\!\top}\in\mathbb{R}^{T\times T},\quad \mathrm{Attention}(Q,K,V)\in\mathbb{R}^{T\times d_v}
```

```latex
% Sinusoidal positional encoding
\mathrm{PE}_{(\mathrm{pos},2i)}   = \sin\!\left(\mathrm{pos}\,/\,10000^{2i/d}\right)
\mathrm{PE}_{(\mathrm{pos},2i+1)} = \cos\!\left(\mathrm{pos}\,/\,10000^{2i/d}\right)
```

```latex
% RoPE (per dimension pair, frequency \theta_i)
\bigl(R_{\theta_i}^{\,m}\, q^{(i)}\bigr)\!\cdot\!\bigl(R_{\theta_i}^{\,n}\, k^{(i)}\bigr) \;=\; q^{(i)\top} R_{\theta_i}^{\,n-m}\, k^{(i)}
```

```latex
% Permutation equivariance
\mathrm{SelfAttn}(P X) \;=\; P\,\mathrm{SelfAttn}(X)\quad\text{for any permutation matrix } P
```

```latex
% Computational complexity
\text{Time:}\;\;O(T^2 d_k + T^2 d_v),\qquad \text{Memory (attention matrix):}\;\;O(T^2)
```

```latex
% KV-cache size for an L-layer model
\text{KV memory} \;=\; 2 \cdot L \cdot T \cdot d \cdot \text{bytes\_per\_float}
```

-----

### 6. Lesson decomposition

We recommend **5 lessons** for Module 15. Total ≈ 75 minutes of seat time.

-----

**Lesson 15.1 — "Soft dictionary lookup"**
Summary: Build attention from first principles as a differentiable hash table that returns *every* row, weighted by similarity.
Steps:

1. Hook: "How would you 'look up' a value if the keys are vectors and the query doesn't exactly match any of them?" (prose)
1. Hard lookup: argmax over q·kⱼ; show it's not differentiable. (prose+widget)
1. Soft lookup: replace argmax with softmax. (prose)
1. **StepCheck**: For q=(1,0), keys k₁=(1,0), k₂=(0,1), values v₁=10, v₂=20, compute the attention output. Expected: ≈13.10 (softmax of (1,0) is (e/(e+1), 1/(e+1)) ≈ (0.731, 0.269), output = 0.731·10 + 0.269·20 ≈ 12.69). *Use widget `qkVectorPlayground` to verify.*
1. Naming the roles: q = "what I'm looking for", k = "what I advertise", v = "what I deliver". (prose)
1. The full single-query equation $o = \sum \alpha_j v_j$ with $\alpha = \mathrm{softmax}(q\cdot k_{\cdot}/\sqrt{d_k})$. (prose)
1. Aside: this is a generalization of the cumulative-mean baseline (Karpathy's bridge). (prose)
1. **StepCheck**: With T=3 keys and uniform scores, what are the attention weights? Expected: 1/3 ≈ 0.333.
   Widgets: `qkVectorPlayground`. Estimated minutes: 12.

-----

**Lesson 15.2 — "Why √dₖ"**
Summary: Derive the scale factor from the variance of a dot product, then watch softmax die without it.
Steps:

1. Warm-up: variance of a sum of T independent zero-mean unit-variance terms. (prose)
1. Compute $\mathrm{Var}(q\cdot k)=d_k$ by linearity. (prose)
1. Show the problem visually: at $d_k=512$ the softmax becomes one-hot. (widget `softmaxSatExplorer`)
1. **StepCheck**: At $d_k=64$ with components $\sim\mathcal N(0,1)$, what is the standard deviation of the unscaled score? Expected: 8.
1. Patch: divide by $\sqrt{d_k}$. (prose+widget)
1. Show gradient survival metric stays nonzero with the patch. (widget)
1. **StepCheck**: With the $1/\sqrt{d_k}$ scale, what is the variance of the score? Expected: 1.
1. Aside: alternatives (additive attention, dividing by sum of key norms) and why the dot-product+scale won. (prose)
   Widgets: `softmaxSatExplorer`. Estimated minutes: 12.

-----

**Lesson 15.3 — "Three projections of the same X"**
Summary: Move from "one query, many keys" to full self-attention with learned $W_Q, W_K, W_V$, the matrix form, the shape passport, and causal masking.
Steps:

1. The leap: every position should be both a querier and a query-target. (prose)
1. Learned projections $W_Q, W_K, W_V$ with the canonical packed implementation `qkv = Linear(d, 3d)(x)`. (prose)
1. Matrix form: $\mathrm{Attention}(Q,K,V)=\mathrm{softmax}(QK^\top/\sqrt{d_k})V$. (prose)
1. Shape passport drill (Example 6 above). (prose)
1. **StepCheck**: For T=4, d=8, dₖ=4, what is the shape of $QK^\top$? Expected scalar: 16 (i.e., 4×4 matrix has 16 entries).
1. Self-attention vs. cross-attention: same op, different bindings. (prose)
1. The autoregressive problem: at training time we want each row to see only past+self. (prose)
1. Causal mask via $-\infty$ in upper triangle (Example 3). (widget `attentionMatrixHeatmap`)
1. **StepCheck**: After softmax, what is the value of the (i=2, j=3) entry of the causal attention matrix (T=4)? Expected: 0.
1. The permutation-equivariance bug (Example 10). (widget `permutationEquivarianceLab`)
1. **StepCheck**: With PE off, what is $\|Y' - PY\|$ for any permutation $P$? Expected: 0.
1. Preview: positional encodings come next. (prose)
   Widgets: `attentionMatrixHeatmap`, `permutationEquivarianceLab`. Estimated minutes: 18.

-----

**Lesson 15.4 — "Position, three ways"**
Summary: Patch the permutation bug. Sinusoidal, learned absolute, RoPE — what each one *does* and why modern LLMs use RoPE.
Steps:

1. Recap: self-attention is permutation-equivariant; therefore order must be encoded somewhere. (prose)
1. Sinusoidal PE: a fixed multi-scale "clock" added to embeddings. (prose)
1. Why those wavelengths: $\mathrm{PE}_{\mathrm{pos}+k}$ is a linear function of $\mathrm{PE}_{\mathrm{pos}}$ for fixed $k$ (Example 8). (prose)
1. **StepCheck**: For dimension index $i=0$ and $d=512$, the wavelength of the sinusoid is $2\pi$; for the *last* pair ($i=255$) the wavelength is approximately how many positions? Expected: $2\pi\cdot 10000\approx 62832$.
1. Learned absolute PE (GPT-2/3): a lookup table of $T_{\max}$ rows. Cheap, but does not extrapolate beyond $T_{\max}$. (prose)
1. RoPE: rotate q and k inside attention, not the embedding. (prose)
1. The killer property: $(R^m q)^\top (R^n k)$ depends only on $n-m$. (widget `ropeRotationDial`)
1. **StepCheck**: With RoPE, if we shift every token's position by +5, do attention scores change? Expected: 0 (no change).
1. Recommendation: RoPE for new builds, sinusoidal for the textbook formula, learned-absolute as the historical GPT-2 reference. (prose)
   Widgets: `ropeRotationDial`. Estimated minutes: 14.

-----

**Lesson 15.5 — "Multi-head, complexity, and the cache"**
Summary: Wider in parallel, not deeper. The T² cost. The KV-cache that makes streaming inference feasible. We end one block of glue away from a transformer.
Steps:

1. Motivation: a single head computes one weighted average per query — averaging inhibits diversity. (prose)
1. Multi-head split: reshape $d \to (h, d/h)$. (prose)
1. Per-head attention in parallel. (widget `multiHeadSplitter`)
1. Concat and $W_O$. (prose)
1. **StepCheck**: With $d_{\text{model}}=512$, $h=8$, what is $d_k$ per head? Expected: 64.
1. **StepCheck**: Total parameters of $W_Q$ across all heads vs. one big $W_Q$ at $d_k=d$. Expected ratio: 1 (same).
1. Complexity: QKᵀ is $O(T^2 d_k)$, the bottleneck of LLM economics. (prose)
1. **StepCheck**: If you double $T$, by what factor does attention compute grow? Expected: 4.
1. KV-cache: at inference, only the new token issues a query; cache K, V of the past. (widget `kvCacheTimeline`)
1. **StepCheck**: Generating 1024 tokens with cache vs. without — order-of-magnitude speedup factor? Expected: ≈1024 (one factor of T).
1. Endgame callback: "you are now one layer of glue away from the real thing." (prose)
1. Preview m16: residuals + layer norm + an MLP wrapped around this exact block. (prose)
   Widgets: `multiHeadSplitter`, `kvCacheTimeline`. Estimated minutes: 18.

-----

### 7. Problem bank

Difficulty/cognitive type/concept tags follow each statement.

1. **Statement.** Compute $\mathrm{softmax}((1, 0, 1)/\sqrt{2})$ (use $\sqrt{2}\approx 1.414$). **Answer.** Approximately $(0.422, 0.156, 0.422)$. **Difficulty:** novice. **Type:** computation. **Tags:** `attention-weights-row`, `1-over-sqrt-dk-scale`.
1. **Statement.** Given $T=3$ values $v_1=2, v_2=4, v_3=6$ and weights $\alpha=(0.1, 0.2, 0.7)$, compute the attention output $o=\sum\alpha_j v_j$. **Answer.** $4.6$. **Difficulty:** novice. **Type:** computation. **Tags:** `weighted-average-as-aggregator`, `single-head-attention-output`.
1. **Statement.** A query $q$ has unit norm and four keys are $k_j=q$ for all $j$. What are the attention weights $\alpha_j$? **Answer.** $0.25$ each (uniform). **Difficulty:** novice. **Type:** computation. **Tags:** `attention-weights-row`.
1. **Statement.** State the shape of $QK^\top$ given $Q\in\mathbb{R}^{T\times d_k}$ and $K\in\mathbb{R}^{T\times d_k}$. **Answer.** $T\times T$. **Difficulty:** novice. **Type:** computation. **Tags:** `shape-calculus-attention`.
1. **Statement.** With $d_{\text{model}}=768$ and $h=12$ heads, give $d_k$ per head. **Answer.** $64$. **Difficulty:** novice. **Type:** computation. **Tags:** `multi-head-split`.
1. **Statement.** Why is the softmax in attention applied along the *key* axis and not the *feature* axis? Answer in one sentence. **Answer.** Because for each query we want a probability distribution over which positions to read from; the feature axis carries the embedding components, not positions. **Difficulty:** novice. **Type:** interpretation. **Tags:** `attention-weights-row`, `shape-calculus-attention`.
1. **Statement.** Construct the $4\times 4$ causal mask $M$. Then write the post-softmax weights for row $i=2$ when all pre-mask scores are equal. **Answer.** $M$ is $0$ on/below diagonal, $-\infty$ above; row 2 weights are $(\tfrac13,\tfrac13,\tfrac13,0)$. **Difficulty:** intermediate. **Type:** construction. **Tags:** `causal-mask`.
1. **Statement.** Show that $\mathbb{E}[q\cdot k]=0$ and $\mathrm{Var}(q\cdot k)=d_k$ for $q,k$ with i.i.d. zero-mean unit-variance components. **Answer.** $\mathbb{E}[\sum q_i k_i]=\sum \mathbb{E}[q_i]\mathbb{E}[k_i]=0$; variances of $q_i k_i$ are $\mathbb{E}[q_i^2]\mathbb{E}[k_i^2]=1$, sum gives $d_k$. **Difficulty:** intermediate. **Type:** proof-scaffold. **Tags:** `1-over-sqrt-dk-scale`, `softmax-saturation-problem`.
1. **Statement.** A student replaces $1/\sqrt{d_k}$ with $1/d_k$. Predict what happens to the attention pattern at large $d_k$. **Answer.** Variance of scaled score becomes $1/d_k$; softmax becomes nearly uniform; the model loses the ability to attend selectively. **Difficulty:** intermediate. **Type:** debugging. **Tags:** `1-over-sqrt-dk-scale`, `softmax-saturation-problem`.
1. **Statement.** Given $X\in\mathbb{R}^{T\times d}$ and $W_Q,W_K\in\mathbb{R}^{d\times d_k}$, count the FLOPs to compute the score matrix $QK^\top$ (matmul-only, ignore softmax and scale). **Answer.** $2Td\cdot d_k + 2T^2 d_k$ (or, dropping constants, $O(Td\,d_k + T^2 d_k)$). **Difficulty:** intermediate. **Type:** computation. **Tags:** `attention-quadratic-complexity`, `shape-calculus-attention`.
1. **Statement.** Permute the rows of $X$ by $P$ and apply self-attention without positional encodings. Show the output is $P\cdot\mathrm{SelfAttn}(X)$. **Answer.** $Q=PXW_Q=PQ$, similarly $K\to PK$, $V\to PV$; $QK^\top\to P(QK^\top)P^\top$; softmax row-wise commutes with $P$ on rows; final $V$ multiplication gives $P\cdot\mathrm{SelfAttn}(X)$. **Difficulty:** advanced. **Type:** proof-scaffold. **Tags:** `permutation-equivariance`, `positional-encoding-need`.
1. **Statement.** Two candidate attention distributions $\alpha$ and $\alpha'$ on the same V yield the same output $o$. Construct one such pair for $T=2$ and $v_1=v_2$. **Answer.** Any $\alpha,\alpha'$ both summing to 1 work because $\alpha_1 v_1+\alpha_2 v_2=v_1$ when $v_1=v_2$. This is the "attention weights are not uniquely determined by output" observation that underlies Jain & Wallace 2019. **Difficulty:** advanced. **Type:** construction. **Tags:** `attention-not-explanation`.
1. **Statement.** Without a KV-cache, how does the per-step compute of attention scale with the current sequence length $t$? With a cache? **Answer.** Without: $O(t^2 d_k)$ at step $t$, total over $T$ steps $O(T^3 d_k)$. With: $O(t d_k)$ per step, total $O(T^2 d_k)$. **Difficulty:** intermediate. **Type:** computation. **Tags:** `kv-cache`, `attention-quadratic-complexity`.
1. **Statement.** Explain in one sentence why we cache K and V but not Q during autoregressive inference. **Answer.** Only the *new* token issues a query each step; past queries are not consulted again, so caching them buys nothing. **Difficulty:** intermediate. **Type:** interpretation. **Tags:** `kv-cache`.
1. **Statement.** Show that for sinusoidal PE with $d=4$, the encoding at position $\mathrm{pos}+k$ can be written as a linear (rotation-block-diagonal) function of the encoding at position $\mathrm{pos}$. **Answer.** Each (sin, cos) pair at frequency $\omega_i=10000^{-2i/d}$ rotates by $\omega_i k$; the full PE is a block-diagonal of 2D rotations $R(\omega_i k)$. **Difficulty:** advanced. **Type:** proof-scaffold. **Tags:** `sinusoidal-pe`, `positional-encoding-need`.
1. **Statement.** A 2D RoPE rotates query at position $m$ by angle $\theta m$ and key at position $n$ by $\theta n$. Show the dot product depends only on $m-n$. **Answer.** $(R_\theta^m q)^\top (R_\theta^n k)=q^\top R_\theta^{n-m}k$ since $R_\theta^{-m}R_\theta^n=R_\theta^{n-m}$. **Difficulty:** advanced. **Type:** proof-scaffold. **Tags:** `rope-rotary-pe`.
1. **Statement.** A student claims "multi-head attention with $h=8$ has 8× more parameters than single-head with $d_k=d_{\text{model}}$." Refute. **Answer.** Each head uses $W_Q,W_K,W_V$ of shape $d\times(d/h)$, so total $W_Q$ params summed over heads is $d\times d$ — exactly the same as one big head. The only extra params are $W_O\in\mathbb{R}^{d\times d}$, but a single-head model also needs an output projection. **Difficulty:** intermediate. **Type:** debugging. **Tags:** `multi-head-split`, `multi-head-concat-and-Wo`.
1. **Statement.** Given $T=2$ tokens with values $v_1=(1,0), v_2=(0,1)$, queries $q_1=(2,0), q_2=(0,2)$, keys $k_1=(1,0), k_2=(0,1)$, $d_k=2$, no scaling, compute the post-softmax attention weight $\alpha_{12}$ (token 1 attending to token 2). **Answer.** Scores row 1 = $(q_1\!\cdot\! k_1, q_1\!\cdot\! k_2)=(2,0)$. Softmax gives $(e^2/(e^2+1), 1/(e^2+1))\approx(0.881, 0.119)$. So $\alpha_{12}\approx 0.119$. **Difficulty:** intermediate. **Type:** computation. **Tags:** `attention-formula-matrix-form`.
1. **Statement.** Explain in two sentences why "attention weights are interpretable as feature importance" is an over-claim, and cite an empirical result. **Answer.** Jain & Wallace (NAACL 2019) show that one can construct alternative attention distributions that yield the same predictions, and that attention is often uncorrelated with gradient-based feature importance, so attention is a useful diagnostic but not a faithful explanation. Wiegreffe & Pinter (EMNLP 2019) qualify this — attention can sometimes serve as a plausible explanation under stricter tests — but the over-claim does not survive either paper. **Difficulty:** advanced. **Type:** interpretation. **Tags:** `attention-not-explanation`.
1. **Statement.** Modify the causal mask for a model that may attend to all *past* tokens *and* the immediately following token (i.e., at most one position into the future). Write $M_{ij}$ explicitly. **Answer.** $M_{ij}=0$ if $j\le i+1$, else $-\infty$. **Difficulty:** advanced. **Type:** construction. **Tags:** `causal-mask`.

-----

### 8. Endgame callback — refined

Three candidate one-liners, each better than the starter for a different reason.

1. **(Recommended.)** "Attention is one operation: every position broadcasts a query, every position offers a key, the softmax-weighted match decides whose values you pull back. Residuals, layer norm, and the MLP that follows are *plumbing* around that core idea — and you are now one layer of glue away from a real transformer."
1. "If you can hand-compute one row of softmax(QKᵀ/√dₖ)V and explain why the scale is there, you can read every transformer paper from the last decade. The next module bolts on the plumbing — residuals, norm, MLP — and stacks the result N times."
1. "Self-attention is a soft, differentiable, parallel hash table. You've just built it. Module 16 wraps it in the standard glue (residual, layer norm, MLP) and stacks it; that stack is the transformer."

Recommendation: ship #1; it preserves the user's framing, names the three plumbing parts that are coming in m16, and ends on the same "one layer of glue away" hook.

-----

### 9. Sources (licensing-aware)

1. **Vaswani et al., "Attention Is All You Need" (2017).** Paper; arXiv:1706.03762; https://arxiv.org/abs/1706.03762. License: arXiv perpetual non-exclusive (default for this paper). **[REFERENCE-ONLY]**. Use for: the canonical scaled dot-product formulation, the variance footnote behind $1/\sqrt{d_k}$, the multi-head argument, and the original sinusoidal PE.
1. **Karpathy, "Let's build GPT: from scratch, in code, spelled out" (YouTube; 2023) and `nanoGPT` repo (https://github.com/karpathy/nanoGPT).** Video + code. Code license: MIT. **[ADAPT]** code patterns (e.g., the packed `c_attn = Linear(d, 3d)` and `tril` causal-mask buffer) under MIT attribution. **[REFERENCE-ONLY]** for the YouTube narration. Use for: the four-version progression to self-attention, the "attention as communication on a directed graph", the canonical PyTorch implementation we mirror in WebGPU.
1. **Sasha Rush, "The Annotated Transformer" (Harvard NLP; 2018, updated 2022); https://nlp.seas.harvard.edu/annotated-transformer/. Repo https://github.com/harvardnlp/annotated-transformer .** Blog + code. Code license: MIT (per repo). Prose: not explicitly CC-licensed → treat **[REFERENCE-ONLY]** for prose; **[ADAPT]** code patterns. Use for: the line-by-line correspondence between math and PyTorch.
1. **Lilian Weng, "Attention? Attention!" (2018) and "The Transformer Family v2.0" (2023); https://lilianweng.github.io/posts/2018-06-24-attention/ and …/posts/2023-01-27-the-transformer-family-v2/.** Blog. License: not stated → **[REFERENCE-ONLY]**. Use for: the historical chain Bahdanau → Luong → Vaswani, the unified notation, and the survey of attention variants.
1. **Jay Alammar, "The Illustrated Transformer" (2018); https://jalammar.github.io/illustrated-transformer/.** Blog. License: CC BY-NC-SA 4.0. **[REFERENCE-ONLY]** (cannot be embedded or adapted in a paid product). Use for: inspiration for our own QKV illustrations and the canonical "it" → "animal" coreference example, which we re-render from scratch.
1. **3Blue1Brown, "Attention in transformers, visually explained" (2024); https://www.3blue1brown.com/lessons/attention/.** Video + companion lesson page. License: not CC; copyrighted. **[REFERENCE-ONLY]**. Use for: high-bar visual rigor target — re-implement the attention-pattern grid and the q-rotation animation in our own widgets.
1. **Brendan Bycroft, "LLM Visualization" (https://bbycroft.net/llm; repo https://github.com/bbycroft/llm-viz).** Interactive 3D walkthrough. Repo license: MIT (verify per file). **[ADAPT]** the *idea* of the data-flow timeline; do not copy assets. Use for: visual reference for the per-step KV-cache animation in `kvCacheTimeline`.
1. **Polo Club / Georgia Tech, "Transformer Explainer" (Cho, Kim, Karpekov et al., 2024); https://poloclub.github.io/transformer-explainer/; repo https://github.com/poloclub/transformer-explainer.** Interactive widget. License: MIT. **[ADAPT]** patterns for in-browser GPT-2 style attention-matrix rendering with a Svelte/D3 stack — directly compatible with our Astro+Svelte stack.
1. **Jesse Vig, "BertViz" (2019); https://github.com/jessevig/bertviz; paper arXiv:1906.05714.** Tool. License: Apache 2.0. **[ADAPT]** the head-view / model-view / neuron-view layouts for our `attentionMatrixHeatmap` widget. Use for: the gold-standard interaction patterns.
1. **Jain & Wallace, "Attention is not Explanation" (NAACL 2019); arXiv:1902.10186. Wiegreffe & Pinter, "Attention is not not Explanation" (EMNLP 2019); arXiv:1908.04626.** Papers. License: arXiv non-exclusive default. **[REFERENCE-ONLY]**. Use for: anchoring the interpretability misconception with citations students can verify; both papers should be cited side-by-side to give the honest picture.

Supplementary (cited but not in the top 10 to keep): Su et al., "RoFormer" (arXiv:2104.09864, REFERENCE-ONLY); EleutherAI's RoPE blog (REFERENCE-ONLY); Pope et al., "Efficiently Scaling Transformer Inference" (arXiv:2211.05102, REFERENCE-ONLY); Bahdanau, Cho & Bengio (arXiv:1409.0473, REFERENCE-ONLY); Olah & Carter, "Attention and Augmented Recurrent Neural Networks" Distill 2016 (CC BY 4.0 — this one **[ADAPT]**, with attribution); CS224N Stanford lecture notes (CS224N course material, REFERENCE-ONLY).

-----

### 10. Pedagogical traps

1. **Jumping to multi-head before single-head is solid.** Why it happens: instructors want to mirror the official `Attention(Q,K,V)` then `MultiHead(Q,K,V)` paper structure. The trap: students never form a stable mental model of one head, so when h=8 is introduced they cannot localize where their confusion lives. **Mitigation:** Lessons 15.1–15.4 deal exclusively with single-head attention; multi-head is *one lesson at the end* (15.5), introduced as "wider in parallel, same compute". The `multiHeadSplitter` widget keeps single-head as the default state.
1. **Explaining QKV with database analogies that hide the matmul.** Why it happens: the "Python dict with vectors as keys" pitch is irresistibly clean. The trap: students walk away thinking Q, K, V are three different inputs and that the "lookup" is a piece of code, not a matmul + softmax + matmul. **Mitigation:** never introduce QKV before the projection step. The first time the letters Q, K, V appear, they must be defined as $XW_Q, XW_K, XW_V$ with the packed `Linear(d, 3d)` pattern visible. Misconception #1 is the highest-yield pre-empt.
1. **Teaching the formula before motivating each piece.** Why it happens: the formula $\mathrm{softmax}(QK^\top/\sqrt{d_k})V$ is short and seductive. The trap: students memorize five symbols without an intuition that survives a perturbation. **Mitigation:** build the formula *piecewise* across Lessons 15.1–15.3. Lesson 15.1 ends with $\sum\alpha_j v_j$. Lesson 15.2 inserts the $\sqrt{d_k}$. Lesson 15.3 inserts the $W_Q, W_K, W_V$ projections, the matrix form, and the mask. The full formula is assembled on-screen in the last step of 15.3, never before.
1. **Skipping shape calculus.** Why it happens: math-style presentations elide axes; "let $Q\in\mathbb{R}^{T\times d_k}$" is treated as obvious. The trap: when the multi-head reshape happens — `(B, T, d) → (B, T, h, d/h) → (B, h, T, d/h)` — students cannot follow which axis is being permuted. **Mitigation:** every lesson includes a *shape passport* (the explicit chain of tensor shapes through the operation), at least one StepCheck asks for a shape, and the `multiHeadSplitter` widget renders the passport live as the user changes h.
1. **Conflating self-attention with the full transformer.** Why it happens: most one-page diagrams of "the transformer" make attention and the surrounding plumbing look indistinguishable. The trap: students expect attention alone to do everything (residuals, normalization, the position-wise MLP). **Mitigation:** explicit boundary in the endgame callback ("residuals, layer norm, MLP — *plumbing* around this single core idea"), and m16 is named "Transformer block" precisely so students know the assembly happens *next*, not now.
1. **Presenting positional encoding before establishing why it's necessary.** Why it happens: PE sits at the bottom of the canonical architecture diagram, so the temptation is to "just add it on the way in". The trap: students learn PE as decoration. **Mitigation:** Lesson 15.3 ends with the *permutation-equivariance demonstration* (`permutationEquivarianceLab`); Lesson 15.4 opens with "this is the bug we just discovered". PE is the *fix to a named symptom*, not a feature.
1. **The "attention is interpretable" overclaim.** Why it happens: heatmaps look like explanations; many BertViz-style screenshots circulating in pop-tech articles imply this is the model's "thought process". The trap: students leave with a confident but wrong belief about model interpretability. **Mitigation:** in the problem bank (Problem 19) and as a one-paragraph aside in Lesson 15.3 step 8, cite Jain & Wallace 2019 *and* Wiegreffe & Pinter 2019 together; the honest framing is "useful diagnostic, not faithful explanation". This costs about 60 seconds of lesson time and immunizes students against a misconception that has propagated through two ML generations.
