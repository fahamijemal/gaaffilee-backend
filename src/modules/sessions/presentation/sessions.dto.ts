// src/modules/sessions/presentation/sessions.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum StudyModeEnum {
  YEAR_BASED = 'year_based',
  CHAPTER_BASED = 'chapter_based',
  EXAM_SIMULATION = 'exam_simulation',
}

export enum QuizModeEnum {
  PRACTICE = 'practice',
  TIMED = 'timed',
}

export class StartSessionDto {
  @ApiProperty({ description: 'Subject CUID' })
  @IsNotEmpty()
  @IsString()
  subject_id: string;

  @ApiProperty({ enum: StudyModeEnum })
  @IsEnum(StudyModeEnum)
  study_mode: StudyModeEnum;

  @ApiProperty({ enum: QuizModeEnum })
  @IsEnum(QuizModeEnum)
  quiz_mode: QuizModeEnum;

  @ApiProperty({ example: 11, description: 'Grade (9-12)' })
  @IsInt()
  @Min(9)
  @Max(12)
  grade: number;

  @ApiProperty({ example: 20, description: 'Number of questions (0 = all available)' })
  @IsInt()
  @Min(0)
  question_count: number;

  @ApiPropertyOptional({ description: 'Chapter CUID — required for chapter_based' })
  @IsOptional()
  @IsString()
  chapter_id?: string;

  @ApiPropertyOptional({ example: '2015 E.C.', description: 'Exam year — required for year_based' })
  @IsOptional()
  @IsString()
  exam_year?: string;

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: string;
}

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Question CUID' })
  @IsNotEmpty()
  @IsString()
  question_id: string;

  @ApiProperty({
    nullable: true,
    description: 'Selected option key (A/B/C/D) or null if timed out',
  })
  selected: string | null;

  @ApiProperty({ example: 45, description: 'Client-measured seconds on this question' })
  @IsInt()
  @Min(0)
  time_taken_sec: number;

  @ApiPropertyOptional({ description: 'True if hint was requested before answering' })
  @IsOptional()
  ai_hint_used?: boolean;
}

export class SkipQuestionDto {
  @ApiProperty({ description: 'Question CUID to skip' })
  @IsNotEmpty()
  @IsString()
  question_id: string;
}

export class ListSessionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by subject CUID' })
  @IsOptional()
  @IsString()
  subject_id?: string;

  @ApiPropertyOptional({ enum: StudyModeEnum })
  @IsOptional()
  @IsEnum(StudyModeEnum)
  study_mode?: StudyModeEnum;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max 50)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Pagination cursor from previous response' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
