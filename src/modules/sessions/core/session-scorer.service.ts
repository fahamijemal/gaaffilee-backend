// Pure TypeScript — NO NestJS, NO Prisma imports
import { PERFORMANCE_BANDS, WEAKNESS_TRIGGER_MIN_SESSIONS, WEAKNESS_TRIGGER_MAX_PCT } from '../../../config/constants';

export interface AnswerRecord {
  is_correct: boolean;
  chapter_id?: string;
  chapter_title?: string;
  time_taken_sec?: number;
}

export class SessionScorerService {
  calculateScore(answers: AnswerRecord[]): number {
    return answers.filter((a) => a.is_correct).length;
  }

  calculatePercentage(score: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((score / total) * 1000) / 10;
  }

  getBand(percentage: number): string {
    if (percentage >= PERFORMANCE_BANDS.EXCELLENT.min) return PERFORMANCE_BANDS.EXCELLENT.label;
    if (percentage >= PERFORMANCE_BANDS.GOOD.min) return PERFORMANCE_BANDS.GOOD.label;
    if (percentage >= PERFORMANCE_BANDS.FAIR.min) return PERFORMANCE_BANDS.FAIR.label;
    return PERFORMANCE_BANDS.NEEDS_REVISION.label;
  }

  getChapterBreakdown(answers: AnswerRecord[]): { chapter_id: string; chapter_title: string; score: number; out_of: number }[] {
    const map = new Map<string, { chapter_title: string; correct: number; total: number }>();
    for (const a of answers) {
      if (!a.chapter_id) continue;
      const existing = map.get(a.chapter_id) || { chapter_title: a.chapter_title || '', correct: 0, total: 0 };
      existing.total += 1;
      if (a.is_correct) existing.correct += 1;
      map.set(a.chapter_id, existing);
    }
    return Array.from(map.entries()).map(([chapter_id, v]) => ({
      chapter_id, chapter_title: v.chapter_title, score: v.correct, out_of: v.total,
    }));
  }

  shouldTriggerWeaknessReport(percentage: number, completedSessionCount: number): boolean {
    return percentage < WEAKNESS_TRIGGER_MAX_PCT && completedSessionCount >= WEAKNESS_TRIGGER_MIN_SESSIONS;
  }

  calculateTotalTimeSec(answers: AnswerRecord[]): number {
    return answers.reduce((sum, a) => sum + (a.time_taken_sec || 0), 0);
  }
}
