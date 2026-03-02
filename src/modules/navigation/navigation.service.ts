import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NAV_CACHE_TTL_SECONDS } from '../../config/constants';

@Injectable()
export class NavigationService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getStreams() {
    const cacheKey = 'nav:streams';
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const streams = await this.prisma.stream.findMany({
      include: { _count: { select: { subjects: true } } },
    });
    const withCounts = await Promise.all(
      streams.map(async (s) => {
        const question_count = await this.prisma.question.count({
          where: { subject: { stream_id: s.id }, status: 'active' },
        });
        return { id: s.id, name: s.name, slug: s.slug, color_hex: s.color_hex, subject_count: s._count.subjects, question_count };
      }),
    );
    try { await this.redis.setex(cacheKey, NAV_CACHE_TTL_SECONDS, JSON.stringify(withCounts)); } catch {}
    return withCounts;
  }

  async getSubjects(stream_id?: string) {
    const cacheKey = `nav:subjects:${stream_id || 'all'}`;
    try { const c = await this.redis.get(cacheKey); if (c) return JSON.parse(c); } catch {}
    const subjects = await this.prisma.subject.findMany({
      where: stream_id ? { stream_id } : undefined,
      include: { stream: { select: { slug: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    try { await this.redis.setex(cacheKey, NAV_CACHE_TTL_SECONDS, JSON.stringify(subjects)); } catch {}
    return subjects;
  }

  async getSubjectById(id: string) {
    return this.prisma.subject.findUnique({
      where: { id },
      include: { stream: { select: { slug: true, name: true } } },
    });
  }

  async getChapters(subject_id: string, grade?: number) {
    const cacheKey = `nav:chapters:${subject_id}:${grade || 'all'}`;
    try { const c = await this.redis.get(cacheKey); if (c) return JSON.parse(c); } catch {}
    const where: any = { subject_id };
    if (grade) where.grade = grade;
    const chapters = await this.prisma.chapter.findMany({
      where,
      orderBy: [{ grade: 'asc' }, { chapter_number: 'asc' }],
      include: { _count: { select: { questions: { where: { status: 'active' } } } } },
    });
    const result = chapters.map((c) => ({
      id: c.id, subject_id: c.subject_id, grade: c.grade,
      chapter_number: c.chapter_number, title: c.title,
      question_count: c._count.questions,
    }));
    try { await this.redis.setex(cacheKey, NAV_CACHE_TTL_SECONDS, JSON.stringify(result)); } catch {}
    return result;
  }

  async getYears(subject_id: string, grade?: number) {
    const where: any = { subject_id, status: 'active' };
    if (grade) where.grade = grade;
    const years = await this.prisma.question.groupBy({
      by: ['exam_year'],
      where,
      _count: { id: true },
      orderBy: { exam_year: 'desc' },
    });
    return years.map((y) => ({ year: y.exam_year, question_count: y._count.id }));
  }

  async countQuestions(subject_id: string, grade?: number, chapter_id?: string, year?: string, difficulty?: string) {
    const where: any = { subject_id, status: 'active' };
    if (grade) where.grade = grade;
    if (chapter_id) where.chapter_id = chapter_id;
    if (year) where.exam_year = year;
    if (difficulty) where.difficulty = difficulty;
    const count = await this.prisma.question.count({ where });
    return { count };
  }

  async invalidateCache() {
    try {
      const keys = await this.redis.keys('nav:*');
      if (keys.length > 0) await this.redis.del(...keys);
    } catch {}
  }
}
