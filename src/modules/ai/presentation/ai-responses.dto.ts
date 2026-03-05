import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiHintResponseDto {
    @ApiProperty({ example: 'Think about which fundamental force...' })
    hint: string;

    @ApiProperty({ example: 1 })
    hint_number: number;

    @ApiProperty({ example: 1 })
    hints_remaining: number;

    @ApiProperty({ example: 2 })
    ai_calls_remaining: number;

    @ApiProperty({ example: 'gemini-1.5-flash' })
    model_used: string;
}

export class AiExplainResponseDto {
    @ApiProperty({ example: 'The correct answer is B because...' })
    explanation: string;

    @ApiProperty({ example: 'gemini', enum: ['database', 'gemini'] })
    source: string;

    @ApiProperty({ example: 'gemini-1.5-pro', nullable: true })
    model_used: string | null;

    @ApiProperty({ example: 1 })
    ai_calls_remaining: number;
}

export class AiChatResponseDto {
    @ApiProperty({ example: 'Sure! Option A is incorrect because...' })
    reply: string;

    @ApiProperty({ example: 'gemini-1.5-pro' })
    model_used: string;
}

export class WeaknessReportPollResponseDto {
    @ApiProperty({ example: 'ready', enum: ['pending', 'ready'] })
    status: string;

    @ApiProperty({ example: 'Your weakest areas are...', nullable: true })
    report: string | null;

    @ApiPropertyOptional({ example: '2026-03-05T12:00:00Z' })
    generated_at?: Date;

    @ApiPropertyOptional({ example: '2026-03-05T12:00:00Z' })
    checked_at?: string;
}

export class TriggerWeaknessReportResponseDto {
    @ApiProperty({ example: 'Weakness report generation started.' })
    message: string;

    @ApiProperty({ example: 'pending' })
    status: string;
}

export class GeneratedQuestionSummaryDto {
    @ApiProperty({ example: 'clx_new_q_...' })
    id: string;

    @ApiProperty({ example: 'draft' })
    status: string;
}

export class GenerateQuestionsResponseDto {
    @ApiProperty({ example: 5 })
    generated: number;

    @ApiProperty({ type: [GeneratedQuestionSummaryDto] })
    questions: GeneratedQuestionSummaryDto[];
}
