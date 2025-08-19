// OBSOLETO: Centralizado no Prisma Client
import { prisma } from "../config/prisma";

// Define ContactSubmission type
export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ContactRepository {
  async create(data: { name: string; email: string; message: string }): Promise<ContactSubmission> {
    // Implementação simulada até o modelo Contact ser adicionado ao schema
    const submission: ContactSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      email: data.email,
      message: data.message,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return submission;
  }

  async findAll(): Promise<ContactSubmission[]> {
    // Implementação simulada até o modelo Contact ser adicionado ao schema
    return [];
  }

  async delete(id: string): Promise<ContactSubmission | null> {
    // Implementação simulada até o modelo Contact ser adicionado ao schema
    return null;
  }

  async updateAsRead(id: string): Promise<ContactSubmission> {
    // Implementação simulada até o modelo Contact ser adicionado ao schema
    const submission: ContactSubmission = {
      id,
      name: "Exemplo",
      email: "exemplo@email.com",
      message: "Mensagem de exemplo",
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return submission;
  }

  async findById(id: string): Promise<ContactSubmission | null> {
    // Implementação simulada até o modelo Contact ser adicionado ao schema
    return null;
  }
}
