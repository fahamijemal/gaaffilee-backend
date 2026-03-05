import { ApiProperty } from '@nestjs/swagger';

export class DashboardOverviewDto {
    @ApiProperty({ example: 42 })
    total_sessions: number;

    @ApiProperty({ example: 85.5 })
    average_score: number;

    @ApiProperty({ example: { year_based: 10, chapter_based: 30, exam_simulation: 2 } })
    study_mode_breakdown: any;
}

export class DashboardWeaknessDto {
    @ApiProperty({ example: 'clx...' })
    chapter_id: string;

    @ApiProperty({ example: 'Kinematics' })
    chapter_title: string;

    @ApiProperty({ example: 45.0 })
    average_score: number;
}

export class DashboardTrendDto {
    @ApiProperty({ example: '2026-03-01T12:00:00Z' })
    date: string;

    @ApiProperty({ example: 80.0 })
    score: number;
}

export class DashboardSubjectStatsDto {
    @ApiProperty({ example: 'Physics' })
    subject_name: string;

    @ApiProperty({ example: 25 })
    sessions_completed: number;

    @ApiProperty({ example: 78.5 })
    average_score: number;
}

export class PaginatedSessionsDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ type: [Object] })
    data: any[];

    @ApiProperty({ example: { has_more: false, next_cursor: null } })
    meta: any;
}
