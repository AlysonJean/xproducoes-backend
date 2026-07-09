import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

/**
 * Middleware de transformação de DTO
 * Converte automaticamente tipos Prisma para tipos seguros para frontend
 */

// Função para transformar objetos recursivamente
function transformPrismaData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Se é um Decimal do Prisma, converte para number
  if (obj instanceof Prisma.Decimal) {
    return obj.toNumber();
  }

  // Se é um array, transforma cada elemento
  if (Array.isArray(obj)) {
    return obj.map(transformPrismaData);
  }

  // Se é um objeto, transforma recursivamente
  if (typeof obj === "object") {
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      transformed[key] = transformPrismaData(value);
    }
    return transformed;
  }

  // Para tipos primitivos, retorna como está
  return obj;
}

/**
 * Middleware que intercepta return res.json e transforma automaticamente os dados
 */
export const dtoTransformerMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Guarda a função original res.json
  const originalJson = res.json;

  // Sobrescreve res.json com nossa transformação
  res.json = function (body: unknown) {
    // Transforma os dados antes de enviar
    const transformedBody = transformPrismaData(body);

    // Chama a função original com os dados transformados
    return originalJson.call(this, transformedBody);
  };

  next();
};

/**
 * Função utilitária para transformar dados manualmente
 * Útil para casos específicos ou debugging
 */
export const transformForFrontend = <T>(data: T): T => {
  return transformPrismaData(data) as T;
};

/**
 * Função específica para transformar preços
 * Garante que preços são sempre numbers válidos
 */
export const transformPrices = (obj: unknown): unknown => {
  const transformed = transformPrismaData(obj);

  // Campos conhecidos de preço que precisam ser validados
  const priceFields = [
    "price",
    "pricePerHour",
    "totalPrice",
    "amount",
    "hourlyRate",
  ];

  function validatePriceFields(data: unknown): unknown {
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      for (const field of priceFields) {
        if (record[field] !== undefined) {
          const value = Number(record[field]);
          record[field] = isNaN(value) ? 0 : value;
        }
      }

      // Recursivamente valida arrays e objetos aninhados
      for (const [key, value] of Object.entries(record)) {
        if (Array.isArray(value)) {
          record[key] = value.map(validatePriceFields);
        } else if (value && typeof value === "object") {
          record[key] = validatePriceFields(value);
        }
      }
    }

    return data;
  }

  return validatePriceFields(transformed);
};
