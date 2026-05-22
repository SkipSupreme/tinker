# Module 6 Research Brief: Multivariable Calculus: Partial Derivatives, Gradients, Jacobians

> Deep-research output, saved verbatim. Conversion log in `../plans/2026-04-24-research-prompts.md`. See the `m6` lesson files under `apps/docs/src/content/lessons/` for what we built from it.
> Replaces an earlier condensed brief (sections 1, 8, 9, 10 only). A few spots in the pasted source dropped text mid-sentence (paste-buffer truncation); those were reconstructed from context where unambiguous and flagged inline.

### 1. Concept dependency graph

Topologically sorted. Prerequisites from earlier modules are marked `m5-calculus` (single-variable derivatives, chain rule, power rule). Concepts marked **[INLINE-VEC]** are vector primer concepts that must precede partials and should be introduced inline in m6 (not deferred to m7). The deferred-to-m7 concepts are flagged at the end.

1. **`function-multi-var`** — A function `f: ℝⁿ → ℝ` that takes a list of n numbers and returns one number. Prereqs: m5-calculus.
2. **`vector-as-list`** **[INLINE-VEC]** — A vector is just an ordered list of n numbers `[x₁,…,xₙ]` representing a point or a direction in n-dim space. Prereqs: none.
3. **`vector-addition-scaling`** **[INLINE-VEC]** — Componentwise addition and scalar multiplication, used to express "step from x by tv". Prereqs: `vector-as-list`.
4. **`vector-length-unit`** **[INLINE-VEC]** — Euclidean norm `‖v‖ = √(Σvᵢ²)`; a unit "direction" in directional derivative. Prereqs: `vector-as-list`.
5. **`dot-product-algebraic`** **[INLINE-VEC]** — `u·v = Σuᵢvᵢ`. Needed to write directional derivative and gradient·step. Prereqs: `vector-as-list`.
6. **`dot-product-geometric`** **[INLINE-VEC]** — `u·v = ‖u‖‖v‖cosθ`; the projection interpretation. Needed for the steepest-ascent proof. Prereqs: `dot-product-algebraic`, `vector-length-unit`.
7. **`graph-surface`** — The graph of `z = f(x,y)` as a surface in ℝ³. Prereqs: `function-multi-var`.
8. **`level-set`** — `{x : f(x) = c}`; in 2D a level curve / contour line, in 3D a level surface. Prereqs: `function-multi-var`.
9. **`partial-derivative`** — `∂f/∂xᵢ` = rate of change of f when only xᵢ wiggles, every other input frozen. Prereqs: m5-calculus, `function-multi-var`.
10. **`partial-as-slice-slope`** — Geometric meaning of `∂f/∂x` as the slope of the curve where the surface is sliced by the plane `y=const`. Prereqs: `partial-derivative`, `graph-surface`.
11. **`gradient-vector`** — `∇f = [∂f/∂x₁, …, ∂f/∂xₙ]`, the vector assembling all partials. Prereqs: `partial-derivative`, `vector-as-list`.
12. **`tangent-plane`** — Best linear approximation `f(x₀+h) ≈ f(x₀) + ∇f(x₀)·h`. Prereqs: `gradient-vector`, `dot-product-algebraic`.
13. **`directional-derivative`** — `D_uf = ∇f·u` (u a unit vector); rate of change when stepping in direction u. Prereqs: `gradient-vector`, `dot-product-algebraic`, `vector-length-unit`.
14. **`gradient-steepest-ascent`** — `∇f` points in direction of fastest increase; `‖∇f‖` is the slope in that direction. Proven via Cauchy–Schwarz / cosθ maximization. Prereqs: `directional-derivative`, `dot-product-geometric`.
15. **`gradient-perp-level-set`** — `∇f` is orthogonal to the level set through each point. Prereqs: `gradient-steepest-ascent`, `level-set`.
16. **`vector-valued-function`** — `F: ℝⁿ → ℝᵐ`, m output scalars stacked. Examples: parametric curves (n=1), neural network layers. Prereqs: `function-multi-var`.
17. **`jacobian-matrix`** — m×n matrix whose rows are gradients of each output. Prereqs: `gradient-vector`, `vector-valued-function`.
18. **`multivar-chain-rule-scalar`** — If `z = f(x(t), y(t))`, then `dz/dt = (∂f/∂x)(dx/dt) + (∂f/∂y)(dy/dt)`. Prereqs: `partial-derivative`, m5-calculus.
19. **`multivar-chain-rule-matrix`** — For `h = f∘g`, `J_h(x) = J_f(g(x))·J_g(x)` (matrix product). This is the backbone of backprop. Prereqs: `jacobian-matrix`, `multivar-chain-rule-scalar`.
20. **`jacobian-vector-product`** — `J·v` (a JVP) is the directional derivative of the vector field; reverse mode computes `vᵀ·J` (a VJP, the gradient of a scalar wrt all inputs). Prereqs: `jacobian-matrix`, `dot-product-algebraic`.
21. **`second-partial`** — `∂²f/∂xᵢ∂xⱼ`; Clairaut/symmetry under continuity. Prereqs: `partial-derivative`.
22. **`hessian-matrix`** — Symmetric matrix of all second partials; describes local curvature. Prereqs: `second-partial`.
23. **`critical-point-classification`** — At `∇f=0`: Hessian positive-definite ⇒ min, negative-definite ⇒ max, indefinite ⇒ saddle. Prereqs: `hessian-matrix`, `gradient-vector`.

**Deferred to m7 (not needed in m6):** matrices as linear transformations, matrix–matrix multiplication as composition (only the *idea* that Jacobians compose like matrices is touched in m6; the rules for matrix multiplication live in m7), eigenvalues/eigenvectors (the Hessian section uses "positive/negative definite" informally — "curves up in every direction" — and explicitly defers the eigenvalue test to m7), matrix inverse, vector spaces/bases, orthogonality beyond the dot-product cosine identity.

---

### 2. Canonical worked examples

#### E1 — Partials of a paraboloid (classical)
**Problem:** Compute `∂f/∂x` and `∂f/∂y` for `f(x,y) = x² + y²` at `(1, 2)`.
**Solution:** Treat `y` as constant: `∂f/∂x = 2x = 2`. Treat `x` as constant: `∂f/∂y = 2y = 4`. So `∇f(1,2) = [2, 4]`.
**Pedagogical point:** "Freeze every other variable, then differentiate" — the operational definition.
**Most common mistake:** Differentiating the frozen term instead of sending it to `0`. Adult learners forget the freeze. *(Source paste dropped a few words here.)*

#### E2 — Slicing the surface (classical, geometric companion to E1)
**Problem:** For `f(x,y) = x² + y²`, write down the 1D function obtained by slicing with `y = 2`, and find its slope at `x = 1`.
**Solution:** Slice gives `g(x) = x² + 4`, `g'(x) = 2x`, `g'(1) = 2`. This equals `∂f/∂x(1,2)`.
**Pedagogical point:** A partial derivative is *literally* a single-variable derivative on a slice — nothing exotic. Bridges m5 to m6.
**Most common mistake:** Believing "partial = different operation"; failure to see the slice is a 1D problem the student already solved last module.

#### E3 — Gradient of distance from a point (classical)
**Problem:** Let `f(x,y) = √(x² + y²)`. Find `∇f` and describe its geometry.
**Solution:** `∂f/∂x = x/√(x²+y²)`, `∂f/∂y = y/√(x²+y²)`. So `∇f = (x,y)/‖(x,y)‖` — the **unit radial vector**, always pointing outward from the origin.
**Pedagogical point:** Geometric interpretation: distance grows fastest moving directly away from the origin, and the rate is exactly 1 (because you're walking on the function's natural scale). Connects "gradient direction" to "obvious direction."
**Most common mistake:** Forgetting the chain rule on `√(·)` and dropping the denominator.

#### E4 — Level curves of `xy = c` (classical)
**Problem:** Sketch the level sets of `f(x,y) = xy` and verify `∇f` is perpendicular to them at `(1,1)`.
**Solution:** Level sets are hyperbolas `y = c/x`. `∇f = [y, x]`, at `(1,1)` it's `[1,1]`. The tangent to the level curve `y = 1/x` at `(1,1)` is `[1, -1]` (slope `-1`). `[1,1]·[1,-1] = 0`. ✓
**Pedagogical point:** `∇f ⊥ level set` is not a coincidence — it's the geometric content of the gradient.
**Most common mistake:** Confusing "tangent to the surface" with "tangent to the level curve" — they live in different planes.

#### E5 — Directional derivative on a tilted plane (classical)
**Problem:** Find the rate of change of `f(x,y) = 3x + 4y` in the direction `v = [1,1]` at any point.
**Solution:** `∇f = [3, 4]`; unit `û = [1,1]/√2`. `D_û f = ∇f·û = (3+4)/√2 = 7/√2 ≈ 4.95`.
**Pedagogical point:** Two subtleties at once: (a) normalize the direction or the number is meaningless; (b) for a linear function the gradient is constant everywhere.
**Most common mistake:** Forgetting to normalize `v`. Students get `7` instead of `7/√2`.

#### E6 — Chain rule on a curve through a surface (classical)
**Problem:** A bug crawls along `(x(t), y(t)) = (cos t, sin t)` over the surface `f(x,y) = x² - y²`. Find `dz/dt`.
**Solution:** `dz/dt = (∂f/∂x)(dx/dt) + (∂f/∂y)(dy/dt) = (2x)(-sin t) + (-2y)(cos t) = -2cos t·sin t - 2sin t·cos t = -2 sin 2t`. Check by composing: `z = cos²t - sin²t = cos 2t`, so `dz/dt = -2 sin 2t`. ✓
**Pedagogical point:** Two paths to the answer, both give the same number — this is the experiential proof of the multivariable chain rule.
**Most common mistake:** Treating it as `∂f/∂x · dx/dt` only (forgetting the y-branch), the multivariable analog of dropping one term in a product-rule expansion.

#### E7 — Classifying a saddle point (classical, drives the widget)
**Problem:** For `f(x,y) = x² - y²`, find `∇f`, classify the critical point at `(0,0)`, and compute the Hessian.
**Solution:** `∇f = [2x, -2y]`, zero at origin. `H = [[2,0],[0,-2]]`. Positive curvature in `x`, negative in `y` ⇒ **saddle**.
**Pedagogical point:** Same machinery (gradient + second derivatives) detects all three critical-point types. Saddle = mixed-sign curvature, not a generalized minimum.
**Most common mistake:** Thinking `∇f = 0` implies a min or max. Students need the saddle counterexample to break this.

#### E8 — Gradient of MSE loss (ML-flavored callback to E1)
**Problem:** For a single training point, `L(w, b) = (wx + b - y)²` where x, y are fixed data. Compute `∂L/∂w` and `∂L/∂b`.
**Solution:** Let `r = wx + b - y` (residual). Chain rule: `∂L/∂w = 2r·x`, `∂L/∂b = 2r·1 = 2r`. So `∇L = [2r·x, 2r]`.
**Pedagogical point:** Linear regression gradient drops out of E1's machinery with one more chain-rule step. This is what an optimizer reads, one gradient per parameter per example.
**Most common mistake:** Treating `y` (the target) as a variable. It's a constant from the data; only `w` and `b` are variables.

#### E9 — Softmax Jacobian (ML-flavored callback to E7)
**Problem:** For `s_i = e^{z_i} / Σ_k e^{z_k}`, compute the Jacobian `∂s_i/∂z_j`.
**Solution:** Case `i=j`: `∂s_i/∂z_i = s_i(1 - s_i)`. Case `i≠j`: `∂s_i/∂z_j = -s_i s_j`. Compact form: `J = diag(s) - ssᵀ`.
**Pedagogical point:** A vector→vector function gives a full Jacobian, not a single gradient. The "minus outer product" form is the cleanest result in the whole module.
**Most common mistake:** Computing only the diagonal (i=j) case and forgetting that softmax outputs are coupled through the denominator.

#### E10 — JVP / VJP on a 2-layer MLP fragment (ML-flavored, capstone)
**Problem:** Let `h = Wx` (where `W ∈ ℝ^{m×n}`, `x ∈ ℝⁿ`) and `L = ½‖h - t‖²`. Compute `∂L/∂W` using the chain rule (matrix calculus).
**Solution:** `∂L/∂h = h - t = r`. By chain rule, `∂L/∂W = r xᵀ` (outer product). This is "the gradient that comes out of `loss.backward()` for a linear layer." *(Source paste dropped the middle of this solution; reconstructed from §5 and P16.)*
**Pedagogical point:** Connects every prior concept — chain rule, Jacobian, gradient, outer product — into the literal formula a deep learning framework computes. From here, "backprop" is just chain-rule applied recursively layer by layer.
**Most common mistake:** Mismatching dimensions (`r xᵀ` vs `xᵀ r` vs `x rᵀ`). Drilling the **shape rule** ("the gradient of a scalar wrt a tensor has the same shape as that tensor") fixes this — this is CS231n's "dimension balancing" heuristic from the Stanford CS231n 2018 discussion notes ("Backpropagation Shape Rule: When you take gradients against a scalar, the gradient at each intermediate step has shape of denominator").

---

### 3. Common misconceptions

**M1. "A partial derivative is a *different kind* of derivative."** It's natural because the notation `∂` looks alien. **Kill it by:** showing E2 — slicing the surface reduces `∂f/∂x` to a literal m5 `g(x) = f(x, y₀)`. There is only one derivative operation; partials are it, applied to a slice.

**M2. "The gradient lives on the surface."** Learners draw it as an arrow on the 3D graph. It's natural because that's where the function is. **Kill it by:** showing that `∇f` for `f:ℝ²→ℝ` is a 2D vector — it lives in the *input* plane, not on the surface. The contour-plot widget with the gradient arrow flat on the floor is the fix.

**M3. "The gradient points uphill on the surface."** Almost right but conflates input and output spaces. **Kill it by:** the projection identity `∇f·u = ‖∇f‖cosθ` and the contour-line widget: the gradient is the *input-space direction* you should walk so that the output `f` rises fastest. The uphill 3D arrow is the surface's normal-ish thing, not the gradient.

**M4. "Directional derivative needs no normalization."** Students plug in any `v`. **Kill it by:** counterexample. With `f(x,y)=x`, `∇f=[1,0]`. Using `v=[2,0]` (unnormalized) you get `2`, but the slope is `1`. The "rate per unit distance" only matches `∇f·v` when `‖v‖=1`. Normalize.

**M5. "If `∇f = 0`, it's a minimum (or maximum)."** Learners port single-variable intuition. **Kill it by:** the saddle widget with `f(x,y)=x²-y²` — gradient is zero, but along `x` it's a min and along `y` it's a max. Saddle points are *typical* in high-dim ML loss landscapes — Dauphin et al. (2014) state in their NIPS abstract that "a deeper and more profound difficulty originates from the proliferation of saddle points, not local minima, especially in high dimensional problems of practical interest."

**M6. "The Jacobian is just a fancy gradient."** They treat it as a row vector. **Kill it by:** the dimensions argument. Gradient: scalar→vector function has m=1, J is 1×n. Vector→vector function has m outputs, J is m×n. Show E9 (softmax) — the Jacobian is a *full square matrix* with off-diagonal entries that don't fit in any single "gradient."

**M7. "Chain rule in many variables is just `df/dt = f'·(stuff)` with no sum over branches."** They miss the sum. **Kill it by:** E6 — when `t` flows into both `x(t)` and `y(t)`, both branches contribute and you *add*. Use a path/tree diagram: every path from `t` to `z` contributes a product; sum over paths. CS231n's "Optimization-2" notes state this verbatim: *"Gradients add up at forks. The forward expression involves the variables x,y multiple times, so when we perform backpropagation we must be careful to use += instead of = to accumulate the gradient on these variables … This follows the multivariable chain rule in Calculus, which states that if a variable branches out to different parts of the circuit, then the gradients that flow back to it will add."* Same algorithmic fact.

**M8. "Mixed partials sometimes don't commute."** Adults remember some vague "exceptions" from school. **Kill it by:** state Clairaut crisply — if the second partials are continuous (true for every function in this course), then `f_{xy} = f_{yx}`. Demonstrate on the symmetric Hessian of E10's MSE loss.

**M9. "The Hessian is hard / scary because eigenvalues."** Reframe before eigenvalues are even known (m7). **Kill it by:** the curvature widget. The Hessian is a 2×2 (or n×n) table of "how the slope changes as you nudge another input." Positive-definite = "curves up in every direction" (visualized as bowl). Indefinite = "curves up in one direction, down in another" (saddle). Eigenvalues are merely the numerical certificate of this geometric fact — defer the certificate to m7.

**M10. "Backprop is a new algorithm."** It's mystery-boxed by PyTorch. **Kill it by:** Karpathy's micrograd framing — backprop *is* the multivariable chain rule, applied recursively across a DAG of scalar operations. Build a 5-node graph by hand in the lesson, show that "calling `.backward()`" is literally the for-loop the student just executed on paper. (micrograd README: "Implements backpropagation (reverse-mode autodiff) over a dynamically built DAG and a small neural networks library on top of it with a PyTorch-like API. Both are tiny about 100 and 50 lines of code respectively.")

**M11. "`∂L/∂W` has different shape than `W`."** Common shape bug in code. **Kill it by:** state and drill the **shape rule** — the gradient of a scalar wrt anything has the same shape as that thing. Use it as a dimension-checking heuristic for every example (per CS231n's "dimension balancing" section).

**M12. "Vectors are arrows; matrices are grids — they're not the same kind of thing as the derivative."** Stops them from accepting Jacobian = derivative. **Kill it by:** explicitly: "for `f:ℝⁿ→ℝᵐ`, the derivative at a point *is* a matrix — the Jacobian. There is no other 'derivative.'" This is the single sentence Parr & Howard's matrix-calculus paper organizes itself around: scalar derivative → vector gradient → matrix Jacobian is one continuous generalization. (Parr & Howard: "When we move from derivatives of one function to derivatives of many functions, we move from the world of vector calculus to matrix calculus.")

---

### 4. Interactive widget suggestions

Mafs (MIT-licensed React component library) handles 2D natively; for 3D surfaces in a Svelte+MDX stack, wrap Three.js (MIT) or react-plotly.js (MIT) with a Svelte component — Mafs itself is 2D-focused per its own docs. All widgets below must let the learner grab a *named mathematical object*; sliders alone are rejected.

#### W1 — `partialAsSlice`
- **User manipulates:** A draggable point `(x₀, y₀)` on the 2D contour plot (the "floor"). A toggle switches between "slice along x" and "slice along y".
- **Live updates:** A second pane shows the 1D slice curve `g(x) = f(x, y₀)` with a tangent line at `x₀`; the tangent's numerical slope is read out and labeled `∂f/∂x`. The 3D pane (optional) shows the slicing plane intersecting the surface.
- **Concept made tangible:** "A partial derivative is the slope of a single-variable slice." The 1D curve is the same kind of object learners differentiated in m5.
- **Why beats a slider:** the learner grabs the *point on the input plane* and watches three representations move (contour, slice, slope number). Bret Victor's broader argument in "Explorable Explanations" (worrydream.com/ExplorableExplanations/) is that text should serve as "an environment to think in" rather than "information to be consumed" — a widget passes this test only when the reader can manipulate the very objects the prose names.
- **Prior art:** GeoGebra "Partial Derivative" (geogebra.org/m/ptzufvkv); GeoGebra "Visualizing Partial Derivatives" (geogebra.org/m/uc5avdac); the Toronto Metropolitan University Pressbooks interactive tangent-plane plot.

#### W2 — `gradientField`
- **User manipulates:** Draggable point `p = (x, y)` over a contour plot of a chosen function; secondary control to pick the function from a small library (paraboloid, saddle, distance, MSE loss surface).
- **Live updates:** The gradient arrow `∇f(p)` is drawn anchored at `p`, with its components labeled. A faint vector-field background updates with each function change. Numeric `‖∇f‖` and angle to nearest contour line.
- **Concept made tangible:** Gradient is a *vector in input space*; it's perpendicular to the level curve through `p`; its magnitude is the local steepness.
- **Why beats a slider:** the learner grabs the position, sees the arrow respond, and visually confirms perpendicularity by sweeping along a contour. The pedagogical move the slider can't make is *causal exploration* of the input-space → arrow relationship.
- **Prior art:** Mafs `Plot.VectorField` (mafs.dev/guides/display/plots); Khan Academy gradient-field visual (reference only — CC BY-NC-SA); 3Blue1Brown's gradient-field stills.

#### W3 — `directionalProbe`
- **User manipulates:** A point `p`, plus a **draggable direction handle** (the tip of the unit vector `u`, constrained to the unit circle around `p`).
- **Live updates:** Numeric `D_uf = ∇f(p)·u` updates live; a "rate-of-change dial" shows the value relative to `±‖∇f‖`. Snap the handle and a small companion 1D plot shows `t ↦ f(p + tu)` near `t=0` with the slope highlighted.
- **Concept made tangible:** Directional derivative as a *family* of slopes parametrized by direction; it's maximized when `u ∥ ∇f` (the gradient handle "locks" and turns green).
- **Why beats a slider:** the learner *grabs the direction* — the very object the math names. Sweeping the handle around the circle reproduces the `cosθ` curve experientially.
- **Prior art:** Auroux's MIT 18.02 mathlets and the d'Arbeloff Interactive Math Project at ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007 (reference only — CC BY-NC-SA); GeoGebra directional-derivative applets.

#### W4 — `chainRulePaths` (computation graph manipulator)
- **User manipulates:** Click any node in a small DAG (e.g. `t → x, y → z`) to **inject a wiggle** (a small δ). Edges show local partials as draggable numeric labels.
- **Live updates:** δ propagates forward; each path from `t` to `z` accumulates a product; the live total `dz/dt` is shown as a *sum of path products*. Editing any edge weight live-updates the propagation.
- **Concept made tangible:** The multivariable chain rule = "sum over paths of (product of edge derivatives)." The micrograd / CS231n computation-graph mental model, made grabbable.
- **Why beats a slider:** the learner *constructs and edits the graph* itself. Watching the sum-of-products update as edges change is exactly the "see the computation" property.
- **Prior art:** Karpathy micrograd's graphviz `draw_dot` traces (github.com/karpathy/micrograd — code MIT-licensed; visual-only inspiration); Distill.pub computation-graph diagrams (CC BY 4.0).

#### W5 — `hessianBowlSaddle` (the dedicated Hessian widget — required)
- **User manipulates:** Two draggable "curvature handles" representing the two eigenvalue magnitudes-and-signs *without naming them eigenvalues* — they're "x-direction curvature" and "y-direction curvature" of a local quadratic model `½(ax² + 2bxy + cy²)`. A third handle controls the off-diagonal coupling `b`. Drag a fourth handle to rotate the principal axes.
- **Live updates:** The 3D mini-surface morphs between bowl (both positive), inverted bowl (both negative), saddle (mixed signs), and trough (one zero). The Hessian matrix `[[a,b],[b,c]]` is shown alongside, with its determinant and sign annotation ("positive definite ✓", "indefinite — saddle"). Contour plot reflects the same change.
- **Concept made tangible:** Hessian curvature classification is geometric, not algebraic — you can *see* a saddle become a bowl by flipping one curvature sign. Eigenvalues are visibly the "principal curvatures" the rotation handle reveals (forward reference to m7).
- **Why beats a slider:** the learner is *literally bending the surface in named directions*. Nicky Case's interactive essays (ncase.me) consistently exemplify this — the reader directly grabs the structure the prose just introduced, then reads off its name.
- **Prior art:** Stanford SISL "Analyzing the Hessian" PDF (web.stanford.edu/group/sisl/k12/optimization/MO-unit4-pdfs/4.10applicationsofhessians.pdf) — static; no comparable interactive exists, which is part of the reason to build it.

#### W6 — `lossLandscapeWalker` (capstone callback)
- **User manipulates:** A "ball" placed anywhere on a 2D loss-surface contour (default: an MSE landscape over (w, b) for a few fixed data points the user can also drag in a side panel). Buttons: "step opposite gradient", "step in gradient direction", "step in arbitrary direction".
- **Live updates:** Ball moves by `−η∇L`; trajectory is drawn; current loss readout. Side panel shows the fitted line over the data — the model is *learning live*.
- **Concept made tangible:** Gradient descent = "repeat: read gradient at your foot, take a step in `−∇L` direction." Closes the loop from gradient theory to the upcoming optimizer module.
- **Why beats a slider:** the learner grabs (a) the ball, (b) the data points; sees both the loss surface and the regression line change in lockstep. Two coupled representations of the same parameter update.
- **Prior art:** Distill.pub "Why Momentum Really Works" by Gabriel Goh (distill.pub/2017/momentum/ — **CC BY 4.0, adaptable**); Karpathy "ConvNetJS" demos.

#### W7 — `jacobianAsMatrix` (for vector→vector functions)
- **User manipulates:** A draggable input point `x ∈ ℝ²`; a function picker (rotation, shear, softmax-on-2-vector, a small MLP layer).
- **Live updates:** Two coupled panels — left: input plane with `x` and a small "wiggle disk" around it; right: output plane with `F(x)` and the *image of the wiggle disk* (an ellipse). The Jacobian matrix is displayed numerically; rows are colored to match the gradient of each output component on the left.
- **Concept made tangible:** The Jacobian is *the local linear map* — it sends input wiggles to output wiggles. Determinant > 1 means stretching; negative means flipping. This is 3Blue1Brown's "derivative as local stretch" generalized to 2D.
- **Why beats a slider:** the learner sees a *region* deform, which is the geometric content of "the Jacobian is the derivative." Sliders can't show ellipse-from-disk.
- **Prior art:** 3Blue1Brown's "Essence of linear algebra" stretching visuals; Christopher Olah's "Neural Networks, Manifolds, and Topology" (colah.github.io/posts/2014-03-NN-Manifolds-Topology/).

---

### 5. Key formulas (LaTeX-ready)

**Vectors (inline primer)**
- `\mathbf{v} = [v_1, v_2, \ldots, v_n]`
- `\|\mathbf{v}\| = \sqrt{v_1^2 + v_2^2 + \cdots + v_n^2}`
- `\mathbf{u} \cdot \mathbf{v} = \sum_{i=1}^{n} u_i v_i`
- `\mathbf{u} \cdot \mathbf{v} = \|\mathbf{u}\|\,\|\mathbf{v}\|\cos\theta`
- `\hat{\mathbf{v}} = \mathbf{v}/\|\mathbf{v}\|`

**Partial derivatives**
- `\frac{\partial f}{\partial x_i} = \lim_{h \to 0} \frac{f(\mathbf{x} + h\mathbf{e}_i) - f(\mathbf{x})}{h}`
- `f_x, \; f_y, \; f_{x_i}` (subscript notation)

**Gradient**
- `\nabla f = \left[ \frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \ldots, \frac{\partial f}{\partial x_n} \right]`
- `\nabla f \cdot \mathbf{u} = \|\nabla f\|\cos\theta`

**Linear approximation / tangent plane**
- `f(\mathbf{x}_0 + \mathbf{h}) \approx f(\mathbf{x}_0) + \nabla f(\mathbf{x}_0) \cdot \mathbf{h}`
- `z = f(x_0,y_0) + f_x(x_0,y_0)(x-x_0) + f_y(x_0,y_0)(y-y_0)`

**Directional derivative**
- `D_{\mathbf{u}} f(\mathbf{x}) = \nabla f(\mathbf{x}) \cdot \mathbf{u} \quad (\|\mathbf{u}\|=1)`
- `\max_{\|\mathbf{u}\|=1} D_{\mathbf{u}} f = \|\nabla f\|, \text{ achieved at } \mathbf{u} = \nabla f / \|\nabla f\|`

**Level set**
- `\{\mathbf{x} \in \mathbb{R}^n : f(\mathbf{x}) = c\}`
- `\nabla f(\mathbf{x}) \perp \text{level set through } \mathbf{x}`

**Chain rule (multivariable, scalar t)**
- `\frac{dz}{dt} = \frac{\partial f}{\partial x}\frac{dx}{dt} + \frac{\partial f}{\partial y}\frac{dy}{dt}`
- `\frac{\partial z}{\partial s} = \sum_i \frac{\partial f}{\partial x_i}\frac{\partial x_i}{\partial s}`

**Jacobian**
- `\mathbf{J}_F = \begin{bmatrix} \frac{\partial F_1}{\partial x_1} & \cdots & \frac{\partial F_1}{\partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial F_m}{\partial x_1} & \cdots & \frac{\partial F_m}{\partial x_n} \end{bmatrix}`
- `\mathbf{J}_{f \circ g}(\mathbf{x}) = \mathbf{J}_f(g(\mathbf{x}))\,\mathbf{J}_g(\mathbf{x})`

**Jacobian-vector product / vector-Jacobian product**
- `\text{JVP}: \mathbf{J}\mathbf{v}`
- `\text{VJP}: \mathbf{v}^\top \mathbf{J}`

**Hessian**
- `\mathbf{H}_f = \begin{bmatrix} \frac{\partial^2 f}{\partial x_1^2} & \cdots & \frac{\partial^2 f}{\partial x_1 \partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial^2 f}{\partial x_n \partial x_1} & \cdots & \frac{\partial^2 f}{\partial x_n^2} \end{bmatrix}`
- Clairaut: `\frac{\partial^2 f}{\partial x_i \partial x_j} = \frac{\partial^2 f}{\partial x_j \partial x_i}` (under continuity)
- Second-order Taylor: `f(\mathbf{x}_0+\mathbf{h}) \approx f(\mathbf{x}_0) + \nabla f^\top \mathbf{h} + \tfrac{1}{2}\mathbf{h}^\top \mathbf{H} \mathbf{h}`

**ML-flavored**
- MSE gradient: `\nabla_{\mathbf{w}} L = 2(\mathbf{w}^\top \mathbf{x} - y)\,\mathbf{x}`
- Softmax: `s_i = \frac{e^{z_i}}{\sum_k e^{z_k}}`
- Softmax Jacobian: `\mathbf{J}_s = \mathrm{diag}(\mathbf{s}) - \mathbf{s}\mathbf{s}^\top`
- Linear-layer gradient: `\frac{\partial L}{\partial \mathbf{W}} = \mathbf{r}\,\mathbf{x}^\top, \quad \mathbf{r} = \frac{\partial L}{\partial \mathbf{h}}`

---

### 6. Lesson decomposition

Five lessons, ~90 minutes total.

#### Lesson 6.1 — "Functions with more than one knob"
**Summary:** When inputs become a list, the derivative becomes a list. Start here.
**Estimated time:** 15 min.
**Widgets:** none (intro), `partialAsSlice` preview at the end.
**Steps:**
1. *Hook* — Real ML loss has millions of inputs. We'll start with 2.
2. *Vector primer* — A vector is a list of numbers; show 2D points and arrows.
3. *Vector ops we need* — addition, scaling, length, dot product (algebraic only here).
4. *Functions of two variables* — `f(x,y)`; tabulate `f(x,y) = x² + y²` on a grid.
5. *Graph as a surface* — show paraboloid; spinning 3D viz.
6. *Level sets* — slice the paraboloid horizontally; get concentric circles.
7. *Contour plot* — the topographic-map view, our workhorse 2D representation.
8. **StepCheck:** "What level curve does `x² + y² = 9` describe?" Expected: a circle of radius 3.
9. *Preview* — "Next: when only one knob wiggles, what's the slope?"

#### Lesson 6.2 — "Partial derivatives: one knob at a time"
**Summary:** Freeze every variable except one, then it's just m5-calculus.
**Estimated time:** 18 min.
**Widgets:** `partialAsSlice`.
**Steps:**
1. *Motivation* — Slope of the paraboloid at `(1,2)` depends on which direction you walk.
2. *The trick* — freeze `y`, get a 1D function `g(x)`, differentiate normally.
3. *Notation* — `∂f/∂x`, `f_x`; what the `∂` means.
4. *Worked: paraboloid* (E1). StepCheck inside.
5. *Worked: slice geometry* (E2) — same answer from the 1D slice.
6. *Use the widget* — drag the point, watch slope, predict the sign before releasing.
7. **StepCheck:** "For `f(x,y) = 3xy + y²`, compute `∂f/∂x` at `(2,5)`." Expected: 15.
8. *Higher-D* — partials for `f:ℝⁿ→ℝ`; one slope per axis.
9. *Symmetry preview* — `∂²f/∂x∂y = ∂²f/∂y∂x` for our functions (Clairaut; defer proof).
10. **StepCheck:** "For `f(x,y) = x³y²`, compute `f_{xy}`." Expected: `6xy²`.
11. *Endgame callback line* (see §8).

#### Lesson 6.3 — "The gradient: assembling the partials"
**Summary:** Stack the partials into a vector. That vector has a job: it points uphill, fastest.
**Estimated time:** 22 min.
**Widgets:** `gradientField`, `directionalProbe`.
**Steps:**
1. *Definition* — `∇f` is the column/row of all `∂f/∂xᵢ`.
2. *Worked: gradient of distance* (E3).
3. *Worked: level curves of `xy`* (E4) — `∇f ⊥` level set.
4. *Why perpendicular?* — short geometric argument (no movement along level set ⇒ directional derivative is zero ⇒ `∇f·tangent = 0`).
5. *Use `gradientField`* — drag point on contour plot, confirm arrow ⊥ contour.
6. *Dot-product geometric identity* — short primer: `u·v = ‖u‖‖v‖cosθ`.
7. *Directional derivative* — `D_uf = ∇f·u` for unit `u`.
8. *Worked: directional on tilted plane* (E5).
9. **StepCheck:** "For `f = x² + y²`, find the directional derivative at `(1,1)` in direction `[1, 0]`." Expected: 2.
10. *Steepest ascent* — `D_uf = ‖∇f‖cosθ`; `cosθ=1` ⇒ `u = ∇f/‖∇f‖`.
11. *Use `directionalProbe`* — rotate handle; find max numerically; confirm it aligns with `∇f`.
12. **StepCheck:** "In what unit direction is `f = x² + 4y²` increasing fastest at `(1,1)`?" Expected: `[2, 8]/√68 = [1, 4]/√17`.
13. *Endgame callback.*

#### Lesson 6.4 — "Chain rule, Jacobians, and how `loss.backward()` actually works"
**Summary:** Compose multivariable functions; the derivative is a matrix product. This is backpropagation.
**Estimated time:** 22 min.
**Widgets:** `chainRulePaths`, `jacobianAsMatrix`.
**Steps:**
1. *Why chain rule again* — neural net layers are composed functions.
2. *Scalar-t chain rule* — `dz/dt = (∂f/∂x)(dx/dt) + (∂f/∂y)(dy/dt)`.
3. *Worked: bug on a circle* (E6).
4. *Sum-over-paths picture* — `chainRulePaths` widget; gradients add at forks (the CS231n line, quoted verbatim in §3 M7).
5. *Vector-valued functions* — `F: ℝⁿ → ℝᵐ`; stack outputs.
6. *Jacobian* — m×n matrix; rows are gradients.
7. *Use `jacobianAsMatrix`* — watch the wiggle disk deform into ellipse; this *is* the local derivative.
8. *Chain rule for Jacobians* — `J_{f∘g} = J_f · J_g` (matrix product; rules deferred to m7).
9. *Worked: softmax Jacobian* (E9).
10. **StepCheck:** "For 2-class softmax with `s = (0.3, 0.7)`, what's `∂s_1/∂z_2`?" Expected: `-0.21`.
11. *JVP and VJP* — forward vs reverse mode; reverse is what `.backward()` does.
12. *Worked: linear layer gradient* (E10).
13. *Shape rule* — the gradient of a scalar wrt anything has that thing's shape (CS231n dimension balancing).
14. **StepCheck:** "If `W ∈ ℝ^{3×4}`, what's the shape of `∂L/∂W`?" Expected: 3×4.
15. *Endgame callback.*

#### Lesson 6.5 — "Curvature: the Hessian and why saddles matter"
**Summary:** Second derivatives in many variables form a matrix. It tells you whether you're in a bowl, a peak, or a saddle.
**Estimated time:** 13 min.
**Widgets:** `hessianBowlSaddle`, `lossLandscapeWalker` (preview).
**Steps:**
1. *Recap critical points in 1D* — `f'=0` plus `f''` sign test.
2. *Critical points in 2D* — `∇f=0`. But which kind?
3. *Worked: saddle* (E7).
4. *Define Hessian* — table of second partials; symmetric by Clairaut.
5. *Use `hessianBowlSaddle`* — bend curvatures; identify bowl/peak/saddle by feel.
6. *Classification rule (geometric)* — "curves up in every direction ⇒ min." Defer eigenvalues to m7.
7. *Why saddles matter in ML* — high-dim loss landscapes are dominated by saddles, not local minima (Dauphin et al., 2014, "Identifying and Attacking the Saddle Point Problem in High-Dimensional Non-Convex Optimization," NIPS 27, pp. 2933–2941; reference only).
8. **StepCheck:** "Classify the critical point at `(0,0)` of `f = x² + 3y² - 2xy`." Expected: local min (Hessian `[[2,-2],[-2,6]]`, det=8>0, `f_{xx}>0`).
9. *Preview `lossLandscapeWalker`* — gradient descent on a real loss surface; cliffhanger into m8.
10. *Endgame callback.*

---

### 7. Problem bank

**P1** *(novice / computation / `partial-derivative`)* — Compute `∂f/∂x` for `f(x,y) = 3x²y + 5y - 7`. **Answer:** `6xy`.

**P2** *(novice / computation / `partial-derivative`)* — For `f(x,y) = x² + y²`, evaluate `∂f/∂y` at `(2, -3)`. **Answer:** `-6`.

**P3** *(novice / computation / `partial-derivative`, `second-partial`)* — Compute `f_{xy}` for `f(x,y) = e^{xy}`. **Answer:** `e^{xy}(1+xy)`.

**P4** *(novice / interpretation / `partial-as-slice-slope`)* — `f(x,y) = ln(x) + y²`. Describe what `∂f/∂x(3, 7)` measures geometrically, in one sentence. **Answer:** The slope of the 1D curve `g(x) = ln(x) + 49` at `x=3`; equivalently the slope of the slice of the surface `z=f(x,y)` along the plane `y=7`, evaluated at `x=3`. Numerically, `1/3`.

**P5** *(novice / computation / `gradient-vector`)* — For `f(x,y,z) = x²y + yz²`, find `∇f` at `(1, 2, -1)`. **Answer:** `[4, 2, -4]`.

**P6** *(intermediate / computation / `directional-derivative`)* — For `f(x,y) = x³ - 3xy²`, find the directional derivative at `(1, 1)` in the direction of `v = [3, 4]`. **Answer:** `∇f = [3x²-3y², -6xy] = [0, -6]`; unit `û = [3/5, 4/5]`; `D_ûf = 0·(3/5) + (-6)·(4/5) = -24/5`.

**P7** *(intermediate / interpretation / `gradient-steepest-ascent`)* — A hiker stands at `(2, 1)` on the terrain `f(x,y) = x² + 3y²`. In which unit-vector direction should she walk to gain altitude fastest, and what's her rate of ascent? **Answer:** `∇f = [2x, 6y] = [4, 6]`; direction `[4,6]/√52 = [2,3]/√13`; rate `√52 = 2√13`.

**P8** *(intermediate / construction / `level-set`, `gradient-perp-level-set`)* — Sketch the level curves of `f(x,y) = y - x²` for `c = -1, 0, 1`, and verify by computing `∇f(1, 1)` that the gradient is perpendicular to the level curve through that point. **Answer:** Level curves are parabolas `y = x² + c`. `∇f = [-2x, 1]`, at `(1,1)`: `[-2, 1]`. Tangent to level curve `y=x²` at `x=1` has slope `2`, direction `[1,2]`. Dot product `(-2)(1)+(1)(2) = 0` ✓.

**P9** *(intermediate / computation / `multivar-chain-rule-scalar`)* — Let `z = x² + y²` with `x = cos t`, `y = sin t`. Find `dz/dt` two ways: directly (substitute then differentiate) and via the chain rule. **Answer:** Direct: `z = 1`, `dz/dt = 0`. Chain rule: `2x(-sin t) + 2y(cos t) = -2cos t sin t + 2 sin t cos t = 0`. Both ✓.

**P10** *(intermediate / computation / `multivar-chain-rule-scalar`)* — `z = ln(u² + v²)` with `u(s,t) = s+t`, `v(s,t) = s-t`. Compute `∂z/∂s`. **Answer:** `∂z/∂s = (2u/(u²+v²))·1 + (2v/(u²+v²))·1 = 2(u+v)/(u²+v²) = 4s/(2s²+2t²) = 2s/(s²+t²)`.

**P11** *(intermediate / computation / `jacobian-matrix`)* — For `F(x,y) = (x²+y, e^x sin y)`, write the Jacobian at `(0, 0)`. **Answer:** `J = [[2x, 1], [e^x sin y, e^x cos y]]` → at `(0,0)`: `[[0, 1], [0, 1]]`.

**P12** *(intermediate / computation / `tangent-plane`)* — Find the tangent plane to `z = x² + y²` at `(1, 2, 5)`. **Answer:** `z = 5 + 2(x-1) + 4(y-2) = 2x + 4y - 5`.

**P13** *(intermediate / computation / `hessian-matrix`, `critical-point-classification`)* — Find and classify all critical points of `f(x,y) = x³ - 3x + y² + 4y`. **Answer:** `∇f = [3x²-3, 2y+4] = 0` ⇒ `x=±1, y=-2`. `H = [[6x, 0], [0, 2]]`. At `(1,-2)`: H=`[[6,0],[0,2]]` positive-definite, **local min**. At `(-1,-2)`: H=`[[-6,0],[0,2]]` indefinite, **saddle**.

**P14** *(advanced / computation / `multivar-chain-rule-matrix`)* — Let `g(x) = (x², 2x)` and `f(u,v) = u + v²`. Compute `(f∘g)'(x)` two ways. **Answer:** Direct: `(f∘g)(x) = x² + 4x² = 5x²`, derivative `10x`. Chain rule: `J_f = [1, 2v]`, `J_g = [[2x],[2]]`, product = `1·2x + 2v·2 = 2x + 4(2x) = 10x` ✓.

**P15** *(advanced / construction / `jacobian-matrix`, ML)* — Derive the Jacobian of `softmax: ℝ² → ℝ²` applied to `(z₁, z₂)`. Show the result has the form `diag(s) - ssᵀ`. **Answer:** `s_i = e^{z_i}/(e^{z_1}+e^{z_2})`. Case `i=j`: quotient rule gives `s_i(1-s_i)`. Case `i≠j`: `−s_i s_j`. Stacking: `J = [[s_1(1-s_1), -s_1 s_2], [-s_2 s_1, s_2(1-s_2)]] = diag(s) - ssᵀ`.

**P16** *(advanced / debugging / shape-rule, ML)* — A student writes `dW = x @ r` for the gradient of `L = ½‖Wx - t‖²` wrt `W`, where `W ∈ ℝ^{m×n}`, `x ∈ ℝⁿ`, `r = Wx - t ∈ ℝᵐ`. The shapes don't match. What is the correct expression? **Answer:** `dW = r @ x.T` (i.e. `r xᵀ`), shape `m×n` matching `W`. Bug: confused outer product order; `x @ r` is undefined (n-vector × m-vector) and wouldn't even type-check. Shape rule: `∂L/∂W` must have shape `m×n`.

**P17** *(advanced / proof-scaffold / `gradient-steepest-ascent`)* — Prove that for any differentiable `f: ℝⁿ → ℝ` with `∇f(x) ≠ 0`, the unit direction maximizing `D_uf(x)` is `u* = ∇f(x)/‖∇f(x)‖`. *Scaffold provided:* (a) Write `D_uf = ∇f·u`. (b) Apply `u·v = ‖u‖‖v‖cosθ`. (c) Note `‖u‖=1`. (d) Maximize over θ. **Answer:** `D_uf = ‖∇f‖·1·cosθ = ‖∇f‖cosθ`. Max at `cosθ=1`, i.e. `u ∥ ∇f`. With `‖u‖=1`, `u* = ∇f/‖∇f‖`. Max value `= ‖∇f‖`.

**P18** *(advanced / interpretation / `hessian-matrix`)* — Explain in one paragraph why, in a high-dimensional neural-network loss landscape, saddle points are far more common than local minima. *(Hint: think about how many independent directions the Hessian's curvature must be positive in.)* **Answer:** A local minimum requires every one of the n diagonal-like curvatures to be positive — probability ≈ `(1/2)^n` if signs are roughly independent. A saddle requires only *mixed* signs (at least one positive and at least one negative), with probability `1 - 2·(1/2)^n ≈ 1` for large n. So in million-parameter models the overwhelming majority of zero-gradient points are saddles — the formal version of this argument is Dauphin et al. (2014), whose NIPS abstract states: *"a deeper and more profound difficulty originates from the proliferation of saddle points, not local minima, especially in high dimensional problems of practical interest."*

**P19** *(advanced / construction / `multivar-chain-rule-matrix`, capstone)* — For the tiny network `h = Wx + b`, `y = ReLU(h)`, `L = ½‖y - t‖²`, compute `∂L/∂W`, `∂L/∂b`, and `∂L/∂x` using the matrix chain rule. **Answer:** Let `m = ReLU'(h) = 1[h>0]` (elementwise). `∂L/∂y = y - t = e`. `∂L/∂h = e ⊙ m =: g`. `∂L/∂W = g xᵀ`. `∂L/∂b = g`. `∂L/∂x = Wᵀ g`.

**P20** *(advanced / debugging / `multivar-chain-rule-scalar`)* — A student computes `dz/dt` for `z = xy` with `x(t)=t²`, `y(t)=t³` and gets `5t⁴`. Verify by direct substitution and identify the bug if any. **Answer:** Direct: `z = t⁵`, `dz/dt = 5t⁴` ✓. No bug — this is one of the rare cases where the wrong-looking "single-branch" computation accidentally agrees with direct substitution because both branches have the same `t`-power structure. Used to teach that "answer matches" is necessary but not sufficient; check the derivation. (Chain rule check: `y·dx/dt + x·dy/dt = t³·2t + t²·3t² = 2t⁴ + 3t⁴ = 5t⁴` ✓.)

---

### 8. Endgame callback: refined

The starter is fine but a bit long for a per-lesson footer. Three candidates:

**Option A (recommended, tight):**
> *Every time you'll call `loss.backward()`, PyTorch is just walking your computation graph backward and multiplying Jacobians. The chain rule you just wrote on paper IS backpropagation.*

**Option B (more concrete, names the object):**
> *`loss.backward()` returns one number per parameter. That list of numbers is `∇L` — the gradient you just learned to compute by hand.*

**Option C (the Karpathy framing):**
> *Backprop = the chain rule, applied recursively across a DAG of scalar operations. You just did it for a 2-input function. Karpathy's micrograd does the same thing in 100 lines of Python — the README states it "implements backpropagation (reverse-mode autodiff) over a dynamically built DAG and a small neural networks library on top of it with a PyTorch-like API." PyTorch does it for billions of parameters.*

**Recommendation: Option A** as the universal footer on every lesson; promote Option B inside Lesson 6.4 (where it lands hardest) and Option C as the closing line of the module.

---

### 9. Sources (licensing-aware)

**[ADAPT] Distill.pub — "Why Momentum Really Works"** — Gabriel Goh — https://distill.pub/2017/momentum/ — interactive article — License: **CC BY 4.0** (stated in article footer; Distill journal policy at https://distill.pub/journal/ requires CC BY: *"Distill articles are released under the Creative Commons Attribution license"*; verified verbatim from article footers: *"Diagrams and text are licensed under Creative Commons Attribution CC-BY 4.0 … unless noted otherwise. The figures that have been reused from other sources don't fall under this license and can be recognized by a note in their caption: 'Figure from …'"*). Use for: gradient-descent / loss-landscape widget inspiration; **the** model of "explorable explanation" with controls that grab named objects. Diagrams may be adapted with attribution; "Figure from …" reused art is excluded.

**[ADAPT] Christopher Olah — "Neural Networks, Manifolds, and Topology"** — https://colah.github.io/posts/2014-03-NN-Manifolds-Topology/ — blog — License: per colah.github.io footer, posts are released under a Creative Commons Attribution license (verify per-post; the 2014 piece is permissive). Use for: Jacobian-as-local-linear-map inspiration (the "stretching disks into ellipses" framing for our `jacobianAsMatrix` widget).

**[ADAPT] Mafs library** — Steven Petryk — https://mafs.dev / https://github.com/stevenpetryk/mafs — software/library — License: **MIT** (LICENSE file at github.com/stevenpetryk/mafs/blob/main/LICENSE; verbatim grant: *"Permission is hereby granted, free of charge, to any person obtaining a copy of this software … to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software … subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software."*). Use for: all 2D math widgets (`gradientField`, `directionalProbe`, `chainRulePaths` 2D version). Bundle the MIT notice in a third-party-licenses page. For 3D surface visuals not covered by Mafs, wrap Three.js (MIT) or react-plotly.js (MIT).

**[ADAPT] Karpathy `micrograd`** — Andrej Karpathy — https://github.com/karpathy/micrograd — code — License: **MIT** (LICENSE file in the repo). Use for: shipping a tiny micrograd-style autograd snippet (with the MIT notice) as a runnable in-browser demo at the bottom of Lesson 6.4. The accompanying YouTube videos remain reference-only.

**[REFERENCE-ONLY] 3Blue1Brown — "Essence of Calculus" + "Gradient Descent, how Neural Networks Learn"** — Grant Sanderson — https://www.3blue1brown.com/topics/calculus and https://www.3blue1brown.com/lessons/gradient-descent/ — video / web article — License: standard YouTube TOS + the 3b1b site does not grant CC reuse. Use for: pedagogical reference on the "derivative as local stretch" framing and the gradient-as-direction-of-steepest-increase explanation. Link to videos; do not embed or adapt animations.

**[REFERENCE-ONLY] Stanford CS231n notes — "Backpropagation, Intuitions" (Optimization-2)** — Andrej Karpathy — https://cs231n.github.io/optimization-2/ — course notes — License: Stanford course material, not openly licensed for commercial reuse. Use for: the "gradients add up at forks" framing (quotable in your prose for educational fair use, as in §3 M7), the dimension-balancing/shape-rule heuristic (Stanford CS231n 2018 discussion notes, cs231n.stanford.edu/slides/2018/cs231n_2018_ds02.pdf), gradient-checking pitfalls.

**[REFERENCE-ONLY] Mathematics for Machine Learning, Ch. 5 (Vector Calculus)** — Deisenroth, Faisal, Ong — https://mml-book.com — textbook — License: **personal-use only**. Verbatim PDF notice: *"This version is free to view and download for personal use only. Not for re-distribution, re-sale, or use in derivative works."* Use for: scope/sequence reference; canonical ordering of partials → gradient → Jacobian → Hessian for a technical adult audience. Linking and citing is fine; embedding or adapting any text or figure requires permission from Cambridge University Press.

**[REFERENCE-ONLY] MIT OCW 18.02 Multivariable Calculus (Auroux)** — https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/ — video lectures + notes — License: **CC BY-NC-SA**. Use for: canonical problem framing; lecture-organization reference; the d'Arbeloff Mathlets as widget inspiration. Cannot adapt figures or text into the paid product.

**[REFERENCE-ONLY] Gilbert Strang — "Calculus" (free MIT-hosted edition)** — https://ocw.mit.edu/courses/res-18-001-calculus-fall-2023/ (PDF at ocw.mit.edu/ans7870/resources/Strang/Edited/Calculus/Calculus.pdf) — textbook — License: **CC BY-NC-SA** (OCW site-wide; the NC clause explicitly prohibits commercial reuse). Use for: pedagogical framing of multivariable extensions; do not embed or adapt.

**[REFERENCE-ONLY] Parr & Howard — "The Matrix Calculus You Need For Deep Learning"** — Terence Parr & Jeremy Howard — https://explained.ai/matrix-calculus/ and https://arxiv.org/abs/1802.01528 — paper / web article — License: **arXiv "perpetual non-exclusive license to distribute" v1.0** — authors retain copyright; no third-party reuse rights granted. arXiv's own help page explains the license "gives limited rights to arXiv to distribute the article, and also limits re-use of any type from other entities or individuals." The explained.ai HTML version has no separate open license. Use for: the cleanest treatment of Jacobian chain-rule for ML practitioners; the scalar-derivative → vector-gradient → matrix-Jacobian progression we mirror in Lesson 6.4. Link only; quote brief passages under fair use; contact the authors for anything more.

**[REFERENCE-ONLY] BetterExplained — "Understanding the Gradient"** — Kalid Azad — https://betterexplained.com/articles/vector-calculus-understanding-the-gradient/ — blog — License: not openly licensed. Use for: the "microwave + dough-boy" analogy framing for the gradient as input-space direction; tone and analogy reference.

**[REFERENCE-ONLY] OpenStax Calculus Volume 3** — Strang, Herman et al. — https://openstax.org/details/books/calculus-volume-3 — textbook — License history is *split*: the original 2019 PDF carries a stated **CC BY 4.0** license; the current 2024+ edition on openstax.org and the OpenTextBC mirror are explicitly **CC BY-NC-SA 4.0**. Treat as **REFERENCE-ONLY** in the safer current edition; if you intend to adapt content, you must adapt specifically from the verified-CC-BY 2019 PDF *with appropriate snapshot/archive proof of that license at time of access*. Use for: problem-bank inspiration; canonical worked-example formats.

---

### 10. Pedagogical traps

**T1 — "Front-loading too much linear algebra primer."** Adults rebel at "let me teach you matrices before you do anything fun." It happens because we instinctively want to fix prerequisites before use. **Mitigation:** introduce vectors operationally as "lists of numbers" the moment they're needed (Lesson 6.1, step 2), and the dot product algebraically when assembling `∇f·u`. Defer matrix-multiplication rules to m7; in m6, "Jacobian × Jacobian" is presented as "compose Jacobians; multiply-and-sum the way we just did for chain rule" — no formal matmul prerequisite.

**T2 — "Skipping the slice."** Many courses (and Karpathy implicitly assumes this) jump straight to `∇f = [∂f/∂x, ∂f/∂y]` without ever showing the 1D slice. Adults then never quite trust the partial-derivative definition. **Mitigation:** Lesson 6.2 explicitly does E1 *and* E2 — the slice-as-1D-curve is the bridge from m5 to m6 and should be the first non-trivial computation the learner does.

**T3 — "Treating the gradient as a magic arrow on the surface."** This is the M2/M3 misconception institutionalized as bad pedagogy. Comes from instructors drawing the gradient on a 3D surface plot. **Mitigation:** in every gradient diagram, draw the contour plot (input plane) first; show `∇f` *on the floor*. Only after the input-space picture is solid, optionally show the surface for connection. Our `gradientField` widget enforces this by design.

**T4 — "Hessian-as-eigenvalues before geometry."** Tempting because the test is closed-form. But adults who haven't done linear algebra in 10 years bounce off `positive-definite`. **Mitigation:** the `hessianBowlSaddle` widget delivers the geometry *first* — "feel the curvature; the matrix is just the readout." Defer eigenvalue test to m7. Use the determinant + trace shortcut for 2×2 only as a computational backup, never as the conceptual core.

**T5 — "Backprop introduced before the chain rule is internalized."** A common Karpathy-fan failure mode: the student watches micrograd, codes along, but can't differentiate `f(g(h(x)))` on paper because they never built the chain-rule reflex. **Mitigation:** Lesson 6.4 spends its first half on scalar-t and matrix chain rule with paper exercises *before* the `chainRulePaths` widget makes it interactive. The "compute by hand, then watch the engine confirm" cycle is the deepening loop.

**T6 — "Per-lesson endgame callback turning into noise."** A footer the student sees five times can start feeling like marketing. **Mitigation:** vary the wording across lessons (use Option A in 6.1–6.3, Option B in 6.4, Option C as module closer per §8) and have each callback also point forward to a specific m8/m9 concept by name ("…and m9 will show you why momentum makes that walk smoother"). The callback is then a *map pin*, not a slogan.
