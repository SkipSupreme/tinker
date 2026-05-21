# Module 7: Linear Algebra: Research Brief

*Tinker: Machine Learning, Backpropagation, and AI. The Math* · Arc 1 (Prerequisite Math) · depends on m2-algebra and (parallel) m6-multivariable · feeds m8-probability, m10-optimization, m11-neural-networks, m15-attention.

**Opinionated stance (carried throughout):** We teach matrices as linear transformations (Strang / 3B1B) first, and matrix mechanics (row·column dot products, cofactor expansions) as *notation for* that picture. We commit to the **column-picture** of `A @ x`: a linear combination of the columns of `A`: as the foundational mental model, because it is the picture that makes `x @ W_q` in the endgame feel inevitable. We use row-vector / "data-as-rows, `x @ W`" layout throughout (PyTorch/NumPy convention, C-order) and call out the column-vector convention only as a translation note when reading Strang or Deisenroth.

---

## 1. Concept dependency graph

Topologically sorted. Prerequisites in brackets; `m2` = Module 2 Algebra, `m6` = Module 6 Multivariable Calculus.

1. **vector-as-list**. An ordered tuple of numbers `[x₁,…,xₙ]`, the computer-science view of a vector. *Prereq:* m2-algebra.
2. **vector-as-arrow**. A geometric arrow from the origin with a length and a direction; the physicist's view. *Prereq:* m2-algebra.
3. **vector-duality**. Every vector is *simultaneously* a list and an arrow; switching between views is a skill, not a contradiction. *Prereq:* vector-as-list, vector-as-arrow.
4. **vector-addition**. Adding two vectors componentwise = placing them head-to-tail geometrically. *Prereq:* vector-duality.
5. **scalar-multiplication**. Multiplying every component by `c` = stretching/flipping the arrow by factor `c`. *Prereq:* vector-duality.
6. **linear-combination**. An expression `a₁v₁ + … + aₙvₙ`; the fundamental operation of linear algebra. *Prereq:* vector-addition, scalar-multiplication.
7. **span**. The set of *all* linear combinations of a set of vectors (a line, plane, or higher subspace). *Prereq:* linear-combination.
8. **basis-standard**, `ê₁ = [1,0]`, `ê₂ = [0,1]`: the implicit coordinate system every "list of numbers" is written in. *Prereq:* linear-combination.
9. **dot-product-algebraic**, `⟨u,v⟩ = Σᵢ uᵢvᵢ`: a scalar that pairs two vectors. *Prereq:* vector-as-list, m6-multivariable (seen informally).
10. **dot-product-geometric**, `⟨u,v⟩ = |u||v|cosθ`: the same number, reinterpreted as length × projection. *Prereq:* dot-product-algebraic.
11. **dot-product-as-similarity**. When `|u|` and `|v|` are fixed, the dot product is maximal when `u` and `v` point the same way, zero when perpendicular, negative when opposed; this is the ML reading. *Prereq:* dot-product-geometric.
12. **linear-transformation**. A function on space that (a) keeps the origin fixed and (b) keeps grid lines straight and evenly spaced. *Prereq:* linear-combination.
13. **matrix-as-transformation**. A 2×2 (or n×n) matrix *is* the record of where `ê₁, ê₂` land; its columns are the images of the basis vectors. *Prereq:* linear-transformation, basis-standard.
14. **matvec-column-picture**, `A @ x` = `x₁·(col 1 of A) + x₂·(col 2 of A) + …`: a linear combination of the columns of `A` weighted by `x`. *Prereq:* matrix-as-transformation, linear-combination.
15. **matvec-row-picture**. The `i`-th output is the dot product of the `i`-th row of `A` with `x`; a computational shortcut, *not* the mental model. *Prereq:* matvec-column-picture, dot-product-algebraic.
16. **matmul-as-composition**, `AB` is "do `B`, then do `A`"; the columns of `AB` are `A` applied to each column of `B`. *Prereq:* matvec-column-picture.
17. **matmul-noncommutative**, `AB ≠ BA` because "rotate then shear" ≠ "shear then rotate". *Prereq:* matmul-as-composition.
18. **identity-matrix**, `I` is the "do nothing" transformation; `IA = AI = A`. *Prereq:* matmul-as-composition.
19. **determinant-2d**. The signed area of the parallelogram spanned by the columns; measures how the transformation scales area and whether it flips orientation. *Prereq:* matrix-as-transformation.
20. **determinant-zero**, `det(A)=0` ⇔ columns are dependent ⇔ transformation squashes space into a lower dimension ⇔ `A` is not invertible. *Prereq:* determinant-2d, span.
21. **inverse-matrix**, `A⁻¹` is the transformation that undoes `A`; exists iff `det(A) ≠ 0`. *Prereq:* determinant-zero, identity-matrix.
22. **eigen-direction**. A nonzero vector `v` such that `Av = λv`: a direction that `A` stretches but does not rotate. *Prereq:* matrix-as-transformation, scalar-multiplication.
23. **eigenvalue-lambda**. The scalar `λ` telling how much `A` stretches along its eigen-direction (negative = flip, |λ|<1 = shrink). *Prereq:* eigen-direction.
24. **characteristic-equation**. Eigenvalues satisfy `det(A − λI) = 0`; a mechanical way to find them after you understand *why* they matter. *Prereq:* eigen-direction, determinant-zero.
25. **change-of-basis**. Rewriting the same vector/transformation in a different set of basis vectors; `B⁻¹AB` "translates" `A` into the language of a new basis. *Prereq:* matmul-as-composition, inverse-matrix.
26. **svd-intuition**. Every matrix is "rotate, scale the axes by σ₁ ≥ σ₂ ≥ … ≥ 0, rotate again"; dropping the smallest σ's gives the best low-rank approximation. *Prereq:* change-of-basis, eigen-direction.

---

## 8. Endgame callback: selected

> "A transformer is three matrix multiplies, `x @ W_q`, `x @ W_k`, `x @ W_v`: and then one more: the attention matrix. That attention matrix is nothing but a table of dot products, one per pair of tokens: similarity, softmaxed, scaled. You now understand 80% of it."

## 9. Sources: licensing summary

**High-quality linear-algebra pedagogy world is almost entirely CC BY-NC-SA, GNU FDL, or all-rights-reserved.** All primary teaching sources are **[REFERENCE-ONLY]**:

- Strang's *Introduction to Linear Algebra* (© Wellesley-Cambridge, all rights reserved)
- MIT OCW 18.06 (CC BY-NC-SA)
- 3B1B *Essence of Linear Algebra* (CC BY-NC-SA)
- Deisenroth/Faisal/Ong MML Ch. 2–4 (personal use only)
- CS229 Stanford notes (copyright retained)
- Margalit/Rabinoff *Interactive Linear Algebra* (GNU FDL, copyleft, requires license propagation)
- Immersive Math (all rights reserved)
- Setosa *Explained Visually* (license unclear; MIT source but content license undeclared)

**[ADAPT]** allowed for:
- OpenStax College Algebra (CC BY 4.0, but limited LA coverage)
- Distill.pub (CC BY 4.0)
- Karpathy nanoGPT code (MIT)

Widgets are re-derived from scratch in our own Svelte+Mafs code; prose is original. Citations list sources as further reading only.

## 10. Trap mitigations carried into lesson design

1. **Lead with column picture, not row·column.** `A @ x` introduced as `x₁·col1 + x₂·col2` before the row formula appears.
2. **Row-vector convention committed in lesson 1.** `x @ W`, NumPy C-order; Strang's `Ax` flagged only as a translation note.
3. **Eigenvector as concept before `det(A − λI) = 0`.** `eigenHunter` widget lets the learner drag `v` and find a direction where `Av` is collinear; the characteristic equation shows up as a consequence.
4. **Matrix born geometrically via `matrixDraggable`.** Column arrows draggable first; `[[a,b],[c,d]]` readout is secondary.
5. **Four-way equivalence collapses to one widget state.** Drag columns collinear → parallelogram flat, det=0, no inverse, rank=1 badge, all in the same canvas.
6. **SVD is intuition-only.** Three-stage rotate-stretch-rotate animation; no hand computation of SVD in the problem bank.

---

## Full brief sections (concept graph §1, endgame §8, sources §9, traps §10 shown above)

Sections 2 (canonical worked examples), 3 (misconceptions), 4 (widget specs for matrixDraggable / dotProductProjector / attentionScoreGrid / eigenHunter / determinantAreaScrubber / svdEllipse / basisTranslator), 5 (KaTeX-ready formulas), 6 (5-lesson decomposition), and 7 (20-problem bank) are the operational content, all converted into MDX lessons under `apps/docs/src/content/lessons/` in this same push. Reference them there.

**The 5 lessons that came out of §6:**
1. `vectors.mdx`: What is a vector, really?
2. `dot-products.mdx`: Dot product: one number, two stories
3. `matrix-as-transformation.mdx`: A matrix is a transformation
4. `composition-det-inverse.mdx`: Composition, determinants, and inverses
5. `eigen-and-svd.mdx`: Eigenvectors, change of basis, and a glimpse of SVD

**The widget built live (§4.1):**
- `MatrixDraggable.svelte`: drag-the-columns widget; subsumes `determinantAreaScrubber` (§4.5) via orientation-flip coloring.

**Widgets flagged as placeholders (WidgetPlaceholder):**
- `dotProductProjector` (§4.2)
- `attentionScoreGrid` (§4.3)
- `eigenHunter` (§4.4)
- `svdEllipse` (§4.6)
- `basisTranslator` (§4.7)
