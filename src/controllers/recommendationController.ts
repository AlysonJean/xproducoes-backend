// src/controllers/recommendationController.ts

import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Controller para gerenciar recomendações de equipamentos e kits
 */

/**
 * GET /api/v1/recommendations/personalized
 */
export const getPersonalizedRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 8;

    if (!userId) {
      return getTrendingRecommendations(req, res);
    }

    const client = await prisma.client.findUnique({
      where: { userId }
    });

    if (!client) {
      return getTrendingRecommendations(req, res);
    }

    const userBookings = await prisma.booking.findMany({
      where: { clientId: client.id },
      include: {
        equipments: {
          include: { category: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const categoryIds: string[] = [];
    userBookings.forEach(booking => {
      booking.equipments.forEach(equipment => {
        if (equipment.categoryId) {
          categoryIds.push(equipment.categoryId);
        }
      });
    });

    if (categoryIds.length === 0) {
      return getTrendingRecommendations(req, res);
    }

    const categoryCount: Record<string, number> = {};
    categoryIds.forEach(id => {
      categoryCount[id] = (categoryCount[id] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([catId]) => catId);

    const alreadyBookedIds = userBookings.flatMap(b => 
      b.equipments.map(e => e.id)
    );

    const recommendations = await prisma.equipment.findMany({
      where: {
        AND: [
          { isAvailable: true },
          { id: { notIn: alreadyBookedIds.length > 0 ? alreadyBookedIds : ['none'] } },
          { categoryId: { in: topCategories } }
        ]
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    res.status(500).json({ error: 'Failed to get personalized recommendations' });
  }
};

/**
 * GET /api/v1/recommendations/similar/:type/:id
 */
export const getSimilarRecommendations = async (req: Request, res: Response) => {
  try {
    const type = req.params.type as string;
    const itemId = req.params.id as string;
    const limit = parseInt(req.query.limit as string) || 4;

    if (type === 'equipment') {
      const equipment = await prisma.equipment.findUnique({
        where: { id: itemId },
        include: { category: true }
      });

      if (!equipment) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      const similar = await prisma.equipment.findMany({
        where: {
          AND: [
            { id: { not: itemId } },
            { categoryId: equipment.categoryId },
            { isAvailable: true }
          ]
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return res.json(similar);
    } else if (type === 'kit') {
      const kit = await prisma.kit.findUnique({
        where: { id: itemId },
        include: { 
          items: { include: { equipment: { include: { category: true } } } }
        }
      });

      if (!kit) {
        return res.status(404).json({ error: 'Kit not found' });
      }

      const similar = await prisma.kit.findMany({
        where: { id: { not: itemId } },
        include: { items: { include: { equipment: { include: { category: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return res.json(similar);
    }

    res.status(400).json({ error: 'Invalid type. Must be equipment or kit' });
  } catch (error) {
    console.error('Error getting similar recommendations:', error);
    res.status(500).json({ error: 'Failed to get similar recommendations' });
  }
};

/**
 * GET /api/v1/recommendations/frequently-bought/:type/:id
 */
export const getFrequentlyBoughtTogether = async (req: Request, res: Response) => {
  try {
    const type = req.params.type as string;
    const itemId = req.params.id as string;
    const limit = parseInt(req.query.limit as string) || 4;

    if (type !== 'equipment' && type !== 'kit') {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const bookingsWithItem = await prisma.booking.findMany({
      where: {
        equipments: { some: { id: itemId } }
      },
      include: {
        equipments: { include: { category: true } }
      },
      take: 50
    });

    const coOccurrence: Record<string, number> = {};
    bookingsWithItem.forEach(booking => {
      booking.equipments.forEach(equipment => {
        if (equipment.id !== itemId) {
          coOccurrence[equipment.id] = (coOccurrence[equipment.id] || 0) + 1;
        }
      });
    });

    const topIds = Object.entries(coOccurrence)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([equipId]) => equipId);

    if (topIds.length === 0) {
      const item = await prisma.equipment.findUnique({
        where: { id: itemId },
        select: { categoryId: true }
      });

      if (item?.categoryId) {
        const fallback = await prisma.equipment.findMany({
          where: {
            AND: [
              { categoryId: item.categoryId },
              { id: { not: itemId } },
              { isAvailable: true }
            ]
          },
          include: { category: true },
          take: limit
        });
        return res.json(fallback);
      }
      return res.json([]);
    }

    const recommendations = await prisma.equipment.findMany({
      where: { id: { in: topIds } },
      include: { category: true }
    });

    const sorted = topIds
      .map(eqId => recommendations.find(r => r.id === eqId))
      .filter(Boolean);

    res.json(sorted);
  } catch (error) {
    console.error('Error getting frequently bought together:', error);
    res.status(500).json({ error: 'Failed to get frequently bought together' });
  }
};

/**
 * GET /api/v1/recommendations/trending
 */
export const getTrendingRecommendations = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    const category = req.query.category as string | undefined;

    const whereBase: Record<string, unknown> = { isAvailable: true };
    if (category) {
      whereBase.categoryId = category;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBookings = await prisma.booking.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { equipments: true }
    });

    const equipmentCount: Record<string, number> = {};
    recentBookings.forEach(booking => {
      booking.equipments.forEach(equipment => {
        equipmentCount[equipment.id] = (equipmentCount[equipment.id] || 0) + 1;
      });
    });

    const trendingIds = Object.entries(equipmentCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit * 2)
      .map(([eqId]) => eqId);

    let recommendations;

    if (trendingIds.length > 0) {
      recommendations = await prisma.equipment.findMany({
        where: {
          AND: [
            { id: { in: trendingIds } },
            whereBase
          ]
        },
        include: { category: true },
        take: limit
      });
    } else {
      recommendations = await prisma.equipment.findMany({
        where: whereBase,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting trending recommendations:', error);
    res.status(500).json({ error: 'Failed to get trending recommendations' });
  }
};

/**
 * GET /api/v1/recommendations/new
 */
export const getNewRecommendations = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    const category = req.query.category as string | undefined;

    const where: Record<string, unknown> = { isAvailable: true };
    if (category) {
      where.categoryId = category;
    }

    const recommendations = await prisma.equipment.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting new recommendations:', error);
    res.status(500).json({ error: 'Failed to get new recommendations' });
  }
};

/**
 * GET /api/v1/recommendations/seasonal
 */
export const getSeasonalRecommendations = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    const month = new Date().getMonth() + 1;
    
    let seasonalTags: string[] = [];
    if (month >= 12 || month <= 2) {
      seasonalTags = ['natal', 'ano novo', 'verão', 'festas'];
    } else if (month >= 3 && month <= 5) {
      seasonalTags = ['outono', 'páscoa'];
    } else if (month >= 6 && month <= 8) {
      seasonalTags = ['inverno', 'festa junina', 'são joão'];
    } else {
      seasonalTags = ['primavera', 'halloween'];
    }

    const recommendations = await prisma.equipment.findMany({
      where: {
        AND: [
          { isAvailable: true },
          { OR: seasonalTags.map(tag => ({ tags: { has: tag } })) }
        ]
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    if (recommendations.length === 0) {
      return getTrendingRecommendations(req, res);
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting seasonal recommendations:', error);
    res.status(500).json({ error: 'Failed to get seasonal recommendations' });
  }
};

/**
 * GET /api/v1/recommendations/based-on-favorites
 */
export const getRecommendationsBasedOnFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 8;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await prisma.client.findUnique({ where: { userId } });
    if (!client) {
      return getTrendingRecommendations(req, res);
    }

    const userFavorites = await prisma.clientFavorite.findMany({
      where: { clientId: client.id },
      include: { equipment: { include: { category: true } } },
      take: 10
    });

    if (userFavorites.length === 0) {
      return getTrendingRecommendations(req, res);
    }

    const categoryIds = userFavorites
      .map(f => f.equipment.categoryId)
      .filter(Boolean) as string[];
    
    const favoriteIds = userFavorites.map(f => f.equipmentId);

    const recommendations = await prisma.equipment.findMany({
      where: {
        AND: [
          { isAvailable: true },
          { id: { notIn: favoriteIds } },
          categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}
        ]
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations based on favorites:', error);
    res.status(500).json({ error: 'Failed to get recommendations based on favorites' });
  }
};

/**
 * GET /api/v1/recommendations/category/:categoryId
 */
export const getRecommendationsByCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = req.params.categoryId as string;
    const limit = parseInt(req.query.limit as string) || 8;

    const recommendations = await prisma.equipment.findMany({
      where: {
        AND: [
          { categoryId },
          { isAvailable: true }
        ]
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations by category:', error);
    res.status(500).json({ error: 'Failed to get recommendations by category' });
  }
};

/**
 * GET /api/v1/recommendations/budget
 */
export const getRecommendationsByBudget = async (req: Request, res: Response) => {
  try {
    const min = parseFloat(req.query.min as string) || 0;
    const max = parseFloat(req.query.max as string) || 10000;
    const limit = parseInt(req.query.limit as string) || 8;

    const recommendations = await prisma.equipment.findMany({
      where: {
        AND: [
          { isAvailable: true },
          { pricePerHour: { gte: min, lte: max } }
        ]
      },
      include: { category: true },
      orderBy: { pricePerHour: 'asc' },
      take: limit
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations by budget:', error);
    res.status(500).json({ error: 'Failed to get recommendations by budget' });
  }
};
