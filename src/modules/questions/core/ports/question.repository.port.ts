export interface QuestionFilterParams {
  subjectId: string;
  grade?: number;
  examYear?: string;
  chapterId?: string;
  studyMode: string;
  count: number;
  difficulty?: string;
}

export interface QuestionDelivery {
  id: string;
  question_text: string;
  options: { key: string; text: string }[];
  subject_id: string;
  chapter_id: string;
  chapter_name: string;
  grade: number;
  exam_year: string;
}

export interface QuestionWithAnswer extends QuestionDelivery {
  correct_answer: string;
  explanation: string | null;
}

export abstract class QuestionRepositoryPort {
  abstract findFiltered(params: QuestionFilterParams): Promise<QuestionWithAnswer[]>;
  abstract findById(id: string): Promise<QuestionWithAnswer | null>;
}
