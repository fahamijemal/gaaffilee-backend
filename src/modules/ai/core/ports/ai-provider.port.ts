export interface HintContext {
  subject: string; grade: number; chapter: string;
  question_text: string; options: { key: string; text: string }[];
  hint_number: number;
}

export interface ExplainContext extends HintContext {
  correct_answer: string; student_answer: string; exam_year?: string;
}

export interface ChatMessage { role: 'user' | 'model'; content: string; }

export abstract class AiProviderPort {
  abstract getHint(ctx: HintContext): Promise<string>;
  abstract explain(ctx: ExplainContext): Promise<string>;
  abstract chat(ctx: ExplainContext, messages: ChatMessage[]): Promise<string>;
  abstract generateWeaknessReport(summary: string): Promise<string>;
  abstract generateDraftQuestions(ctx: any): Promise<any[]>;
}
