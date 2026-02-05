import { prisma } from "../config/prisma";

export class ServiceRepository {
  async create(data: any) {
    // Ensure status is valid or default
    if (!data.status) data.status = 'ACTIVE';
    return prisma.service.create({ data });
  }

  async findAll(publicView = false) {
    const where = publicView 
      ? { status: { in: ['ACTIVE', 'MAINTENANCE', 'COMING_SOON'] } } 
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

  async update(id: string, data: any) {
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
