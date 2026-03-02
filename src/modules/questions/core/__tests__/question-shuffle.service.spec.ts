import { describe, it, expect } from 'vitest';
import { QuestionShuffleService } from '../question-shuffle.service';

describe('QuestionShuffleService', () => {
  const shuffler = new QuestionShuffleService();

  it('returns same length array', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffler.shuffleArray(arr)).toHaveLength(5);
  });

  it('contains all original elements', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const shuffled = shuffler.shuffleArray([...arr]);
    expect([...shuffled].sort()).toEqual([...arr].sort());
  });

  it('is deterministic with the same seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffler.shuffleArray(arr, 'abc123')).toEqual(shuffler.shuffleArray(arr, 'abc123'));
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    const original = [...arr];
    shuffler.shuffleArray(arr);
    expect(arr).toEqual(original);
  });
});
