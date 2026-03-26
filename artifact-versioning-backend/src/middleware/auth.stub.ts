import type { Request, Response, NextFunction } from 'express';

/**
 * Placeholder authentication middleware.
 * Replace this stub with real JWT / session validation before going to production.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // TODO: validate bearer token / session cookie
  // For now, attach a mock identity so downstream code can reference req.user
  (req as Request & { user: { id: string } }).user = { id: 'anonymous' };
  next();
}
