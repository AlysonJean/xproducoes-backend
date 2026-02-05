import { Request, Response, NextFunction } from "express";
import { EquipmentService } from "../services/equipmentService";
import { equipmentCreateSchema } from "../validators/equipmentSchema";
import { cacheService, CacheService } from "../services/cacheService";

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
      await cacheService.invalidateEquipmentCaches();

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

      const { id } = req.params as { id: string };
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID do equipamento é obrigatório." });
      }

      const equipment = await equipmentService.update(id, data, req.file);

      // Invalidar cache após atualizar equipamento
      if (equipment) {
        await cacheService.invalidateEquipmentCaches(equipment.id);
      }

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
      const cacheKey = "equipment:all";

      // Limite dinâmico baseado no ambiente
      // Apenas afeta a primeira busca (cache miss).
      // Se mudar de ambiente, deve-se limpar o cache (Redis flush ou reiniciar server se for in-memory)
      const limit = process.env.NODE_ENV === 'production' ? 300 : undefined;

      const publicView = req.userRole !== 'ADMIN';
      
      const equipments = await cacheService.getOrSet(
        `${cacheKey}:${publicView ? 'public' : 'admin'}`, // Cache key differentiation
        () => equipmentService.findAll(limit, publicView),
        CacheService.TTL.MEDIUM
      );
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
      const { id } = req.params as { id: string };
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID do equipamento é obrigatório." });
      }

      const cacheKey = CacheService.KEYS.EQUIPMENT(id);
      const equipment = await cacheService.getOrSet(
        cacheKey,
        () => equipmentService.findOne(id),
        CacheService.TTL.MEDIUM
      );

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

      const { id } = req.params as { id: string };
      if (!id) {
        return res
          .status(400)
          .json({ message: "ID do equipamento é obrigatório." });
      }

      await equipmentService.delete(id);

      // Invalidar cache após deletar equipamento
      await cacheService.invalidateEquipmentCaches(id);

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
      const { id } = req.params as { id: string };
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
      const { categoryId } = req.params as { categoryId: string };
      
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

  duplicate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      if (req.userRole !== "ADMIN") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { id } = req.params;
      const duplicate = await equipmentService.duplicate(id as string);

      await cacheService.invalidateEquipmentCaches();

      return res.status(201).json({ equipment: duplicate, message: "Equipamento duplicado com sucesso" });
    } catch (error) {
      return next(error);
    }
  };
}
