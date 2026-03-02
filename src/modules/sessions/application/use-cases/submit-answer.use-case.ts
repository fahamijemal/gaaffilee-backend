import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaSessionRepository } from '../../infrastructure/prisma-session.repository';
import { QuestionRepositoryPort } from '../../../questions/core/ports/question.repository.port';
import { SessionTimerGuardService } from '../../core/session-timer-guard.service';
import { SessionStateService } from '../../core/session-state.service';

@Injectable()
export class SubmitAnswerUseCase {
  private timerGuard = new SessionTimerGuardService();
  private stateService = new SessionStateService();

  constructor(
    private sessionRepo: PrismaSessionRepository,
    private questionRepo: QuestionRepositoryPort,
  ) {}

  async execute(sessionId: string, userId: string, dto: any) {
    const session = await this.sessionRepo.findSessionWithOwnerCheck(sessionId, userId);

    try { this.stateService.assertInProgress(session.status); }
    catch { throw new UnprocessableEntityException({ error_code: 'QUIZ_ALREADY_COMPLETE', message: 'Session already completed.' }); }

    // Auto-submitted null answers bypass timer (client timer expiry)
    if (dto.selected !== null) {
      const questionIndex = session.answers.length;
      try {
        this.timerGuard.assertAnswerOnTime(session.study_mode, session.started_at, questionIndex);
      } catch {
        throw new UnprocessableEntityException({ error_code: 'SESSION_EXPIRED', message: 'Answer submitted after the allowed time window for Exam Simulation.' });
      }
    }

    const question = await this.questionRepo.findById(dto.question_id);
    if (!question) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Question not found.' });

    const is_correct = dto.selected !== null && dto.selected === question.correct_answer;
    const is_timed_out = dto.selected === null;

    await this.sessionRepo.upsertAnswer({
      session_id: sessionId,
      question_id: dto.question_id,
      selected: dto.selected,
      is_correct,
      is_skipped: false,
      is_timed_out,
      ai_hint_used: dto.ai_hint_used || false,
      time_taken_sec: dto.time_taken_sec || 0,
    });

    const answers = await this.sessionRepo.getAnswersForSession(sessionId);
    const questions_remaining = session.total_questions - answers.length;
    const session_score_so_far = answers.filter((a) => a.is_correct).length;

    const isExamSim = session.study_mode === 'exam_simulation';
    return {
      is_correct,
      correct_answer: isExamSim ? null : question.correct_answer,
      explanation: isExamSim ? null : (question.explanation || null),
      explanation_source: question.explanation ? 'database' : null,
      questions_remaining: Math.max(0, questions_remaining),
      session_score_so_far,
    };
  }
}
