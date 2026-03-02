import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'abebe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482931', description: '6-digit OTP' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
