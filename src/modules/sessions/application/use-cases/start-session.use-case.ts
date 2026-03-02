import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaSessionRepository } from '../../infrastructure/prisma-session.repository';
import { QuestionRepositoryPort } from '../../../questions/core/ports/question.repository.port';
import { QuestionShuffleService } from '../../../questions/core/question-shuffle.service';
import { EXAM_SIMULATION_SECONDS_PER_QUESTION } from '../../../../config/constants';

@Injectable()
export class StartSessionUseCase {
  private shuffleService = new QuestionShuffleService();

  constructor(
    private sessionRepo: PrismaSessionRepository,
    private questionRepo: QuestionRepositoryPort,
  ) {}

  async execute(userId: string, dto: any) {
    if (dto.study_mode === 'exam_simulation' && dto.quiz_mode !== 'timed') {
      throw new UnprocessableEntityException({ error_code: 'VALIDATION_ERROR', message: 'Exam simulation requires timed quiz_mode.' });
    }
    if (dto.study_mode === 'chapter_based' && !dto.chapter_id) {
      throw new UnprocessableEntityException({ error_code: 'VALIDATION_ERROR', message: 'chapter_id required for chapter_based mode.' });
    }
    if (dto.study_mode === 'year_based' && !dto.exam_year) {
      throw new UnprocessableEntityException({ error_code: 'VALIDATION_ERROR', message: 'exam_year required for year_based mode.' });
    }

    const allQuestions = await this.questionRepo.findFiltered({
      subjectId: dto.subject_id,
      studyMode: dto.study_mode,
      count: dto.question_count,
      grade: dto.grade,
      chapterId: dto.chapter_id,
      examYear: dto.exam_year,
      difficulty: dto.difficulty,
    });

    const seed = this.shuffleService.generateSeed();
    const shuffled = this.shuffleService.shuffleArray(allQuestions, seed);

    const session = await this.sessionRepo.createSession({
      user_id: userId,
      subject_id: dto.subject_id,
      chapter_id: dto.chapter_id || null,
      grade: dto.grade,
      exam_year: dto.exam_year || null,
      study_mode: dto.study_mode,
      quiz_mode: dto.quiz_mode,
      total_questions: shuffled.length,
      started_at: new Date(),
    });

    const delivery = shuffled.map(({ correct_answer, explanation, ...q }) => q);

    return {
      session_id: session.id,
      status: session.status,
      total_questions: session.total_questions,
      timer_per_question: dto.study_mode === 'exam_simulation' ? EXAM_SIMULATION_SECONDS_PER_QUESTION : 0,
      ai_hints_remaining: parseInt(process.env.AI_CALLS_PER_SESSION || '3', 10),
      started_at: session.started_at,
      questions: delivery,
    };
  }
}
