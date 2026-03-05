import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';
import {
  StartSessionResponseDto,
  ListSessionsResponseDto,
  SessionObjectDto,
  SubmitAnswerResponseDto,
  CompleteSessionResponseDto,
  GetReviewResponseDto
} from './sessions-responses.dto';
import { StartSessionUseCase } from '../application/use-cases/start-session.use-case';
import { SubmitAnswerUseCase } from '../application/use-cases/submit-answer.use-case';
import { SkipQuestionUseCase } from '../application/use-cases/skip-question.use-case';
import { CompleteSessionUseCase } from '../application/use-cases/complete-session.use-case';
import { GetReviewUseCase } from '../application/use-cases/get-review.use-case';
import { PrismaSessionRepository } from '../infrastructure/prisma-session.repository';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';

class StartSessionDto {
  @ApiProperty({ example: 'clx_sub_phy' }) @IsString() subject_id: string;
  @ApiProperty({ enum: ['year_based', 'chapter_based', 'exam_simulation'] }) @IsEnum(['year_based', 'chapter_based', 'exam_simulation']) study_mode: string;
  @ApiProperty({ enum: ['practice', 'timed'] }) @IsEnum(['practice', 'timed']) quiz_mode: string;
  @ApiProperty({ example: 11 }) @IsInt() @Min(9) @Max(12) grade: number;
  @ApiProperty({ example: 20, description: '10|20|30|40|0 (all)' }) @IsInt() @Min(0) question_count: number;
  @ApiPropertyOptional() @IsOptional() @IsString() chapter_id?: string;
  @ApiPropertyOptional({ example: '2015 E.C.' }) @IsOptional() @IsString() exam_year?: string;
  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] }) @IsOptional() @IsEnum(['easy', 'medium', 'hard']) difficulty?: string;
}

class SubmitAnswerDto {
  @ApiProperty() @IsString() question_id: string;
  @ApiProperty({ example: 'B', description: 'A|B|C|D or null (timed out)', nullable: true }) selected: string | null;
  @ApiProperty({ example: 45 }) @IsInt() @Min(0) time_taken_sec: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() ai_hint_used?: boolean;
}

class SkipQuestionDto {
  @ApiProperty() @IsString() question_id: string;
}

@ApiTags('Sessions')
@ApiBearerAuth('JWT')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student', 'teacher', 'admin')
export class SessionsController {
  constructor(
    private startUC: StartSessionUseCase,
    private submitUC: SubmitAnswerUseCase,
    private skipUC: SkipQuestionUseCase,
    private completeUC: CompleteSessionUseCase,
    private reviewUC: GetReviewUseCase,
    private sessionRepo: PrismaSessionRepository,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Start a new quiz session — returns questions (no correct_answer)' })
  @ApiBody({ type: StartSessionDto })
  @ApiResponse({ status: 201, description: 'Session started successfully', type: StartSessionResponseDto })
  startSession(@CurrentUser('sub') userId: string, @Body() dto: StartSessionDto) {
    return this.startUC.execute(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own past sessions (paginated)' })
  @ApiQuery({ name: 'subject_id', required: false })
  @ApiQuery({ name: 'study_mode', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, description: 'List of sessions', type: ListSessionsResponseDto })
  async listSessions(
    @CurrentUser('sub') userId: string,
    @Query('subject_id') subject_id?: string,
    @Query('study_mode') study_mode?: string,
    @Query('limit') limit = 20,
    @Query('cursor') cursor?: string,
  ) {
    const l = Math.min(Number(limit) || 20, 50);
    const result = await this.sessionRepo.listUserSessions(userId, { subject_id, study_mode }, l, cursor);
    return {
      success: true,
      data: result.sessions,
      meta: { has_more: result.hasMore, next_cursor: result.nextCursor },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session details', type: SessionObjectDto })
  getSession(@Param('id', ParseCuidPipe) id: string, @CurrentUser('sub') userId: string) {
    return this.sessionRepo.findSessionWithOwnerCheck(id, userId);
  }

  @Post(':id/answer')
  @ApiOperation({ summary: 'Submit answer — timer enforcement for exam_simulation' })
  @ApiBody({ type: SubmitAnswerDto })
  @ApiResponse({ status: 201, description: 'Answer submitted', type: SubmitAnswerResponseDto })
  submitAnswer(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.submitUC.execute(id, userId, dto);
  }

  @Post(':id/skip')
  @ApiOperation({ summary: 'Skip question (practice modes only — 422 in exam_simulation)' })
  @ApiBody({ type: SkipQuestionDto })
  @ApiResponse({ status: 201, description: 'Question skipped', type: SubmitAnswerResponseDto })
  skipQuestion(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SkipQuestionDto,
  ) {
    return this.skipUC.execute(id, userId, dto.question_id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Finalise session — compute score, trigger weakness report if needed' })
  @ApiResponse({ status: 200, description: 'Session completed', type: CompleteSessionResponseDto })
  completeSession(@Param('id', ParseCuidPipe) id: string, @CurrentUser('sub') userId: string) {
    return this.completeUC.execute(id, userId);
  }

  @Get(':id/review')
  @ApiOperation({ summary: 'Full answer review (completed sessions only)' })
  @ApiResponse({ status: 200, description: 'Session review', type: GetReviewResponseDto })
  getReview(@Param('id', ParseCuidPipe) id: string, @CurrentUser('sub') userId: string) {
    return this.reviewUC.execute(id, userId);
  }
}
