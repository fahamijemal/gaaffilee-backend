import { ApiProperty } from '@nestjs/swagger';

export class QuestionDeliveryDto {
    @ApiProperty({ example: 'clx...' })
    id: string;

    @ApiProperty({ example: 'clx...' })
    subject_id: string;

    @ApiProperty({ example: 'clx...', nullable: true })
    chapter_id: string;

    @ApiProperty({ example: 11 })
    grade: number;

    @ApiProperty({ example: '2015 E.C.', nullable: true })
    exam_year: string;

    @ApiProperty({ example: 'What is the SI unit of force?' })
    question_text: string;

    @ApiProperty({ example: 'Newton' })
    option_a: string;

    @ApiProperty({ example: 'Joule' })
    option_b: string;

    @ApiProperty({ example: 'Watt' })
    option_c: string;

    @ApiProperty({ example: 'Pascal' })
    option_d: string;

    @ApiProperty({ example: 'easy', enum: ['easy', 'medium', 'hard'] })
    difficulty: string;

    @ApiProperty({ example: 'active', enum: ['active', 'draft', 'archived'] })
    status: string;
}

export class QuestionsResponseDto {
    @ApiProperty({ example: 'abc1234' })
    session_seed: string;

    @ApiProperty({ example: 20 })
    total_returned: number;

    @ApiProperty({ type: [QuestionDeliveryDto] })
    questions: QuestionDeliveryDto[];
}
