import { prisma } from "../config/prisma";

export class CollaboratorFunctionRepository {
  async findAll() {
    return prisma.collaboratorFunction.findMany({
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.collaboratorFunction.findUnique({
      where: { id },
    });
  }

  async create(data: { name: string; description?: string; active?: boolean }) {
    return prisma.collaboratorFunction.create({
      data,
    });
  }

  async update(id: string, data: { name?: string; description?: string; active?: boolean }) {
    return prisma.collaboratorFunction.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.collaboratorFunction.delete({
      where: { id },
    });
  }
}
