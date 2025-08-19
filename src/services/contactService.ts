import { prisma } from "../config/prisma";

export async function createSubmission(data: {
  name: string;
  email: string;
  message: string;
}) {
  return prisma.contact.create({ data });
}

export async function getAllSubmissions() {
  return prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
}

export async function markAsRead(id: string) {
  return prisma.contact.update({ where: { id }, data: { isRead: true } });
}

export async function deleteSubmission(id: string) {
  return prisma.contact.delete({ where: { id } });
}

// Classe para compatibilidade
export class ContactService {
  async create(data: { name: string; email: string; message: string }) {
    return createSubmission(data);
  }

  async findAll() {
    return getAllSubmissions();
  }

  async markAsRead(id: string) {
    return markAsRead(id);
  }

  async delete(id: string) {
    return deleteSubmission(id);
  }

  // Métodos adicionais para compatibilidade
  async createSubmission(data: { name: string; email: string; message: string }) {
    return this.create(data);
  }

  async getAllSubmissions() {
    return this.findAll();
  }
}
