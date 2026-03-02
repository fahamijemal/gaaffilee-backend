import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QuestionFilterParams, QuestionRepositoryPort, QuestionWithAnswer } from '../core/ports/question.repository.port';
import { QuestionFilterService } from '../core/question-filter.service';

@Injectable()
export class PrismaQuestionRepository extends QuestionRepositoryPort {
  private filterService = new QuestionFilterService();

  constructor(private prisma: PrismaService) { super(); }

  async findFiltered(params: QuestionFilterParams): Promise<QuestionWithAnswer[]> {
    const where = this.filterService.buildWhereClause(params);
    const questions = await this.prisma.question.findMany({
      where,
      take: params.count === 0 ? undefined : params.count,
      select: {
        id: true, question_text: true,
        option_a: true, option_b: true, option_c: true, option_d: true,
        correct_answer: true, explanation: true,
        subject_id: true, chapter_id: true,
        grade: true, exam_year: true,
        chapter: { select: { title: true } },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      options: [
        { key: 'A', text: q.option_a },
        { key: 'B', text: q.option_b },
        { key: 'C', text: q.option_c },
        { key: 'D', text: q.option_d },
      ],
      subject_id: q.subject_id,
      chapter_id: q.chapter_id,
      chapter_name: q.chapter.title,
      grade: q.grade,
      exam_year: q.exam_year,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));
  }

  async findById(id: string): Promise<QuestionWithAnswer | null> {
    const q = await this.prisma.question.findUnique({
      where: { id },
      select: {
        id: true, question_text: true,
        option_a: true, option_b: true, option_c: true, option_d: true,
        correct_answer: true, explanation: true,
        subject_id: true, chapter_id: true,
        grade: true, exam_year: true,
        chapter: { select: { title: true } },
      },
    });
    if (!q) return null;
    return {
      id: q.id,
      question_text: q.question_text,
      options: [
        { key: 'A', text: q.option_a },
        { key: 'B', text: q.option_b },
        { key: 'C', text: q.option_c },
        { key: 'D', text: q.option_d },
      ],
      subject_id: q.subject_id,
      chapter_id: q.chapter_id,
      chapter_name: q.chapter.title,
      grade: q.grade,
      exam_year: q.exam_year,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    };
  }
}
