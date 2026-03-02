import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProviderPort, ChatMessage } from '../core/ports/ai-provider.port';
import { AiRateLimiterService } from '../core/ai-rate-limiter.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaSessionRepository } from '../../sessions/infrastructure/prisma-session.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotFoundException, UnprocessableEntityException, ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

class HintDto {
  @ApiProperty() @IsString() session_id: string;
  @ApiProperty() @IsString() question_id: string;
  @ApiProperty({ example: 1, description: '1 or 2' }) @IsInt() @Min(1) @Max(2) hint_number: number;
}

class ExplainDto {
  @ApiProperty() @IsString() session_id: string;
  @ApiProperty() @IsString() question_id: string;
  @ApiProperty({ example: 'B', enum: ['A', 'B', 'C', 'D'] }) @IsString() student_answer: string;
}

class ChatDto {
  @ApiProperty() @IsString() session_id: string;
  @ApiProperty() @IsString() question_id: string;
  @ApiProperty({ type: 'array' }) messages: ChatMessage[];
}

class WeaknessReportDto {
  @ApiProperty() @IsString() subject_id: string;
  @ApiProperty({ example: 11 }) @IsInt() @Min(9) @Max(12) grade: number;
}

class GenerateQuestionsDto {
  @ApiProperty() @IsString() subject_id: string;
  @ApiProperty() @IsString() chapter_id: string;
  @ApiProperty({ example: 11 }) @IsInt() @Min(9) @Max(12) grade: number;
  @ApiProperty({ example: 5, description: '1-10' }) @IsInt() @Min(1) @Max(10) count: number;
  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] }) @IsOptional() @IsString() difficulty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() exam_year?: string;
}

@ApiTags('AI')
@ApiBearerAuth('JWT')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  private rateLimiter: AiRateLimiterService;

  constructor(
    private ai: AiProviderPort,
    private sessionRepo: PrismaSessionRepository,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.rateLimiter = new AiRateLimiterService(config.get<number>('AI_CALLS_PER_SESSION', 3));
  }

  @Post('hint')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Socratic hint (max 2/question, 3/session). Not available in exam_simulation.' })
  @ApiBody({ type: HintDto })
  async getHint(@CurrentUser('sub') userId: string, @Body() dto: HintDto) {
    const session = await this.sessionRepo.findSessionWithOwnerCheck(dto.session_id, userId);
    if (session.study_mode === 'exam_simulation') {
      throw new UnprocessableEntityException({ error_code: 'AI_UNAVAILABLE', message: 'AI is not available during Exam Simulation.' });
    }
    try { this.rateLimiter.assertCanRequestAi(session.ai_calls_used); }
    catch { throw new UnprocessableEntityException({ error_code: 'AI_RATE_LIMIT', message: 'AI call limit for this session reached.' }); }

    const question = await this.prisma.question.findUnique({
      where: { id: dto.question_id },
      include: { subject: true, chapter: true },
    });
    if (!question) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Question not found.' });

    const hint = await this.ai.getHint({
      subject: question.subject.name,
      grade: question.grade,
      chapter: question.chapter.title,
      question_text: question.question_text,
      options: [
        { key: 'A', text: question.option_a },
        { key: 'B', text: question.option_b },
        { key: 'C', text: question.option_c },
        { key: 'D', text: question.option_d },
      ],
      hint_number: dto.hint_number,
    });

    await this.sessionRepo.updateSession(dto.session_id, { ai_calls_used: { increment: 1 } });
    const maxCalls = this.config.get<number>('AI_CALLS_PER_SESSION', 3);
    return {
      hint,
      hint_number: dto.hint_number,
      hints_remaining: 2 - dto.hint_number,
      ai_calls_remaining: maxCalls - session.ai_calls_used - 1,
      model_used: this.config.get('GEMINI_FLASH_MODEL', 'gemini-1.5-flash'),
    };
  }

  @Post('explain')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Full explanation after answering. DB explanation used if available.' })
  @ApiBody({ type: ExplainDto })
  async explain(@CurrentUser('sub') userId: string, @Body() dto: ExplainDto) {
    const session = await this.sessionRepo.findSessionWithOwnerCheck(dto.session_id, userId);
    if (session.study_mode === 'exam_simulation') {
      throw new UnprocessableEntityException({ error_code: 'AI_UNAVAILABLE', message: 'AI not available during Exam Simulation.' });
    }
    try { this.rateLimiter.assertCanRequestAi(session.ai_calls_used); }
    catch { throw new UnprocessableEntityException({ error_code: 'AI_RATE_LIMIT', message: 'AI call limit reached.' }); }

    const question = await this.prisma.question.findUnique({
      where: { id: dto.question_id },
      include: { subject: true, chapter: true },
    });
    if (!question) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Question not found.' });

    if (question.explanation) {
      return { explanation: question.explanation, source: 'database', model_used: null, ai_calls_remaining: this.config.get<number>('AI_CALLS_PER_SESSION', 3) - session.ai_calls_used };
    }

    const explanation = await this.ai.explain({
      subject: question.subject.name,
      grade: question.grade,
      chapter: question.chapter.title,
      question_text: question.question_text,
      options: [{ key: 'A', text: question.option_a }, { key: 'B', text: question.option_b }, { key: 'C', text: question.option_c }, { key: 'D', text: question.option_d }],
      correct_answer: question.correct_answer,
      student_answer: dto.student_answer,
      hint_number: 0,
    });

    await this.sessionRepo.updateSession(dto.session_id, { ai_calls_used: { increment: 1 } });
    const maxCalls = this.config.get<number>('AI_CALLS_PER_SESSION', 3);
    return {
      explanation,
      source: 'gemini',
      model_used: this.config.get('GEMINI_PRO_MODEL', 'gemini-1.5-pro'),
      ai_calls_remaining: maxCalls - session.ai_calls_used - 1,
    };
  }

  @Post('chat')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Multi-turn chat on a question (completed sessions only)' })
  @ApiBody({ type: ChatDto })
  async chat(@CurrentUser('sub') userId: string, @Body() dto: ChatDto) {
    const session = await this.sessionRepo.findSessionWithOwnerCheck(dto.session_id, userId);
    if (session.status !== 'completed') {
      throw new UnprocessableEntityException({ error_code: 'SESSION_NOT_COMPLETE', message: 'Chat is only available for completed sessions.' });
    }
    const question = await this.prisma.question.findUnique({
      where: { id: dto.question_id },
      include: { subject: true, chapter: true },
    });
    if (!question) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Question not found.' });

    const reply = await this.ai.chat({
      subject: question.subject.name,
      grade: question.grade,
      chapter: question.chapter.title,
      question_text: question.question_text,
      options: [{ key: 'A', text: question.option_a }, { key: 'B', text: question.option_b }, { key: 'C', text: question.option_c }, { key: 'D', text: question.option_d }],
      correct_answer: question.correct_answer,
      student_answer: '',
      hint_number: 0,
    }, dto.messages);

    return { reply, model_used: this.config.get('GEMINI_PRO_MODEL', 'gemini-1.5-pro') };
  }

  @Get('weakness-report')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Poll weakness report status — pending|ready' })
  @ApiQuery({ name: 'subject_id', required: true })
  @ApiQuery({ name: 'grade', required: true, type: Number })
  async getWeaknessReport(
    @CurrentUser('sub') userId: string,
    @Query('subject_id') subject_id: string,
    @Query('grade') grade: number,
  ) {
    const session = await this.prisma.quizSession.findFirst({
      where: { user_id: userId, subject_id, status: 'completed' },
      orderBy: { completed_at: 'desc' },
    });

    if (!session || !session.weakness_report_status) {
      return { status: 'pending', report: null, checked_at: new Date().toISOString() };
    }
    if (session.weakness_report_status === 'ready') {
      return { status: 'ready', report: session.weakness_report, generated_at: session.completed_at };
    }
    return { status: 'pending', report: null, checked_at: new Date().toISOString() };
  }

  @Post('weakness-report')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Trigger async weakness report generation' })
  @ApiBody({ type: WeaknessReportDto })
  async triggerWeaknessReport(@CurrentUser('sub') userId: string, @Body() dto: WeaknessReportDto) {
    const sessions = await this.prisma.quizSession.findMany({
      where: { user_id: userId, subject_id: dto.subject_id, status: 'completed' },
      orderBy: { completed_at: 'desc' },
      take: 10,
    });
    if (sessions.length < 3) {
      throw new UnprocessableEntityException({ error_code: 'VALIDATION_ERROR', message: 'Need at least 3 completed sessions to generate a weakness report.' });
    }
    const summary = sessions.map((s) => `Session ${s.id}: ${s.percentage}% (${s.band})`).join('\n');
    // Fire and forget
    this.ai.generateWeaknessReport(summary).then(async (report) => {
      const latest = sessions[0];
      await this.prisma.quizSession.update({
        where: { id: latest.id },
        data: { weakness_report_status: 'ready', weakness_report: report },
      });
    }).catch(() => {});
    return { message: 'Weakness report generation started.', status: 'pending' };
  }

  @Post('generate-questions')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: generate draft questions via Gemini' })
  @ApiBody({ type: GenerateQuestionsDto })
  async generateQuestions(@Body() dto: GenerateQuestionsDto) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: dto.chapter_id } });
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subject_id } });
    if (!chapter || !subject) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Subject or chapter not found.' });

    const drafts = await this.ai.generateDraftQuestions({
      count: dto.count,
      grade: dto.grade,
      subject: subject.name,
      chapter_title: chapter.title,
      difficulty: dto.difficulty,
    });

    const created = await Promise.all(
      drafts.map((d) =>
        this.prisma.question.create({
          data: {
            subject_id: dto.subject_id,
            chapter_id: dto.chapter_id,
            grade: dto.grade,
            exam_year: dto.exam_year || `${new Date().getFullYear()} E.C.`,
            question_text: d.question_text,
            option_a: d.option_a,
            option_b: d.option_b,
            option_c: d.option_c,
            option_d: d.option_d,
            correct_answer: d.correct_answer,
            explanation: d.explanation,
            difficulty: dto.difficulty as any || 'medium',
            status: 'draft',
          },
        }),
      ),
    );

    return { generated: created.length, questions: created.map((q) => ({ id: q.id, status: q.status })) };
  }
}
