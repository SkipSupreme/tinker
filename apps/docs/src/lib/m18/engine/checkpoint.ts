// .bin checkpoint format for the M18 capstone. Slice 4 of the implementation
// plan: a 512-byte ASCII JSON header padded with spaces, followed by a single
// Float32Array tail of every trainable parameter concatenated in the order the
// nanoGPT reference uses (so a future "import a torch-trained checkpoint"
// path is one transpose pass away).
//
// Format magic: "tinker-m18-v1". Bumping the version is a breaking change to
// either the header schema or the parameter layout; readers refuse anything
// they don't recognize.

import type { ModelConfig } from './config';
import type { F32, ModelParamData } from './core';

const HEADER_BYTES = 512;
const MAGIC = 'tinker-m18-v1' as const;

export interface CheckpointMeta {
  format: typeof MAGIC;
  config: ModelConfig;
  seed: string;       // the human-readable seed string, not a numeric hash
  vocabHash: string;  // sha256 hex of the vocab string, validates the tokenizer
  iter: number;
  valLoss: number;
  createdAt: string;  // ISO8601, for human triage
}

// Number of f32 elements in a full ModelParamData for the given config.
// Used to validate a buffer before parsing it.
export function paramElementCount(cfg: ModelConfig): number {
  const perBlock =
    cfg.dModel + cfg.dModel +                 // ln1 gamma + beta
    cfg.dModel * (3 * cfg.dModel) +           // wQKV
    cfg.dModel * cfg.dModel +                 // wAttnOut
    cfg.dModel + cfg.dModel +                 // ln2 gamma + beta
    cfg.dModel * cfg.dFF +                    // wFFN1
    cfg.dFF * cfg.dModel;                     // wFFN2
  return cfg.vocabSize * cfg.dModel           // wte
       + cfg.contextLen * cfg.dModel          // wpe
       + cfg.nLayer * perBlock
       + cfg.dModel + cfg.dModel;             // lnF gamma + beta
}

// Concatenate every parameter into a single Float32Array, in the canonical
// order. Pulled out so writeCheckpoint and twin-seed equality tests can share it.
export function flattenParams(params: ModelParamData, cfg: ModelConfig): F32 {
  const n = paramElementCount(cfg);
  const out = new Float32Array(n);
  let off = 0;
  const push = (a: F32, expected: number): void => {
    if (a.length !== expected) {
      throw new Error(`flattenParams: expected ${expected} elems, got ${a.length}`);
    }
    out.set(a, off);
    off += a.length;
  };
  push(params.wte, cfg.vocabSize * cfg.dModel);
  push(params.wpe, cfg.contextLen * cfg.dModel);
  if (params.blocks.length !== cfg.nLayer) {
    throw new Error(`flattenParams: ${params.blocks.length} blocks, cfg says ${cfg.nLayer}`);
  }
  for (const b of params.blocks) {
    push(b.ln1Gamma, cfg.dModel);
    push(b.ln1Beta,  cfg.dModel);
    push(b.wQKV,     cfg.dModel * 3 * cfg.dModel);
    push(b.wAttnOut, cfg.dModel * cfg.dModel);
    push(b.ln2Gamma, cfg.dModel);
    push(b.ln2Beta,  cfg.dModel);
    push(b.wFFN1,    cfg.dModel * cfg.dFF);
    push(b.wFFN2,    cfg.dFF * cfg.dModel);
  }
  push(params.lnFGamma, cfg.dModel);
  push(params.lnFBeta,  cfg.dModel);
  if (off !== n) throw new Error(`flattenParams: wrote ${off}, expected ${n}`);
  return out;
}

// Inverse of flattenParams. Each block gets its own Float32Array view rather
// than a subarray slice so callers can hand the buffers directly to GPU upload
// without worrying about aliasing.
export function unflattenParams(flat: F32, cfg: ModelConfig): ModelParamData {
  const n = paramElementCount(cfg);
  if (flat.length !== n) {
    throw new Error(`unflattenParams: got ${flat.length} elems, expected ${n}`);
  }
  let off = 0;
  const take = (size: number): F32 => {
    const a = new Float32Array(size);
    a.set(flat.subarray(off, off + size));
    off += size;
    return a;
  };
  const wte = take(cfg.vocabSize * cfg.dModel);
  const wpe = take(cfg.contextLen * cfg.dModel);
  const blocks = Array.from({ length: cfg.nLayer }, () => ({
    ln1Gamma: take(cfg.dModel),
    ln1Beta:  take(cfg.dModel),
    wQKV:     take(cfg.dModel * 3 * cfg.dModel),
    wAttnOut: take(cfg.dModel * cfg.dModel),
    ln2Gamma: take(cfg.dModel),
    ln2Beta:  take(cfg.dModel),
    wFFN1:    take(cfg.dModel * cfg.dFF),
    wFFN2:    take(cfg.dFF * cfg.dModel),
  }));
  const lnFGamma = take(cfg.dModel);
  const lnFBeta  = take(cfg.dModel);
  return { wte, wpe, blocks, lnFGamma, lnFBeta };
}

// SHA-256 hex of the vocab string. Uses WebCrypto, available in browsers and
// Node 19+. Used in the header so a loader can refuse a checkpoint trained on
// a different tokenizer rather than silently mismatching token ids.
export async function vocabHash(vocab: string): Promise<string> {
  const buf = new TextEncoder().encode(vocab);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Serialize params + meta to a single Blob. Header is exactly HEADER_BYTES of
// ASCII (JSON padded with trailing spaces); body is a flat Float32Array.
export function writeCheckpoint(params: ModelParamData, meta: CheckpointMeta): Blob {
  if (meta.format !== MAGIC) {
    throw new Error(`writeCheckpoint: bad format magic '${meta.format}', want '${MAGIC}'`);
  }
  const headerJson = JSON.stringify(meta);
  if (headerJson.length > HEADER_BYTES - 1) {
    throw new Error(`writeCheckpoint: header ${headerJson.length} bytes, max ${HEADER_BYTES - 1}`);
  }
  const padded = headerJson.padEnd(HEADER_BYTES, ' ');
  const headerBytes = new TextEncoder().encode(padded);
  if (headerBytes.byteLength !== HEADER_BYTES) {
    throw new Error(`writeCheckpoint: padded header is ${headerBytes.byteLength} bytes, want ${HEADER_BYTES}`);
  }
  const flat = flattenParams(params, meta.config);
  // flattenParams always returns a Float32Array backed by a fresh ArrayBuffer
  // (never SharedArrayBuffer), but TS 5+ types Float32Array.buffer as
  // ArrayBufferLike. Narrow it for the Blob constructor.
  return new Blob([headerBytes, flat.buffer as ArrayBuffer], { type: 'application/octet-stream' });
}

// Parse a checkpoint buffer. Validates magic + config + buffer length before
// touching the float tail. Caller passes the expected config so a mismatch
// surfaces as a clear error rather than as silently-wrong tensors.
export function readCheckpoint(buf: ArrayBuffer, expected: ModelConfig): {
  meta: CheckpointMeta;
  params: ModelParamData;
} {
  if (buf.byteLength < HEADER_BYTES) {
    throw new Error(`readCheckpoint: ${buf.byteLength} bytes, need at least ${HEADER_BYTES}`);
  }
  const headerBytes = new Uint8Array(buf, 0, HEADER_BYTES);
  const headerStr = new TextDecoder('utf-8', { fatal: true }).decode(headerBytes).trimEnd();
  let meta: CheckpointMeta;
  try {
    meta = JSON.parse(headerStr) as CheckpointMeta;
  } catch (e) {
    throw new Error(`readCheckpoint: header is not valid JSON: ${(e as Error).message}`);
  }
  if (meta.format !== MAGIC) {
    throw new Error(`readCheckpoint: bad format '${meta.format}', want '${MAGIC}'`);
  }
  const c = meta.config;
  const keys: (keyof ModelConfig)[] = ['vocabSize', 'contextLen', 'dModel', 'nHead', 'nLayer', 'dFF'];
  for (const k of keys) {
    if (c[k] !== expected[k]) {
      throw new Error(`readCheckpoint: config.${k} = ${c[k]}, expected ${expected[k]}`);
    }
  }
  const expectedFloats = paramElementCount(expected);
  const expectedTotal = HEADER_BYTES + expectedFloats * 4;
  if (buf.byteLength !== expectedTotal) {
    throw new Error(`readCheckpoint: ${buf.byteLength} bytes, expected ${expectedTotal}`);
  }
  // Copy the float section so the returned arrays don't alias the input buffer.
  const flat = new Float32Array(buf.byteLength - HEADER_BYTES >> 2);
  flat.set(new Float32Array(buf, HEADER_BYTES));
  const params = unflattenParams(flat, expected);
  return { meta, params };
}

export const _CHECKPOINT_INTERNALS = { HEADER_BYTES, MAGIC };
