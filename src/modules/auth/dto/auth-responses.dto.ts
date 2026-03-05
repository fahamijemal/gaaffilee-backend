import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'Abebe Bekele' })
  name: string;

  @ApiProperty({ example: 'abebe@example.com' })
  email: string;

  @ApiProperty({ example: 'student', enum: ['student', 'teacher', 'admin'] })
  role: string;

  @ApiProperty({ example: 11, nullable: true })
  grade: number;

  @ApiProperty({ example: 'natural', nullable: true, enum: ['natural', 'social'] })
  stream: string;

  @ApiProperty({ example: 'Addis Ababa Science School', nullable: true })
  school: string;

  @ApiProperty({ example: '2026-01-15T12:00:00Z' })
  created_at: Date;
}

export class LoginResponseDto {
  @ApiProperty()
  user: UserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out' })
  message: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: 'If the email exists, an OTP has been sent.' })
  message: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6g7h8i9j0...' })
  reset_token: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ example: 'Password reset successful' })
  message: string;
}
