# Tinker launch announcement drafts — 2026-05-26

The first course is complete: 18 modules, M0 through M18, all shipped on learntinker.com. M18 closed with a working transformer the learner trains in their own browser.

Below are three variants of an announcement. **Pick one, edit it, post when ready.** Nothing here has been published anywhere.

---

## A. Twitter / X thread

**Anchor tweet (≤280 chars):**

> The first course on Tinker is done. 18 modules, M5 calculus through M18 capstone. You finish by training a 209k-parameter transformer on tiny-shakespeare in your own browser, on the GPU in your laptop. Free, no signup needed to read. https://learntinker.com

**Follow-up tweets (one per arc, optional thread continuation):**

> 1/ Arc 0–1: Foundations. Single-variable + multivariable calculus, vectors, matrices as transformations, eigen and SVD. Every concept paired with a widget you can drag.

> 2/ Arc 2: ML foundations. SGD → Adam. Backprop from scratch (you build micrograd one node at a time). Training dynamics — overfit, dropout, BatchNorm, residuals, the canonical pathologies.

> 3/ Arc 3: Transformers. Sequence models bigram → RNN → attention. Attention as a soft dictionary with Q/K/V. The pre-LN block. Stacked N times.

> 4/ Arc 4: Capstone. Tokenization, the training loop, autoregressive sampling. Then you train your own 4-layer 4-head transformer end-to-end on WebGPU. ~5 minutes. The .bin lands on your disk. It is the model.

> 5/ The last lesson is a credits roll — six of the engine's source files literally scrolling past while the trained model samples above. The pedagogical claim is "the code IS the course," and the build system enforces it (the credits roll imports the source via Vite ?raw, so it can't drift).

> 6/ Tech: Astro 6 + Svelte 5 + MDX, Cloudflare Workers, WebGPU + hand-written WGSL kernels for the M18 engine (about 400 lines of shader code, no PyTorch in the browser). Source: https://github.com/SkipSupreme/tinker

---

## B. Show HN

**Title (≤80 chars):**

> Show HN: Tinker – a free 18-module ML math course you train a transformer at the end

**Body:**

> Hi HN. Tinker is a free course that teaches the math underneath modern machine learning, from single-variable calculus through to training a real transformer in the browser.
>
> The course shipped its capstone module yesterday. The format is 18 modules across four arcs:
>
> - Arcs 0–1 (Foundations): calculus, multivariable, vectors, matrices as transformations, eigen and SVD.
> - Arc 2 (ML foundations): optimization, neural networks, backprop from scratch, training dynamics.
> - Arc 3 (Transformers): sequence models bigram → RNN → attention → the pre-LN block.
> - Arc 4 (Capstone): tokenization + the training loop, then you train your own 4-layer, 4-head, ~209k-parameter transformer on tiny-shakespeare in your browser using WebGPU. About five minutes. The .bin lands on your disk. Then a sampler-knobs playground with live histogram visualization of temperature / top-k / top-p truncation. Then a credits roll showing the engine's actual source code scrolling past with the trained model sampling above.
>
> Every lesson is paired with at least one interactive widget — embeddings you drag, loss curves you can break six different ways, attention as a soft dictionary lookup. No video, no chalk-talk. The math is the work; the widget is how you touch it.
>
> The M18 engine is hand-written WGSL kernels (about 400 lines of shader code, no PyTorch.js in the browser). The credits roll imports those kernels via Vite's ?raw loader so what the learner reads is what shipped — the pedagogical claim "the code is the course" is enforced by the build system, not by hand-copying.
>
> https://learntinker.com — no signup required to read. Source: https://github.com/SkipSupreme/tinker
>
> Happy to answer questions about the M18 capstone build, the WGSL kernels, the in-browser training loop, or the design pedagogy.

---

## C. Blog post (short, ~300 words)

**Title:** The first Tinker course is live

> Today I shipped the capstone module of Tinker, which means the first complete course is live at learntinker.com. Eighteen modules, four arcs, free in your browser.
>
> The shape of the course is this: M5 starts with `f(x) = x²` and a single derivative. M18 ends with a 209,000-parameter transformer that the learner trains, in their own browser tab, on the GPU in their laptop, on the complete works of Shakespeare, in about five minutes. Between those two endpoints sit sixteen modules that are not video, not chalk-talk, and not exercises. Every concept ships with a widget you can drag. The math is the work; the widget is how you touch it.
>
> The capstone module is the part I am proudest of. The training engine is hand-written WGSL — about four hundred lines of shader code that the browser compiles to Metal on a Mac, D3D12 on Windows, Vulkan on Linux. There is no PyTorch.js, no transformers.js, no ONNX-Web. The pedagogical claim is that every line of code that runs when the learner presses Start is a line they could read and understand by the end of M18. The credits-roll lesson at the end of the module literally scrolls those source files past the learner while the trained model samples above — and the credits roll imports the source via Vite's ?raw loader, so what you read is what ran. The build system enforces the claim.
>
> The course is free. There is no signup required to read it. There is a signup option if you want progress tracked across devices.
>
> Read the course: https://learntinker.com
> Source: https://github.com/SkipSupreme/tinker

---

## Things deliberately NOT in any draft

- No "we" framing (no team — this is the user's solo project).
- No "AI-built" disclaimers up front (the work is the pitch; if asked, answer honestly).
- No timeline / weekly cadence claims (the course is done, not "shipping new modules every week").
- No paid generation of social cards or hero images — user explicitly hasn't authorized that. If a card is wanted, suggest grabbing a screenshot of the M18 SamplerKnobsPlayground at high temperature (it's visually rich and on-brand) or the credits roll mid-scroll.

## What's open

- Where to actually post (Twitter? Mastodon? Bluesky? HN? all of them?)
- Whether to coordinate with anyone for a quote / boost
- Whether to make a 30-second screencap video (M18's training loop or the credits roll mid-scroll would both be obvious choices)
- Whether to update the GitHub repo's README to match — the README is separate from this homepage copy and may still say "alpha"
