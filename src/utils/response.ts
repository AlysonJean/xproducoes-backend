/**
 * 🎯 Utilitários de Resposta Padronizada - Backend
 * Centraliza a criação de respostas consistentes
 */

import { Response } from "express";

// Tipos locais para resposta (espelhando os do shared)
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp?: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Envia resposta de sucesso padronizada
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  status: number = HttpStatus.OK,
  message?: string,
): Response<ApiSuccessResponse<T>> => {
  const requestId = res.get("X-Request-ID");
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  return res.status(status).json(response);
};

/**
 * Envia resposta de erro padronizada
 */
export const sendError = (
  res: Response,
  message: string,
  status: number = HttpStatus.BAD_REQUEST,
  errors?: string[],
): Response<ApiErrorResponse> => {
  const requestId = res.get("X-Request-ID");
  const response: ApiErrorResponse = {
    success: false,
    message,
    ...(errors && { errors }),
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  return res.status(status).json(response);
};

/**
 * Envia resposta paginada
 */
export const sendPaginated = <T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  message?: string,
): Response => {
  const totalPages = Math.ceil(total / limit);
  const requestId = res.get("X-Request-ID");

  const response: ApiSuccessResponse<{
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> = {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  return res.json(response);
};

/**
 * Middleware para adicionar Request ID
 */
export const addRequestId = (req: any, res: Response, next: any) => {
  const requestId =
    req.headers["x-request-id"] ||
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  res.set("X-Request-ID", requestId);
  req.requestId = requestId;

  next();
};
