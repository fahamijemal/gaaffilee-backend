import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Navigation')
@Controller()
@Public()
@UseGuards(JwtAuthGuard)
export class NavigationController {
  constructor(private readonly nav: NavigationService) {}

  @Get('streams')
  @ApiOperation({ summary: 'All streams with subject/question counts (cached 60 min)' })
  getStreams() { return this.nav.getStreams(); }

  @Get('subjects')
  @ApiOperation({ summary: 'Subjects — optional stream_id filter' })
  @ApiQuery({ name: 'stream_id', required: false })
  getSubjects(@Query('stream_id') stream_id?: string) { return this.nav.getSubjects(stream_id); }

  @Get('subjects/:id')
  @ApiOperation({ summary: 'Single subject detail' })
  async getSubjectById(@Param('id') id: string) {
    const subject = await this.nav.getSubjectById(id);
    if (!subject) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Subject not found.' });
    return subject;
  }

  @Get('chapters')
  @ApiOperation({ summary: 'Chapters for a subject — optional grade filter' })
  @ApiQuery({ name: 'subject_id', required: true })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  getChapters(@Query('subject_id') subject_id: string, @Query('grade') grade?: number) {
    return this.nav.getChapters(subject_id, grade ? Number(grade) : undefined);
  }

  @Get('years')
  @ApiOperation({ summary: 'Available exam years with question counts' })
  @ApiQuery({ name: 'subject_id', required: true })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  getYears(@Query('subject_id') subject_id: string, @Query('grade') grade?: number) {
    return this.nav.getYears(subject_id, grade ? Number(grade) : undefined);
  }

  @Get('questions/count')
  @ApiOperation({ summary: 'Count questions matching filter (real-time quiz config)' })
  @ApiQuery({ name: 'subject_id', required: true })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  @ApiQuery({ name: 'chapter_id', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  countQuestions(
    @Query('subject_id') subject_id: string,
    @Query('grade') grade?: number,
    @Query('chapter_id') chapter_id?: string,
    @Query('year') year?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.nav.countQuestions(subject_id, grade ? Number(grade) : undefined, chapter_id, year, difficulty);
  }
}
