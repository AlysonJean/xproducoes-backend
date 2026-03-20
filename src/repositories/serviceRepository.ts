import { prisma } from "../config/prisma";
import { ItemStatus, type Prisma } from "@prisma/client";

export class ServiceRepository {
  async create(data: Prisma.ServiceCreateInput) {
    // Ensure status is valid or default
    if (!data.status) data.status = 'ACTIVE';
    return prisma.service.create({ data });
  }

  async findAll(publicView = false) {
    const where = publicView 
      ? { status: { in: [ItemStatus.ACTIVE, ItemStatus.MAINTENANCE, ItemStatus.COMING_SOON] } } 
      : {};
      
    return prisma.service.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    return prisma.service.findUnique({
      where: { id }
    });
  }

  async update(id: string, data: Prisma.ServiceUpdateInput) {
    return prisma.service.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    // Soft delete if preferred, or hard delete
    // For now hard delete, but since cascade is on, it's fine.
    // Or maybe just deactivate? Let's stick to hard delete for now matching equipment logic
    return prisma.service.delete({
      where: { id }
    });
  }
}
