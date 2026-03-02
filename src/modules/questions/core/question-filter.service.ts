export class QuestionFilterService {
  buildWhereClause(params: {
    subjectId: string;
    grade?: number;
    examYear?: string;
    chapterId?: string;
    studyMode: string;
    difficulty?: string;
  }) {
    const where: any = { subject_id: params.subjectId, status: 'active' };
    if (params.difficulty) where.difficulty = params.difficulty;
    switch (params.studyMode) {
      case 'year_based':
        if (params.examYear) where.exam_year = params.examYear;
        if (params.grade) where.grade = params.grade;
        break;
      case 'chapter_based':
        if (params.chapterId) where.chapter_id = params.chapterId;
        break;
      case 'exam_simulation':
        if (params.grade) where.grade = params.grade;
        break;
    }
    return where;
  }
}
