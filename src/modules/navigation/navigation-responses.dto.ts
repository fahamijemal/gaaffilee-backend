import { ApiProperty } from '@nestjs/swagger';

export class StreamResponseDto {
    @ApiProperty({ example: 'clx...' })
    id: string;

    @ApiProperty({ example: 'Natural Science' })
    name: string;

    @ApiProperty({ example: 'natural' })
    slug: string;

    @ApiProperty({ example: '#10B981' })
    color_hex: string;

    @ApiProperty({ example: 5 })
    subjects_count: number;

    @ApiProperty({ example: 1200 })
    questions_count: number;
}

export class SubjectResponseDto {
    @ApiProperty({ example: 'clx...' })
    id: string;

    @ApiProperty({ example: 'clx...' })
    stream_id: string;

    @ApiProperty({ example: 'Physics' })
    name: string;

    @ApiProperty({ example: 'IconName' })
    icon: string;

    @ApiProperty({ example: '#3B82F6' })
    color_hex: string;

    @ApiProperty({ example: 12 })
    chapters_count: number;

    @ApiProperty({ example: 250 })
    questions_count: number;
}

export class ChapterResponseDto {
    @ApiProperty({ example: 'clx...' })
    id: string;

    @ApiProperty({ example: 'clx...' })
    subject_id: string;

    @ApiProperty({ example: 11 })
    grade: number;

    @ApiProperty({ example: 1 })
    chapter_number: number;

    @ApiProperty({ example: 'Kinematics' })
    title: string;

    @ApiProperty({ example: 45 })
    questions_count: number;
}

export class YearResponseDto {
    @ApiProperty({ example: '2015 E.C.' })
    exam_year: string;

    @ApiProperty({ example: 45 })
    question_count: number;
}

export class CountResponseDto {
    @ApiProperty({ example: 42 })
    count: number;
}
