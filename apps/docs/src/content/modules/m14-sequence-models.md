---
course: ml-math
arc: arc-3-transformers
order: 14
title: Sequence Modeling — Bigrams to RNNs
summary: From a bigram count table to an RNN. Tokens, the chain rule of probability, perplexity, sampling, fixed-context MLPs, and the recurrent hidden state — built so that attention next module lands as a fix to a specific, named failure mode.
status: drafting
estimatedMinutes: 390
prereqs: [m12-backpropagation, m13-training-dynamics]
conceptsCovered:
  [
    token-vocab,
    chain-rule-prob,
    bigram-table,
    nll-loss,
    perplexity,
    temperature,
    embedding-matrix,
    fixed-context-mlp,
    rnn-cell,
    bptt,
    vanishing-exploding,
    sequential-bottleneck,
  ]
endgameConnection: 'We started with a table that knew one character of context, expanded it to a window of k characters, then to a vector that — in theory — carries everything. In practice it carries about ten characters before fading. Next, we stop trying to carry the past and learn to query it instead.'
---
