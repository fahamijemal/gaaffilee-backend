import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error_code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      error_code = body?.error_code || this.statusToCode(status);
      message = body?.message || exception.message;
      details = body?.details || null;
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      error_code,
      message,
      details,
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      503: 'SERVICE_UNAVAILABLE',
      500: 'INTERNAL_ERROR',
    };
    return map[status] || 'INTERNAL_ERROR';
  }
}
