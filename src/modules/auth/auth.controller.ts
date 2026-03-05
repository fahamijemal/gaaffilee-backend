import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  LoginResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
  ForgotPasswordResponseDto,
  VerifyOtpResponseDto,
  ResetPasswordResponseDto,
  UserDto,
} from './dto/auth-responses.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register student account — returns JWT immediately' })
  @ApiResponse({ status: 201, description: 'Registered and logged in', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'EMAIL_ALREADY_EXISTS' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login — returns JWT + user object' })
  @ApiResponse({ status: 200, description: 'Login success', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 429, description: 'Account soft-locked (5 failures)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiBearerAuth('JWT')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh JWT (only within 24h of expiry)' })
  @ApiResponse({ status: 200, description: 'Refreshed tokens', type: RefreshResponseDto })
  refresh(@CurrentUser() user: JwtPayload) {
    return this.authService.refresh(user);
  }

  @Post('logout')
  @ApiBearerAuth('JWT')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invalidate token — adds jti to Redis denylist' })
  @ApiResponse({ status: 200, description: 'Logout success', type: LogoutResponseDto })
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.jti, user.exp);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request 6-digit OTP (always returns 200 to prevent enumeration)' })
  @ApiResponse({ status: 200, description: 'OTP requested', type: ForgotPasswordResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP — returns short-lived reset_token' })
  @ApiResponse({ status: 200, description: 'OTP verified', type: VerifyOtpResponseDto })
  @ApiResponse({ status: 422, description: 'OTP_INVALID | OTP_EXPIRED | OTP_MAX_ATTEMPTS' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set new password using verified reset_token' })
  @ApiResponse({ status: 200, description: 'Password reset', type: ResetPasswordResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.reset_token, dto.new_password);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserDto })
  getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  @Patch('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update own profile (name, grade, stream, school)' })
  @ApiResponse({ status: 200, description: 'Updated user profile', type: UserDto })
  updateMe(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(userId, dto);
  }
}
