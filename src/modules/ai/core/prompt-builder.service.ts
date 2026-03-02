// Pure TypeScript — NO NestJS, NO Prisma imports
import { HintContext, ExplainContext } from './ports/ai-provider.port';

export class PromptBuilderService {
  buildHintPrompt(ctx: HintContext): string {
    const options = ctx.options.map((o) => `${o.key}) ${o.text}`).join('\n');
    return `You are a Socratic tutor for Ethiopian Grade ${ctx.grade} ${ctx.subject} (Chapter: ${ctx.chapter}).
Question: ${ctx.question_text}
Options:\n${options}

Provide hint #${ctx.hint_number}. IMPORTANT:
- Do NOT reveal the correct answer letter
- Do NOT solve the problem fully
- Guide the student's thinking with a leading question or concept reminder
- Keep the hint to 2-3 sentences`;
  }

  buildExplainPrompt(ctx: ExplainContext): string {
    const options = ctx.options.map((o) => `${o.key}) ${o.text}`).join('\n');
    return `You are an expert Ethiopian curriculum tutor for Grade ${ctx.grade} ${ctx.subject}.
Question: ${ctx.question_text}
Options:\n${options}
Correct answer: ${ctx.correct_answer}
Student answered: ${ctx.student_answer}

Provide a clear, curriculum-aligned explanation:
1. State the correct answer and why it is correct
2. Explain the key concept tested
3. If student was wrong, gently explain their mistake
Keep it under 150 words.`;
  }

  buildWeaknessPrompt(summary: string): string {
    return `You are a study advisor for Ethiopian EUEE students.
Based on this performance summary:\n${summary}

Write a personalised 3-4 sentence study advice message that:
- Identifies 1-2 specific weak areas
- Suggests a concrete study strategy
- Ends with encouragement
Keep it friendly and motivating.`;
  }
}
