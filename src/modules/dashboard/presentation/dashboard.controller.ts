import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from '../dashboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student', 'teacher', 'admin')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Overview — totals, averages, mode breakdown, recent 5 sessions' })
  getOverview(@CurrentUser('sub') userId: string) {
    return this.dashboard.getOverview(userId);
  }

  @Get('weaknesses')
  @ApiOperation({ summary: 'Top 3 weakest chapters (min 5 attempts each)' })
  getWeaknesses(@CurrentUser('sub') userId: string) {
    return this.dashboard.getWeaknesses(userId);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Score trend — last 10 sessions per subject' })
  getTrends(@CurrentUser('sub') userId: string) {
    return this.dashboard.getTrends(userId);
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Per-subject performance table' })
  getSubjectStats(@CurrentUser('sub') userId: string) {
    return this.dashboard.getSubjectStats(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Paginated session history with filters' })
  @ApiQuery({ name: 'subject_id', required: false })
  @ApiQuery({ name: 'study_mode', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query('subject_id') subject_id?: string,
    @Query('study_mode') study_mode?: string,
    @Query('limit') limit = 20,
    @Query('cursor') cursor?: string,
  ) {
    const l = Math.min(Number(limit) || 20, 50);
    const result = await this.dashboard.getHistory(userId, { subject_id, study_mode }, l, cursor);
    return {
      success: true,
      data: result.sessions,
      meta: { has_more: result.hasMore, next_cursor: result.nextCursor },
    };
  }
}
