import { Request, Response, NextFunction } from "express";
import * as kitService from "../services/kitService";

export class KitController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = {
        ...req.body,
        price: Number(req.body.price),
      };

      if (typeof data.items === 'string') {
        try {
          data.items = JSON.parse(data.items);
        } catch (e) {
          console.error("Failed to parse items JSON", e);
        }
      }

      const kit = await kitService.create(data, req.file);
      return res.status(201).json(kit);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body };
      if (data.price) {
        data.price = Number(data.price);
      }

      if (typeof data.items === 'string') {
        try {
          data.items = JSON.parse(data.items);
        } catch (e) {
          console.error("Failed to parse items JSON", e);
        }
      }

      const { id } = req.params as { id: string };
      if (!id) {
        return res.status(400).json({ message: "ID é obrigatório." });
      }

      const kit = await kitService.update(id, data, req.file);
      return res.json(kit);
    } catch (error) {
      return next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Limite de segurança para produção (512MB RAM)
      // Em DEV: Ilimitado (undefined)
      // Em PROD: Max 150 kits (segurança contra OOM)
      const limit = process.env.NODE_ENV === 'production' ? 150 : undefined;
      
      const kits = await kitService.findAll(limit);
      return res.json(kits);
    } catch (error) {
      return next(error);
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      if (!id) {
        return res.status(400).json({ message: "ID é obrigatório." });
      }

      const kit = await kitService.findOne(id);
      if (!kit) {
        throw new Error("Kit não encontrado.");
      }
      return res.json(kit);
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

      await kitService.deleteKit(id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  getRecommended = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kits = await kitService.findRecommended();
      return res.json(kits);
    } catch (error) {
      return next(error);
    }
  };

  getPopular = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kits = await kitService.findPopular();
      return res.json(kits);
    } catch (error) {
      return next(error);
    }
  };
}
