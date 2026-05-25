// Slice 4: checkpoint format tests. Pin the byte layout so the .bin is a
// stable contract across releases, and prove the determinism story end-to-end
// at the (seeded init → flatten → bytes) layer without needing a GPU.

import { describe, expect, it } from 'vitest';
import { M18_CONFIG } from './config';
import { seededInitWeights } from './engine';
import {
  paramElementCount,
  flattenParams,
  unflattenParams,
  vocabHash,
  writeCheckpoint,
  readCheckpoint,
  _CHECKPOINT_INTERNALS,
  type CheckpointMeta,
} from './checkpoint';

const { HEADER_BYTES, MAGIC } = _CHECKPOINT_INTERNALS;

function makeMeta(overrides: Partial<CheckpointMeta> = {}): CheckpointMeta {
  return {
    format: MAGIC,
    config: M18_CONFIG,
    seed: '1337',
    vocabHash: 'deadbeef'.repeat(8),
    iter: 2000,
    valLoss: 2.197,
    createdAt: '2026-05-25T04:20:00.000Z',
    ...overrides,
  };
}

describe('paramElementCount', () => {
  it('matches the brief: ~209k for the locked m18 config', () => {
    const n = paramElementCount(M18_CONFIG);
    // wte (65·64) + wpe (64·64) + 4·(2·64 + 64·192 + 64·64 + 2·64 + 64·256 + 256·64) + 2·64
    // = 4160 + 4096 + 4·49408 + 128 = 206016
    expect(n).toBe(206016);
  });
});

describe('flatten / unflatten round-trip', () => {
  it('seededInitWeights → flatten → unflatten preserves every value', () => {
    const a = seededInitWeights(M18_CONFIG, 'hamlet');
    const flat = flattenParams(a, M18_CONFIG);
    const b = unflattenParams(flat, M18_CONFIG);

    expect(b.wte).toEqual(a.wte);
    expect(b.wpe).toEqual(a.wpe);
    expect(b.lnFGamma).toEqual(a.lnFGamma);
    expect(b.lnFBeta).toEqual(a.lnFBeta);
    expect(b.blocks).toHaveLength(a.blocks.length);
    for (let i = 0; i < a.blocks.length; i++) {
      const x = a.blocks[i], y = b.blocks[i];
      expect(y.ln1Gamma).toEqual(x.ln1Gamma);
      expect(y.ln1Beta).toEqual(x.ln1Beta);
      expect(y.wQKV).toEqual(x.wQKV);
      expect(y.wAttnOut).toEqual(x.wAttnOut);
      expect(y.ln2Gamma).toEqual(x.ln2Gamma);
      expect(y.ln2Beta).toEqual(x.ln2Beta);
      expect(y.wFFN1).toEqual(x.wFFN1);
      expect(y.wFFN2).toEqual(x.wFFN2);
    }
  });

  it('rejects a flat buffer whose length does not match the config', () => {
    const flat = new Float32Array(paramElementCount(M18_CONFIG) - 1);
    expect(() => unflattenParams(flat, M18_CONFIG)).toThrow(/expected/);
  });
});

describe('writeCheckpoint / readCheckpoint', () => {
  it('round-trips meta + params with bit-equal floats', async () => {
    const params = seededInitWeights(M18_CONFIG, 'hamlet');
    const meta = makeMeta();
    const blob = writeCheckpoint(params, meta);

    // header (512) + 206016 floats * 4 bytes = 824576
    expect(blob.size).toBe(HEADER_BYTES + paramElementCount(M18_CONFIG) * 4);

    const buf = await blob.arrayBuffer();
    const { meta: meta2, params: params2 } = readCheckpoint(buf, M18_CONFIG);

    expect(meta2).toEqual(meta);
    expect(params2.wte).toEqual(params.wte);
    expect(params2.blocks[0].wQKV).toEqual(params.blocks[0].wQKV);
    expect(params2.blocks[3].wFFN2).toEqual(params.blocks[3].wFFN2);
  });

  it('rejects a wrong-magic header', async () => {
    const params = seededInitWeights(M18_CONFIG, 'x');
    // @ts-expect-error: deliberately wrong magic to test the guard
    const meta = makeMeta({ format: 'tinker-m18-v0' });
    expect(() => writeCheckpoint(params, meta)).toThrow(/format/);
  });

  it('rejects a config mismatch on read', async () => {
    const params = seededInitWeights(M18_CONFIG, 'x');
    const blob = writeCheckpoint(params, makeMeta());
    const buf = await blob.arrayBuffer();
    const wrongCfg = { ...M18_CONFIG, dModel: 128 };
    expect(() => readCheckpoint(buf, wrongCfg)).toThrow(/dModel/);
  });

  it('rejects a truncated buffer', async () => {
    const params = seededInitWeights(M18_CONFIG, 'x');
    const blob = writeCheckpoint(params, makeMeta());
    const buf = await blob.arrayBuffer();
    const truncated = buf.slice(0, buf.byteLength - 4);
    expect(() => readCheckpoint(truncated, M18_CONFIG)).toThrow(/bytes/);
  });
});

describe('determinism: twin-seed produces byte-identical .bin', () => {
  it('same seed string → byte-identical flattened weights', () => {
    const a = flattenParams(seededInitWeights(M18_CONFIG, 'hamlet'), M18_CONFIG);
    const b = flattenParams(seededInitWeights(M18_CONFIG, 'hamlet'), M18_CONFIG);
    expect(a.byteLength).toBe(b.byteLength);
    // Compare byte-by-byte at the underlying buffer level.
    const aU8 = new Uint8Array(a.buffer);
    const bU8 = new Uint8Array(b.buffer);
    for (let i = 0; i < aU8.length; i++) {
      if (aU8[i] !== bU8[i]) throw new Error(`twin diverges at byte ${i}`);
    }
  });

  it('seed differing by one character → diverges almost everywhere', () => {
    const a = flattenParams(seededInitWeights(M18_CONFIG, 'hamlet'), M18_CONFIG);
    const b = flattenParams(seededInitWeights(M18_CONFIG, 'Hamlet'), M18_CONFIG);
    // Not byte-identical: expect divergence in the vast majority of bytes.
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    expect(diff / a.length).toBeGreaterThan(0.99);
  });

  it('same seed → byte-identical .bin checkpoint', async () => {
    const meta = makeMeta();
    const a = await writeCheckpoint(seededInitWeights(M18_CONFIG, 'hamlet'), meta).arrayBuffer();
    const b = await writeCheckpoint(seededInitWeights(M18_CONFIG, 'hamlet'), meta).arrayBuffer();
    expect(a.byteLength).toBe(b.byteLength);
    const aU8 = new Uint8Array(a), bU8 = new Uint8Array(b);
    for (let i = 0; i < aU8.length; i++) {
      if (aU8[i] !== bU8[i]) throw new Error(`bin diverges at byte ${i}`);
    }
  });
});

describe('vocabHash', () => {
  it('produces a stable 64-char hex digest', async () => {
    const h = await vocabHash('\n !$&\',-.3:;?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different vocabs → different hashes', async () => {
    const a = await vocabHash('abc');
    const b = await vocabHash('abd');
    expect(a).not.toBe(b);
  });
});
