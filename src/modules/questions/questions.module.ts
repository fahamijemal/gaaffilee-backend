import { Module } from '@nestjs/common';
import { QuestionsController } from './presentation/questions.controller';
import { PrismaQuestionRepository } from './infrastructure/prisma-question.repository';
import { QuestionRepositoryPort } from './core/ports/question.repository.port';

@Module({
  controllers: [QuestionsController],
  providers: [
    { provide: QuestionRepositoryPort, useClass: PrismaQuestionRepository },
  ],
  exports: [QuestionRepositoryPort],
})
export class QuestionsModule {}
