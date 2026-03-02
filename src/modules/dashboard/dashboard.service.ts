import { Injectable } from '@nestjs/common';
import { Prisma, StudyMode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type HistoryFilters = {
  subject_id?: string;
  study_mode?: string;
};

type HistorySession = {
  id: string;
  subject_id: string;
  study_mode: StudyMode;
  quiz_mode: string;
  score: number | null;
  percentage: number | null;
  total_questions: number;
  total_time_sec: number | null;
  completed_at: Date | null;
  created_at: Date;
  subject: { id: string; name: string };
};

type WeaknessRow = {
  chapter_id: string;
  chapter_title: string;
  subject_id: string;
  subject_name: string;
  attempts: bigint;
  incorrect_pct: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const [summary, modes, recent] = await Promise.all([
      this.prisma.quizSession.aggregate({
        where: { user_id: userId, status: 'completed' },
        _count: { id: true },
        _avg: { percentage: true, score: true, total_time_sec: true },
      }),
      this.prisma.quizSession.groupBy({
        by: ['study_mode'],
        where: { user_id: userId, status: 'completed' },
        _count: { study_mode: true },
      }),
      this.prisma.quizSession.findMany({
        where: { user_id: userId, status: 'completed' },
        orderBy: { completed_at: 'desc' },
        take: 5,
        include: { subject: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      totals: {
        completed_sessions: summary._count.id,
        avg_percentage: summary._avg.percentage,
        avg_score: summary._avg.score,
        avg_time_sec: summary._avg.total_time_sec,
      },
      mode_breakdown: modes.map((m) => ({
        study_mode: m.study_mode,
        session_count: m._count.study_mode,
      })),
      recent_sessions: recent.map((s) => ({
        id: s.id,
        subject: s.subject,
        study_mode: s.study_mode,
        quiz_mode: s.quiz_mode,
        score: s.score,
        percentage: s.percentage,
        total_questions: s.total_questions,
        total_time_sec: s.total_time_sec,
        completed_at: s.completed_at,
      })),
    };
  }

  async getWeaknesses(userId: string) {
    const rows = await this.prisma.$queryRaw<WeaknessRow[]>(Prisma.sql`
      SELECT
        c.id AS chapter_id,
        c.title AS chapter_title,
        s.id AS subject_id,
        s.name AS subject_name,
        COUNT(qa.id) AS attempts,
        ROUND(AVG(CASE WHEN qa.is_correct THEN 0.0 ELSE 100.0 END)::numeric, 1) AS incorrect_pct
      FROM quiz_answers qa
      JOIN quiz_sessions qs ON qs.id = qa.session_id
      JOIN questions q ON q.id = qa.question_id
      JOIN chapters c ON c.id = q.chapter_id
      JOIN subjects s ON s.id = q.subject_id
      WHERE qs.user_id = ${userId}
        AND qs.status = 'completed'
      GROUP BY c.id, c.title, s.id, s.name
      HAVING COUNT(qa.id) >= 5
      ORDER BY incorrect_pct DESC, attempts DESC
      LIMIT 3
    `);

    return rows.map((r) => ({
      chapter_id: r.chapter_id,
      chapter_title: r.chapter_title,
      subject_id: r.subject_id,
      subject_name: r.subject_name,
      attempts: Number(r.attempts),
      incorrect_pct: Number(r.incorrect_pct),
    }));
  }

  async getTrends(userId: string) {
    const sessions = await this.prisma.quizSession.findMany({
      where: { user_id: userId, status: 'completed' },
      orderBy: { completed_at: 'desc' },
      include: { subject: { select: { id: true, name: true } } },
    });

    const grouped = new Map<string, HistorySession[]>();

    for (const session of sessions) {
      const key = session.subject_id;
      const existing = grouped.get(key) ?? [];
      if (existing.length < 10) {
        existing.push(session);
        grouped.set(key, existing);
      }
    }

    return Array.from(grouped.values()).map((items) => ({
      subject_id: items[0].subject.id,
      subject_name: items[0].subject.name,
      sessions: [...items].reverse().map((s) => ({
        id: s.id,
        completed_at: s.completed_at,
        percentage: s.percentage,
        score: s.score,
        total_questions: s.total_questions,
      })),
    }));
  }

  async getSubjectStats(userId: string) {
    const grouped = await this.prisma.quizSession.groupBy({
      by: ['subject_id'],
      where: { user_id: userId, status: 'completed' },
      _count: { id: true },
      _avg: { percentage: true, score: true },
    });

    const subjectIds = grouped.map((g) => g.subject_id);
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true },
    });

    const subjectNameMap = new Map(subjects.map((s) => [s.id, s.name]));

    return grouped.map((g) => ({
      subject_id: g.subject_id,
      subject_name: subjectNameMap.get(g.subject_id) ?? null,
      sessions: g._count.id,
      avg_percentage: g._avg.percentage,
      avg_score: g._avg.score,
    }));
  }

  async getHistory(userId: string, filters: HistoryFilters, limit: number, cursor?: string) {
    const where: Prisma.QuizSessionWhereInput = {
      user_id: userId,
      status: 'completed',
      subject_id: filters.subject_id || undefined,
      study_mode: filters.study_mode ? (filters.study_mode as StudyMode) : undefined,
    };

    const sessions = await this.prisma.quizSession.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { completed_at: 'desc' },
      include: { subject: { select: { id: true, name: true } } },
    });

    const hasMore = sessions.length > limit;
    if (hasMore) sessions.pop();

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        subject: s.subject,
        study_mode: s.study_mode,
        quiz_mode: s.quiz_mode,
        score: s.score,
        percentage: s.percentage,
        total_questions: s.total_questions,
        total_time_sec: s.total_time_sec,
        completed_at: s.completed_at,
      })),
      hasMore,
      nextCursor: hasMore ? sessions[sessions.length - 1]?.id ?? null : null,
    };
  }
}
