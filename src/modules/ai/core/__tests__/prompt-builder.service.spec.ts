import { describe, it, expect } from 'vitest';
import { PromptBuilderService } from '../prompt-builder.service';

describe('PromptBuilderService', () => {
  const builder = new PromptBuilderService();

  const hintCtx = {
    subject: 'Physics',
    grade: 11,
    chapter: 'Kinematics',
    question_text: 'What is the SI unit of acceleration?',
    options: [
      { key: 'A', text: 'm/s' },
      { key: 'B', text: 'm/s²' },
      { key: 'C', text: 'kg' },
      { key: 'D', text: 'N' },
    ],
    hint_number: 1,
  };

  const explainCtx = {
    subject: 'Physics',
    grade: 11,
    chapter: 'Kinematics',
    question_text: 'What is the SI unit of acceleration?',
    options: [
      { key: 'A', text: 'm/s' },
      { key: 'B', text: 'm/s²' },
      { key: 'C', text: 'kg' },
      { key: 'D', text: 'N' },
    ],
    correct_answer: 'B',
    student_answer: 'A',
    hint_number: 0,
  };

  it('buildHintPrompt includes subject, grade, chapter, question text, and hint number', () => {
    const prompt = builder.buildHintPrompt(hintCtx);
    expect(prompt).toContain('Physics');
    expect(prompt).toContain('11');
    expect(prompt).toContain('Kinematics');
    expect(prompt).toContain('What is the SI unit of acceleration?');
    expect(prompt).toContain('hint #1');
    expect(prompt).toContain('Do NOT reveal the correct answer');
  });

  it('buildHintPrompt includes all options', () => {
    const prompt = builder.buildHintPrompt(hintCtx);
    expect(prompt).toContain('A) m/s');
    expect(prompt).toContain('B) m/s²');
    expect(prompt).toContain('C) kg');
    expect(prompt).toContain('D) N');
  });

  it('buildExplainPrompt includes correct answer and student answer', () => {
    const prompt = builder.buildExplainPrompt(explainCtx);
    expect(prompt).toContain('Physics');
    expect(prompt).toContain('11');
    expect(prompt).toContain('Correct answer: B');
    expect(prompt).toContain('Student answered: A');
  });

  it('buildWeaknessPrompt includes performance summary', () => {
    const summary = 'Session 1: 45% (Needs Revision)\nSession 2: 52% (Fair)';
    const prompt = builder.buildWeaknessPrompt(summary);
    expect(prompt).toContain(summary);
    expect(prompt).toContain('EUEE');
  });
});
