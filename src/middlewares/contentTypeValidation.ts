/**
 * 🛡️ CONTENT-TYPE VALIDATION MIDDLEWARE
 * Valida Content-Type para prevenir ataques de content confusion
 */

import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

/**
 * Middleware para validar Content-Type em requisições POST/PUT/PATCH
 */
export function validateJsonContentType(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Apenas para métodos que enviam body
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  // Skip para multipart/form-data (uploads)
  const contentType = req.headers["content-type"];
  if (contentType && contentType.includes("multipart/form-data")) {
    return next();
  }

  // Validar que é JSON
  if (!contentType || !contentType.includes("application/json")) {
    logger.warn({
      method: req.method,
      path: req.path,
      contentType,
      ip: req.ip,
    }, "Content-Type inválido bloqueado");

    return res.status(415).json({
      success: false,
      message: "Content-Type inválido",
      code: "INVALID_CONTENT_TYPE",
      expected: "application/json",
      received: contentType || "none",
    });
  }

  next();
}

/**
 * Middleware para validar tamanho do payload
 */
export function validatePayloadSize(maxSizeBytes: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers["content-length"];

    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      logger.warn({
        method: req.method,
        path: req.path,
        contentLength,
        maxSize: maxSizeBytes,
        ip: req.ip,
      }, "Payload muito grande bloqueado");

      return res.status(413).json({
        success: false,
        message: "Payload muito grande",
        code: "PAYLOAD_TOO_LARGE",
        maxSize: `${maxSizeBytes / 1024 / 1024}MB`,
        receivedSize: `${parseInt(contentLength, 10) / 1024 / 1024}MB`,
      });
    }

    next();
  };
}

/**
 * Middleware combinado para rotas JSON
 */
export const validateJsonRequest = [
  validatePayloadSize(),
  validateJsonContentType,
];
