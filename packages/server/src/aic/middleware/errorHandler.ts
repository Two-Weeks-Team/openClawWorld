import type { Request, Response, NextFunction } from 'express';
import type { AicErrorObject, AicErrorCode } from '@openclawworld/shared';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly code: AicErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean = false,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toErrorObject(): AicErrorObject {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

function formatZodError(error: ZodError): Record<string, unknown> {
  const issues = error.issues.map(issue => ({
    path: issue.path.join('.') || '/',
    issue: issue.message,
  }));

  return {
    validationErrors: issues,
  };
}

// body-parser wraps parse errors in an HttpError (via http-errors) with a
// status code and a 'type' property. Each error type maps to a specific HTTP
// status: entity.parse.failed → 400, entity.too.large → 413,
// encoding.unsupported / charset.unsupported → 415.
const BODY_PARSER_400_TYPES = new Set(['entity.parse.failed']);
const BODY_PARSER_413_TYPES = new Set(['entity.too.large']);
const BODY_PARSER_415_TYPES = new Set(['encoding.unsupported', 'charset.unsupported']);

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      status: 'error',
      error: err.toErrorObject(),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'bad_request' as AicErrorCode,
        message: 'Invalid request body',
        retryable: false,
        details: formatZodError(err),
      },
    });
    return;
  }

  const errAny = err as unknown as { type?: string; status?: number };
  const errType = typeof errAny.type === 'string' ? errAny.type : '';

  if (
    (err instanceof SyntaxError && errType === 'entity.parse.failed') ||
    BODY_PARSER_400_TYPES.has(errType)
  ) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'bad_request' as AicErrorCode,
        message: 'Invalid JSON in request body',
        retryable: false,
      },
    });
    return;
  }

  if (BODY_PARSER_413_TYPES.has(errType)) {
    res.status(413).json({
      status: 'error',
      error: {
        code: 'bad_request' as AicErrorCode,
        message: 'Request entity too large',
        retryable: false,
      },
    });
    return;
  }

  if (BODY_PARSER_415_TYPES.has(errType)) {
    res.status(415).json({
      status: 'error',
      error: {
        code: 'bad_request' as AicErrorCode,
        message: 'Unsupported media type or encoding',
        retryable: false,
      },
    });
    return;
  }

  console.error('[ErrorHandler] Unhandled error:', err);

  res.status(500).json({
    status: 'error',
    error: {
      code: 'internal' as AicErrorCode,
      message: 'Internal server error',
      retryable: true,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    error: {
      code: 'not_found' as AicErrorCode,
      message: `Route not found: ${req.method} ${req.path}`,
      retryable: false,
    },
  });
}
