import type { Request, Response, NextFunction } from 'express';

/**
 * Placeholder authentication middleware.
 * Replace this stub with real JWT / session validation before going to production.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // TODO: validate bearer token / session cookie
  const userId =
    (req.headers['x-forge-user-id'] as string | undefined) ?? 'anonymous';
  (req as Request & { user: { id: string } }).user = { id: userId };
  next();
}
