# Module 2 (Algebra) — Research Pack for *Tinker: ML, Backpropagation, and AI — The Math*

> Saved verbatim from Deep Research output. Note: the pasted source had a
> handful of transcription glitches (truncated fragments in the dependency
> graph items 5/14, examples E2/E6/E7/E8/E9, and problem P19). Lesson copy
> reconstructs the intended meaning from surrounding context; see the
> conversation that landed this module if the originals are needed.

### 1. Concept dependency graph

1. `m2-multivar-expression` — An algebraic expression built from numbers, named variables, and the four operations, evaluated by substitution. **Prereqs:** m1-variables, m1-substitution, m1-order-of-operations.
2. `m2-like-terms` — Terms with identical variable parts (same letters to same powers) can be added by adding only their coefficients. **Prereqs:** m2-multivar-expression.
3. `m2-distributive-rewrite` — `a(b+c) = ab+ac` understood as a structural rewrite that changes form without changing value; the inverse direction is factoring out a common factor. **Prereqs:** m2-multivar-expression.
4. `m2-linear-eq-1var-extended` — One-variable linear equations that first need expansion and like-term collection before the m1 "peel from the outside in" inverse procedure applies. **Prereqs:** m1-balance-equation, m2-like-terms, m2-distributive-rewrite.
5. `m2-linear-inequality` — Solving a linear inequality is solving a linear equation, with the extra rule: multiplying or dividing both sides by a negative flips the inequality. **Prereqs:** m2-linear-eq-1var-extended.
6. `m2-cartesian-plane` — `R^2` as a set of ordered pairs; a two-variable equation `F(x,y)=0` is read as the *solution set* of points where the equation holds. **Prereqs:** m1-number-line.
7. `m2-line-slope` — Slope as rise/run and as constant rate of change `dy/dx`; the defining property of a straight line is that this ratio is the same between any two of its points. **Prereqs:** m2-cartesian-plane.
8. `m2-line-forms` — Slope-intercept `y=mx+b`, point-slope `y-y0=m(x-x0)`, and the recognition that these are the same line written for different "anchors." **Prereqs:** m2-line-slope.
9. `m2-parallel-perp` — Two non-vertical lines are parallel iff `m1=m2` and perpendicular iff `m1 m2 = -1`. **Prereqs:** m2-line-forms.
10. `m2-2x2-systems` — A pair of linear equations as two lines in the plane; the three outcomes (one intersection / parallel / coincident) are geometric facts about those lines. Solve by substitution or elimination. **Prereqs:** m2-line-forms, m2-linear-eq-1var-extended.
11. `m2-function-machine` — A function is a deterministic input→output rule with a declared domain (legal inputs) and codomain (universe of outputs); the realized range is the actual output set. The vertical-line test is just "exactly one output per input" drawn graphically. **Prereqs:** m2-cartesian-plane.
12. `m2-fx-notation` — `f(x)` is evaluation, not multiplication: it names the output of `f` at the input `x`. Read it as `f.call(x)`. **Prereqs:** m2-function-machine.
13. `m2-composition` — `(g∘f)(x) = g(f(x))` is wiring `f`'s output socket into `g`'s input socket; this is the M2 ancestor of stacked neural-network layers. **Prereqs:** m2-fx-notation.
14. `m2-inverse-function` — `f^-1` is the machine that undoes `f`; it exists as a function only when `f` is one-to-one on the chosen domain, which is why domain restrictions are not bureaucratic but constitutive. **Prereqs:** m2-composition.
15. `m2-polynomials` — A sum of terms `a_k x^k`; degree is the largest `k` with nonzero coefficient. **Prereqs:** m2-multivar-expression, m2-fx-notation.
16. `m2-quadratics-parabola` — Degree-2 polynomial `ax^2+bx+c`; its graph is a parabola whose vertex is at `x=-b/(2a)` and whose `x`-intercepts (if real) are the roots. **Prereqs:** m2-polynomials.
17. `m2-factor-and-quadratic-formula` — Factoring `x^2+bx+c=(x-r1)(x-r2)` via Vieta (sum `=-b`, product `=c`); the quadratic formula `x = (-b±sqrt(b^2-4ac))/(2a)` derived by completing the square; the discriminant `b^2-4ac` classifies the root structure. **Prereqs:** m2-quadratics-parabola, m2-distributive-rewrite.
18. `m2-exponent-laws` — Full rules for integer, negative, zero, and rational exponents, justified by extending the "repeated multiplication" rule so that `a^(m+n)=a^m a^n` keeps holding. **Prereqs:** m1-exponents-preview.
19. `m2-exponential-function` — `f(x)=b^x` (with `b>0, b≠1`); the output is *multiplied* by the same factor for every unit increase in input — the defining feature of growth/decay. **Prereqs:** m2-exponent-laws, m2-function-machine.
20. `m2-logarithm` — `log_b(x)` is the inverse of `b^x`: it answers "to what power must I raise `b` to get `x`?" Domain restricted to `x>0`. **Prereqs:** m2-exponential-function, m2-inverse-function.
21. `m2-log-laws` — `log(xy)=log x+log y`, `log(x/y)=log x-log y`, `log(x^k)=k log x`, change of base `log_b x = log_c x / log_c b`. The first law is the load-bearing one for M8/M9. **Prereqs:** m2-logarithm, m2-exponent-laws.
22. `m2-e-and-ln` — `e≈2.71828…` is "the base that makes calculus clean"; `ln = log_e`. Intuition only; full justification deferred to `m5-calculus`. **Prereqs:** m2-log-laws.
23. `m2-product-to-sum-bridge` — *Forward pointer:* because `log` turns products into sums, a likelihood `∏_i p_i` becomes the loss `-∑_i log p_i`; M8 (probability/MLE) and M9 (information theory/cross-entropy) cash this in. **Prereqs:** m2-log-laws.

### 2. Canonical worked examples

**E1 — Distributive law as a value-preserving rewrite.**
Problem: Show two paths from `3(2x+5) - (x-4)` to a simplified equivalent.
Solution: Distribute: `6x+15-x+4`. Combine like terms: `(6x-x)+(15+4) = 5x+19`. Cross-check by substituting `x=2` into both the original and the result: `3(9)-(-2)=27+2=29` and `5(2)+19=29`. ✓
Point: The rewrite preserves the function `x↦3(2x+5)-(x-4)`, not just one numerical value — substitution is the "type check."
Common mistake: Sign error on `-(x-4)`, writing `-x-4`.

**E2 — Equation that needs cleanup before peeling.**
Problem: Solve `2(3x-1) - 4 = 5x + 7`.
Solution: Expand: `6x-2-4 = 5x+7 ⇒ 6x-6 = 5x+7`. Subtract `5x`: `x-6=7`. Add 6: `x=13`. Verify: `2(38)-4 = 72`; `5(13)+7 = 72`. ✓
Point: M2's job is to get the equation back into m1 shape, then apply m1's inverse-peel.
Common mistake: Distributing `2` into `3x` but forgetting to distribute into `-1`.

**E3 — Slope and the equation of a line through two points.**
Problem: Find the equation of the line through `(-2,1)` and `(4,-3)`.
Solution: `m = (-3-1)/(4-(-2)) = -4/6 = -2/3`. Point-slope: `y-1 = -(2/3)(x+2)`. Distribute and solve for `y`: `y = -(2/3)x - 4/3 + 1 = -(2/3)x - 1/3`.
Point: Slope is invariant — *which* two points you pick on the line doesn't matter. Point-slope is the "anchor + direction" form; slope-intercept is just point-slope with the anchor chosen as `(0,b)`.
Common mistake: Computing `Δx / Δy` instead of `Δy / Δx`.

**E4 — System of two linear equations by elimination.**
Problem: Solve `2x+3y = 12` and `4x - y = 10`.
Solution: Multiply the second equation by 3: `12x - 3y = 30`. Add to the first: `14x = 42`, so `x=3`. Back-substitute: `2(3)+3y=12 ⇒ y=2`. Geometrically, the two lines cross at `(3,2)`.
Point: Algebra and geometry are doing the same thing — elimination is just hunting for the intersection.
Common mistake: Multiplying only one term of an equation when scaling it (forgetting the right-hand side).

**E5 — Function composition computed two ways.**
Problem: Let `f(x)=2x+1` and `g(x)=x^2`. Compute `(g∘f)(3)` and `(f∘g)(3)`.
Solution: `(g∘f)(3) = g(f(3)) = g(7) = 49`. `(f∘g)(3) = f(g(3)) = f(9) = 19`.
Point: Order matters. `g∘f ≠ f∘g`. This is the *exact* reason a neural network's layer order is a structural decision, not a stylistic one.
Common mistake: Reading `g∘f` left-to-right and computing `f(g(x))` instead of `g(f(x))`.

**E6 — The quadratic formula via completing the square.**
Problem: Derive `x = (-b±sqrt(b^2-4ac))/(2a)` from `ax^2+bx+c=0`.
Solution: Divide by `a`: `x^2 + (b/a)x + c/a = 0`. Move constant: `x^2+(b/a)x = -c/a`. Add `(b/(2a))^2` to both sides: `(x+b/(2a))^2 = b^2/(4a^2) - c/a = (b^2-4ac)/(4a^2)`. Square root: `x+b/(2a) = ±sqrt(b^2-4ac)/(2a)`. Solve: `x = (-b±sqrt(b^2-4ac))/(2a)`.
Point: The formula is not magic — it is one identity (`u^2+2uv+v^2=(u+v)^2`) applied carefully. The discriminant `b^2-4ac` lives inside the square root, which is exactly why its sign tells you the number of real roots.
Common mistake: Forgetting that the `±` is on the whole right-hand side.

**E7 — Exponential model and inverse with `log`.**
Problem: A culture doubles every 3 hours, starting at 1000 cells. When does it reach 10,000?
Solution: Model `N(t) = 1000 · 2^(t/3)`. Solve `10000 = 1000·2^(t/3) ⇒ 10 = 2^(t/3) ⇒ t/3 = log_2 10 ⇒ t = 3 log_2 10 ≈ 9.97` hours.
Point: Logarithm is *the* tool that releases a variable trapped in an exponent. This is the literal job description of `log`.
Common mistake: Needing `log_2(10) = log(10)/log(2)` but plugging `log_2` into a calculator that only has `log_10` and `ln`.

**E8 — Product-to-sum: the M8/M9 bridge.**
Problem: Three independent events have probabilities `0.2, 0.1, 0.05`. Express `log` of their joint probability as a sum of logs.
Solution: `P = 0.2 · 0.1 · 0.05 = 0.001`. `log_10(P) = log_10(0.2) + log_10(0.1) + log_10(0.05) ≈ (-0.699) + (-1) + (-1.301) = -3`. Verify: `log_10(0.001) = -3`. ✓
Point: Two reasons we use this constantly: (a) numerical — products of many small probabilities underflow to 0, sums of logs don't (the *log-sum-exp trick*); (b) optimization — the derivative of a sum is a sum of derivatives. This is the *only* reason training is tractable.
Common mistake: Trying to apply `log(a+b) = log a + log b`. The identity is `log(ab) = log a + log b`.

**E9 — Inverse function with a deliberate domain restriction.**
Problem: Find an inverse for `f(x) = x^2`.
Solution: `x^2` is not one-to-one on `R` (both `2` and `-2` map to `4`). Restrict the domain to `[0,∞)`; then `f^-1(y) = sqrt(y)`. On the restricted domain, `f^-1(f(x)) = x` for all `x≥0`.
Point: Inverses don't always exist for free — you have to choose a domain on which the machine *can* be run backwards.
Common mistake: Writing `f^-1(x) = ±sqrt(x)` and treating it as a function (it isn't — it's two functions).

### 3. Common misconceptions

1. **"Variables stand for objects, not numbers."** Substitute `a=3, b=5` into `2a+b` and show the result is the *number* 11, not a fruit salad. A variable is a name for a number you haven't pinned down yet.
2. **"`f^-1(x)` means `1/f(x)`."** The `^-1` collides with the reciprocal exponent. Show `sin^-1` and `1/sin` give different values; `f^-1` is the function-inverse operator, not an exponent.
3. **"Exponents distribute over addition."** `(a+b)^2 ≠ a^2+b^2`. Expand `(2+3)^2 = 25` versus `2^2+3^2 = 13`. The cross terms `2ab` are the two off-diagonal rectangles of the area square.
4. **"`log(a+b) = log a + log b`."** The log of a sum is NOT the sum of the logs. The sum of the logs is the log of the *product*.
5. **"`(x-2)(x-3)=0` means `x-2=0` *and* `x-3=0`."** The zero-product property is *or*, not *and*.
6. **"Slope is just whatever number is in front of `x`."** Present `3x + 6y = 12` and have learners predict the slope before solving. The rule fails until rearranged to `y=mx+b`.
7. **"To solve `-2x > 8`, divide by `-2` and keep the sign."** Multiplying by a negative *flips* the order; the inequality sign tracks the order, so it flips too.
8. **"`a^0 = 0`."** The pattern `a^3,a^2,a^1` each divides by `a`, so `a^0` must be 1; the product rule `a^m·a^n=a^(m+n)` forces `a^0=1`.
9. **"A function is a formula."** Show a lookup table, a piecewise definition, and a Python function with an `if`. All are functions; none is a single formula.
10. **"`g∘f` means do `g` first."** Feed into the rightmost machine first: `f(3)=4`, then `g(4)=16`.
11. **"You can cancel `x` whenever you see it on top and bottom."** `(x^2-1)/(x-1) ≠ x` everywhere; `x=1` is a hole. Cancellation requires a common *factor*, not a common *letter*.
12. **"The inverse of `y=x^2` is `y=sqrt(x)`, period."** Make domain restriction an explicit step, not a footnote. The reflected parabola is sideways and fails the vertical-line test; `sqrt` is the choice of one branch.

### 4. Interactive widget suggestions

**4.1 `linePlayground`** — drag two anchor points; live line, rise/run triangle, and the equation in point-slope (both anchors) and slope-intercept with `m` and `b` highlighted. Slope is invariant under dragging along the line.

**4.2 `machineWiring`** — two function-machine boxes; drag a wire from `f`'s output to `g`'s input; drop a ball labeled `x` and scrub it through. Ball relabels at each box (`3→7→49`); composite written symbolically. Swap wires to show `g∘f ≠ f∘g`. The M2 hero widget — literal prototype of a two-layer net forward pass.

**4.3 `expressionRewriter`** — expression rendered as an AST; click a subtree to apply distribute / factor / combine-like-terms; tree morphs, linearized expression updates, "value at x=2" readout never changes.

**4.4 `parabolaSurgery`** — drag the vertex `(h,k)` and a root; equation shown in vertex, factored, and standard form simultaneously; discriminant `b^2-4ac` shown with a sign-coded badge.

**4.5 `logScope`** — three movable markers `p1,p2,p3` on a log-scale strip; product shown on a linear strip, sum of logs on a log strip. Push a marker below ~10^-300 and the linear product underflows to 0 (red) while the log sum survives.

**4.6 `eliminateOrSubstitute`** — two equation rows; click row operations (scale, add, solve, substitute); geometric panel shows the line pair; the solution set never moves while the equations simplify until one row reads `x=…` and the other `y=…`.

### 5. Key formulas

Algebraic rewrite: `a(b+c) = ab + ac`; `(a+b)(c+d) = ac + ad + bc + bd`; `(a+b)^2 = a^2 + 2ab + b^2`; `(a-b)^2 = a^2 - 2ab + b^2`; `(a+b)(a-b) = a^2 - b^2`.

Line: `m = (y2-y1)/(x2-x1)`; `y = mx + b`; `y - y0 = m(x - x0)`; `Ax + By = C`; parallel iff `m1=m2`; perpendicular iff `m1 m2 = -1`.

Functions: `f: X → Y`; `(g∘f)(x) = g(f(x))`; `f∘f^-1 = id`, `f^-1∘f = id`.

Quadratics: `ax^2 + bx + c = 0`; `x = (-b ± sqrt(b^2-4ac))/(2a)`; `Δ = b^2-4ac`; vertex `h=-b/(2a)`, `k = c - b^2/(4a)`.

Exponent laws: `a^m·a^n = a^(m+n)`; `a^m/a^n = a^(m-n)`; `(a^m)^n = a^(mn)`; `(ab)^n = a^n b^n`; `a^0 = 1`; `a^-n = 1/a^n`; `a^(1/n) = nth-root(a)`.

Logarithms: `log_b(x) = y ⇔ b^y = x`; `log_b(xy) = log_b x + log_b y`; `log_b(x/y) = log_b x - log_b y`; `log_b(x^k) = k log_b x`; `log_b(x) = log_c(x)/log_c(b)`; `ln x = log_e x`.

The M8/M9 bridge: `log(∏ p_i) = ∑ log(p_i)`; `L(θ) = -∑ log p_θ(y_i | x_i)`.

### 6. Lesson decomposition

- **2.1 Expressions that look different but mean the same thing** (~25 min) — multi-variable expressions, like terms, distributive law as value-preserving rewrite. Widget: `expressionRewriter`.
- **2.2 Lines: the only shape with a slope** (~30 min) — Cartesian plane, slope as rate, three forms of a line, parallel/perpendicular. Widget: `linePlayground`.
- **2.3 Two lines, three outcomes: systems of equations** (~25 min) — substitution and elimination, geometric reading of one/none/infinite solutions. Widgets: `eliminateOrSubstitute`, `linePlayground`.
- **2.4 Functions and the wiring of machines** (~35 min) — function as machine, `f(x)` notation, domain/range, composition as pipeline, inverses. Widget: `machineWiring`.
- **2.5 Quadratics and the parabola** (~30 min) — polynomials, degree, three forms of a quadratic, factoring, discriminant, quadratic formula derived once. Widget: `parabolaSurgery`.
- **2.6 Exponents, exponentials, logs, and the one identity we live by** (~40 min) — exponent laws, exponential function, logarithm as inverse, log laws, `e`/`ln` intuition, the M8/M9 product-to-sum bridge. Widget: `logScope`.

### 7. Problem bank (20)

P1. Simplify `5x - 3 + 2x + 8`. → `7x + 5`.
P2. Expand `-3(2x - 4)`. → `-6x + 12`.
P3. Solve `4(x-1) = 2x + 6`. → `x = 5`.
P4. Solve `-2x + 5 > 1`. → `x < 2`.
P5. Line through `(2,-1)` and `(6,7)`. → `y = 2x - 5`.
P6. `l1: y = -(1/3)x + 4`, `l2` through `(0,0)` slope `3` — parallel/perp/neither? → perpendicular.
P7. Solve `3x+2y=12`, `x-y=1`. → `x = 2.8, y = 1.8`.
P8. `2x+4y=6`, `x+2y=5` — student says `x=2,y=1/2`; what's wrong? → inconsistent (parallel lines), no solution.
P9. `f(x)=2x-1`, `g(x)=x^2+3`; `(g∘f)(x)` in standard form. → `4x^2 - 4x + 4`.
P10. For P9 `f,g`, compute `(f∘g)(2)` and `(g∘f)(2)`. → `13` and `12`.
P11. Inverse of `f(x)=(3x+4)/2`, with domain. → `f^-1(x)=(2x-4)/3`, domain `R`.
P12. Why no function inverse for `f(x)=x^2` on `R`? → fails horizontal-line test; restrict to `[0,∞)`, then `f^-1(y)=sqrt(y)`.
P13. Solve `x^2 + x - 6 = 0` by factoring. → `x = 2, -3`.
P14. Solve `2x^2 - 4x - 3 = 0` via the quadratic formula. → `x = 1 ± sqrt(10)/2`.
P15. For `y = x^2 - 6x + 5`: vertex and `x`-intercepts. → vertex `(3,-4)`; intercepts `x = 1, 5`.
P16. Simplify `(2x^3)^2 · x^-4 / (4x)`. → `x`.
P17. Expand `log_2(8x^3/y^2)`. → `3 + 3 log_2 x - 2 log_2 y`.
P18. Half-life 8 years; when is 10% remaining? → `t = 8 log_2(10) ≈ 26.6` years.
P19. Independent outputs `p1=0.7, p2=0.6, p3=0.8`; joint as product and as sum of logs. → product `0.336`; `ln 0.336 ≈ -1.090 = ln 0.7 + ln 0.6 + ln 0.8`.
P20. From `b^(u+v) = b^u b^v`, derive `log_b(xy) = log_b x + log_b y`. Let `u=log_b x, v=log_b y`; then `xy = b^u b^v = b^(u+v)`; apply `log_b` (legal because it is a function) to get `log_b(xy) = u+v`.

### 8. Endgame callback

> `g(f(x))` is one layer wired into the next. `log(∏) = ∑(log)` is why a million tiny probabilities don't sink training. Everything that follows is these two facts at scale.

### 9. Sources

OpenStax College Algebra 2e (CC BY 4.0 — ADAPT; the college CC BY books only, not the K-12 NC-SA one). 3Blue1Brown logarithm videos (REFERENCE-ONLY). Karpathy "makemore" (video REFERENCE-ONLY; code MIT). Mathematics for Machine Learning ch.2 (REFERENCE-ONLY). Math Insight function-machine pages (CC BY-NC-SA — REFERENCE-ONLY). Paul's Online Math Notes (REFERENCE-ONLY). Po-Shen Loh quadratic-formula proof, arXiv:1910.06709 (REFERENCE-ONLY). Yorulmazlar "Inverse Function Fallacy," arXiv:2509.19357 (REFERENCE-ONLY). Bret Victor "Kill Math" (REFERENCE-ONLY). Nicky Case "How I Make Explorable Explanations" (CC0 — ADAPT structure). Gregory Gundersen "The Log-Sum-Exp Trick" (REFERENCE-ONLY). Non-adapt: Mathigon, Khan Academy, MIT OCW, CK-12, Wikipedia.

### 10. Pedagogical traps

1. The "I remember this, move on" trap — lead each lesson with a manipulation task that can't be done from rote.
2. Slider-fatigue dressed as interactivity — every widget is constraint-direct (drag objects, not parameters).
3. Logarithm as "a calculator button" — introduce `log_b` as the explicit inverse machine of `b^x`.
4. Cramming `e`/`ln` into M2 — explicitly punt the full story to M5.
5. Composition as just notation — `machineWiring` has the literal shape of a neural-net diagram.
6. Quadratic factoring as guess-the-numbers — derive the formula once; factoring is the nice-roots special case.

*Footer for every M2 lesson:* "`g(f(x))` is one layer wired into the next. `log(∏) = ∑(log)` is why a million tiny probabilities don't sink training. Everything that follows is these two facts at scale."
