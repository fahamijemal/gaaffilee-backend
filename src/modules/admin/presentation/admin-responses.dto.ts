import { ApiProperty } from '@nestjs/swagger';

export class AdminQuestionDto {
    @ApiProperty({ example: 'clx... ' })
    id: string;

    @ApiProperty({ example: 'What is...?' })
    question_text: string;

    @ApiProperty({ example: 'active', enum: ['active', 'draft', 'archived'] })
    status: string;
}

export class PaginatedAdminQuestionsDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ type: [AdminQuestionDto] })
    data: AdminQuestionDto[];

    @ApiProperty()
    meta: any;
}

export class BulkUploadJobResponseDto {
    @ApiProperty({ example: 'uuid...' })
    job_id: string;

    @ApiProperty({ example: 'queued' })
    status: string;
}

export class BulkJobStatusDto {
    @ApiProperty({ example: 'completed', enum: ['processing', 'completed', 'failed', 'not_found'] })
    status: string;

    @ApiProperty({ example: 45 })
    inserted: number;

    @ApiProperty({ example: 0 })
    skipped: number;

    @ApiProperty({ example: 2 })
    errors: number;
}

export class AdminUserDto {
    @ApiProperty({ example: 'clx... ' })
    id: string;

    @ApiProperty({ example: 'Abebe Bekele' })
    name: string;
}

export class PaginatedAdminUsersDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ type: [AdminUserDto] })
    data: AdminUserDto[];

    @ApiProperty()
    meta: any;
}

export class AdminChapterDto {
    @ApiProperty({ example: 'clx... ' })
    id: string;

    @ApiProperty({ example: 'Kinematics' })
    title: string;
}

export class AdminAnalyticsDto {
    @ApiProperty()
    total_users: number;

    @ApiProperty()
    total_questions: number;
}
