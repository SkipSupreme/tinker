# Module 5 Research Brief: Single-variable Calculus, Derivatives and the Chain Rule

> Deep-research output. Saved with ~20 paste-transmission artifacts reconstructed from context (dropped mid-word characters, two merged concept-graph entries); reconstructions are logged in the conversion notes in `../plans/2026-04-24-research-prompts.md`. Conversion log lives there too. The existing `what-is-a-derivative`, `the-power-rule`, and `the-chain-rule` lessons under `apps/docs/src/content/lessons/` predate this brief and must be reconciled against section 6, not assumed to be a clean slate.

## 1. Concept dependency graph

1. **avg-rate-of-change** — Slope of the secant line connecting (a, f(a)) and (b, f(b)); equals (f(b)-f(a))/(b-a). Prereqs: m2-algebra (slope), m4-precalc (function evaluation).
2. **secant-line** — Straight line through two points on the graph of f. Prereqs: avg-rate-of-change.
3. **tangent-line-as-limit-of-secants** — Tangent at x=a is the limiting position of secant lines as the second point slides toward (a, f(a)). Prereqs: secant-line, m4-precalc (informal limit, local linearity).
4. **difference-quotient** — The expression (f(x+h)-f(x))/h for h ≠ 0. Prereqs: avg-rate-of-change.
5. **derivative-at-a-point** — f'(a) = lim_{h→0} (f(a+h)-f(a))/h when the limit exists. Prereqs: difference-quotient, m4-precalc (informal limit).
6. **instantaneous-rate-of-change** — Physical/interpretive reading of f'(a) as the rate of change of output per unit input at the instant x. Prereqs: derivative-at-a-point.
7. **derivative-as-function** — f' : x ↦ f'(x); reify the point-by-point derivative into a single function. Prereqs: derivative-at-a-point, m4-precalc (function-as-object).
8. **derivative-notations** — f'(x), dy/dx, d/dx, Df, all denoting the same object. Prereqs: derivative-as-function.
9. **differentiability-implies-continuity** — If f'(a) exists then f is continuous at a; the converse fails. Prereqs: derivative-at-a-point, m4-precalc (continuity).
10. **non-differentiability** — Corners (|x| at 0), vertical tangents (x^(1/3) at 0), and jumps; left- and right-hand derivatives disagree or are infinite. Prereqs: differentiability-implies-continuity.
11. **power-rule** — d/dx[x^n] = n·x^(n-1) for any real n. Prereqs: derivative-as-function.
12. **constant-and-sum-rules** — d/dx[c] = 0; d/dx[c·f] = c·f'; d/dx[f+g] = f' + g'. Prereqs: derivative-as-function.
13. **polynomial-differentiation** — Combine power, constant, and sum rules term by term. Prereqs: power-rule, constant-and-sum-rules.
14. **trig-derivatives** — d/dx[sin x] = cos x; d/dx[cos x] = -sin x. Prereqs: derivative-as-function, m3-trigonometry.
15. **exp-derivative** — d/dx[e^x] = e^x; the property that singles out e among all bases. Prereqs: derivative-as-function, m4-precalc (e^x).
16. **log-derivative** — d/dx[ln x] = 1/x for x > 0. Prereqs: exp-derivative, m4-precalc (ln as inverse of e^x).
17. **product-rule** — (fg)' = f'g + fg'. Prereqs: derivative-as-function.
18. **quotient-rule** — (f/g)' = (f'g - fg')/g². Prereqs: product-rule.
19. **chain-rule** — d/dx[f(g(x))] = f'(g(x))·g'(x); Leibniz: dy/dx = dy/du · du/dx. Prereqs: derivative-as-function, m4-precalc (function composition).
20. **chain-rule-as-slope-product** — Reading: "multiply slopes along the chain"; foreshadows reverse-mode autodiff. Prereqs: chain-rule.
21. **higher-order-derivatives** — f''(x) = (f')'(x); the rate of change of the rate of change. Prereqs: derivative-as-function.
22. **concavity-from-second-derivative** — f'' > 0 ⇒ concave up; f'' < 0 ⇒ concave down; an inflection point is where concavity switches. Prereqs: higher-order-derivatives.
23. **critical-points** — Points where f'(x) = 0 or f'(x) is undefined. Prereqs: derivative-as-function.
24. **first-derivative-test** — Sign change of f' at a critical point classifies local max/min. Prereqs: critical-points.
25. **second-derivative-test** — At a critical point c with f'(c) = 0: f''(c) > 0 ⇒ local min; f''(c) < 0 ⇒ local max. Prereqs: critical-points, concavity-from-second-derivative.

## 2. Canonical worked examples

**Ex 1. Derivative from the definition.**
Problem: Find f'(x) for f(x) = x^2 from the limit definition.
Solution: (f(x+h) - f(x))/h = ((x+h)^2 - x^2)/h = (2xh + h^2)/h = 2x + h. Take h → 0: f'(x) = 2x.
Pedagogical point: First exposure to "h cancels because we never plug in h=0, we take a limit." This is m4's informal limit doing its first load-bearing job.
Most common mistake: Trying to plug h=0 directly into (f(x+h)-f(x))/h before simplifying, getting 0/0 and stopping. Mitigation: insist on the simplification step before the limit step.

**Ex 2. Derivative of sqrt(x) at x = 4 (rationalize-the-numerator trick).**
Problem: Find f'(4) for f(x) = sqrt(x).
Solution: (sqrt(4+h) - 2)/h, multiply by (sqrt(4+h)+2)/(sqrt(4+h)+2): h / (h(sqrt(4+h)+2)) = 1/(sqrt(4+h)+2) → 1/4 as h → 0.
Pedagogical point: Not every difference quotient simplifies by polynomial cancellation; rationalizing exposes the same logic.
Most common mistake: Believing f'(0) fails to exist because the symbolic form 1/(2 sqrt(x)) is "undefined at 0." The conclusion is right but the reason is wrong: f'(0) does not exist because the slope there is infinite (a vertical tangent), not because a formula has a domain hole. Note sqrt(x) has domain [0, ∞), so there is no left side at 0 to begin with: the limit defining f'(0) is inherently one-sided.

**Ex 3. Where does |x| fail to be differentiable?**
Problem: Compute the left and right derivatives of f(x) = |x| at x = 0.
Solution: From the right, (|0+h| - 0)/h = h/h = 1 for h > 0. From the left, (-h)/h = -1 for h < 0. The two one-sided limits disagree, so f'(0) does not exist.
Pedagogical point: Continuity does not imply differentiability; the corner is the textbook obstruction.
Most common mistake: Saying f'(0) = 0 because the graph "touches the x-axis."

**Ex 4. Power rule on a polynomial (3B1B square-area geometry).**
Problem: Differentiate f(x) = 3x^4 - 5x^2 + 7.
Solution: f'(x) = 12x^3 - 10x.
Pedagogical point: Drills the constant-multiple, sum, and power rules; the constant 7 vanishes. The square-area geometric derivation (3Blue1Brown, Essence of Calculus Ch. 3, "Derivative formulas through geometry") earns the formula instead of memorizing it.
Most common mistake: Keeping the constant 7 (writing 12x^3 - 10x + 7), or applying the power rule to a constant.

**Ex 5. Product rule: x^2 sin x.**
Problem: Differentiate f(x) = x^2 sin x.
Solution: f'(x) = 2x · sin x + x^2 · cos x.
Pedagogical point: Pattern "derivative of first times second, plus first times derivative of second." Connects two previously-named derivatives.
Most common mistake: Writing (x^2)'(sin x)' = 2x cos x. The MIT 18.01 Fall 2006 lecture-notes packet (Session 3) flags this "derivative-of-product = product-of-derivatives" trap explicitly.

**Ex 6. Chain rule: sin(x^2).**
Problem: Differentiate f(x) = sin(x^2).
Solution: Outer = sin, inner = x^2. d/dx = cos(x^2) · 2x.
Pedagogical point: The canonical first chain-rule example. The inner derivative 2x is the factor most students forget.
Most common mistake: Writing cos(x^2) and stopping; the single most-cited chain-rule error in the calculus-education literature.

**Ex 7. Chain rule with three layers (sigmoid, ML preview).**
Problem: Differentiate f(x) = (1 + e^(-x))^(-1).
Solution: Let u = 1 + e^(-x), then f = u^(-1). f' = -u^(-2) · du/dx. du/dx = -e^(-x). So f'(x) = e^(-x) / (1 + e^(-x))^2 = f(x)(1 - f(x)).
Pedagogical point: Three nested chain-rule applications produce the neural-network activation's famous self-referential derivative; perfect bridge to m12-backpropagation.
Most common mistake: Mis-bookkeeping the negative signs, or omitting the inner -e^(-x) factor.

**Ex 8. Quotient rule (or rewrite trick).**
Problem: Differentiate f(x) = (x^2 + 1)/(x - 3).
Solution: f'(x) = ((2x)(x-3) - (x^2+1)(1))/(x-3)^2 = (x^2 - 6x - 1)/(x-3)^2.
Pedagogical point: Drills the quotient rule. Alternative recommendation is to rewrite as a product when feasible (Karpathy's pattern in micrograd is to express everything as add/mul/pow so the autograd engine never sees a division node).
Most common mistake: Reversing the order in the numerator (writing fg' - f'g instead of f'g - fg'). Mnemonic "low d-high minus high d-low, square the bottom and away we go" is the standard fix.

**Ex 9. Critical points of a cubic.**
Problem: Find and classify the local extrema of f(x) = x^3 - 3x.
Solution: f'(x) = 3x^2 - 3 = 0 ⇒ x = ±1. f''(x) = 6x. f''(1) = 6 > 0 ⇒ local min at x=1 with f(1) = -2. f''(-1) = -6 < 0 ⇒ local max at x=-1 with f(-1) = 2.
Pedagogical point: First- and second-derivative tests in concert; sets up m10-optimization (loss minimization).
Most common mistake: Forgetting to check whether f'' = 0 (test inconclusive); applying the second-derivative test mechanically without thinking why concavity classifies extrema.

**Ex 10. Derivative of e^(kx) and the "self-reproducing" property.**
Problem: Differentiate f(x) = e^(2x) and f(x) = e^x; what is special about base e?
Solution: d/dx[e^(2x)] = 2 e^(2x) (chain rule). d/dx[e^x] = e^x with no extra factor. For a^x, d/dx[a^x] = (ln a) · a^x; only when a = e is ln a = 1.
Pedagogical point: The defining property of e (its exponential is its own derivative) is what m4 set up and m5 finally cashes in. Po-Shen Loh's "A cute proof that makes e natural" (arXiv:2504.10664) is the cleanest pre-calc-level derivation we found.
Most common mistake: Believing d/dx[e^(kx)] = e^(kx) without the k factor (skipping the chain rule because "e^x is its own derivative").

## 3. Common misconceptions

1. **Tangent = "line that touches at exactly one point and does not cross."** Carried over from circle-tangent in Euclidean geometry. Vinner (1982, PME proceedings) reported this verbatim. Biza and Zachariades (2010, Journal of Mathematical Behavior 29(4):218-229) studied 182 first-year mathematics undergraduates in Greece and found only four students defined the tangent as the limit of secants; most rejected correct tangents at inflection points because the line crossed the curve there. Kill it with a `secantToTangent` widget on a wavy curve where the user watches the secant snap to a tangent that visibly crosses through the curve at an inflection.

2. **Derivative is a number, not a function.** Thompson and Harel (2021, ZDM Mathematics Education 53:507-519) document that integrating prior knowledge of functions, slope, and limits into the derivative concept is "highly demanding" and that students systematically misinterpret the derivative as "a new formula to compute" rather than as a function-valued rate of change. Reframe with the `derivativeTracer` widget: the user scrubs x, and the slope readout plots itself as a second curve, point by point.

3. **Treating dy/dx as a literal fraction.** Natural because the chain rule looks like fraction cancellation (dy/du · du/dx). Clark, Cordero, Cottrill, Czarnocha, DeVries, St. John, Tolias and Vidakovic (1997, Journal of Mathematical Behavior 16(4):345-364, "Constructing a schema: The case of the chain rule") found that most first-year calculus students remain at the "Intra" stage of an APOS schema, treating dy/du · du/dx as fraction-like cancellation rather than the composition of two rates. Reframe: dy/dx is a single symbol naming a limit; the fractional appearance is a powerful mnemonic that happens to work because differentials are well-defined objects in their own right. Be explicit about this.

4. **The derivative of a product is the product of the derivatives.** Most natural extension of the sum rule. Counter-shown by f(x) = x · x: by the wrong rule we'd get 1 · 1 = 1; correct answer is 2x. The 3B1B "two thin rectangles plus a tiny square" geometric picture (Essence of Calculus Ch. 4) makes the +fg' term visually inevitable.

5. **Forgetting the inner derivative in the chain rule.** Universally documented as the #1 chain-rule error. Mitigation: scaffold every chain-rule problem with an explicit decomposition box ("outer = ___, inner = ___, outer' at inner = ___, inner' = ___") for the first six to eight problems before allowing one-shot solutions.

6. **Continuity implies differentiability.** Believing a connected curve must have a slope everywhere. |x| at 0 is the standard slayer; Weierstrass's everywhere-continuous nowhere-differentiable function as a "rabbit hole" mention. Stress: differentiability is strictly stronger; the corner exists exactly because the left and right secant slopes disagree.

7. **The power rule only works for positive integers.** Born from the binomial-theorem proof of the power rule. Sneak in n = -1, n = 1/2, n = π with widgets that compute the slope numerically and check against n·x^(n-1).

8. **d/dx[e^(2x)] = e^(2x).** Skipping the chain factor because "e^x is its own derivative." Fix by always asking "what is the inner function" before applying any rule.

9. **A critical point is a maximum or minimum.** False at saddle/inflection points (e.g., f(x) = x^3 at 0). The first-derivative sign test is the antidote, not the second-derivative test by itself.

10. **"Instantaneous rate of change" is a contradiction.** Many adult learners encountered this in high school and never reconciled it (change requires two times). 3Blue1Brown's "Paradox of the derivative" (Essence of Calculus Ch. 2) is the standard exposition; we use his framing explicitly. Resolution: "instantaneous" is shorthand for the limit of average rates as the interval shrinks; the average rate over a vanishing interval has a finite limit precisely when the function is differentiable.

11. **The derivative formula tells you the whole story about non-differentiability.** Kvasov (2018, arXiv:1805.00343, "Teaching Differentiation: A Rare Case for the Problem of the Slope of the Tangent Line") shows the symbolic derivative may be undefined at a point where the function is in fact differentiable, and vice versa. Reframe: always check the limit-definition behavior at suspicious points, not just the symbolic formula's domain.

12. **Local linearity means f(x+h) ≈ f(x) + h.** Confusing "looks like a line" with "looks like the line y = x." Fix: the local line has slope f'(x), so the correct approximation is f(x+h) ≈ f(x) + f'(x)·h. The `localLinearityZoom` widget should overlay the actual tangent and its slope readout as zoom increases.

## 4. Interactive widget suggestions

**1. `secantToTangent`**
- Manipulates: Two draggable points P₁ = (a, f(a)) and P₂ = (a+h, f(a+h)) on a user-selectable curve; user grabs P₂ and slides it toward P₁.
- Live updates: The secant line redraws, the secant slope (numerator, denominator, ratio) displays as a fraction, and a faint trace of past secants fans out. When h falls below a threshold, the secant is highlighted as "tangent" and its slope appears next to f'(a) symbolically.
- Concept: tangent-line-as-limit-of-secants (concept 3); the moment the secant "lands" on the tangent IS the moment a limit exists.
- Beats slider+number: the learner is grabbing a literal point on a curve, not abstracting from a number; watching the slope value converge as h → 0 is the entire definition of the derivative made tactile.
- Prior art: Desmos community graphs at https://www.desmos.com/calculator/ndruflgw8x and https://www.desmos.com/calculator/c9l1qomvrt; Oscar Fernandez's secant-tangent applet at sites.google.com/view/fernandezmath; the GeoGebra MERLOT applet at merlot.org/merlot/viewCompositeReview.htm?id=1377934.

**2. `derivativeTracer`**
- Manipulates: A draggable vertical line x = a across the graph of f; user can also click a function from a palette (x², sin x, e^x, |x|, x^(1/3)).
- Live updates: A green tangent line attaches to (a, f(a)) showing the slope; a SECOND coordinate axis below plots the point (a, f'(a)) and traces it as the user drags. Sweeping left-to-right makes f' draw itself.
- Concept: derivative-as-function (concept 7); reifies the "derivative is itself a function" lesson that Thompson and Harel (2021) identify as the highest-leverage move.
- Beats slider+number: the learner literally builds f' by sweeping; for |x| the trace breaks at x=0, dramatically visualizing non-differentiability.
- Prior art: Desmos help-center derivative example at help.desmos.com/hc/en-us/articles/4406809433613; Khan Academy's derivative grapher (reference only, CC BY-NC-SA).

**3. `chainRuleSlopeChain`**
- Manipulates: A composition g(f(x)) with user-selectable inner and outer functions and a draggable x value. Three side-by-side panels show f, g, and g∘f.
- Live updates: At the chosen x, three slope readouts appear: f'(x) labeled "inner rate," g'(f(x)) labeled "outer rate at the inner value," and their product labeled "chain rate = slope of composition." A small arrow animation shows a tiny input nudge dx flowing through f (becoming f'(x)·dx) and then through g (becoming g'(f(x))·f'(x)·dx).
- Concept: chain-rule and chain-rule-as-slope-product (concepts 19 and 20); literally "multiply the slopes along the chain," the exact mental model m12 will run backward.
- Beats slider+number: the learner SEES a perturbation propagate through a two-stage pipeline and watches the output magnitude be the product of two local slopes. This is the visual that becomes backprop.
- Prior art: 3Blue1Brown Essence of Calculus chapter 4 (youtube.com/watch?v=YG15m2VwSjA) does this beautifully but non-interactively; colah.github.io/posts/2015-08-Backprop/ has the static computational-graph version.

**4. `localLinearityZoom`**
- Manipulates: A "zoom" gesture (pinch or slider) centered on a chosen point (a, f(a)) of a smooth curve.
- Live updates: As the user zooms in, the curve visibly straightens; an overlaid line (the tangent) becomes indistinguishable from the curve once the zoom is sufficient. At maximum zoom, slope readout = f'(a). At kinked points (|x| at 0), the curve never straightens.
- Concept: connects m4's local-linearity intuition to the derivative-at-a-point (concept 5); Tall (1985, Mathematics Teaching 110:49-53, "Understanding the calculus") proposes "local straightness" as a cognitive root psychologically prior to limits.
- Beats slider+number: the learner experiences differentiability as a perceptual phenomenon; the kink in |x| persists at every magnification, viscerally explaining why f'(0) does not exist.
- Prior art: 3Blue1Brown does the zoom in "Paradox of the derivative" (youtube.com/watch?v=9vKqVkMQHKk); David Tall's original Graphic Calculus software from the 1980s.

**5. `criticalPointHunt`**
- Manipulates: User clicks anywhere on the graph of a chosen f to "drop a marker," then drags the marker to a local extremum.
- Live updates: A live readout of f'(x) at the marker; the marker turns green when |f'(x)| is within tolerance of 0 and red otherwise. A second panel plots f' below; the user can watch f' cross zero. After landing, the widget reveals f'' at the point and asks the learner to classify (min/max/inconclusive) with a StepCheck.
- Concept: critical-points, first- and second-derivative tests (concepts 23-25); foreshadows gradient descent's stopping condition.
- Beats slider+number: turns root-finding on f' into a game; the learner manipulates a marker on the actual graph rather than typing values.
- Prior art: GeoGebra "extrema explorer" applets exist; no canonical implementation we found uses the StepCheck/classification combo.

**6. `eIsSpecial`**
- Manipulates: A slider for base b in (1, 4); displays graph of b^x and overlays the numerical derivative computed by finite differences.
- Live updates: For b ≠ e, the derivative graph is a scaled version of b^x; the scale factor (ln b) is displayed. The user is asked to drag b until the derivative coincides exactly with b^x. The "snap" happens at b = e ≈ 2.718.
- Concept: exp-derivative (concept 15); makes the property "e^x is its own derivative" feel discovered rather than asserted.
- Beats slider+number: the user hunts for e by feel; the moment the two curves coincide is the moment e earns its name.
- Prior art: Po-Shen Loh's pre-calc derivation in arXiv:2504.10664 covers the math; 3Blue1Brown's "What's so special about Euler's number e?" (Essence of Calculus, chapter 5, youtube.com/watch?v=m2MIpDrF7Es) covers the intuition.

**7. `productRuleRectangle`**
- Manipulates: Two scrubbable handles for u(t) and v(t) shown as the width and height of a rectangle on screen; user scrubs t.
- Live updates: The rectangle's area updates as u(t)·v(t). When the user makes a tiny step dt, the new area gains two thin strips (u·dv and v·du) and a tiny square (du·dv, negligible). The widget highlights the two strips in different colors and labels them u·v' dt and v·u' dt, totaling (uv)' dt.
- Concept: product-rule (concept 17); the canonical 3B1B geometric derivation made interactive.
- Beats slider+number: the +fg' term is no longer "another formula" but a visible chunk of new area.
- Prior art: 3Blue1Brown "Visualizing the chain rule and product rule" (youtube.com/watch?v=YG15m2VwSjA); MIT OCW 18.01 Fall 2020 has a graphical-proof-of-product-rule image.

## 5. Formula sheet

Average rate of change and secant slope:
- `\frac{f(b)-f(a)}{b-a}`
- `\frac{f(x+h)-f(x)}{h}`

Derivative at a point:
- `f'(a) = \lim_{h \to 0} \frac{f(a+h)-f(a)}{h}`
- `f'(a) = \lim_{x \to a} \frac{f(x)-f(a)}{x-a}`

Notations:
- `f'(x),\ y',\ \frac{dy}{dx},\ \frac{df}{dx},\ \frac{d}{dx}f(x),\ Df(x)`

Linearization / tangent line:
- `L(x) = f(a) + f'(a)(x-a)`
- `f(a+h) \approx f(a) + f'(a)\,h`

Basic rules:
- `\frac{d}{dx}[c] = 0`
- `\frac{d}{dx}[c\,f(x)] = c\,f'(x)`
- `\frac{d}{dx}[f(x) \pm g(x)] = f'(x) \pm g'(x)`
- `\frac{d}{dx}[x^n] = n\,x^{n-1}`

Trig, exponential, logarithm:
- `\frac{d}{dx}[\sin x] = \cos x`
- `\frac{d}{dx}[\cos x] = -\sin x`
- `\frac{d}{dx}[e^x] = e^x`
- `\frac{d}{dx}[\ln x] = \frac{1}{x},\quad x>0`
- `\frac{d}{dx}[a^x] = (\ln a)\,a^x`

Product, quotient, chain:
- `(fg)' = f'g + fg'`
- `\left(\frac{f}{g}\right)' = \frac{f'g - fg'}{g^2}`
- `\frac{d}{dx}\bigl[f(g(x))\bigr] = f'(g(x))\,g'(x)`
- `\frac{dy}{dx} = \frac{dy}{du}\cdot\frac{du}{dx}`

Higher-order and extrema:
- `f''(x) = \frac{d}{dx}\bigl[f'(x)\bigr] = \frac{d^2 y}{dx^2}`
- `f'(c)=0 \implies c \text{ is a critical point}`
- `f''(c) > 0 \implies \text{local min at } c;\quad f''(c) < 0 \implies \text{local max at } c`

Differentiability and continuity:
- `f \text{ differentiable at } a \implies f \text{ continuous at } a`

## 6. Lesson decomposition

**Recommendation on the three existing drafts:** keep all three titles but rebalance content. The existing `what-is-a-derivative` should be split into two lessons (rate-of-change / definition AND derivative-as-function / notations) because the dependency graph shows these as separate cognitive moves, which Thompson and Harel (2021) document empirically. `the-power-rule` should expand to cover the constant, sum, polynomial bundle and trig/exp/log as a single "differentiation rules" lesson (it's monotonous to gate them separately). `the-chain-rule` stays as its own lesson; product and quotient rules should precede it in a short bridging lesson. Add a final lesson on higher-order derivatives and critical points to set up m10.

**Lesson 1: "What is a derivative?"** (expand existing draft) — 12 min
- Summary: Build the derivative from secant slopes; meet f'(a) as a limit.
- Steps:
  1. "How fast is it changing?" a real rate question (e.g., a falling object position x(t) = 4.9 t^2). [prose]
  2. Average rate of change as slope of secant. [widget: secantToTangent, observation only]
  3. StepCheck: compute average rate of f(x) = x^2 on [1, 3]. Expected: 4.
  4. The secant slides: limit of secants as h → 0. [widget: secantToTangent, drag P₂ → P₁]
  5. Definition: f'(a) = lim_{h→0} (f(a+h) - f(a))/h. [prose + KaTeX]
  6. Worked: derivative of x^2 at general a, by hand. [prose-with-widget]
  7. StepCheck: f'(3) for f(x) = x^2. Expected: 6.
  8. "Instantaneous rate of change," resolving the paradox (3B1B framing).
  9. Linear approximation: f(a+h) ≈ f(a) + f'(a) h. [widget: localLinearityZoom]
  10. Endgame callback line.

**Lesson 2: "The derivative as a function"** (NEW, splits off from existing draft) — 10 min
- Summary: Promote f'(a) from "a number at a" to f' as its own function.
- Steps:
  1. Recap: we computed f'(2), f'(3) for x^2; what if we let a vary? [prose]
  2. The derivative function f'(x) = 2x for f(x) = x^2. [widget: derivativeTracer]
  3. Sweep the tracer across sin x; watch f' draw itself. [widget interaction]
  4. StepCheck: read off f'(π/2) for f = sin x from the trace. Expected: 0.
  5. Notations: f'(x), dy/dx, d/dx[f(x)] are all the same object. [prose]
  6. Differentiability and the corner of |x|. [widget: derivativeTracer with |x|]
  7. Theorem: differentiable ⇒ continuous; converse fails. [prose + counterexample]
  8. StepCheck: of {x^2, |x|, sin x, x^(1/3)}, which is NOT differentiable at 0? Expected: |x| and x^(1/3).
  9. Endgame callback.

**Lesson 3: "Differentiation rules"** (expand existing power-rule draft) — 14 min
- Summary: Power, constant, sum, polynomial, sin/cos, e^x, ln.
- Steps:
  1. The power rule, geometrically (3B1B square area). [widget: a static figure with annotated 2x·dx strips]
  2. d/dx[x^n] = n x^(n-1); verified for n=2 from Lesson 1. [prose]
  3. StepCheck: d/dx of 5 x^3. Expected: 15 x^2.
  4. Constant and sum rules; polynomials differentiate term by term.
  5. StepCheck: d/dx of 3x^4 - 5x^2 + 7. Expected: 12 x^3 - 10x.
  6. Sine and cosine derivatives (with the unit-circle geometric argument).
  7. StepCheck: d/dx of cos x at x = 0. Expected: 0.
  8. e^x is its own derivative, what's so special about e? [widget: eIsSpecial]
  9. StepCheck: drag b until derivative matches base function; what is b? Expected: ≈ 2.72.
  10. d/dx[ln x] = 1/x; brief justification via inverse-function relationship.
  11. Endgame callback.

**Lesson 4: "Product and quotient rules"** (NEW bridging lesson) — 8 min
- Summary: Two more rules that must precede the chain rule's cleanest examples.
- Steps:
  1. Why not (fg)' = f'g'? Counter-test with x·x. [prose]
  2. Geometric derivation: rectangle with sides u(t), v(t); two strips + tiny square. [widget: productRuleRectangle]
  3. Product rule statement. [prose + KaTeX]
  4. StepCheck: d/dx of x^2 sin x at x = 0. Expected: 0.
  5. Quotient rule (or rewrite as product when possible). [prose]
  6. StepCheck: d/dx of (x^2 + 1)/(x - 3) at x = 0. Expected: -1/9.
  7. Endgame callback.

**Lesson 5: "The chain rule"** (expand existing draft) — 15 min, the centerpiece
- Summary: How to differentiate g(f(x)); the rule that becomes backprop.
- Steps:
  1. "Slopes along a chain" intuition: outer rate times inner rate. [widget: chainRuleSlopeChain]
  2. Statement in two notations: f'(g(x))·g'(x) (Lagrange) and dy/dx = dy/du · du/dx (Leibniz). [prose + KaTeX]
  3. First example: sin(x^2). Explicit decomposition box. [worked, with widget]
  4. StepCheck: d/dx of sin(x^2) at x = sqrt(π/2). Expected: 0.
  5. Nested chain: differentiate the sigmoid (1 + e^(-x))^(-1) layer-by-layer.
  6. StepCheck: sigmoid'(0). Expected: 0.25.
  7. Why dy/du · du/dx "looks like cancellation" but isn't (Clark et al. APOS caveat). [prose]
  8. Optional aside: epsilon-delta version of the limit at the heart of the chain rule. [collapsible prose]
  9. The reverse reading: if you know dy/du and du/dx at every node of a graph, multiply backward to get dy/dx for every input. [prose with diagram] — direct backprop foreshadow.
  10. StepCheck: in a two-layer chain y = u^2, u = 3x + 1 at x = 1, compute dy/dx. Expected: 24.
  11. Endgame callback (heavier than usual).

**Lesson 6: "Second derivatives and finding optima"** (NEW) — 12 min
- Summary: f'', concavity, critical points, first- and second-derivative tests; bridge to m10.
- Steps:
  1. f'' as the rate of change of f'. [prose; example: position → velocity → acceleration]
  2. StepCheck: f(x) = x^3, find f''(2). Expected: 12.
  3. Concavity: f'' > 0 ⇒ concave up. [widget: derivativeTracer extended to f'']
  4. Critical points: where f'(x) = 0. [widget: criticalPointHunt]
  5. First-derivative test: classify by sign change of f'.
  6. Second-derivative test: classify by sign of f''.
  7. StepCheck: classify x = 1 for f(x) = x^3 - 3x. Expected: local min.
  8. The point of all this: minimizing a function is the entire job of training a neural net. [prose, m10 + m12 pointer]
  9. Endgame callback.

## 7. Problem bank

1. Compute the average rate of change of f(x) = x^2 + 3x on [1, 4]. **Answer:** 8. Novice, computation. Tags: avg-rate-of-change.
2. Using the limit definition, compute f'(x) for f(x) = 3x^2 - 5x + 2. **Answer:** 6x - 5. Novice, computation. Tags: derivative-at-a-point, difference-quotient.
3. Compute f'(4) for f(x) = sqrt(x) from the limit definition. **Answer:** 1/4. Intermediate, computation. Tags: derivative-at-a-point.
4. Sketch the graph of f' if f is the graph of |x|. State where f' is undefined. **Answer:** f'(x) = -1 for x<0, +1 for x>0; f' undefined at 0. Intermediate, interpretation. Tags: derivative-as-function, non-differentiability.
5. State the converse of "differentiable ⇒ continuous." Give a counterexample to the converse. **Answer:** "Continuous ⇒ differentiable" is false; |x| at 0 is continuous but not differentiable. Novice, proof-scaffold. Tags: differentiability-implies-continuity.
6. Differentiate f(x) = 7 x^5 - 4 x^3 + 2x - 9. **Answer:** 35 x^4 - 12 x^2 + 2. Novice, computation. Tags: power-rule, polynomial-differentiation.
7. Differentiate f(x) = 1/x^3. **Answer:** -3/x^4 (or -3 x^(-4)). Intermediate, computation. Tags: power-rule.
8. Differentiate f(x) = x^2 cos x. **Answer:** 2x cos x - x^2 sin x. Intermediate, computation. Tags: product-rule, trig-derivatives.
9. Differentiate f(x) = sin(3x). **Answer:** 3 cos(3x). Novice, computation. Tags: chain-rule, trig-derivatives.
10. Differentiate f(x) = (x^2 + 1)^5. **Answer:** 10x (x^2 + 1)^4. Intermediate, computation. Tags: chain-rule, power-rule.
11. Differentiate f(x) = e^(-x^2). **Answer:** -2x e^(-x^2). Intermediate, computation. Tags: chain-rule, exp-derivative.
12. Differentiate the sigmoid f(x) = 1/(1 + e^(-x)) and show that f'(x) = f(x)(1 - f(x)). **Answer:** f'(x) = e^(-x)/(1+e^(-x))^2 = f(x)(1-f(x)). Advanced, construction. Tags: chain-rule, exp-derivative.
13. Differentiate f(x) = ln(x^2 + 1). **Answer:** 2x/(x^2 + 1). Intermediate, computation. Tags: chain-rule, log-derivative.
14. Given y = u^3 and u = 2x + 1, compute dy/dx at x = 1. **Answer:** 3·(3)^2·2 = 54. Intermediate, computation. Tags: chain-rule.
15. A student claims d/dx[sin(x^2)] = cos(x^2). Identify and fix the error. **Answer:** They forgot the inner derivative; correct is 2x cos(x^2). Intermediate, debugging. Tags: chain-rule.
16. Find all critical points of f(x) = x^3 - 12x + 1 and classify each. **Answer:** x = 2 (local min, value -15); x = -2 (local max, value 17). Intermediate, computation. Tags: critical-points, second-derivative-test.
17. For f(x) = x^4, show that the second-derivative test is inconclusive at x = 0 but x = 0 is nevertheless a local minimum. **Answer:** f''(0) = 0; first-derivative test shows f' changes from negative to positive at 0, so local min. Advanced, proof-scaffold. Tags: second-derivative-test, first-derivative-test.
18. Suppose g(2) = 5, g'(2) = -3, f'(5) = 4. Compute d/dx[f(g(x))] at x = 2. **Answer:** 4 · (-3) = -12. Intermediate, computation. Tags: chain-rule.
19. A function f has f(1) = 2 and f'(1) = 0.5. Use linear approximation to estimate f(1.1). **Answer:** 2 + 0.5·0.1 = 2.05. Intermediate, interpretation. Tags: derivative-at-a-point, tangent-line-as-limit-of-secants.
20. Let L(x) = w·x + b be a "linear neuron" and let loss(L) = (L - 1)^2. Treating w as the variable (b = 0, x = 2 fixed), compute d(loss)/dw at w = 0.3. **Answer:** loss = (2w - 1)^2, d/dw = 2(2w - 1)·2 = 4(2w - 1); at w = 0.3: 4(0.6 - 1) = -1.6. Advanced, construction. Tags: chain-rule (this IS one backprop step).

## 8. Endgame callback: refined

Three candidates, ordered by preference:

**A (recommended).** "loss.backward() is the chain rule, run in reverse across a computational graph. The derivative you defined here is the one number gradient descent needs to know which way is downhill. This module is not preparation for the payoff; it is the payoff's machinery."

**B.** "When a neural network learns, it is computing one derivative per parameter and one chain-rule product per layer. Everything in this module is on the hot path of `loss.backward()`."

**C.** "A derivative tells you which way is downhill. The chain rule tells you how to compute one derivative through any number of nested functions. Stack these two ideas and you have built the engine of every deep learning system on Earth."

## 9. Sources

1. **Calculus on Computational Graphs: Backpropagation** by Christopher Olah, https://colah.github.io/posts/2015-08-Backprop/, blog, Creative Commons Attribution license per the site footer. **[ADAPT]** the framing of chain rule as forward vs. reverse accumulation; ideal source for the chain-rule-as-backprop slide.
2. **3Blue1Brown Essence of Calculus** by Grant Sanderson, https://www.3blue1brown.com/topics/calculus, video + accompanying lesson pages, All Rights Reserved (per 3blue1brown.com terms, no CC license). **[REFERENCE-ONLY]** worked-example inspiration (power rule geometry, product rule rectangle, chain rule visualization). Re-derive visuals from scratch; do not copy frames.
3. **Neural Networks: Zero to Hero, Lecture 1 (micrograd)** by Andrej Karpathy, https://github.com/karpathy/micrograd plus the YouTube lecture, code + video. The micrograd code is MIT License (so source CODE is **[ADAPT]**); the YouTube lecture is standard YouTube license, **[REFERENCE-ONLY]** for narration. The micrograd Python source is fair to port to JS/WebGPU with attribution.
4. **Mathematics for Machine Learning, Ch. 5 (Vector Calculus)** by Deisenroth, Faisal, Ong, https://mml-book.github.io/, textbook (free PDF), Cambridge University Press copyright; PDF free for personal use only. **[REFERENCE-ONLY]** for the chain-rule-as-graph framing and worked examples; do not embed.
5. **Paul's Online Math Notes, Calculus I, Derivatives and Chain Rule** by Paul Dawkins (Lamar University), https://tutorial.math.lamar.edu/classes/calci/calci.aspx, online notes, © Paul Dawkins all rights reserved (no CC license per his terms-of-use page). **[REFERENCE-ONLY]** for problem-bank inspiration and step-by-step worked-solution structure.
6. **MIT OpenCourseWare 18.01 Single Variable Calculus, Lecture Notes** by David Jerison, https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/pages/lecture-notes/, lecture notes + videos, CC BY-NC-SA 4.0. **[REFERENCE-ONLY]** for canonical example sequencing and the product-rule "graphical proof" image.
7. **OpenStax Calculus Volume 1, Chapter 3 (Derivatives)** by Gilbert Strang and Edwin Herman, https://openstax.org/books/calculus-volume-1, textbook, CC BY-NC-SA 4.0 (confirmed via the OpenStax preface: "Calculus Volume 1 is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA) license"; Wikipedia notes the Calculus series is the exception to the usual CC BY license for OpenStax). **[REFERENCE-ONLY]** for problem-set inspiration and section-by-section pacing; do NOT adapt verbatim into our paid product.
8. **A cute proof that makes e natural** by Po-Shen Loh, https://arxiv.org/abs/2504.10664, paper, arXiv perpetual non-exclusive license (no CC license specified). **[REFERENCE-ONLY]** for the e-is-its-own-derivative argument suitable for pre-calc-level adult readers.
9. **Mafs documentation and example gallery** by Steven Petryk, https://mafs.dev/, widget library, MIT License. **[ADAPT]** for widget scaffolding (movable points, useMovablePoint hook); the Riemann-sum example at mafs.dev/guides/examples/riemann-sums shows the exact pattern our secantToTangent and criticalPointHunt widgets will use.
10. **Ideas foundational to calculus learning and their links to students' difficulties** by Pat Thompson and Guershon Harel, ZDM Mathematics Education 53(3):507-519 (2021), DOI 10.1007/s11858-021-01270-1, paper, Springer copyright. **[REFERENCE-ONLY]** for the empirical basis of the "derivative as rate vs derivative as function" misconception and our covariational-reasoning emphasis.

## 10. Pedagogical traps

1. **Skipping the limit step and jumping straight to rules.** Adult learners who took calculus a decade ago remember the power rule but not what a derivative IS. They become fluent symbol-pushers and then collapse the moment they meet a non-polynomial. Mitigation: gate Lesson 1 entirely on the limit definition with at least three from-scratch computations BEFORE any rules appear in Lesson 3. The StepCheck on f'(3) for x^2 (expecting 6, derived not memorized) is the gate.

2. **Treating dy/dx as a fraction without earning it.** Clark, Cordero, Cottrill, Czarnocha, DeVries, St. John, Tolias and Vidakovic (1997, Journal of Mathematical Behavior 16(4):345-364) document this as the chain-rule killer; in their APOS-extension study, most first-year calculus students remained at the "Intra" stage, manipulating dy/du · du/dx via fraction-like cancellation rather than as composed rates. Mitigation: introduce f'(x) (Lagrange) FIRST so the chain rule appears as f'(g(x))·g'(x); only then reveal Leibniz with an explicit "this looks like cancellation, and there are deep reasons it works, but for now treat the dy/dx symbol as a single token." Show both notations in parallel per the user's framing request.

3. **Letting "tangent" mean "touches at one point."** Vinner's (1982) tangent-as-Euclidean-circle-tangent misconception persists into undergraduate math majors: Biza and Zachariades (2010, Journal of Mathematical Behavior 29(4):218-229) studied 182 first-year mathematics undergraduates in Greece and found only four defined the tangent as the limit of secants. Mitigation: the `secantToTangent` widget MUST include a wavy curve where the tangent crosses through the curve at the inflection point. Make the learner see this in step 4 of Lesson 1, not as a footnote.

4. **Drilling differentiation rules in isolation from the interpretation.** Orton (1983, Educational Studies in Mathematics 14(3):235-250, DOI 10.1007/BF00410540), interviewing 110 students, found that even those who could execute differentiation rules could not interpret the derivative as a rate of change or explain why the limit of the secant slope yields the tangent slope. Mitigation: every StepCheck in Lessons 3, 4, 5 must follow at least one "what does this number MEAN" interpretation step. Problem 20 in our bank (deriving the gradient of a one-parameter loss) is the antidote to pure computation.

5. **Underplaying the chain rule's centrality.** Many calculus courses present the chain rule as "another rule" alongside product and quotient. For an ML-bound audience this is malpractice: the chain rule IS the entire mathematical content of backpropagation. Mitigation: explicit signposting at the top of Lesson 5 ("this lesson is the load-bearing one; in module 12 we will run this rule backwards across a graph and call it backpropagation"); the chain-rule lesson should be the longest in the module (15 min vs. 8-12).

6. **Letting the optional epsilon-delta aside become the main spine.** Adult technical learners often demand "rigor" and we are tempted to oblige. Formal limits are not load-bearing for ML, and Tall's (1985, Mathematics Teaching 110:49-53) research shows that "local straightness" is a more cognitively effective route for non-mathematicians; he describes learners taught the formal limit definition first as able to compute derivatives symbolically but having "no mental image as to what it means for a function to be non-differentiable." Mitigation: keep ε-δ as a single collapsed expandable section in Lesson 5 step 8; never use it in a StepCheck; explicitly tell learners "this is the formalism behind the limits we have been using informally; it is optional for ML but bracing for the curious." Do not let it metastasize.
