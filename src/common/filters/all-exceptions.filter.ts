import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[] | object;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] | object = 'Internal server error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as { message: string | string[] }).message;
      } else {
        message = res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // --- Prisma Specific Handlers ---
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[]) || [];
          message = `The ${target.join(', ')} is already in use.`;
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          message = exception.message || 'Record not found';
          break;
        }
        default:
          break;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} error`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} ${status} warning: ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
