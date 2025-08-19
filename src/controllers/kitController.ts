import { Request, Response, NextFunction } from "express";
import * as kitService from "../services/kitService";
import { kitCreateSchema } from "../validators/kitSchema";

export class KitController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = {
        ...req.body,
        price: Number(req.body.price),
      };

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

      const { id } = req.params;
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
      const kits = await kitService.findAll();
      return res.json(kits);
    } catch (error) {
      return next(error);
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
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
      const { id } = req.params;
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
