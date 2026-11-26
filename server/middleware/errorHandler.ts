import type { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getSafeErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object' || !('code' in err)) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,32}$/.test(code) ? code : undefined;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : 'Internal server error';
  if (status >= 500) {
    console.error('[api] Request failed', {
      status,
      errorName: err instanceof Error ? err.name : 'UnknownError',
      code: getSafeErrorCode(err),
    });
  }
  res.status(status).json({ error: message });
}
