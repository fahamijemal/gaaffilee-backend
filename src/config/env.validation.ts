import { IsEnum, IsNumber, IsString, MinLength, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

class EnvironmentVariables {
  @IsEnum(['development', 'staging', 'production'])
  NODE_ENV: string = 'development';

  @IsNumber()
  PORT: number = 4000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  DIRECT_URL: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsNumber()
  JWT_EXPIRY_SECONDS: number = 604800;

  @IsString()
  REDIS_URL: string;

  @IsString()
  GEMINI_API_KEY: string;

  @IsString()
  GEMINI_FLASH_MODEL: string = 'gemini-1.5-flash';

  @IsString()
  GEMINI_PRO_MODEL: string = 'gemini-1.5-pro';

  @IsNumber()
  GEMINI_TIMEOUT_MS: number = 5000;

  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  SMTP_PORT: number = 587;

  @IsString()
  SMTP_USER: string;

  @IsString()
  SMTP_PASS: string;

  @IsString()
  EMAIL_FROM: string;

  @IsString()
  CORS_ALLOWED_ORIGINS: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.toString()}`);
  }
  return validatedConfig;
}

// Export as schema alias so app.module still imports fine
export const envValidationSchema = { validate };
