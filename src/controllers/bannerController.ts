
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import logger from "../config/logger";

export class BannerController {
  
  // Listar todos os banners (público) - apenas ativos e dentro da data
  getPublicBanners = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const banners = await prisma.banner.findMany({
        where: {
          active: true,
          OR: [
            { startDate: null },
            { startDate: { lte: now } }
          ],
          AND: [
             { OR: [{ endDate: null }, { endDate: { gte: now } }] }
          ]
        },
        orderBy: {
          sortOrder: 'asc'
        }
      });
      res.json(banners);
    } catch (error) {
      next(error);
    }
  };

  // Listar todos (Admin)
  getAllBanners = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const banners = await prisma.banner.findMany({
        orderBy: { sortOrder: 'asc' }
      });
      res.json(banners);
    } catch (error) {
      next(error);
    }
  };

  createBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, imageUrl, mobileImageUrl, linkUrl, active, sortOrder, startDate, endDate } = req.body;
      
      const banner = await prisma.banner.create({
        data: {
          title,
          description,
          imageUrl,
          mobileImageUrl,
          linkUrl,
          active: active ?? true,
          sortOrder: sortOrder ? Number(sortOrder) : 0,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        }
      });
      res.status(201).json(banner);
    } catch (error) {
      next(error);
    }
  };

  updateBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { title, description, imageUrl, mobileImageUrl, linkUrl, active, sortOrder, startDate, endDate } = req.body;

      const banner = await prisma.banner.update({
        where: { id },
        data: {
          title, 
          description, 
          imageUrl, 
          mobileImageUrl, 
          linkUrl, 
          active,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
          startDate: startDate ? new Date(startDate) : (startDate === null ? null : undefined),
          endDate: endDate ? new Date(endDate) : (endDate === null ? null : undefined),
        }
      });
      res.json(banner);
    } catch (error) {
      next(error);
    }
  };

  deleteBanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await prisma.banner.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
