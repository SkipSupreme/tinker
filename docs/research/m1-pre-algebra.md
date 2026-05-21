# Tinker Module 1: Pre-Algebra: Research Brief

> Deep-research output, saved 2026-05-20. Light de-garbling of paste artifacts only
> (fused words / dropped letters reconstructed); no substantive edits to the research.
> The 5 MDX lessons from §6 and the problem bank from §7 are converted under
> `apps/docs/src/content/lessons/`; widgets W1–W7 from §4 built under
> `apps/docs/src/components/demos/`.

---

## 1. CONCEPT DEPENDENCY GRAPH

Topologically sorted. Prereqs in `[brackets]`. Anything from M0 (placement diagnostic) is assumed: counting, place value, basic arithmetic fluency.

1. `number-line-as-positions`: A real number is a position on a continuous, oriented 1-D axis with a chosen origin (0) and unit length. [M0]
2. `negative-as-direction`: The sign of a number encodes which side of zero it sits on; a negative is a position, not a missing quantity. [number-line-as-positions]
3. `absolute-value`: |x| is the distance from x to 0 on the number line, always ≥ 0; it discards direction but preserves magnitude. [number-line-as-positions, negative-as-direction]
4. `signed-addition-as-motion`: a + b means "start at a, take b signed steps"; subtraction is adding the additive inverse: a − b = a + (−b). [negative-as-direction]
5. `product-of-signs`: Multiplication by −1 reflects across 0; therefore (−)(−) = (+), (−)(+) = (−); generalizes to "count the negatives mod 2." [signed-addition-as-motion]
6. `four-operations-and-inverses`: Addition⇄subtraction and multiplication⇄division are the two inverse pairs; division by 0 is undefined because no number times 0 yields a nonzero result. [signed-addition-as-motion, product-of-signs]
7. `fraction-as-deferred-division`: The notation a/b is literally "a divided by b" left unevaluated; the fraction is one point on the number line, not a pair. [four-operations-and-inverses, number-line-as-positions]
8. `equivalent-fractions`: Multiplying numerator and denominator by the same nonzero k yields the same point (a/b = ak/bk); reduction to lowest terms uses gcd. [fraction-as-deferred-division]
9. `common-denominators`: To add or subtract fractions you must first express them in the same unit (same denominator); multiplication and division do not require this. [equivalent-fractions]
10. `fraction-arithmetic`: The four operations on fractions: add/subtract via common denominator; multiply numerators and denominators; divide by multiplying by the reciprocal. [common-denominators, four-operations-and-inverses]
11. `decimal-percent-equivalence`: Decimals are fractions with denominator a power of 10; percent is a fraction with denominator 100; these are three notations for one point on the line. [fraction-as-deferred-division]
12. `ratio-and-proportion`: A ratio compares two quantities multiplicatively; a proportion equates two ratios; "scale both sides by the same factor" preserves the ratio. [fraction-as-deferred-division]
13. `exponents-as-repeated-multiplication`: a^n for positive integer n is n copies of a multiplied; a^0 = 1 is the value that makes a^(m+n) = a^m · a^n consistent at n=0 (full laws of exponents are deferred to m2-algebra). [four-operations-and-inverses]
14. `order-of-operations`: Precedence and associativity rules guarantee every well-formed expression denotes exactly one value; this is the same precedence the learner already trusts in Python/JS/C. [exponents-as-repeated-multiplication, fraction-arithmetic, product-of-signs]
15. `expression-as-evaluation-tree`: Any arithmetic expression parses to a binary tree (an AST); evaluation is a post-order traversal of that tree. This is the M1 ancestor of the m16-transformer forward pass. [order-of-operations]
16. `variable-as-named-placeholder`: A variable is a named cell that holds an unknown, chosen-later, or varying number, exactly the "named box" of a program variable. [number-line-as-positions]
17. `expression-vs-equation`: An expression evaluates to a value; an equation asserts two expressions are equal and is either true, false, or a constraint on a free variable. [variable-as-named-placeholder, expression-as-evaluation-tree]
18. `substitution-and-evaluation`: Replacing every occurrence of a variable with a number reduces an expression to its tree-evaluated value. [variable-as-named-placeholder, expression-as-evaluation-tree]
19. `equation-as-balance`: An equation is a constraint; applying the same function to both sides preserves the solution set (modulo well-known caveats with squaring or dividing by an unknown). [expression-vs-equation, four-operations-and-inverses]
20. `solve-linear-by-inverse-peel`: To solve a one-variable linear equation, undo the operations wrapping the variable in reverse precedence order (the AST from the outside in). This is the M1 ancestor of the m16-transformer backward pass. [equation-as-balance, expression-as-evaluation-tree, four-operations-and-inverses]
21. `verify-by-substitution`: A candidate solution is correct iff substituting it back makes both sides of the original equation evaluate to the same number. [substitution-and-evaluation, expression-vs-equation]

> **Where this shows up in the transformer.** Concept 15 is the forward pass in miniature; concept 20 is the backward pass in miniature; concept 3 is the 1-D ancestor of the vector norm used to measure loss and gradient magnitude in m7 and beyond.

---

## 2. CANONICAL WORKED EXAMPLES

Each one is a workhorse that appears repeatedly across OpenStax *Prealgebra 2e*, MIT 18.01/18.06 review materials, 3Blue1Brown's algebra/linear-algebra primers, Karpathy's micrograd walkthrough, and the prerequisite chapters of Deisenroth–Faisal–Ong's *Mathematics for Machine Learning*.

### E1. Signed arithmetic on the number line
**Problem.** Compute $-7 - (-3) + (-4)$.
**Solution.**
1. Rewrite subtraction as addition of the opposite: $-7 + 3 + (-4)$.
2. Walk the number line from $-7$: $+3$ lands at $-4$; then $-4$ lands at $-8$.
3. Answer: $-8$.

**Pedagogical point.** Subtraction is a special case of addition once signs are first-class. The number line *is* the proof.
**Most common mistake.** Treating the two adjacent minus signs in `- (-3)` as a single subtraction and computing $-7 - 3 = -10$.

### E2. Product of signs and reflection
**Problem.** Compute $(-2) \cdot (-3) \cdot (-5)$.
**Solution.**
1. Multiplication by $-1$ reflects the point across $0$. Three reflections compose to one reflection.
2. Magnitudes multiply: $2 \cdot 3 \cdot 5 = 30$.
3. An odd number of negatives ⇒ negative: $-30$.

**Pedagogical point.** "Count the negatives mod 2." A negative is an operator, not a defect.
**Most common mistake.** Pairing arbitrarily ($(-2)(-3) = 6$, then $6 \cdot (-5) = -30$, gets the right answer here but fails on $(-2)(-3)(-5)(-1)$ when the learner forgets to keep counting).

### E3. Fraction addition with unlike denominators
**Problem.** Compute $\dfrac{3}{4} + \dfrac{5}{6}$.
**Solution.**
1. LCD of $4$ and $6$ is $12$.
2. $\frac{3}{4} = \frac{9}{12}$, $\frac{5}{6} = \frac{10}{12}$.
3. Add numerators only: $\frac{19}{12}$. Already in lowest terms.

**Pedagogical point.** Fractions are *numbers in a unit*; you can only add same-unit quantities. This is the same reason you can't add meters to seconds.
**Most common mistake.** Adding straight across, $\frac{3+5}{4+6} = \frac{8}{10}$, which produces a number that isn't even between the two operands. (UK NFER's 2019 KS2 trial data found 10% of lower-achieving Year 6 pupils made exactly this error.)

### E4. Fraction division as multiplication by reciprocal
**Problem.** Compute $\dfrac{2}{3} \div \dfrac{4}{5}$.
**Solution.**
1. $\frac{2}{3} \div \frac{4}{5} = \frac{2}{3} \cdot \frac{5}{4}$.
2. $= \frac{10}{12} = \frac{5}{6}$.

**Pedagogical point.** Division is multiplication by the multiplicative inverse, the same idea as "subtraction is addition of the additive inverse" applied to the other operation pair. The two inverse pairs are perfectly parallel.
**Most common mistake.** Flipping the *first* fraction instead of the divisor; or flipping both.

### E5. Fraction ⇄ decimal ⇄ percent
**Problem.** Express $\dfrac{3}{8}$ as a decimal and as a percent.
**Solution.**
1. $\frac{3}{8} = 3 \div 8 = 0.375$ (long division or recognize $\frac{1}{8} = 0.125$).
2. $0.375 \times 100\% = 37.5\%$.

**Pedagogical point.** One point on the number line, three notations. Choose the notation that makes the next step easiest, engineers already do this when picking hex vs. decimal vs. binary.
**Most common mistake.** Treating the percent sign as decorative and writing $0.375 = 0.375\%$ (it's off by a factor of 100).

### E6. Evaluating an expression: the AST way
**Problem.** Evaluate $3 + 4 \cdot 2^{2}$ and draw its evaluation tree.
**Solution.**
1. Parse: the root is `+`, with left child `3` and right child a subtree `* (4, ^(2,2))`.
2. Post-order eval: $2^2 = 4$; $4 \cdot 4 = 16$; $3 + 16 = 19$.

**Pedagogical point.** PEMDAS isn't a grade-school slogan, it's the precedence grammar that turns a string of symbols into a unique tree, exactly as a programming-language parser does. Forward pass = post-order traversal.
**Most common mistake.** Left-to-right reading: $3+4=7$, $7 \cdot 2 = 14$, $14^2 = 196$. Same string, wrong tree.

### E7. Solving a two-step linear equation by peeling
**Problem.** Solve $3x + 7 = 19$.
**Solution.**
1. Build the AST of the LHS rooted at `+`: the variable is wrapped first by `*3`, then by `+7`. Peel from the outside in.
2. Subtract 7 from both sides: $3x = 12$.
3. Divide both sides by 3: $x = 4$.
4. Verify: $3(4) + 7 = 12 + 7 = 19$. ✓

**Pedagogical point.** Solving is walking the AST from the root inward, applying the inverse at each node. This is the literal shape of backprop.
**Most common mistake.** Dividing by 3 first while the +7 is still attached, producing $x + 7 = \frac{19}{3}$ and arithmetic chaos.

### E8. Distance as absolute value (the m7 norm preview)
**Problem.** A signal is at position $x = -2.4$ on a 1-D track. The target is at $t = 1.1$. What is the distance between them?
**Solution.**
1. Distance on a number line is $|x - t|$.
2. $|-2.4 - 1.1| = |-3.5| = 3.5$.

**Pedagogical point.** This is the 1-D ancestor of the Euclidean norm $\|x - t\|_2$ used to measure loss in m7 and every subsequent module. As Wikipedia's *Norm (mathematics)* article puts it, a norm is "a function from a real or complex vector space to the non-negative real numbers that behaves in certain ways like the distance from the origin." In 1-D, the norm literally *is* the absolute value.
**Most common mistake.** Computing $x - t$ and reporting the negative result, missing that distance is signless.

### E9. Proportional scaling
**Problem.** A recipe for 6 servings uses 250 g of flour. How much flour is needed for 15 servings?
**Solution.**
1. Set up proportion: $\frac{250}{6} = \frac{f}{15}$.
2. Cross-multiply (or scale): $f = 250 \cdot \frac{15}{6} = 250 \cdot 2.5 = 625$ g.

**Pedagogical point.** "Scale everything by the same factor." Proportional reasoning is the first taste of linearity, and linearity is the entire engine of m7.
**Most common mistake.** Additive thinking, "15 is 9 more than 6, so add 9 × something", which only works for affine, not multiplicative, relationships.

### E10. Substitution into a small expression (Karpathy-style)
**Problem.** Let $f(a,b,c) = a \cdot b + c$. Evaluate at $a = 2$, $b = -3$, $c = 10$.
**Solution.**
1. Substitute: $f(2,-3,10) = (2)(-3) + 10$.
2. Order of operations: $-6 + 10 = 4$.

**Pedagogical point.** This is structurally identical to the opening example in Karpathy's "spelled-out intro to neural networks and backpropagation: building micrograd", a small scalar expression evaluated by walking its tree. Every neural net is this, only bigger.
**Most common mistake.** Computing $b + c$ first because they're written next to each other, ignoring that `*` binds tighter than `+`.

---

## 3. COMMON MISCONCEPTIONS

### MC1. "A negative number is a missing quantity, not a real number."
**Why natural.** Grade-school exposure framed negatives as "you owe me" or "you have less than zero apples," which makes them sound like deficits rather than positions. **Killer.** Show the number line zoomed symmetrically around 0; drag a point to $-3$ and to $+3$ and overlay $|x|$; both are equally real, equally addressable, equally far from the origin.

### MC2. "The minus sign means subtraction."
**Why natural.** The same glyph is overloaded for *unary negation* and *binary subtraction* in standard notation, exactly the way `-` is overloaded in most programming languages. Mathematics-education blogger Michael Goldenberg argues on *Math with Bad Drawings* that the standard "minus sign" is misnamed: it "is 'really' an 'opposite' sign (or additive inverse sign)" rather than a subtraction operator. **Killer.** Show the expression $-3 + 5$ as an AST with a `negate` unary node above `3`, and contrast with the AST of $0 - 3 + 5$. They evaluate to the same number; their trees are different.

### MC3. "Subtraction and division are first-class operations, not derived from addition and multiplication."
**Why natural.** They were taught as separate operations with their own tables. **Killer.** Define $a - b := a + (-b)$ and $a \div b := a \cdot b^{-1}$ explicitly; then the "four operations" collapse into two operations with inverse elements, which is the structure the learner will meet again in groups/linear algebra.

### MC4. "$\frac{a}{b}$ is a pair of numbers."
**Why natural.** It looks like two numbers stacked. **Killer.** Have the learner type `3/4` in a JS console and observe `0.75`: one number out, not a tuple. Show the same $\frac{3}{4}$ on the number line as a single dot between $0$ and $1$.

### MC5. "To add fractions, add numerators and add denominators."
**Why natural.** It's the syntactic move that requires the least thought, and it mirrors how vector components add. **Killer.** Counterexample: $\frac{1}{2} + \frac{1}{2}$ would be $\frac{2}{4} = \frac{1}{2}$, which is obviously wrong. Reinforce with a number-line widget: dragging two fraction bars of unequal length and trying to lay them end-to-end fails to land on a single tick mark unless you first re-cut them to a common unit.

### MC6. "A percent is a different kind of number from a fraction or decimal."
**Why natural.** Different notation, different contexts (finance vs. math class). **Killer.** Show the same point on the number line labeled simultaneously $\frac{3}{8}$, $0.375$, and $37.5\%$. The notation is a *cast*, not a *type change*.

### MC7. "The equals sign means 'compute the answer.'"
**Why natural.** Calculator culture: you press `=` to evaluate. **Killer.** Distinguish three uses: assertion ($2+2 = 4$), definition ($f(x) := x^2$), and constraint ($3x + 7 = 19$, asking *for what $x$*). Cite that in code, `=` is assignment and `==` is the assertion, math conflates the two, and that's the source of the confusion.

### MC8. "Order of operations is a memorized acronym (PEMDAS / BODMAS / GEMDAS)."
**Why natural.** That's how it was taught. **Killer.** Reframe: it's the operator-precedence table of arithmetic, identical (modulo a couple of edge cases like unary minus) to the one in the C operator-precedence chart on cppreference. As ScienceDirect's *Expression Tree* topic page states: "The structure of the tree encodes operator precedence, ensuring that evaluation order respects algebraic rules. For example, in the expression a + b × c, the parse tree is constructed so that a postorder traversal evaluates multiplication before addition."

### MC9. "Solving an equation means moving symbols to the other side and flipping their signs."
**Why natural.** That's the verb most learners were drilled on. **Killer.** Reframe solving as *applying the same function to both sides of an assertion of equality*. The Brainly community-vetted answer on this exact misconception puts it crisply: "We are applying inverse operations in the reverse order that operations were originally done. Throughout the solution process, the order of operations remains applicable. 'Backwards' refers only to using the original sequence of operations to identify an appropriate order in which to apply inverse operations." Making the function explicit (`subtract 7 from both sides`) eliminates sign-flipping errors.

### MC10. "Multiplying always makes bigger, dividing always makes smaller."
**Why natural.** True for positive integers greater than 1, which is where everyone started. **Killer.** Multiply by $\frac{1}{2}$ and divide by $\frac{1}{2}$ on an interactive number line, the operations swap roles whenever a factor crosses 1.

### MC11. "$a^0 = 0$" or "$a^0$ is undefined."
**Why natural.** Zero copies of something feels like nothing. **Killer.** Show the pattern $a^3, a^2, a^1, a^0$ as repeated division by $a$: each step divides by $a$, so $a^0 = 1$ for $a \ne 0$ is forced by the pattern. (The full law-of-exponents derivation is deferred to m2.)

### MC12. "Variables and unknowns are the same thing."
**Why natural.** First exposure was always "solve for $x$." **Killer.** Distinguish three roles a variable plays, *unknown* (solve for it), *parameter* (chosen later, then held fixed), *free variable in a function* (varies over a domain). All three are the same syntactic object, a named box, playing different semantic roles, exactly like a variable in code that's sometimes a function argument, sometimes a config constant, sometimes a loop index. The Kansas State CC 210 textbook makes the explicit analogy: "One way to think about variables in a computer program is to imagine them as a cardboard box. When we declare a variable, we are making a new box and giving it a name."

---

## 4. INTERACTIVE WIDGET SUGGESTIONS

### W1. `numberLineWalker`
- **Manipulate.** Drag a "walker" token along a number line. Type or drag signed step values into a queue; the walker animates each step.
- **Live updates.** The walker's position, the running sum displayed as a sequence of `+` and `−` operations, and the AST of the equivalent expression.
- **Concept made tangible.** Addition and subtraction are *motion*; subtracting a negative *reverses* the step direction.
- **Beats a slider because.** The learner constructs the expression by placing operations on a line, not by scrubbing a number. The animation is the proof.
- **Prior art.** Math Learning Center Number Line app (https://apps.mathlearningcenter.org/number-line/); MathsIsFun fraction number line (https://www.mathsisfun.com/numbers/fraction-number-line.html); Math Mammoth interactive number-line exercises.

### W2. `signFlipMirror`
- **Manipulate.** Drag a point $x$ along the line; click a `× (−1)` button (or drag a `−` operator chip onto $x$) to reflect across 0.
- **Live updates.** A counter of how many negations have been applied; the current value; the color of the point flips on each reflection.
- **Concept made tangible.** Multiplying by $-1$ is reflection across 0; the product of signs is the parity of the count of negations.
- **Beats a slider because.** The learner physically composes reflections and watches parity emerge. No "memorize the table."
- **Prior art.** No direct widget known; closest is the reflection mode in PhET's "Number Line: Operations" sim (CC BY but commercial-embedding requires a paid PhET-iO partnership, https://phet.colorado.edu/), use as reference, not embed.

### W3. `fractionUnitBar`
- **Manipulate.** Drag the denominator slider on each of two fraction bars to re-cut them; drop both onto a shared number line.
- **Live updates.** The bars visually re-tile; the sum/difference highlights only when the unit-widths match; a "common denominator" indicator turns green when alignment occurs.
- **Concept made tangible.** You cannot add until both fractions are expressed in the same unit, the failure to align is *visible*.
- **Beats a slider because.** The misalignment is the lesson. A static figure can't show the moment alignment locks in.
- **Prior art.** Polypad fraction bars at https://mathigon.org/task/fraction-bars (now hosted by Amplify; CC BY-NC-SA, reference only); Math Mammoth fraction number line (reference only).

### W4. `expressionTreeBuilder`
- **Manipulate.** Type an arithmetic expression in an input box (e.g., `3 + 4 * 2^2`); drag-rearrange operator nodes in the rendered AST; toggle parentheses.
- **Live updates.** The AST renders live (the same parse a JS engine would produce); each node displays its evaluated value once children resolve; a "step the post-order traversal" button highlights nodes in eval order.
- **Concept made tangible.** Order of operations *is* the tree; evaluation *is* the traversal. The forward pass of a neural network is the same picture with more nodes.
- **Beats a slider because.** The learner manipulates *the structural object the lesson named* (the tree), not a number. This is the canonical Bret-Victor "give them the mathematical object" move.
- **Prior art.** Wolfram Demonstrations "Order of Operations Tree" (https://demonstrations.wolfram.com/OrderOfOperationsTree/, CC BY-NC-SA 3.0, reference only); the `draw_dot` AST visualizer in Karpathy's micrograd notebook (MIT-licensed, https://github.com/karpathy/micrograd).

### W5. `balanceSolver`
- **Manipulate.** A pan balance with the equation rendered as physical objects on each side (e.g., three $x$-blocks plus seven unit-blocks vs. nineteen unit-blocks). The learner clicks an "apply inverse" button at the AST root, the action automatically mirrors on both pans.
- **Live updates.** Both pans update in lockstep; an equation log records each applied inverse ("subtract 7 from both sides"); the AST collapses one level per step.
- **Concept made tangible.** Equation = constraint; legal moves = same function applied to both sides; solving = AST collapse from outside in.
- **Beats a slider because.** The learner cannot break the balance by applying an asymmetric move, the constraint is enforced by the widget, so the only thing to learn is *which* inverse to choose.
- **Prior art.** Desmos Classroom hanger activities by Erika Swinemer and Amplify Classroom (https://teacher.desmos.com/activitybuilder/custom/5ebd8d4ffe18b9720b1f949e and /5f3dff26648ad60cf51bac6e. Desmos Classroom proprietary terms, reference only).

### W6. `notationToggle`
- **Manipulate.** A draggable point on the unit number line; three label badges (fraction, decimal, percent) attached to the point.
- **Live updates.** All three badges update simultaneously; the learner can also edit any one badge and the point + the other two recompute. A "lowest-terms" toggle reduces the fraction badge in place.
- **Concept made tangible.** Three notations, one number. Choose the notation that makes the next step easiest.
- **Beats a slider because.** Editing the *fraction* badge directly (instead of a slider) lets the learner test their own conversions, and reveals when they've been silently rounding.
- **Prior art.** No close prior art; MathsIsFun's fraction–decimal chart (https://www.mathsisfun.com/numbers/fraction-decimal-chart.html) is static.

### W7. `peelInversesGame`
- **Manipulate.** An equation rendered as the LHS AST. The learner clicks the outermost operator node; the widget asks "what's the inverse?" and the learner types it (e.g., `-7`). The inverse is then applied to both sides automatically.
- **Live updates.** The AST shrinks; both sides re-render; a verification panel substitutes the running candidate back into the original equation and shows the residual.
- **Concept made tangible.** Solving = repeatedly *choosing the right inverse* at the right level. Verification = substitution.
- **Beats a slider because.** The learner picks operations from a labeled menu of math objects, not from a slider of numbers. Mistakes are pedagogical (wrong inverse → wrong residual, instantly visible).
- **Prior art.** None directly; conceptual ancestors are Bret Victor's *Scrubbing Calculator* (http://worrydream.com/ScrubbingCalculator/, reference only) and the backward-pass viz in micrograd's `draw_dot`.

---

## 5. KEY FORMULAS

**Signed arithmetic**
- `a - b = a + (-b)`
- `(-1) \cdot a = -a`
- `(-a)(-b) = ab`
- `|x| = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases}`
- `|x - y| = \text{distance from } x \text{ to } y`

**Fractions**
- `\frac{a}{b} = a \div b, \quad b \ne 0`
- `\frac{a}{b} = \frac{ak}{bk}, \quad k \ne 0`
- `\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}`
- `\frac{a}{b} - \frac{c}{d} = \frac{ad - bc}{bd}`
- `\frac{a}{b} \cdot \frac{c}{d} = \frac{ac}{bd}`
- `\frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \cdot \frac{d}{c} = \frac{ad}{bc}`

**Notation equivalences**
- `\frac{a}{b} = a \div b = \text{decimal}`
- `p\% = \frac{p}{100}`

**Ratio and proportion**
- `\frac{a}{b} = \frac{c}{d} \iff ad = bc`

**Exponents (preview only; full laws in m2)**
- `a^n = \underbrace{a \cdot a \cdots a}_{n \text{ times}}, \quad n \in \mathbb{Z}_{>0}`
- `a^0 = 1, \quad a \ne 0`

**Equation solving**
- `\text{If } a = b, \text{ then } f(a) = f(b) \text{ for any function } f`
- `ax + b = c \implies x = \frac{c - b}{a}, \quad a \ne 0`

---

## 6. LESSON DECOMPOSITION

### Lesson 1.1: "Quantities live on a line"
*One sentence:* The number line is the only mental model you need for what a real number is, including the negative ones.
*Est. 18 min.*
1. **Hook.** "You already trust this picture; we're going to make it official." (prose)
2. **The line.** Axis, origin, unit.
3. **Negatives as positions, not deficits.** (W1 demo.)
4. **Magnitude vs. direction.** The sign is direction; what's the magnitude?
5. **Absolute value as distance.** $|x|$ formally.
6. **StepCheck.** Compute $|-7|$ and $|3.2|$, answer: `7`, `3.2`.
7. **Distance between two points.** $|x - y|$.
8. **StepCheck.** Distance from $-2.4$ to $1.1$, answer: `3.5`.
9. **Forward reference.** "In m7 this becomes the vector norm; in 1-D the norm *is* this." (prose)

*Widgets:* W1, W2.

### Lesson 1.2: "Two operations, two inverses"
*One sentence:* Subtraction is addition's inverse; division is multiplication's inverse; that's the whole story of the four operations.
*Est. 22 min.*
1. **Addition as motion.** (W1.)
2. **Subtraction as motion in reverse.** $a - b := a + (-b)$.
3. **Product of signs as reflection.** (W2.)
4. **StepCheck.** $(-2)(-3)(-5)$, answer: `-30`.
5. **Multiplication, division, and the reciprocal.** $a \div b := a \cdot b^{-1}$.
6. **Why division by zero is undefined.** No $b^{-1}$ exists for $b = 0$.
7. **StepCheck.** $\frac{12}{-4}$, answer: `-3`.
8. **The two inverse pairs, side by side.** (Diagram.)
9. **Forward reference.** "When we solve equations, we'll apply these inverses in reverse order."

*Widgets:* W1, W2.

### Lesson 1.3: "A fraction is one number"
*One sentence:* `a/b` literally means `a divided by b`: one point, three notations (fraction, decimal, percent).
*Est. 25 min.*
1. **Fraction as deferred division.** Type `3/4` in a JS console, get `0.75`.
2. **One point on the number line.** (W3.)
3. **Equivalent fractions.** Multiply top and bottom by the same $k$. (W3.)
4. **Lowest terms via gcd.**
5. **StepCheck.** Reduce $\frac{18}{24}$, answer: `3/4`.
6. **Adding fractions: the unit problem.** Why you need a common denominator. (W3.)
7. **The four fraction operations, briskly.** (Walk through E3 and E4.)
8. **StepCheck.** $\frac{3}{4} + \frac{5}{6}$, answer: `19/12`.
9. **StepCheck.** $\frac{2}{3} \div \frac{4}{5}$, answer: `5/6`.
10. **Fraction ⇄ decimal ⇄ percent.** (W6.)
11. **StepCheck.** Write $\frac{3}{8}$ as a percent, answer: `37.5%`.
12. **Ratios and proportional scaling.** (Recipe example E9.)
13. **StepCheck.** Recipe scales 6 → 15, answer: `625 g`.

*Widgets:* W3, W6.

### Lesson 1.4: "Expressions are trees"
*One sentence:* Operator precedence is just the parser, every expression is a unique AST, and evaluating it is a post-order traversal.
*Est. 20 min.*
1. **Hook.** "Python and your math textbook agree on what `3 + 4 * 2 ** 2` means. Here's why."
2. **Precedence and associativity as the parser.** (Reference the C / Python operator-precedence table.)
3. **The AST.** Draw the tree for `3 + 4 * 2^2`. (W4.)
4. **Evaluation = post-order traversal.** (W4 animation.)
5. **StepCheck.** Evaluate `3 + 4 * 2^2`: answer: `19`.
6. **Exponents as repeated multiplication, plus $a^0 = 1$ preview.** (Pattern table.)
7. **StepCheck.** $5^0 + 2^3$, answer: `9`.
8. **One expression, one value.** Why this matters: it's what makes the forward pass of any computation deterministic.
9. **Forward reference.** "The m16 transformer's forward pass is this picture, with billions of nodes." (Karpathy's 2022 *Deep Neural Nets: 33 years ago and 33 years from now* post puts the scale as "small few billion parameters" for vision nets and "into trillions of parameters" for language models.)

*Widgets:* W4.

### Lesson 1.5: "Variables, expressions, equations"
*One sentence:* A variable is a named box; an equation is a constraint; solving is peeling operations off the box from the outside in.
*Est. 28 min.*
1. **Variable as named placeholder.** Same as in code. Three roles: unknown, parameter, free variable.
2. **Expression vs. equation.** Expression evaluates; equation asserts.
3. **Substitution and evaluation.** (Walk through E10.)
4. **StepCheck.** With $a=2, b=-3, c=10$, evaluate $a \cdot b + c$, answer: `4`.
5. **Equation as balance.** "Same function to both sides." (W5.)
6. **The AST of the LHS tells you which inverse comes first.** (W7.)
7. **Solving $3x + 7 = 19$ by peeling.** (W7, E7.)
8. **StepCheck.** Solve $5x - 4 = 21$, answer: `5`.
9. **Verification.** Substitute back.
10. **StepCheck.** Solve $-2x + 9 = 3$, verify, answer: `3`.
11. **Closer: solving = inverse-walking the AST.** Forward ref to m16 backward pass.
12. **Handoff to m2.** "Next module: functions, function composition, exponent laws, and systems of equations. You now have the substrate."

*Widgets:* W5, W7.

---

## 7. PROBLEM BANK

| # | Statement | Answer | Tier | Type | Tags |
|---|---|---|---|---|---|
| 1 | Compute $-8 + 5$. | $-3$ | novice | computation | signed-addition-as-motion |
| 2 | Compute $-7 - (-12)$. | $5$ | novice | computation | signed-addition-as-motion |
| 3 | Compute $|{-4.6}|$. | $4.6$ | novice | computation | absolute-value |
| 4 | Compute the distance on the number line between $-3$ and $8$. | $11$ | novice | interpretation | absolute-value |
| 5 | Compute $(-3)(-2)(5)(-1)$. | $-30$ | novice | computation | product-of-signs |
| 6 | Reduce $\dfrac{42}{56}$ to lowest terms. | $\dfrac{3}{4}$ | novice | computation | equivalent-fractions |
| 7 | Compute $\dfrac{2}{5} + \dfrac{1}{3}$. | $\dfrac{11}{15}$ | novice | computation | common-denominators, fraction-arithmetic |
| 8 | Compute $\dfrac{7}{8} - \dfrac{1}{6}$. | $\dfrac{17}{24}$ | intermediate | computation | fraction-arithmetic |
| 9 | Compute $\dfrac{3}{4} \cdot \dfrac{8}{9}$ and give the result in lowest terms. | $\dfrac{2}{3}$ | intermediate | computation | fraction-arithmetic |
| 10 | Compute $\dfrac{5}{6} \div \dfrac{10}{3}$. | $\dfrac{1}{4}$ | intermediate | computation | fraction-arithmetic |
| 11 | Write $0.625$ as a fraction in lowest terms and as a percent. | $\dfrac{5}{8}$, $62.5\%$ | intermediate | construction | decimal-percent-equivalence |
| 12 | A solution is 15% salt by mass. How many grams of salt are in 240 g of solution? | $36$ g | intermediate | construction | ratio-and-proportion |
| 13 | Evaluate $2 + 3 \cdot 4^2 - (5 - 2)^2$. | $41$ | intermediate | computation | order-of-operations |
| 14 | Draw the AST of $a \cdot (b + c) - d$ and state the order of node evaluations. | Tree: `−(·(a, +(b,c)), d)`; eval order: $b, c, b{+}c, a, a(b{+}c), d, \text{result}$ | intermediate | construction | expression-as-evaluation-tree |
| 15 | Evaluate $\dfrac{a^2 - b}{c}$ at $a = -3$, $b = 4$, $c = 5$. | $1$ | intermediate | computation | substitution-and-evaluation, order-of-operations |
| 16 | Solve $4x - 9 = 23$ and verify. | $x = 8$; check: $4(8) - 9 = 23$ ✓ | intermediate | computation | solve-linear-by-inverse-peel, verify-by-substitution |
| 17 | Solve $\dfrac{x}{3} + 2 = -1$. | $x = -9$ | intermediate | computation | solve-linear-by-inverse-peel |
| 18 | A student claims that $\dfrac{1}{2} + \dfrac{1}{3} = \dfrac{2}{5}$. Identify the bug and write the correct value. | Bug: added numerators and denominators separately, treating fractions as 2-tuples instead of single numbers; correct: $\dfrac{5}{6}$. | intermediate | debugging | common-denominators, fraction-as-deferred-division |
| 19 | Solve $5 - 2x = 3x + 20$ and verify. | $x = -3$; check: $5 - 2(-3) = 11$ and $3(-3) + 20 = 11$ ✓ | advanced | computation | solve-linear-by-inverse-peel, verify-by-substitution |
| 20 | A learner writes: "To solve $3(x + 4) = 21$, divide both sides by 3, get $x + 4 = 7$, so $x = 3$." Their classmate writes: "Distribute first: $3x + 12 = 21$, so $3x = 9$, $x = 3$." Both got the right answer. Construct an equation where these two strategies would *look* like they disagreed (e.g., one strategy invites an arithmetic mistake the other avoids), and state which strategy you'd recommend by default. | Sample: $3(x + 4) = 22$. Strategy A: $x + 4 = 22/3$, $x = 22/3 - 4 = 10/3$. Strategy B: $3x + 12 = 22$, $3x = 10$, $x = 10/3$. Same answer, but Strategy A invites the mistake of computing $22/3 - 4$ with mismatched denominators. Recommend Strategy B (distribute first) when the RHS isn't a multiple of the coefficient, keeps integer arithmetic for one more step. | advanced | proof-scaffold | solve-linear-by-inverse-peel, equation-as-balance, fraction-arithmetic |

---

## 8. ENDGAME CALLBACK REFINED

The user's starter is good; the main edit needed is that modern transformers don't have "a few hundred thousand" parameters. Karpathy's own 2022 *Deep Neural Nets: 33 years ago and 33 years from now* post pegs modern vision nets at "small few billion parameters" and language models "into trillions of parameters." Pre-algebra is the bridge to that scale, not a scale-match to it. Three candidates:

1. **(Recommended.)** "A neural network is an arithmetic expression, billions of variables wide, but the same shape you just learned. The variables are the parameters the model learns. Order of operations, the rule that an expression has exactly one value, is the forward pass. Solving an equation by undoing operations in reverse is the shape of the backward pass. You already know how to read code; you now know how to read the math the same way."

2. "Every formula in this course, including the GPT-scale transformer in module 16, parses to a tree. Walking the tree forward gives you a prediction. Walking it backward, applying inverse operations level by level, exactly like solving $3x + 7 = 19$, gives you the gradient that teaches the model. Pre-algebra is not a warm-up. It is the literal substrate."

3. "If you can evaluate $3 + 4 \cdot 2^2$ and solve $3x + 7 = 19$, you can read the math of a transformer. The first is the forward pass. The second is the backward pass. The only thing that changes is scale, and scale is the easy part."

---

## 9. SOURCES (LICENSING-AWARE)

1. **OpenStax, *Prealgebra 2e***. Lynn Marecek, MaryAnne Anthony-Smith, Andrea Honeycutt Mathis. https://openstax.org/books/prealgebra-2e, textbook, **CC BY 4.0** (verified on the Preface: "Prealgebra 2e is licensed under a Creative Commons Attribution 4.0 International (CC BY) license, which means that you can distribute, remix, and build upon the content, as long as you provide attribution to OpenStax and its content contributors"). **[ADAPT]**, use for worked examples (E1–E5, E9), problem-bank cross-checks, and exposition you can lift with attribution. The canonical OER text for this module's content. ⚠ Note: OpenStax *Algebra 1* is CC BY-NC-SA (different license); do not confuse the two.

2. **Steven Petryk, *Mafs***, https://github.com/stevenpetryk/mafs, interactive widget library, **MIT license** (verified in `package.json` v0.21.0: `"name": "mafs", "version": "0.21.0", "license": "MIT", "author": "Steven Petryk"`). **[ADAPT]**, direct dependency for the M1 widget implementations W1–W7. A relevant port `vue-mafs` (https://github.com/mujahidfa/vue-mafs) is also MIT; relevant because Tinker's stack is Svelte, and the Vue port is a reference implementation for the API surface.

3. **Andrej Karpathy, *The spelled-out intro to neural networks and backpropagation: building micrograd***, https://www.youtube.com/watch?v=VMj-3S1tku0 + companion repo https://github.com/karpathy/micrograd, video + code, **MIT license on micrograd code**; video itself is standard YouTube terms. **[REFERENCE-ONLY for video; ADAPT for code patterns]**, use micrograd's expression-graph rendering (`draw_dot`) as the architectural model for W4 and W7. Karpathy's verbatim framing in the video is the spine of the endgame callback: "neural networks are just mathematical Expressions … they take the input data as an input and they take the weights of a neural network as an input and it's a mathematical expression and the output are your predictions."

4. **3Blue1Brown, *Essence of linear algebra***. Grant Sanderson. https://www.3blue1brown.com/topics/linear-algebra, video + companion lessons, **standard YouTube/Patreon-funded terms, not openly licensed**. **[REFERENCE-ONLY]**, use chapter 1 ("Vectors, what even are they?") as the model for the m7 forward reference. Visual-rigor benchmark for our own animations; do not embed.

5. **Marc Peter Deisenroth, A. Aldo Faisal, Cheng Soon Ong, *Mathematics for Machine Learning***. Cambridge University Press, 2020. https://mml-book.github.io, textbook (free PDF, paid print). PDF terms state it is "free to view and download for personal use only. Not for re-distribution, re-sale, or use in derivative works." **[REFERENCE-ONLY]**. Chapter 2's framing of linear-algebra prerequisites is the target M1 needs to flow into; use it to calibrate the m7 forward reference.

6. **Wolfram Demonstrations Project, *Order of Operations Tree***, https://demonstrations.wolfram.com/OrderOfOperationsTree/, interactive demonstration, **CC BY-NC-SA 3.0 Unported** (verbatim from wolfram.com/demonstrations-project.html: "All content on this Site is licensed under the Creative Commons Attribution, NonCommercial, ShareAlike 3.0 Unported License. By accessing this Site or using it in any way, you accept and agree to be bound by the terms of this license"). **[REFERENCE-ONLY]**, design inspiration for W4 (`expressionTreeBuilder`). The Demonstration's animation of post-order evaluation is the visual idea to imitate, not embed.

7. **Desmos Classroom, Hanger / Balance Scale activities**. Erika Swinemer and Amplify Classroom (formerly Desmos). https://teacher.desmos.com/activitybuilder/custom/5ebd8d4ffe18b9720b1f949e and /5f3dff26648ad60cf51bac6e, interactive lessons, **Desmos Classroom proprietary terms, free to use in classrooms, not openly licensed for redistribution**. **[REFERENCE-ONLY]**, interaction-design reference for W5 (`balanceSolver`).

8. **PhET Interactive Simulations**. University of Colorado Boulder. https://phet.colorado.edu, interactive simulations, sims themselves **CC BY 4.0**, but the PhET-iO Partnerships page (https://phet-io.colorado.edu/partnerships/) imposes a separate commercial-use fee structure: "For a $10,000 first-year set-up fee ($5,000 renewal fee), the agreement includes: Use of our CC-BY HTML5 (and legacy Java/Flash) PhET sims found at phet.colorado.edu · Use of the PhET name and logo for marketing purposes." PhET's general help center also defines commercial use as "any use that provides commercial advantage or monetary compensation." **[REFERENCE-ONLY by default; ADAPT only after PhET commercial agreement]**, number-line operations sim is the closest prior art for W1/W2. Treat as inspiration; do not embed without legal review.

9. **Bret Victor, *Kill Math* and *Scrubbing Calculator***, http://worrydream.com/KillMath/ and http://worrydream.com/ScrubbingCalculator/, essays + prototypes, **no explicit license; all rights reserved by default**. **[REFERENCE-ONLY]**, philosophical north star for the "grab the named object, not a slider" widget tests. Do not embed or copy assets.

10. **Khan Academy**, https://www.khanacademy.org/math/pre-algebra, videos and exercises, **CC BY-NC-SA 4.0** (Khan Academy ToS: "any reference to the 'Creative Commons', 'CC' or similarly-phrased license shall be deemed to be a reference to the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 License"), and explicitly **prohibited** from inclusion in a paid offering by Khan Academy's own Help Center: "The use of our content by an organization that is incorporating it into a paid offering is NOT 'non-commercial.'" **[REFERENCE-ONLY]**, pedagogical sequencing reference only; do not embed videos or copy exercise content. Link out only for optional self-study.

---

## 10. PEDAGOGICAL TRAPS

### T1. Treating M1 as remedial instead of as reactivation.
**Why it happens.** "Pre-algebra" reads as grade-school content; instructional designers default to grade-school motivation (apples, pizza slices). Adult engineers feel patronized and disengage by lesson 1.3. **Mitigation.** Open every lesson with a programmer-trusted framing in the *first sentence*: "You already use this in code; here is the math name for it." Replace pizza-and-apple word problems with proportions over recipe scaling and HTTP request rates, percentage over interest rates, fractions over JavaScript's `0.1 + 0.2` problem. Cite C/Python operator precedence next to PEMDAS.

### T2. Conflating the unary minus and the binary subtraction operator.
**Why it happens.** Standard notation reuses the glyph, exactly as `-` is overloaded in most programming languages. Learners then memorize disconnected rules ("two negatives make a positive") that don't generalize. **Mitigation.** Introduce unary `negate` and binary `subtract` as separate AST nodes in W1/W4. Make `(-3)` show its parse tree on hover. Show the same JavaScript-style overloading explicitly: `-3 + 5` parses with a `negate` node above the `3`.

### T3. Teaching the fraction-as-two-numbers picture, then having to "unteach" it later.
**Why it happens.** Pie charts and grade-school fraction bars implicitly cast the fraction as a partition. The learner is then surprised when fractions appear on a number line. **Mitigation.** Lead with the number-line picture (W3) and only introduce the partition picture as a *second* representation. Show every fraction as a single dot first, then optionally as a shaded region.

### T4. Letting the equals sign do double duty without flagging it.
**Why it happens.** Math conflates assertion, definition, and constraint into one glyph; calculator culture adds "compute" as a fourth meaning. Engineers know `=` vs. `==` from code; nobody tells them the math `=` covers both. **Mitigation.** Explicitly call out the three uses in Lesson 1.5, using the `:=` (define), `=` (assert/constrain), and `≟` (testing equality) notations where useful. Frame solving as "find $x$ such that the assertion is true."

### T5. Teaching solving as "move it to the other side, flip the sign" without naming the underlying principle.
**Why it happens.** It's faster to teach the shorthand, and the shorthand works for most problems. But the underlying idea ("apply the same function to both sides") is what generalizes to logs in m2, derivatives in m5-calculus, and gradient updates in m16. **Mitigation.** In Lesson 1.5, *never* use the "move it" language. Always say "subtract 7 from both sides" or "apply the inverse of the outer operation to both sides." W5 enforces this by construction, the only legal moves are symmetric.

### T6. Skipping verification because the answer "feels right."
**Why it happens.** Adult learners have ego invested in getting the right answer quickly and skip the cheap last step. **Mitigation.** Make verification a non-skippable StepCheck on every solve-the-equation problem (problems 16, 19, 20). W7's verification panel runs automatically; the learner can't move on until the residual is 0. Frame as: "in code, this is the unit test. You ran the function; now assert the output."
