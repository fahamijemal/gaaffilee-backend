import { describe, it, expect } from 'vitest';
import { AiRateLimiterService } from '../ai-rate-limiter.service';

describe('AiRateLimiterService', () => {
  it('does not throw when under the limit', () => {
    const limiter = new AiRateLimiterService(3);
    expect(() => limiter.assertCanRequestAi(0)).not.toThrow();
    expect(() => limiter.assertCanRequestAi(2)).not.toThrow();
  });

  it('throws AI_RATE_LIMIT when at the limit', () => {
    const limiter = new AiRateLimiterService(3);
    expect(() => limiter.assertCanRequestAi(3)).toThrow('AI_RATE_LIMIT');
  });

  it('throws AI_RATE_LIMIT when over the limit', () => {
    const limiter = new AiRateLimiterService(3);
    expect(() => limiter.assertCanRequestAi(5)).toThrow('AI_RATE_LIMIT');
  });

  it('respects a custom max calls value', () => {
    const limiter = new AiRateLimiterService(1);
    expect(() => limiter.assertCanRequestAi(0)).not.toThrow();
    expect(() => limiter.assertCanRequestAi(1)).toThrow('AI_RATE_LIMIT');
  });
});
