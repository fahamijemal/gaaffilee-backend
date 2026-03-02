import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;       // user CUID
  jti: string;       // unique token ID — denylist key
  role: 'student' | 'teacher' | 'admin';
  grade: number | null;
  stream: 'natural' | 'social' | null;
  iat: number;
  exp: number;
}

export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    return field ? user?.[field] : user;
  },
);
