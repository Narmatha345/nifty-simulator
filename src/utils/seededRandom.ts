/**
 * Deterministic PRNG (mulberry32) — lets an optional Random Seed reproduce
 * the exact same synthetic market run. Only supplies a different randomness
 * source to the existing generators' own optional `rng` parameter; the
 * NIFTY/VIX sampling algorithms themselves are untouched.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
