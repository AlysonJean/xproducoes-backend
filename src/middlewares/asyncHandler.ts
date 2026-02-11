import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper para handlers assíncronos do Express.
 *
 * O Express 4.x NÃO captura promises rejeitadas em handlers async.
 * Sem este wrapper, um `throw` ou promise rejeitada em um handler async
 * faz o request ficar pendurado para sempre (sem resposta ao cliente).
 *
 * Com este wrapper, qualquer erro é automaticamente passado para `next()`,
 * alcançando o error handler global sem precisar de try/catch manual.
 *
 * @example
 * // Antes (vulnerável — request trava se der erro):
 * router.get('/users', async (req, res) => {
 *   const users = await getUsers(); // se falhar, request trava
 *   res.json(users);
 * });
 *
 * // Depois (seguro — erro vai para o error handler):
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers(); // se falhar, next(error) automático
 *   res.json(users);
 * }));
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
