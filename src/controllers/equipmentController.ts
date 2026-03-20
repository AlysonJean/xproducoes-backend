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
  ): Promise<void> => {
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
      imageUrl: req.body.imageUrl,
    };

    const validation = equipmentCreateSchema.safeParse(data);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Dados inválidos';
      throw new BadRequestError(firstError);
    }

    const equipment = await equipmentService.create({
      ...validation.data,
      imageUrl: req.body.imageUrl,
    }, req.file);

    // Invalidar cache após criar equipamento
    await cacheService.invalidateEquipmentCaches();

    res
      .status(201)
      .json({ success: true, data: equipment, message: "Equipamento criado com sucesso" });
    return;
  };

  update = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (req.userRole !== "ADMIN") {
      throw new ForbiddenError("Acesso negado");
    }
    const data = { ...req.body };
    if (data.pricePerHour) data.pricePerHour = Number(data.pricePerHour);
    if (data.quantity) data.quantity = Number(data.quantity);
    
    const validation = equipmentCreateSchema.partial().safeParse(data);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Dados inválidos';
      throw new BadRequestError(firstError);
    }

    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError("ID do equipamento é obrigatório.");

    const equipment = await equipmentService.update(
      id,
      {
        ...validation.data,
        imageUrl: req.body.imageUrl,
      },
      req.file
    );

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

    res.json({ success: true, data: equipment });
    return;
  };

  findAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
      res.json({ success: true, data: equipments });
      return;
    } catch (error) {
      return next(error);
    }
  };

  findOne = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
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
    res.json({ success: true, data: equipment });
    return;
  };

  delete = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
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

    res.status(204).send();
    return;
  };

  getAvailability = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { id } = req.params as { id: string };
    const { month, year } = req.query;

    if (!id) throw new BadRequestError("ID do equipamento é obrigatório.");
    if (!month || !year) throw new BadRequestError("Mês e ano são obrigatórios.");

    const availability = await equipmentService.getAvailability(
      id,
      Number(month),
      Number(year),
    );
    res.json({ success: true, data: availability });
    return;
  };

  search = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const equipments = await equipmentService.search(req.query);
      res.json({ success: true, data: equipments });
      return;
    } catch (error) {
      return next(error);
    }
  };

  getByCategory = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { categoryId } = req.params as { categoryId: string };
    
    if (!categoryId) throw new BadRequestError("ID da categoria é obrigatório.");

    const equipments = await equipmentService.findByCategory(categoryId);
    res.json({ success: true, data: equipments });
    return;
  };

  duplicate = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (req.userRole !== "ADMIN") {
      throw new ForbiddenError("Acesso negado");
    }

    const { id } = req.params;
    if (!id) throw new BadRequestError("ID é obrigatório.");

    const duplicate = await equipmentService.duplicate(id as string);

    await cacheService.invalidateEquipmentCaches();

    res.status(201).json({ success: true, data: duplicate, message: "Equipamento duplicado com sucesso" });
    return;
  };
}
