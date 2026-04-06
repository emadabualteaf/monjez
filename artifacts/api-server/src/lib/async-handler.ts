import { type Request, type Response, type NextFunction } from "express";

/**
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
