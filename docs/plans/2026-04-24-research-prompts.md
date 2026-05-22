# Deep-Research Prompt Pack: Tinker Course Content

> **Purpose:** Batch-commission the raw pedagogical material for every unwritten module. Fire one prompt per module into Deep Research (ChatGPT, Claude, Gemini, Perplexity, any). Paste the output into this repo; Claude Code converts it into MDX lessons + Svelte widgets.

## Workflow

1. **Fire** one per-module prompt into Deep Research.
2. **Save** the response to `docs/research/m{N}-{slug}.md` verbatim.
3. **Queue** a Claude Code session: "Convert `docs/research/m7-linear-algebra.md` into the 4–6 MDX lessons it describes, following our existing Step / StepCheck / EndgameCallback patterns."
4. I generate lesson drafts + widget specs. Human edits for voice.
5. Ship the module.

Per-module work units: one research fire, one conversion pass, one editing pass, one deploy. Independent per module, multiple can run in parallel (one research tool per module, Claude Code converts them as results land).

---

## What Deep Research can't do

- **Our voice.** Research outputs read like surveys. We need tight, opinionated, hungover-adult-friendly prose. I do this pass.
- **Our widgets.** Research describes interactions; it can't build a Svelte+Mafs component that drags a vector and updates a dot product. That's me + the svelte-mafs library.
- **The narrative spine.** "This IS `loss.backward()`." "This IS attention." The endgame callback threaded through every module is ours to enforce.
- **License gatekeeping.** Research will happily cite Khan Academy (CC BY-NC-SA) or Wikipedia (CC BY-SA). We reject both for commercial content. The prompt below locks this down.

---

## Build status

> **Single source of truth for what exists.** A session reading this doc should never have to guess. Update this table in the same commit that lands a module or saves a research brief.
>
> **To get the next research prompt:** find the lowest-numbered module whose Research brief column reads MISSING, paste the Master template, fill its `{{...}}` tokens from that module's parameter block below.
> **To build a module:** find the lowest-numbered module that has a brief but 0 lessons.

| Module | Prompt block | Research brief | Lessons | Module status |
|---|---|---|---|---|
| m0-diagnostic | n/a (placement diagnostic) | n/a | n/a | planned |
| m1-pre-algebra | yes | yes | 5 | drafting |
| m2-algebra | yes | yes | 6 | drafting |
| m3-trigonometry | yes | yes | 5 | drafting |
| m4-precalc | yes | yes | 4 | drafting |
| m5-calculus | yes | yes | 3 (partial) | drafting |
| m6-multivariable | yes | yes | 5 | drafting |
| m7-linear-algebra | yes | yes | 5 | drafting |
| m8-probability | yes | yes | 5 | drafting |
| m9-information-theory | yes | yes | 4 | drafting |
| m10-optimization | yes | yes | 5 | drafting |
| m11-neural-networks | yes | yes | 5 | drafting |
| m12-backpropagation | yes | yes | 0 | planned |
| m13-training-dynamics | yes | yes | 5 | drafting |
| m14-sequence-models | yes | yes | 6 | shipped |
| m15-attention | yes | yes | 6 | shipped |
| m16-transformer-block | yes | yes | 5 | shipped |
| m17-tokenization-sampling | yes | yes | 5 | shipped |
| m18-capstone | yes | yes | 0 | planned |

**Next research prompt to fire:** none — every module now has a research brief. Next pipeline step is building modules whose lessons are MISSING or partial: m5-calculus (reconcile 3 partial lessons), m11, m12, m18.

**Known state, so it does not surprise the next session:**
- **m5-calculus** now has a research brief (`docs/research/m5-calculus.md`). It has 3 lessons (`what-is-a-derivative`, `the-power-rule`, `the-chain-rule`) that were built before the brief existed. Section 6 of the brief calls for reconciling those 3 against a 6-lesson decomposition (split `what-is-a-derivative` into definition + derivative-as-function; expand `the-power-rule` into a full differentiation-rules lesson; add a product/quotient bridging lesson and a second-derivatives/optima lesson). Reconcile, do not assume a clean slate.
- The m5 brief was saved with ~21 paste-transmission artifacts reconstructed from context (dropped mid-word characters, two merged concept-graph entries). All reconstructed; widget 6's lost attribution was recovered (3Blue1Brown, Essence of Calculus ch. 5).
- **m11-neural-networks** is in `drafting` with all 5 lessons landed: `what-a-perceptron-really-is`, `the-xor-moment`, `linear-layers-collapse`, `the-activation-zoo`, `forward-pass-end-to-end`. New widgets: PerceptronLine, XorPlayground, LinearCollapse, ActivationZoo, ForwardPassTrace, ParamCounter. The brief's section-4 named seven widgets; `decisionBoundarySculptor` was folded out as redundant (XorPlayground already carries the "neurons draw lines, the network combines them" payload) and `forwardPassScrubber`/`activationDiff` were realized as ForwardPassTrace/ActivationZoo + LinearCollapse.
- **m12, m18** have research briefs but zero lessons. They are ready to build now with no new research. m12-backpropagation is the keystone module.
- **m14 through m17** are fully shipped. The course was built from both ends toward the middle, which is why the foundation arc still has gaps.

---

## Master template

Paste this template into Deep Research, then replace every `{{...}}` token with the per-module block below. Everything else stays verbatim.

```
# Research brief: Tinker Module {{ORDER}}: {{TITLE}}

## Role

You are a world-class mathematics educator and interactive-pedagogy researcher. You have read Bret Victor's "Learnable Programming," Nicky Case's essays on explorable explanations, the full Distill.pub archive, every 3Blue1Brown Essence-of-X series, and Andrej Karpathy's "Neural Networks: Zero to Hero." You understand the difference between a "boring slider" (a labeled number whose only purpose is to wiggle) and a direct-manipulation widget where the learner is grabbing the mathematical object itself.

## Context

I am building an interactive online course called Tinker: "Machine Learning, Backpropagation, and AI. The Math." It takes adult technical learners (think: software engineers who took calc a decade ago and want to actually understand ML from the math up) from pre-algebra to training a tiny character-level transformer in the browser via WebGPU.

The course has 18 modules across 5 arcs. Every module must pay back to the transformer endpoint via a 1–2 sentence "Where this shows up in the transformer" callback.

Stack: Astro 6 + Svelte 5 + MDX + a custom Svelte+Mafs widget library + KaTeX for math. Each lesson is 8–15 gated steps; some steps are prose-with-widget, some are StepCheck (numeric-answer gate before advance). The closest thing to a model of what a "good" lesson looks like is 3Blue1Brown's visual rigor married to Karpathy's build-something-from-scratch concreteness.

## Module under research

- **Module order:** {{ORDER}}
- **Module title:** {{TITLE}}
- **Arc:** {{ARC}}
- **Assumed prior knowledge (already taught earlier in the course):** {{PRIOR}}
- **Must-cover concepts:** {{CONCEPTS}}
- **Immediate next module:** {{NEXT_MODULE}}
- **Endgame callback (the one-liner at the bottom of every lesson in this module):** {{ENDGAME}}

## Deliverables: return ONE response with exactly these 10 sections, in order. No preamble.

### 1. Concept dependency graph
10–25 specific concepts this module must cover, topologically sorted.
For each: concept id (kebab-case), one-sentence definition, direct prerequisites (from this module or earlier, use module ids like `m5-calculus`).

### 2. Canonical worked examples
6–10 worked examples that are the "default teaching examples" for these concepts across MIT OCW, Stanford CS courses, Karpathy's videos, 3B1B, and Mathematics for Machine Learning (Deisenroth/Faisal/Ong).
For each: problem statement (LaTeX-ready), step-by-step solution, the pedagogical point it makes, the single most common student mistake on this example.

### 3. Common misconceptions
8–12 specific wrong mental models adult learners arrive with for this topic.
For each: the misconception in one sentence, why it's natural to fall for, and the specific counterexample, reframe, or visualization that kills it.

### 4. Interactive widget suggestions
4–7 widget ideas specific to this module's concepts.
For each:
- **Name** (camelCase, ≤25 chars)
- **What the user manipulates directly** (drag what, scrub what, click what)
- **What updates live** (specific readouts, visual changes)
- **What concept it makes tangible** (the pedagogical moment)
- **Why it beats a slider + static figure** (the Bret Victor / Nicky Case test)
- **Prior art**, 1–3 existing widgets on the web that do something similar (URLs if known)

Reject any idea that reduces to "drag a slider, watch an unlabeled number change." Every widget must let the learner grab a mathematical object the lesson has already named.

### 5. Key formulas
Every formula a student must recognize and/or reproduce.
Return as LaTeX source strings ready to drop into MDX (e.g. `\frac{\partial f}{\partial x}`). No commentary per formula, just the list, grouped by concept.

### 6. Lesson decomposition
Propose 3–6 lessons this module should split into. For each lesson:
- **Title** (conversational, not textbook, e.g. "What is a derivative?" not "1.1 Introduction to differentiation")
- **Summary** (one sentence, learner-facing)
- **Step outline** (8–15 gated steps, each a title + one-line description; note which steps are StepCheck with the expected scalar answer)
- **Widgets it uses** (refs to section 4)
- **Estimated minutes**

### 7. Problem bank
20 assessment problems ranging novice → advanced.
For each:
- Statement (LaTeX-ready)
- Expected answer (scalar, symbolic, or multi-part)
- Difficulty tier: novice / intermediate / advanced
- Cognitive type: computation / interpretation / construction / debugging / proof-scaffold
- Concept tags (from section 1)

### 8. Endgame callback: refined
Propose 1–3 candidate one-liners for the module's endgame callback. I supplied a starter; give me better options.

### 9. Sources (licensing-aware)
5–10 best external resources for this module.
For each: title, author, URL, medium (textbook / paper / video / blog / widget), license if known, and what specifically to use it for (worked examples / pedagogy reference / visualization inspiration).

**CRITICAL LICENSE RULES:**
- We are a **paid commercial product**.
- **DO NOT** recommend CC BY-NC, CC BY-NC-SA, CC BY-SA, or unlicensed content for **incorporation or adaptation**.
- Khan Academy content: CC BY-NC-SA → reference-only, never adapt.
- Wikipedia / Wikibooks: CC BY-SA → reference-only.
- MIT OCW: CC BY-NC-SA → reference-only.
- **OK to adapt:** CC BY, public domain, US federal government, OpenStax books that are CC BY (verify per-book, some OpenStax are NC-SA).
- Every source must be tagged **[ADAPT]** (we can reuse) or **[REFERENCE-ONLY]** (inspiration, don't embed).

### 10. Pedagogical traps
4–6 specific things that commonly go wrong when teaching this topic to adult self-learners.
For each: the trap, why it happens, and the concrete lesson-design mitigation.

## Style constraints

- Be opinionated. If two standard approaches exist, recommend one and say why.
- Target an adult technical audience (software engineers, engineers, scientists). High-school math is a distant memory but not a wall.
- Prefer construction and manipulation over multiple choice.
- Every widget must pass the "could this be a slider with a number on it?" test. If the answer is yes, reject it.
- Markdown-only. No tables requiring complex rendering.
```

---

## Per-module parameter blocks

Fire one at a time. Paste the master template above, then replace `{{...}}` tokens with the block below.

### M1: Pre-Algebra

```
ORDER: 1
TITLE: Pre-Algebra
ARC: Arc 0. Foundations
MINUTES: 120
PRIOR: None, this is the first teaching module of the course. M0 is a placement diagnostic, not a lesson sequence, so it teaches nothing. Assume only that the learner can read numbers and has written code before (the audience is working software engineers who last saw this material in school). The module's job is reactivation and reframing, not first-contact instruction.
CONCEPTS: the number line as the canonical mental model for "a quantity is a position"; negative numbers as positions left of zero and the sign as a direction rather than a defect; absolute value as distance-from-zero (the one-dimensional ancestor of the vector norm taught in m7-linear-algebra); signed arithmetic, adding and subtracting as moving along the line, the product-of-signs rule, and "subtracting is adding the opposite"; the four operations and their inverse pairs (add/subtract, multiply/divide) and why "apply the inverse operation" is the single idea that solves every equation in this module; fractions as deferred division, a/b is literally "a divided by b" and also one single point on the number line, not two numbers; equivalent fractions, lowest terms, common denominators, and the four fraction operations with the standard adult-learner failure points; the fraction↔decimal↔percent correspondence as three notations for one number; ratios and proportional reasoning ("scale everything by the same factor"); exponents as repeated multiplication and the intuition that a^0 = 1 (preview only, the laws of exponents are formalized in m2-algebra); order of operations as operator precedence, the same precedence rules the learner already trusts in code, framed explicitly as "an expression has exactly one unambiguous value"; the expression-as-evaluation-tree framing, an arithmetic expression is an abstract syntax tree and evaluating it bottom-up is the foundational shape of the m16 transformer forward pass; variables as named placeholders for a quantity that is unknown, chosen later, or allowed to vary, explicitly the same "named box" the learner already uses in every program they write; the distinction between an expression (evaluates to a value) and an equation (asserts two expressions are equal); evaluating an expression by substituting a value for its variable; the equation as a balance/constraint that must stay level, whatever you do to one side you do to the other; solving a one-variable linear equation by peeling off operations with their inverses in reverse precedence order; verifying a solution by substituting it back; the explicit handoff to m2-algebra, once a learner can manipulate one equation with one unknown, m2 generalizes to expressions, functions, and systems.
NEXT_MODULE: m2-algebra (algebraic manipulation, functions and function composition, exponents and logarithms, systems of equations).
ENDGAME: A neural network is an arithmetic expression with a few hundred thousand variables in it, the variables are the parameters the model learns. Order of operations, the rule that an expression has exactly one value, is the forward pass. Solving an equation by undoing operations in reverse is the shape of the backward pass. You already know how to read code; this module is the bridge that lets you read the math the same way.
```

### M2: Algebra

```
ORDER: 2
TITLE: Algebra
ARC: Arc 0, Foundations
MINUTES: 240
PRIOR: Everything from m1-pre-algebra: the number line and signed arithmetic, absolute value, the four operations collapsed into two inverse pairs, fractions as deferred division, the fraction↔decimal↔percent equivalence, ratios and proportional reasoning, order of operations as the parser that gives an expression its unique evaluation tree (AST), exponents as repeated multiplication with a^0 = 1, variables as named placeholders, the expression-vs-equation distinction, substitution and evaluation, the equation as a balance, and solving a one-variable linear equation by applying inverse operations to both sides from the outside in. M0 is a placement diagnostic only and teaches nothing.
CONCEPTS: algebraic expressions in several variables; combining like terms and the distributive law as the structural rewrite rules that change an expression's form without changing its value; linear equations in one variable revisited and generalized to equations that must be expanded and collected before the m1-style inverse peel applies; the Cartesian plane, and a two-variable equation read as the set of points that satisfy it; the straight line (slope as rise-over-run and as a constant rate of change, intercepts, slope-intercept form y = mx + b, point-slope form) and the slope conditions for parallel and perpendicular lines; systems of two linear equations, the three possible outcomes (one intersection point, no solution, infinitely many), solving by substitution and by elimination, and the geometric reading as where two lines meet; linear inequalities in one variable and the rule that multiplying or dividing by a negative flips the inequality; the function as a machine or mapping: domain, codomain/range, the vertical-line test, function notation f(x), and evaluating and interpreting f(x); function composition g(f(x)) as wiring one machine's output into the next, explicitly the M2 ancestor of stacking neural-network layers; the inverse function as the machine that undoes another, with the domain restrictions that make an inverse well-defined (callback to m1's inverse operations, now lifted to whole functions); polynomials, degree, and the quadratic in particular; factoring a quadratic, the quadratic formula, and the parabola as the graph of a quadratic with its vertex and its roots as x-intercepts; the full laws of exponents (product, quotient, power-of-a-power, negative exponents as reciprocals, fractional exponents as roots), formalizing the a^0 = 1 preview from m1; exponential functions b^x and why they model growth and decay; the logarithm as the inverse of exponentiation, log_b(x) answering "b raised to what power gives x"; the log laws (log of a product is a sum of logs, log of a quotient is a difference, log of a power pulls the exponent out front) and change of base; the natural exponential e^x and the natural logarithm ln, with an intuition-only note that e is the base that makes the calculus clean (forward pointer to m5-calculus); and the load-bearing fact that logs turn products into sums, which is the entire reason a product of many probabilities can be trained as a sum of log-probabilities, the explicit forward pointer to m8-probability's maximum likelihood and m9-information-theory's cross-entropy.
NEXT_MODULE: m3-trigonometry (angles, radians, the unit circle, sine and cosine as periodic functions). The modules that cash M2 in most heavily are m5-calculus (derivatives of polynomials, exponentials, and logs) and m7-linear-algebra (linear equations and systems generalize into matrices).
ENDGAME: Function composition is what a neural network is: g(f(x)) is a two-layer network, and a deep network is this same nesting repeated many times. The logarithm you meet here is the exact log in "negative log-likelihood" and "cross-entropy": it is the function that turns a product of probabilities into a sum, and that turn is the only reason training a model is a tractable sum instead of an impossible product.
```

### M3: Trigonometry

```
ORDER: 3
TITLE: Trigonometry
ARC: Arc 1. Prerequisite Math
MINUTES: 90
PRIOR: Everything from m1-pre-algebra and m2-algebra. Specifically: the Cartesian plane and a two-variable equation read as a set of points; the straight line, slope as rise-over-run, and slope-intercept form; functions as machines with a domain and a range; function notation f(x); function composition g(f(x)); inverse functions and the domain restrictions that make an inverse well-defined; the laws of exponents; and the parabola and basic graph-reading. Single-variable calculus has NOT been taught yet (that is m5-calculus), so there are no derivatives, no limits, and no small-angle arguments that rely on them. Linear algebra has NOT been taught yet (that is m7-linear-algebra), so a rotation must be presented concretely as a coordinate formula on a pair of numbers, never yet as a matrix; write the rotation material so m7 can later re-cast it as a matrix without contradicting anything said here. M0 is a placement diagnostic only and teaches nothing.
CONCEPTS: angle as an amount of rotation, measured from a starting ray; degrees versus radians, and why radians (the arc length swept on a circle of radius 1) are the natural unit, with the conversion 180 degrees = pi radians and the key reference angles; the unit circle as the definition of cosine and sine, cos(theta) and sin(theta) are literally the x and y coordinates of the point reached by rotating theta counterclockwise from (1, 0); the right-triangle picture, SOH-CAH-TOA, as the same two ratios seen inside a triangle rather than on a circle, and the explicit reconciliation of the triangle picture with the circle picture; the Pythagorean theorem a^2 + b^2 = c^2 as the statement that makes the two pictures consistent, taught here in full (it was not covered earlier); the Pythagorean identity sin^2(theta) + cos^2(theta) = 1 as Pythagoras applied to the unit-circle point; tangent as sin over cos and as the slope of the radius; sine and cosine as periodic functions of a real-number input, their graphs, period 2*pi, amplitude, and the phase relationship cos(theta) = sin(theta + pi/2); frequency, and how scaling the input (sin(k*theta)) compresses or stretches the wave; the angle addition formulas for sin(alpha +/- beta) and cos(alpha +/- beta); rotation of a point in 2D, rotating (x, y) by angle theta yields (x*cos(theta) - y*sin(theta), x*sin(theta) + y*cos(theta)), derived from the angle addition formulas, presented as a concrete coordinate transformation and explicitly flagged as the object m7-linear-algebra will later rename the rotation matrix and m15-attention will use as rotary positional embedding; polar coordinates (r, theta) and the conversion to and from Cartesian coordinates, x = r*cos(theta) and y = r*sin(theta); the inverse trigonometric functions arcsin, arccos, and arctan, and the domain restrictions that make each one a genuine function, the explicit callback to m2-algebra's lesson that an inverse exists only on a domain where the original function is one-to-one; and the load-bearing forward pointer that a transformer has no built-in sense of token order and encodes the position of each token as a vector of sines and cosines at many different frequencies, so that "where in the sequence am I" becomes a set of coordinates the model can do arithmetic on.
NEXT_MODULE: m4-precalc (sequences and series, function transformations, and the groundwork for limits). The modules that cash m3 in most heavily are m15-attention (rotary positional embeddings are the 2D rotation derived here) and m16-transformer-block (sinusoidal positional encodings).
ENDGAME: A transformer is handed one token at a time with no index attached, so by default it cannot tell position 3 from position 30. Positional encoding fixes this by tagging every position with a vector of sine and cosine values sampled at many frequencies, the unit circle, read off at a schedule of angles. Rotary positional embedding, the version inside modern large language models, rotates each query and key vector by an angle proportional to its position, which is exactly the 2D rotation you derive in this module, applied inside the attention mechanism.
```

### M4: Pre-calculus and the Limit Intuition

```
ORDER: 4
TITLE: Pre-calculus and the Limit Intuition
ARC: Arc 1. Prerequisite Math
MINUTES: 120
PRIOR: Everything from m1-pre-algebra, m2-algebra, and m3-trigonometry. Specifically: the number line and signed arithmetic, fractions, order of operations and the expression-as-evaluation-tree framing; algebraic manipulation, the Cartesian plane and a two-variable equation read as a set of points, lines and slope, systems of equations, the function as a machine with a domain and a range, function notation f(x), function composition g(f(x)), inverse functions and the domain restrictions that make an inverse well-defined, polynomials and the quadratic and its parabola, the full laws of exponents, exponential functions b^x, the logarithm as the inverse of exponentiation and the log laws (log of a product is a sum of logs), and an intuition-only note from m2 that e is "the base that makes the calculus clean"; from m3-trigonometry, angle as rotation, degrees versus radians and the unit circle, sine and cosine as periodic functions of a real-number input with period 2*pi and amplitude, the input-scaling sin(k*theta) that sets frequency, tangent, the Pythagorean identity, and the inverse trig functions with their domain restrictions. Single-variable calculus has NOT been taught yet: that is m5-calculus, the very next module. This module must therefore NOT define the derivative formally, must NOT use derivative notation, and must NOT compute any derivative. Its job is to build the informal limit intuition that m5 will then make rigorous. No epsilon-delta. Limits are taught informally, by graph-reading, by numerical tables of values, and by zooming. M0 is a placement diagnostic only and teaches nothing.
CONCEPTS: function families as a catalog of standard shapes the learner must recognize on sight (constant, linear, power functions x^n for positive integer n, polynomial, rational, exponential b^x, logarithmic, sine and cosine, absolute value, square root) and the qualitative features of each (end behavior, intercepts, asymptotes, periodicity, even/odd symmetry); function transformations as a single uniform grammar applied to ANY family, the four moves being vertical and horizontal shifts (f(x)+c and f(x-c)), vertical and horizontal scaling (a*f(x) and f(k*x)), and reflections across the axes (-f(x) and f(-x)), together with the order-of-operations subtlety that changes inside the argument act "backwards" and in the opposite order to what intuition expects; the explicit callback that f(k*x) compressing a graph horizontally is the same operation that set the frequency of sin(k*theta) in m3, and that a*f(x)+c is the amplitude-and-offset move, so transformations unify and generalize the wave-shaping vocabulary; piecewise functions, with absolute value as the canonical piecewise example; sequences as functions whose domain is the positive integers, explicit versus recursive definitions, and arithmetic and geometric sequences; series as the sum of a sequence, partial sums, the finite geometric series formula, and the convergence of an infinite geometric series when the common ratio has magnitude below 1, presented as the first concrete example of an infinite process that settles on a finite answer (the conceptual on-ramp to a limit); the limit of a function as an informal idea, "the single value f(x) is heading toward as x approaches a, regardless of what happens exactly at a," developed three ways: by reading a graph, by a numerical table of inputs approaching a from both sides, and by zooming a widget; one-sided limits and the rule that a two-sided limit exists only when both one-sided limits agree; limits that fail to exist (a jump, an unbounded oscillation, a blow-up) and limits that are infinite; continuity as the property that the limit equals the function value, lim f(x) = f(a) as x approaches a, and the three ways continuity breaks (a removable hole, a jump, an infinite/asymptotic discontinuity); the stated-without-proof fact that every standard function family is continuous everywhere on its natural domain, so most limits are computed by simple substitution; the natural exponential e^x and the number e introduced two ways, as the limit of (1 + 1/n)^n and as the base whose exponential curve has slope exactly 1 at x = 0, with the slope characterization flagged as the reason e is the calculus-friendly base (forward pointer to m5); the natural logarithm ln as the inverse of e^x, its domain x > 0, and a recap that ln obeys every log law from m2; the local-linearity intuition, "zoom far enough into the graph of a smooth function and it becomes indistinguishable from a straight line," developed with a zooming widget and named explicitly as the single idea m5-calculus will turn into the derivative; and the load-bearing forward pointers, that e^x is the function inside softmax that turns a vector of scores into positive numbers, ln is the function inside cross-entropy and negative-log-likelihood, and the limit-of-a-slope intuition built here is exactly the machinery m5 formalizes as the derivative and m12-backpropagation runs in reverse.
NEXT_MODULE: m5-calculus (the derivative, the limit definition of the derivative, the power rule, the chain rule, the derivatives of the standard functions). m4 is the module m5 leans on most directly: the limit intuition and local-linearity built here become the formal derivative there. The e^x and ln introduced here are also cashed in by m8-probability, m9-information-theory, and m11-neural-networks via softmax and cross-entropy.
ENDGAME: A transformer's softmax is built from e^x and its loss function, cross-entropy, is built from ln, the two functions this module makes you fluent in. And the one idea underneath all of calculus, that zooming into a smooth curve makes it look straight, is the limit intuition you build here by hand; the next module turns that single picture into the derivative, and the derivative run backward is how a neural network learns.
```

### M5: Single-variable Calculus, Derivatives and the Chain Rule

```
ORDER: 5
TITLE: Single-variable Calculus, Derivatives and the Chain Rule
ARC: Arc 1. Prerequisite Math
MINUTES: 180
PRIOR: Everything from m1-pre-algebra, m2-algebra, m3-trigonometry, and m4-precalc. Specifically: the function families and their graphs, function transformations, function composition g(f(x)) and inverse functions, polynomials and exponentials b^x and the logarithm with its laws, the natural exponential e^x and natural log ln; from m3, the sine and cosine functions and their periodicity; and critically from m4-precalc the informal limit (the value a function heads toward, read off a graph, a numerical table, or by zooming), one-sided limits, continuity as limit-equals-value, the convergence of an infinite process to a finite answer, and the local-linearity intuition that zooming far into a smooth curve makes it indistinguishable from a straight line. m4 built that intuition deliberately without naming the derivative; this module names it. Multivariable calculus has NOT been taught yet (that is m6-multivariable), so every function here has a single real input and a single real output; partial derivatives, gradients, and the multivariable chain rule belong to m6 and must not be pre-empted. Keep all notation single-variable. M0 is a placement diagnostic only and teaches nothing.
CONCEPTS: the average rate of change of a function over an interval, and its picture as the slope of the secant line through two points on the graph; the tangent line as the limiting position of the secant as the second point slides toward the first, the geometric form of m4's local-linearity idea; the derivative at a point defined as the limit of the difference quotient (f(x+h) - f(x))/h as h approaches 0, the instantaneous rate of change, with the limit being exactly the informal limit from m4 now doing load-bearing work; the derivative as itself a function, f'(x), that reports the slope at every input; the several notations for the derivative (f'(x), dy/dx, d/dx) and the fact that they all name the same object; differentiability and its relationship to continuity, and the kinked points (such as absolute value at zero) where a derivative fails to exist; the power rule for the derivative of x^n; the constant rule, constant-multiple rule, and sum rule, so any polynomial can be differentiated term by term; the derivatives of the special functions, sin and cos (each the derivative of the other, up to sign), e^x (its own derivative, the property that singled e out back in m4), and ln; the product rule and the quotient rule; the chain rule for the derivative of a composition g(f(x)) as the product of the outer derivative evaluated at the inner function and the inner derivative, presented as the central result of the module; the chain rule read as the composition of local linear approximations, "multiply the slopes along the chain," which is the exact mental model m12-backpropagation will run in reverse; higher-order derivatives, the second derivative as the rate of change of the rate of change, and its reading as concavity; critical points where the derivative is zero, and the first- and second-derivative tests for local maxima and minima, the bridge to m10-optimization where the minimum of a loss function is the target; and the load-bearing forward pointers, that the derivative is the single number gradient descent needs in order to know which way is downhill, and that the chain rule applied across a whole computational graph IS backpropagation, so this module is the literal mathematical content of loss.backward().
NEXT_MODULE: m6-multivariable (partial derivatives, the gradient, the Jacobian, and the multivariable chain rule). m5 is the most load-bearing prerequisite module in the first half of the course: m6 generalizes its derivative to many inputs, m10-optimization uses the derivative as the descent direction, and m12-backpropagation is the chain rule run backward across a graph.
ENDGAME: loss.backward() is the chain rule. The derivative you define in this module is the one number gradient descent reads to know which way is downhill, and the chain rule, the rule for differentiating a composition, applied across the computational graph of a neural network and evaluated in reverse, is backpropagation in full. This module is not preparation for the payoff; it is the payoff's machinery.
```

### M6: Multivariable Calculus: Partial Derivatives, Gradients, Jacobians

```
ORDER: 6
TITLE: Multivariable Calculus. Partial Derivatives, Gradients, Jacobians
ARC: Arc 1. Prerequisite Math
MINUTES: 150
PRIOR: Single-variable derivatives, chain rule, power rule (m5-calculus). Vectors as lists of numbers and dot products (m7-linear-algebra).
CONCEPTS: functions of multiple variables, partial derivatives, gradient, directional derivative, level sets, Jacobian, chain rule for composed multivariable functions, Hessian (intuition only)
NEXT_MODULE: m7-linear-algebra (linear algebra, vectors, matrices as transformations, matrix multiplication)
ENDGAME: loss.backward() computes the gradient of loss with respect to every parameter. That's the Jacobian-vector product you're about to implement by hand.
```

### M7: Linear Algebra

```
ORDER: 7
TITLE: Linear Algebra
ARC: Arc 1. Prerequisite Math
MINUTES: 240
PRIOR: Algebra and function composition (m2-algebra). Can be taken in parallel with multivariable calculus (m6).
CONCEPTS: vectors as arrows and lists, vector addition and scaling, dot product (as similarity and projection), matrices as linear transformations of space, matrix-vector multiplication as linear combination of columns, matrix-matrix multiplication as composition, determinant geometrically (signed area/volume), eigenvalues and eigenvectors, singular value decomposition (intuition: best low-rank approximation), change of basis
NEXT_MODULE: m8-probability and m10-optimization (both depend on linear algebra)
ENDGAME: A transformer is x @ W_q, x @ W_k, x @ W_v, then dot products through softmax, then more matrix multiplies. The attention matrix is a dot-product similarity matrix. Linear algebra is 80% of the transformer.
```

### M8: Probability & Statistics

```
ORDER: 8
TITLE: Probability & Statistics
ARC: Arc 1. Prerequisite Math
MINUTES: 240
PRIOR: Algebra and function composition (m2-algebra). Light single-variable calculus for the log and exp identities used in maximum likelihood (m5-calculus). Vectors and dot products help for joint distributions and the covariance-as-dot-product intuition but are not strictly required (m7-linear-algebra).
CONCEPTS: probability as a measure over outcomes (sample space, events, the three axioms, non-negativity, normalization, additivity), random variables as functions from outcomes to numbers, the probability mass function (pmf) for discrete RVs vs the probability density function (pdf) for continuous RVs and what "integrates to 1" really means, the canonical discrete distributions used in ML (Bernoulli for a single coin flip, Categorical for "which of K tokens", Uniform), the Gaussian as the workhorse continuous distribution and why it shows up everywhere downstream (weight initialization, noise models, BatchNorm assumptions), joint probability P(X, Y), marginal probability via summing/integrating one variable out, conditional probability P(Y | X) as a renormalization, the chain rule of probability P(X_1, ..., X_n) = ∏ P(X_i | X_<i), the exact factoring that justifies autoregressive language modeling and is invoked verbatim in m14-sequence-modeling, independence and conditional independence, Bayes' theorem as posterior ∝ likelihood × prior (intuition first, then generative-vs-discriminative framing), expectation E[X] as the long-run mean and as a probability-weighted sum, variance and standard deviation as spread, covariance as joint variation (with the dot-product-of-centered-vectors intuition that bridges to m7), the sample mean and sample variance as estimators of population quantities, the law of large numbers (one-line statement: sample means concentrate on the true mean as n grows) and the central limit theorem (one-line statement: averages of many independent things tend Gaussian regardless of the underlying distribution, calibration only, no proof), maximum likelihood estimation, the parameter θ that maximizes ∏ P(x_i | θ) is the same θ that minimizes − ∑ log P(x_i | θ), the equivalence between "fit the data" and "minimize negative log-likelihood" that is the entire foundation of supervised ML, sampling from a discrete categorical distribution, the inverse-CDF / cumulative-sum-plus-uniform-random trick that the m18 capstone sampler uses verbatim, sampling from a Gaussian (Box-Muller intuition, no derivation), the bias-variance tradeoff as a one-page intuition (simple models miss, complex models overfit) and a forward pointer to m13-training-dynamics where the empirical version appears as train-vs-val divergence, the explicit handoff to m9-information-theory: minimizing NLL is what m9 will rename as minimizing cross-entropy.
NEXT_MODULE: m9-information-theory (entropy, cross-entropy, KL divergence, and perplexity, all built directly on the distributions, expectations, and MLE framing from this module).
ENDGAME: When you train a language model you are doing maximum likelihood, tuning θ so the data you have is as probable as possible under your model. When you sample from the trained model you are drawing from a categorical distribution over the vocabulary. Every loss curve, every "temperature = 0.8", every "perplexity = 4.7" you will see for the rest of this course is a sentence in the language defined by this module.
```

### M9: Information Theory

```
ORDER: 9
TITLE: Information Theory
ARC: Arc 1. Prerequisite Math
MINUTES: 150
PRIOR: From m8-probability: pmfs, expectations, the Categorical and Bernoulli distributions, joint and conditional probability, the chain rule of probability, and maximum likelihood estimation as the minimization of − ∑ log P(x_i | θ). Single-variable calculus for log and exp manipulation (m5-calculus). Linear algebra is not required.
CONCEPTS: information content of a single outcome as I(x) = − log P(x), the rarer the event, the more bits it carries; the base of the log as a choice of units (log₂ → bits, ln → nats, log₁₀ → bans) and why the modern ML literature defaults to nats while perplexity is conventionally reported as exp(loss) regardless of base; Shannon entropy H(P) = E_P[− log P(x)] = − ∑ P(x) log P(x) as the average information content of a draw from P, a measure of how uncertain P is about its own outcome; the entropy of canonical distributions (Uniform over K outcomes has entropy log K, the maximum possible; a one-hot pmf has entropy 0, total certainty; a slightly-biased coin has entropy slightly less than 1 bit) and the qualitative shape of H as a function of pmf shape; cross-entropy H(P, Q) = − ∑ P(x) log Q(x) as the average information content under Q when the data actually comes from P, strictly greater than or equal to H(P), with equality iff P = Q; KL divergence D_KL(P || Q) = H(P, Q) − H(P) as the "extra surprise" cost of modeling P with Q, non-negative, zero iff P = Q, not symmetric, not a true metric; the equivalence at the center of supervised ML, minimizing cross-entropy between the empirical data distribution and the model's predicted distribution is exactly maximum likelihood estimation (the explicit callback to m8); cross-entropy loss for classification with one-hot targets reducing to − log Q(true_class), i.e. negative log-likelihood, the explicit reason classification networks have a softmax head and an NLL loss; perplexity = exp(cross-entropy), the geometric mean of "1 / probability assigned to the true next token", and its intuitive interpretation as "the effective number of equally-likely options the model is choosing among at each step"; the entropy floor of natural language. Shannon's 1948 and 1951 experiments estimating English at roughly 1 to 1.3 bits per character, which sets a hard lower bound on what character-level perplexity any model can ever achieve on English and reframes the m18 capstone's training curve as a finite race toward a known floor; mutual information I(X; Y) = H(X) − H(X | Y) as a single-paragraph forward pointer (intuition only, no derivations, "how much does knowing Y reduce uncertainty about X") and where it shows up in modern ML (representation learning, InfoMax, contrastive losses) as preview-only material; honest framing that information theory is named for telephone-line capacity but in modern ML it shows up almost entirely through cross-entropy and perplexity, the rest of Shannon's machinery (channel coding, source coding, rate-distortion) is rarely touched in practice and is therefore explicitly out of scope for this module.
NEXT_MODULE: m10-optimization (next module in the linear sequence). The first downstream module that actually cashes m9 in is m14-sequence-modeling, where NLL becomes the literal training loss and perplexity becomes the validation metric.
ENDGAME: The loss you minimize when you train a language model is the cross-entropy between the data and the model. Perplexity is that loss exponentiated. The reason GPT-style models have a softmax head and an NLL loss is in this module. When the m18 capstone's training run plateaus near "val NLL ≈ 1.5, perplexity ≈ 4.5" on tiny-shakespeare, the floor that plateau is approaching is the entropy of Shakespearean English itself.
```

### M10: Optimization

```
ORDER: 10
TITLE: Optimization
ARC: Arc 2. ML Foundations
MINUTES: 150
PRIOR: Single-variable derivatives (m5), gradients (m6), linear algebra (m7).
CONCEPTS: minimizing a scalar function, gradient descent, learning rate as step size, batch vs stochastic vs mini-batch gradient descent, momentum, RMSProp, Adam, learning-rate schedules (warmup, cosine decay), loss-landscape pathologies (saddle points, local minima, cliffs), convergence criteria
NEXT_MODULE: m11-neural-networks (applying optimization to learn MLP parameters)
ENDGAME: Adam is the optimizer you'll actually use to train the transformer. The LR warmup schedule, the betas, the epsilon, all of it has reasons, and you'll understand them.
```

### M11: Neural Network Fundamentals

```
ORDER: 11
TITLE: Neural Network Fundamentals
ARC: Arc 2. ML Foundations
MINUTES: 150
PRIOR: Linear algebra (m7), optimization (m10). Light exposure to the chain rule (m5).
CONCEPTS: perceptron, linear layer with bias, activation functions (sigmoid, tanh, ReLU, GELU), single-layer limitations (the XOR problem), multilayer perceptrons (MLPs), forward pass as a stack of (matmul + nonlinearity), universal approximation theorem (intuition only, no proof), decision boundaries
NEXT_MODULE: m12-backpropagation (how MLPs actually learn their weights)
ENDGAME: The transformer's feed-forward block is literally an MLP. Everything you learn here plugs directly into the transformer architecture two modules from now.
```

### M12: Backpropagation from Scratch (THE KEYSTONE)

```
ORDER: 12
TITLE: Backpropagation from Scratch
ARC: Arc 2. ML Foundations
MINUTES: 240
PRIOR: Chain rule (m5-calculus), gradients (m6-multivariable), linear algebra (m7), MLPs (m11-neural-networks).
CONCEPTS: computational graph (nodes = values, edges = ops), forward pass as graph evaluation, local derivatives at each node, reverse-mode automatic differentiation, chain rule applied across the graph, building micrograd scalar-by-scalar (Karpathy-style), vectorizing from scalars to tensors, gradient checking (numerical vs analytical), common backprop bugs (missing .zero_grad(), in-place ops, detached tensors)
NEXT_MODULE: m13-training-dynamics (stabilizing the training of deep nets. BatchNorm, dropout, residuals)
ENDGAME: You just built micrograd. Every deep-learning framework on earth is a fancier version of what you now understand end-to-end. loss.backward() is no longer magic, it's your code.
```

### M13: Training Dynamics and Modern Tricks

```
ORDER: 13
TITLE: Training Dynamics and Modern Tricks
ARC: Arc 2. ML Foundations
MINUTES: 180
PRIOR: Everything through m12. Specifically: from m10-optimization, gradient descent, stochastic and mini-batch gradient descent, the learning rate, momentum, and the Adam/AdamW optimizer; from m11-neural-networks, the multilayer perceptron, the linear layer, activation functions, and the forward pass as a stack of matmul-plus-nonlinearity; from m12-backpropagation, the computational graph, reverse-mode automatic differentiation, and the chain rule run backward to produce every parameter's gradient. The learner has built micrograd and can train a small network, but has not yet met the failure modes that appear once a network is deep. The transformer architecture itself has NOT been built yet (that is m16-transformer-block); this module supplies the individual stabilizing components that m16 then assembles.
CONCEPTS: the generalization gap, the difference between training-set performance and held-out performance; overfitting, a model memorizing its training data, and underfitting, a model too weak to capture the pattern; the train/validation/test split and the discipline of never tuning on the test set; the bias-variance trade-off as the conceptual frame for that gap; L2 regularization (weight decay) as a penalty on large weights and its reading as a built-in preference for simpler models; dropout as the random zeroing of activations during training to break co-adaptation between units, and the deliberate difference between its training-time and evaluation-time behavior; the vanishing-gradient and exploding-gradient problems in deep networks, and why a naive deep stack fails to train at all; weight initialization, why the initial scale of the weights matters, and the Xavier/Glorot and Kaiming/He schemes that keep activation and gradient variance stable as signal passes through many layers; batch normalization, normalizing a layer's pre-activations across the batch, its learnable scale and shift parameters, and its different behavior at training versus inference time; layer normalization, normalizing across the feature dimension instead of across the batch, and why that is the correct choice for sequence models and transformers; residual (skip) connections, the form x + F(x), and the explanation that the additive path gives the gradient a clear route backward so that very deep networks stay trainable; learning-rate schedules, in particular linear warmup followed by decay, and why a large optimizer step taken before the gradient statistics have settled destabilizes training; and the load-bearing forward pointer that the transformer block of m16 is the expression x = x + F(LN(x)) repeated many times, so pre-norm placement, the residual addition, the initialization scale, and learning-rate warmup are not abstract hygiene but the exact reasons a deep transformer trains at all.
NEXT_MODULE: m14-sequence-models (bigrams, the move from fixed-window models to recurrent networks, and the setup for attention). The module that cashes m13 in most directly is m16-transformer-block, which assembles layer normalization, residual connections, the initialization scheme, and learning-rate warmup into the repeating block.
ENDGAME: The transformer block you are about to build is x = x + F(LN(x)) repeated N times. Pre-LN keeps activations bounded; the + x is the only reason gradients survive a dozen layers; the small initialization scale keeps the residual stream from blowing up; and linear warmup is the only reason the optimizer does not take a wild first step. Every line of the block is something from this module.
```

### M14: Sequence Modeling: Bigrams to RNNs

```
ORDER: 14
TITLE: Sequence Modeling. Bigrams to RNNs
ARC: Arc 3. Language Models
MINUTES: 390
PRIOR: Linear algebra, matmul, softmax (m7). Gradient descent, Adam, schedules (m10). MLP forward/backward (m11). Backprop on a computational graph (m12). Training dynamics, initialization, normalization, residuals, regularization (m13).
CONCEPTS: characters/tokens as a vocabulary, sequence as a sample from a joint distribution, factoring P(sequence) via the chain rule of probability, bigram language model as a lookup table of next-token probabilities, training a bigram by counting AND by gradient descent on a single embedding-then-softmax layer (showing they converge to the same thing), negative log-likelihood as the loss, perplexity as exp(loss) and what it intuitively measures, sampling from a categorical distribution (greedy vs temperature vs top-k), context windows and the bigram→trigram→n-gram explosion, replacing the n-gram table with a small MLP (Bengio 2003-style) that consumes a fixed-width context of token embeddings, the embedding matrix as a learned lookup, fixed-context limitations, recurrent neural networks: a hidden state that ingests one token at a time and carries information forward, the RNN cell as h_t = tanh(W_x x_t + W_h h_{t-1} + b), training RNNs with backprop-through-time (intuition; concrete unrolling for a 3-step example), vanishing and exploding gradients in long sequences (callback to m13), the sequential-bottleneck failure mode that motivates attention
NEXT_MODULE: m15-attention (queries, keys, values; scaled dot-product attention; multi-head attention)
ENDGAME: We started with a table that knew one character of context, expanded it to a window of k characters, then to a vector that, in theory, carries everything. In practice it carries about ten characters before fading. Next, we stop trying to carry the past and learn to query it instead.
```

### M15: Attention

```
ORDER: 15
TITLE: Attention
ARC: Arc 3. Language Models
PRIOR: Linear algebra, matmul, dot product as similarity, softmax, broadcasting (m7-linear-algebra). Gradient descent, Adam, LR schedules (m10-optimization). MLP forward/backward (m11-neural-networks). Backprop on a computational graph (m12-backpropagation). Training dynamics. Xavier/He init, layer/batch norm, residual connections, dropout, weight decay (m13-training-dynamics). Everything from m14-sequence-modeling: token vocab, NLL loss, perplexity, the embedding matrix as a learned lookup, the bigram-as-one-layer-NN equivalence, the Bengio-2003 fixed-context MLP, the RNN cell h_t = tanh(W_x x_t + W_h h_{t-1} + b), backprop-through-time, vanishing/exploding gradients, and the sequential-bottleneck failure mode that motivates attention.
CONCEPTS: attention as a soft / differentiable dictionary lookup, query-key-value triple, scoring via scaled dot product, the 1/sqrt(d_k) scale and why softmax saturation makes it necessary, softmax over the time axis to produce attention weights, the weighted sum of values as the output, the three learned projections W_q / W_k / W_v and what each subspace conceptually represents, self-attention vs cross-attention, causal (autoregressive) masking via the upper-triangular −∞ trick, the full attention(Q, K, V) = softmax(QK^T / sqrt(d_k) + M) V formula and its shape calculus, multi-head attention (split heads → parallel attentions → concat → output projection) and the motivation for multiple heads, why attention without positional information is permutation-equivariant and therefore broken for sequences, positional encoding (sinusoidal, learned absolute, RoPE, intuition only, no derivations), computational complexity (O(T² d), the quadratic context cost that defines modern LLM economics), KV-cache during autoregressive inference and what it actually saves
NEXT_MODULE: m16-transformer-block (residual connections + layer norm + the feed-forward MLP + multi-head attention assembled into the canonical transformer block, then stacked N times)
ENDGAME: Attention is the operation. The rest of a transformer, residuals, layer norm, an MLP on top, is plumbing around this single core idea: every position broadcasts a query, every position offers a key, and the softmax-weighted match decides whose values you pull back. You are now one layer of glue away from the real thing.
```

### M16: The Transformer Block

```
ORDER: 16
TITLE: The Transformer Block
ARC: Arc 3. Language Models
PRIOR: From m11-neural-networks: MLPs as stacks of (matmul + nonlinearity), forward pass, activation functions including ReLU and GELU. From m12-backpropagation: backprop on a computational graph; gradient flow through compositions. From m13-training-dynamics: residual connections (with the gradient-highway intuition), layer norm and batch norm, variance-preserving initialization (Xavier, He), dropout, weight decay. From m14-sequence-modeling: token vocab, embedding lookup, NLL loss, perplexity, the bigram-as-one-layer-NN equivalence, the full chain "tokens → embedding → predict next token." From m15-attention: full scaled dot-product self-attention with the matrix form softmax(QKᵀ/√dₖ)V, causal masking, three flavors of positional encoding (sinusoidal, learned absolute, RoPE), multi-head as parallel subspaces, the T² cost and the KV cache. From m7-linear-algebra: matmul, softmax, broadcasting.
CONCEPTS: the canonical transformer block as x → x + MHA(LN(x)) → x + FFN(LN(x)), two sub-layers, each wrapped in residual + layer norm; pre-LN vs post-LN architectures and the empirical / gradient-flow argument for pre-LN winning at depth; the residual stream as a per-token vector that every block reads from and writes to (Anthropic mech-interp framing); the position-wise feed-forward block as a 2-layer MLP applied independently to every token's vector with no cross-token mixing; the 4× hidden-dimension expansion convention (d_model → 4 d_model → d_model); GELU vs ReLU as the modern FFN activation choice; stacking N transformer blocks for depth; the final layer norm at the top of the stack before the language-modeling head; the unembedding matrix as the projection from d_model back to vocabulary-size logits; weight tying, sharing parameters between the input embedding and the output unembedding; the complete top-to-bottom forward pass: token ids → embedding lookup → + positional encoding → N × transformer block → final layer norm → unembedding → softmax → next-token distribution; parameter count budget per block (≈ 4d² from attention projections + ≈ 8d² from the FFN's two matrices, roughly 12d² per block, dominated by the FFN as d grows); where dropout sits in the standard recipe.
NEXT_MODULE: m17-tokenization-sampling (byte-pair encoding tokenization, sampling strategies, temperature, top-k, top-p, beam search, and the inference loop that wraps around a trained transformer to actually generate text)
ENDGAME: This is the transformer. Tokens at the bottom, attention + MLP blocks in the middle, an unembedding at the top, the bigram-style NLL loss as the training objective. Stack N of them, train with Adam and a warmup schedule, and you have GPT.
```

### M17: Tokenization, Training & Sampling

```
ORDER: 17
TITLE: Tokenization, Training & Sampling
ARC: Arc 4. Capstone
PRIOR: From m7-linear-algebra: matmul, softmax, broadcasting. From m8-probability: categorical distributions, sampling from a probability simplex. From m9-information-theory: entropy, cross-entropy, perplexity = exp(NLL). From m10-optimization: Adam / AdamW, LR warmup + cosine decay, mini-batch SGD. From m11-neural-networks: MLP forward/backward, embedding lookups. From m12-backpropagation: loss.backward(), .zero_grad(), gradient checking, common backprop bugs. From m13-training-dynamics: train vs val loss, overfitting, weight decay, dropout, learning-rate schedules in practice. From m14-sequence-modeling: tokens as a vocabulary, NLL loss on the next-token distribution, the bigram-as-one-layer-NN equivalence, the introductory treatment of greedy / temperature / top-k sampling for the bigram model. From m15-attention: causal masking, scaled dot-product attention, the KV cache during autoregressive inference and what it actually saves (recompute of K and V across already-emitted tokens). From m16-transformer-block: the full top-to-bottom forward pass, token ids → embedding + positional encoding → N × (residual + LN + MHA → residual + LN + FFN) → final LN → tied unembedding → softmax over vocab → next-token distribution; the parameter budget per block; pre-LN architecture.
CONCEPTS: tokenization as the interface between raw text and the model, the model never sees characters or bytes, only token ids; character-level tokenization (the nanoGPT-tiny default we will use in the capstone), its strengths (no OOV, tiny vocabulary, every operation is on a learned per-character embedding) and its costs (sequence length blows up, the model has to compose more steps to "spell" anything); word-level tokenization and why it fails at scale (vocab explosion, OOV at inference time, zero morphological generalization); subword tokenization as the modern compromise; byte-pair encoding (BPE), the merge-loop algorithm, run on a corpus once to produce a fixed merge table, then deterministically applied at inference; byte-level BPE as used in GPT-2/3 (operating on the 256 raw bytes rather than Unicode codepoints, which makes the tokenizer total, every input string is representable, no UNK token); the trained tokenizer as a fixed artifact shipped alongside the model weights; how tokenization shapes what the model can and cannot do (multi-digit arithmetic, capital-letter handling, the "how many R's in strawberry" failure mode); vocabulary size as a hyperparameter and its tradeoff between sequence length T and embedding-table size; the standard training loop wrapped around the m16 forward pass, sample a batch of (B, T) sequences from the tokenized corpus, forward, compute NLL across all (B, T) positions, backward, AdamW step, zero grad; the data loader: from a single long stream of tokens, slice random (x, y) pairs where y is x shifted right by one; train/val split for a small corpus and what overfitting looks like (val loss diverging from train loss); expected loss trajectory on tiny-shakespeare-character (start near log(vocab_size) ≈ 4.2, drop fast, plateau near val NLL ≈ 1.5, perplexity ≈ 4–5, for a small model); the gradient-clipping and learning-rate-schedule choices that nanoGPT actually ships with; the autoregressive inference loop wrapped around the same forward pass, given a prompt, run the model, sample one token, append, repeat until a stop condition or max length; greedy / argmax sampling and why deterministic decoding produces repetitive, mode-collapsed text on a generative LM; temperature τ as logits / τ before softmax, τ → 0 collapses to greedy, τ → ∞ collapses to uniform, τ = 1 is the model's own distribution; top-k filtering, keep only the k highest-logit tokens, renormalize, sample; top-p (nucleus) sampling, keep the smallest prefix of the sorted distribution whose cumulative mass ≥ p, renormalize, sample; how temperature, top-k, and top-p compose in practice and the order they are applied; beam search and why generative language modeling does not use it (creative generation needs diversity, not maximum-likelihood paths), contrast with translation/summarization where beam search is still common; the KV cache during sampling, callback to m15, and why it turns the per-token inference cost from O(T²) to O(T); the random seed as the only source of variation in a frozen model with fixed sampling parameters; "controlling" a generative model entirely from the outside via prompt + sampling settings, no weight changes.
NEXT_MODULE: m18-capstone (train your own tiny transformer in the browser via WebGPU on the tiny-shakespeare corpus, 4 layers, 4 heads, d_model = 128, T = 64, ~200k parameters, and ship the resulting weights + a sampling-knob playground)
ENDGAME: Tokenization is how text becomes vectors. The training loop is how those vectors get good. Sampling is how good vectors become text again. You now have everything between a corpus of bytes and a model that talks. Next module: you actually train one in your browser.
```

### M18: Capstone: Train a Tiny Transformer in Your Browser

```
ORDER: 18
TITLE: Capstone. Train a Tiny Transformer in Your Browser
ARC: Arc 4. Capstone
PRIOR: This is the capstone of the Math-for-ML track; it composes everything taught earlier and introduces no new mathematics. Specifically: from m5-calculus and m6-multivariable: the chain rule, gradients, partial derivatives. From m7-linear-algebra: matmul, softmax, broadcasting, embedding lookup as a linear layer. From m8-probability: sampling from a categorical distribution. From m9-information-theory: NLL, perplexity = exp(NLL), the entropy floor of natural language. From m10-optimization: Adam / AdamW, linear warmup + cosine decay, mini-batch SGD, gradient clipping. From m11-neural-networks: MLP forward/backward, GELU, the FFN block. From m12-backpropagation: loss.backward() on a computational graph, reverse-mode autodiff, the canonical bugs (missing zero_grad, in-place ops, detached tensors). From m13-training-dynamics: layer norm, residual connections, He/Xavier init, dropout, weight decay, train vs val separation, the five canonical loss-curve pathologies (clean / overfit fork / plateau / divergence spike / dead). From m14-sequence-modeling: tokens as a vocabulary, NLL on the next-token distribution, the bigram-as-one-layer-NN equivalence, the Bengio-2003 fixed-context MLP, the RNN cell h_t = tanh(W_x x_t + W_h h_{t-1} + b), backprop-through-time, the sequential-bottleneck failure that motivated attention. From m15-attention: full scaled dot-product self-attention with the matrix form softmax(QKᵀ/√dₖ + M)V, causal masking, three flavors of positional encoding (sinusoidal, learned absolute, RoPE), multi-head as parallel subspaces, the T² cost, the KV cache. From m16-transformer-block: the canonical pre-LN block x → x + MHA(LN(x)) → x + FFN(LN(x)), the 4× FFN expansion convention, the residual stream as the per-token vector every block reads from and writes to, stacking N blocks, final layer norm, tied unembedding, the seven-line forward pass, the ≈12d² per-block parameter rule. From m17-tokenization-sampling: character-level tokenization on tiny-shakespeare (1,115,394 chars, vocab=65, contiguous 90/10 split → 1,003,854 train / 111,540 val), nanoGPT's get_batch (B random offsets, x and shifted-by-one y, loss averaged over B·T positions), the AdamW + linear-warmup + cosine-decay + grad-clip-1.0 training loop, the autoregressive sampling loop with the conventional temperature → top-k → top-p pipeline, the KV cache turning per-token inference cost from O(T²) to O(T).
CONCEPTS: the capstone target, a 4-layer, 4-head, d_model = 128, T = 64, ~200{,}000-parameter character-level transformer, end-to-end, trained on tiny-shakespeare in the learner's browser tab in roughly 3–5 minutes on consumer-grade WebGPU (M-series Mac, modern integrated/discrete GPU on Windows/Linux, recent Android Chrome); the engineering shape of running gradient-based training in a browser. WebGPU as the compute substrate, the WebGPU compute-pipeline model (bind groups, storage buffers, workgroup sizes), the practical limits of the broadly-shipping WebGPU spec (f32-only is the safe default, fp16/bf16 are not yet portable, no NCCL-style multi-device, no tensor cores); candidate runtime options and their honest tradeoffs, candle-wasm (Rust + Hugging Face's candle compiled to WASM with WebGPU backend), webgpu-torch (a JS torch-shaped layer over WebGPU), transformers.js's training fork, ONNX Runtime Web with the training-enabled build, tinygrad-web, or a custom set of WGSL kernels for matmul + softmax + cross-entropy + AdamW step shipped from scratch, for each: maturity, bundle size, supported ops, dependency tree, license, and concrete fit for an ~200k-parameter toy training run that lives inside an Astro 6 + Svelte 5 + MDX page; how to ship the tokenizer and corpus as static assets (one .bin tensor of token ids fetched once and held in memory, one vocab JSON, both cacheable forever via the worker); the in-browser training-loop choreography, chunking iterations to stay responsive (yield back to the event loop with requestAnimationFrame every K iters, never block the main thread), surfacing live metrics (train NLL, val NLL, iters/sec, wall time) without re-rendering the entire DOM; how to render a live, dual-curve loss plot that scrolls smoothly without dropping frames; pathologies that show up only in a browser run, first-call WebGPU shader compilation cost making iter 0 look anomalously slow, JIT warm-up making the first ~50 iters look slower than the rest, fp32-only making accuracy slightly worse than a CUDA reference, tab-throttling when the learner switches away (requestAnimationFrame stops firing in background tabs, graceful pause/resume is required, not optional); the moment-of-truth UX, sampling generations live during training so the learner watches gibberish at iter 0 ("xQqp;,Bh"), recognizable-English shape at ~iter 500 ("the and the of a the"), Shakespeare-ish at ~iter 2,000 ("KING RICHARD: My lord, the earth doth"), and the final settled sample after the run plateaus; the "this checkpoint is yours" affordances, a Save Weights button that serializes the trained tensor as a download, a Load Weights button that re-instantiates the model from a previous .bin, an optional shareable URL for a small enough model (the ~200k-param model serializes to ~800 KB in fp32, well under URL-encoding limits with base64 and gzip); a frozen-checkpoint sampler-knob playground built on the model the learner just trained, where they drag τ, top-k, top-p, edit the prompt, and watch the same model say different things, "controlling the model" without retraining it; honest browser-side seed determinism. Math.random is not enough; thread a seeded PRNG (sfc32, xorshift128+, or splitmix64) through the data loader, the dropout RNG, the weight-init RNG, and the sampler so a fixed (seed, hyperparameters) tuple produces byte-identical runs across reloads; the pedagogical frame of a capstone, the lessons are *experiences*, not new theory: lesson 1 is the runner page where training happens (the learner pushes Start, watches the loss curve, watches the live samples improve), lesson 2 is the playground for the trained checkpoint, lesson 3 is the close that loops the entire course back to "loss.backward() on the transformer is no longer magic, you wrote it"; honest framing of what the artifact is (a tiny model on a tiny corpus that produces poetry-flavored gibberish, not GPT-4) and what it represents (proof to yourself that every line of nanoGPT is something you could now read and recognize); celebration moments as first-class features (first non-gibberish sample, first plausible iambic line, "you trained this") rather than as UX afterthoughts; what to learn next, pointers to mech-interp on the trained model (Anthropic's residual-stream framing already taught in M16 maps directly), to scaling the same recipe to a slightly larger corpus, and to the eventual reveal that the same operations underneath GPT-4 are the operations the learner just shipped.
NEXT_MODULE: none. M18 is the final module of the Math-for-ML track. Course completion. The natural follow-ons (a mech-interp track on the trained model, a tokenizer-and-data-curation track, a scaling-laws track) are future Tinker courses, not part of this one.
ENDGAME: This is the entire course. You started in M5 with a single-variable derivative. You finish here with a transformer you trained yourself on hardware you own, weights you can save, and a model that, within the limits of 200,000 parameters and one play of Shakespeare, actually talks. There is no module after this one. There is the model, the artifact, and the next thing you decide to learn.
```

---

## Widget research template (fire per interactive widget)

Some widgets in the design doc are their own pedagogical research project. Use this shorter template for those.

```
# Widget research: {{WIDGET_NAME}}

## Role
(same role block as the module template)

## The widget
I am building an interactive Svelte + Mafs widget called {{WIDGET_NAME}} for Module {{ORDER}} of Tinker. Its job is to make the following pedagogical moment tangible: {{MOMENT}}.

## Deliverables: return these 6 sections, nothing else

### 1. Prior art
5–8 existing interactive widgets on the web that do something similar. For each: URL, what it lets the user manipulate, what it does well, what it does badly, whether it's free to clone (MIT/CC BY) or reference-only.

### 2. Design variants
4–6 different ways this widget could be designed. For each:
- **Interaction surface**, what the learner drags, clicks, scrubs
- **Live updates**, what visual state changes in response
- **Failure mode**, the "boring slider" degenerate case this variant risks
- **Strength**, what this variant teaches that others don't

### 3. Pedagogical pitfalls
Specific things that go wrong when learners use widgets of this kind. Include the Bret Victor criticism ("adjust mystery numbers") and Nicky Case's "sandbox without scaffolding" failure mode where applicable.

### 4. Accessibility
Keyboard navigation plan, screen-reader labels, color-blind-safe alternatives, motion-reduction fallback.

### 5. Recommended variant
Pick ONE. Say why. Include a rough storyboard: initial state → first interaction → aha moment → final state.

### 6. Parametrization
Exact numerical defaults, viewBox ranges, slider min/max, default parameter values, that produce the intended pedagogical moment on load.
```

---

## Batch queue (priority order)

Fire in this order. MVP spine first, everything in Tier 1 blocks the capstone.

**Tier 1. MVP spine:**
1. M6 Multivariable Calculus
2. M7 Linear Algebra
3. M10 Optimization
4. M11 Neural Network Fundamentals
5. M12 Backpropagation (keystone)

**Tier 2, fill out the arcs:**
6. M13 Training Dynamics
7. M14 Sequence Modeling (bigrams + RNNs)
8. M15 Attention
9. M16 Transformer Block

**Tier 3, capstone + completeness:**
10. M17 Tokenization & Sampling
11. M18 Capstone. Train Your Transformer
12. M8 Probability & Statistics
13. M9 Information Theory

**Deferred** (safety-floor modules, route around with a diagnostic instead of teaching linearly):
- M0, M1, M2, M3, M4

---

## Post-research workflow

When Deep Research returns, save to `docs/research/m{N}-{slug}.md` and start a Claude Code session with:

```
Read docs/research/m7-linear-algebra.md. Convert sections 6 (lesson decomposition) and 7 (problem bank) into MDX lessons under apps/docs/src/content/lessons/, following the existing Step / StepCheck / EndgameCallback pattern used in what-is-a-derivative.mdx and the-chain-rule.mdx. For each lesson, propose any new Svelte widgets we need and write stubs for them (I'll fill in the svelte-mafs integration). Update the m7-linear-algebra.md module file's status from `planned` to `drafting`. Deploy.
```

Expect 3–6 lessons per module and 1–3 new widgets per module. Per-module cycle: one research fire → one conversion session → one editing pass → deploy.
