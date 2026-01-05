/**
 * Flamoral Async Handler Wrapper
 *
 * A utility wrapper for Express async route handlers that:
 * - Catches rejected promises from async handlers
 * - Forwards errors to Express error middleware
 * - Eliminates try-catch boilerplate in route handlers
 * - Supports both standard Express handlers and typed handlers
 *
 * Without this wrapper, unhandled promise rejections in async handlers
 * would crash the server or return empty responses instead of proper errors.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

import { CorrelatedRequest } from './correlation-id.middleware';

/**
 * Standard async Express handler type
 */
export type AsyncRequestHandler<TRequest extends Request = Request, TResponse = any> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<TResponse | void>;

/**
 * Handler that can be sync or async
 */
export type MaybeAsyncHandler<TRequest extends Request = Request, TResponse = any> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<TResponse | void> | TResponse | void;

/**
 * Async Handler Wrapper
 *
 * Wraps an async route handler to automatically catch errors
 * and forward them to the Express error handling middleware.
 *
 * @example
 * ```typescript
 * import { asyncHandler } from '@flamoral/shared/middleware';
 *
 * // Without asyncHandler (bad - errors not caught):
 * router.get('/users', async (req, res) => {
 *   const users = await UserService.findAll(); // If this throws, crash!
 *   res.json(users);
 * });
 *
 * // With asyncHandler (good - errors forwarded to error middleware):
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await UserService.findAll(); // Errors are caught
 *   res.json(users);
 * }));
 * ```
 */
export function asyncHandler<TRequest extends Request = Request, TResponse = any>(
  handler: AsyncRequestHandler<TRequest, TResponse>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Execute the handler and catch any errors
    Promise.resolve(handler(req as TRequest, res, next)).catch(next);
  };
}

/**
 * Alternative name for asyncHandler
 * Some codebases prefer this naming convention
 */
export const catchAsync = asyncHandler;

/**
 * Wrap multiple handlers in asyncHandler
 *
 * @example
 * ```typescript
 * const [validateUser, createUser] = wrapAsync([
 *   async (req, res, next) => { ... },
 *   async (req, res, next) => { ... },
 * ]);
 * ```
 */
export function wrapAsync<TRequest extends Request = Request>(
  handlers: AsyncRequestHandler<TRequest>[]
): RequestHandler[] {
  return handlers.map((handler) => asyncHandler(handler));
}

/**
 * Handler wrapper with typed request
 * Useful when you have extended request types
 *
 * @example
 * ```typescript
 * interface AuthenticatedRequest extends Request {
 *   user: User;
 * }
 *
 * router.get('/profile', asyncHandlerTyped<AuthenticatedRequest>(async (req, res) => {
 *   // req.user is typed correctly
 *   res.json(req.user);
 * }));
 * ```
 */
export function asyncHandlerTyped<TRequest extends Request>(
  handler: AsyncRequestHandler<TRequest>
): RequestHandler {
  return asyncHandler(handler as AsyncRequestHandler<Request>);
}

/**
 * Create an async handler with correlation ID access
 * Ensures correlationId is available on the request
 */
export function asyncHandlerWithCorrelation(
  handler: AsyncRequestHandler<CorrelatedRequest>
): RequestHandler {
  return asyncHandler(handler as AsyncRequestHandler<Request>);
}

/**
 * Utility type for route handlers that return data
 * The wrapper will not send the response automatically
 */
export type DataHandler<TData, TRequest extends Request = Request> = (
  req: TRequest,
  res: Response
) => Promise<TData>;

/**
 * Create a handler that automatically sends JSON response
 * Reduces boilerplate for simple data-returning routes
 *
 * @example
 * ```typescript
 * router.get('/users/:id', jsonHandler(async (req) => {
 *   return await UserService.findById(req.params.id);
 *   // Response is automatically sent as JSON
 * }));
 * ```
 */
export function jsonHandler<TData, TRequest extends Request = Request>(
  handler: (req: TRequest, res: Response) => Promise<TData>
): RequestHandler {
  return asyncHandler(async (req, res) => {
    const data = await handler(req as TRequest, res);
    if (!res.headersSent) {
      res.json(data);
    }
  });
}

/**
 * Create a handler with status code
 *
 * @example
 * ```typescript
 * router.post('/users', statusHandler(201, async (req) => {
 *   return await UserService.create(req.body);
 * }));
 * ```
 */
export function statusHandler<TData, TRequest extends Request = Request>(
  statusCode: number,
  handler: (req: TRequest, res: Response) => Promise<TData>
): RequestHandler {
  return asyncHandler(async (req, res) => {
    const data = await handler(req as TRequest, res);
    if (!res.headersSent) {
      res.status(statusCode).json(data);
    }
  });
}

/**
 * Type guard to check if handler returns a Promise
 */
function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return value !== null && typeof value === 'object' && 'then' in value;
}

/**
 * Universal handler wrapper that works with both sync and async handlers
 *
 * @example
 * ```typescript
 * router.get('/sync', universalHandler((req, res) => {
 *   res.json({ message: 'sync' });
 * }));
 *
 * router.get('/async', universalHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 * ```
 */
export function universalHandler<TRequest extends Request = Request>(
  handler: MaybeAsyncHandler<TRequest>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = handler(req as TRequest, res, next);
      if (isPromise(result)) {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}

export default asyncHandler;
