/**
 * 🛡️ Sistema de Validação Robusto
 * Padroniza validação de entrada e tratamento de erros
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import logger from "./logger";

/**
 * Middleware de validação usando Zod
 */
export const validateBody = (schema: ZodSchema): any => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(
          (err: any) => `${err.path.join(".")}: ${err.message}`,
        );
        
        logger.error("Validation error in body: " + JSON.stringify({ errors }));
        
        return res.status(400).json({
          message: "Dados de entrada inválidos",
          errors,
        });
      }
      return next(error);
    }
  };
};

/**
 * Middleware para validar parâmetros da URL
 */
export const validateParams = (schema: ZodSchema): any => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams as any;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(
          (err: any) => `${err.path.join(".")}: ${err.message}`,
        );
        
        logger.error("Validation error in params: " + JSON.stringify({ errors }));
        
        return res.status(400).json({
          message: "Parâmetros inválidos",
          errors,
        });
      }
      return next(error);
    }
  };
};

/**
 * Middleware para validar query string
 */
export const validateQuery = (schema: ZodSchema): any => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery as any;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(
          (err: any) => `${err.path.join(".")}: ${err.message}`,
        );
        
        logger.error("Validation error in query: " + JSON.stringify({ errors }));
        
        return res.status(400).json({
          message: "Query string inválida",
          errors,
        });
      }
      return next(error);
    }
  };
};

/**
 * Middleware para validar UUID
 */
export const validateId = (paramName: string = "id") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    
    if (!value) {
      logger.error(`Missing ${paramName} parameter`);
      return res.status(400).json({
        message: `${paramName} é obrigatório`,
      });
    }
    
    // Validação básica de ID (pode ser UUID ou outro formato)
    if (typeof value !== 'string' || value.length < 1) {
      logger.error(`Invalid ${paramName} format: "${value}"`);
      return res.status(400).json({
        message: `${paramName} inválido`,
      });
    }
    
    return next();
  };
};

/**
 * Middleware para validar campos obrigatórios
 */
export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];
    
    for (const field of fields) {
      if (!req.body[field]) {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      logger.error("Missing required fields: " + JSON.stringify({ missing }));
      return res.status(400).json({
        message: "Campos obrigatórios ausentes",
        missing,
      });
    }
    
    return next();
  };
};

/**
 * Utilitário para criar response de erro padronizado
 */
export const createErrorResponse = (message: string, details?: any) => {
  return {
    success: false,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
};

/**
 * Utilitário para criar response de sucesso padronizado
 */
export const createSuccessResponse = (data?: any, message?: string) => {
  return {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };
};
