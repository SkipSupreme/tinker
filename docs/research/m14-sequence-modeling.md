# Module 14 Research Brief — Sequence Modeling: Bigrams to RNNs

### 1. Concept dependency graph

1. `token-vocab` — A finite alphabet (here: `a–z`, `.` start/end token; |V|=27) into which raw text is one-hot encoded. *Prereqs:* m7-softmax (shape conventions), `linear-algebra-from-m7`.
2. `sequence-as-joint` — A length-T sequence is a single sample from a joint distribution P(x₁,…,x_T) over V^T. *Prereqs:* `token-vocab`.
3. `chain-rule-prob` — P(x₁,…,x_T) factorizes exactly as ∏ₜ P(xₜ | x₁,…,x_{t-1}); no approximation, just probability algebra. *Prereqs:* `sequence-as-joint`.
4. `markov-assumption` — Truncate the conditioning history to the last n−1 tokens to make the factor tractable. *Prereqs:* `chain-rule-prob`.
5. `bigram-table` — A |V|×|V| matrix N where N[i,j] counts how often token j follows i; row-normalized to a categorical P(·|i). *Prereqs:* `markov-assumption`.
6. `nll-loss` — −(1/T)∑log P(xₜ|context); the loss our bigram (and every later LM) is optimizing. *Prereqs:* `bigram-table`, m7-softmax.
7. `perplexity` — exp(NLL); the effective branching factor. PPL=k means the model is as confused as a uniform-over-k die. *Prereqs:* `nll-loss`.
8. `bigram-as-onelayer-nn` — One-hot input × W (∈ℝ^{|V|×|V|}) → softmax = exactly the same model as the count table; W converges (up to additive constant per row) to log-counts. *Prereqs:* `bigram-table`, `nll-loss`, m11-mlp.
9. `count-vs-gd-equivalence` — Closed-form MLE (smoothed counts) and SGD on `bigram-as-onelayer-nn` reach the same minimizer of the NLL. *Prereqs:* `bigram-as-onelayer-nn`, m10-gd.
10. `categorical-sampling` — Drawing xₜ ~ Cat(p) by inverse-CDF over a uniform[0,1). *Prereqs:* `bigram-table`.
11. `temperature` — Replace logits ℓ with ℓ/T before softmax: T→0 ⇒ argmax, T→∞ ⇒ uniform. *Prereqs:* `categorical-sampling`, m7-softmax.
12. `top-k-sampling` — Zero out all but the k largest probabilities, renormalize, sample. *Prereqs:* `categorical-sampling`.
13. `ngraially in n. *Prereqs:* `bigram-table`, `markov-assumption`.
14. `embedding-matrix` — A learned lookup C∈ℝ^{|V|×d} mapping token id → dense vector; row i is "the embedding of token i". *Prereqs:* `bigram-as-onelayer-nn`, m11-mlp.
15. `fixed-context-mlp` — Bengio-2003-style: concatenate embeddings of last n−1 tokens, feed an MLP, softmax over V. *Prereqs:* `embedding-matrix`, `ngram-explosion`, m11-mlp, m12-backpropagation.
16. `fixed-context-limit` — The MLP can never see beyond its window; doubling context doubles parameters and still has a hard wall. *Prereqs:* `fixed-context-mlp`.
17. `rnn-cell` — h_t = tanh(W_x x_t + W_h h_{t-1} + b); same parameters every timestep. *Prereqs:* `fixed-context-mlp`, m11-mlp.
18. `rnn-as-lm` — y_t = softmax(W_y h_t); train with NLL summed over the sequence. *Prereqs:* `rnn-cell`, `nll-loss`.
19. `unrolling` — Drawing the same RNN cell once per timestep yields a deep, parameter-tied feedforward graph on which ordinary backprop applies. *Prereqs:* `rnn-ceion.
20. `bptt` — Backprop on the unrolled graph; gradients for shared weights are summed across timesteps. *Prereqs:* `unrolling`.
21. `vanishing-exploding` — Repeated multiplication by W_h's Jacobian shrinks/exponentiates gradients, capping the effective memory of a vanilla RNN. *Prereqs:* `bptt`, m13-training-dynamics.
22. `sequential-bottleneck` — Everything the RNN remembers about t<T must fit in the single vector h_T; this is the failure mode attention is built to fix. *Prereqs:* `rnn-as-lm`, `vanishing-exploding`.

---

### 2. Canonical worked examples

**Ex 1 — Build the bigram table from a 4-name corpus.**
*Statement:* Corpus `["emma","olivia","ava","ada"]` with `.` start/end. Compute N[`a`,`.`] and P(`.`|`a`).
*Solution:* Bigrams: `.e em mm ma a. .o ol li iv vi ia a. .a av va a. .a ad da a.`. Count of (`a`,`.`) = 4 (one per name's terminal `a`). Row sum N[`a`,·]: pairs starting with `a` are `a.,a.,av,a.,ad,a.` = 6. P(`.`|`a`) = 4/6 = 2/3.
*Pedagogical point:* The bigram model is not magicust counting. The table is the model.
*Common mistake:* Forgetting the `.` start/end token, so the model never learns "names tend to end in `a`" or "names rarely start with `q`."

**Ex 2 — Smoothing rescues a never-seen bigram.**
*Statement:* In Ex 1, what is P(`q`|`a`) without smoothing? With +1 smoothing?
*Solution:* Without smoothing 0/6 = 0 → log P = −∞ → loss explodes. With add-one: (0+1)/(6+27) = 1/33 ≈ 0.030.
*Pedagogical point:* Why we will reach for gradient-trained models (which never assign exactly 0) and why even count models need smoothing.
*Common mistake:* Adding 1 to the numerator but not bumping the denominator by |V|.

**Ex 3 — Bigram NN converges to the count table.**
*Statement:* Train W∈ℝ^{27×27} on the makemore names dataset with logits = onehot(x_{t})·W, NLL loss, full-batch GD. Show softmax(W[i]) → P_count(·|i).
*Solution:* Setting ∂L/∂W=0 with onehot input gives exp(W[i,j])/Z_i = N[i,j]/∑_k N[i,k]; equivalently W[i,j] = log N[i,j] + c_i. After enough stee SGD model lands on the same categorical as counting.
*Pedagogical point:* Counts and gradient descent are two paths to the same MLE. Once a learner sees this in code, they stop thinking of "neural" and "statistical" as separate worlds.
*Common mistake:* Not subtracting per-row max in the softmax → numerical NaNs that look like a "training bug" but are actually a softmax-stability bug.

**Ex 4 — Compute NLL and perplexity for a held-out word.**
*Statement:* Using the trained bigram model from Ex 1, compute NLL and perplexity of the held-out word `ava`.
*Solution:* Tokenize: `.→a→v→a→.`. Multiply P(a|.)·P(v|a)·P(a|v)·P(.|a). Suppose these are 0.13, 0.005, 1.0, 0.667. NLL = −(log .13 + log .005 + log 1 + log .667)/4 ≈ 1.93. PPL = e^{1.93} ≈ 6.9.
*Pedagogical point:* Perplexity ≈ "the model behaves as if guessing among 7 equally plausible next characters per step on this word." Branching-factor intuition.
*Common mistake:* Averaging probabilities instead of log-probs (geometric mean ≠xponentiating.

**Ex 5 — Sample with temperature.**
*Statement:* Logits over `{a,b,c}` are (2.0, 1.0, 0.0). Compute the categorical at T=1, T=0.5, T=2.
*Solution:* T=1: softmax(2,1,0) ≈ (.665,.245,.090). T=0.5 (logits ×2 before softmax): (.866,.117,.016). T=2: (.506,.307,.187).
*Pedagogical point:* Temperature reshapes a single distribution; it does not change which token is most likely (argmax is invariant for T>0), only how peaked the mass is.
*Common mistake:* Confusing temperature with top-k (one rescales, the other censors).

**Ex 6 — Bengio MLP forward pass on a 3-character context.**
*Statement:* Vocab |V|=27, embedding dim d=2, context size k=3, hidden size h=64. Input `[. . e]`. Walk through shapes through to logits.
*Solution:* Embed: C[[0,0,5]] → (3,2). Concat → (6,). Hidden: tanh(W₁·x + b₁) where W₁∈ℝ^{64×6} → (64,). Output: W₂·hidden + b₂ where W₂∈ℝ^{27×64} → (27,) logits → softmax → 27-class distribution.
*Pedagogical point:* The embedding matrix is j The network's "knowledge of language" lives in C and W₁.
*Common mistake:* Reshaping to (1,6) but then matmul'ing with a (64,6) weight as if it were row-vector convention; sign of unfamiliarity with PyTorch's batch-first layout.

**Ex 7 — Hand-trace one RNN timestep.**
*Statement:* h_{t−1} = (0.1, −0.2). x_t = onehot(`a`) ∈ ℝ^{27}. W_x ∈ ℝ^{2×27}, W_h ∈ ℝ^{2×2}, b ∈ ℝ². Suppose W_x[:,0] = (0.5, 0.0), W_h = [[0.2,0],[0,0.2]], b = 0. Compute h_t.
*Solution:* W_x·x_t = (0.5, 0). W_h·h_{t−1} = (0.02, −0.04). Sum + b = (0.52, −0.04). h_t = tanh = (0.478, −0.040).
*Pedagogical point:* The RNN cell is `tanh(W_x·input + W_h·memory)`. That's it. The recurrence is one matmul and an element-wise tanh.
*Common mistake:* Forgetting that x_t is one-hot, so W_x·x_t just picks one column of W_x — i.e., W_x acts as the input-side embedding lookup.

**Ex 8 — Unroll BPTT for T=3.**
*Statement:* Sequence `[a,b,c]`, target `[b,c,.]`. Compute ∂L/∂W_h symbolically.
*Solution:* L = _h = ∑_t ∂L_t/∂W_h, and each ∂L_t/∂W_h = ∑_{k≤t} (∂L_t/∂h_t)·(∏_{j=k+1..t} ∂h_j/∂h_{j−1})·(∂h_k/∂W_h). The same W_h's gradient is summed across all timesteps.
*Pedagogical point:* BPTT is not a new algorithm; it's chain rule on the unrolled DAG, with shared-weight gradients summed.
*Common mistake:* Treating each timestep's W_h as a different parameter (so you'd update three separate weights), which leaks the weight-sharing invariant.

**Ex 9 — Vanishing-gradient by repeated Jacobian multiplication.**
*Statement:* Suppose ∂h_t/∂h_{t−1} has spectral radius ρ=0.5 throughout. After 30 timesteps, what's the worst-case gradient magnitude scaling?
*Solution:* ‖∏ J‖ ≤ ρ^30 ≈ 9.3×10⁻¹⁰. Effectively zero — the network cannot learn any dependency 30 steps back.
*Pedagogical point:* This isn't a software bug; it's a property of repeated linear contractions. m13 already showed why residuals help; here the equivalent fix is attention.
*Common mistake:* Believinge structure if you just train longer.

**Ex 10 — Greedy vs temperature on the toy bigram.**
*Statement:* Starting from `.`, generate 10 chars greedy, then with T=1 stochastic. Compare.
*Solution:* Greedy collapses into a short loop (`.aaaaaaa` if `a` is most-likely after both `.` and `a`). Stochastic produces name-like babble (`ana.`, `eva.`).
*Pedagogical point:* Greedy decoding is what kills toy LMs — the model has variety to offer; we just have to sample.
*Common mistake:* Concluding the model "didn't learn" because greedy output is degenerate, when the model is fine and the *decoder* is the problem.

---

### 3. Common misconceptions

1. **"The bigram model is some special probabilistic thing, separate from the neural one."** Natural because counting and softmax-MLP look like different paradigms. Kill it by showing in code that a one-layer NN trained by GD on NLL converges to log-counts (Karpathy's makemore demo). The widget `bigramTwoWays` makes this visceral.
2. **"Probabilities of a long sequencltiply, so we just multiply them."** Natural because that's what the chain rule says. Counterexample: 200 chars × ~0.05 each = 10⁻²⁶⁰; underflows float32 instantly. Reframe: we *always* work in log-space; "the loss" is the chain rule expressed in logs.
3. **"Higher perplexity = better."** Natural because "higher accuracy = better" is a learned reflex. Reframe: perplexity is exponentiated *loss*. Lower is better. A perfect model has PPL=1 (no surprise). A uniform-over-27 model has PPL=27 — that's the floor before you've learned anything.
4. **"Temperature changes which token is most likely."** Natural because dragging a temperature knob obviously changes generations. Counterexample/visualization: show the bar chart at T=0.1, T=1, T=10 over the *same* logits. The argmax bar is the tallest at all three. What changes is the *shape*, not the *ranking*.
5. **"An RNN remembers everything that came before."** Natural because the marketing framing is "memory." Reframe: the RNN remembers exactly as much as t ∈ ℝ^d, and only what survived the squashing function's contraction. The widget `hiddenStateOverwrite` shows the vector being overwritten each step.
6. **"BPTT is a separate algorithm I have to learn."** Natural because it has a separate name. Reframe: BPTT = unroll the loop into a feedforward graph + apply the m12 backprop rules + sum the gradients of the tied weight. There is no new math.
7. **"The hidden state is conceptually different from a layer activation."** Natural because of mystical "memory" framing. Counterexample: in the unrolled graph, h_t is an intermediate layer activation, full stop. The only special thing is that the next "layer" reuses the same weights.
8. **"More context window length is always better."** Natural extrapolation of "more is better." Counterexample: a 5-gram table is 27⁵ ≈ 14M cells on |V|=27; a 10-gram is 2×10¹⁴. You can't fill it, you can't store it, and if you're using an MLP you also explode the parameter count of W₁ linearly. This is exactly why we stoppr n-grams.
9. **"Softmax is just normalization, so initialization of the output layer doesn't matter."** Natural because softmax sums to 1. Counterexample: at init with random W₂, the loss is ~−log(1/27) ≈ 3.3. If a learner sees an initial loss of 12, that's a sign W₂ is mis-scaled and the network is "confidently wrong" before it has seen any data — *the* lesson of m13 reapplied.
10. **"RNNs and LSTMs are basically the same."** Natural because LSTM is the "default" RNN in most blog posts. Refuse to teach LSTMs in this module (per constraints). Reframe: the gating in LSTMs is a patch over the vanilla RNN's contraction problem; we don't need that patch because attention solves the same problem more directly, and that's next module.
11. **"Sampling from softmax means picking the argmax."** Natural because that's how we evaluate classifiers. Counterexample/widget: a `categoricalSampler` where the learner presses "sample" 50 times and watches the empirical histogram match the categorical bar chart.
12.bedding matrix is some pre-trained thing we download."** Natural because of word2vec/GloVe lore from prior reading. Reframe: in this module the embedding is a `nn.Linear`-equivalent lookup learned by SGD jointly with the rest of the model. Row i of C is just "the parameters that happen to be touched when token i appears."

---

### 4. Interactive widget suggestions

**1. `bigramHeatmap`**
- *Direct manipulation:* Click any cell (i,j) of the 27×27 count grid. Drag corpus tokens onto cells to incrementally insert/remove training examples. Click a row label to "lock focus" on row i; the row becomes a bar chart of P(·|i) below.
- *Concept made tangible:* The bigram model **is** this matrix. A row of the matrix is the categorical for "what comes after token i." Editing a cell directly edits the model.
- *Beats slider+figure how:* The mathematical object the lesson named (`bigram-table`) is the literal thing being grabbed, edited, and renormalized in real time. There is no "labeled number" — there are 729 celeach of which the learner can see, click, and watch redistribute the row mass.
- *Prior art:*
  - Setosa "Markov Chains, explained visually" — drag transition matrix entries, watch chain animate. https://setosa.io/ev/markov-chains/ (CC BY-NC, [REFERENCE-ONLY])
  - Karpathy makemore notebook plot (matplotlib heatmap of N[27,27]) https://github.com/karpathy/nn-zero-to-hero (MIT, [ADAPT])

**2. `bigramTwoWays`**
- *Direct manipulation:* Two identical-looking heatmaps side-by-side, both 27×27. Left is "counts after smoothing." Right is "softmax(W) where W is being trained by SGD." The learner clicks "Step" or "Run 1000 steps" and watches the right matrix converge cell-by-cell to the left. They can also drag the regularization strength (an actual mathematical object: the L2 coefficient) and watch the right model deviate.
- *Concept made tangible:* The count-vs-gradient-descent equivalence — the single most important pedagogical moment of the module.
- *Beats slider+figure how:* The two sides of an identity  counts` ≡ `argmin NLL`) are simultaneously visible and *visibly converging*. The learner doesn't read the claim — they watch the claim happen.
- *Prior art:* Karpathy makemore Part 1 notebook (the side-by-side matshow). MIT licensed, [ADAPT]. https://github.com/karpathy/nn-zero-to-hero/blob/master/lectures/makemore/makemore_part1_bigrams.ipynb

**3. `temperatureBars`**
- *Direct manipulation:* Bar chart of the categorical P over 27 chars for some fixed context. The learner grabs the *top of any bar* and drags it up/down — i.e., directly edits the logits. Or they grab a "T" handle on the side and squeeze/stretch the *whole distribution* (T affects the bars' relative heights, not their order). A "sample 100" button drops 100 dots into bins below the bars to show empirical match.
- *Concept made tangible:* `temperature` reshapes a distribution without changing its ranking.
- *Beats slider+figure how:* The probability vector is the mathematical object; the learner is grabbing bar tops, not a number label" Empirical histogram below makes sampling concrete (fixes misconception #11).
- *Prior art:*
  - Andreban temperature/top-k visualizer (top-10 GPT-2 tokens, slider-driven) https://andreban.github.io/temperature-topk-visualizer/ ([REFERENCE-ONLY])
  - Transformer Explainer (PoloClub) — temperature animation on next-token bars https://poloclub.github.io/transformer-explainer/ (MIT, [ADAPT] for inspiration)
  - Hugging Face "How to generate" blog plot of P after temperature https://huggingface.co/blog/how-to-generate ([REFERENCE-ONLY])

**4. `embeddingPluck`**
- *Direct manipulation:* The 27×d embedding matrix C is rendered as 27 small 2D dots (after PCA from learned d). The learner clicks a token to "pluck" its embedding row — that row highlights and shows up as a draggable point. Dragging the point to a new location *physically* changes C[i] and the loss bar at the bottom updates in real time. A second tab shows the same C as a 27×d matrix grid the learner can edit cell-wise.
- *Concept made tangible: embedding of token i is row i of C, and C is just learned parameters" — exactly the framing that demystifies the embedding matrix.
- *Beats slider+figure how:* The learner moves the embedding *of a specific token* and sees the loss respond. The widget exposes that an embedding is a vector, that the matrix is its container, and that gradient descent moves these dots around in space.
- *Prior art:*
  - TensorFlow Embedding Projector https://projector.tensorflow.org/ (Apache 2.0; [ADAPT] for inspiration but heavyweight)
  - Karpathy makemore Part 2 — character embedding scatter plot https://github.com/karpathy/nn-zero-to-hero (MIT, [ADAPT])

**5. `mlpContextDial`**
- *Direct manipulation:* The Bengio-style MLP rendered as an explicit boxes-and-arrows diagram with k slots for the input context. The learner can *grab the rightmost slot and pull right* to add slots — but as they pull, the parameter-count counter (W₁'s shape) climbs visibly, and the slot fills with grey bars showing how much harder it is training data dense. They can also click any slot and replace its token with another.
- *Concept made tangible:* `fixed-context-mlp` and `fixed-context-limit` — context costs you parameters, and beyond your window you're blind.
- *Beats slider+figure how:* The window length is a mathematical object on the diagram; the parameter cost is shown as a *consequence* of an action the learner took, not a number that changes when they move a slider.
- *Prior art:*
  - Bengio 2003 architecture diagram (Figure 1) https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf ([REFERENCE-ONLY])
  - Karpathy makemore Part 2 lecture, "MLP" diagram (MIT code; video [REFERENCE-ONLY]).

**6. `unrolledRNN`**
- *Direct manipulation:* The RNN drawn as one cell. The learner clicks "unroll" to literally pull the recurrence apart into T copies of the same cell with arrows linking h_{t-1}→h_t. They can scrub a "current timestep" cursor along the unrolled graph; the active cell highlights, h_t is shown as a small bar-vector that vly *replaces* h_{t-1}. They can click any timestep and "freeze" h_t to inspect it. A toggle "show backward pass" overlays red gradient arrows flowing back through every cell — making BPTT visibly the same chain rule from m12.
- *Concept made tangible:* `unrolling`, `bptt`, and `hidden-state-as-vector`. Three concepts, one widget.
- *Beats slider+figure how:* Every named object — cell, hidden vector, timestep, gradient path — is something the learner can grab, scrub, or toggle. The "is BPTT new?" question dies in 30 seconds because the learner sees ordinary backprop arrows on an ordinary feedforward graph.
- *Prior art:*
  - Goodfellow-Bengio-Courville Fig. 10.3 (the canonical unrolled RNN) https://www.deeplearningbook.org/slides/10_rnn.pdf ([REFERENCE-ONLY])
  - WilliamTheisen's RNN Architecture Visualizer https://ai.williamtheisen.com/rnn.html (no clear license, [REFERENCE-ONLY])
  - Distill: "Visualizing memorization in RNNs" by Madsen — connectivity heatmap https://distill.pub/2019/memorization-i(CC BY 4.0, [ADAPT])

**7. `gradientDecay`**
- *Direct manipulation:* A horizontal track of T=30 boxes (timesteps). The learner grabs the spectral radius dial of W_h (a 2D Jacobian shown as ellipse the learner can stretch to ρ<1, ρ=1, ρ>1). The colored opacity of each timestep box visualizes ‖∂L_T/∂h_t‖ — the further left, the more faded for ρ<1, the more saturated for ρ>1 (until clipping kicks in). A "memory horizon" line marks the timestep where the gradient drops below 10⁻⁶.
- *Concept made tangible:* `vanishing-exploding`. The Jacobian's spectral radius is a mathematical object the learner deforms; the consequence (memory horizon) is the result.
- *Beats slider+figure how:* It's not "drag a slider, see number." It's "stretch the matrix's shape (a tangible Jacobian ellipse), watch which timesteps go dark." This is the canonical Distill-style visualization of contraction.
- *Prior art:*
  - Distill: "Visualizing memorization in RNNs" — gradient-magnitude heatmap https://distill.pub/20ns/ (CC BY 4.0, [ADAPT])
  - RNNbow paper https://arxiv.org/pdf/1907.12545 ([REFERENCE-ONLY])

---

### 5. Key formulas

**Chain rule of probability (sequence factorization)**
```latex
P(x_1, x_2, \ldots, x_T) = \prod_{t=1}^{T} P(x_t \mid x_1, \ldots, x_{t-1})
```

**Markov / n-gram approximation**
```latex
P(x_t \mid x_1,\ldots,x_{t-1}) \approx P(x_t \mid x_{t-n+1},\ldots,x_{t-1})
```

**Bigram MLE from counts (with add-one smoothing)**
```latex
\hat{P}(j \mid i) \;=\; \frac{N_{ij} + 1}{\sum_{k} N_{ik} + |V|}
```

**Softmax (numerically stable form)**
```latex
\mathrm{softmax}(\boldsymbol{\ell})_j = \frac{e^{\ell_j - m}}{\sum_{k} e^{\ell_k - m}}, \qquad m = \max_k \ell_k
```

**Negative log-likelihood (per-token, mean form)**
```latex
\mathcal{L} \;=\; -\frac{1}{T} \sum_{t=1}^{T} \log P_\theta(x_t \mid \mathrm{context}_t)
```

**Perplexity**
```latex
\mathrm{PPL} \;=\; \exp(\mathcal{L}) \;=\; \left(\prod_{t=1}^{T} P_\theta(x_t \mid \mathrm{context}_t)\right)^{-1/T}
```

**Temperature-scaled softmax**
```latex
P_T(j) = \frac{\exp(\ell_j / T)}{\sum_k \exp(\ell_k / T)}
```

**Top-k sampling (definition of the truncated distribution)**
```latex
\tilde{P}(j) = \begin{cases} P(j)/Z & \text{if } j \in \mathrm{top}_k(P) \\ 0 & \text{otherwise} \end{cases}, \quad Z = \sum_{j \in \mathrm{top}_k(P)} P(j)
```

**Bengio-2003 fixed-context MLP language model**
```latex
\mathbf{e}_t = [\,C[x_{t-n+1}];\, C[x_{t-n+2}];\, \ldots;\, C[x_{t-1}]\,]
```
```latex
\mathbf{h}_t = \tanh(W_1 \mathbf{e}_t + \mathbf{b}_1)
```
```latex
P_\theta(x_t \mid \mathrm{context}) = \mathrm{softmax}(W_2 \mathbf{h}_t + \mathbf{b}_2)
```

**Vanilla RNN cell**
```latex
\mathbf{h}_t = \tanh(W_x \mathbf{x}_t + W_h \mathbf{h}_{t-1} + \mathbf{b})
```

**RNN language-model output**
```latex
P_\theta(x_{t+1} \mid x_{1:t}) = \mathrm{softmax}(W_y \mathbf{h}_t + \mathbf{b}_y)
```

**BPTT — gradient of the shared recurrent weight**
```latex
\frac{\partial \mathcal{L}}{\partial W_h} \;=\; \sum_{t=1}^{T} \frac{\partial \mathcal{L}_t}{\partial W_h}, \qquad
\fra\partial \mathcal{L}_t}{\partial W_h} \;=\; \sum_{k=1}^{t} \frac{\partial \mathcal{L}_t}{\partial \mathbf{h}_t}\!\left(\prod_{j=k+1}^{t} \frac{\partial \mathbf{h}_j}{\partial \mathbf{h}_{j-1}}\right)\!\frac{\partial \mathbf{h}_k}{\partial W_h}
```

**Vanishing/exploding bound (intuition)**
```latex
\left\|\prod_{j=k+1}^{t} \frac{\partial \mathbf{h}_j}{\partial \mathbf{h}_{j-1}}\right\| \;\leq\; \rho(W_h)^{\,t-k} \cdot \prod_j \|\mathrm{diag}(\tanh'(\cdot))\|_\infty
```

---

### 6. Lesson decomposition

Module 14 splits into **6 lessons**, total ~6.5 hours of seat time.

#### Lesson 14.1 — "Predicting the next character"
*Summary:* Tokens, sequences, and why "the probability of a string" is a thing you can compute.
*Steps (10):*
1. *Prose+widget:* The corpus is just a list of names. Show the dataset (32K names from makemore).
2. *Prose:* Define `token-vocab`: 27 chars (a–z + `.`).
3. *Widget (bigramHeatmap, empty mode):* Type in `emma`, watch the bigram counts populate.
4. *Prose:* Why "probability of auence" needs the chain rule.
5. *StepCheck:* Compute P(`ad`) = P(a|.)·P(d|a)·P(.|d) given a small prefilled table. Expected scalar: 0.0083.
6. *Prose:* The Markov assumption — why we condition only on the previous token (for now).
7. *Widget (bigramHeatmap):* Drag your cursor along a row to inspect P(·|i). The row sums to 1.
8. *Prose:* The bigram model is **literally** this matrix.
9. *StepCheck:* For a 4-name corpus given on screen, what is P(`a`|`m`)? Expected: 0.5.
10. *Prose+callback:* "When you see a transformer compute attention weights, the same row-of-a-matrix-as-distribution intuition will return."
*Widgets:* `bigramHeatmap`. *Time:* ~50 min.

#### Lesson 14.2 — "Two paths to the same model"
*Summary:* Counts and gradient descent on a one-layer NN find the same bigram probabilities.
*Steps (12):*
1. *Prose:* Recap of `bigram-table` from 14.1.
2. *Prose:* Build a one-layer NN: onehot input × W → softmax. Same shape as the count table.
3. *Widget (bigramTwoWays, count side only):* Show couting from corpus.
4. *Widget (bigramTwoWays, both sides):* Press "Step." Both panels visible.
5. *Prose:* The loss is NLL. Define formally; relate to log-counts.
6. *StepCheck:* Initial loss before training? Expected: −log(1/27) ≈ 3.296.
7. *Widget:* Run 1000 steps. The right panel matches the left.
8. *Prose:* This is the **point**. Counting and SGD found the same MLE.
9. *Prose:* Smoothing in the count side ↔ L2 regularization in the SGD side.
10. *Widget:* Crank L2; watch the SGD model "smooth out."
11. *StepCheck:* Identify on a histogram which character pair has the smallest probability after smoothing. Expected: select the (q, q) cell.
12. *Prose+callback:* "When you train the transformer, you will literally be doing this: gradient descent on NLL of a softmax over next-token logits. This is that, with extra layers."
*Widgets:* `bigramHeatmap`, `bigramTwoWays`. *Time:* ~70 min.

#### Lesson 14.3 — "Loss, perplexity, and how to sample"
*Summary:* What the model thinks, in human-readable units; ao get text out of it.
*Steps (12):*
1. *Prose:* NLL recap. Why we work in log-space (avoid underflow).
2. *StepCheck:* Compute NLL of `ada` under the model from 14.2. Numeric.
3. *Prose:* Perplexity = exp(NLL). The branching-factor intuition.
4. *Widget (bigramHeatmap):* Compute PPL on a held-out word; show the formula assembled live.
5. *Prose:* Bounds: random model has PPL=|V|=27; perfect model has PPL=1.
6. *StepCheck:* Our trained bigram has loss 2.51. What's its perplexity? Expected: ≈12.3.
7. *Prose:* Sampling — categorical, greedy, and why greedy is bad on bigrams.
8. *Widget (temperatureBars):* Drag bar tops to make a custom logit; sample 100 times.
9. *Prose:* Temperature defined.
10. *Widget (temperatureBars):* T=0.1, T=1, T=10 — argmax doesn't change.
11. *Prose:* Top-k sampling — censoring the tail.
12. *StepCheck:* Given probs (0.5,0.3,0.15,0.05) and k=2, what does top-k normalize to? Expected: (0.625, 0.375, 0, 0).
*Widgets:* `temperatureBars`, `bigramHeatmap`. *Time:* ~60 min.

#### L.4 — "Why bigrams aren't enough"
*Summary:* The n-gram explosion, and the Bengio-2003 fix that replaces a giant table with a small MLP plus learned embeddings.
*Steps (11):*
1. *Prose:* The bigram model is dumb because it forgets everything except the last char. Show generated samples (`enny.`, `ax.`, `liona.`).
2. *Prose:* Trigram, quadrigram. The table is |V|^n.
3. *StepCheck:* For |V|=27, what's the size of a 5-gram table? Expected: 14,348,907.
4. *Prose:* Most cells are zero. Sparsity kills you.
5. *Prose:* The Bengio-2003 idea — concatenate embeddings, feed an MLP.
6. *Widget (mlpContextDial):* Pull the context window from k=1 to k=8; param count flashes.
7. *Prose:* The embedding matrix is just a learned lookup — row i = "vector for token i."
8. *Widget (embeddingPluck):* Pluck character embeddings; drag two vowels close in space.
9. *Prose:* Why this generalizes beyond the table — similar tokens get similar embeddings, similar contexts → similar predictions.
10. *StepCheck:* For |V|=27, emb d=10, context k=3, hidden h=200, |V|=27: number of parameters in W₁? Expected: 200×30 = 6000.
11. *Prose:* But we still have a fixed-size context window. We see 8 chars; we cannot see the 9th.
*Widgets:* `mlpContextDial`, `embeddingPluck`. *Time:* ~70 min.

#### Lesson 14.5 — "Carrying memory forward: the RNN"
*Summary:* A hidden state replaces the fixed window; the same cell runs at every step.
*Steps (12):*
1. *Prose:* Motivation — we want context that scales without exploding parameters.
2. *Prose:* Introduce h_t. It's a vector. It's all the model remembers.
3. *Prose:* The RNN cell formula: h_t = tanh(W_x x_t + W_h h_{t-1} + b).
4. *Widget (unrolledRNN, single-cell view):* Click x_t through `[a, b, c]`; watch h_t update.
5. *StepCheck:* Hand-trace one cell with given values (Ex 7 above). Expected h_t: (0.478, −0.040).
6. *Widget (unrolledRNN):* Press "unroll." The cell duplicates into T copies.
7. *Prose:* The same W_x, W_h are used at every step. **Weight sharing.**
8. *Prose:* The output: y_ax(W_y h_t).
9. *Prose:* The whole RNN-LM forward pass.
10. *StepCheck:* For h ∈ ℝ^{128}, |V|=27, parameter count of just W_y? Expected: 128×27 = 3456.
11. *Widget (hiddenStateOverwrite — sub-mode of unrolledRNN):* Scrub forward in time; watch h_t bar-by-bar overwrite h_{t-1}. (Kills misconception #5.)
12. *Prose:* Hidden state is just a vector that gets overwritten each step. There is no magic.
*Widgets:* `unrolledRNN`. *Time:* ~70 min.

#### Lesson 14.6 — "Training the RNN, and where it breaks"
*Summary:* BPTT is just backprop on the unrolled graph; vanishing/exploding gradients are the failure mode that motivates attention.
*Steps (13):*
1. *Prose:* Recap forward pass.
2. *Prose:* Loss is summed NLL across timesteps.
3. *Prose:* BPTT — unroll, then run m12 backprop.
4. *Widget (unrolledRNN, "show backward" mode):* Toggle red gradient arrows on top of the unrolled forward graph.
5. *Prose:* Shared weight ⇒ gradient is summed across timesteps. The formula in §5.
6. *StepCheck:* For T=3 unrollitive gradient terms contribute to ∂L/∂W_h? Expected: 6 (1+2+3).
7. *Prose:* The contraction problem — repeated multiplication by ∂h_t/∂h_{t-1}.
8. *Widget (gradientDecay):* Stretch the Jacobian ellipse; watch the memory horizon move.
9. *StepCheck:* If ρ=0.7 and the loss is at t=20, the gradient at t=0 has magnitude ~? Expected: 0.7²⁰ ≈ 8×10⁻⁴.
10. *Prose:* Exploding gradients — same mechanism, ρ>1. Standard fix is gradient clipping (callback m13).
11. *Prose:* The deeper failure: the bottleneck. Everything from t<T must fit in h_T.
12. *Prose:* Brief mention: LSTM/GRU exist, they patch this with gating; we are deliberately not teaching them, because attention solves the problem more cleanly.
13. *Endgame callback to m15.*
*Widgets:* `unrolledRNN`, `gradientDecay`. *Time:* ~65 min.

---

### 7. Problem bank

1. **(novice / computation / `bigram-table`, `nll-loss`)** Given the corpus `["bob","bab"]` and a `.` start/end token, build the bigram count matrix. *Answer:* The 5 nonzero pai)=1, (`b`,`a`)=1, (`b`,`.`)=2, (`o`,`b`)=1, (`a`,`b`)=1.

2. **(novice / computation / `bigram-table`)** Using the matrix from problem 1, what is P(`a`|`b`)? *Answer:* 1/4.

3. **(novice / computation / `nll-loss`)** Compute NLL (per character, mean form) of `bob` under the model from problem 1, treating `.bob.` as the actual sequence. *Answer:* −(log(2/4)+log(1/4)+log(1/2)+log(2/4))/4 ≈ 0.866.

4. **(intermediate / computation / `perplexity`)** Convert a per-token cross-entropy of 1.65 nats to perplexity. *Answer:* e^{1.65} ≈ 5.21.

5. **(novice / interpretation / `perplexity`)** Model A has PPL 14 on a held-out test set, model B has PPL 9 on the same set. Which is better and what does the difference mean intuitively? *Answer:* B; B behaves as if uncertain among ~9 next-token choices vs ~14 for A.

6. **(intermediate / computation / `temperature`)** Logits `(3, 1, 0)`. Compute the softmax at T=1 and at T=2. *Answer:* T=1: (0.844, 0.114, 0.042). T=2: (0.624, 0.230, 0.146).

7. **(intermediate / constr / `top-k-sampling`)** Probabilities `(0.4, 0.3, 0.15, 0.1, 0.05)`. Write the top-3 distribution. *Answer:* (0.471, 0.353, 0.176, 0, 0).

8. **(intermediate / debugging / `nll-loss`, m13-callback)** A learner reports an initial loss of 11.8 on a 27-token vocabulary bigram NN. Diagnose. *Answer:* Expected initial loss ≈ −log(1/27) = 3.30. Loss of 11.8 means the output layer is mis-initialized to confidently wrong predictions; rescale W₂'s init or zero its bias.

9. **(intermediate / proof-scaffold / `count-vs-gd-equivalence`)** Show that minimizing NLL on a one-layer onehot→softmax model with parameters W ∈ ℝ^{|V|×|V|} yields softmax(W[i]) = N[i,·]/∑N[i,·]. *Answer scaffold:* Set ∇_{W[i,j]} L = 0; with onehot input the gradient decouples per row; the resulting equation is exp(W[i,j])/∑_k exp(W[i,k]) = N[i,j]/∑_k N[i,k].

10. **(intermediate / computation / `embedding-matrix`, `fixed-context-mlp`)** Bengio MLP: |V|=10000, d=30, context k=4, hidden h=100. How many parameters in (a) C, (br:* (a) 10000×30=300,000; (b) 100×120=12,000; (c) plus W₂ (10000×100=1,000,000) and biases (100+10000), total ≈1,322,100.

11. **(intermediate / interpretation / `fixed-context-limit`)** Why does increasing context window from k=4 to k=8 not actually let an MLP "see arbitrary distance back"? *Answer:* The window is fixed at 8. Tokens 9 steps back are invisible to the model regardless of how much we increase its parameter count within the window.

12. **(intermediate / construction / `rnn-cell`)** Write out the forward pass of one RNN timestep with x_t ∈ ℝ³ = (1,0,0), h_{t-1} = (0.2, 0.1), W_x = [[1,2,3],[0,1,0]], W_h = [[0.5,0],[0,0.5]], b = (0,0). Compute h_t. *Answer:* W_x x_t = (1,0); W_h h_{t-1} = (0.1, 0.05); pre-activation (1.1, 0.05); h_t = tanh = (0.800, 0.050).

13. **(intermediate / computation / `unrolling`)** For an RNN unrolled to T=4, how many distinct copies of the cell appear in the unrolled forward graph, and how many distinct W_h tensors does the optimizer update? *Answer:* 4 cd; 1 W_h tensor (weights are shared).

14. **(advanced / construction / `bptt`)** Derive ∂L/∂W_x for a 2-step RNN with one tanh cell and softmax output, given losses L₁, L₂. *Answer:* ∂L/∂W_x = ∂L₁/∂h₁ · diag(1−h₁²) · x₁ᵀ + ∂L₂/∂h₂ · diag(1−h₂²) · (x₂ᵀ + W_h · ∂h₁/∂W_x ); first term is the "current-step" contribution, second has a recursive piece.

15. **(advanced / interpretation / `vanishing-exploding`)** Given a vanilla RNN with W_h initialized so that its largest singular value σ₁ = 0.6, after how many steps does the gradient norm contract by a factor of 1000? *Answer:* 0.6^n ≤ 10⁻³ ⇒ n ≥ log(10⁻³)/log(0.6) ≈ 13.5; so by ~14 timesteps.

16. **(advanced / debugging / `vanishing-exploding`)** A learner trains a 50-step RNN and observes that loss plateaus around the unigram baseline. They double the hidden size and add more layers; nothing changes. Diagnose. *Answer:* The capacity wasn't the bottleneck; gradients aren't reaching earlRNN constraints): better init of W_h (orthogonal, identity-scaled), gradient clipping for the exploding case, shorter truncated-BPTT windows. Real cure: switch to attention (m15).

17. **(advanced / computation / `sequential-bottleneck`)** An RNN with hidden size d=128 must encode a 1000-token paragraph and answer a question about token 1. What's the information-theoretic upper bound on what h_{1000} can preserve about token 1, in bits, assuming float32? *Answer:* Loose upper bound: 128×32=4096 bits of state, but most must encode tokens 2..1000 too; the share for token 1 is best-case 4096/1000 ≈ 4.1 bits — already below log₂(27) ≈ 4.75. Practical answer: information about token 1 is overwritten long before t=1000.

18. **(advanced / proof-scaffold / `chain-rule-prob`, `perplexity`)** Show that perplexity is invariant to grouping: PPL of the same string under per-character and per-bigram-token factorization gives the same joint probability. *Answer scaffold:* Both factorizations equal P(x_{1:T}); pePL differs (it's a geometric mean over different counts) but the joint probability and joint log-likelihood are invariant.

19. **(intermediate / construction / `categorical-sampling`, `temperature`)** In Python-pseudocode, write `sample_with_temperature(logits, T)` using only `np.exp`, `np.cumsum`, and `np.random.uniform`. *Answer:* `p = np.exp((logits - logits.max())/T); p /= p.sum(); return np.searchsorted(np.cumsum(p), np.random.uniform())`.

20. **(advanced / debugging / `unrolling`, `bptt`)** In a hand-implemented RNN, the learner zero-initializes W_h's gradient buffer at every timestep instead of every minibatch. What goes wrong? *Answer:* Per-timestep zeroing throws away the cross-timestep gradient sum; the optimizer sees only the last timestep's contribution to ∂L/∂W_h. The model cannot learn dependencies that span more than one step. Fix: zero only at the start of each forward+backward pass over a sequence.

---

### 8. Endgame callback — refined

The starter version is good. Three sharper atives:

1. **(literal mechanism)** "An RNN has to compress everything it has read into one vector and re-decide what to remember at every step. Attention skips the compression — it just keeps the past around and learns where to look."
2. **(narrative spine)** "We started with a table that knew one character of context, expanded it to a window of k characters, then to a vector that — in theory — carries everything. In practice it carries about ten characters before fading. Next, we stop trying to carry the past and learn to query it instead."
3. **(motivational)** "Every time the RNN takes a step, it makes a fateful decision: what to keep, what to forget. Attention refuses to make that decision early. It keeps the whole past indexable and lets the model decide what mattered only when the answer is needed."

**Recommendation:** use option 2. It explicitly traces the module's spine (table → window → vector → fading), which is what the entire module has built up to, and the contrast with attention furally.

---

### 9. Sources (licensing-aware)

1. **Karpathy, A. — `nn-zero-to-hero` lecture notebooks (`makemore_part1_bigrams.ipynb`, `makemore_part2_mlp.ipynb`, `makemore_part4_backprop.ipynb`).** GitHub repo, MIT-licensed Python source. https://github.com/karpathy/nn-zero-to-hero — **[ADAPT]** for the canonical bigram-counts → bigram-NN equivalence, the Bengio-style MLP build, and BPTT from scratch. Reuse algorithms and structure with attribution; do not reproduce the videos.

2. **Karpathy, A. — `makemore` repository.** GitHub repo, MIT-licensed Python; contains a vanilla RNN implementation we can directly port. https://github.com/karpathy/makemore — **[ADAPT]** for our in-browser RNN training widget logic.

3. **Karpathy, A. — "Building makemore" lecture series (videos, parts 1–5).** YouTube. https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ — **[REFERENCE-ONLY]** as our pedagogical north star (counting first, then SGD; embedding-as-lookup; the "two paths" framithy, A. — "The Unreasonable Effectiveness of Recurrent Neural Networks" blog post and `min-char-rnn.py` gist.** http://karpathy.github.io/2015/05/21/rnn-effectiveness/ and https://gist.github.com/karpathy/d4dee566867f8291f086 — Blog + gist with no explicit reuse license stamped on either page. **[REFERENCE-ONLY]** for the worked RNN example, hand-trace, and the "hello" demo. Re-implement from scratch.

5. **Madsen, A. — "Visualizing memorization in RNNs," Distill, 2019.** https://distill.pub/2019/memorization-in-rnns/ — Distill articles are CC BY 4.0. **[ADAPT]** for the gradient-magnitude visualization style backing the `gradientDecay` widget. Also useful as the only Distill piece directly on vanilla-RNN behavior.

6. **Olah, C. & Carter, S. — "Attention and Augmented Recurrent Neural Networks," Distill, 2016.** https://distill.pub/2016/augmented-rnns/ — CC BY 4.0. **[ADAPT]** for the rolled/unrolled RNN diagram aesthetic and as the natural transition piece into m15. Useful for `unrolledRNN`.

 Y., Ducharme, R., Vincent, P., Jauvin, C. — "A Neural Probabilistic Language Model," JMLR 3, 2003.** https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf — Academic paper, all rights reserved. **[REFERENCE-ONLY]** as the canonical citation for the Lesson 14.4 architecture; reproduce the architecture diagram in our own house style rather than copying the figure.

8. **Goodfellow, I., Bengio, Y., Courville, A. — *Deep Learning*, Chapter 10 "Sequence Modeling."** https://www.deeplearningbook.org/ — Online but not openly licensed. **[REFERENCE-ONLY]** for the formal BPTT derivation and the canonical unrolled-RNN figure (Fig. 10.3) as a teaching reference. Re-derive in our own notation; do not embed figures.

9. **Stanford CS224N — Lecture notes on Language Models and RNNs (e.g., 2019 notes 05).** https://web.stanford.edu/class/cs224n/readings/cs224n-2019-notes05-LM_RNN.pdf — Stanford educational materials, no OSS license. **[REFERENCE-ONLY]** for the backprop-through-time derivation, gradieniscussion, and the formal RNN-LM treatment.

10. **Setosa.io — "Markov Chains, explained visually" (Powell & Lehe).** https://setosa.io/ev/markov-chains/ — No explicit license posted on the page; treat as all-rights-reserved. **[REFERENCE-ONLY]** as the gold-standard prior art for the `bigramHeatmap` widget's transition-matrix-as-graph framing. Re-implement from scratch in Svelte+Mafs.

11. **Andreban — Temperature & top-k visualizer.** https://andreban.github.io/temperature-topk-visualizer/ — License unstated. **[REFERENCE-ONLY]** for `temperatureBars` widget UX inspiration.

12. **Wang, Z. et al. — "Transformer Explainer," PoloClub, 2024.** https://poloclub.github.io/transformer-explainer/ — MIT-licensed (per the project's typical Polo Club terms; verify before adapting). **[ADAPT]** with attribution for next-token bar visualization patterns; useful prior art that bridges into m15.

---

### 10. Pedagogical traps

1. **Jumping to RNNs before learners feel n-gram pain.** *Why it happens:* RNNs iting" topic, and instructors fast-forward past tables. *Mitigation:* Lessons 14.1–14.4 deliberately spend half the module on bigrams and the Bengio MLP. The `mlpContextDial` widget makes the parameter-explosion visceral so the learner *demands* a recurrent solution before we offer one. Do not introduce the RNN cell until the n-gram explosion has been the punchline of a StepCheck (problem 10).

2. **BPTT taught as algebra rather than as "unroll and apply m12."** *Why it happens:* Most textbook treatments derive the BPTT gradient symbolically with subscripts upon subscripts, which buries the fact that the algorithm is the same backprop the learner already knows. *Mitigation:* Lesson 14.6's `unrolledRNN` widget literally unrolls the recurrence into a feedforward graph and overlays the m12 backward arrows. The phrase "BPTT is just backprop on the unrolled graph plus a sum across timesteps" appears verbatim three times in the lesson copy and once in the StepCheck explanations.

3. **Sampling temperature introced as a number with vague semantics.** *Why it happens:* Most blog posts use the word "creativity" and move on. *Mitigation:* Never introduce temperature as a number. Introduce it only via the `temperatureBars` widget where the learner *physically* squeezes the distribution. The first StepCheck on temperature (problem 6) demands a numeric softmax computation at two temperatures — i.e., they have to do the math, not just feel the metaphor.

4. **The hidden state treated as mystical "memory."** *Why it happens:* Marketing language calls it memory; tutorials draw it as a fuzzy cloud labeled "state." *Mitigation:* Always render h_t as a concrete bar-vector. The `hiddenStateOverwrite` sub-mode of `unrolledRNN` shows h_t **literally replacing** h_{t-1} bar by bar. The lesson copy enforces the framing: "h_t is just an activation vector. The only thing that makes it 'memory' is the wire connecting it back into the next step."

5. **Hand-waving past softmax numerical stability.** *Why it happens:* In a lesson foced on language models, softmax math is "old material." *Mitigation:* The very first StepCheck in 14.2 asks for the initial loss as −log(1/27); this primes the learner to think in log-space. Problem 8 in the bank forces them to debug a confidently-wrong-init loss. Always present softmax with the m-subtraction stabilizer in the LaTeX.

6. **Letting "RNNs are bad, attention is good" become the takeaway, before learners *understand* what RNNs are doing.** *Why it happens:* Module 15 is exciting, and this module is "the prelude." *Mitigation:* The endgame callback explicitly frames the bottleneck as a *named, technical* failure mode (`sequential-bottleneck`), not a vague "RNNs are old." Problem 17's information-theoretic bound forces the learner to *quantify* the bottleneck. The lesson refuses to hand-wave: by the end of 14.6, the learner knows exactly what an RNN forgets and why, so attention next module lands as a specific fix to a specific problem rather than a magic upgrade.

7. **Quietly teaching LSTM-flared intuitions while officially "only doing vanilla RNN."** *Why it happens:* It's hard to discuss vanishing gradients without saying "this is why LSTMs were invented." *Mitigation:* When LSTMs/GRUs come up, explicitly frame them as "a different fix to the same problem we're about to solve with attention. We are deliberately skipping them." Do not show LSTM equations or cell diagrams. The constraint is in service of the bigram → context → recurrence → bottleneck → attention spine — keep it pure.
