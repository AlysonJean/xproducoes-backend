import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from './asyncHandler';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Router seguro que envolve automaticamente handlers async em asyncHandler().
 * 
 * Substitui o Router padrão do Express para garantir que TODOS os handlers async
 * tenham seus erros capturados e redirecionados para next() automaticamente.
 * 
 * Isso previne o bug crítico onde `throw` em async handlers causa requests pendurados.
 * 
 * @example
 * import { createSafeRouter } from '../middlewares/safeRouter';
 * const router = createSafeRouter();
 * 
 * // Handlers async são automaticamente protegidos:
 * router.get('/users', async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users); // Se getUsers() falhar, next(error) é chamado automaticamente
 * });
 */

function isAsyncFunction(fn: any): fn is AsyncRequestHandler {
  return fn.constructor.name === 'AsyncFunction' || 
         (typeof fn === 'function' && fn.toString().includes('__awaiter'));
}

function wrapHandler(handler: any): any {
  if (typeof handler === 'function' && isAsyncFunction(handler)) {
    return asyncHandler(handler as AsyncRequestHandler);
  }
  return handler;
}

function wrapHandlers(handlers: any[]): any[] {
  return handlers.map(wrapHandler);
}

export function createSafeRouter(options?: Parameters<typeof Router>[0]): Router {
  const router = Router(options);

  // Intercept HTTP method registration to auto-wrap async handlers
  const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

  for (const method of methods) {
    const original = (router as any)[method].bind(router);
    (router as any)[method] = (path: any, ...handlers: any[]) => {
      return original(path, ...wrapHandlers(handlers));
    };
  }

  return router;
}

export default createSafeRouter;
