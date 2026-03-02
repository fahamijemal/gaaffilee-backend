import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaSessionRepository } from '../../infrastructure/prisma-session.repository';
import { SessionScorerService } from '../../core/session-scorer.service';
import { SessionStateService } from '../../core/session-state.service';

@Injectable()
export class CompleteSessionUseCase {
  private scorer = new SessionScorerService();
  private stateService = new SessionStateService();

  constructor(private sessionRepo: PrismaSessionRepository) {}

  async execute(sessionId: string, userId: string) {
    const session = await this.sessionRepo.findSessionWithOwnerCheck(sessionId, userId);
    try { this.stateService.assertInProgress(session.status); }
    catch { throw new UnprocessableEntityException({ error_code: 'QUIZ_ALREADY_COMPLETE', message: 'Session already completed.' }); }

    const rawAnswers = await this.sessionRepo.getAnswersForSession(sessionId);
    const answers = rawAnswers.map((a) => ({
      is_correct: a.is_correct,
      chapter_id: a.question?.chapter_id,
      chapter_title: a.question?.chapter?.title,
      time_taken_sec: a.time_taken_sec,
    }));

    const score = this.scorer.calculateScore(answers);
    const percentage = this.scorer.calculatePercentage(score, session.total_questions);
    const band = this.scorer.getBand(percentage);
    const chapter_breakdown = this.scorer.getChapterBreakdown(answers);
    const total_time_sec = this.scorer.calculateTotalTimeSec(answers);
    const avg_time_per_q_sec = session.total_questions > 0 ? Math.round(total_time_sec / session.total_questions) : 0;

    const completedCount = await this.sessionRepo.getCompletedSessionCount(userId, session.subject_id);
    const shouldTrigger = this.scorer.shouldTriggerWeaknessReport(percentage, completedCount + 1);

    await this.sessionRepo.updateSession(sessionId, {
      status: 'completed',
      score,
      percentage,
      band,
      total_time_sec,
      completed_at: new Date(),
      weakness_report_status: shouldTrigger ? 'pending' : null,
    });

    return {
      session_id: sessionId,
      score,
      total_questions: session.total_questions,
      percentage,
      band,
      total_time_sec,
      avg_time_per_q_sec,
      chapter_breakdown,
      weakness_analysis_pending: shouldTrigger,
    };
  }
}
