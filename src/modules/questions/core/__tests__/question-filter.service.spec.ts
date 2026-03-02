import { QuestionFilterService } from '../question-filter.service';

describe('QuestionFilterService', () => {
  const service = new QuestionFilterService();

  it('builds year_based filters with grade and exam year', () => {
    const where = service.buildWhereClause({
      subjectId: 'subject-1',
      studyMode: 'year_based',
      grade: 10,
      examYear: '2024',
      difficulty: 'medium',
    });

    expect(where).toEqual({
      subject_id: 'subject-1',
      status: 'active',
      difficulty: 'medium',
      exam_year: '2024',
      grade: 10,
    });
  });

  it('builds chapter_based filters with chapter id only', () => {
    const where = service.buildWhereClause({
      subjectId: 'subject-2',
      studyMode: 'chapter_based',
      chapterId: 'chapter-9',
    });

    expect(where).toEqual({
      subject_id: 'subject-2',
      status: 'active',
      chapter_id: 'chapter-9',
    });
  });

  it('builds exam_simulation filters with grade only', () => {
    const where = service.buildWhereClause({
      subjectId: 'subject-3',
      studyMode: 'exam_simulation',
      grade: 12,
    });

    expect(where).toEqual({
      subject_id: 'subject-3',
      status: 'active',
      grade: 12,
    });
  });
});
