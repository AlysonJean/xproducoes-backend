// src/controllers/geminiController.ts

import { Request, Response, NextFunction } from "express";
import { GeminiService } from "../services/geminiService";

const geminiService = new GeminiService();

export class GeminiController {
  /**
   * Sugere um tema de evento com base nos equipamentos disponíveis.
   * Rota pública para engajar clientes. Rate limiting dedicado (3/min) é
   * aplicado na rota via aiSuggestionRateLimit (rateLimitMiddleware.ts).
   */
  suggestEventTheme = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const suggestion = await geminiService.suggestEventTheme();
      return res.json({ success: true, suggestion });
    } catch (error) {
      return next(error);
    }
  };
}
