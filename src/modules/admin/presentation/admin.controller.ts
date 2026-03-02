import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put,
  Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminService } from '../admin.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { RedisService } from '../../../redis/redis.service';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { parse } from 'csv-parse/sync';

class CreateQuestionDto {
  @ApiProperty() @IsString() subject_id: string;
  @ApiProperty() @IsString() chapter_id: string;
  @ApiProperty({ example: 11 }) @IsInt() @Min(9) @Max(12) grade: number;
  @ApiProperty({ example: '2015 E.C.' }) @IsString() @Matches(/^\d{4} E\.C\.$/) exam_year: string;
  @ApiProperty({ minLength: 10, maxLength: 2000 }) @IsString() @MinLength(10) @MaxLength(2000) question_text: string;
  @ApiProperty() @IsString() @MaxLength(500) option_a: string;
  @ApiProperty() @IsString() @MaxLength(500) option_b: string;
  @ApiProperty() @IsString() @MaxLength(500) option_c: string;
  @ApiProperty() @IsString() @MaxLength(500) option_d: string;
  @ApiProperty({ enum: ['A', 'B', 'C', 'D'] }) @IsEnum(['A', 'B', 'C', 'D']) correct_answer: string;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
  @ApiProperty({ enum: ['easy', 'medium', 'hard'] }) @IsEnum(['easy', 'medium', 'hard']) difficulty: string;
  @ApiPropertyOptional({ enum: ['active', 'draft'] }) @IsOptional() @IsEnum(['active', 'draft']) status?: string;
}

class CreateChapterDto {
  @ApiProperty() @IsString() subject_id: string;
  @ApiProperty({ example: 11 }) @IsInt() @Min(9) @Max(12) grade: number;
  @ApiProperty({ example: 3 }) @IsInt() @Min(1) chapter_number: number;
  @ApiProperty({ example: 'Kinematics' }) @IsString() @MaxLength(200) title: string;
}

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly redis: RedisService,
  ) {}

  // ── Questions ──────────────────────────────────────────────────────────────
  @Get('questions')
  @ApiOperation({ summary: 'Paginated question list (all fields including correct_answer)' })
  @ApiQuery({ name: 'subject_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'draft', 'archived'] })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  async listQuestions(
    @Query('subject_id') subject_id?: string,
    @Query('status') status?: string,
    @Query('grade') grade?: number,
    @Query('limit') limit = 20,
    @Query('cursor') cursor?: string,
  ) {
    const l = Math.min(Number(limit) || 20, 100);
    const result = await this.admin.listQuestions({ subject_id, status, grade }, l, cursor);
    return {
      success: true,
      data: result.questions,
      meta: { has_more: result.hasMore, next_cursor: result.nextCursor, total: result.total },
    };
  }

  @Get('questions/:id')
  @ApiOperation({ summary: 'Get single question (all fields)' })
  getQuestion(@Param('id', ParseCuidPipe) id: string) {
    return this.admin.getQuestion(id);
  }

  @Post('questions')
  @ApiOperation({ summary: 'Add single question' })
  @ApiBody({ type: CreateQuestionDto })
  createQuestion(@Body() dto: CreateQuestionDto, @CurrentUser('sub') userId: string) {
    return this.admin.createQuestion(dto, userId);
  }

  @Put('questions/:id')
  @ApiOperation({ summary: 'Full update — archives and replaces if has existing answers' })
  updateQuestion(@Param('id', ParseCuidPipe) id: string, @Body() dto: Partial<CreateQuestionDto>) {
    return this.admin.updateQuestion(id, dto);
  }

  @Patch('questions/:id/status')
  @ApiOperation({ summary: 'Change question status: active | draft | archived' })
  updateQuestionStatus(@Param('id', ParseCuidPipe) id: string, @Body('status') status: string) {
    return this.admin.updateQuestionStatus(id, status);
  }

  @Patch('questions/:id/approve')
  @ApiOperation({ summary: 'Approve Gemini-generated draft question' })
  approveQuestion(@Param('id', ParseCuidPipe) id: string) {
    return this.admin.updateQuestionStatus(id, 'active');
  }

  @Delete('questions/:id')
  @ApiOperation({ summary: 'Soft-delete question (status → archived)' })
  archiveQuestion(@Param('id', ParseCuidPipe) id: string) {
    return this.admin.archiveQuestion(id);
  }

  // ── Bulk Upload ────────────────────────────────────────────────────────────
  @Post('questions/bulk')
  @HttpCode(202)
  @ApiOperation({ summary: 'CSV bulk upload — async job, returns job_id to poll' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File, @CurrentUser('sub') userId: string) {
    const jobId = randomUUID();
    const jobKey = `bulk_job:${jobId}`;
    await this.redis.set(jobKey, JSON.stringify({ status: 'processing', inserted: 0, skipped: 0, errors: 0, error_details: [] }));

    // Process asynchronously
    setImmediate(async () => {
      const results = { inserted: 0, skipped: 0, errors: 0, error_details: [] as any[] };
      try {
        const records = parse(file.buffer, { columns: true, skip_empty_lines: true });
        for (let i = 0; i < records.length; i++) {
          const row = records[i];
          try {
            const subject = await (this.admin as any).prisma.subject.findFirst({ where: { name: row.subject } });
            if (!subject) { results.errors++; results.error_details.push({ row: i + 2, error: `Subject '${row.subject}' not found` }); continue; }
            const chapterNum = parseInt(row.chapter_number, 10);
            const grade = parseInt(row.grade, 10);
            let chapter = await (this.admin as any).prisma.chapter.findFirst({ where: { subject_id: subject.id, grade, chapter_number: chapterNum } });
            if (!chapter) {
              chapter = await (this.admin as any).prisma.chapter.create({ data: { subject_id: subject.id, grade, chapter_number: chapterNum, title: row.chapter_title } });
            }
            await (this.admin as any).prisma.question.create({
              data: {
                subject_id: subject.id, chapter_id: chapter.id, grade,
                exam_year: row.exam_year, question_text: row.question_text,
                option_a: row.option_a, option_b: row.option_b, option_c: row.option_c, option_d: row.option_d,
                correct_answer: row.correct_answer, explanation: row.explanation || null,
                difficulty: row.difficulty as any || 'medium', status: 'active', created_by: userId,
              },
            });
            results.inserted++;
          } catch (err: any) {
            results.errors++;
            results.error_details.push({ row: i + 2, error: err?.message || 'Unknown error' });
          }
        }
        await this.redis.setex(jobKey, 3600, JSON.stringify({ status: 'completed', ...results }));
      } catch (err: any) {
        await this.redis.setex(jobKey, 3600, JSON.stringify({ status: 'failed', error: err?.message }));
      }
    });

    return { job_id: jobId, status: 'queued' };
  }

  @Get('questions/bulk/:job_id')
  @ApiOperation({ summary: 'Poll bulk upload job status' })
  async getBulkJobStatus(@Param('job_id') jobId: string) {
    const data = await this.redis.get(`bulk_job:${jobId}`);
    if (!data) return { status: 'not_found' };
    return JSON.parse(data);
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Paginated user list' })
  @ApiQuery({ name: 'role', required: false, enum: ['student', 'teacher', 'admin'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  async listUsers(@Query('role') role?: string, @Query('limit') limit = 20, @Query('cursor') cursor?: string) {
    const l = Math.min(Number(limit) || 20, 100);
    const result = await this.admin.listUsers({ role }, l, cursor);
    return { success: true, data: result.users, meta: { has_more: result.hasMore, next_cursor: result.nextCursor } };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'User profile + performance summary' })
  getUser(@Param('id', ParseCuidPipe) id: string) { return this.admin.getUser(id); }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  updateRole(@Param('id', ParseCuidPipe) id: string, @Body('role') role: string) { return this.admin.updateUserRole(id, role); }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend or unsuspend account' })
  suspend(@Param('id', ParseCuidPipe) id: string, @Body('suspend') suspend: boolean) { return this.admin.toggleSuspend(id, suspend); }

  // ── Chapters ───────────────────────────────────────────────────────────────
  @Get('chapters')
  @ApiOperation({ summary: 'List chapters (filterable)' })
  @ApiQuery({ name: 'subject_id', required: false })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  listChapters(@Query('subject_id') subject_id?: string, @Query('grade') grade?: number) {
    return this.admin.listChapters({ subject_id, grade });
  }

  @Post('chapters')
  @ApiOperation({ summary: 'Add new chapter' })
  @ApiBody({ type: CreateChapterDto })
  createChapter(@Body() dto: CreateChapterDto) { return this.admin.createChapter(dto); }

  @Put('chapters/:id')
  @ApiOperation({ summary: 'Edit chapter' })
  updateChapter(@Param('id', ParseCuidPipe) id: string, @Body() dto: Partial<CreateChapterDto>) { return this.admin.updateChapter(id, dto); }

  @Patch('chapters/reorder')
  @ApiOperation({ summary: 'Batch reorder chapters' })
  reorderChapters(@Body() items: { id: string; chapter_number: number }[]) { return this.admin.reorderChapters(items); }

  @Delete('chapters/:id')
  @ApiOperation({ summary: 'Delete chapter (blocked if has active questions)' })
  deleteChapter(@Param('id', ParseCuidPipe) id: string) { return this.admin.deleteChapter(id); }

  // ── Analytics ──────────────────────────────────────────────────────────────
  @Get('analytics/overview')
  @ApiOperation({ summary: 'Platform-wide totals' })
  analyticsOverview() { return this.admin.getAnalyticsOverview(); }

  @Get('analytics/missed')
  @ApiOperation({ summary: 'Top 20 most-missed questions' })
  analyticsMissed() { return this.admin.getMostMissed(); }

  @Get('analytics/subjects')
  @ApiOperation({ summary: 'Average score per subject' })
  analyticsSubjects() { return this.admin.getSubjectAverages(); }

  @Get('analytics/activity')
  @ApiOperation({ summary: 'Daily active users + sessions (last 30 days)' })
  analyticsActivity() { return this.admin.getActivityStats(); }

  @Get('analytics/ai-usage')
  @ApiOperation({ summary: 'AI API call volume per day' })
  analyticsAiUsage() { return this.admin.getAiUsage(); }
}
