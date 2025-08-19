import { Request, Response, NextFunction } from "express";
import { EquipmentService } from "../services/equipmentService";
import { equipmentCreateSchema } from "../validators/equipmentSchema";

const equipmentService = new EquipmentService();

export class EquipmentController {
  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      if (req.userRole !== "ADMIN") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Ficheiro de imagem é obrigatório" });
      }

      const data = {
        ...req.body,
        pricePerHour: Number(req.body.pricePerHour),
        quantity: Number(req.body.quantity),
      };

      equipmentCreateSchema.parse(data);

      const equipment = await equipmentService.create(data, req.file);

      // Invalidar cache após criar equipamento
      // invalidateCache.onEquipmentChange(); // Função removida/inexistente

      return res
        .status(201)
        .json({ equipment, message: "Equipamento criado com sucesso" });
    } catch (error) {
      return next(error);
    }
  };

  update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      if (req.userRole !== "ADMIN") {
        throw new Error("Acesso negado");
      }
      const data = { ...req.body };
      if (data.pricePerHour) data.pricePerHour = Number(data.pricePerHour);
      if (data.quantity) data.quantity = Number(data.quantity);
      equipmentCreateSchema.partial().parse(data);

      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID do equipamento é obrigatório." });
      }

      const equipment = await equipmentService.update(id, data, req.file);

      // Invalidar cache após atualizar equipamento
      // invalidateCache.onEquipmentChange(); // Função removida/inexistente

      return res.json(equipment);
    } catch (error) {
      return next(error);
    }
  };

  findAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const equipments = await equipmentService.findAll();
      return res.json(equipments);
    } catch (error) {
      return next(error);
    }
  };

  findOne = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID do equipamento é obrigatório." });
      }

      const equipment = await equipmentService.findOne(id);
      if (!equipment) {
        return res.status(404).json({ message: "Equipamento não encontrado." });
      }
      return res.json(equipment);
    } catch (error) {
      return next(error);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      if (req.userRole !== "ADMIN") {
        throw new Error("Acesso negado");
      }

      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID do equipamento é obrigatório." });
      }

      await equipmentService.delete(id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  getAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const { id } = req.params;
      const { month, year } = req.query;

      if (!id) {
        return res
          .status(400)
          .json({ message: "ID do equipamento é obrigatório." });
      }

      if (!month || !year) {
        return res.status(400).json({ message: "Mês e ano são obrigatórios." });
      }

      const availability = await equipmentService.getAvailability(
        id,
        Number(month),
        Number(year),
      );
      return res.json(availability);
    } catch (error) {
      return next(error);
    }
  };

  search = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const equipments = await equipmentService.search(req.query);
      return res.json(equipments);
    } catch (error) {
      return next(error);
    }
  };

  getByCategory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const { categoryId } = req.params;
      
      if (!categoryId) {
        return res
          .status(400)
          .json({ message: "ID da categoria é obrigatório." });
      }

      const equipments = await equipmentService.findByCategory(categoryId);
      return res.json(equipments);
    } catch (error) {
      return next(error);
    }
  };
}
