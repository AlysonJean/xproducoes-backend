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

export async function getCollaboratorAvailabilities(collaboratorId: string) {
  return repo.findCollaboratorAvailabilities(collaboratorId);
}

export async function createAvailability(data: any) {
  return repo.setAvailability(data);
}

export async function updateAvailability(id: string, data: any) {
  return repo.updateAvailability(id, data);
}

export async function deleteAvailability(id: string) {
  return repo.deleteAvailability(id);
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

export async function getCollaboratorPayments(collaboratorId: string) {
  return repo.findCollaboratorPayments(collaboratorId);
}

export async function getPaymentStats(collaboratorId: string) {
  return repo.getPaymentStats(collaboratorId);
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
    return getEventCollaborators(eventId);
  }

  async getCollaboratorEvents(collaboratorId: string) {
    return getCollaboratorEvents(collaboratorId);
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

  async getCollaboratorAvailabilities(collaboratorId: string) {
    return getCollaboratorAvailabilities(collaboratorId);
  }

  async createAvailability(data: any) {
    return createAvailability(data);
  }

  async updateAvailability(id: string, data: any) {
    return updateAvailability(id, data);
  }

  async deleteAvailability(id: string) {
    return deleteAvailability(id);
  }

  async getAllPayments() {
    return getAllPayments();
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

  async getCollaboratorPayments(collaboratorId: string) {
    return getCollaboratorPayments(collaboratorId);
  }

  async getPaymentStats(collaboratorId?: string) {
     if (collaboratorId) {
        return getPaymentStats(collaboratorId);
     }
     return {
       totalPayments: 0,
       totalPaid: 0,
       totalPending: 0,
       averagePayment: 0,
       paymentsCompleted: 0,
       paymentsPending: 0,
     };
  }
}
