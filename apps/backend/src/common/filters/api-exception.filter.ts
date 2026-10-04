import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Standardisasi seluruh respons error API ke bentuk:
 *
 *   { success: false, statusCode, message, error }
 *
 * `message` selalu string (array message dari ValidationPipe di-join)
 * supaya klien web (normalizeApiError) cukup membaca satu field.
 * Error tak dikenal disembunyikan detailnya agar tidak membocorkan
 * internal ke response.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();

      let message = exception.message;
      let error: string | undefined;
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const raw = (body as Record<string, unknown>).message;
        if (Array.isArray(raw)) {
          message = raw.join(', ');
        } else if (typeof raw === 'string') {
          message = raw;
        }
        const rawError = (body as Record<string, unknown>).error;
        if (typeof rawError === 'string') {
          error = rawError;
        }
      }

      response
        .status(statusCode)
        .json({ success: false, statusCode, message, error });
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
}
