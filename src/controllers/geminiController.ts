// src/controllers/geminiController.ts

import { Request, Response, NextFunction } from "express";
import { GeminiService } from "../services/geminiService";

// Presumindo que você tenha um middleware 'isAdmin' como sugerido
import { ensureAdmin } from "../config/ensureAdmin";

const geminiService = new GeminiService();

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
      const suggestion = await geminiService.suggestEventTheme();
      return res.json({ suggestion });
    } catch (error) {
      return next(error);
    }
  };
}
