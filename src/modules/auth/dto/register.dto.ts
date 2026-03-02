import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Abebe Bekele', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'abebe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 11, enum: [9, 10, 11, 12] })
  @IsInt()
  @Min(9)
  @Max(12)
  grade: number;

  @ApiProperty({ example: 'natural', enum: ['natural', 'social'] })
  @IsEnum(['natural', 'social'])
  stream: 'natural' | 'social';

  @ApiPropertyOptional({ example: 'Addis Ababa Science School' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  school?: string;
}
