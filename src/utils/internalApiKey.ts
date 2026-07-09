import crypto from "node:crypto";
import { Request } from "express";

/**
 * Compara X-Internal-Key com INTERNAL_API_KEY em tempo constante.
 * Usado para proteger endpoints internos (métricas, dashboard, docs em
 * produção) que não devem ficar públicos mas também não exigem login de
 * usuário — são acessados por ferramentas/operadores, não por clientes.
 */
export function isValidInternalKey(req: Request): boolean {
  const apiKey = req.get("X-Internal-Key");
  const expected = process.env.INTERNAL_API_KEY;
  if (!apiKey || !expected) return false;

  const a = Buffer.from(apiKey);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
