import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status ?? 500;
  const isProd = env.NODE_ENV === 'production';

  // Map known DB constraint codes
  let resolvedStatus = status;
  if (err.code === '23505') resolvedStatus = 409; // unique violation

  const body: Record<string, unknown> = {
    type: `https://httpstatuses.com/${resolvedStatus}`,
    title: httpTitle(resolvedStatus),
    status: resolvedStatus,
    detail: isProd && resolvedStatus === 500 ? 'An internal error occurred' : err.message,
    instance: req.originalUrl,
  };

  if (!isProd && resolvedStatus === 500) {
    body['stack'] = err.stack;
  }

  console.error(`[error] ${req.method} ${req.originalUrl} → ${resolvedStatus}:`, err.message);
  res.status(resolvedStatus).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    type: 'https://httpstatuses.com/404',
    title: 'Not Found',
    status: 404,
    detail: `${req.method} ${req.originalUrl} not found`,
    instance: req.originalUrl,
  });
}

function httpTitle(status: number): string {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    502: 'Bad Gateway',
    500: 'Internal Server Error',
  };
  return titles[status] ?? 'Error';
}
