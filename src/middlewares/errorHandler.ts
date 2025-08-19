// Caminho do arquivo: backend/src/middlewares/errorHandler.ts

import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import { ZodError } from "zod";

// Tipamos o erro como `unknown` para maior segurança
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Log detalhado do erro
  // Verificamos se 'err' é um objeto do tipo Error para acessar 'message' e 'stack'
  if (err instanceof Error) {
    logger.error({
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    // Se não for um Error, logamos o que recebemos
    logger.error({
      message: "Um erro não padrão ocorreu",
      error: err,
      path: req.path,
      method: req.method,
    });
  }

  // Erro de validação Zod
  if (err instanceof ZodError) {
    return res
      .status(422)
      .json({ message: "Dados inválidos", details: err.issues });
  }

  // Para outros erros, retornamos uma mensagem mais específica se possível
  if (err instanceof Error) {
    if (err.message.includes("não encontrado")) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes("Acesso negado")) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes("Credenciais inválidas")) {
      return res.status(401).json({ message: err.message });
    }
    if (
      err.message.includes("já está em uso") ||
      err.message.includes("já existe")
    ) {
      return res.status(409).json({ message: err.message });
    }
    if (
      err.message.includes("inválido") ||
      err.message.includes("obrigatório") ||
      err.message.includes("deve ter")
    ) {
      return res.status(400).json({ message: err.message });
    }

    // Para ambiente de desenvolvimento, retornar a mensagem real do erro
    if (process.env.NODE_ENV !== "production") {
      return res.status(500).json({
        message: "Erro interno do servidor",
        details: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }

  // Erro genérico
  return res.status(500).json({ message: "Erro interno do servidor" });
}
