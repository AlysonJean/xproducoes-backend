// OBSOLETO: Centralizado no Prisma Client
import { prisma } from "../config/prisma";

interface PortfolioItemData {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  eventDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PortfolioRepository {
  async create(data: {
    title: string;
    description: string;
    imageUrl: string;
    eventDate: Date;
  }): Promise<PortfolioItemData> {
    return prisma.portfolioItem.create({ data });
  }

  async findAll(): Promise<PortfolioItemData[]> {
    return prisma.portfolioItem.findMany();
  }

  async delete(id: string): Promise<PortfolioItemData> {
    return prisma.portfolioItem.delete({ where: { id } });
  }
}
