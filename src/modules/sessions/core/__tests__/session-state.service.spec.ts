import { describe, it, expect } from 'vitest';
import { SessionStateService } from '../session-state.service';

describe('SessionStateService', () => {
  const service = new SessionStateService();

  describe('assertInProgress', () => {
    it('does not throw when status is in_progress', () => {
      expect(() => service.assertInProgress('in_progress')).not.toThrow();
    });

    it('throws when status is completed', () => {
      expect(() => service.assertInProgress('completed')).toThrow('QUIZ_ALREADY_COMPLETE');
    });

    it('throws when status is abandoned', () => {
      expect(() => service.assertInProgress('abandoned')).toThrow('QUIZ_ALREADY_COMPLETE');
    });
  });

  describe('assertCompleted', () => {
    it('does not throw when status is completed', () => {
      expect(() => service.assertCompleted('completed')).not.toThrow();
    });

    it('throws when status is in_progress', () => {
      expect(() => service.assertCompleted('in_progress')).toThrow('SESSION_NOT_COMPLETE');
    });

    it('throws when status is abandoned', () => {
      expect(() => service.assertCompleted('abandoned')).toThrow('SESSION_NOT_COMPLETE');
    });
  });

  describe('canSkip', () => {
    it('returns true for practice mode', () => {
      expect(service.canSkip('year_based')).toBe(true);
    });

    it('returns true for chapter_based mode', () => {
      expect(service.canSkip('chapter_based')).toBe(true);
    });

    it('returns false for exam_simulation mode', () => {
      expect(service.canSkip('exam_simulation')).toBe(false);
    });
  });
});
