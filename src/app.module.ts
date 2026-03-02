import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { AiModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AdminModule } from './modules/admin/admin.module';

const FEATURE_MODULES = [
  AuthModule,
  NavigationModule,
  QuestionsModule,
  SessionsModule,
  AiModule,
  DashboardModule,
  AdminModule,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLER_TTL || '60000', 10),
      limit: parseInt(process.env.THROTTLER_LIMIT || '100', 10),
    }]),
    PrismaModule,
    RedisModule,
    ...FEATURE_MODULES,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
