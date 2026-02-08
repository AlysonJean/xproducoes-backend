import { Request, Response, NextFunction } from "express";
import { EquipmentService } from "../services/equipmentService";
import { equipmentCreateSchema } from "../validators/equipmentSchema";
import { cacheService, CacheService } from "../services/cacheService";
import { invalidateCache } from "../middlewares/cacheMiddleware";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";

const equipmentService = new EquipmentService();

export class EquipmentController {
  create = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<any> => {
    if (req.userRole !== "ADMIN") {
      throw new ForbiddenError("Acesso negado");
    }

    if (!req.file) {
      throw new BadRequestError("Ficheiro de imagem é obrigatório");
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
  };

  update = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<any> => {
    if (req.userRole !== "ADMIN") {
      throw new ForbiddenError("Acesso negado");
    }
    const data = { ...req.body };
    if (data.pricePerHour) data.pricePerHour = Number(data.pricePerHour);
    if (data.quantity) data.quantity = Number(data.quantity);
    equipmentCreateSchema.partial().parse(data);

    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError("ID do equipamento é obrigatório.");

    const equipment = await equipmentService.update(id, data, req.file);

    // Invalidar cache após atualizar equipamento
    if (equipment) {
      await cacheService.invalidateEquipmentCaches(equipment.id);
      // Também invalidar o cache do middleware (cache em memória das rotas públicas)
      try {
        invalidateCache('/equipments');
      } catch {
        // não falhar a resposta em caso de erro ao invalidar middleware cache
      }
    }

    return res.json(equipment);
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
        CacheService.TTL.SHORT
      );
      return res.json(equipments);
    } catch (error) {
      return next(error);
    }
  };

  findOne = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<any> => {
    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError("ID do equipamento é obrigatório.");

    const cacheKey = CacheService.KEYS.EQUIPMENT(id);
    const equipment = await cacheService.getOrSet(
      cacheKey,
      () => equipmentService.findOne(id),
      CacheService.TTL.MEDIUM
    );

    if (!equipment) {
      throw new NotFoundError("Equipamento não encontrado.");
    }
    return res.json(equipment);
  };

  delete = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<any> => {
    if (req.userRole !== "ADMIN") {
      throw new ForbiddenError("Acesso negado");
    }

    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError("ID do equipamento é obrigatório.");

    // Também invalidar o cache do middleware (cache em memória das rotas públicas)
    try {
      invalidateCache('/equipments');
    } catch {
      // não falhar a resposta em caso de erro ao invalidar middleware cache
    }

    await equipmentService.delete(id);

    // Invalidar cache após deletar equipamento
    await cacheService.invalidateEquipmentCaches(id);

    return res.status(204).send();
  };

  getAvailability = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<any> => {
    const { id } = req.params as { id: string };
    const { month, year } = req.query;

    if (!id) throw new BadRequestError("ID do equipamento é obrigatório.");
    if (!month || !year) throw new BadRequestError("Mês e ano são obrigatórios.");

    const availability = await equipmentService.getAvailability(
      id,
      Number(month),
      Number(year),
    );
    return res.json(availability);
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
    _next: NextFunction,
  ): Promise<any> => {
    const { categoryId } = req.params as { categoryId: string };
    
    if (!categoryId) throw new BadRequestError("ID da categoria é obrigatório.");

    const equipments = await equipmentService.findByCategory(categoryId);
    return res.json(equipments);
  };

  duplicate = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<any> => {
    if (req.userRole !== "ADMIN") {
      throw new ForbiddenError("Acesso negado");
    }

    const { id } = req.params;
    if (!id) throw new BadRequestError("ID é obrigatório.");

    const duplicate = await equipmentService.duplicate(id as string);

    await cacheService.invalidateEquipmentCaches();

    return res.status(201).json({ equipment: duplicate, message: "Equipamento duplicado com sucesso" });
  };
}
