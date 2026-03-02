import { describe, it, expect } from 'vitest';
import { SessionScorerService } from '../session-scorer.service';

describe('SessionScorerService', () => {
  const scorer = new SessionScorerService();

  it('calculateScore — counts correct answers', () => {
    expect(scorer.calculateScore([{ is_correct: true }, { is_correct: false }, { is_correct: true }])).toBe(2);
    expect(scorer.calculateScore([])).toBe(0);
  });

  it('calculatePercentage — handles zero total', () => {
    expect(scorer.calculatePercentage(0, 0)).toBe(0);
    expect(scorer.calculatePercentage(17, 20)).toBe(85);
    expect(scorer.calculatePercentage(7, 20)).toBe(35);
  });

  it('getBand — correct thresholds', () => {
    expect(scorer.getBand(85)).toBe('Excellent');
    expect(scorer.getBand(84)).toBe('Good');
    expect(scorer.getBand(70)).toBe('Good');
    expect(scorer.getBand(69)).toBe('Fair');
    expect(scorer.getBand(50)).toBe('Fair');
    expect(scorer.getBand(49)).toBe('Needs Revision');
    expect(scorer.getBand(0)).toBe('Needs Revision');
  });

  it('shouldTriggerWeaknessReport — triggers at <70% AND >=3 sessions', () => {
    expect(scorer.shouldTriggerWeaknessReport(65, 3)).toBe(true);
    expect(scorer.shouldTriggerWeaknessReport(65, 2)).toBe(false);
    expect(scorer.shouldTriggerWeaknessReport(75, 5)).toBe(false);
    expect(scorer.shouldTriggerWeaknessReport(69.9, 3)).toBe(true);
  });

  it('getChapterBreakdown — groups correctly', () => {
    const answers = [
      { is_correct: true, chapter_id: 'ch1', chapter_title: 'Kinematics' },
      { is_correct: false, chapter_id: 'ch1', chapter_title: 'Kinematics' },
      { is_correct: true, chapter_id: 'ch2', chapter_title: 'Dynamics' },
    ];
    const breakdown = scorer.getChapterBreakdown(answers);
    expect(breakdown).toHaveLength(2);
    const ch1 = breakdown.find((b) => b.chapter_id === 'ch1')!;
    expect(ch1.score).toBe(1);
    expect(ch1.out_of).toBe(2);
  });
});
