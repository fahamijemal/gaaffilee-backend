import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaSessionRepository } from '../../infrastructure/prisma-session.repository';
import { SessionStateService } from '../../core/session-state.service';

@Injectable()
export class GetReviewUseCase {
  private stateService = new SessionStateService();

  constructor(private sessionRepo: PrismaSessionRepository) {}

  async execute(sessionId: string, userId: string) {
    const session = await this.sessionRepo.findSessionWithOwnerCheck(sessionId, userId);
    try { this.stateService.assertCompleted(session.status); }
    catch { throw new UnprocessableEntityException({ error_code: 'SESSION_NOT_COMPLETE', message: 'Review is only available for completed sessions.' }); }

    const answers = await this.sessionRepo.getAnswersForSession(sessionId);

    return {
      session_id: sessionId,
      answers: answers.map((a) => ({
        question_id: a.question_id,
        question_text: (a.question as any)?.question_text || '',
        options: [
          { key: 'A', text: (a.question as any)?.option_a || '' },
          { key: 'B', text: (a.question as any)?.option_b || '' },
          { key: 'C', text: (a.question as any)?.option_c || '' },
          { key: 'D', text: (a.question as any)?.option_d || '' },
        ],
        selected: a.selected,
        correct_answer: a.question?.correct_answer,
        is_correct: a.is_correct,
        explanation: a.question?.explanation,
        time_taken_sec: a.time_taken_sec,
        ai_hint_used: a.ai_hint_used,
        chapter_title: a.question?.chapter?.title,
      })),
    };
  }
}
