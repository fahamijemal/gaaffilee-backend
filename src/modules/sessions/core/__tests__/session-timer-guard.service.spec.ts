import { describe, it, expect } from 'vitest';
import { SessionTimerGuardService } from '../session-timer-guard.service';

describe('SessionTimerGuardService', () => {
  const guard = new SessionTimerGuardService();

  it('does not throw for non-exam modes', () => {
    const started = new Date(Date.now() - 999999);
    expect(() => guard.assertAnswerOnTime('practice', started, 0)).not.toThrow();
    expect(() => guard.assertAnswerOnTime('year_based', started, 0)).not.toThrow();
    expect(() => guard.assertAnswerOnTime('chapter_based', started, 0)).not.toThrow();
  });

  it('does not throw when within allowed time for exam_simulation', () => {
    const started = new Date(Date.now() - 50000); // 50s ago, Q0 allows 95s
    expect(() => guard.assertAnswerOnTime('exam_simulation', started, 0)).not.toThrow();
  });

  it('throws SESSION_EXPIRED when deadline exceeded in exam_simulation', () => {
    const started = new Date(Date.now() - 200000); // 200s ago, Q0 allows only 95s
    expect(() => guard.assertAnswerOnTime('exam_simulation', started, 0)).toThrow('SESSION_EXPIRED');
  });

  it('allows later questions proportionally more time', () => {
    // Q4 (index 4) allows (4+1)*90 + 5 = 455 seconds
    const started = new Date(Date.now() - 400000); // 400s ago — within limit
    expect(() => guard.assertAnswerOnTime('exam_simulation', started, 4)).not.toThrow();
  });
});
