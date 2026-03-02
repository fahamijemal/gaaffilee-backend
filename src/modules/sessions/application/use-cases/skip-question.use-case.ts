import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaSessionRepository } from '../../infrastructure/prisma-session.repository';
import { SessionStateService } from '../../core/session-state.service';

@Injectable()
export class SkipQuestionUseCase {
  private stateService = new SessionStateService();

  constructor(private sessionRepo: PrismaSessionRepository) {}

  async execute(sessionId: string, userId: string, questionId: string) {
    const session = await this.sessionRepo.findSessionWithOwnerCheck(sessionId, userId);

    try { this.stateService.assertInProgress(session.status); }
    catch { throw new UnprocessableEntityException({ error_code: 'QUIZ_ALREADY_COMPLETE', message: 'Session already completed.' }); }

    if (!this.stateService.canSkip(session.study_mode)) {
      throw new UnprocessableEntityException({ error_code: 'SKIP_NOT_ALLOWED', message: 'Questions cannot be skipped in Exam Simulation mode.' });
    }

    await this.sessionRepo.upsertAnswer({
      session_id: sessionId, question_id: questionId,
      selected: null, is_correct: false, is_skipped: true,
      is_timed_out: false, ai_hint_used: false, time_taken_sec: 0,
    });

    const answers = await this.sessionRepo.getAnswersForSession(sessionId);
    const questions_remaining = Math.max(0, session.total_questions - answers.length);

    return {
      skipped_question_id: questionId,
      questions_remaining,
      next_question_index: answers.length,
    };
  }
}
