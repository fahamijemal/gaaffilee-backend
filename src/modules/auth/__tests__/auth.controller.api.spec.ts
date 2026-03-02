import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

@Controller('auth')
class AuthApiSmokeController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

describe('API smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthApiSmokeController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/auth/health responds with 200', async () => {
    await request(app.getHttpServer())
      .get('/v1/auth/health')
      .expect(200)
      .expect({ ok: true });
  });
});
