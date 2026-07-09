import { Request, Response, NextFunction } from "express";
import * as reviewService from "../services/reviewService";
import { reviewCreateSchema } from "../validators/reviewSchema";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export class ReviewController {
  async getPublicReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await reviewService.findPublicReviews();
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query;
      const reviews = await reviewService.findAll(filters);
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return next(error);
    }
  }

  async getByEquipment(req: Request, res: Response, next: NextFunction) {
    try {
      const { equipmentId } = req.params as { equipmentId: string };
      const reviews = await reviewService.findByEquipment(equipmentId);
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return next(error);
    }
  }

  async getByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const actualUserId = userId === 'me' ? req.userId : userId;
      const reviews = await reviewService.findByUser(actualUserId!);
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.userRole !== 'CLIENT') {
        return res.status(403).json({ success: false, message: 'Apenas clientes podem deixar avaliações' });
      }
      // Forçar reviewerId do token e validar payload mínimo
      const parsed = reviewCreateSchema.parse({
        userId: req.userId,
        bookingId: req.body?.bookingId,
        rating: req.body?.rating,
        comment: req.body?.comment,
      });

      const review = await reviewService.create({
        reviewerId: parsed.userId,
        bookingId: parsed.bookingId,
        rating: parsed.rating,
        comment: parsed.comment,
        // Ignorar quaisquer campos de collaboratorId para garantir regra de negócio
      });
      return res.status(201).json({ success: true, data: review });
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };

      if (req.userRole !== 'ADMIN') {
        const existing = await prisma.review.findUnique({ where: { id }, select: { reviewerId: true } });
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
        }
        if (existing.reviewerId !== req.userId) {
          return res.status(403).json({ success: false, message: 'Acesso negado. Esta avaliação não pertence a você.' });
        }
      }

      const review = await reviewService.update(id, req.body);
      return res.status(200).json({ success: true, data: review });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
      }
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };

      if (req.userRole !== 'ADMIN') {
        const existing = await prisma.review.findUnique({ where: { id }, select: { reviewerId: true } });
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
        }
        if (existing.reviewerId !== req.userId) {
          return res.status(403).json({ success: false, message: 'Acesso negado. Esta avaliação não pertence a você.' });
        }
      }

      await reviewService.deleteReview(id);
      return res.status(200).json({ success: true, message: 'Avaliação removida com sucesso' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
      }
      return next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const review = await reviewService.approve(id);
      return res.status(200).json({ success: true, data: review });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
      }
      return next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const review = await reviewService.reject(id);
      return res.status(200).json({ success: true, data: review });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Avaliação não encontrada' });
      }
      return next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await reviewService.getStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      return next(error);
    }
  }

  async getRecent(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const reviews = await reviewService.getRecent(limit);
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      return next(error);
    }
  }
}
