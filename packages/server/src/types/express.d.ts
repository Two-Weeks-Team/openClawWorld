import type { Request as ExpressRequest } from 'express';

declare module 'express' {
  interface Request {
    requestId?: string;
    authToken?: string;
    validatedBody?: unknown;
  }
}
