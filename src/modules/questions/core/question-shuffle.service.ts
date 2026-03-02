export class QuestionShuffleService {
  shuffleArray<T>(arr: T[], seed?: string): T[] {
    const result = [...arr];
    const rand = seed ? this.seededRandom(seed) : () => Math.random();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private seededRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
    }
    return () => {
      hash = (Math.imul(1664525, hash) + 1013904223) | 0;
      return (hash >>> 0) / 4294967296;
    };
  }

  generateSeed(): string {
    return Math.random().toString(36).substring(2, 8);
  }
}
