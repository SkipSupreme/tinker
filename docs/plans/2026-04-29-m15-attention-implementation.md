# M15 — Attention: Implementation Plan

Source of truth: `docs/research/m15-attention.md` (Deep Research, 2026-04-29).
Module manifest stub: `apps/docs/src/content/modules/m15-attention.md` (status: planned — needs rewrite, see §6).

## 0. Status of the research output

The DR response is unusually high-quality on the math and pedagogy and sloppy on prose mechanics. Several inline tokens are mid-word truncated ("myers", "stcture", "atttion", "softmaxSatExplorer" → "softmaxSat …", "wit `permutationEquivarianceLab`", "(widget `multiplitter`"). Treat the research as a strong skeleton; do **not** copy prose into MDX without re-reading and rewriting in our voice.

The 5-lesson decomposition (15.1 → 15.5) is sound. We adopt it as the default and flag the only structural disagreement in §1 below.

## 1. Open pedagogical decisions (need user sign-off before MDX work starts)

1. **Lesson 15.5 is overloaded.** As proposed it covers multi-head + complexity + KV-cache + the endgame line, with 12 steps and 2 widgets. That's the densest lesson in the module by ~30%. Recommendation: **split into 15.5 ("Multi-head as parallel subspaces") and 15.6 ("The cost and the cache")**. Keeps each lesson at the M14 average of ~10 steps / 1 widget. Total module length doesn't change.
2. **Position lesson order: textbook-first or RoPE-first?** Research recommends RoPE for new builds, sinusoidal as "the textbook formula." Course pattern elsewhere is *historical-first → modern fix* (n-gram → MLP → RNN → attention). Recommendation: **keep the research's order — sinusoidal → learned absolute → RoPE — because RoPE is genuinely easier to motivate once the reader has seen sinusoidal's "linear-in-offset" property.** No change.
3. **Cross-attention.** Research includes it as one step in 15.3. Adult ML learners do not need cross-attention to understand a decoder-only transformer (our endgame). Recommendation: **keep the one step but mark it as an aside**, no widget, no StepCheck. Costs 90 seconds, immunizes against the "self vs. cross are different mechanisms" misconception.
4. **"Attention is not Explanation" detour.** Research wants this as Lesson 15.3 step 8. It's a great idea but breaks the flow from "build the formula" → "see permutation-equivariance bug." Recommendation: **demote to a short blockquote at the end of 15.3 plus Problem 19 in the bank**, not a step.
5. **Endgame callback.** Recommended option #1 from the research, lightly tightened: *"Attention is the operation. Residuals, layer norm, the MLP that follows — plumbing around one core idea: every position broadcasts a query, every position offers a key, the softmax-weighted match decides whose values you pull back. You are now one layer of glue away from the real thing."*

## 2. Lesson roster (final, pending §1 sign-off)

| # | Title | Slug | ~Minutes | Widgets |
|---|---|---|---|---|
| 15.1 | Soft dictionary lookup | `soft-dictionary-lookup` | 13 | qkVectorPlayground |
| 15.2 | Why divide by √dₖ | `why-divide-by-sqrt-dk` | 12 | softmaxSatExplorer |
| 15.3 | Three projections of the same X | `three-projections` | 18 | attentionMatrixHeatmap, permutationEquivarianceLab |
| 15.4 | Position, three ways | `position-three-ways` | 14 | ropeRotationDial |
| 15.5 | Multi-head as parallel subspaces | `multi-head-parallel-subspaces` | 10 | multiHeadSplitter |
| 15.6 | The cost and the cache | `cost-and-the-cache` | 10 | kvCacheTimeline |

Total: ~77 minutes. M14 was ~85 actual; this lands at "Arc 3 keystone" weight, slightly under M14.

Each lesson follows the established pattern: `<Step>` for prose-with-widget, `<StepCheck>` for numeric gates, single `<EndgameCallback>` at the bottom. StepCheck targets follow the research's per-lesson list, ≥ 1 per lesson.

## 3. Widget roster — reuse vs. new

| Widget | Status | Reuse leverage |
|---|---|---|
| `qkVectorPlayground` | **extend** | Built on `DotProductPlayground.svelte` (already has 2D drag + dot-product readout). Add: second key vector `k₂`, scaled-dot-product softmax bar (lift from `TemperatureBars`), output-vector arrow. ~60% of code already exists. |
| `softmaxSatExplorer` | new | Score histogram + softmax bar + entropy/gradient meter. Lifts the bar-render code from `TemperatureBars`, the gradient-decay meter pattern from `GradientDecay`. |
| `attentionMatrixHeatmap` | new | T×T cell heatmap with mask toggle and click-to-lock-row. Cell-render code lifts from `BigramHeatmap`. |
| `permutationEquivarianceLab` | new | Drag-to-reorder token chips (lift `EmbeddingPluck` chip pattern) + "Y' = permute(Y)?" boolean indicator + PE on/off. |
| `ropeRotationDial` | new | Two integer-position handles + 2D rotation arrows + dot-product readout. Pure Mafs scene; no obvious reuse. |
| `multiHeadSplitter` | new | Shape-passport renderer + h side-by-side mini-heatmaps. Mini-heatmaps reuse `attentionMatrixHeatmap` cells. |
| `kvCacheTimeline` | new | Step-button-driven append animation of K and V columns. Step animation pattern parallels `UnrolledRNN`. |

Widget files land in `apps/docs/src/components/demos/` matching existing convention (camelCase research name → PascalCase Svelte file: `qkVectorPlayground` → `QkVectorPlayground.svelte`).

## 4. Build order

Vertical slice per lesson (widget → lesson MDX → deploy → check on learntinker.com), in this order:

1. **15.1** — `qkVectorPlayground` (extend) → lesson MDX. Lowest risk, builds on M11 prior art.
2. **15.2** — `softmaxSatExplorer` → lesson MDX. Single new widget, sharp pedagogical payoff.
3. **15.3** — `attentionMatrixHeatmap` + `permutationEquivarianceLab` → lesson MDX. The keystone lesson; two widgets but second one is small.
4. **15.4** — `ropeRotationDial` → lesson MDX. New geometry but self-contained.
5. **15.5** — `multiHeadSplitter` → lesson MDX. Reuses heatmap from 15.3.
6. **15.6** — `kvCacheTimeline` → lesson MDX. Endgame callback ships here.

Each slice is one build / deploy / push cycle on `main` (per `feedback_always_deploy_pipeline`). No feature branches; the failure mode is half-finished modules sitting in working tree.

## 5. Concepts not in `m15-attention.md` frontmatter that we need

The current stub has `[attention, query-key-value, softmax-attention, causal-mask, multi-head]` — too thin. Replace with the full list from §1 of the research (25 concept ids), filtered to the ones lessons actually cover. Specifically add: `soft-dictionary-lookup`, `dot-product-as-similarity`, `softmax-saturation-problem`, `1-over-sqrt-dk-scale`, `attention-weights-row`, `learned-projections-WqWkWv`, `self-attention`, `attention-formula-matrix-form`, `shape-calculus-attention`, `permutation-equivariance`, `positional-encoding-need`, `sinusoidal-pe`, `learned-absolute-pe`, `rope-rotary-pe`, `multi-head-split`, `attention-quadratic-complexity`, `kv-cache`, `attention-not-explanation`.

## 6. Module manifest rewrite

`apps/docs/src/content/modules/m15-attention.md` needs:
- `summary` rewritten — current line undersells PE, complexity, KV-cache.
- `estimatedMinutes`: 150 → 77.
- `conceptsCovered` expanded per §5.
- `endgameConnection` replaced with the endgame callback from §1.5.
- `status` stays `planned` until lesson 15.1 ships.

## 7. Voice & cut review (applied to research's draft step lists)

The research's step counts are good. Two voice cuts to make at MDX time:

- **Cut "Hook" framings.** Research's 15.1 step 1 starts "How would you 'look up' a value …". M14 lessons open with the problem-statement directly. Match that.
- **Cut "Aside" labels.** Research uses "Aside:" tags on cross-attention and Karpathy bridge steps. We don't label asides as asides — we just write them. Asides feel like padding when called out.

## 8. What this plan does NOT do

- Does not stub MDX files. Per the no-placeholders rule, lessons get written when the matching widget ships, not before.
- Does not commit anything yet. First commit is the research file + this plan + the prompt-pack append; lesson commits follow per-lesson.
- Does not re-do widget research. The research output's §4 widget specs are detailed enough; per-widget research-prompt-pack tickets are unnecessary.

## 9. Open questions for user

1. Sign off on the 15.5 split into 15.5 + 15.6? (§1.1)
2. Sign off on demoting "attention is not explanation" from a step to a blockquote + problem? (§1.4)
3. Sign off on the endgame callback wording? (§1.5)
4. Anything in the research that should NOT make it into a lesson? E.g., the variance proof in 15.2 is rigorous but we can drop the formal expectation step if it feels heavy.

Once those are answered, I start with widget #1 (`qkVectorPlayground` extension of `DotProductPlayground`) and lesson 15.1 in the same vertical slice.
