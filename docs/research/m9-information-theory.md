# Tinker Module 9: Information Theory: Research Brief

## 1. CONCEPT DEPENDENCY GRAPH

1. `surprise-as-rarity`: Qualitative idea that rare outcomes carry more "news" than common ones. *Prereqs:* m8-probability (pmfs).
2. `information-content`: `I(x) = −log P(x)`, the bits/nats of a single outcome. *Prereqs:* `surprise-as-rarity`, m5-calculus (logs).
3. `log-base-and-units`: Choosing base 2 → bits, base e → nats, base 10 → bans; same quantity, different units (a unit conversion factor of `ln 2 ≈ 0.693`). *Prereqs:* `information-content`.
4. `nats-convention`: Modern ML defaults to nats (because `log` in NumPy/PyTorch is natural), while perplexity hides the base by exponentiating with the same base used in the loss. *Prereqs:* `log-base-and-units`.
5. `entropy-as-expected-surprise`: `H(P) = E_P[−log P(X)] = −Σ P(x) log P(x)`. *Prereqs:* `information-content`, m8-probability (expectation).
6. `entropy-of-canonical-pmfs`: Uniform on K → `log K` (max), one-hot → 0 (min); the binary-entropy curve peaked at p = 1/2. *Prereqs:* `entropy-as-expected-surprise`.
7. `entropy-as-uncertainty`: Entropy is a number attached to a distribution, not to any single outcome; it measures "how spread out is P." *Prereqs:* `entropy-as-expected-surprise`.
8. `entropy-is-concave`: H is a concave function of the pmf (mixing two pmfs never decreases entropy). Used as a sanity check on the shape of the binary-entropy curve. *Prereqs:* `entropy-as-expected-surprise`.
9. `cross-entropy`: `H(P, Q) = −Σ P(x) log Q(x)`: the average surprise you actually suffer when the truth is P and your code/model is Q. *Prereqs:* `entropy-as-expected-surprise`.
10. `gibbs-inequality`: `H(P, Q) ≥ H(P)` with equality iff `P = Q`. *Prereqs:* `cross-entropy`.
11. `kl-divergence`: `D_KL(P‖Q) = H(P, Q) − H(P) = Σ P(x) log(P(x)/Q(x))`: the excess surprise cost of modeling P with Q. *Prereqs:* `cross-entropy`, `gibbs-inequality`.
12. `kl-properties`: Non-negative, zero iff `P = Q`, asymmetric, no triangle inequality, infinite when Q has zeros where P does not. *Prereqs:* `kl-divergence`.
13. `forward-vs-reverse-kl`: Preview-only intuition: `D_KL(P‖Q)` is mass-covering ("mean-seeking"), `D_KL(Q‖P)` is mode-seeking; ML training uses the forward direction because that is what falls out of MLE. *Prereqs:* `kl-properties`.
14. `xent-equals-mle`: Minimizing `H(P̂_data, Q_θ)` over θ is exactly `argmin −(1/N) Σ log Q_θ(x_i)`, i.e. maximum likelihood. This is the m8 callback. *Prereqs:* `cross-entropy`, m8-probability (MLE).
15. `one-hot-collapse`: When the target P is one-hot on class y, `H(P, Q) = −log Q(y)`. The cross-entropy loss for classification is just NLL of the true class. *Prereqs:* `cross-entropy`, `xent-equals-mle`.
16. `softmax-plus-nll`: The reason classification heads pair softmax (to produce a valid Q) with NLL (to score Q against the one-hot label) is `one-hot-collapse`. *Prereqs:* `one-hot-collapse`.
17. `perplexity`: `PPL = exp(H(P, Q))` (or `b^H` in base b); the "effective branching factor" / geometric mean of `1/Q(x_true)`. *Prereqs:* `cross-entropy`, `one-hot-collapse`.
18. `perplexity-vs-loss-table`: A two-column mental table: NLL of 0 ↔ PPL 1; NLL of 1 nat ↔ PPL e ≈ 2.72; NLL of log K ↔ PPL K (uniform-baseline reading). *Prereqs:* `perplexity`.
19. `entropy-of-english`: Shannon (1951) bounded printed English at roughly 0.6–1.3 bits/char; modern estimates cluster near 1.0–1.3 bpc. This is a *floor* no model can break. *Prereqs:* `entropy-as-uncertainty`, `perplexity`.
20. `bpc-vs-nats`: Character-level: 1 bit/char ↔ ln 2 ≈ 0.693 nats/char ↔ perplexity 2. The conversion every paper assumes you know. *Prereqs:* `log-base-and-units`, `perplexity`.
21. `mutual-information-preview`: `I(X; Y) = H(X) − H(X | Y)`: how much knowing Y reduces uncertainty about X. Preview pointer to representation learning / InfoNCE; *no derivations in this module*. *Prereqs:* `entropy-as-uncertainty`.
22. `scope-of-shannon-in-ml`: Channel coding, source coding, and rate-distortion exist and are real, but they are not load-bearing. Cross-entropy and perplexity carry 95% of the weight. *Prereqs:* `cross-entropy`, `perplexity`.

---

## 2. CANONICAL WORKED EXAMPLES

**E1. Information content of two coin events.**
*Statement:* For a fair coin, compute `I(H)` in bits. For a biased coin with `P(H) = 0.99`, compute both `I(H)` and `I(T)`.
*Solution:* Fair: `I(H) = −log₂(0.5) = 1` bit. Biased: `I(H) = −log₂(0.99) ≈ 0.0145` bit; `I(T) = −log₂(0.01) ≈ 6.64` bit.
*Point:* Surprise is unbounded above and bounded below by 0; a near-certain event carries almost no information, a near-impossible one carries a lot.
*Common mistake:* Treating I(x) as a property of the *coin* rather than of the *outcome*; reporting "the information of the coin is X bits" without averaging.

**E2. Entropy of Bernoulli(p) over p ∈ [0, 1].** (The canonical "binary entropy curve", appears in Cover & Thomas Ch. 2, MacKay Ch. 2, MML §6.7, and the colah essay.)
*Statement:* Plot `H₂(p) = −p log₂ p − (1−p) log₂(1−p)`. Find the maximizer.
*Solution:* `dH/dp = log₂((1−p)/p) = 0 ⇒ p = 1/2`, `H₂(1/2) = 1` bit; `H₂(0) = H₂(1) = 0` (using the convention `0 log 0 := 0`).
*Point:* Entropy is maximized by the most uncertain pmf and vanishes at certainty. The curve is concave and symmetric about 1/2.
*Common mistake:* Writing `0 log 0` and getting NaN; not knowing the limiting convention.

**E3. Maximum-entropy distribution on K outcomes.**
*Statement:* Show that the uniform pmf maximizes entropy over a finite alphabet of size K, and compute that maximum.
*Solution:* By Jensen's inequality applied to the concave function `−x log x`, or by Lagrange multipliers on `−Σ pᵢ log pᵢ` subject to `Σ pᵢ = 1`: `pᵢ = 1/K` for all i. Maximum is `log K`.
*Point:* "Maximum uncertainty over K options" has a number attached to it: `log K`. This is the ceiling perplexity for a vocabulary of K tokens.
*Common mistake:* Forgetting the `Σ pᵢ = 1` constraint and concluding `pᵢ = 0` (which would actually *minimize* the unconstrained Lagrangian but isn't a valid pmf).

**E4. Cross-entropy of two Bernoullis.** (The "two-coin" example used to motivate KL in Cover & Thomas, MacKay, and Goodfellow et al. Ch. 3.)
*Statement:* Let `P = Bernoulli(0.5)`, `Q = Bernoulli(0.9)`. Compute `H(P, Q)`, `H(Q, P)`, `H(P)`, `H(Q)`, `D_KL(P‖Q)`, `D_KL(Q‖P)`.
*Solution (bits):* `H(P) = 1`. `H(Q) = H₂(0.9) ≈ 0.469`. `H(P, Q) = −0.5 log₂(0.9) − 0.5 log₂(0.1) ≈ 1.737`. `H(Q, P) = −0.9 log₂(0.5) − 0.1 log₂(0.5) = 1`. `D_KL(P‖Q) ≈ 0.737`, `D_KL(Q‖P) ≈ 0.531`. Both KLs are positive; they are unequal.
*Point:* Cross-entropy is always ≥ entropy of the true distribution; KL is non-symmetric; the gap equals KL.
*Common mistake:* Believing `D_KL(P‖Q) = D_KL(Q‖P)` by analogy with Euclidean distance.

**E5. Shannon's "race" with a known horse.** (Cover & Thomas §2.6, MML §6.4.)
*Statement:* Four horses race with true win probabilities `(1/2, 1/4, 1/8, 1/8)`. (a) What is the entropy in bits? (b) What is the average codeword length of an optimal prefix code for outcomes drawn from this distribution? (c) If you instead used a code optimized for a *uniform* belief, what is your average codeword length?
*Solution:* `H = 1/2·1 + 1/4·2 + 1/8·3 + 1/8·3 = 1.75` bits. Optimal prefix code achieves exactly 1.75 (codewords of length 1, 2, 3, 3). Uniform-code length = 2 bits per outcome. The gap, 0.25 bit, equals `D_KL(true ‖ uniform)`.
*Point:* Cross-entropy = optimal-length-for-Q applied to truth-P; KL = excess bits charged for the wrong code.
*Common mistake:* Treating the gap as random rather than as exactly the KL divergence.

**E6. One-hot collapse.** (Karpathy's makemore part 2; PyTorch CrossEntropyLoss documentation.)
*Statement:* A 26-way classifier outputs softmax probabilities `q = (q_a, q_b, …, q_z)`. The true label is `e`. Write the cross-entropy loss in two forms and simplify.
*Solution:* Full form: `H(p, q) = −Σ pᵢ log qᵢ`. With `p` one-hot on `e`: only the `i = e` term survives. Loss = `−log q_e`. This is also the negative log-likelihood `−log P_model(e)`.
*Point:* Classification cross-entropy is "the negative log probability your model gave to the right answer." There is nothing else in the sum.
*Common mistake:* Computing all 26 `qᵢ log qᵢ` terms (which would be `H(q)`, the model's own entropy, not the loss).

**E7. Perplexity of a uniform language model.**
*Statement:* A character-level model assigns uniform probability `1/27` to each of the 26 lowercase letters plus space. What is its NLL per character in nats, and its perplexity?
*Solution:* `NLL = −log(1/27) = log 27 ≈ 3.296` nats. `PPL = exp(NLL) = 27`. (In bits: `log₂ 27 ≈ 4.755` bpc, same perplexity.)
*Point:* A uniform model on K symbols has perplexity exactly K. Perplexity below K is the only evidence that your model learned anything beyond counting symbols.
*Common mistake:* Reporting different perplexities for the bit-version and nat-version of the same model. Perplexity is base-invariant.

**E8. Perplexity arithmetic on tiny-shakespeare.** (The m18 capstone scenario.)
*Statement:* A character model is trained on tiny-shakespeare (vocab = 65 unique characters). At init, val NLL ≈ `log 65 ≈ 4.174` nats. After training, val NLL ≈ 1.5 nats. Compute initial and final perplexity. Compute initial and final bits/character. How close is the final number to Shannon's English-entropy floor?
*Solution:* Initial PPL ≈ 65; final PPL = `e^1.5 ≈ 4.48`. Bits/char: initial ≈ 6.02 bpc, final ≈ `1.5 / ln 2 ≈ 2.16` bpc. Shannon's bound is ≈ 1.0–1.3 bpc, so the model still has roughly 0.9 bpc of slack, a small transformer on a tiny corpus has not yet reached the language's intrinsic floor.
*Point:* The training curve is a *finite race toward a known number*. This is the most important number in the entire module.
*Common mistake:* Forgetting that Shannon's bound is for *unconstrained English*, while tiny-shakespeare is Shakespearean English (probably slightly lower entropy because of stylistic regularity).

**E9. Cross-entropy = MLE.** (Goodfellow et al. §5.5, MML §8.2.)
*Statement:* You have data `{x₁, …, x_N}` drawn i.i.d. from unknown P. The empirical distribution is `P̂(x) = (1/N) Σ 𝟙[xᵢ = x]`. Show `argmin_θ H(P̂, Q_θ) = argmax_θ Σᵢ log Q_θ(xᵢ)`.
*Solution:* `H(P̂, Q_θ) = −Σ_x P̂(x) log Q_θ(x) = −(1/N) Σᵢ log Q_θ(xᵢ)`. Negating and removing the constant `1/N` gives the log-likelihood. The argmin/argmax pair is identical.
*Point:* The two ideas are the same idea wearing different hats. Information theory gives MLE its "loss" interpretation; MLE gives cross-entropy its "training objective" interpretation.
*Common mistake:* Treating cross-entropy and MLE as related-but-distinct, leading to "should I use NLL or cross-entropy?" Stack Overflow questions.

**E10. Sanity-check on KL asymmetry.**
*Statement:* `P = (0.5, 0.5)`, `Q = (0.99, 0.01)`. Compute `D_KL(P‖Q)` and `D_KL(Q‖P)` in nats. Now swap to `Q = (1.0, 0.0)`. What happens?
*Solution:* First case: `D_KL(P‖Q) = 0.5 ln(0.5/0.99) + 0.5 ln(0.5/0.01) ≈ 1.617`; `D_KL(Q‖P) = 0.99 ln(0.99/0.5) + 0.01 ln(0.01/0.5) ≈ 0.636`. Second case: `D_KL(P‖Q) = 0.5 ln(0.5/0) = ∞`. `D_KL(Q‖P) = ln 2 ≈ 0.693` (using `0 log 0 = 0`).
*Point:* `D_KL(P‖Q) = ∞` whenever Q assigns probability 0 to something P does not, this is exactly why label smoothing exists.
*Common mistake:* Concluding "KL is broken" rather than "this is what KL is telling you about the modeling choice."

---

## 3. COMMON MISCONCEPTIONS

1. **"Entropy is a property of an outcome."** Natural because the word "surprise" sounds like it attaches to events. *Kill it:* On the canvas, click any single bar of the pmf, its height gives `−log P(x)`, the *outcome's* information; H(P) is the area-weighted average, the property of the *whole* distribution. Show one-hot pmf vs uniform pmf side-by-side: same individual bars in the uniform case (all = log K), but H is K-fold larger when there are K of them.

2. **"Entropy means disorder, like in thermodynamics."** Adult learners with physics half-remembered import second-law connotations. *Kill it:* State the operational definition: H is the average length, in bits, of the shortest possible encoding of samples from P. No thermodynamics. The thermodynamic and information entropies *are* mathematically related (Jaynes, 1957) but the lesson does not depend on that and adult learners get confused if you mention it.

3. **"Cross-entropy is a distance between two distributions."** Encouraged by sloppy blog posts. *Kill it:* Compute `H(P, P)` and show it equals `H(P) > 0` in general. Distances are 0 when the arguments are equal; cross-entropy is not. The "distance-like" object is KL, and even *it* is not a true distance.

4. **"KL divergence is symmetric / is a metric."** Comes from the word "distance" appearing in nearly every popular article. *Kill it:* The two-Bernoulli computation in E10. Then explicitly note: triangle inequality fails too. Use "divergence," not "distance," forever after.

5. **"You should never get a cross-entropy below the true entropy."** Confuses the population-level inequality with finite-sample empirical loss. *Kill it:* On a finite sample, training loss *can* drop below the population entropy, that is overfitting. The inequality `H(P, Q) ≥ H(P)` holds for the *true* P, not the empirical P̂.

6. **"Perplexity is a percentage."** Because it looks like a number between 1 and ~100. *Kill it:* Show a uniform 50000-vocab model: perplexity = 50000. Show GPT-2 small on WikiText: PPL ≈ 35. Perplexity has units of "effective tokens," not percent.

7. **"Lower-base log makes loss smaller and therefore better."** Confuses units with quality. *Kill it:* Same model, computed in bits vs nats: numbers differ by `ln 2`, but `exp(loss)` and `2^(loss_in_bits)` give the same perplexity. The choice of base is a unit choice, like Celsius vs Fahrenheit.

8. **"Softmax exists so probabilities sum to 1."** True but missing the point. *Kill it:* Softmax exists because cross-entropy needs a valid Q, and `softmax(logits)` is the differentiable map from arbitrary real vectors to the probability simplex that makes the NLL gradient with respect to logits especially clean: `∂L/∂z_i = q_i − p_i`. Show this derivation once, the gradient pops out almost magically.

9. **"Information theory is about channels and Wi-Fi."** True historically, but it leaves adult learners wondering why they are studying it for ML. *Kill it:* State up front that for this course, "information theory" is a small subset, entropy, cross-entropy, KL, perplexity, and that channel coding, Hamming codes, rate-distortion are explicitly out of scope. Name what is in the room and what is not.

10. **"Cross-entropy loss is fundamentally a `−Σ p log q` calculation per example, so I should be summing 26 terms per MNIST example."** Comes from rote-memorizing the formula. *Kill it:* The one-hot collapse from E6. The PyTorch `F.cross_entropy(logits, target_idx)` API where `target_idx` is a single integer drives this home, you pass *the index*, not the one-hot vector, because the formula collapses to one term.

11. **"Shannon's 1.3 bpc bound means no model can ever get NLL below 1.3 bpc on character-level English."** Two confusions: (a) it's a bound on a model of *general English*, not on your training corpus's empirical entropy, and (b) the bound itself is contested (Cover & King 1978 say ≈1.25 bpc, Brown et al. 1992 give 1.75 bpc as upper bound from a trigram, modern neural LMs report ≈1.0 bpc on enwik8). *Kill it:* Treat 1.0–1.3 bpc as a *zone*, neither model nor experiment has pinpointed it. A model can drop *below* Shannon's 1951 *upper bound* of 1.3 bpc; it cannot drop below the *true* unknown entropy, which is somewhere ≤ 1.3.

12. **"Mutual information is just correlation."** Tempting because both measure "relatedness." *Kill it:* One sentence + one picture: correlation captures linear dependence, MI captures *any* statistical dependence including non-monotonic ones (e.g., `Y = X²` for X uniform on [−1, 1] has zero correlation but nonzero MI). Then say: that's all you need for now; we'll see this in m14/m16.

---

## 4. INTERACTIVE WIDGET SUGGESTIONS

### `pmfSurpriseLab`
**User manipulates directly:** The heights of K bars in a histogram (the pmf itself), by dragging their tops. Bars auto-renormalize so the total stays at 1 (drag one bar up, the others shrink proportionally; an explicit normalization-mode toggle lets the user instead use a pinch-and-pull "mass transfer" between two specific bars).
**Live updates:** (a) A second panel renders `−log₂ P(xᵢ)` as a parallel set of bars (the *surprise* for each outcome), getting taller as the corresponding pmf bar gets shorter; (b) a single readout showing `H(P)` numerically; (c) a stacked-area visualization where the area of each rectangle is `P(xᵢ) · (−log P(xᵢ))`: total shaded area = entropy.
**Concept it makes tangible:** Entropy is *the area under the contribution curve*, and it tradeoffs: making one outcome rarer increases its individual surprise but also reduces how often you suffer that surprise.
**Why it beats a slider:** The learner is *holding the distribution*. The surprise bars and entropy area update in the same frame; the cause-and-effect is direct visual coupling. A slider on "p" would only let you bend a Bernoulli; here you can construct asymmetric K-way distributions and *see* that uniformity maximizes the area.
**Prior art:** Distill "Visual Information Theory" code structure (`distill.pub/2017/`), colah's stacked-area entropy diagrams (`colah.github.io/posts/2015-09-Visual-Information/`), Setosa's binomial visualization at `setosa.io/ev/`.

### `crossEntropyDuel`
**User manipulates directly:** Two pmfs on the same K-outcome alphabet, P (the "truth," dark blue) and Q (the "model," orange), each by dragging bars. There is also a "lock P" toggle so the learner can freeze the truth and only move Q.
**Live updates:** (a) Three running totals, `H(P)`, `H(P, Q)`, `D_KL(P‖Q) = H(P, Q) − H(P)`: displayed as nested bars (KL is the *gap* between cross-entropy and entropy, rendered as an actual visible gap); (b) a "swap P ↔ Q" button that flips the roles and recomputes, letting the learner see asymmetry; (c) an animated trajectory in `(H(P, Q), H(Q, P))` space as Q is dragged.
**Concept it makes tangible:** KL is not a distance, the swap button literally produces a different number, on screen, with no math required. And cross-entropy is bounded below by entropy: dragging Q toward P, the orange `H(P, Q)` bar slides down until it touches `H(P)`, then refuses to go below.
**Why it beats a slider:** A slider can change one parameter; here the learner constructs the *entire* pair (P, Q) and feels the geometry of Gibbs' inequality as a *barrier*.
**Prior art:** Distill's loss-landscape interactives, "KL Divergence as gambling" plots in Cover & Thomas exercises (no public widget I can find), Brilliant.org's KL lesson (reference only, commercial).

### `oneHotCollapse`
**User manipulates directly:** A softmax output vector (10 bars, like an MNIST classifier) by dragging logits up and down. Separately, the user clicks a digit (0–9) to set the one-hot target label.
**Live updates:** (a) The softmax distribution recomputes live with a small numerical instability visualizer (showing `exp(z)` before normalization); (b) the cross-entropy loss expressed in *two* simultaneously visible forms, the full `−Σ pᵢ log qᵢ` sum with 9 of 10 terms greyed-to-zero, and the collapsed `−log q_true` single term, both giving the same number; (c) the gradient `∂L/∂zᵢ = qᵢ − pᵢ` shown as little arrows on each logit.
**Concept it makes tangible:** The one-hot collapse is *literally visible*: 9 of 10 terms in the sum are greyed out. The softmax + NLL gradient `q − p` shows itself: when q is far from one-hot, the arrows are big; when q matches the label, arrows shrink to zero.
**Why it beats a slider:** A slider can't show the *structural* fact that 9 terms vanish; only a per-bar manipulation with a separate target-selector can. And the live gradient arrows turn "softmax + NLL" from a magic incantation into a force field.
**Prior art:** Karpathy's micrograd visualizations (reference), TensorFlow Playground's per-neuron interaction (`playground.tensorflow.org`), Distill's "Tinker With A Neural Network" (`playground.tensorflow.org`).

### `perplexityDial`
**User manipulates directly:** A "next-token prediction" widget where the learner is shown a Shakespeare-style prefix ("To be, or not to ___") and drags probability mass onto candidate completions presented as a 20-bar histogram. The learner can also click "reveal truth" to see the actual continuation.
**Live updates:** (a) Perplexity readout in the format `PPL = exp(loss) = X` with the model "effectively choosing among X options"; (b) a "die" visualization with X faces (animated to resize as the learner concentrates probability); (c) on "reveal," the NLL of the true continuation appears, and the running average is added to a sequence-level perplexity tracker; (d) a horizontal "Shannon floor" line at PPL ≈ 2.5 (≈1.3 bpc).
**Concept it makes tangible:** Perplexity *is* the size of the die. The Shannon floor *is* a horizontal line. Both are visually grabbable concepts.
**Why it beats a slider:** The learner experiences being the language model. They see that being too uniform (high perplexity) and being too confident on the wrong token (∞ loss when truth has p = 0) are both punished, asymmetrically.
**Prior art:** 3Blue1Brown's Wordle entropy visualization (`3blue1brown.com/lessons/wordle`, reference-only), Anthropic's "next-token predictor" UI demos, Karpathy's `chargen` notebook visualizations.

### `entropyOfEnglishGame`
**User manipulates directly:** A live Shannon-game interface. A passage of Shakespeare or English Wikipedia is revealed one character at a time. At each step, the learner *types a guess* for the next character; the system records how many guesses it took. After ~100 characters, the system computes a running estimate of bits/character from the guess statistics (Shannon's 1951 method).
**Live updates:** (a) Running average guesses-per-character; (b) implied bits/char (using Shannon's bounding inequalities); (c) a horizontal bar comparing the learner's bpc to: Shannon 1951 lower bound (0.6), upper bound (1.3), Cover & King 1978 (1.25), modern character-LM SOTA (~1.0 bpc), and the m18 capstone target.
**Concept it makes tangible:** Adult learners viscerally experience that English has structure, they will get most function-word completions in 1 guess and most content-word starts in 3+. The bound is something they have just *measured themselves*.
**Why it beats a slider:** No slider exists for this. The widget *is* an experiment. The learner produces the data, the data produces the bound, the bound shows up as a line on the m18 training-curve panel.
**Prior art:** Shannon (1951) Fig. 4, Cover & King (1978), `mattmahoney.net/dc/entropy1.html` (Mahoney's Shannon-game simulator, no commercial license), `cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/` (Stanford student project, reference only).

### `klAsymmetryCanvas`
**User manipulates directly:** Two 1D continuous distributions (mixture-of-Gaussians sliders for means/variances/weights, *plus* a free-paint mode where the learner draws an arbitrary unnormalized curve and the system normalizes it). The user picks which curve is P and which is Q with a button.
**Live updates:** (a) `D_KL(P‖Q)` and `D_KL(Q‖P)` displayed simultaneously; (b) the *integrand* `p(x) log(p(x)/q(x))` is rendered as a signed colored region under the curves, showing exactly where the divergence is being "charged"; (c) a "find min Q in family" button that locks P and lets the learner watch what minimizing `D_KL(P‖Q)` vs `D_KL(Q‖P)` over a single-Gaussian family produces (the famous mode-seeking vs mass-covering picture).
**Concept it makes tangible:** Forward vs reverse KL are *visually* different optimizations. The shaded integrand shows *why*: in `D_KL(P‖Q)`, Q must cover P's support (penalty where P is large and Q is small); in `D_KL(Q‖P)`, Q is punished only where Q itself has mass.
**Why it beats a slider:** Asymmetry is not a number, it is two pictures. The shaded integrand makes the algebra geometric.
**Prior art:** Eric Jang's "Tutorial on Variational Inference" plots, Goodfellow et al. (Deep Learning textbook) for the canonical mode-seek/mass-cover image), `colah.github.io/posts/2015-09-Visual-Information/` (reference only).

### `unitConvertor`
**User manipulates directly:** A single number, the value of an "information quantity", and a dropdown for its units (bits, nats, bans, hartleys, deciban). Optionally, a second dropdown for what kind of quantity it is (entropy of a pmf, cross-entropy, perplexity).
**Live updates:** The number re-expressed in every unit simultaneously, plus (for perplexity) `b^x` rendered against base `b`, showing that perplexity is base-invariant.
**Concept it makes tangible:** "1.5 nats" and "2.16 bits" are *the same number*, the way "100°C" and "212°F" are the same temperature. Perplexity is the temperature on the "Kelvin scale", base-free.
**Why it beats a slider:** This *is* essentially a calculator widget, but it's a *named-object* calculator, the learner is converting *between unit systems for a named quantity* (cross-entropy of a model on a corpus), not just twiddling numbers. Provide explicit examples like "GPT-3's reported 1.73 bpc → ? nats/char → ? perplexity."
**Prior art:** Wolfram Alpha unit conversion (reference). No dedicated widget for entropy units that I have found.

---

## 5. KEY FORMULAS

**Information content**
```
I(x) = -\log P(x)
```

**Shannon entropy**
```
H(P) = -\sum_{x \in \mathcal{X}} P(x)\,\log P(x)
H(P) = \mathbb{E}_{x \sim P}\!\left[-\log P(x)\right]
H(\text{Uniform on } K) = \log K
H_2(p) = -p\log_2 p - (1-p)\log_2(1-p)
```

**Unit conversions**
```
1 \text{ nat} = \log_2 e \approx 1.4427 \text{ bits}
1 \text{ bit} = \ln 2 \approx 0.6931 \text{ nats}
```

**Cross-entropy**
```
H(P, Q) = -\sum_{x} P(x)\,\log Q(x)
H(P, Q) = \mathbb{E}_{x \sim P}\!\left[-\log Q(x)\right]
H(P, Q) \geq H(P), \quad \text{equality iff } P = Q
```

**KL divergence**
```
D_{\mathrm{KL}}(P \,\|\, Q) = \sum_{x} P(x)\,\log\frac{P(x)}{Q(x)}
D_{\mathrm{KL}}(P \,\|\, Q) = H(P, Q) - H(P)
D_{\mathrm{KL}}(P \,\|\, Q) \geq 0, \quad = 0 \iff P = Q
```

**One-hot cross-entropy / NLL**
```
\mathcal{L}_{\text{CE}} = -\log Q(y_{\text{true}})
\mathcal{L}_{\text{NLL}}(\theta) = -\frac{1}{N}\sum_{i=1}^{N} \log Q_\theta(x_i)
```

**Softmax + NLL gradient (the m13–m18 punchline)**
```
q_i = \frac{e^{z_i}}{\sum_j e^{z_j}}
\frac{\partial \mathcal{L}_{\text{CE}}}{\partial z_i} = q_i - p_i
```

**Cross-entropy = MLE**
```
\arg\min_\theta H(\hat{P}_{\text{data}}, Q_\theta) \;=\; \arg\max_\theta \sum_{i=1}^{N} \log Q_\theta(x_i)
```

**Perplexity**
```
\mathrm{PPL}(Q) = \exp\!\big(H(P, Q)\big) = b^{H_b(P, Q)}
\mathrm{PPL}(Q) = \left(\prod_{i=1}^{N} \frac{1}{Q(x_i)}\right)^{1/N}
```

**Bits/character ↔ nats/character ↔ perplexity**
```
\text{bpc} = \frac{\text{nats/char}}{\ln 2}, \qquad \mathrm{PPL} = 2^{\text{bpc}} = e^{\text{nats/char}}
```

**Mutual information (preview only, do not derive)**
```
I(X; Y) = H(X) - H(X \mid Y) = D_{\mathrm{KL}}\!\big(P(X, Y) \,\big\|\, P(X)\,P(Y)\big)
```

---

## 6. LESSON DECOMPOSITION

I recommend **4 lessons** for this module, totaling roughly 62 minutes. Five would water it down; three would force-pack `softmax-plus-nll` into the wrong place.

---

### Lesson 9.1: "How surprised should you be?"
*Summary:* We turn the intuition that rare events are more "informative" into a single number: `I(x) = −log P(x)`, then average it over P to get entropy.
*Estimated minutes:* 14
*Widgets:* `pmfSurpriseLab`, `unitConvertor`.

1. *Hook (prose+widget):* Two coins are flipped. One is fair; one always lands heads. Which flip "tells you more"? Free-form prediction.
2. *Definition of information content:* Introduce `I(x) = −log P(x)`. Show how it satisfies "rarer → larger" and additivity for independent events.
3. *StepCheck:* For `P(x) = 1/8`, compute `I(x)` in bits. **Answer: 3.**
4. *Bases as units:* bits (log₂), nats (ln), bans (log₁₀). Same number, different units. Introduce `unitConvertor`.
5. *StepCheck:* Convert `3` bits to nats. **Answer: ≈ 2.079** (accept 2.07–2.08).
6. *Entropy as expected surprise:* Define `H(P) = E_P[I(X)]`. Open `pmfSurpriseLab` with a uniform 4-outcome pmf; learner verify H = 2 bits.
7. *StepCheck:* Drag to one-hot (all mass on one outcome). Read H. **Answer: 0.**
8. *Drag to a "slightly biased coin" (p = 0.6, 0.4):* compare to fair-coin entropy. Visual: H is *almost* 1 bit, not noticeably less.
9. *Why convention chose nats in ML:* Because `torch.log` is natural and gradients are cleaner. Perplexity hides the choice.
10. *StepCheck:* Uniform pmf on K = 32 outcomes, what is `H` in bits? **Answer: 5.**
11. *Endgame callback line:* When you train a transformer, the loss you minimize is *exactly* the average surprise per token, this same expected value, on this same logarithmic scale.

---

### Lesson 9.2: "Two distributions in the same room"
*Summary:* When the truth is P but your model is Q, the average surprise you suffer is cross-entropy; the excess over `H(P)` is KL divergence.
*Estimated minutes:* 18
*Widgets:* `crossEntropyDuel`, `klAsymmetryCanvas`.

1. *Hook:* You're encoding messages from a friend whose word frequencies you've guessed wrong. How much does your wrong guess cost you?
2. *Definition of cross-entropy:* `H(P, Q) = −Σ P(x) log Q(x)`. Open `crossEntropyDuel`.
3. *Gibbs' inequality (visual proof, not algebraic):* Drag Q around with P locked uniform. The orange bar (`H(P, Q)`) never drops below `H(P)`.
4. *StepCheck:* P = (0.5, 0.5), Q = (0.5, 0.5). Compute H(P, Q) in bits. **Answer: 1.**
5. *StepCheck:* P = (0.5, 0.5), Q = (0.9, 0.1). Compute H(P, Q) in bits. **Answer: ≈ 1.737** (accept 1.73–1.74).
6. *KL as the gap:* Introduce `D_KL(P‖Q) = H(P, Q) − H(P)` literally as "the visible gap" between bars. Three properties: ≥ 0, = 0 iff P = Q, asymmetric.
7. *Asymmetry demo:* Swap P ↔ Q with the button. The KL number changes. Open `klAsymmetryCanvas` for the continuous case.
8. *StepCheck:* Using the values from step 5, compute `D_KL(P‖Q)`. **Answer: ≈ 0.737.**
9. *Mode-seeking vs mass-covering (preview only):* One image, one paragraph, no derivation. We use forward KL in supervised learning because it falls out of MLE.
10. *Cross-entropy is not a distance:* `H(P, P) = H(P) > 0`. The "distance-like" object is KL, and it's not a true distance either.
11. *Endgame callback line:* The loss your transformer minimizes is `H(empirical-data, model)`: a cross-entropy, not a KL. (The KL difference is a constant in θ that gradient descent ignores.)

---

### Lesson 9.3: "Why classifiers have a softmax head"
*Summary:* For one-hot targets, cross-entropy collapses to `−log Q(y_true)`, which is the negative log-likelihood; softmax exists to produce a valid Q from real-valued logits with a clean gradient.
*Estimated minutes:* 14
*Widgets:* `oneHotCollapse`.

1. *Hook:* In supervised classification, the label is a single class, not a fuzzy distribution. What does that mean for the cross-entropy formula?
2. *One-hot collapse derivation:* On paper. P concentrated on class y ⇒ `H(P, Q) = −log Q(y)`.
3. *Open `oneHotCollapse`:* Drag logits. Watch 9 of 10 terms in the sum grey out.
4. *Cross-entropy = NLL = MLE:* Three names for the same thing. Callback to m8.
5. *StepCheck:* Logits z = (2, 0, 1) over three classes; true class is 0. Compute softmax(z), then the loss in nats. **Answer (softmax): ≈ (0.665, 0.090, 0.245); loss ≈ 0.408** (accept 0.40–0.42).
6. *The softmax + NLL gradient:* `∂L/∂z_i = q_i − p_i`. Derive this once carefully. Note how clean it is.
7. *StepCheck:* For the previous problem, what is `∂L/∂z_0`? **Answer: ≈ −0.335.**
8. *Why softmax+NLL and not softmax+MSE:* MSE on softmax outputs has vanishing gradients where the model is wrong-with-confidence. NLL has linear gradients via `q − p`.
9. *Aside: PyTorch's `CrossEntropyLoss` vs `NLLLoss`* is a numerical-stability split, not a mathematical one. Same loss.
10. *Where this shows up in the transformer:* the final linear layer in a GPT outputs `V`-dimensional logits, softmax converts to next-token probabilities, NLL on the true next token is the per-step loss.
11. *Endgame callback line:* This is *the reason* every classification network ends in softmax + cross-entropy.

---

### Lesson 9.4: "Perplexity and the floor of English"
*Summary:* Perplexity is cross-entropy exponentiated; it's the effective branching factor. Shannon estimated English at ≈ 1.0–1.3 bpc, which sets a hard floor on the m18 capstone.
*Estimated minutes:* 16
*Widgets:* `perplexityDial`, `entropyOfEnglishGame`, `unitConvertor`.

1. *Hook:* "Val loss 1.5", what does that *mean*? We need a unit-free interpretation.
2. *Perplexity definition:* `PPL = exp(H(P, Q))`. Or in any base, `b^H_b`. Show base-invariance with `unitConvertor`.
3. *StepCheck:* Cross-entropy = `log 27` nats. What is perplexity? **Answer: 27.**
4. *Branching-factor intuition:* Open `perplexityDial`. Drag your probability over Shakespeare-continuation candidates. Watch the "effective die" resize.
5. *StepCheck:* A model has bits-per-character of 4.0 on a corpus. What is its perplexity? **Answer: 16.**
6. *Geometric-mean interpretation:* `PPL = (∏ 1/Q(xᵢ))^(1/N)`. Why geometric: cross-entropy averages logs, exponentiating un-averages multiplicatively.
7. *Shannon experiment:* In 1951 Shannon had a human predict next letters of English text. From the guess statistics he bounded H ∈ [0.6, 1.3] bits/char. Cover & King (1978) refined this; Brown et al. (1992) used a trigram to get an upper bound of 1.75 bpc.
8. *Open `entropyOfEnglishGame`:* The learner does the Shannon game themselves on ~50 characters of Shakespeare. The system reports their implied bpc.
9. *Free-response StepCheck:* After the game, the learner's implied bpc falls roughly in what range? Accept any value 0.4–2.5 if reasoning is shown; the lesson then displays the reference bars.
10. *The m18 punchline:* On tiny-shakespeare, a tiny transformer plateaus around val NLL ≈ 1.5 nats (PPL ≈ 4.5, ≈ 2.16 bpc). Shannon's floor is ≈ 1.0–1.3 bpc. The remaining ≈ 0.9 bpc of gap is what scale, attention, depth, and more data would buy you.
11. *StepCheck:* Convert val NLL = 1.5 nats/char to bpc. **Answer: ≈ 2.164** (accept 2.16–2.17).
12. *Forward pointer to mutual information:* One paragraph. We won't use it again in m14 and m16 (representation learning, contrastive losses).
13. *Out of scope:* Source coding, channel coding, rate-distortion, beautiful, but not load-bearing for ML.
14. *Endgame callback line:* Every val-loss number you'll ever see when training a language model is a cross-entropy in disguise. Perplexity is that same number on a different scale. The floor it cannot pass is the entropy of the language itself.

---

## 7. PROBLEM BANK

1. **(novice / computation / `information-content`)** A pmf assigns `P(x) = 1/4`. Compute `I(x)` in bits. *Answer:* 2.
2. **(novice / computation / `log-base-and-units`)** Convert 2 bits to nats. *Answer:* `2 ln 2 ≈ 1.386` nats.
3. **(novice / computation / `entropy-of-canonical-pmfs`)** What is the entropy of a uniform distribution over 16 outcomes, in bits? *Answer:* 4.
4. **(novice / computation / `entropy-of-canonical-pmfs`)** What is the entropy of a Bernoulli(0.5) coin, in nats? *Answer:* `ln 2 ≈ 0.693`.
5. **(novice / computation / `entropy-as-expected-surprise`)** Compute the entropy of pmf `(1/2, 1/4, 1/4)` in bits. *Answer:* 1.5.
6. **(intermediate / computation / `cross-entropy`)** For `P = (1/2, 1/2)` and `Q = (3/4, 1/4)`, compute `H(P, Q)` in bits. *Answer:* `−0.5 log₂(3/4) − 0.5 log₂(1/4) ≈ 1.207`.
7. **(intermediate / computation / `kl-divergence`)** Using the previous, compute `D_KL(P‖Q)` in bits. *Answer:* `≈ 1.207 − 1 = 0.207`.
8. **(intermediate / computation / `kl-properties`)** Using the same P and Q, compute `D_KL(Q‖P)`. *Answer:* `0.75 log₂(0.75/0.5) + 0.25 log₂(0.25/0.5) ≈ 0.189`. (Different from `D_KL(P‖Q)`; demonstrates asymmetry.)
9. **(intermediate / interpretation / `kl-properties`)** True or false: KL divergence satisfies the triangle inequality. *Answer:* False; provide a numerical counterexample as part of the answer (any three pmfs P, Q, R where `D_KL(P‖R) > D_KL(P‖Q) + D_KL(Q‖R)`).
10. **(intermediate / computation / `one-hot-collapse`)** A 5-way classifier outputs softmax probabilities `(0.1, 0.5, 0.2, 0.1, 0.1)`. The true class is index 1. What is the cross-entropy loss in nats? *Answer:* `−ln 0.5 ≈ 0.693`.
11. **(intermediate / computation / `softmax-plus-nll`)** Logits `(1, 2, 3)`, true class index 2. Compute (a) softmax, (b) NLL in nats, (c) gradient `∂L/∂z_2`. *Answer:* (a) softmax `≈ (0.090, 0.245, 0.665)`; (b) `≈ 0.408`; (c) `q_2 − 1 ≈ −0.335`.
12. **(intermediate / computation / `perplexity`)** A language model achieves a cross-entropy of `ln 50` nats per token. What is its perplexity? *Answer:* 50.
13. **(intermediate / computation / `perplexity`, `bpc-vs-nats`)** A character LM reports 1.0 bits per character. (a) What is its perplexity? (b) What is its loss in nats/char? *Answer:* (a) 2; (b) `ln 2 ≈ 0.693`.
14. **(intermediate / interpretation / `entropy-of-english`)** Shannon's 1951 estimate puts English between roughly 0.6 and 1.3 bits/char. A neural LM reports 0.94 bpc on enwik8. Does this *violate* Shannon's bound? Explain in one sentence. *Answer:* No. Shannon's *upper* bound is 1.3 bpc; the *true* entropy is somewhere ≤ 1.3, and 0.94 is consistent with it. The bound any model cannot break is the true entropy (unknown but ≤ 1.3).
15. **(advanced / construction / `cross-entropy`, `kl-divergence`)** Given `H(P, Q) = 2.5` bits and `H(P) = 2.0` bits, compute `D_KL(P‖Q)`. Without knowing `Q`, what is the smallest possible value of `H(Q)`? *Answer:* `D_KL(P‖Q) = 0.5` bits. `H(Q)` is not bounded below by `H(P)`: a counterexample with `Q` one-hot gives `H(Q) = 0`. So minimum is 0.
16. **(advanced / proof-scaffold / `xent-equals-mle`)** Show that minimizing `H(P̂_data, Q_θ)` over θ is equivalent to maximum likelihood estimation. Outline three steps. *Answer:* (i) write empirical distribution `P̂(x) = (1/N) Σ 𝟙[xᵢ = x]`; (ii) substitute into `H(P̂, Q_θ) = −Σ_x P̂(x) log Q_θ(x) = −(1/N) Σᵢ log Q_θ(xᵢ)`; (iii) negate to recover the log-likelihood; argmin of loss = argmax of log-likelihood.
17. **(advanced / debugging / `kl-properties`)** A student reports `D_KL(P‖Q) = ∞` and concludes the formula is broken. The classifier has 1000 classes, so all `Q(x) > 0` in theory. What is the actual likely cause? *Answer:* Numerical underflow: for very negative logits, `exp(z_i)` rounds to 0 in float32, making `Q(x_i)` exactly 0 for some x where P > 0. Mitigation: log-softmax (compute `log Q` directly without going through `exp`), or label smoothing.
18. **(advanced / computation / `perplexity-vs-loss-table`, `bpc-vs-nats`)** A character-level transformer trained on tiny-shakespeare (vocabulary = 65) plateaus at val NLL = 1.5 nats. Compute (a) perplexity, (b) bits/char, (c) how many bpc of "headroom" remain to Shannon's English upper bound of 1.3 bpc. *Answer:* (a) `e^1.5 ≈ 4.48`; (b) `1.5 / ln 2 ≈ 2.164` bpc; (c) `≈ 2.164 − 1.3 ≈ 0.86` bpc remaining.
19. **(advanced / construction / `forward-vs-reverse-kl`)** Let `P` be a 50/50 mixture of two non-overlapping Gaussians. You fit a single Gaussian `Q` by minimizing `D_KL(P‖Q)`. Without computing, describe qualitatively where the optimal Q sits and why. Repeat for `D_KL(Q‖P)`. *Answer:* Forward KL: Q must place mass wherever P does (mass-covering); the optimal Q is a wide single Gaussian centered between the two modes. Reverse KL: Q is punished only where Q itself has mass, so Q can park entirely on one mode (mode-seeking); two local optima, each centered on one of the two component modes.
20. **(advanced / interpretation / `mutual-information-preview`, `scope-of-shannon-in-ml`)** A colleague claims "mutual information is the same as Pearson correlation, since both measure how related two variables are." Counterexample requested. *Answer:* Let `X ~ Uniform(−1, 1)` and `Y = X²`. Then `Cov(X, Y) = E[X³] − E[X]E[X²] = 0`, so correlation is 0. But Y is a deterministic function of X, so `H(Y | X) = 0` and `I(X; Y) = H(Y) > 0`. Correlation captures linear dependence only; MI captures all dependence.

---

## 8. ENDGAME CALLBACK: REFINED

Your starter is solid but front-loaded. Three alternatives, ordered by how much I'd recommend each:

**Option A (recommended, shorter, sharper, ends on the floor):**
> Cross-entropy is the loss; perplexity is that loss exponentiated. The reason GPT-style models end in softmax-then-NLL traces directly back to the one-hot collapse you saw here. When the m18 capstone's training run plateaus near `val NLL ≈ 1.5`, the floor it's approaching is the entropy of Shakespearean English itself, a number Shannon first measured in 1951.

**Option B (closest to your draft, keeps the perplexity≈4.5 anchor):**
> Train a language model and you are minimizing cross-entropy; report its quality and you exponentiate to get perplexity. When the m18 capstone settles near `val NLL ≈ 1.5`, `perplexity ≈ 4.5` on tiny-shakespeare, that plateau isn't laziness, it's the Shannon floor of English coming up under the keel.

**Option C (most pedagogically aggressive, three-sentence mantra):**
> Information theory in ML is one equation in three disguises: cross-entropy is the loss, NLL is the per-example version, perplexity is the same number on the branching-factor scale. The softmax head is what's needed to produce a valid distribution to feed it; the floor it cannot pass is the entropy of the language. Everything in m14, m17, and the m18 capstone is this paragraph repeated at scale.

I recommend **Option A** for daily use and **Option C** as the lesson-4 closer.

---

## 9. SOURCES (LICENSING-AWARE)

1. **Shannon, C. E. (1948).** *A Mathematical Theory of Communication.* Bell System Technical Journal.. Foundational paper introducing H and the channel coding theorem. **License: the 1948 BSTJ paper itself is under original Bell System publication terms. The classic Univ. of Illinois Press 1949 reprint is copyrighted. Treat as [REFERENCE-ONLY]**, do not reproduce figures or substantial passages, but cite freely. *Use for:* foundational citation, historical framing in lesson 9.1.
URL: `https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf` (Harvard mirror).

2. **Shannon, C. E. (1951).** *Prediction and Entropy of Printed English.* Bell System Technical Journal 30, 50–64. **[REFERENCE-ONLY]**, original BSTJ copyright. *Use for:* the 0.6–1.3 bits/char bound that anchors lesson 9.4 and the m18 callback. Do not reproduce Tables/Figures; describe and cite.
URL: `https://www.princeton.edu/~wbialek/rome/refs/shannon_51.pdf` (Princeton mirror) and `https://archive.org/details/bstj30-1-50`.

3. **Cover, T. M. & King, R. C. (1978).** *A Convergent Gambling Estimate of the Entropy of English.* IEEE Trans. Inf. Theory 24, 413–421. **[REFERENCE-ONLY]** (IEEE copyright). *Use for:* the refinement to ≈ 1.25 bpc; gambling-as-prediction reframe; mentioned in lesson 9.4 step 7 and in problem 14's answer.

4. **Brown, P. F., Della Pietra, S. A., Della Pietra, V. J., Lai, J. C., Mercer, R. L. (1992).** *An Estimate of an Upper Bound for the Entropy of English.* Computational Linguistics 18(1), 31–40. **License: published by MIT Press for ACL. The ACL Anthology hosts the PDF; older ACL papers are in a transitional licensing state, verify the per-paper page before any adaptation. Default treat as [REFERENCE-ONLY].** *Use for:* contrast with Shannon's cognitive estimates; the trigram upper bound of 1.75 bpc; cited in problem 14 / lesson 9.4.
URL: `https://aclanthology.org/J92-1002/`.

5. **Olah, C. (2015).** *Visual Information Theory.* colah's blog. **License: no explicit license posted on `colah.github.io` for blog posts; the GitHub repo `colah/colah.github.io` contains no LICENSE file for prose. [REFERENCE-ONLY].** *Use for:* the gold-standard pedagogy for entropy/cross-entropy/KL visualization; we should *not* lift figures, but the area-as-entropy mental model and the Bob's-words example are the inspiration for `pmfSurpriseLab` and `crossEntropyDuel`.
URL: `https://colah.github.io/posts/2015-09-Visual-Information/`.

6. **3Blue1Brown (Sanderson, G.) (2022).** *Solving Wordle using information theory.* Video lesson. **License: 3Blue1Brown videos are All Rights Reserved on YouTube; the supplementary text on `3blue1brown.com/lessons/wordle` is similarly all-rights-reserved. The Manim source code is MIT-licensed but the video content is not redistributable. [REFERENCE-ONLY].** *Use for:* the canonical "entropy = expected information gain in a guessing game" framing; we link to it as further-watching and use the same conceptual move in `entropyOfEnglishGame`.
URL: `https://www.3blue1brown.com/lessons/wordle`.

7. **Karpathy, A. (2022–2023).** *Neural Networks: Zero to Hero, makemore series.* GitHub: `karpathy/makemore` and `karpathy/nn-zero-to-hero`. **License: both repos have MIT LICENSE files on their code/notebooks → [ADAPT]** for code/notebooks (with attribution per MIT terms); the YouTube videos themselves are All Rights Reserved → [REFERENCE-ONLY] for video content. *Use for:* the canonical worked example of bigram cross-entropy loss in Python (makemore part 1), the softmax+NLL gradient derivation (part 4 "becoming a backprop ninja"), and the tiny-shakespeare numbers referenced in our m18 callback.
URL: `https://github.com/karpathy/makemore`, `https://github.com/karpathy/nn-zero-to-hero`.

8. **Deisenroth, M. P., Faisal, A. A., Ong, C. S. (2020).** *Mathematics for Machine Learning.* Cambridge University Press. **License: free PDF on `mml-book.com` is "free to view and download for personal use only. Not for re-distribution, re-sale, or use in derivative works." → [REFERENCE-ONLY].** *Use for:* the canonical maximum-entropy treatment (§8.2, §6.7), worked examples on Bernoulli entropy; structure of our lesson 9.3.
URL: `https://mml-book.github.io/book/mml-book.pdf`.

9. **MacKay, D. J. C. (2003).** *Information Theory, Inference, and Learning Algorithms.* Cambridge University Press. **License: MacKay made the PDF freely downloadable for personal use; redistribution restricted. [REFERENCE-ONLY].** *Use for:* the gold-standard treatment of source coding, Gibbs' inequality, the bent-coin lottery, and "Shannon as a way of thinking." Even though source coding is out of scope, this is the best place to send curious learners.
URL: `https://www.inference.org.uk/itila/book.html`.

10. **Distill, various interactive articles (2016–2021).** Editors: Olah, Carter, et al. **License: All Distill articles are explicitly CC BY 4.0 (confirmed at `distill.pub/journal/`: "Distill articles must be released under the Creative Commons Attribution license"). [ADAPT] with attribution** (note that any reused figures from external sources within Distill articles may have different licenses, they are marked "Figure from …"). Specific articles worth pillaging for technique: "Why Momentum Really Works," "The Building Blocks of Interpretability" (Svelte-based layout patterns that map nicely onto our Astro/Svelte stack). *Use for:* interaction-design pattern library for the widgets in §4. Source code is on `github.com/distillpub`.
URL: `https://distill.pub/`.

---

## 10. PEDAGOGICAL TRAPS

1. **Trap: Frontloading source coding / Huffman trees.**
*Why it happens:* It's how Shannon himself introduced entropy, and it's how Cover & Thomas, MacKay, and most CS textbooks introduce it. The "average code length" derivation is beautiful.
*Why it's a trap for our audience:* Software engineers learning ML do not need to derive entropy from optimal codes. The framing leaves them with the misconception that entropy is "about compression", when by lesson 9.4 we need them to think of it as "average surprise of a draw from P."
*Mitigation:* State the operational definition (`H = average information content`) up front. Mention codes/compression in one parenthetical sentence: "There's a beautiful equivalent definition involving the minimum average length of a binary code for samples from P; we won't need it, but see MacKay Ch. 5 if curious." Stay on the average-surprise interpretation.

2. **Trap: Treating "cross-entropy loss" and "negative log-likelihood loss" as different things.**
*Why it happens:* PyTorch has both `nn.CrossEntropyLoss` and `nn.NLLLoss` with different APIs (one applies log-softmax internally, one doesn't), which is a *software* distinction, not a *mathematical* one. Adult learners read the docs and assume the math is different too.
*Mitigation:* Address the PyTorch confusion explicitly in lesson 9.3 step 9 or in a sidebar: "These are the same loss. The API split is purely a numerical-stability choice, log-softmax fused with NLL is more stable than softmax then log then NLL. Use `CrossEntropyLoss` on raw logits in practice."

3. **Trap: Letting `0 log 0` look like a bug.**
*Why it happens:* `0 * log(0)` is `0 * -∞` in IEEE arithmetic = NaN. Learners hit this in their first hand-computation or first numpy implementation and lose confidence in the formula.
*Mitigation:* Introduce the limiting convention `0 log 0 := 0` in lesson 9.1 (justify via `lim_{p→0} p log p = 0`). Show the NaN failure mode in code; show the fix (`p * log(p + eps)` or `np.where(p > 0, p * np.log(p), 0)`). Connect to `D_KL` being `∞` when Q has zeros, which is *not* a bug but a meaningful signal, and motivates label smoothing in m13.

4. **Trap: Saying "perplexity is the inverse probability."**
*Why it happens:* It's a slogan. Some textbooks write `PPL = (1/P(corpus))^(1/N)`, which is "geometric mean of inverse probabilities" but learners hear "inverse of a probability."
*Mitigation:* State perplexity as `exp(cross-entropy)` first. Derive the geometric-mean form once. Use the "effective number of choices" / "size of die" framing consistently. Never use the inverse-probability slogan unaccompanied.

5. **Trap: Mentioning mutual information too early or too thoroughly.**
*Why it happens:* MI is genuinely interesting; it's tempting to derive `I(X; Y) = H(X) + H(Y) − H(X, Y)`, draw the Venn diagram, etc.
*Why it's a trap:* It blows the module's runtime. Joint and conditional entropy are not on the must-cover list. Adult learners who try to digest MI in 10 minutes get a shallow take that they then have to overwrite in m16.
*Mitigation:* Keep MI to one paragraph and one sentence: "How much does knowing Y reduce your uncertainty about X? You'll see this again in m14 (attention as alignment) and m16 (contrastive losses)." That's the entire MI exposure in m9. Move the actual treatment to where it cashes in.

6. **Trap: Confusing learners about which "entropy of English" number to anchor on.**
*Why it happens:* The literature has Shannon (0.6–1.3 bpc), Cover & King (~1.25 bpc), Brown et al. (1.75 bpc *upper bound* from a trigram), modern neural LMs reporting < 1.0 bpc on benchmark corpora, and characters-vs-tokens-vs-bytes complicating the comparison.
*Mitigation:* Anchor on a *zone*, not a number: "Roughly 1.0–1.3 bits/character for general English." State that this is contested at the second decimal place. Acknowledge that modern neural LMs claim < 1.0 bpc on specific corpora (e.g., enwik8) and that this *can* be lower than Shannon's 1951 upper bound without contradicting anything. The m18 capstone doesn't need a precise floor; it needs the learner to understand there *is* a floor and they're racing toward it.
