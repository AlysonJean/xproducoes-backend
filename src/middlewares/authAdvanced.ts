/**
 * 🔐 Sistema de Autorização Avançado com RBAC
 * Controle granular de permissões por recurso e ação
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config as envConfig } from "../config/environment";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";

// ===== TIPOS =====

// ===== INTERFACES =====

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string | UserRole;
    isActive: boolean;
  };
}

// ===== MIDDLEWARE DE AUTENTICAÇÃO JWT =====

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Token de acesso obrigatório",
        code: "MISSING_TOKEN",
      });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, envConfig.jwtSecret) as any;

    if (!decoded.userId || !decoded.role) {
      res.status(401).json({
        success: false,
        message: "Token inválido ou malformado",
        code: "INVALID_TOKEN",
      });
      return;
    }

    // Verifica se usuário ainda está ativo no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user?.isActive) {
      res.status(401).json({
        success: false,
        message: "Usuário inativo ou não encontrado",
        code: "USER_INACTIVE",
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token expirado",
        code: "TOKEN_EXPIRED",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Token inválido",
        code: "INVALID_TOKEN",
      });
    } else {
      console.error("Erro na autenticação:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        code: "AUTH_ERROR",
      });
    }
  }
};

// ===== SISTEMA DE AUTORIZAÇÃO FLEXÍVEL =====

const hasPermission = (
  userRole: UserRole,
  _resource: string,
  _action: string,
  _user?: any,
  _resourceId?: string,
): boolean => {
  if (userRole === "ADMIN") return true;
  return false;
};

const authorize = (
  resource: string,
  action: string,
  getResourceId?: (req: AuthenticatedRequest) => string,
) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
        code: "NOT_AUTHENTICATED",
      });
      return;
    }
    const resourceId = getResourceId ? getResourceId(req) : undefined;
    if (
      !hasPermission(
        req.user.role as UserRole,
        resource,
        action,
        req.user,
        resourceId,
      )
    ) {
      res.status(403).json({
        success: false,
        message: `Acesso negado: ${action} em ${resource}`,
        code: "INSUFFICIENT_PERMISSIONS",
      });
      return;
    }
    next();
  };
};

const requireAuth = [authenticateToken];

const requireAdmin = [
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user && req.user.role === "ADMIN") {
      return next();
    }
    res.status(403).json({
      success: false,
      message: "Acesso restrito a administradores",
      code: "FORBIDDEN",
    });
  },
];

const requireStaff = [
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Não autenticado" });
      return;
    }
    const staffRoles: UserRole[] = [
      "ADMIN",
      "MANAGER",
      "OPERATOR",
      "COLLABORATOR",
    ];
    if (!staffRoles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: "Acesso restrito à equipe",
        code: "STAFF_ONLY",
      });
      return;
    }
    next();
  },
];

const requireManager = [
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Não autenticado" });
      return;
    }
    const managerRoles: UserRole[] = ["ADMIN", "MANAGER"];
    if (!managerRoles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: "Acesso restrito à gerência",
        code: "MANAGER_ONLY",
      });
      return;
    }
    next();
  },
];

const requireSelfOrStaff = (
  getUserId: (req: AuthenticatedRequest) => string,
) => [
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Não autenticado" });
      return;
    }
    const targetUserId = getUserId(req);
    const isOwner = req.user.id === targetUserId;
    const isStaff = ["ADMIN", "MANAGER", "OPERATOR", "COLLABORATOR"].includes(
      req.user.role,
    );
    if (!isOwner && !isStaff) {
      res.status(403).json({
        success: false,
        message: "Acesso negado: recurso privado",
        code: "PRIVATE_RESOURCE",
      });
      return;
    }
    next();
  },
];

const generateToken = (
  userId: string,
  email: string,
  role: UserRole,
): string => {
  // envConfig will generate ephemeral secret in non-production if missing, or exit in production
  const secret = envConfig.jwtSecret;
  const payload = {
    userId,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    jti: `${userId}-${Date.now()}`,
  };
  return jwt.sign(payload, secret, { expiresIn: "24h" });
};

const hasMinimumRole = (userRole: UserRole, minimumRole: UserRole): boolean => {
  const hierarchy: UserRole[] = [
    "CLIENT",
    "COLLABORATOR",
    "OPERATOR",
    "MANAGER",
    "ADMIN",
  ];
  const userLevel = hierarchy.indexOf(userRole);
  const minimumLevel = hierarchy.indexOf(minimumRole);
  return userLevel >= minimumLevel;
};

const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      next();
      return;
    }
    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRequests.get(userId);
    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: "Limite de requisições excedido",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
      return;
    }
    userLimit.count++;
    next();
  };
};

export default {
  authenticateToken,
  hasPermission,
  authorize,
  requireAuth,
  requireAdmin,
  requireStaff,
  requireManager,
  requireSelfOrStaff,
  generateToken,
  hasMinimumRole,
  rateLimitByUser,
};
