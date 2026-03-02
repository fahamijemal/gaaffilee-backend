import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaSessionRepository {
  constructor(private prisma: PrismaService) {}

  async createSession(data: any) {
    return this.prisma.quizSession.create({ data });
  }

  async findSessionById(id: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id },
      include: { answers: true, subject: { select: { name: true, slug: true } } },
    });
    if (!session) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Session not found.' });
    return session;
  }

  async findSessionWithOwnerCheck(id: string, userId: string) {
    const session = await this.findSessionById(id);
    if (session.user_id !== userId) {
      throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Session not found.' });
    }
    return session;
  }

  async upsertAnswer(data: {
    session_id: string; question_id: string; selected: string | null;
    is_correct: boolean; is_skipped: boolean; is_timed_out: boolean;
    ai_hint_used: boolean; time_taken_sec: number;
  }) {
    return this.prisma.quizAnswer.upsert({
      where: { uq_answer_session_question: { session_id: data.session_id, question_id: data.question_id } },
      update: { selected: data.selected, is_correct: data.is_correct, is_timed_out: data.is_timed_out, ai_hint_used: data.ai_hint_used, time_taken_sec: data.time_taken_sec },
      create: data,
    });
  }

  async getAnswersForSession(sessionId: string) {
    return this.prisma.quizAnswer.findMany({
      where: { session_id: sessionId },
      include: {
        question: {
          select: {
            chapter_id: true, correct_answer: true, explanation: true,
            question_text: true, option_a: true, option_b: true, option_c: true, option_d: true,
            chapter: { select: { title: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async updateSession(id: string, data: any) {
    return this.prisma.quizSession.update({ where: { id }, data });
  }

  async listUserSessions(userId: string, filters: any, limit: number, cursor?: string) {
    const where: any = { user_id: userId };
    if (filters.subject_id) where.subject_id = filters.subject_id;
    if (filters.study_mode) where.study_mode = filters.study_mode;
    const sessions = await this.prisma.quizSession.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { created_at: 'desc' },
      include: { subject: { select: { name: true } } },
    });
    const hasMore = sessions.length > limit;
    if (hasMore) sessions.pop();
    return { sessions, hasMore, nextCursor: hasMore ? sessions[sessions.length - 1]?.id : null };
  }

  async getCompletedSessionCount(userId: string, subjectId: string): Promise<number> {
    return this.prisma.quizSession.count({
      where: { user_id: userId, subject_id: subjectId, status: 'completed' },
    });
  }
}
