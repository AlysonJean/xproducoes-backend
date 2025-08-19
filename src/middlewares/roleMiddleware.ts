import { Request, Response, NextFunction } from "express";

/**
 * Middleware para checar se o usuário possui um dos papéis permitidos.
 * Exemplo de uso: app.use('/rota', roleMiddleware(['ADMIN', 'USER']))
 */
export function roleMiddleware(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Supondo que req.userRole é preenchido pelo middleware de autenticação
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    return next();
  };
}

/**
 * Middleware para exigir que o usuário seja ADMIN.
 * Exemplo de uso: app.use('/rota-admin', adminOnly)
 */
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "Acesso restrito a administradores." });
  }
  return next();
}
