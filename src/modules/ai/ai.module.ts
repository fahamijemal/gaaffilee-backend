import { Module } from '@nestjs/common';
import { AiController } from './presentation/ai.controller';
import { GeminiAdapter } from './infrastructure/gemini.adapter';
import { AiProviderPort } from './core/ports/ai-provider.port';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  controllers: [AiController],
  providers: [{ provide: AiProviderPort, useClass: GeminiAdapter }],
})
export class AiModule {}
