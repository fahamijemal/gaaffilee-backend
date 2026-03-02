import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderPort, ChatMessage, ExplainContext, HintContext } from '../core/ports/ai-provider.port';
import { PromptBuilderService } from '../core/prompt-builder.service';

@Injectable()
export class GeminiAdapter extends AiProviderPort {
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly promptBuilder = new PromptBuilderService();
  private readonly apiKey: string;
  private readonly flashModel: string;
  private readonly proModel: string;
  private readonly timeoutMs: number;

  constructor(private config: ConfigService) {
    super();
    this.apiKey = config.get<string>('GEMINI_API_KEY', '');
    this.flashModel = config.get<string>('GEMINI_FLASH_MODEL', 'gemini-1.5-flash');
    this.proModel = config.get<string>('GEMINI_PRO_MODEL', 'gemini-1.5-pro');
    this.timeoutMs = config.get<number>('GEMINI_TIMEOUT_MS', 5000);
  }

  async getHint(ctx: HintContext): Promise<string> {
    const prompt = this.promptBuilder.buildHintPrompt(ctx);
    return this.callGemini(this.flashModel, prompt);
  }

  async explain(ctx: ExplainContext): Promise<string> {
    const prompt = this.promptBuilder.buildExplainPrompt(ctx);
    return this.callGemini(this.proModel, prompt);
  }

  async chat(ctx: ExplainContext, messages: ChatMessage[]): Promise<string> {
    const systemPrompt = this.promptBuilder.buildExplainPrompt(ctx);
    const fullMessages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    ];
    return this.callGeminiChat(this.proModel, fullMessages);
  }

  async generateWeaknessReport(summary: string): Promise<string> {
    const prompt = this.promptBuilder.buildWeaknessPrompt(summary);
    return this.callGemini(this.proModel, prompt);
  }

  async generateDraftQuestions(ctx: any): Promise<any[]> {
    const prompt = `Generate ${ctx.count} multiple-choice questions for Ethiopian Grade ${ctx.grade} ${ctx.subject}, Chapter: ${ctx.chapter_title}.
Difficulty: ${ctx.difficulty || 'medium'}
Return ONLY valid JSON array: [{"question_text":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"A|B|C|D","explanation":"..."}]`;
    const raw = await this.callGemini(this.proModel, prompt);
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return [];
    }
  }

  private async callGemini(model: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 512 } };
    return this.fetchWithTimeout(url, body);
  }

  private async callGeminiChat(model: string, contents: any[]): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const body = { contents, generationConfig: { temperature: 0.4, maxOutputTokens: 1024 } };
    return this.fetchWithTimeout(url, body);
  }

  private async fetchWithTimeout(url: string, body: any): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ServiceUnavailableException({ error_code: 'AI_UNAVAILABLE', message: 'AI service returned an error.' });
      }
      const data = await response.json() as any;
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        throw new ServiceUnavailableException({ error_code: 'AI_UNAVAILABLE', message: 'AI service timed out.' });
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
