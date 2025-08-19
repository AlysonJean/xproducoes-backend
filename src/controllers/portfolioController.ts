import { Request, Response, NextFunction } from "express";
import * as portfolioService from "../services/portfolioService";

export class PortfolioController {
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "ID é obrigatório." });
      }
        const updated = await portfolioService.updatePortfolio(id, req.body);
      return res.json(updated);
    } catch (error) {
      return next(error);
    }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, eventDate } = req.body;
      // Validação dos campos obrigatórios
      if (!title || !description || !eventDate) {
        return res.status(400).json({ 
          message: "Campos obrigatórios: title, description, eventDate",
          received: { title: !!title, description: !!description, eventDate: !!eventDate }
        });
      }
      const portfolio = await portfolioService.create(req.body);
      return res.status(201).json(portfolio);
    } catch (error) {
      if (error instanceof Error) {
        // Se é um erro conhecido/esperado, retorne 400
        if (error.message.includes('obrigatórios') || error.message.includes('inválida')) {
          return res.status(400).json({ message: error.message });
        }
      }
      // Para outros erros, use o handler de erro padrão
      return next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await portfolioService.findAll();
      return res.json(items);
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "ID é obrigatório." });
      }

      await portfolioService.deletePortfolio(id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
