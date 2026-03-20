// src/controllers/geminiController.ts

import { Request, Response, NextFunction } from "express";
import { GeminiService } from "../services/geminiService";

const geminiService = new GeminiService();

// Per-user rate limiting: max 3 AI requests per minute
// Key: userId (or IP for anonymous) → array of timestamps
const aiRequestTimestamps = new Map<string, number[]>();
const AI_MAX_PER_MIN = 3;
const AI_WINDOW_MS = 60 * 1000;

function checkAIRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (aiRequestTimestamps.get(key) ?? []).filter(
    (t) => now - t < AI_WINDOW_MS,
  );
  if (timestamps.length >= AI_MAX_PER_MIN) return false;
  timestamps.push(now);
  aiRequestTimestamps.set(key, timestamps);
  return true;
}

export class GeminiController {
  /**
   * Sugere um tema de evento com base nos equipamentos disponíveis.
   * Rota pública para engajar clientes.
   */
  suggestEventTheme = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const rateLimitKey = req.userId ?? (req.ip ?? 'anonymous');
      if (!checkAIRateLimit(rateLimitKey)) {
        return res.status(429).json({
          success: false,
          message: "Muitas solicitações de IA. Tente novamente em 1 minuto.",
        });
      }
      const suggestion = await geminiService.suggestEventTheme();
      return res.json({ success: true, suggestion });
    } catch (error) {
      return next(error);
    }
  };
}
