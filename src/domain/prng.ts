export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof mulberry32>

export const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]
export const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min)
