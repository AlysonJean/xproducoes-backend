import { CollaboratorRepository } from "../repositories/collaboratorRepository";
import type {
  Collaborator,
  EventCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
  CollaboratorAvailability,
} from "@prisma/client";
import { PaymentStatus, PaymentType } from "../repositories/collaboratorRepository";

const repo = new CollaboratorRepository();

// Tipo para criação de colaborador (compatível com controller)
interface CollaboratorCreateInput {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  collaboratorRole: CollaboratorRole;
  functionId?: string;
  specialties?: string[];
  hourlyRate?: number;
  fixedRate?: number;
  commissionRate?: number;
  status?: CollaboratorStatus | string;
  availabilityStatus?: string;
}

// Tipo interno para o repositório
type CollaboratorCreateData = Omit<Collaborator, "id" | "createdAt" | "updatedAt">;

// Tipo para atualização de colaborador (aceita number para campos Decimal)
interface CollaboratorUpdateInput {
  phone?: string;
  experience?: string;
  hourlyRate?: number;
  fixedRate?: number;
  commissionRate?: number;
  workingRadius?: number;
  languages?: string[];
  specialties?: string[];
  equipment?: string[];
  certifications?: string[];
  status?: CollaboratorStatus | string;
  availabilityStatus?: string;
  [key: string]: unknown;
}

type CollaboratorUpdateData = Partial<Collaborator>;

// Tipo para atribuição de evento (alinhado com o repositório)
type EventAssignmentData = Omit<EventCollaborator, "id" | "createdAt" | "updatedAt">;

// Parâmetros de busca de colaboradores
interface CollaboratorSearchParams {
  role?: string;
  status?: string;
  availabilityStatus?: string;
  name?: string;
  page?: number;
  limit?: number;
}

// Tipos para disponibilidade e pagamentos
type AvailabilityCreateData = Omit<CollaboratorAvailability, "id" | "createdAt" | "updatedAt">;
type AvailabilityUpdateData = Partial<CollaboratorAvailability>;

interface PaymentRecordData {
  collaboratorId: string;
  eventId: string;
  amount: number;
  type: PaymentType;
  description?: string;
  dueDate: Date;
  notes?: string;
}

type PaymentUpdateData = Partial<{
  amount: number;
  status: PaymentStatus;
  notes: string;
}>;

export async function createCollaborator(data: CollaboratorCreateData) {
  return repo.create(data);
}

export async function getAllCollaborators() {
  return repo.findAll();
}

export async function getCollaboratorById(id: string) {
  return repo.findById(id);
}

export async function updateCollaborator(id: string, data: CollaboratorUpdateData) {
  return repo.update(id, data);
}

export async function deleteCollaborator(id: string) {
  return repo.delete(id);
}

export async function assignCollaboratorToEvent(data: EventAssignmentData) {
  return repo.assignToEvent(data);
}

export async function getEventCollaborators(eventId: string) {
  return repo.findEventCollaborators(eventId);
}

export async function getCollaboratorEvents(collaboratorId: string) {
  return repo.findCollaboratorEvents(collaboratorId);
}

export async function searchCollaborators(params: CollaboratorSearchParams) {
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

export async function createAvailability(data: AvailabilityCreateData) {
  return repo.setAvailability(data);
}

export async function updateAvailability(id: string, data: AvailabilityUpdateData) {
  return repo.updateAvailability(id, data);
}

export async function deleteAvailability(id: string) {
  return repo.deleteAvailability(id);
}

export async function getAllPayments() {
  return repo.findAllPayments();
}

export async function createPaymentRecord(data: PaymentRecordData) {
  return repo.createPaymentRecord(data);
}

export async function updatePayment(id: string, data: PaymentUpdateData) {
  return repo.updatePayment(id, data);
}

export async function getCollaboratorPayments(collaboratorId: string) {
  return repo.findCollaboratorPayments(collaboratorId);
}

export async function getPaymentStats(collaboratorId: string) {
  return repo.getPaymentStats(collaboratorId);
}

// Classe para compatibilidade com controllers
export class CollaboratorService {
  async create(data: CollaboratorCreateInput) {
    // O repositório trata os campos opcionais com valores padrão
    return repo.create(data as unknown as CollaboratorCreateData);
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

  async update(id: string, data: CollaboratorUpdateInput) {
    return updateCollaborator(id, data as CollaboratorUpdateData);
  }

  async delete(id: string) {
    return deleteCollaborator(id);
  }

  async searchByName(name: string) {
    return searchCollaborators({ name });
  }

  async getCollaboratorsByRole(role: string) {
    return searchCollaborators({ role });
  }

  // Métodos adicionais para o collaboratorController
  async createCollaborator(data: CollaboratorCreateInput) {
    return this.create(data);
  }

  async getAllCollaborators() {
    return this.findAll();
  }

  async getCollaboratorById(id: string) {
    return this.findById(id);
  }

  async updateCollaborator(id: string, data: CollaboratorUpdateInput) {
    return this.update(id, data);
  }

  async deleteCollaborator(id: string) {
    return this.delete(id);
  }

  async assignCollaboratorToEvent(data: EventAssignmentData) {
    return repo.assignToEvent(data);
  }

  async getEventCollaborators(eventId: string) {
    return repo.findEventCollaborators(eventId);
  }

  async getAllEventCollaborators() {
    return repo.findAllEventAssignments();
  }

  async getCollaboratorEvents(collaboratorId: string) {
    return repo.findCollaboratorEvents(collaboratorId);
  }

  async updateEventCollaborator(id: string, data: Partial<EventCollaborator>) {
    return repo.updateEventCollaborator(id, data);
  }

  async removeCollaboratorFromEvent(id: string) {
    return repo.removeFromEvent(id);
  }

  async searchCollaborators(params: CollaboratorSearchParams) {
    return repo.search(params);
  }

  async getCollaboratorStats(id: string) {
    return repo.getCollaboratorStats(id);
  }

  async getCollaboratorDashboard(id?: string) {
    return repo.getCollaboratorDashboard(id);
  }

  async getAvailableCollaborators(data: { date: string; role?: string }) {
    return repo.getAvailableCollaborators(new Date(data.date), data.role);
  }

  async getAllAvailabilities() {
    return repo.findAllAvailabilities();
  }

  async getCollaboratorAvailabilities(collaboratorId: string) {
    return repo.findCollaboratorAvailabilities(collaboratorId);
  }

  async createAvailability(data: AvailabilityCreateData) {
    return repo.setAvailability(data);
  }

  async updateAvailability(id: string, data: AvailabilityUpdateData) {
    return repo.updateAvailability(id, data);
  }

  async deleteAvailability(id: string) {
    return repo.deleteAvailability(id);
  }

  async getAllPayments() {
    return repo.findAllPayments();
  }

  async createPaymentRecord(data: PaymentRecordData) {
    return repo.createPaymentRecord(data);
  }

  async updatePayment(id: string, data: PaymentUpdateData) {
    return repo.updatePayment(id, data);
  }

  async deletePayment(id: string) {
    return repo.deletePayment(id);
  }

  async getCollaboratorPayments(collaboratorId: string) {
    return repo.findCollaboratorPayments(collaboratorId);
  }

  async getPaymentStats(collaboratorId?: string) {
     if (collaboratorId) {
        return repo.getPaymentStats(collaboratorId);
     }
     // Retornar estatísticas agregadas de todos os pagamentos se nenhum ID for fornecido
     const payments = await repo.findAllPayments();
     const totalPaid = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
     const totalPending = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0);
     
     return {
       totalPayments: payments.length,
       totalPaid,
       totalPending,
       averagePayment: payments.length > 0 ? (totalPaid + totalPending) / payments.length : 0,
       paymentsCompleted: payments.filter(p => p.status === 'PAID').length,
       paymentsPending: payments.filter(p => p.status === 'PENDING').length,
     };
  }
}
