import seedrandom from 'seedrandom';

export class SeededRandom {
  private rng: () => number;

  constructor(seed: string) {
    this.rng = seedrandom(seed);
  }

  /**
   * Generates a random float in the range [0, 1)
   */
  next(): number {
    return this.rng();
  }

  /**
   * Generates a random integer in the range [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    const minVal = Math.ceil(min);
    const maxVal = Math.floor(max);
    return Math.floor(this.rng() * (maxVal - minVal + 1)) + minVal;
  }

  /**
   * Generates a random float in the range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.rng() * (max - min) + min;
  }

  /**
   * Selects a random element from an array
   */
  pick<T>(arr: T[]): T {
    const idx = this.nextInt(0, arr.length - 1);
    return arr[idx];
  }
}

export function createRng(seed: string): SeededRandom {
  return new SeededRandom(seed);
}
