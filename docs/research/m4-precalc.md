# Module 4 Research Brief: Pre-calculus and the Limit Intuition
*Arc 1, Prerequisite Math. Tinker: Machine Learning, Backpropagation, and AI. The Math.*

> Deep-research output, saved 2026-05-21. Light de-garbling of paste artifacts only
> (fused words, dropped letters, and dependency-graph item 12 plus worked examples
> E7 and E10 reconstructed from surrounding context); no substantive edits to the
> research. The 4 MDX lessons from section 6 and the problem bank from section 7
> are converted under `apps/docs/src/content/lessons/`; widgets 1 to 6 from
> section 4 built under `apps/docs/src/components/demos/`.

---

## 1. Concept dependency graph

1. `function-catalog` - A canonical list of "parent" function shapes (constant, linear, quadratic/power, polynomial, rational, exponential, logarithmic, sine, cosine, absolute value, square root) the learner must recognize at a glance. Prereqs: m2-algebra, m3-trigonometry.
2. `qualitative-features` - End behavior, intercepts, asymptotes, periodicity, and even/odd symmetry as the vocabulary used to describe any function. Prereqs: function-catalog.
3. `vertical-shift` - Replacing f(x) with f(x)+c slides the graph up by c. Prereqs: function-catalog.
4. `horizontal-shift` - Replacing f(x) with f(x-c) slides the graph right by c (i.e., "inside" changes act backward). Prereqs: function-catalog.
5. `vertical-scale-reflect` - a*f(x) stretches vertically by |a| and reflects across the x-axis when a<0. Prereqs: vertical-shift.
6. `horizontal-scale-reflect` - f(k*x) compresses horizontally by a factor of k and reflects across the y-axis when k<0. Prereqs: horizontal-shift.
7. `transformation-order` - Outside operations apply in normal order; inside operations apply in reverse order of operations. Prereqs: vertical-scale-reflect, horizontal-scale-reflect.
8. `wave-shaping-callback` - Identifies a*sin(k*x)+c as the universal transformation grammar applied to sine, unifying m3's amplitude/frequency/offset vocabulary with the new grammar. Prereqs: transformation-order, m3-trigonometry.
9. `piecewise-function` - A function defined by different rules on different intervals, with absolute value as the canonical instance. Prereqs: function-catalog.
10. `sequence-as-function` - A sequence is a function whose domain is the positive integers; terms are a1, a2, ..., an = f(n). Prereqs: function-catalog.
11. `arithmetic-geometric-sequences` - Two parametric families: an = a1 + (n-1)d (constant difference) and an = a1*r^(n-1) (constant ratio); each has an equivalent recursive form. Prereqs: sequence-as-function.
12. `partial-sum-series` - A series is the running sum of a sequence; the n-th partial sum Sn is itself a sequence. Prereqs: arithmetic-geometric-sequences.
13. `finite-geometric-sum` - Sn = a(1-r^n)/(1-r) closed form for the finite geometric series. Prereqs: partial-sum-series.
14. `infinite-geometric-convergence` - When |r|<1, Sn settles on a/(1-r); this is the first concrete "infinite process with a finite answer." Prereqs: finite-geometric-sum.
15. `limit-informal` - lim_{x->a} f(x) = L means "f(x) gets and stays arbitrarily close to L as x gets close to a, from either side, ignoring the value at a itself." Prereqs: infinite-geometric-convergence, qualitative-features.
16. `limit-three-views` - Three operational ways to read a limit: graph-reading, numerical table from both sides, and zooming. Prereqs: limit-informal.
17. `one-sided-limits` - Left and right limits, and the rule that lim exists iff both one-sided limits exist and agree. Prereqs: limit-informal.
18. `limit-failures` - A two-sided limit can fail by a jump (one-sided limits disagree), an unbounded oscillation (sin(1/x) near 0), or a blow-up to plus or minus infinity. Prereqs: one-sided-limits.
19. `continuity` - f is continuous at a iff lim_{x->a} f(x) = f(a); equivalently, the graph has no hole, jump, or asymptote at a. Prereqs: limit-failures.
20. `continuity-of-elementary-functions` - Every function in the catalog is continuous everywhere on its natural domain, so most limits are "plug-in" limits. Prereqs: continuity, function-catalog.
21. `number-e-two-ways` - The number e is approximately 2.71828, introduced as (a) the limit of (1+1/n)^n and (b) the unique base b such that the curve b^x has slope 1 at x=0. Prereqs: limit-informal, m2-algebra (exponentials).
22. `natural-log-recap` - ln(x) = log_e(x), the inverse of e^x, defined for x>0, obeying every log law from m2. Prereqs: number-e-two-ways, m2-algebra.
23. `local-linearity` - "Zoom far enough into the graph of a smooth function and it becomes indistinguishable from a straight line." The single picture m5 will turn into the derivative. Prereqs: limit-three-views, continuity.
24. `transformer-callback` - e^x lives inside softmax; ln lives inside cross-entropy; local linearity becomes the derivative in m5, which backprop runs in reverse. Prereqs: local-linearity, natural-log-recap.

## 2. Canonical worked examples

**E1. Identify the parent and the transformations.**
Statement: Given $g(x) = -2(x-3)^2 + 5$, name the parent function and list every transformation applied to it, in the order you would apply them to sketch the graph.
Solution: Parent is $f(x)=x^2$. (1) Inside $x-3$: shift right 3. (2) Outside $\cdot(-2)$: vertical stretch by 2, then reflect across x-axis. (3) Outside $+5$: shift up 5. Horizontal first (inside, reverse), vertical after (outside, normal). Vertex: $(3,5)$; opens down.
Pedagogical point: One uniform grammar covers every parent shape; inside vs outside matters more than the symbols.
Most common mistake: Reading $(x-3)$ as "shift left 3" because of the minus sign, the inside-acts-backwards trap.

**E2. Wave shaping is the same grammar.**
Statement: Sketch $y = 3\sin(2x) - 1$ and state amplitude, period, and vertical offset.
Solution: Parent $\sin x$ has amplitude 1, period $2\pi$, midline 0. Outside $\cdot 3$ gives amplitude 3. Inside $\cdot 2$ gives period $\pi$ (compress horizontally by factor 2). Outside $-1$ gives midline at $y=-1$. Mins and maxes at $y=-4$ and $y=2$.
Pedagogical point: Amplitude-frequency-offset from m3 *is* the $a\cdot f(k\cdot x)+c$ grammar from m4. One vocabulary, one set of rules.
Most common mistake: Computing period as $2\pi \cdot 2 = 4\pi$ instead of $2\pi/2 = \pi$, confusing "k makes it faster" with "k stretches it."

**E3. Geometric series, Zeno's runner.**
Statement: Find $\sum_{n=0}^{\infty} (1/2)^n$ and state why the formula works.
Solution: First term $a=1$, ratio $r=1/2$, $|r|<1$. Closed form $S = a/(1-r) = 1/(1-1/2) = 2$. Derivation: $S_n = (1-r^n)/(1-r)$; as $n$ grows, $r^n \to 0$ because $|r|<1$, so $S_n$ settles on $1/(1-r)$.
Pedagogical point: An infinite sum of positive numbers can have a finite total, the on-ramp to limits.
Most common mistake: Plugging $r=1$ into the formula and dividing by zero; or forgetting the $|r|<1$ test and getting nonsense for divergent series.

**E4. The limit of a function from a numerical table.**
Statement: Estimate $\lim_{x\to 2} \frac{x^2-4}{x-2}$ by tabulating $f(x)$ at $x=1.9, 1.99, 1.999, 2.001, 2.01, 2.1$.
Solution: Factor numerator: $\frac{(x-2)(x+2)}{x-2} = x+2$ for $x\neq 2$. Table values: $3.9, 3.99, 3.999, 4.001, 4.01, 4.1$. Both one-sided limits head for 4. Limit = 4 even though $f(2)$ is undefined ($0/0$).
Pedagogical point: The limit cares about behavior *near* $a$, not *at* $a$; a hole in the graph does not block a limit.
Most common mistake: Reporting "undefined" or DNE because $f(2)$ is $0/0$. The whole point of a limit is that this is fine.

**E5. A two-sided limit fails by jump.**
Statement: Let $f(x) = |x|/x$ for $x\neq 0$. Find $\lim_{x\to 0^-} f$, $\lim_{x\to 0^+} f$, and $\lim_{x\to 0} f$.
Solution: For $x>0$, $|x|/x=1$; for $x<0$, $|x|/x=-1$. Left limit: $-1$. Right limit: $+1$. Two-sided limit does not exist because the one-sided limits disagree.
Pedagogical point: One-sided limits are the diagnostic for jump discontinuities.
Most common mistake: Averaging the one-sided limits to get 0 and claiming the limit is 0.

**E6. Oscillation kills the limit.**
Statement: Does $\lim_{x\to 0} \sin(1/x)$ exist? Use a table at $x = 2/\pi, 2/(3\pi), 2/(5\pi), 2/(7\pi),\ldots$
Solution: $\sin(1/x)$ oscillates between $-1$ and $+1$ infinitely often as $x\to 0$ (at the listed $x$-values, $\sin(1/x) = 1, -1, 1, -1,\ldots$). Different sequences of $x_n \to 0$ produce different limiting values for $f(x_n)$, so no single $L$ exists. Limit does not exist, no jump, no blow-up, pure oscillation.
Pedagogical point: A limit can fail without any visible asymptote or jump.
Most common mistake: Concluding the limit is 0 because $x$ is heading to 0, confusing the input with the output.

**E7. Continuity by substitution.**
Statement: Compute $\lim_{x\to 1} \dfrac{\ln(x)+e^x}{x^2+3}$.
Solution: Numerator and denominator are sums, products, and quotients of catalog functions, continuous at $x=1$ since the denominator is nonzero there. So the limit equals $f(1) = (\ln 1 + e^1)/(1+3) = (0+e)/4 = e/4 \approx 0.6796$.
Pedagogical point: Once you know "elementary functions are continuous on their domains," most limits are just function evaluation.
Most common mistake: Reaching for fancy techniques (L'Hopital, factoring) when simple substitution would work.

**E8. The number e as a limit and as a slope.**
Statement: Tabulate $(1+1/n)^n$ for $n = 1, 10, 100, 1000, 10000$. Then, separately, tabulate $(e^h - 1)/h$ for $h = 0.1, 0.01, 0.001, -0.001, -0.01, -0.1$. What number do both tables approach?
Solution: First table: $2, 2.5937\ldots, 2.7048\ldots, 2.7169\ldots, 2.7181\ldots$ heading to $e\approx 2.71828$. Second table: each row is close to $1$ (e.g. $h=0.001$ gives $1.0005\ldots$), confirming that the slope of $e^x$ at $x=0$ is exactly 1.
Pedagogical point: Two seemingly different definitions of $e$ produce the same number; the "slope-1-at-0" property is *why* $e$ is the calculus-friendly base, foreshadowing m5.
Most common mistake: Believing $e$ is "just $\approx 2.7$", a number, rather than the unique base that makes calculus clean.

**E9. Local linearity by zoom.**
Statement: Plot $f(x) = x^2$ on the window $[-2,2]\times[0,4]$. Now plot it on $[0.99, 1.01]\times[0.97, 1.03]$ centered at $(1,1)$. What does the second graph look like?
Solution: At human resolution the second graph is a straight line of slope 2. Quantitatively: $f(1+h) = 1 + 2h + h^2 \approx 1 + 2h$ for small $h$, since $h^2$ is negligible relative to $h$.
Pedagogical point: Smooth curves look linear under enough magnification. That tangent slope (here, 2) is exactly what m5 will name "the derivative."
Most common mistake: Zooming with unequal x/y aspect ratios, which can make any curve "look straight" trivially.

**E10. Removable vs jump vs infinite discontinuity.**
Statement: Classify each discontinuity of (a) $\frac{x^2-1}{x-1}$ at $x=1$, (b) $\lfloor x\rfloor$ at $x=2$, (c) $1/x^2$ at $x=0$.
Solution: (a) Removable: factor cancels, limit is 2, hole at $(1,2)$. (b) Jump: left limit 1, right limit 2. (c) Infinite: both one-sided limits $\to +\infty$ (vertical asymptote).
Pedagogical point: Three failure modes; classifying them by *which* part of the continuity equation $\lim = f(a)$ breaks is the entire diagnostic vocabulary.
Most common mistake: Calling all three "undefined" without distinguishing.

## 3. Common misconceptions

1. **"Horizontal shift goes the way the sign says."** Engineers expect $f(x-3)$ to shift left. Natural because the "$-3$" looks subtractive. Kill it with the substitution argument: the value at the new $x=3$ equals the old $f(0)$, so the old origin moved to $x=3$, i.e. right. Show a Mafs widget where dragging $c$ in $f(x-c)$ visibly slides right as $c$ increases.

2. **"f(2x) stretches the graph horizontally by 2."** Multiplication "feels expansive." Kill it: $g(x)=f(2x)$ reaches the same y-value as $f$ when its argument is half as large, so the graph is *compressed* by factor 2. Show two graphs side by side with horizontal grid marks.

3. **"The limit is just f(a)."** Many learners arrive thinking limits and evaluation are the same. Natural because for nice functions they *are* equal, that is the definition of continuity. Kill it with $(x^2-4)/(x-2)$ at $x=2$, where $f(2)$ is undefined but the limit is 4. The limit cares about behavior *near* $a$, not *at* $a$.

4. **"0.999... is just slightly less than 1."** People mentally model the decimal as a string with a "last 9 somewhere far away." Per the Wikipedia article on 0.999..., students are "mentally committed to the notion that a number can be represented in one and only one way by a decimal." Kill it with the geometric series argument: $0.999\ldots = (9/10) \cdot \frac{1}{1-1/10} = 1$ exactly. Reinforce: there is no real number strictly between them, so they are equal.

5. **"Infinite means undefined."** Adult learners conflate "going to infinity" with "no answer." Natural because infinity isn't a number. Kill it by separating two ideas: a sum of infinitely many terms can converge ($1+\frac12+\frac14+\frac18+\cdots = 2$); and "limit is $+\infty$" is a *named* failure mode, not a value.

6. **"A jump discontinuity is removable, just connect the dots."** Natural because students want graphs to be continuous. Kill it: removable means the *limit exists*; jump means it doesn't. You can't redefine one point to bridge a true jump.

7. **"sin(1/x) heads toward 0 as x to 0."** The input goes to 0, so the output must too. Kill it by tabulating values at $x = 2/(\pi(2n+1))$, where the function alternates between $\pm 1$ forever. Visualize with a Mafs plot that lets the learner crank up the zoom and see the oscillations get *denser* without dying.

8. **"e is just an arbitrary constant near 2.718, like pi."** Engineers see $e$ as a magic number used by mathematicians. Kill it: $e^x$ is the unique exponential whose tangent line at $x=0$ has slope exactly 1; every base $b^x$ has slope $\ln b$ there. The slope-1 property is what makes $e^x$ the *only* function equal to its own derivative, and *that* is why softmax uses $e$.

9. **"Order of transformations doesn't matter."** It usually does, especially when mixing inside and outside operations. Kill it with a counterexample: $-(x+3)^2$ vs $-x^2+3$, different graphs. Reframe: outside ops follow the order of operations as you'd evaluate $f(x)$; inside ops follow it *in reverse*.

10. **"The limit definition needs you to actually reach a."** "x approaches a" sounds like "x eventually arrives at a." Kill it by emphasizing that the limit explicitly *excludes* the value at $a$; a hole at $x=a$ is fine; an oscillation that never settles is not.

11. **"Series and sequences are the same thing."** Both are "lists of numbers." Kill it: a sequence is a list $(a_1, a_2, \ldots)$; a series is what you get when you *add up* the list. Different objects, different convergence behaviors.

12. **"A function with a vertical asymptote is the same as a function that's undefined there."** Conflating "blows up" with "doesn't exist." Reframe: $1/x$ is undefined at 0 *and* unbounded near 0 (infinite discontinuity), while $\sin(1/x)$ is undefined at 0 *but bounded* (oscillating discontinuity), different failure modes.

## 4. Interactive widget suggestions

**`parentFnDeck`** - A "deck of cards" of the 10 parent functions, each rendered live on a small Mafs canvas. The learner clicks any card to expand it into a labeled chart that highlights its qualitative features (intercept dots, asymptote dashed lines, period brackets for trig, end-behavior arrows). Toggle a "feature mode" that highlights one feature class at a time. Beats a slider: this is about visual recognition, not parameter sweeping. Prior art: 3Blue1Brown function gallery panels in *Essence of Calculus*; Desmos "Parent Functions" graph.

**`transformationLab`** - A Mafs canvas. Choose a parent function from a dropdown; the transformed $a \cdot f(k(x-h)) + v$ is drawn with four draggable handles directly on the graph, one each for $h$, $v$, $a$, $k$. The formula in LaTeX updates each keystroke; a step list rewrites itself in plain English ("right 2, vertical stretch by 3, ..."). Beats a slider: the handles are spatially co-located with the geometric thing they change. Prior art: Desmos "Parent Function Transformations"; GeoGebra parent-function explorers.

**`sequenceSeriesScope`** - Two coordinated views of a chosen sequence. Top: a stem plot of $a_n$ vs $n$. Bottom: a running stem plot of partial sums $S_n$. The learner picks a sequence type (arithmetic with $d$, geometric with $r$) and drags the parameter; crossing $|r|=1$ flips partial sums from "settling" to "blowing up" or "oscillating." A horizontal asymptote at $a/(1-r)$ appears whenever $|r|<1$. Beats a slider: the learner sees two *coupled* views update. Prior art: 3Blue1Brown geometric-series visualizations.

**`limitProbe`** - A Mafs canvas with a fixed function $f$ (selectable from a small menu including $\frac{x^2-4}{x-2}$, $|x|/x$, $\sin(1/x)$, $1/x^2$). A draggable vertical line at $x=a$ marks "the point of interest." A live table shows $f(x)$ at the five $x$-values closest to $a$ from the left and right; a "zoom" button shrinks the step by 10x; a verdict box prints "limit = 4" / "left and right disagree (jump)" / "no settling (oscillation)." Beats a slider: the table *is* the conceptual object the lesson defines.

**`zoomToStraight`** - A single curve on a Mafs canvas with a draggable point $P$ on it. A "zoom" control magnifies the view around $P$ by 10x, 100x, 1000x; both axes are zoomed by the same factor (critical). At each zoom level a faint line snaps to $P$, but its slope is *not* labeled. Beats a slider: it stages a *gesture* (zoom) the learner physically performs. Prior art: Active Calculus Section 1.8 "The Tangent Line Approximation" (CC BY-SA, reference only); GeoGebra "zoom tangent" applet.

**`eEmerges`** - A two-panel widget. Left: a readout of $(1+1/n)^n$ for $n$ on a logarithmic slider from 1 to $10^6$, a moving dot approaching a dashed line at $e$. Right: a Mafs canvas of $y=b^x$ where the learner drags $b$ from 1 to 5; the tangent at $x=0$ is drawn, and its slope readout turns green when it equals exactly 1. An "aha" banner pops when both happen at the same number. Beats a slider: this is *two coupled slider experiences* the learner must connect, and the connection is the lesson. Prior art: 3Blue1Brown "What's so special about Euler's number e?"; Better Explained's compound-interest interactive.

## 5. Key formulas

**Function transformations**
- `f(x) + c`
- `f(x - c)`
- `a \cdot f(x)`
- `f(k \cdot x)`
- `g(x) = a \cdot f\big(k(x - h)\big) + v`

**Standard function library**
- `f(x) = c`
- `f(x) = mx + b`
- `f(x) = x^n`
- `f(x) = b^x \quad (b>0,\ b\neq 1)`
- `f(x) = \log_b(x)`
- `f(x) = \ln(x) = \log_e(x)`
- `f(x) = \sin(x)`
- `f(x) = \cos(x)`
- `f(x) = |x|`
- `f(x) = \sqrt{x}`

**Sequences and series**
- `a_n = a_1 + (n-1)\,d`
- `a_n = a_1 \cdot r^{n-1}`
- `a_n = a_{n-1} + d,\ a_1\text{ given}`
- `a_n = r \cdot a_{n-1},\ a_1\text{ given}`
- `S_n = a\,\dfrac{1 - r^n}{1 - r} \quad (r \neq 1)`
- `S_\infty = \dfrac{a}{1-r} \quad \text{when } |r|<1`

**Limits and continuity**
- `\lim_{x \to a} f(x) = L`
- `\lim_{x \to a^-} f(x) = L_-`
- `\lim_{x \to a^+} f(x) = L_+`
- `\lim_{x \to a} f(x) = L \iff \lim_{x \to a^-} f(x) = \lim_{x \to a^+} f(x) = L`
- `\lim_{x \to a} f(x) = f(a)`

**e and ln**
- `e = \lim_{n \to \infty} \left(1 + \dfrac{1}{n}\right)^n \approx 2.71828`
- `\lim_{h \to 0} \dfrac{e^h - 1}{h} = 1`
- `\ln(x) = \log_e(x),\quad x>0`
- `\ln(xy) = \ln x + \ln y`
- `\ln(x/y) = \ln x - \ln y`
- `\ln(x^p) = p\,\ln x`
- `\ln(1) = 0`
- `\ln(e) = 1`
- `e^{\ln x} = x \ (x>0)`
- `\ln(e^x) = x`

**Forward-pointer formulas (named here, used in m12+)**
- `\sigma(z)_i = \dfrac{e^{z_i}}{\sum_j e^{z_j}}`
- `\mathcal{L} = -\sum_i y_i \ln \hat{p}_i`

## 6. Lesson decomposition

The 120-minute budget splits into **four lessons of roughly 30 minutes each.**

**Lesson 4.1 - The zoo of functions and the one grammar that bends them all.** Meet the ten parent functions on sight, then learn the single shift/scale/reflect grammar. Widgets: `parentFnDeck`, `transformationLab`.

**Lesson 4.2 - Sequences, series, and the first infinite process.** A sequence is a function of $n$; a series is the running sum. Build the finite geometric sum, then push $n \to \infty$. Widget: `sequenceSeriesScope`.

**Lesson 4.3 - What "approaching" actually means: the limit.** Three operational views of a limit (graph, table, zoom), the ways limits fail, and continuity. Widget: `limitProbe`.

**Lesson 4.4 - The number e, ln, and the picture that becomes the derivative.** Meet $e$ two ways, recap $\ln$, then perform the zoom that m5 turns into the derivative. Widgets: `eEmerges`, `zoomToStraight`.

## 7. Problem bank

1. (Novice / function-catalog) Identify the parent function of $g(x) = -3\sqrt{x+2}-1$. Expected: $f(x)=\sqrt{x}$.
2. (Novice / transformation-order) Sketch $y = (x-4)^2$ relative to $y=x^2$. Expected: vertex at $(4,0)$; identical shape, shifted right 4.
3. (Novice / horizontal-scale-reflect) Find the period of $y = \cos(4x)$. Expected: $\pi/2$.
4. (Novice / vertical-scale-reflect) Find the range of $y = -2|x|+3$. Expected: $(-\infty, 3]$.
5. (Novice / arithmetic-geometric-sequences) The 10th term of the arithmetic sequence with $a_1=5$ and $d=-2$. Expected: $-13$.
6. (Novice / arithmetic-geometric-sequences) The 6th term of the geometric sequence with $a_1=3$ and $r=2$. Expected: $96$.
7. (Intermediate / finite-geometric-sum) Evaluate $\sum_{n=0}^{7}(1/3)^n$. Expected: $\frac{3280}{2187}\approx 1.49977$.
8. (Intermediate / infinite-geometric-convergence) Does $\sum_{n=0}^{\infty}(-0.9)^n$ converge? Expected: yes; $\frac{1}{1.9}\approx 0.5263$.
9. (Intermediate / infinite-geometric-convergence) Show $0.454545\ldots = 5/11$ via a geometric series. Expected: $\frac{45/100}{1-1/100}=\frac{5}{11}$.
10. (Intermediate / limit-three-views) Compute $\lim_{x\to 3}\frac{x^2-9}{x-3}$. Expected: $6$.
11. (Intermediate / one-sided-limits) For $f(x)=\frac{|x-2|}{x-2}$, give the two one-sided limits and the two-sided limit at 2. Expected: $-1$, $+1$, DNE.
12. (Intermediate / limit-failures) Classify the discontinuity of $f(x)=\frac{1}{(x-1)^2}$ at $x=1$. Expected: infinite (vertical asymptote).
13. (Intermediate / limit-failures) Classify the discontinuity of $f(x)=\sin(1/(x-2))$ at $x=2$. Expected: essential / oscillatory.
14. (Intermediate / continuity-of-elementary-functions) Compute $\lim_{x\to 0}\frac{\cos x + 3e^x}{x^2 + 2}$. Expected: $2$.
15. (Intermediate / piecewise-function) Write $|x-1|+|x+1|$ as a three-piece function. Expected: $-2x$ for $x<-1$; $2$ for $-1\le x\le 1$; $2x$ for $x>1$.
16. (Advanced / transformation-order) A single formula for "$y=\sqrt{x}$ shifted left 2, reflected across the x-axis, then up 5." Expected: $y = -\sqrt{x+2}+5$.
17. (Advanced / transformation-order) A learner writes "$y=(3x-6)^2$ shifts $y=x^2$ right 6 and stretches by 3." What's wrong? Expected: $y=(3(x-2))^2$, so the shift is right *2*, and the horizontal compression is by factor 3.
18. (Advanced / number-e-two-ways) Tabulate $(1+1/n)^n$ for $n=10^k$, $k=1..4$. Expected: $2.5937, 2.7048, 2.7169, 2.7181$; monotonically increasing toward $e$ from below.
19. (Advanced / local-linearity) Argue, using $f(1+h)=1+2h+h^2$, that $y=x^2$ looks like a line of slope 2 near $x=1$. Expected: $h^2$ is negligible vs $2h$ when $|h|\ll 1$.
20. (Advanced / transformer-callback) Given logits $z=[1,2,3]$, compute softmax $\sigma(z)$ to two decimals. Expected: $\sigma\approx[0.09, 0.24, 0.67]$; sum $=1.00$.

## 8. Endgame callback

"Softmax is $e^x$ in a costume; cross-entropy is $\ln$ in a costume. And the picture you just made, zoom into a smooth curve until it looks like a line, is the entire engine of how this network learns. The next module names that line."

## 9. Sources

1. **OpenStax Precalculus 1e**, Jay Abramson et al. CC BY 4.0. **[ADAPT].** Section 1.5 "Transformation of Functions"; chapter 11 sequences and series; chapter 12 limits and continuity. The only OpenStax precalculus edition legally adaptable for a commercial course.
2. **OpenStax Precalculus 2e**, CC BY-NC-SA 4.0. **[REFERENCE-ONLY].** Updated pedagogy and pacing.
3. **3Blue1Brown, "Limits, L'Hopital's rule, and epsilon delta definitions"** (Essence of calculus, Ch. 7). All rights reserved. **[REFERENCE-ONLY].** The "zoom into the curve" gesture.
4. **3Blue1Brown, "What's so special about Euler's number e?"** (Essence of calculus, Ch. 5). All rights reserved. **[REFERENCE-ONLY].** Dual definition of $e$.
5. **Active Calculus, Section 1.8 "The Tangent Line Approximation"**, Matt Boelkins. CC BY-SA 4.0. **[REFERENCE-ONLY]** (share-alike incompatible with proprietary distribution). The "locally linear" framing.
6. **Mafs library**, Steven Petryk. MIT. **[ADAPT].** Every widget in section 4.
7. **Paul Dawkins, Calculus I notes (Limits & Continuity)**. **[REFERENCE-ONLY].** Problem-bank inspiration.
8. **Karpathy, "The spelled-out intro to language modeling: building makemore"**. All rights reserved. **[REFERENCE-ONLY].** "Softmax is exp + normalize; cross-entropy is negative log."
9. **Mathematics for Machine Learning**, Deisenroth, Faisal, Ong. Cambridge UP. **[REFERENCE-ONLY].** Which prerequisites matter downstream.
10. **Wikipedia, "0.999..."**. CC BY-SA 4.0. **[REFERENCE-ONLY].** The documented misconception behind misconception #4.

## 10. Pedagogical traps

1. **Smuggling in the derivative.** Tempting to write $\lim_{h\to 0}\frac{f(a+h)-f(a)}{h}$ during the local-linearity step. Mitigation: `zoomToStraight` shows the line *without labeling its slope*. m4 says "a curve looks like a line if you zoom"; m5 says "compute the slope." Keep them separate.
2. **Epsilon-delta creep.** Engineers may push back with "isn't a limit really about epsilon and delta?" Mitigation: a one-paragraph aside naming epsilon-delta as the formalism and explaining the informal version is equivalent for every example here.
3. **Transformations as memorization.** Make `transformationLab` the source of truth; gate on graph-reading, not formula-recall. One rule, not eight.
4. **Spending too long on sequences.** Skip arithmetic-series formulas, the binomial theorem, sigma-manipulation puzzles. Geometric series exists *only* as the on-ramp to limits.
5. **Treating e as a mystery number.** Hit $e$ twice: limit of $(1+1/n)^n$, and the slope-1 base. The "click, same number" moment is the lesson.
6. **"Where will I ever use this?"** Every lesson ends with a one-paragraph callback to the transformer.
