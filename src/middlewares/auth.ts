/**
 * @deprecated Este arquivo foi consolidado em unifiedAuth.ts
 * Use: import { authenticate, requireCollaborator, requireRole } from "../middlewares/unifiedAuth"
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { config as envConfig } from "../config/environment";
const config = { jwtSecret: envConfig.jwtSecret };

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string | UserRole;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Token de autorização não fornecido" });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      return next();
    } catch {
      return res.status(401).json({ message: "Token de autorização inválido" });
    }
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole as UserRole)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    return next();
  };
};

export const requireAdmin = requireRole(["ADMIN"]);
export const requireCollaborator = requireRole(["COLLABORATOR", "ADMIN"]);
export const requireClient = requireRole(["CLIENT", "ADMIN"]);
