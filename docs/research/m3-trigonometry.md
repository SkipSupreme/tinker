# Module 3 Research Brief: Trigonometry
*Arc 1, Prerequisite Math. Tinker: Machine Learning, Backpropagation, and AI. The Math.*

> Deep-research output, saved 2026-05-21. Light de-garbling of paste artifacts only
> (fused words / dropped letters / dependency-graph items 5–6 and 16 reconstructed
> from surrounding context); no substantive edits to the research. The 5 MDX
> lessons from §6 and the problem bank from §7 are converted under
> `apps/docs/src/content/lessons/`; widgets 1–7 from §4 built under
> `apps/docs/src/components/demos/`.

---

## 1. Concept dependency graph

1. **angle-as-rotation** — An angle is the amount of counterclockwise turn taken by a ray pivoting about its starting point. *Prereqs:* m1-pre-algebra (numbers, signs), m2-algebra (Cartesian plane).
2. **degree-measure** — A unit that calls one full turn 360 and a quarter turn 90, chosen for historical reasons. *Prereqs:* angle-as-rotation.
3. **pythagorean-theorem** — For a right triangle with legs a, b and hypotenuse c, a^2 + b^2 = c^2. *Prereqs:* m2-algebra (squares, square roots).
4. **unit-circle** — The set of points (x, y) satisfying x^2 + y^2 = 1; the circle of radius 1 centered at the origin. *Prereqs:* pythagorean-theorem, m2-algebra (two-variable equation as a set of points).
5. **arc-length-on-unit-circle** — The distance traveled along the unit circle when sweeping out an angle. *Prereqs:* unit-circle, angle-as-rotation.
6. **radian-measure** — The radian measure of an angle equals the arc length it sweeps on the unit circle, so one full turn is 2*pi radians. *Prereqs:* arc-length-on-unit-circle.
7. **degree-radian-conversion** — 180 degrees = pi radians, so to convert multiply by pi/180 or 180/pi. *Prereqs:* radian-measure, degree-measure.
8. **reference-angles** — The angles 0, pi/6, pi/4, pi/3, pi/2 and their multiples, whose sines and cosines are exact. *Prereqs:* radian-measure, unit-circle.
9. **cos-sin-as-coordinates** — cos(theta) and sin(theta) are defined as the x and y coordinates of the point reached by rotating (1, 0) counterclockwise by theta. *Prereqs:* unit-circle, angle-as-rotation, radian-measure.
10. **right-triangle-ratios** — In a right triangle, sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent (SOH-CAH-TOA). *Prereqs:* pythagorean-theorem, m2-algebra (ratios).
11. **circle-triangle-reconciliation** — The two definitions agree because the unit-circle point (cos theta, sin theta) is the top vertex of a right triangle with hypotenuse 1. *Prereqs:* cos-sin-as-coordinates, right-triangle-ratios.
12. **pythagorean-identity** — sin^2(theta) + cos^2(theta) = 1, the Pythagorean theorem applied to the unit-circle point. *Prereqs:* cos-sin-as-coordinates, pythagorean-theorem.
13. **tangent-as-slope** — tan(theta) = sin(theta)/cos(theta), also the slope of the radius drawn to (cos theta, sin theta). *Prereqs:* cos-sin-as-coordinates, m2-algebra (slope as rise over run).
14. **sin-cos-as-functions-of-real-numbers** — Sine and cosine are functions whose input is any real number and whose output is a coordinate. *Prereqs:* cos-sin-as-coordinates, m2-algebra (functions, domain, range).
15. **graphs-period-amplitude** — The graph of sin and cos is a wave; period 2*pi, amplitude 1, with A*sin(theta) scaling the amplitude. *Prereqs:* sin-cos-as-functions-of-real-numbers.
16. **phase-relationship** — cos(theta) = sin(theta + pi/2); cosine is sine shifted left by a quarter turn. *Prereqs:* graphs-period-amplitude.
17. **frequency-scaling** — sin(k*theta) has period 2*pi/k; multiplying the input by k compresses the wave by a factor of k. *Prereqs:* graphs-period-amplitude, m2-algebra (function composition).
18. **angle-addition-formulas** — sin(alpha + beta) = sin(alpha)cos(beta) + cos(alpha)sin(beta), cos(alpha + beta) = cos(alpha)cos(beta) - sin(alpha)sin(beta), and the minus-sign versions. *Prereqs:* cos-sin-as-coordinates.
19. **rotation-of-a-point** — Rotating (x, y) counterclockwise by angle theta sends it to (x cos theta - y sin theta, x sin theta + y cos theta), derived from the angle addition formulas applied to a point in polar form. *Prereqs:* angle-addition-formulas, cos-sin-as-coordinates. Forward pointer to m7-linear-algebra and m15-attention.
20. **polar-coordinates** — A point can be addressed by (r, theta) where x = r cos theta and y = r sin theta. *Prereqs:* cos-sin-as-coordinates.
21. **inverse-trig** — arcsin, arccos, arctan invert sin, cos, tan after the domain is restricted to where the function is one-to-one (arcsin and arctan use [-pi/2, pi/2], arccos uses [0, pi]). *Prereqs:* sin-cos-as-functions-of-real-numbers, m2-algebra (inverse functions, domain restriction).
22. **multi-frequency-position-vector** — A position p can be tagged with a vector sin(p/w_1), cos(p/w_1), sin(p/w_2), cos(p/w_2), ... at many frequencies w_i, giving every position a unique fingerprint. *Prereqs:* frequency-scaling, sin-cos-as-functions-of-real-numbers. Forward pointer to m15-attention and m16-transformer-block.

---

## 2. Canonical worked examples

### Example 1. Convert and place a reference angle.
**Problem:** Convert $135^\circ$ to radians and give the coordinates $(\cos\theta,\sin\theta)$ of the point on the unit circle.
**Solution:** Multiply by $\pi/180$: $135 \cdot \pi/180 = 3\pi/4$. The point is in the second quadrant; reflect the first-quadrant point at $\pi/4$, which is $(\sqrt2/2, \sqrt2/2)$, across the y-axis to get $(-\sqrt2/2, \sqrt2/2)$.
**Pedagogical point:** Forces the learner to use radians and the unit-circle definition together, not the calculator.
**Most common mistake:** Sign error from forgetting that x is negative in the second quadrant.

### Example 2. Pythagorean identity from coordinates.
**Problem:** Given $\sin\theta = 3/5$ and $\theta$ is in the first quadrant, find $\cos\theta$ and $\tan\theta$ without a calculator.
**Solution:** $\cos^2\theta = 1 - (3/5)^2 = 1 - 9/25 = 16/25$, so $\cos\theta = 4/5$ (positive in Q1). $\tan\theta = (3/5)/(4/5) = 3/4$.
**Pedagogical point:** The identity is a labor-saver, not a memory test. You traded one coordinate for the other using Pythagoras.
**Most common mistake:** Taking the negative square root by reflex, ignoring the quadrant information.

### Example 3. The triangle picture matches the circle picture.
**Problem:** A right triangle has hypotenuse 1 and angle $\theta$ at the origin. Show that the leg opposite $\theta$ has length $\sin\theta$ and the leg adjacent has length $\cos\theta$.
**Solution:** Place the angle at the origin with the adjacent leg along the positive x-axis. The far vertex is at $(\cos\theta, \sin\theta)$ by the unit-circle definition. The vertical drop from that vertex to the x-axis has length $\sin\theta$ (the opposite leg). The horizontal segment from the origin to the foot of that drop has length $\cos\theta$ (the adjacent leg). SOH and CAH then read off as $\sin\theta/1$ and $\cos\theta/1$.
**Pedagogical point:** The triangle is the circle with a perpendicular dropped to the axis. There is one definition, not two.
**Most common mistake:** Treating the two definitions as separate rules to memorize.

### Example 4. Derive the rotation formula from angle addition.
**Problem:** A point $P = (x, y)$ sits at distance $r$ from the origin at angle $\alpha$, so $x = r\cos\alpha$ and $y = r\sin\alpha$. Rotate $P$ by $\theta$ counterclockwise. Find the new coordinates.
**Solution:** After rotation, the point is still at distance $r$ from the origin but at angle $\alpha + \theta$, so its new coordinates are $(r\cos(\alpha+\theta), r\sin(\alpha+\theta))$. Expand with the angle addition formulas:
$r\cos(\alpha+\theta) = r\cos\alpha\cos\theta - r\sin\alpha\sin\theta = x\cos\theta - y\sin\theta$
$r\sin(\alpha+\theta) = r\sin\alpha\cos\theta + r\cos\alpha\sin\theta = y\cos\theta + x\sin\theta$
So $(x,y)\mapsto (x\cos\theta - y\sin\theta,\, x\sin\theta + y\cos\theta)$.
**Pedagogical point:** This is the load-bearing derivation of the module. The rotation rule is not magic; it is exactly what the angle addition formulas say when you read them as a coordinate map. (m7-linear-algebra will later repackage this map as a 2x2 matrix; m15-attention will rename it RoPE, the positional scheme used in LLaMA 2/3, Mistral, Gemma, Code-LLaMA, and PaLM.)
**Most common mistake:** Swapping the sign of $\sin\theta$, producing a clockwise rotation instead.

### Example 5. Period from frequency.
**Problem:** What is the period of $\sin(3\theta)$? What is the period of $\sin(2\pi f \theta)$?
**Solution:** $\sin(3\theta)$ completes one cycle when $3\theta$ traverses $2\pi$, so $\theta$ traverses $2\pi/3$. Period $= 2\pi/3$. For $\sin(2\pi f\theta)$, the period is $2\pi/(2\pi f) = 1/f$, which is the engineering definition of frequency.
**Pedagogical point:** "Multiply the input by $k$" means "speed up by $k$" means "period shrinks by $k$." This is the lever m16-transformer-block will pull to make different embedding dimensions tick at different rates.
**Most common mistake:** Multiplying the period by 3 instead of dividing.

### Example 6. cos as shifted sin.
**Problem:** Verify $\cos\theta = \sin(\theta + \pi/2)$ using the unit-circle definition and one angle addition formula.
**Solution:** $\sin(\theta + \pi/2) = \sin\theta\cos(\pi/2) + \cos\theta\sin(\pi/2) = \sin\theta\cdot 0 + \cos\theta\cdot 1 = \cos\theta$. On the circle, rotating by an extra quarter-turn before reading the y-coordinate is the same as reading the x-coordinate of the original point.
**Pedagogical point:** Sine and cosine are the same wave, ninety degrees apart in phase. There is only one wave shape in this module.
**Most common mistake:** Writing $\cos\theta = \sin(\theta - \pi/2)$ (correct phase magnitude, wrong sign of shift).

### Example 7. Rotate a concrete point.
**Problem:** Rotate the point $(2, 1)$ counterclockwise by $\pi/2$ using the coordinate rule.
**Solution:** $\cos(\pi/2) = 0$ and $\sin(\pi/2) = 1$, so $(2,1) \mapsto (2\cdot 0 - 1\cdot 1,\; 2\cdot 1 + 1\cdot 0) = (-1, 2)$. Check: yes, a quarter-turn counterclockwise of "two right, one up" is "one left, two up."
**Pedagogical point:** The formula is a function on pairs of numbers. Plug in. Get a pair out. No matrices required.
**Most common mistake:** Computing $(1, -2)$ by rotating the wrong way (a common sign confusion).

### Example 8. Inverse trig with a story.
**Problem:** A 20-foot ladder leans against a wall; its foot is 5 feet out. What angle does the ladder make with the ground?
**Solution:** $\cos\theta = 5/20 = 1/4$, so $\theta = \arccos(1/4) \approx 1.318$ radians, about $75.5^\circ$. We use arccos rather than "the angle whose cosine is 1/4" because the ladder angle is between $0$ and $\pi/2$, exactly the principal branch of arccos.
**Pedagogical point:** arccos is a function only after a domain restriction; the physical context picks the principal branch for us.
**Most common mistake:** Using $\arcsin$ on the same number, which would give $\arcsin(1/4) \approx 0.252$ rad, the complementary angle.

### Example 9. Polar to Cartesian and back.
**Problem:** Convert $(r, \theta) = (2, \pi/3)$ to Cartesian. Then convert $(x, y) = (-1, 1)$ back to polar.
**Solution:** Forward: $x = 2\cos(\pi/3) = 2(1/2) = 1$, $y = 2\sin(\pi/3) = 2(\sqrt3/2) = \sqrt3$, so $(1, \sqrt3)$. Backward: $r = \sqrt{(-1)^2 + 1^2} = \sqrt2$; the point is in Q2, so $\theta = \pi - \arctan(1/1) = \pi - \pi/4 = 3\pi/4$.
**Pedagogical point:** Polar is just the unit-circle definition scaled by $r$. The inverse direction needs quadrant care because arctan alone returns only values in $(-\pi/2, \pi/2)$.
**Most common mistake:** Reporting $\theta = -\pi/4$ for $(-1, 1)$ because a calculator's atan blindly returns $\arctan(-1) = -\pi/4$.

### Example 10. Reading a multi-frequency position fingerprint.
**Problem:** For positions $p = 0, 1, 2, 3$, compute the 4-component vector $[\sin(p), \cos(p), \sin(p/10), \cos(p/10)]$. What do you notice about how fast each component changes?
**Solution:** At $p=0$: $[0, 1, 0, 1]$. At $p=1$: $[0.841, 0.540, 0.0998, 0.995]$. At $p=2$: $[0.909, -0.416, 0.199, 0.980]$. At $p=3$: $[0.141, -0.990, 0.296, 0.955]$. The first two components swing wildly; the last two crawl. Together the four numbers are a unique fingerprint of $p$.
**Pedagogical point:** This is the bridge to sinusoidal positional encoding. Different frequencies on the same input separate "near" from "far" and give every integer position a unique vector.
**Most common mistake:** Computing $\sin(p/10)$ in degrees instead of radians; the numerical answer becomes nearly zero everywhere and the "crawl" is invisible.

---

## 3. Common misconceptions

1. **"Radians have units, like meters or degrees."** Natural because every other measurement in life has a unit. The killer: define a radian as arc length divided by radius, both measured in (say) inches; inches cancel. A radian is just a real number. The unit-circle widget makes this concrete; the arc literally has length theta when r = 1.

2. **"Pi is the symbol for radians, the way the little circle is the symbol for degrees."** Natural because school problems write radian answers as fractions of pi. The fix: assign $\sin(1)$ and $\sin(1.5)$ as legitimate inputs and have learners compute them; show that radian inputs are just real numbers and pi shows up only in convenient reference angles.

3. **"Sine is opposite over hypotenuse, period. The circle stuff is a different topic."** Natural because high school teaches SOH-CAH-TOA first and the unit circle months later. The fix: in lesson 3.2, draw the right triangle inside the unit circle so the learner sees the hypotenuse is the radius and the legs ARE the coordinates. There is one definition.

4. **"$\sin^{-1}(x)$ means $1/\sin(x)$."** Natural by analogy with $x^{-1} = 1/x$. The fix: introduce arcsin notation first ("the angle whose sine is") and only later mention that $\sin^{-1}$ is the same thing. The reciprocal is called cosecant.

5. **"$\sin^2(\theta) + \cos^2(\theta) = 1$ is an algebra trick to memorize."** Natural because it looks like an identity rolled out of nowhere. The fix: derive it in one line by writing $x^2 + y^2 = 1$ for the unit-circle point and substituting $x = \cos\theta$, $y = \sin\theta$. It is Pythagoras with new names for the legs.

6. **"$\sin(\alpha + \beta) = \sin\alpha + \sin\beta$."** Natural because addition is "supposed" to distribute. The killer counterexample: $\sin(\pi/2 + \pi/2) = \sin\pi = 0$ but $\sin(\pi/2) + \sin(\pi/2) = 2$. Once shown, the learner knows trig functions are not linear.

7. **"arctan returns 'the' angle."** Natural for anyone who has only used a calculator. The fix: show that $\tan\theta = 1$ has infinitely many solutions ($\pi/4, 5\pi/4, \ldots$); arctan returns only the one in $(-\pi/2, \pi/2)$. This is exactly the inverse-function/domain-restriction point from m2-algebra, now in concrete form. atan2 in code exists precisely to fix this.

8. **"Rotating $(x, y)$ by $90^\circ$ gives $(y, x)$."** Natural because you remember that sin and cos swap somewhere. The fix: plug into the rotation formula with $\theta = \pi/2$: $(x, y) \mapsto (x\cdot 0 - y\cdot 1, x\cdot 1 + y\cdot 0) = (-y, x)$. The minus sign matters; that is the difference between counterclockwise and clockwise.

9. **"Period and frequency are the same thing."** Natural because both describe "how often." The fix: in the waveLab widget, scrub the $k$ in $\sin(k\theta)$ and display BOTH period $2\pi/k$ AND frequency $k/(2\pi)$ live; they move in opposite directions. Frequency is "cycles per unit input"; period is "input per cycle."

10. **"Polar coordinates are unique."** Natural because Cartesian are. The fix: have the learner enter $(1, \pi/4)$ and $(1, \pi/4 + 2\pi)$ and see both produce the same point; also show $(-1, 5\pi/4)$ does too. The wraparound of theta is exactly the wraparound that makes positional encoding tricky for very long sequences (forward pointer).

11. **"Cosine is just sine with the letters swapped on a triangle."** Natural from SOH-CAH-TOA. The fix: show the graphs overlaid; they are the SAME wave, with cosine starting at its peak. The phase relationship $\cos\theta = \sin(\theta + \pi/2)$ is doing visible work, not stating a coincidence.

12. **"You always go counterclockwise; clockwise is for negative angles."** Roughly correct but hides that the choice is a convention, not a law. The fix: state explicitly that the course uses counterclockwise-from-positive-x as the standard convention and that nothing would break if we flipped it; just every formula would change sign. This matters later in linear algebra (matrix determinants) and graphics (where y often points down).

---

## 4. Interactive widget suggestions

### widget 1: unitCircleScrubber
- **User manipulates:** Drags the point on the unit circle directly (not a slider). Optionally types an angle in either degrees or radians into a single input that auto-converts.
- **Live updates:** The (x, y) coordinates of the point displayed as numbers; the radian angle as a fraction of pi and as a decimal; the swept arc shown as a thickened arc whose numeric length equals theta; sin(theta) shown as a vertical drop in one color, cos(theta) as a horizontal segment in another, both labeled with their values.
- **Pedagogical moment:** The learner sees, by dragging, that sin and cos ARE the y and x coordinates. There is nothing else to memorize.
- **Beats a slider because:** The learner grabs the geometric object itself (the point on the circle), and the arc length that grows in their hand is the radian measure, not a label on a tick.
- **Prior art:** PhET Trig Tour (https://phet.colorado.edu/en/simulations/trig-tour, CC BY 4.0); Desmos Interactive Unit Circle; learnmathclass.com unit circle visualizer.

### widget 2: triangleCircleMorph
- **User manipulates:** Two handles. One is the angle at the origin (drag the hypotenuse). The other is the hypotenuse length (drag the far vertex outward along the ray).
- **Live updates:** The right triangle inside the unit circle, with the opposite leg labeled $\sin\theta$ (when hypotenuse = 1) or $r\sin\theta$ (when not); the adjacent leg labeled $\cos\theta$ or $r\cos\theta$; the ratios opposite/hypotenuse and adjacent/hypotenuse displayed as numbers, both equal to $\sin\theta$ and $\cos\theta$ no matter what the hypotenuse length is.
- **Pedagogical moment:** As the learner stretches the hypotenuse from 1 to 3 to 0.4, the ratios stay fixed even as the leg lengths change. The triangle-ratio definition and the unit-circle definition are the same definition.
- **Beats a slider because:** The learner grabs both the angle and the scale, so they personally verify that the ratio is angle-only.
- **Prior art:** BetterExplained's dome/wall/ceiling diagrams; Math is Fun unit circle widget.

### widget 3: waveLab
- **User manipulates:** Drags three handles overlaid on the curve $y = A \sin(k\theta + \phi)$: a vertical handle that sets A by stretching the peaks, a horizontal handle on a peak that sets the period (and thus k), and a handle on the leftmost zero crossing that sets phi.
- **Live updates:** A on the y-axis tick, period $2\pi/k$ shown as a labeled bracket between consecutive peaks, frequency $k/(2\pi)$ in a readout, phase shift $-\phi/k$ in radians shown as a horizontal arrow at the baseline. A second overlaid cosine curve appears with the toggle "show cos(theta)" so the learner can see the $\pi/2$ phase offset.
- **Pedagogical moment:** Each of A, k, phi has a distinct geometric grip. The learner cannot confuse amplitude with frequency because they live on different handles.
- **Beats a slider because:** Three sliders labeled A, k, phi are exactly the trap. Grabbing a peak to set its height (A) and grabbing a zero crossing to set its position (phi) gives the learner a kinaesthetic anchor for each parameter.
- **Prior art:** Desmos sine wave grapher; the activestem.org sine and cosine wave grapher.

### widget 4: rotatePoint
- **User manipulates:** Two objects. (a) Drag a point $P = (x, y)$ anywhere on the plane. (b) Drag an angle dial labeled "rotate by theta."
- **Live updates:** The new point $P' = (x\cos\theta - y\sin\theta,\, x\sin\theta + y\cos\theta)$ shown as a second dot, connected to $P$ by a circular arc of radius $|OP|$. A formula readout below substitutes the current $x, y, \cos\theta, \sin\theta$ into the rotation expression and computes both new coordinates step by step. A toggle reveals "what RoPE will do later": the same widget, but with a 2D pair $(q_1, q_2)$ instead of $(x, y)$ and the angle labeled "m * theta_i" where m is a position index. RoPE is the positional scheme inside LLaMA 2/3, Mistral, Gemma, Code-LLaMA, and PaLM.
- **Pedagogical moment:** The rotation formula is a function on pairs. The learner watches a point rotate while watching the algebra produce the same answer. The RoPE toggle plants the m15 callback by name.
- **Beats a slider because:** The learner grabs the point itself in space and grabs the angle on a dial. Both are physical objects in the diagram, not abstract numbers.
- **Prior art:** GeoGebra rotation applets; nothing widely used couples the live formula readout to the geometric rotation.

### widget 5: angleAdditionProof
- **User manipulates:** Two angle dials, alpha and beta. Optionally a third dial that shows the combined angle alpha + beta.
- **Live updates:** Three points on the unit circle: $P_\alpha = (\cos\alpha, \sin\alpha)$, $P_\beta = (\cos\beta, \sin\beta)$, and $P_{\alpha+\beta} = (\cos(\alpha+\beta), \sin(\alpha+\beta))$. The expression $\cos\alpha\cos\beta - \sin\alpha\sin\beta$ is computed live from the four numeric coordinates of $P_\alpha$ and $P_\beta$, and a checkmark lights up confirming that this equals the x-coordinate of $P_{\alpha+\beta}$. Same for the sine sum.
- **Pedagogical moment:** The angle addition formulas are not abstract identities. They are arithmetic checks the learner can perform on numbers they read off a picture.
- **Beats a slider because:** The verification step is the lesson. The learner is doing a proof scaffold by dragging.
- **Prior art:** No widely used widget couples the algebraic check to the geometric construction; 3Blue1Brown's Lockdown Math Chapter 2 walks through this proof on video.

### widget 6: polarSketcher
- **User manipulates:** The learner picks a function $r(\theta)$ (default: $r = 1 + \cos\theta$, a cardioid) and scrubs a single theta dial from 0 to 2*pi. As theta increases the point's trail draws the polar curve in real time.
- **Live updates:** A simultaneous Cartesian view shows $r(\theta)$ plotted on standard axes (radius vs theta). Numbers: $r$, $\theta$, $x = r\cos\theta$, $y = r\sin\theta$.
- **Pedagogical moment:** The same function looks completely different in polar and Cartesian. The conversion formulas are not arbitrary; they trace out the same motion.
- **Beats a slider because:** The trail is an artifact of the learner's motion, not a precomputed picture. They can stop and back up at any theta.
- **Prior art:** Desmos polar grapher; Mafs cardioid example.

### widget 7: positionFingerprint
- **User manipulates:** Drags a position index $p$ along an integer track from 0 to 100. Toggles to add or remove frequency bands.
- **Live updates:** A vertical bar chart of the 8-component vector $[\sin(p), \cos(p), \sin(p/10), \cos(p/10), \sin(p/100), \cos(p/100), \sin(p/1000), \cos(p/1000)]$. Each bar's height is the value at the current $p$. Below, the SAME vector shown as a heatmap row, with rows for $p = 0, 1, 2, \ldots, 30$ stacked so the learner sees that high-frequency columns shimmer rapidly down the table and low-frequency columns barely change.
- **Pedagogical moment:** This IS the positional encoding from Vaswani et al.'s "Attention Is All You Need." The learner is reading the heatmap that they will see again in m16.
- **Beats a slider because:** Two coupled views (the live bar chart at a single p, and the stacked rows showing every p) make the multi-scale structure visible. A single readout cannot do this.
- **Prior art:** Amirhossein Kazemnejad's heatmap visualization and the Hugging Face "You could have designed state of the art positional encoding" blog are the canonical static versions; we make ours interactive.

---

## 5. Key formulas (LaTeX source)

### Angle measure and conversion
- `\theta_{\text{rad}} = \theta_{\text{deg}} \cdot \frac{\pi}{180}`
- `180^{\circ} = \pi \text{ rad}`
- `s = r\theta`  (arc length; theta in radians)

### Unit circle and definitions
- `\cos\theta = x, \quad \sin\theta = y \quad \text{where } (x,y) \text{ is on the unit circle at angle } \theta`
- `\sin\theta = \frac{\text{opposite}}{\text{hypotenuse}}, \quad \cos\theta = \frac{\text{adjacent}}{\text{hypotenuse}}, \quad \tan\theta = \frac{\text{opposite}}{\text{adjacent}}`
- `\tan\theta = \frac{\sin\theta}{\cos\theta}`

### Pythagoras and the identity
- `a^2 + b^2 = c^2`
- `\sin^2\theta + \cos^2\theta = 1`

### Reference angles (first quadrant)
- `\sin 0 = 0, \quad \sin\tfrac{\pi}{6} = \tfrac{1}{2}, \quad \sin\tfrac{\pi}{4} = \tfrac{\sqrt2}{2}, \quad \sin\tfrac{\pi}{3} = \tfrac{\sqrt3}{2}, \quad \sin\tfrac{\pi}{2} = 1`
- `\cos 0 = 1, \quad \cos\tfrac{\pi}{6} = \tfrac{\sqrt3}{2}, \quad \cos\tfrac{\pi}{4} = \tfrac{\sqrt2}{2}, \quad \cos\tfrac{\pi}{3} = \tfrac{1}{2}, \quad \cos\tfrac{\pi}{2} = 0`

### Graphs and periodicity
- `\sin(\theta + 2\pi) = \sin\theta, \quad \cos(\theta + 2\pi) = \cos\theta`
- `\cos\theta = \sin\!\left(\theta + \tfrac{\pi}{2}\right)`
- `\text{period of } \sin(k\theta) = \frac{2\pi}{k}`

### Angle addition
- `\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta`
- `\sin(\alpha - \beta) = \sin\alpha\cos\beta - \cos\alpha\sin\beta`
- `\cos(\alpha + \beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta`
- `\cos(\alpha - \beta) = \cos\alpha\cos\beta + \sin\alpha\sin\beta`

### Rotation of a point (coordinate form, not yet a matrix)
- `(x, y) \;\longmapsto\; (x\cos\theta - y\sin\theta,\; x\sin\theta + y\cos\theta)`

### Polar coordinates
- `x = r\cos\theta, \quad y = r\sin\theta, \quad r = \sqrt{x^2 + y^2}, \quad \theta = \operatorname{atan2}(y, x)`

### Inverse trig (principal branches)
- `\arcsin: [-1, 1] \to [-\tfrac{\pi}{2}, \tfrac{\pi}{2}]`
- `\arccos: [-1, 1] \to [0, \pi]`
- `\arctan: \mathbb{R} \to (-\tfrac{\pi}{2}, \tfrac{\pi}{2})`

### Forward pointer: sinusoidal position encoding (m16 preview)
- `\mathrm{PE}(p, 2i) = \sin\!\left(\frac{p}{10000^{2i/d}}\right), \quad \mathrm{PE}(p, 2i+1) = \cos\!\left(\frac{p}{10000^{2i/d}}\right)`

---

## 6. Lesson decomposition

### Lesson 3.1: Angles, the unit circle, and what radians actually are
**Summary:** An angle is a turn, the unit circle is its natural home, and radians are just the arc length your turn carves out on that circle.
**Steps (10):**
1. *Prose-with-widget:* An angle is a counterclockwise turn from a starting ray. Drag the ray. (widget: unitCircleScrubber)
2. *Prose-with-widget:* Degrees were chosen because 360 is convenient. There is nothing geometric about 360. (widget: unitCircleScrubber with toggle to degrees)
3. *Prose:* The Pythagorean theorem $a^2+b^2=c^2$, derived once by area-rearrangement (Bhaskara's proof, two squares).
4. *Prose-with-widget:* The unit circle is the set of points satisfying $x^2 + y^2 = 1$. (widget: unitCircleScrubber)
5. *Prose-with-widget:* When you turn through angle theta, you sweep out an arc. On the unit circle, that arc has a length. Define that length to be the radian measure of theta. (widget: unitCircleScrubber, arc length readout active)
6. **StepCheck:** "If you turn one full revolution, what is the arc length swept on the unit circle?" Expected: $2\pi$ (accept any numeric within 0.01 of 6.2832).
7. *Prose:* Therefore $360^\circ = 2\pi$ rad and $180^\circ = \pi$ rad.
8. **StepCheck:** "Convert 60 degrees to radians as a numeric decimal." Expected: $\pi/3 \approx 1.047$.
9. *Prose-with-widget:* The reference angles 0, pi/6, pi/4, pi/3, pi/2 and their coordinates. Memorize one quadrant; the others come by symmetry. (widget: unitCircleScrubber with snap-to-reference toggle)
10. **StepCheck:** "What is the radian measure of the angle that subtends an arc of length 3 on a circle of radius 1?" Expected: 3.

**Widgets:** unitCircleScrubber. **Estimated minutes:** 18-22.

### Lesson 3.2: Sine and cosine are coordinates (and they're also triangle ratios)
**Summary:** $\cos\theta$ and $\sin\theta$ are just the x and y of a point on the unit circle. Inside a right triangle, the same two numbers reappear as opposite-over-hypotenuse and adjacent-over-hypotenuse. One definition, two views.
**Steps (12):**
1. *Prose-with-widget:* Definition: $(\cos\theta, \sin\theta)$ is the point reached by rotating $(1,0)$ counterclockwise by theta. (widget: unitCircleScrubber)
2. *Prose:* Sign chart by quadrant. Read it off the picture, do not memorize.
3. **StepCheck:** "Drag the point on the unit circle to angle $\theta = 3\pi/4$. What is $\cos\theta$ as a decimal?" Expected: $-\sqrt2/2 \approx -0.707$.
4. *Prose-with-widget:* Now draw a right triangle from the unit-circle point: drop a vertical from $(\cos\theta, \sin\theta)$ to the x-axis. The legs are $\sin\theta$ (vertical) and $\cos\theta$ (horizontal). The hypotenuse is the radius, length 1. (widget: triangleCircleMorph)
5. *Prose-with-widget:* Scale the hypotenuse to length $r$. The legs become $r\sin\theta$ and $r\cos\theta$. The ratios opposite/hypotenuse and adjacent/hypotenuse are still $\sin\theta$ and $\cos\theta$. (widget: triangleCircleMorph with hypotenuse handle)
6. *Prose:* SOH-CAH-TOA recap, framed as a consequence, not a starting point.
7. **StepCheck:** "A right triangle has hypotenuse 10 and angle 30 degrees at one vertex. How long is the opposite leg?" Expected: 5.
8. *Prose:* Define $\tan\theta = \sin\theta/\cos\theta$. It is also the slope of the radius drawn to $(\cos\theta, \sin\theta)$ from the origin.
9. **StepCheck:** "What is $\tan(\pi/4)$?" Expected: 1.
10. *Prose-with-widget:* The Pythagorean identity. Plug $x = \cos\theta, y = \sin\theta$ into $x^2 + y^2 = 1$. One line. Done. (widget: unitCircleScrubber, with sin^2 + cos^2 = 1 live readout)
11. **StepCheck:** "If $\cos\theta = 0.6$ and $\theta$ is in the first quadrant, what is $\sin\theta$?" Expected: 0.8.
12. *Prose:* Reconciliation summary. From now on, when this course says sin or cos, it means the unit-circle coordinate. The triangle picture is a special case at hypotenuse 1.

**Widgets:** unitCircleScrubber, triangleCircleMorph. **Estimated minutes:** 20-25.

### Lesson 3.3: Sin and cos as functions, and the wave they make
**Summary:** Forget the angle picture for a moment. Treat sin and cos as functions of a real number. Their graphs are the same wave, ninety degrees apart, and you can squish, stretch, and shift them.
**Steps (11):**
1. *Prose-with-widget:* The graph of $y = \sin\theta$. Trace the point's height as it walks around the unit circle. (widget: unitCircleScrubber linked to a sine plot)
2. *Prose-with-widget:* The graph of $y = \cos\theta$. Same point, x-coordinate this time.
3. *Prose:* Both have period $2\pi$, amplitude 1, and they are the same curve, shifted.
4. **StepCheck:** "$\cos\theta = \sin(\theta + ?)$ for what value of ?" Expected: $\pi/2$.
5. *Prose-with-widget:* The general form $y = A\sin(k\theta + \phi)$. (widget: waveLab)
6. *Prose:* Amplitude A scales vertically. Frequency parameter k scales horizontally; period becomes $2\pi/k$.
7. **StepCheck:** "What is the period of $\sin(4\theta)$?" Expected: $\pi/2$ (accept 1.5708).
8. *Prose-with-widget:* Frequency in the engineering sense: cycles per unit input. For $\sin(2\pi f\theta)$, $f$ is the frequency. (widget: waveLab)
9. **StepCheck:** "A function $\sin(k\theta)$ has period $2\pi/10$. What is $k$?" Expected: 10.
10. *Prose-with-widget:* Phase shift moves the wave left or right. The point of phi is to delay the wave. (widget: waveLab)
11. *Prose:* Forward pointer 1. Inside a transformer, every embedding dimension is one of these waves, with its own frequency $k_i$. The "fingerprint" of a position is just sampling all these waves at the same input.

**Widgets:** unitCircleScrubber, waveLab. **Estimated minutes:** 18-22.

### Lesson 3.4: Adding angles, and what rotation actually is
**Summary:** The angle addition formulas are not party tricks. They are exactly the algebra of composing two rotations, and from them falls the formula for rotating a point in the plane. That formula is the one the transformer's RoPE will use later.
**Steps (13):**
1. *Prose:* If you turn alpha and then turn beta more, you have turned alpha + beta. Picture two consecutive rotations of the unit-circle point.
2. *Prose-with-widget:* The angle addition formula for sine, stated. (widget: angleAdditionProof)
3. *Prose:* The same for cosine. Note the minus sign on the second term.
4. **StepCheck:** "Compute $\sin(75^\circ)$ exactly using $75 = 45 + 30$." Expected: $(\sqrt6 + \sqrt2)/4 \approx 0.966$ (accept 0.966 within 0.01).
5. *Prose-with-widget:* Verify with the widget by reading off the coordinates of $P_{75^\circ}$ and matching the expansion. (widget: angleAdditionProof)
6. *Prose:* The double-angle formulas as a free corollary. ($\sin 2\theta = 2\sin\theta\cos\theta$, $\cos 2\theta = \cos^2\theta - \sin^2\theta$.)
7. *Prose:* Now the load-bearing step. A point at distance $r$ and angle $\alpha$ has coordinates $(r\cos\alpha, r\sin\alpha)$. Rotate it by theta. Its new angle is $\alpha + \theta$. Plug into angle addition.
8. *Prose:* Out falls $(x, y) \mapsto (x\cos\theta - y\sin\theta,\, x\sin\theta + y\cos\theta)$. Derived, not declared.
9. *Prose-with-widget:* Verify by dragging. (widget: rotatePoint)
10. **StepCheck:** "Rotate $(3, 0)$ by $\pi/2$ counterclockwise. What is the new x-coordinate?" Expected: 0.
11. **StepCheck:** "Rotate $(3, 0)$ by $\pi/2$ counterclockwise. What is the new y-coordinate?" Expected: 3.
12. *Prose:* Aside flagged for instructors and curious learners: this is the same map that m7-linear-algebra will rename "multiplication by the rotation matrix." Nothing here will need to be unlearned.
13. *Prose:* Forward pointer 2. m15-attention applies this exact rotation to pairs of coordinates inside the query and key vectors. The angle is proportional to the token's position. That mechanism is called rotary positional embedding (RoPE), the positional scheme inside LLaMA 2/3, Mistral, Gemma, Code-LLaMA, and PaLM, and you have just derived it.

**Widgets:** angleAdditionProof, rotatePoint. **Estimated minutes:** 24-28.

### Lesson 3.5: Polar coordinates, inverse trig, and the multi-frequency fingerprint
**Summary:** Polar coordinates are the unit circle scaled. Inverse trig works only after you restrict the domain. And the punchline of the module: a position can be tagged with sines and cosines at many frequencies, so that every position gets a unique, smooth fingerprint. That is the transformer's positional encoding.
**Steps (13):**
1. *Prose-with-widget:* Polar coordinates $(r, \theta)$. (widget: polarSketcher)
2. *Prose:* Conversion: $x = r\cos\theta$, $y = r\sin\theta$. And back: $r = \sqrt{x^2 + y^2}$, $\theta = \mathrm{atan2}(y, x)$.
3. **StepCheck:** "Convert $(r, \theta) = (5, \pi/6)$ to Cartesian. Give x." Expected: $5\sqrt3/2 \approx 4.330$.
4. *Prose:* Inverse trig. sin is not one-to-one, so we restrict its domain to $[-\pi/2, \pi/2]$ and call the inverse arcsin. Same idea you saw in m2-algebra with $f(x) = x^2$ and the positive square root.
5. *Prose-with-widget:* arccos uses $[0, \pi]$; arctan uses $(-\pi/2, \pi/2)$. (widget: unitCircleScrubber with branch highlight)
6. **StepCheck:** "$\arcsin(1/2) = ?$ in radians." Expected: $\pi/6 \approx 0.524$.
7. **StepCheck:** "$\arctan(1) = ?$ in radians." Expected: $\pi/4 \approx 0.785$.
8. *Prose:* Why atan2 exists. arctan alone cannot tell $(1,1)$ from $(-1,-1)$. atan2 takes both coordinates and returns the right quadrant. In code: `Math.atan2(y, x)`.
9. *Prose-with-widget:* The setup for the endgame. A single position $p$ can be tagged with a vector $[\sin(p/w_1), \cos(p/w_1), \sin(p/w_2), \cos(p/w_2), \ldots]$ for any chosen wavelengths $w_i$. (widget: positionFingerprint)
10. *Prose:* If the wavelengths span many orders of magnitude, the resulting vector encodes "near" and "far" simultaneously. Two nearby positions have similar fingerprints; two distant positions have very different ones.
11. **StepCheck:** "At $p = 0$, every $\sin$ term is 0 and every $\cos$ term is 1. What is the fingerprint vector if there are 4 frequencies?" Expected: [0, 1, 0, 1, 0, 1, 0, 1] (accept any equivalent representation).
12. *Prose:* The endgame callback. A transformer reads tokens with no index attached. Positional encoding tags every position with a vector of sines and cosines at many different frequencies, sampled from the unit circle at a schedule of angles. RoPE, the positional scheme inside LLaMA 2/3, Mistral, Gemma, Code-LLaMA, and PaLM, then rotates each query and key vector by an angle proportional to its position, using the exact 2D rotation you derived in lesson 3.4.
13. *Prose:* What to expect in m4 and beyond. m4-precalc will look at function transformations more carefully; m5-calculus will show why $\sin$ and $\cos$ are differentiable in a particularly nice way; m7-linear-algebra will recast the rotation formula as a 2x2 matrix; m15-attention will use that matrix as RoPE; m16-transformer-block will use the multi-frequency fingerprint from step 9.

**Widgets:** polarSketcher, unitCircleScrubber, positionFingerprint. **Estimated minutes:** 22-26.

---

## 7. Problem bank

1. **(novice, computation, degree-radian-conversion)** Convert $210^\circ$ to radians. **Answer:** $7\pi/6$.
2. **(novice, computation, cos-sin-as-coordinates)** What are the (x, y) coordinates on the unit circle at $\theta = \pi$? **Answer:** $(-1, 0)$.
3. **(novice, computation, reference-angles)** $\sin(\pi/3) = ?$ **Answer:** $\sqrt3/2$.
4. **(novice, computation, right-triangle-ratios)** A right triangle has legs 3 and 4. Find the hypotenuse and the sine of the angle opposite the leg of length 3. **Answer:** hypotenuse 5; $\sin = 3/5$.
5. **(novice, interpretation, radian-measure)** Without converting to degrees, where is $\theta = 1$ radian on the unit circle: first quadrant, second, third, or fourth? **Answer:** first quadrant (since $1 < \pi/2 \approx 1.5708$).
6. **(intermediate, computation, pythagorean-identity)** Given $\cos\theta = -5/13$ and $\theta$ in the second quadrant, find $\sin\theta$ and $\tan\theta$. **Answer:** $\sin\theta = 12/13$, $\tan\theta = -12/5$.
7. **(intermediate, computation, angle-addition-formulas)** Use the angle addition formula to compute $\cos(75^\circ)$ exactly. **Answer:** $(\sqrt6 - \sqrt2)/4$.
8. **(intermediate, computation, rotation-of-a-point)** Rotate $(1, 0)$ counterclockwise by $\pi/3$ using the rotation formula. Give the new coordinates. **Answer:** $(1/2,\, \sqrt3/2)$.
9. **(intermediate, computation, rotation-of-a-point)** Rotate $(3, 4)$ counterclockwise by $\pi/2$. **Answer:** $(-4, 3)$.
10. **(intermediate, interpretation, graphs-period-amplitude)** What are the amplitude and period of $f(\theta) = 3\sin(2\theta)$? **Answer:** amplitude 3, period $\pi$.
11. **(intermediate, computation, phase-relationship)** Find a value of $c$ such that $\cos(\theta) = \sin(\theta + c)$ for all theta. **Answer:** $c = \pi/2$ (also $-3\pi/2$ etc.; principal answer $\pi/2$).
12. **(intermediate, computation, polar-coordinates)** Convert $(x, y) = (-2, 2)$ to polar with $r \geq 0$ and $\theta \in [0, 2\pi)$. **Answer:** $(2\sqrt2,\, 3\pi/4)$.
13. **(intermediate, computation, inverse-trig)** Solve $\sin\theta = -1/2$ for all $\theta \in [0, 2\pi)$. **Answer:** $\theta = 7\pi/6$ and $\theta = 11\pi/6$.
14. **(intermediate, interpretation, inverse-trig)** Why is $\arcsin(\sin(3\pi/4)) = \pi/4$ rather than $3\pi/4$? **Answer:** Because arcsin returns values only in $[-\pi/2, \pi/2]$; $3\pi/4$ is outside that range, but $\sin(3\pi/4) = \sin(\pi/4) = \sqrt2/2$, and arcsin picks the principal branch.
15. **(advanced, construction, angle-addition-formulas)** Derive $\cos(2\theta) = 1 - 2\sin^2\theta$ from the angle addition formula for cosine and the Pythagorean identity. **Answer:** $\cos(2\theta) = \cos^2\theta - \sin^2\theta = (1 - \sin^2\theta) - \sin^2\theta = 1 - 2\sin^2\theta$.
16. **(advanced, proof-scaffold, rotation-of-a-point)** Show that rotating $(x, y)$ by angle $\theta$ and then by angle $\phi$ gives the same result as rotating once by $\theta + \phi$. State which formulas you use. **Answer:** Apply the rotation map twice; expand using $\cos(\theta+\phi)$ and $\sin(\theta+\phi)$ angle addition; the products collapse to give the single-rotation formula at angle $\theta + \phi$.
17. **(advanced, debugging, rotation-of-a-point)** A student writes the rotation formula as $(x, y) \mapsto (x\cos\theta + y\sin\theta,\, -x\sin\theta + y\cos\theta)$. Plug in $(1, 0)$ and $\theta = \pi/2$ to see what goes wrong; describe the error. **Answer:** Get $(0, -1)$, which is a clockwise quarter turn, not counterclockwise. The student swapped the signs; the correct formula has $-y\sin\theta$ on the x-component and $+x\sin\theta$ on the y-component.
18. **(advanced, construction, multi-frequency-position-vector)** Define $\mathrm{PE}(p) = [\sin(p), \cos(p), \sin(p/100), \cos(p/100)]$. Compute $\mathrm{PE}(0)$ and $\mathrm{PE}(\pi)$. Which two components changed most? **Answer:** $\mathrm{PE}(0) = [0, 1, 0, 1]$; $\mathrm{PE}(\pi) = [0, -1, \sin(\pi/100), \cos(\pi/100)] \approx [0, -1, 0.0314, 0.9995]$. The first two (high-frequency components) flipped sign; the last two (low-frequency components) barely moved.
19. **(advanced, computation, frequency-scaling)** A signal is modeled as $f(t) = \sin(2\pi \cdot 60 t)$. What is its period in seconds? Its frequency in Hz? **Answer:** period $1/60$ s; frequency 60 Hz.
20. **(advanced, proof-scaffold, pythagorean-identity)** Use the angle addition formula for cosine with $\beta = \alpha$ and the fact that $\cos 0 = 1$ to derive $\sin^2\alpha + \cos^2\alpha = 1$. **Answer:** $\cos(\alpha - \alpha) = \cos\alpha\cos\alpha + \sin\alpha\sin\alpha = \cos^2\alpha + \sin^2\alpha$, and the left side equals $\cos 0 = 1$.

---

## 8. Endgame callback: refined

**Starter (provided):** A transformer is handed one token at a time with no index attached, so by default it cannot tell position 3 from position 30. Positional encoding fixes this by tagging every position with a vector of sine and cosine values sampled at many frequencies, the unit circle read off at a schedule of angles. Rotary positional embedding, the version inside modern large language models, rotates each query and key vector by an angle proportional to its position, which is exactly the 2D rotation you derive in this module, applied inside the attention mechanism.

**Candidate A (recommended, terse and punchy):**
A transformer sees a bag of tokens with no order. To put position back in, it tags each token with a vector of sines and cosines read off the unit circle at many frequencies, and inside LLaMA 2/3, Mistral, and Gemma it rotates the query and key vectors by an angle proportional to position, the exact 2D rotation you derived from the angle addition formulas.

**Candidate B (engineer-flavored, names the trick):**
Self-attention is permutation-invariant; if you do nothing, "the cat sat" and "sat the cat" look identical. The fix is the unit circle, sampled at many ticking rates: every position becomes a vector of sines and cosines, and rotary positional embedding (RoPE), the default scheme in LLaMA 2/3, Mistral, Gemma, Code-LLaMA, and PaLM, rotates each query/key pair by an angle proportional to position. The rotation rule is the one you derived from angle addition; the multi-frequency sampling is the waveLab idea, just repeated.

**Candidate C (one-sentence, for a tight callout):**
The unit circle you walked in this module, sampled at many frequencies for sinusoidal encoding and rotated by position for RoPE, is how a transformer learns where each token sits in a sentence.

**Recommendation:** Use Candidate A as the canonical version at the end of lesson 3.5; use Candidate C as a sidebar callout in the module landing page and as the one-liner that appears in the m15 and m16 cross-references.

---

## 9. Sources (licensing-aware)

1. **OpenStax, Algebra and Trigonometry 2e**, Jay Abramson et al. — https://openstax.org/books/algebra-and-trigonometry-2e — textbook — **CC BY 4.0** — **[ADAPT]**. Use chapters 5-8 for canonical worked-example phrasings and figure inspiration. This is the cleanest reusable source for the module; explicitly CC BY per the OpenStax preface, so worked examples and figures can be adapted with attribution.

2. **OpenStax, Precalculus (1st edition)**, Jay Abramson et al. — https://openstax.org/books/precalculus — textbook — **CC BY 4.0** — **[ADAPT]**. Same content backbone as Algebra and Trigonometry 2e, also CC BY. Use it as a cross-check for problem-bank style and reference angle tables. Warning: the **2nd edition** of the same book ("Precalculus 2e") is **CC BY-NC-SA 4.0**, so for adaptation you must use the 1st edition.

3. **Vaswani et al., "Attention Is All You Need" (2017)** — https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf — paper (NeurIPS) — author copyright with NeurIPS permissive academic-use terms — **[REFERENCE-ONLY]**. Source for the exact PE formulation. The verbatim Section 3.5 quote is the load-bearing primary-source citation for the m16 forward pointer: "The wavelengths form a geometric progression from 2π to 10000 · 2π. We chose this function because we hypothesized it would allow the model to easily learn to attend by relative positions, since for any fixed offset k, PE_{pos+k} can be represented as a linear function of PE_{pos}." Do not reproduce figures; cite the formula and paraphrase.

4. **Su et al., "RoFormer: Enhanced Transformer with Rotary Position Embedding" (2021)** — https://arxiv.org/abs/2104.09864 — paper (arXiv) — author copyright — **[REFERENCE-ONLY]**. Primary source for RoPE. Section 3 ("A 2D case" and the subsequent generalization) gives the 2D rotation form: the $2\times 2$ matrix applied to a feature pair and the wavelength schedule $\theta_i = 10000^{-2(i-1)/d}$. Notation numbers vary across the five arXiv revisions; cite by section, not by equation number. Cite, do not reproduce.

5. **PhET, "Trig Tour" simulation** — https://phet.colorado.edu/en/simulations/trig-tour — interactive widget (HTML5) — **CC BY 4.0** — **[ADAPT]**. The closest existing analogue to unitCircleScrubber. Reuse its visual conventions (unit-circle + sine wave + cosine wave linked views) and improve on it by adding the radian arc-length readout and the triangle morph.

6. **Mafs library, Steven Petryk** — https://mafs.dev/ and https://github.com/stevenpetryk/mafs — interactive component library (React/TS) — **MIT License** — **[ADAPT]**. The stack already uses Mafs-style widgets; this is the technical reference for draggable points, plots, and transforms. MIT license; safe to depend on and to copy patterns from.

7. **3Blue1Brown, "Trigonometry fundamentals" (Lockdown Math Chapter 2, published April 21, 2020)** — https://www.3blue1brown.com/lessons/ldm-trigonometry/ — video lecture by Grant Sanderson — standard YouTube/3Blue1Brown copyright — **[REFERENCE-ONLY]**. The reference standard for the visual-rigor end of the pedagogy. Use as a model for the order in which to introduce the unit circle, the angle addition formulas, and the connection to complex multiplication; do not embed video clips or reproduce visuals.

8. **Kalid Azad, "How To Learn Trigonometry Intuitively"** — https://betterexplained.com/articles/intuitive-trigonometry/ — blog article — copyright Kalid Azad — **[REFERENCE-ONLY]**. The dome/wall/ceiling framing for the percentage-interpretation of sine and cosine. Use as a model for the "sine is your height as a percentage of the hypotenuse" reframe; paraphrase, do not copy.

9. **Amirhossein Kazemnejad, "Transformer Architecture: The Positional Encoding"** — https://kazemnejad.com/blog/transformer_architecture_positional_encoding/ — blog post — author copyright — **[REFERENCE-ONLY]**. The canonical pedagogical breakdown of why sinusoidal encoding works and the proof that any fixed-offset shift is a linear function of the original encoding. Reference for the positionFingerprint widget's mathematical scaffolding.

10. **Hugging Face, "You could have designed state of the art positional encoding"** — https://huggingface.co/blog/designing-positional-encoding — blog — Hugging Face copyright — **[REFERENCE-ONLY]**. Walks the learner from a binary positional vector to the sinusoidal formula via an "if you wanted smooth values, you would have invented sin and cos" argument. Best pedagogical companion to lesson 3.5 step 9.

---

## 10. Pedagogical traps

1. **Trap: Treating triangle trig and circle trig as separate topics.** Why it happens: every high-school curriculum the adult learner ever met teaches triangle trig in one semester and the unit circle in the next, with no bridge. Mitigation: in lesson 3.2, the triangleCircleMorph widget physically draws the right triangle INSIDE the unit circle with the hypotenuse as the radius. Never define sin twice; define it once on the unit circle, then explain that the triangle case is what happens at hypotenuse 1.

2. **Trap: Treating $\pi$ as the symbol for radians, the way the degree mark is the symbol for degrees.** Why it happens: every classroom radian problem is a fraction of pi. Mitigation: in lesson 3.1, include a StepCheck that asks for the radian measure of a 3-unit arc on a unit circle. The answer is 3, not $3/\pi$ and not $3\pi$. Force the learner to compute $\sin(1)$ and $\sin(1.5)$ on a calculator with the calculator in radian mode.

3. **Trap: Mechanizing the angle addition formula as a memorization burden.** Why it happens: there are four formulas (sin/cos times plus/minus) and they look alike. Mitigation: prove $\sin(\alpha + \beta)$ once via the unit-circle picture (with the angleAdditionProof widget) and derive the other three from it: $\cos$ via the phase shift $\cos\theta = \sin(\theta + \pi/2)$ already known from lesson 3.3, and the minus-sign versions via $\sin(-\beta) = -\sin\beta$, $\cos(-\beta) = \cos\beta$. The learner ends with one fact and three rewrites, not four facts.

4. **Trap: Letting the rotation formula look like a matrix in disguise.** Why it happens: every other source on the internet writes it as a 2x2 matrix multiplication. Mitigation: present the formula as a coordinate map: an input pair $(x,y)$ and an output pair $(x', y')$, with $x' = x\cos\theta - y\sin\theta$ and $y' = x\sin\theta + y\cos\theta$. State explicitly in lesson 3.4 that m7-linear-algebra will repackage this as a 2x2 matrix; nothing here will need to be unlearned. This sets up the m7 callback without preempting it.

5. **Trap: Glossing over arctan's failure on points not in the right half-plane.** Why it happens: arctan returns "an angle" and most textbook problems are set up so the angle happens to be the right one. Mitigation: in lesson 3.5, make atan2 a first-class concept with a code-flavored introduction. Show that $\arctan(1/-1) = -\pi/4$ but the point $(-1, 1)$ is in Q2 with angle $3\pi/4$; explain why atan2 takes both arguments. Adult software-engineer learners have probably seen `Math.atan2` in code without understanding why; close the loop.

6. **Trap: Hand-waving the connection to transformers as "you'll see later why this matters."** Why it happens: the temptation is strong because m15 and m16 are far away. Mitigation: in lesson 3.3 step 11 and lesson 3.5 steps 9-12, the positionFingerprint widget makes the connection mechanical and visible right now. The learner literally builds the input column to a sinusoidal positional encoding by sampling the waveLab waves at integer positions. The Vaswani 2017 formula is shown as the "industrial" version of what they just built by hand. No hand-waving; the artifact is the artifact.
