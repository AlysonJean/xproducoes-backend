import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/environment";

// Usar o mesmo tipo do authMiddleware.ts
interface JWTPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function enhancedAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log(`401: No Authorization header for ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      message: "Token de autorização não fornecido",
      code: "NO_AUTH_HEADER",
      details: "Include Authorization: Bearer <token> in request headers"
    });
  }

  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    console.log(`401: Invalid token format for ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      message: "Formato de token inválido",
      code: "INVALID_TOKEN_FORMAT",
      details: "Use format: Authorization: Bearer <token>"
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.log(`401: Token expired for ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        message: "Token expirado",
        code: "TOKEN_EXPIRED",
        expiredAt: new Date(decoded.exp * 1000).toISOString()
      });
    }

    req.authUser = decoded;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    console.log(`200: Authenticated ${req.method} ${req.path} for user ${decoded.userId}`);
    return next();
  } catch (error) {
    console.log(`401: JWT verification failed for ${req.method} ${req.path}`, error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
        code: "TOKEN_EXPIRED",
        expiredAt: new Date((error as any).expiredAt * 1000).toISOString()
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
        code: "INVALID_TOKEN",
        details: error.message
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Erro de autenticação",
        code: "AUTH_ERROR",
        details: "Token verification failed"
      });
    }
  }
}

// Middleware to check specific roles
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
        code: "NOT_AUTHENTICATED"
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado",
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles: allowedRoles,
        userRole: req.userRole
      });
    }

    return next();
  };
}

// Admin-only middleware
export const requireAdmin = requireRole(["ADMIN"]);

// Collaborator or Admin middleware
export const requireCollaboratorOrAdmin = requireRole(["COLLABORATOR", "ADMIN"]);
