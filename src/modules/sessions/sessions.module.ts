import { Module } from '@nestjs/common';
import { SessionsController } from './presentation/sessions.controller';
import { StartSessionUseCase } from './application/use-cases/start-session.use-case';
import { SubmitAnswerUseCase } from './application/use-cases/submit-answer.use-case';
import { SkipQuestionUseCase } from './application/use-cases/skip-question.use-case';
import { CompleteSessionUseCase } from './application/use-cases/complete-session.use-case';
import { GetReviewUseCase } from './application/use-cases/get-review.use-case';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [QuestionsModule],
  controllers: [SessionsController],
  providers: [
    PrismaSessionRepository,
    StartSessionUseCase,
    SubmitAnswerUseCase,
    SkipQuestionUseCase,
    CompleteSessionUseCase,
    GetReviewUseCase,
  ],
  exports: [PrismaSessionRepository],
})
export class SessionsModule {}
