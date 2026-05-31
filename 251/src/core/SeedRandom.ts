export class SeedRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hash(seed);
  }

  private hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return (this.seed % 1000000007) / 1000000007;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }

  nextColor(): string {
    const r = Math.floor(this.next() * 255);
    const g = Math.floor(this.next() * 255);
    const b = Math.floor(this.next() * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  nextColorInRange(baseColor: string, variance: number = 30): string {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    const clamp = (val: number) => Math.max(0, Math.min(255, val));
    
    const newR = clamp(r + this.nextInt(-variance, variance));
    const newG = clamp(g + this.nextInt(-variance, variance));
    const newB = clamp(b + this.nextInt(-variance, variance));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
}

export function generateRandomSeed(): string {
  return Math.random().toString(36).substring(2, 15);
}
