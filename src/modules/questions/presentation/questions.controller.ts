import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuestionRepositoryPort } from '../core/ports/question.repository.port';
import { QuestionsResponseDto } from './questions-responses.dto';
import { QuestionShuffleService } from '../core/question-shuffle.service';
import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('Questions')
@Controller('questions')
@Public()
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  private shuffleService = new QuestionShuffleService();

  constructor(private readonly repo: QuestionRepositoryPort) { }

  @Get()
  @ApiOperation({ summary: 'Fetch shuffled questions — correct_answer NEVER included (Public)' })
  @ApiQuery({ name: 'subject_id', required: true })
  @ApiQuery({ name: 'study_mode', required: true, enum: ['year_based', 'chapter_based', 'exam_simulation'] })
  @ApiQuery({ name: 'count', required: true, type: Number, description: '10|20|30|40|0 (all)' })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  @ApiQuery({ name: 'chapter_id', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @ApiQuery({ name: 'seed', required: false })
  @ApiResponse({ status: 200, description: 'List of questions', type: QuestionsResponseDto })
  async getQuestions(
    @Query('subject_id') subject_id: string,
    @Query('study_mode') study_mode: string,
    @Query('count') count: number,
    @Query('grade') grade?: number,
    @Query('chapter_id') chapter_id?: string,
    @Query('year') year?: string,
    @Query('difficulty') difficulty?: string,
    @Query('seed') seed?: string,
  ) {
    const allQuestions = await this.repo.findFiltered({
      subjectId: subject_id,
      studyMode: study_mode,
      count: Number(count),
      grade: grade ? Number(grade) : undefined,
      chapterId: chapter_id,
      examYear: year,
      difficulty,
    });

    const sessionSeed = seed || this.shuffleService.generateSeed();
    const shuffled = this.shuffleService.shuffleArray(allQuestions, sessionSeed);

    // Strip correct_answer — QuestionDeliveryDto enforced structurally
    const delivery = shuffled.map(({ correct_answer, explanation, ...q }) => q);

    return {
      session_seed: sessionSeed,
      total_returned: delivery.length,
      questions: delivery,
    };
  }
}
