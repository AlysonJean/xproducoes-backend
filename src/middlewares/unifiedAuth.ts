/**
 * 🔐 UNIFIED AUTHENTICATION MIDDLEWARE
 * Consolidação de 4 middlewares: auth.ts, authMiddleware.ts, authAdvanced.ts, enhancedAuth.ts
 * 
 * Features:
 * - JWT validation com error handling detalhado
 * - Security monitoring integration
 * - Role-based access control (RBAC)
 * - Database verification de usuário ativo
 * - Optional authentication
 * - Rate limiting por usuário
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/environment";
import { securityMonitor } from "../config/securityMonitor";
import { prisma } from "../config/prisma";
import { UserRole } from "@prisma/client";
import logger from "../config/logger";
import { extractToken, COOKIE_NAMES } from "../config/cookies";

// ===== INTERFACES E TIPOS =====

interface JWTPayload {
  userId: string;
  role: string;
  email?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

// Tipo auxiliar para controllers que precisam de autenticação
// Garante que user está presente após passar pelos middlewares de auth
export type AuthenticatedRequest = Request & {
  user: NonNullable<Request['user']>;
  userId: string;
  userRole: string | UserRole;
};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string | UserRole;
      user?: {
        id: string;
        email: string;
        role: string | UserRole;
        isActive: boolean;
      };
    }
  }
}

// ===== HELPERS PRIVADOS =====

const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const [bearer, token] = authHeader.split(" ");
  
  if (bearer !== "Bearer" || !token) return null;
  
  return token;
};

const getUserContext = (req: Request) => ({
  ip: req.ip || req.connection.remoteAddress || "unknown",
  userAgent: req.get("User-Agent") || "unknown",
  endpoint: `${req.method} ${req.path}`,
});

// ===== MIDDLEWARE PRINCIPAL DE AUTENTICAÇÃO =====

/**
 * Middleware principal de autenticação
 * Valida JWT, verifica segurança, popula req.userId, req.userRole, req.authUser
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const { ip, userAgent, endpoint } = getUserContext(req);

  // 1. Extrair token de cookies (prioridade) ou header (fallback)
  const { accessToken: token, source } = extractToken(
    req.cookies || {},
    req.headers.authorization
  );

  // 2. Verificar presença do token
  if (!token) {
    securityMonitor.recordInvalidToken(ip, userAgent, endpoint, {
      reason: "missing_auth_token",
    });
    return res.status(401).json({
      success: false,
      message: "Token de autorização não fornecido",
      code: "MISSING_AUTH_TOKEN",
    });
  }

  logger.debug({ source, endpoint }, "Token extracted from " + source);

  // 3. Verificar e decodificar JWT
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    // 4. Validar campos obrigatórios
    if (!decoded.userId || !decoded.role) {
      securityMonitor.recordInvalidToken(ip, userAgent, endpoint, {
        reason: "missing_required_fields",
      });
      return res.status(401).json({
        success: false,
        message: "Token inválido ou malformado",
        code: "INVALID_TOKEN",
      });
    }

    // 5. Popula request com dados do usuário
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    logger.debug({
      userId: decoded.userId,
      role: decoded.role,
      endpoint,
    }, "User authenticated");

    return next();
  } catch (error) {
    // 6. Error handling específico por tipo
    if (error instanceof jwt.TokenExpiredError) {
      securityMonitor.recordExpiredToken(ip, userAgent, endpoint, {
        reason: "token_expired",
        expiredAt: error.expiredAt,
      });
      return res.status(401).json({
        success: false,
        message: "Token expirado",
        code: "TOKEN_EXPIRED",
        expiredAt: error.expiredAt,
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      securityMonitor.recordInvalidToken(ip, userAgent, endpoint, {
        reason: "invalid_signature",
        error: error.message,
      });
      return res.status(401).json({
        success: false,
        message: "Token inválido",
        code: "INVALID_TOKEN",
        details: error.message,
      });
    } else {
      securityMonitor.recordInvalidToken(ip, userAgent, endpoint, {
        reason: "unknown_error",
        error: error instanceof Error ? error.message : String(error),
      });
      logger.error({ error, endpoint }, "Authentication error");
      return res.status(401).json({
        success: false,
        message: "Erro de autenticação",
        code: "AUTH_ERROR",
      });
    }
  }
}

// ===== AUTENTICAÇÃO COM VERIFICAÇÃO NO BANCO =====

/**
 * Autentica e verifica se usuário está ativo no banco de dados
 * Popula req.user com dados completos do DB
 */
export async function authenticateWithDB(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const { ip, userAgent, endpoint } = getUserContext(req);

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Token de acesso obrigatório",
      code: "MISSING_TOKEN",
    });
  }

  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Formato de token inválido",
      code: "INVALID_TOKEN_FORMAT",
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Token inválido ou malformado",
        code: "INVALID_TOKEN",
      });
    }

    // Verifica se usuário ainda está ativo no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user?.isActive) {
      securityMonitor.recordInvalidToken(ip, userAgent, endpoint, {
        reason: "user_inactive",
        userId: decoded.userId,
      });
      return res.status(401).json({
        success: false,
        message: "Usuário inativo ou não encontrado",
        code: "USER_INACTIVE",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
    req.userId = user.id;
    req.userRole = user.role;

    logger.debug({
      userId: user.id,
      role: user.role,
      endpoint,
    }, "User authenticated with DB verification");

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
        code: "TOKEN_EXPIRED",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
        code: "INVALID_TOKEN",
      });
    } else {
      logger.error({ error, endpoint }, "Authentication error with DB");
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        code: "AUTH_ERROR",
      });
    }
  }
}

// ===== AUTENTICAÇÃO OPCIONAL =====

/**
 * Middleware de autenticação opcional
 * Não falha se não houver token, apenas popula dados se token válido
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
  } catch {
    // Silenciosamente ignora erros e continua sem autenticação
  }

  next();
}

// ===== MIDDLEWARES DE AUTORIZAÇÃO (RBAC) =====

/**
 * Middleware genérico para verificar roles específicas
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
        code: "NOT_AUTHENTICATED",
      });
    }

    if (!allowedRoles.includes(req.userRole as UserRole)) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado",
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles: allowedRoles,
        userRole: req.userRole,
      });
    }

    return next();
  };
}

/**
 * Apenas ADMIN pode acessar
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Acesso negado: Apenas administradores",
      code: "ADMIN_ONLY",
    });
  }
  return next();
}

/**
 * Apenas COLLABORATOR pode acessar
 */
export function requireCollaborator(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "COLLABORATOR") {
    return res.status(403).json({
      success: false,
      message: "Acesso negado: Apenas colaboradores",
      code: "COLLABORATOR_ONLY",
    });
  }
  return next();
}

/**
 * ADMIN ou COLLABORATOR podem acessar
 */
export function requireAdminOrCollaborator(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN" && req.userRole !== "COLLABORATOR") {
    return res.status(403).json({
      success: false,
      message: "Acesso negado: Apenas administradores ou colaboradores",
      code: "STAFF_ONLY",
    });
  }
  return next();
}

/**
 * Staff (ADMIN, MANAGER, OPERATOR, COLLABORATOR) podem acessar
 */
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  const staffRoles: UserRole[] = ["ADMIN", "MANAGER", "OPERATOR", "COLLABORATOR"];
  
  if (!req.userRole || !staffRoles.includes(req.userRole as UserRole)) {
    return res.status(403).json({
      success: false,
      message: "Acesso restrito à equipe",
      code: "STAFF_ONLY",
    });
  }
  
  return next();
}

/**
 * Manager (ADMIN, MANAGER) podem acessar
 */
export function requireManager(req: Request, res: Response, next: NextFunction) {
  const managerRoles: UserRole[] = ["ADMIN", "MANAGER"];
  
  if (!req.userRole || !managerRoles.includes(req.userRole as UserRole)) {
    return res.status(403).json({
      success: false,
      message: "Acesso restrito à gerência",
      code: "MANAGER_ONLY",
    });
  }
  
  return next();
}

/**
 * Acesso ao próprio recurso OU ser staff
 */
export function requireSelfOrStaff(getUserId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Não autenticado",
        code: "NOT_AUTHENTICATED",
      });
    }

    const targetUserId = getUserId(req);
    const isOwner = req.userId === targetUserId;
    const isStaff = ["ADMIN", "MANAGER", "OPERATOR", "COLLABORATOR"].includes(
      req.userRole as string,
    );

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado: recurso privado",
        code: "PRIVATE_RESOURCE",
      });
    }

    next();
  };
}

// ===== HIERARQUIA DE ROLES =====

/**
 * Verifica se usuário tem role mínima necessária
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
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
}

// ===== RATE LIMITING POR USUÁRIO =====

/**
 * Rate limiting específico por usuário autenticado
 */
export function rateLimitByUser(maxRequests: number, windowMs: number) {
  const userRequests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) {
      next();
      return;
    }

    const userId = req.userId;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Limite de requisições excedido",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    userLimit.count++;
    next();
  };
}

// ===== GERAÇÃO DE TOKEN =====

/**
 * Gera JWT token para usuário
 */
export function generateToken(userId: string, email: string, role: UserRole): string {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    jti: `${userId}-${Date.now()}`,
  };
  
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "24h" });
}

// ===== OPÇÕES DE COOKIES SEGURAS =====

export const defaultCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
};

// ===== EXPORTS COMPATIBILIDADE (aliases) =====

// Para manter compatibilidade com código antigo
export const authMiddleware = authenticate;
export const adminOnly = requireAdmin;
export const collaboratorOnly = requireCollaborator;
export const adminOrCollaborator = requireAdminOrCollaborator;
export const requireAuth = [authenticate];
export const authenticateToken = authenticateWithDB;

// Export default para import padrão
export default {
  authenticate,
  authenticateWithDB,
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireCollaborator,
  requireAdminOrCollaborator,
  requireStaff,
  requireManager,
  requireSelfOrStaff,
  hasMinimumRole,
  rateLimitByUser,
  generateToken,
  defaultCookieOptions,
  // Aliases
  authMiddleware: authenticate,
  adminOnly: requireAdmin,
  collaboratorOnly: requireCollaborator,
  adminOrCollaborator: requireAdminOrCollaborator,
  requireAuth: [authenticate],
};
