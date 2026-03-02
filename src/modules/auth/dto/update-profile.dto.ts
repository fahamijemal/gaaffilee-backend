import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Abebe Bekele' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 11, enum: [9, 10, 11, 12] })
  @IsOptional()
  @IsInt()
  @Min(9)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ example: 'natural', enum: ['natural', 'social'] })
  @IsOptional()
  @IsEnum(['natural', 'social'])
  stream?: 'natural' | 'social';

  @ApiPropertyOptional({ example: 'Addis Ababa Science School' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  school?: string;
}
