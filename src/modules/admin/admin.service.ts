import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NavigationService } from '../navigation/navigation.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private navService: NavigationService,
  ) {}

  // ── Questions ─────────────────────────────────────────────────────────────
  async listQuestions(filters: any, limit: number, cursor?: string) {
    const where: any = {};
    if (filters.subject_id) where.subject_id = filters.subject_id;
    if (filters.status) where.status = filters.status;
    if (filters.grade) where.grade = Number(filters.grade);
    const total = await this.prisma.question.count({ where });
    const questions = await this.prisma.question.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { created_at: 'desc' },
      include: { subject: { select: { name: true } }, chapter: { select: { title: true } } },
    });
    const hasMore = questions.length > limit;
    if (hasMore) questions.pop();
    return { questions, hasMore, nextCursor: hasMore ? questions[questions.length - 1]?.id : null, total };
  }

  async getQuestion(id: string) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: { subject: { select: { name: true } }, chapter: { select: { title: true } } },
    });
    if (!q) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Question not found.' });
    return q;
  }

  async createQuestion(dto: any, createdBy: string) {
    const existing = await this.prisma.question.findFirst({
      where: { subject_id: dto.subject_id, exam_year: dto.exam_year, question_text: dto.question_text, status: { not: 'archived' } },
    });
    if (existing) throw new ConflictException({ error_code: 'DUPLICATE_QUESTION', message: 'A similar question already exists.' });
    const q = await this.prisma.question.create({ data: { ...dto, created_by: createdBy } });
    await this.navService.invalidateCache();
    return q;
  }

  async updateQuestion(id: string, dto: any) {
    const existing = await this.getQuestion(id);
    const answerCount = await this.prisma.quizAnswer.count({ where: { question_id: id } });
    if (answerCount > 0 && (dto.question_text || dto.option_a || dto.option_b || dto.option_c || dto.option_d || dto.correct_answer)) {
      // Immutable update — archive and replace
      await this.prisma.question.update({ where: { id }, data: { status: 'archived' } });
      const newQ = await this.prisma.question.create({
        data: {
          subject_id: existing.subject_id,
          chapter_id: existing.chapter_id,
          grade: existing.grade,
          exam_year: existing.exam_year,
          question_text: dto.question_text || existing.question_text,
          option_a: dto.option_a || existing.option_a,
          option_b: dto.option_b || existing.option_b,
          option_c: dto.option_c || existing.option_c,
          option_d: dto.option_d || existing.option_d,
          correct_answer: dto.correct_answer || existing.correct_answer,
          explanation: dto.explanation !== undefined ? dto.explanation : existing.explanation,
          difficulty: dto.difficulty || existing.difficulty,
          status: dto.status || 'active',
          created_by: existing.created_by,
        },
      });
      return { ...newQ, _note: 'Question had existing answers — archived and replaced with new ID.' };
    }
    return this.prisma.question.update({ where: { id }, data: dto });
  }

  async updateQuestionStatus(id: string, status: string) {
    return this.prisma.question.update({ where: { id }, data: { status: status as any } });
  }

  async archiveQuestion(id: string) {
    return this.prisma.question.update({ where: { id }, data: { status: 'archived' } });
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  async listUsers(filters: any, limit: number, cursor?: string) {
    const where: any = {};
    if (filters.role) where.role = filters.role;
    const users = await this.prisma.user.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { created_at: 'desc' },
      select: { id: true, name: true, email: true, role: true, grade: true, stream: true, is_active: true, created_at: true },
    });
    const hasMore = users.length > limit;
    if (hasMore) users.pop();
    return { users, hasMore, nextCursor: hasMore ? users[users.length - 1]?.id : null };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, grade: true, stream: true, is_active: true, school: true, created_at: true },
    });
    if (!user) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'User not found.' });
    const sessionStats = await this.prisma.quizSession.aggregate({
      where: { user_id: id, status: 'completed' },
      _count: { id: true },
      _avg: { percentage: true },
    });
    return { ...user, sessions_count: sessionStats._count.id, avg_percentage: sessionStats._avg.percentage };
  }

  async updateUserRole(id: string, role: string) {
    return this.prisma.user.update({ where: { id }, data: { role: role as any }, select: { id: true, name: true, email: true, role: true } });
  }

  async toggleSuspend(id: string, suspend: boolean) {
    return this.prisma.user.update({ where: { id }, data: { is_active: !suspend }, select: { id: true, name: true, is_active: true } });
  }

  // ── Chapters ──────────────────────────────────────────────────────────────
  async listChapters(filters: any) {
    const where: any = {};
    if (filters.subject_id) where.subject_id = filters.subject_id;
    if (filters.grade) where.grade = Number(filters.grade);
    return this.prisma.chapter.findMany({
      where,
      orderBy: [{ grade: 'asc' }, { chapter_number: 'asc' }],
      include: { _count: { select: { questions: { where: { status: 'active' } } } } },
    });
  }

  async createChapter(dto: any) {
    const chapter = await this.prisma.chapter.create({ data: dto });
    await this.navService.invalidateCache();
    return chapter;
  }

  async updateChapter(id: string, dto: any) {
    const chapter = await this.prisma.chapter.update({ where: { id }, data: dto });
    await this.navService.invalidateCache();
    return chapter;
  }

  async deleteChapter(id: string) {
    const activeQs = await this.prisma.question.count({ where: { chapter_id: id, status: 'active' } });
    if (activeQs > 0) throw new ConflictException({ error_code: 'CONFLICT', message: 'Cannot delete chapter with active questions.' });
    return this.prisma.chapter.delete({ where: { id } });
  }

  async reorderChapters(items: { id: string; chapter_number: number }[]) {
    await Promise.all(items.map((item) => this.prisma.chapter.update({ where: { id: item.id }, data: { chapter_number: item.chapter_number } })));
    await this.navService.invalidateCache();
    return { reordered: items.length };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  async getAnalyticsOverview() {
    const [users, sessions, questions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.quizSession.count({ where: { status: 'completed' } }),
      this.prisma.question.count({ where: { status: 'active' } }),
    ]);
    return { total_users: users, total_completed_sessions: sessions, total_active_questions: questions };
  }

  async getMostMissed() {
    return this.prisma.$queryRaw<any[]>`
      SELECT q.id AS question_id, LEFT(q.question_text, 100) AS question_text,
             c.title AS chapter_title, s.name AS subject,
             COUNT(qa.id) AS total_attempts,
             ROUND(AVG(CASE WHEN qa.is_correct THEN 0.0 ELSE 100.0 END)::numeric, 1) AS error_pct
      FROM quiz_answers qa
      JOIN questions q ON qa.question_id = q.id
      JOIN chapters c ON q.chapter_id = c.id
      JOIN subjects s ON q.subject_id = s.id
      WHERE q.status = 'active'
      GROUP BY q.id, q.question_text, c.title, s.name
      HAVING COUNT(qa.id) >= 10
      ORDER BY error_pct DESC
      LIMIT 20
    `;
  }

  async getSubjectAverages() {
    return this.prisma.$queryRaw<any[]>`
      SELECT s.name AS subject, s.id AS subject_id,
             ROUND(AVG(qs.percentage)::numeric, 1) AS avg_pct,
             COUNT(qs.id) AS session_count
      FROM quiz_sessions qs
      JOIN subjects s ON qs.subject_id = s.id
      WHERE qs.status = 'completed'
      GROUP BY s.id, s.name
      ORDER BY avg_pct DESC
    `;
  }

  async getAiUsage() {
    return this.prisma.$queryRaw<any[]>`
      SELECT DATE(completed_at) AS date, SUM(ai_calls_used) AS total_ai_calls
      FROM quiz_sessions
      WHERE completed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
    `;
  }

  async getActivityStats() {
    return this.prisma.$queryRaw<any[]>`
      SELECT DATE(created_at) AS date,
             COUNT(DISTINCT user_id) AS dau,
             COUNT(id) AS sessions
      FROM quiz_sessions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
  }
}
