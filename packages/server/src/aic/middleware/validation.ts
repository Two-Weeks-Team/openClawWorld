import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import type { AicErrorCode } from '@openclawworld/shared';

function formatZodError(error: ZodError): { path: string; issue: string } {
  const issue = error.issues[0];
  const path = issue.path.length > 0 ? `/${issue.path.join('/')}` : '/';

  return {
    path,
    issue: issue.message,
  };
}

function createValidationError(error: ZodError): {
  status: 'error';
  error: {
    code: AicErrorCode;
    message: string;
    retryable: false;
    details: { path: string; issue: string };
  };
} {
  return {
    status: 'error',
    error: {
      code: 'bad_request',
      message: 'Invalid request body',
      retryable: false,
      details: formatZodError(error),
    },
  };
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.body);
      req.validatedBody = result as z.infer<T>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(createValidationError(error));
        return;
      }
      throw error;
    }
  };
}

export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json(createValidationError(result.error));
      return;
    }

    req.validatedBody = result.data as z.infer<T>;
    next();
  };
}
