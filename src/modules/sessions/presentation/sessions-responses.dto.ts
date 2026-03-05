import { ApiProperty } from '@nestjs/swagger';
import { QuestionDeliveryDto } from '../../questions/presentation/questions-responses.dto';

export class SessionObjectDto {
    @ApiProperty({ example: 'clx_sess_...' })
    id: string;

    @ApiProperty({ example: 'clx_sub_phy', nullable: true })
    subject_id: string;

    @ApiProperty({ example: 'year_based', enum: ['year_based', 'chapter_based', 'exam_simulation'] })
    study_mode: string;

    @ApiProperty({ example: 'practice', enum: ['practice', 'timed'] })
    quiz_mode: string;

    @ApiProperty({ example: 20 })
    total_questions: number;

    @ApiProperty({ example: 'in_progress', enum: ['in_progress', 'completed', 'abandoned'] })
    status: string;

    @ApiProperty({ example: '2026-03-05T12:00:00Z' })
    started_at: Date;

    @ApiProperty({ example: null, nullable: true })
    completed_at: Date;
}

export class StartSessionResponseDto {
    @ApiProperty()
    session: SessionObjectDto;

    @ApiProperty({ type: [QuestionDeliveryDto] })
    questions: QuestionDeliveryDto[];
}

export class SessionProgressDto {
    @ApiProperty({ example: 5 })
    answered: number;

    @ApiProperty({ example: 20 })
    total: number;

    @ApiProperty({ example: 4 })
    score_so_far: number;
}

export class SubmitAnswerResponseDto {
    @ApiProperty({ example: true })
    is_correct: boolean;

    @ApiProperty({ example: 'B' })
    correct_answer: string;

    @ApiProperty({ example: 'Newton is the SI unit...' })
    explanation: string;

    @ApiProperty()
    session_progress: SessionProgressDto;

    @ApiProperty({ example: true, required: false })
    is_skipped?: boolean;
}

export class CompleteSessionResponseDto {
    @ApiProperty({ example: 'clx_sess_...' })
    session_id: string;

    @ApiProperty({ example: 16 })
    score: number;

    @ApiProperty({ example: 80.0 })
    percentage: number;

    @ApiProperty({ example: 'Excellent' })
    band: string;

    @ApiProperty({ example: 20 })
    total_questions: number;

    @ApiProperty({ example: 16 })
    correct: number;

    @ApiProperty({ example: 3 })
    wrong: number;

    @ApiProperty({ example: 1 })
    skipped: number;

    @ApiProperty({ example: 1200 })
    total_time_sec: number;
}

export class SessionMetaDto {
    @ApiProperty({ example: true })
    has_more: boolean;

    @ApiProperty({ example: 'clx_sess_...', nullable: true })
    next_cursor: string;
}

export class ListSessionsResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ type: [SessionObjectDto] })
    data: SessionObjectDto[];

    @ApiProperty()
    meta: SessionMetaDto;
}

export class AnswerReviewDto {
    @ApiProperty({ example: 'clx_q_...' })
    question_id: string;

    @ApiProperty({ example: 'What is...?' })
    question_text: string;

    @ApiProperty({ example: { A: '...', B: '...', C: '...', D: '...' } })
    options: any;

    @ApiProperty({ example: 'B' })
    correct_answer: string;

    @ApiProperty({ example: 'C' })
    selected: string;

    @ApiProperty({ example: false })
    is_correct: boolean;

    @ApiProperty({ example: '...' })
    explanation: string;

    @ApiProperty({ example: 45 })
    time_taken_sec: number;
}

export class GetReviewResponseDto {
    @ApiProperty()
    session: SessionObjectDto;

    @ApiProperty({ type: [AnswerReviewDto] })
    answers: AnswerReviewDto[];
}
