import { Request, Response, NextFunction } from "express";
import * as portfolioService from "../services/portfolioService";
import { cacheService } from "../services/cacheService";

export class PortfolioController {
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };

        const updated = await portfolioService.updatePortfolio(id, req.body);
        await cacheService.delete('portfolio:all'); // Invalidar cache
      return res.json(updated);
    } catch (error) {
      return next(error);
    }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {


      const portfolio = await portfolioService.create(req.body);
      await cacheService.delete('portfolio:all'); // Invalidar cache
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
      const cacheKey = 'portfolio:all';
      let items = await cacheService.get(cacheKey);

      if (!items) {
        items = await portfolioService.findAll();
        await cacheService.set(cacheKey, items, 600); // Cache por 10 minutos
      }

      return res.json(items);
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      if (!id) {
        return res.status(400).json({ message: "ID é obrigatório." });
      }

      await portfolioService.deletePortfolio(id);
      await cacheService.delete('portfolio:all'); // Invalidar cache
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  reorder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body; // Espera { items: [{id, sortOrder}, ...] }
      


      await portfolioService.updateOrder(items);
      return res.json({ message: "Ordem atualizada com sucesso" });
    } catch (error) {
      return next(error);
    }
  };
}
