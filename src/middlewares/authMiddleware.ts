import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/environment";

interface JWTPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Estender o tipo Request para incluir informações do utilizador
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      authUser?: JWTPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Token de autorização não fornecido" });
  }

  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    return res.status(401).json({ message: "Formato de token inválido" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    req.authUser = decoded;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expirado" });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Token inválido" });
    } else {
      return res.status(401).json({ message: "Erro de autenticação" });
    }
  }
}

// Middleware para garantir que só ADMIN acesse
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "Acesso negado: Apenas administradores" });
  }
  return next();
}

// Middleware para garantir que só COLLABORATOR acesse
export function collaboratorOnly(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.userRole !== "COLLABORATOR") {
    return res
      .status(403)
      .json({ message: "Acesso negado: Apenas colaboradores" });
  }
  return next();
}

// Middleware para garantir que ADMIN ou COLLABORATOR tenham acesso
export function adminOrCollaborator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.userRole !== "ADMIN" && req.userRole !== "COLLABORATOR") {
    return res.status(403).json({
      message: "Acesso negado: Apenas administradores ou colaboradores",
    });
  }
  return next();
}

// Middleware opcional de autenticação (não falha se não houver token)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    req.authUser = decoded;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
  } finally {
    // Se falhar, apenas segue sem autenticação
  }

  next();
}
