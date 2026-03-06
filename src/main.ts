import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['warn', 'error']
      : ['log', 'debug', 'error', 'verbose', 'warn'],
  });

  // ── Global prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('v1');

  // ── CORS ───────────────────────────────────────────────────────────────────
  const origins = (process.env.CORS_ALLOWED_ORIGINS || 'https://gaaffilee-frontend.vercel.app').split(',');
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
    maxAge: 86400,
  });

  // ── Global pipes ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters & interceptors ─────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Gaaffilee Qorumsa Barnootaa API')
      .setDescription(
        '🇪🇹 Ethiopian Grade 9–12 National Exam Practice Platform\n\n' +
        '**Authentication:** Use `POST /v1/auth/login` to get a Bearer token, then click **Authorize** above.\n\n' +
        '**Guest access:** Endpoints marked `Public` require no token.\n\n' +
        '**Base URL:** `https://gaaffilee-backend.onrender.com/v1`',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT issued by POST /v1/auth/login' },
        'JWT',
      )
      .addTag('Auth', 'Registration, login, JWT refresh, OTP password reset')
      .addTag('Navigation', 'Public read-only: streams, subjects, chapters, years')
      .addTag('Questions', 'Public quiz question delivery (correct_answer never exposed)')
      .addTag('Sessions', 'Authenticated quiz session lifecycle')
      .addTag('AI', 'Gemini AI hints, explanations, chat, weakness analysis')
      .addTag('Dashboard', 'Student personal performance analytics')
      .addTag('Admin', 'Question CRUD, user management, analytics (admin only)')
      .addServer('http://localhost:4000', 'Local Development')
      .addServer('http://16.170.163.115:4000', 'EC2 (AWS Free Tier)')
      .addServer('https://staging-api.gaaffilee.et', 'Staging')
      .addServer('https://gaaffilee-backend.onrender.com', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'Gaaffilee API Docs',
      customCss: '.swagger-ui .topbar { background-color: #0E7490; }',
    });

    console.log(`📚 Swagger UI → http://localhost:${process.env.PORT || 4000}/docs`);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Gaaffilee API running → http://localhost:${port}/v1`);
}

bootstrap();
