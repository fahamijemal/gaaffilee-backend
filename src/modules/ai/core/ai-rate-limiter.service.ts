// Pure TypeScript — NO NestJS, NO Prisma imports
export class AiRateLimiterService {
  constructor(private readonly maxCallsPerSession: number) {}

  assertCanRequestAi(aiCallsUsed: number): void {
    if (aiCallsUsed >= this.maxCallsPerSession) {
      throw new Error('AI_RATE_LIMIT');
    }
  }
}
