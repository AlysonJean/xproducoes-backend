import { prisma } from "../config/prisma";

export async function createSubmission(data: {
  name: string;
  email: string;
  message: string;
}) {
  return prisma.contact.create({ data });
}

// Achado (auditoria): sem limite algum, esta consulta cresce sem fim conforme o volume
// histórico do formulário público de contato — o admin (ContactSubmissionsListPage.tsx)
// já faz busca/filtro/estatísticas no lado do cliente sobre a lista inteira, sem nenhuma
// paginação de UI, então trocar para paginação de verdade no backend exigiria reescrever
// essa tela também (fora do escopo deste achado pontual). Em vez disso, um teto de
// segurança: os 1000 mais recentes (já ordenados por createdAt desc) — folga generosa
// sobre o volume atual (poucas centenas), sem mudar o formato da resposta.
export async function getAllSubmissions() {
  return prisma.contact.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
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
