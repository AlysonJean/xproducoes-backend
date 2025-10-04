import { CollaboratorRepository } from "../repositories/collaboratorRepository";

const repo = new CollaboratorRepository();

export async function createCollaborator(data: any) {
  return repo.create(data);
}

export async function getAllCollaborators() {
  return repo.findAll();
}

export async function getCollaboratorById(id: string) {
  return repo.findById(id);
}

export async function updateCollaborator(id: string, data: any) {
  return repo.update(id, data);
}

export async function deleteCollaborator(id: string) {
  return repo.delete(id);
}

export async function assignCollaboratorToEvent(data: any) {
  return repo.assignToEvent(data);
}

export async function getEventCollaborators(eventId: string) {
  return repo.findEventCollaborators(eventId);
}

export async function getCollaboratorEvents(collaboratorId: string) {
  return repo.findCollaboratorEvents(collaboratorId);
}

export async function searchCollaborators(params: any) {
  return repo.search(params);
}

export async function getCollaboratorStats(id: string) {
  return repo.getCollaboratorStats(id);
}

export async function getCollaboratorDashboard(id?: string) {
  return repo.getCollaboratorDashboard(id);
}

export async function getAvailableCollaborators(date: string, role?: string) {
  return repo.getAvailableCollaborators(new Date(date), role);
}

export async function getAllAvailabilities() {
  return repo.findAllAvailabilities();
}

export async function getCollaboratorAvailabilities() {
  // Busca por colaborador (stub)
  // Exemplo: return prisma.collaborator.findMany({ where: { ... } });
  return [];
}

export async function getAllPayments() {
  return repo.findAllPayments();
}

export async function createPaymentRecord(data: any) {
  return repo.createPaymentRecord(data);
}

export async function updatePayment(id: string, data: any) {
  return repo.updatePayment(id, data as any);
}

export async function getCollaboratorPayments() {
  // Busca por colaborador (stub)
  // Exemplo: return prisma.collaborator.findMany({ where: { ... } });
  return [];
}

export async function getPaymentStats() {
  // Busca por colaborador (stub)
  // Exemplo: return prisma.collaborator.findMany({ where: { ... } });
  return [];
}

// Classe para compatibilidade com controllers
export class CollaboratorService {
  async create(data: any) {
    return createCollaborator(data);
  }

  async findAll() {
    return getAllCollaborators();
  }

  async findById(id: string) {
    return getCollaboratorById(id);
  }

  async findByUserId(userId: string) {
    return repo.findByUserId(userId);
  }

  async update(id: string, data: any) {
    return updateCollaborator(id, data);
  }

  async delete(id: string) {
    return deleteCollaborator(id);
  }

  async searchByName(name: string) {
    return searchCollaborators(name);
  }

  async getCollaboratorsByRole(role: string) {
    // Implementação simples
    return [];
  }

  async getPaymentStats() {
    return getPaymentStats();
  }

  // Métodos adicionais para o collaboratorController
  async createCollaborator(data: any) {
    return this.create(data);
  }

  async getAllCollaborators() {
    return this.findAll();
  }

  async getCollaboratorById(id: string) {
    return this.findById(id);
  }

  async updateCollaborator(id: string, data: any) {
    return this.update(id, data);
  }

  async deleteCollaborator(id: string) {
    return this.delete(id);
  }

  async assignCollaboratorToEvent(data: any) {
    // Implementação simples - expandir conforme necessário
    return {
      id: `assignment_${Date.now()}`,
      ...data,
      createdAt: new Date()
    };
  }

  async getEventCollaborators(eventId: string) {
    // Implementação simples
    return [];
  }

  async getCollaboratorEvents(collaboratorId: string) {
    // Implementação simples
    return [];
  }

  async searchCollaborators(params: any) {
    return this.searchByName(params.name || '');
  }

  async getCollaboratorStats(id: string) {
    return {
      totalEvents: 0,
      completedEvents: 0,
      rating: 0,
      earnings: 0
    };
  }

  async getCollaboratorDashboard(id?: string) {
    return getCollaboratorDashboard(id);
  }

  async getAvailableCollaborators(data: any) {
    return [];
  }

  async getAllAvailabilities() {
    return [];
  }

  async getCollaboratorAvailabilities() {
    return [];
  }

  async getAllPayments() {
    return [];
  }

  async createPaymentRecord(data: any) {
    return {
      id: `payment_${Date.now()}`,
      ...data,
      createdAt: new Date()
    };
  }

  async updatePayment(id: string, data: any) {
    return repo.updatePayment(id, data);
  }

  async getCollaboratorPayments() {
    return [];
  }
}
