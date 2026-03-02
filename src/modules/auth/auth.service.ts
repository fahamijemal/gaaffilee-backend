import {
  ConflictException, ForbiddenException, Injectable, NotFoundException,
  UnauthorizedException, UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  JWT_DENYLIST_PREFIX, LOGIN_FAILURES_PREFIX,
  LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILURES,
  OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS,
  RESET_TOKEN_EXPIRY_MINUTES,
} from '../../config/constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ error_code: 'EMAIL_ALREADY_EXISTS', message: 'Email already registered.' });
    }
    const password_hash = await bcrypt.hash(dto.password.substring(0, 72), 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email, password_hash, grade: dto.grade, stream: dto.stream, school: dto.school },
      select: { id: true, name: true, email: true, grade: true, stream: true, role: true, is_active: true, created_at: true },
    });
    const token = this.signToken(user);
    return { token, user };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const lockKey = `${LOGIN_FAILURES_PREFIX}${email}`;

    // Check soft lock
    const failures = parseInt(await this.redis.get(lockKey) || '0', 10);
    if (failures >= LOGIN_MAX_FAILURES) {
      throw new UnauthorizedException({ error_code: 'TOO_MANY_REQUESTS', message: `Account locked. Try again in ${LOGIN_LOCK_MINUTES} minutes.` });
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.password.substring(0, 72), user.password_hash))) {
      const newCount = failures + 1;
      await this.redis.set(lockKey, String(newCount));
      await this.redis.expire(lockKey, LOGIN_LOCK_MINUTES * 60);
      throw new UnauthorizedException({ error_code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    }

    if (!user.is_active) {
      throw new ForbiddenException({ error_code: 'FORBIDDEN', message: 'Account suspended.' });
    }

    // Clear failures on success
    await this.redis.del(lockKey);

    const userObj = { id: user.id, name: user.name, email: user.email, grade: user.grade, stream: user.stream, role: user.role, is_active: user.is_active, created_at: user.created_at };
    const token = this.signToken(user);
    return { token, user: userObj };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────
  async refresh(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, grade: true, stream: true, role: true, is_active: true, created_at: true },
    });
    if (!user || !user.is_active) throw new UnauthorizedException();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - nowSeconds;
    if (expiresIn > 24 * 60 * 60) {
      throw new UnprocessableEntityException({ error_code: 'TOKEN_NOT_EXPIRING', message: 'Token not expiring within 24 hours.' });
    }
    return { token: this.signToken(user) };
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(jti: string, exp: number) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`${JWT_DENYLIST_PREFIX}${jti}`, ttl, '1');
    }
    return { message: 'Logged out successfully.' };
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const normalised = email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalised } });
    // Always return 200 — prevents email enumeration
    if (!user) return { message: 'If that email exists, an OTP has been sent.' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_hash = crypto.createHash('sha256').update(otp).digest('hex');
    const otp_expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.user.update({
      where: { email: normalised },
      data: { otp_hash, otp_expires_at, otp_attempts: 0 },
    });

    await this.sendOtpEmail(user.email, user.name, otp);
    return { message: 'If that email exists, an OTP has been sent.' };
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────
  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.otp_hash) {
      throw new UnprocessableEntityException({ error_code: 'OTP_INVALID', message: 'Invalid or expired OTP.' });
    }
    if (user.otp_attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnprocessableEntityException({ error_code: 'OTP_MAX_ATTEMPTS', message: 'Maximum attempts exceeded. Request a new OTP.' });
    }
    if (!user.otp_expires_at || user.otp_expires_at < new Date()) {
      throw new UnprocessableEntityException({ error_code: 'OTP_EXPIRED', message: 'OTP has expired.' });
    }
    const submitted_hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (submitted_hash !== user.otp_hash) {
      await this.prisma.user.update({ where: { id: user.id }, data: { otp_attempts: { increment: 1 } } });
      throw new UnprocessableEntityException({ error_code: 'OTP_INVALID', message: 'Incorrect OTP.' });
    }
    // Valid — generate reset token, clear OTP
    const reset_token = randomUUID();
    const reset_token_hash = crypto.createHash('sha256').update(reset_token).digest('hex');
    const reset_token_expires_at = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp_hash: null, otp_expires_at: null, otp_attempts: 0, reset_token_hash, reset_token_expires_at },
    });
    return { reset_token };
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(reset_token: string, new_password: string) {
    const token_hash = crypto.createHash('sha256').update(reset_token).digest('hex');
    const user = await this.prisma.user.findFirst({ where: { reset_token_hash: token_hash } });
    if (!user || !user.reset_token_expires_at || user.reset_token_expires_at < new Date()) {
      throw new UnprocessableEntityException({ error_code: 'OTP_EXPIRED', message: 'Reset token invalid or expired.' });
    }
    const password_hash = await bcrypt.hash(new_password.substring(0, 72), 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password_hash, reset_token_hash: null, reset_token_expires_at: null },
    });
    return { message: 'Password updated successfully.' };
  }

  // ── Get Me ────────────────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, grade: true, stream: true, role: true, is_active: true, school: true, created_at: true, updated_at: true },
    });
    if (!user) throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'User not found.' });
    return user;
  }

  // ── Update Me ─────────────────────────────────────────────────────────────
  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, name: true, email: true, grade: true, stream: true, role: true, is_active: true, school: true, updated_at: true },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private signToken(user: any): string {
    const payload = {
      sub: user.id,
      role: user.role,
      grade: user.grade ?? null,
      stream: user.stream ?? null,
    };
    return this.jwt.sign(payload, { jwtid: randomUUID() });
  }

  private async sendOtpEmail(email: string, name: string, otp: string) {
    try {
      const transporter = nodemailer.createTransport({
        host: this.config.get('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT'),
        auth: { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASS') },
      });
      await transporter.sendMail({
        from: this.config.get('EMAIL_FROM'),
        to: email,
        subject: 'Gaaffilee — Password Reset OTP',
        html: `<p>Hello ${name},</p><p>Your OTP is: <strong>${otp}</strong></p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
      });
    } catch (err) {
      // Log but do not throw — user already got success response
      console.error('OTP email failed:', err);
    }
  }
}
