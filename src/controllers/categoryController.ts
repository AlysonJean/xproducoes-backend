import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/categoryService";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "../validators/categorySchema";
import { cacheService, CacheService } from "../services/cacheService";

export class CategoryController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.userRole !== "ADMIN") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      categoryCreateSchema.parse(req.body);
      const { name } = req.body;
      const category = await categoryService.create({ name });

      // Invalidar cache após criar categoria
      await cacheService.deletePattern("category:*");

      return res.status(201).json(category);
    } catch (error) {
      return next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cacheKey = "category:all";
      const categories = await cacheService.getOrSet(
        cacheKey,
        () => categoryService.findAll(),
        CacheService.TTL.MEDIUM
      );
      return res.json(categories);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.userRole !== "ADMIN") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      categoryUpdateSchema.parse(req.body);
      const { id } = req.params;
      const { name } = req.body;

      if (!id) {
        return res
          .status(400)
          .json({ message: "ID da categoria é obrigatório." });
      }

      const category = await categoryService.update(id, { name });

      // Invalidar cache após atualizar categoria
      await cacheService.deletePattern("category:*");

      return res.json(category);
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.userRole !== "ADMIN") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID da categoria é obrigatório." });
      }

      await categoryService.deleteCategory(id);

      // Invalidar cache após deletar categoria
      await cacheService.deletePattern("category:*");

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID da categoria é obrigatório." });
      }

      const category = await categoryService.findById(id);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada." });
      }
      
      return res.json(category);
    } catch (error) {
      return next(error);
    }
  };

  getWithEquipmentCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cacheKey = "category:withCounts";
      const categories = await cacheService.getOrSet(
        cacheKey,
        () => categoryService.findAllWithEquipmentCount(),
        CacheService.TTL.MEDIUM
      );
      return res.json(categories);
    } catch (error) {
      return next(error);
    }
  };

  getFeatured = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await categoryService.findFeatured();
      return res.json(categories);
    } catch (error) {
      return next(error);
    }
  };
}
