import { Request, Response, NextFunction } from "express";
import { CollaboratorService } from "../services/collaboratorService";

import { prisma } from "../config/prisma";
import logger from "../config/logger";
import emailServiceInstance from "../services/emailService";
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } from "../utils/errors";

const collaboratorService = new CollaboratorService();



export class CollaboratorController {
  // CRUD de Colaboradores
  async createCollaborator(req: Request, res: Response, _next: NextFunction) {
    const validatedData = req.body;

    // Mapear 'role' para 'collaboratorRole' e incluir dados do usuário
    const collaboratorData = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      collaboratorRole: validatedData.role,
      specialties: validatedData.specialties,
      hourlyRate: validatedData.hourlyRate,
      fixedRate: validatedData.fixedRate,
      commissionRate: validatedData.commissionRate,
      status: validatedData.status,
      availabilityStatus: validatedData.availabilityStatus,
      functionId: validatedData.functionId,
    };

    const collaborator =
      await collaboratorService.createCollaborator(collaboratorData);

    return res.status(201).json({
      success: true,
      data: collaborator,
      message: "Colaborador criado com sucesso",
    });
  }

  async getAllCollaborators(req: Request, res: Response, _next: NextFunction) {
    const collaborators = await collaboratorService.getAllCollaborators();

    return res.json({
      success: true,
      data: collaborators,
    });
  }

  async getCollaboratorById(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError("ID do colaborador é obrigatório");

    const collaborator = await collaboratorService.getCollaboratorById(id);
    if (!collaborator) throw new NotFoundError("Colaborador não encontrado");

    return res.json({
      success: true,
      data: collaborator,
    });
  }

  async updateCollaborator(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    const updateData = req.body;

    if (!id) throw new BadRequestError("ID do colaborador é obrigatório");

    const collaborator = await collaboratorService.updateCollaborator(
      id,
      updateData,
    );

    return res.json({
      success: true,
      data: collaborator,
      message: "Colaborador atualizado com sucesso",
    });
  }

  async deleteCollaborator(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError("ID do colaborador é obrigatório");

    await collaboratorService.deleteCollaborator(id);

    return res.json({
      success: true,
      message: "Colaborador removido com sucesso",
    });
  }

  // Gestão de Eventos
  async assignCollaboratorToEvent(req: Request, res: Response, _next: NextFunction) {
    const validatedData = req.body;

    const assignment = await collaboratorService.assignCollaboratorToEvent({
      bookingId: validatedData.bookingId || validatedData.eventId,
      collaboratorId: validatedData.collaboratorId,
      role: validatedData.role as any,
      status: (validatedData.status as any) || "ASSIGNED",
      notes: validatedData.notes || null,
      hourlyRate: validatedData.hourlyRate || null,
      fixedRate: validatedData.fixedRate || null,
      totalHours: null,
      totalPayment: null,
      rating: null,
      feedback: null,
      arrivalConfirmed: false,
      departureConfirmed: false
    } as any);

    // Buscar dados para envio de notificação (não falha a requisição se falhar)
    try {
      const collaborator = await prisma.collaborator.findUnique({
        where: { id: validatedData.collaboratorId },
        include: { user: true }
      });

      const booking = await prisma.booking.findUnique({
        where: { id: validatedData.eventId },
        include: { client: { include: { user: true } } }
      });

      if (collaborator?.user?.email && booking) {
        const eventDate = new Date(booking.eventDate).toLocaleDateString('pt-BR');
        const eventTime = new Date(booking.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const street = booking.street || 'Endereço não informado';
        const number = booking.addressNumber ? `, ${booking.addressNumber}` : '';
        const city = booking.city ? ` - ${booking.city}` : '';
        const location = `${street}${number}${city}`;
        
        const clientName = booking.clientName || booking.client?.companyName || booking.client?.user?.name || 'Cliente';

        await emailServiceInstance.sendAssignmentNotification(
          collaborator.user.email,
          collaborator.user.name || 'Colaborador',
          {
            eventName: booking.eventTitle || `Evento de ${clientName}`,
            eventDate,
            eventTime,
            role: validatedData.role,
            location,
            bookingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collaborator/events`
          }
        );
        logger.info({ collaboratorId: collaborator.id }, 'Notificação de escalação enviada com sucesso');
      }
    } catch (emailError: any) {
      logger.error({ err: emailError }, 'Falha ao enviar notificação de escalação (atribuição concluída)');
    }

    return res.status(201).json({
      success: true,
      data: assignment,
      message: "Colaborador atribuído ao evento com sucesso",
    });
  }

  async getEventCollaborators(req: Request, res: Response, _next: NextFunction) {
    const { eventId } = req.params as { eventId: string };

    if (!eventId) throw new BadRequestError("ID do evento é obrigatório");

    const collaborators =
      await collaboratorService.getEventCollaborators(eventId);

    return res.json({
      success: true,
      data: collaborators,
    });
  }

  async getCollaboratorEvents(req: Request, res: Response, _next: NextFunction) {
    const { collaboratorId } = req.params as { collaboratorId: string };
    if (!collaboratorId) throw new BadRequestError("ID do colaborador é obrigatório");

    const events =
      await collaboratorService.getCollaboratorEvents(collaboratorId);

    return res.json({
      success: true,
      data: events,
    });
  }

  // Busca e estatísticas
  async searchCollaborators(req: Request, res: Response, _next: NextFunction) {
    const { role, status, name, page = "1", limit = "10" } = req.query;

    const searchParams = {
      role: role as any,
      status: status as any,
      name: name as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };

    const result =
      await collaboratorService.searchCollaborators(searchParams);

    return res.json({
      success: true,
      data: result.collaborators,
      pagination: result.pagination,
    });
  }

  async getCollaboratorStats(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError("ID do colaborador é obrigatório");

    const stats = await collaboratorService.getCollaboratorStats(id);

    return res.json({
      success: true,
      data: stats,
    });
  }

  // Dashboard pessoal do colaborador (ou admin vendo um colaborador específico)
  async getMyDashboard(req: Request, res: Response, _next: NextFunction) {
    // Obter ID do usuário autenticado
    const userId = req.userId as string;

    if (!userId) throw new BadRequestError('Usuário não autenticado');

    // Buscar o colaborador pelo userId
    let collaborator = await collaboratorService.findByUserId(userId);
    
    if (!collaborator) {
      // Tentar criar perfil automaticamente se não existir
      try {
        logger.info({ userId }, '[Dashboard] Perfil não encontrado. Criando perfil padrão...');
        collaborator = await prisma.collaborator.create({
          data: {
            userId,
            collaboratorRole: 'OTHER',
            status: 'PENDING_APPROVAL',
            specialties: [],
          },
          include: { user: true }
        }) as any;
      } catch (createError) {
        logger.error({ err: createError }, '[Dashboard] Erro ao criar perfil automático');
        throw new NotFoundError('Colaborador não encontrado');
      }
    }

    const stats = await collaboratorService.getCollaboratorDashboard(collaborator!.id);
    return res.json({ success: true, data: stats });
  }

  async getMyProfile(req: Request, res: Response, _next: NextFunction) {
    const userId = req.userId as string;
    if (!userId) throw new UnauthorizedError('Usuário não autenticado');

    let collaborator = await collaboratorService.findByUserId(userId);
    
    if (!collaborator) {
      try {
        logger.info({ userId }, 'Perfil não encontrado. Criando perfil padrão...');
        collaborator = await prisma.collaborator.create({
          data: {
            userId,
            collaboratorRole: 'OTHER',
            status: 'PENDING_APPROVAL',
            specialties: [],
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                avatarUrl: true,
                bio: true,
                location: true,
                website: true,
              }
            }
          }
        }) as any;
        
      } catch (createError) {
        logger.error({ err: createError }, 'Erro ao criar perfil automático');
        throw new NotFoundError('Colaborador não encontrado');
      }
    }
    
    return res.json({ success: true, data: collaborator });
  }

  async updateMyProfile(req: Request, res: Response, _next: NextFunction) {
    const userId = req.userId as string;
    if (!userId) throw new UnauthorizedError('Usuário não autenticado');

    const collaborator = await collaboratorService.findByUserId(userId);
    if (!collaborator) throw new NotFoundError('Colaborador não encontrado');

    const {
      phone,
      experience,
      hourlyRate,
      workingRadius,
      languages,
      specialties,
      equipment,
      certifications,
    } = req.body;

    const updatedCollaborator = await collaboratorService.update(collaborator.id, {
      phone,
      experience,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      workingRadius: workingRadius ? parseInt(workingRadius) : undefined,
      languages: languages || [],
      specialties: specialties || [],
      equipment: equipment || [],
      certifications: certifications || [],
    });

    return res.json({ success: true, data: updatedCollaborator });
  }

  async getMyEvents(req: Request, res: Response, _next: NextFunction) {
    const userId = req.userId as string;
    if (!userId) throw new UnauthorizedError('Usuário não autenticado');

    const collaborator = await collaboratorService.findByUserId(userId);
    if (!collaborator) throw new NotFoundError('Colaborador não encontrado');
    
    const events = await collaboratorService.getCollaboratorEvents(collaborator.id);
    return res.json({ success: true, data: events });
  }

  async getMyAvailability(req: Request, res: Response, _next: NextFunction) {
    const userId = req.userId as string;
    if (!userId) throw new UnauthorizedError('Não autenticado');

    const collaborator = await collaboratorService.findByUserId(userId);
    if (!collaborator) throw new NotFoundError('Perfil de colaborador não encontrado');

    const availabilities = await collaboratorService.getCollaboratorAvailabilities(collaborator.id);
    return res.json({ success: true, data: availabilities });
  }

  async getMyPayments(req: Request, res: Response, _next: NextFunction) {
    const userId = req.userId as string;
    if (!userId) throw new UnauthorizedError('Não autenticado');

    const collaborator = await collaboratorService.findByUserId(userId);
    if (!collaborator) throw new NotFoundError('Perfil de colaborador não encontrado');

    const payments = await collaboratorService.getCollaboratorPayments(collaborator.id);
    return res.json({ success: true, data: payments });
  }

  async getMyStats(req: Request, res: Response, _next: NextFunction) {
    const userId = req.userId as string;
    if (!userId) throw new UnauthorizedError('Não autenticado');

    const collaborator = await collaboratorService.findByUserId(userId);
    if (!collaborator) throw new NotFoundError('Perfil de colaborador não encontrado');

    const stats = await collaboratorService.getCollaboratorStats(collaborator.id);
    return res.json({ success: true, data: stats });
  }

  async getMyNotifications(req: Request, res: Response, _next: NextFunction) {
    const userId = req.userId as string;
    if (!userId) throw new UnauthorizedError('Usuário não autenticado');

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json({ success: true, data: notifications });
  }

  // --- MÉTODOS DE ADMIN / GESTÃO ---

  async getAllAvailabilities(req: Request, res: Response, _next: NextFunction) {
    const availabilities = await collaboratorService.getAllAvailabilities();
    return res.json({ success: true, data: availabilities });
  }

  async createAvailability(req: Request, res: Response, _next: NextFunction) {
    const validatedData = req.body;
    let collaboratorId = validatedData.collaboratorId;

    if (!collaboratorId && req.userId) {
       const collaborator = await collaboratorService.findByUserId(req.userId);
       if (collaborator) collaboratorId = collaborator.id;
    }

    if (!collaboratorId) throw new BadRequestError("ID do colaborador é obrigatório");

    const avail = await collaboratorService.createAvailability({
      collaboratorId,
      date: new Date(validatedData.date || validatedData.startDate), 
      startTime: validatedData.startTime || "00:00",
      endTime: validatedData.endTime || "23:59",
      status: validatedData.status as any,
      notes: validatedData.notes || null,
      eventId: null
    } as any);

    return res.status(201).json({ success: true, data: avail });
  }

  async updateAvailability(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    const validatedData = req.body;
    const updateData: Record<string, unknown> = { ...validatedData };
    if (validatedData.date) updateData.date = new Date(validatedData.date);

    const updated = await collaboratorService.updateAvailability(id, updateData);
    return res.json({ success: true, data: updated });
  }

  async deleteAvailability(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    await collaboratorService.deleteAvailability(id);
    return res.json({ success: true, message: "Disponibilidade removida" });
  }

  async getCollaboratorAvailabilities(req: Request, res: Response, _next: NextFunction) {
    const { collaboratorId } = req.params as { collaboratorId: string };
    const availabilities = await collaboratorService.getCollaboratorAvailabilities(collaboratorId);
    return res.json({ success: true, data: availabilities });
  }

  async getAvailableCollaborators(req: Request, res: Response, _next: NextFunction) {
    const { date, role } = req.query;
    if (!date) throw new BadRequestError("Data é obrigatória");
    const collaborators = await collaboratorService.getAvailableCollaborators({
      date: date as string,
      role: role as string,
    });
    return res.json({ success: true, data: collaborators });
  }

  async getAllPayments(req: Request, res: Response, _next: NextFunction) {
    const payments = await collaboratorService.getAllPayments();
    return res.json({ success: true, data: payments });
  }

  async createPayment(req: Request, res: Response, _next: NextFunction) {
    const validatedData = req.body;
    const payment = await collaboratorService.createPaymentRecord({
      collaboratorId: validatedData.collaboratorId,
      eventId: validatedData.eventId,
      amount: validatedData.amount,
      type: validatedData.type as any,
      description: validatedData.description || "Pagamento manual",
      dueDate: new Date(validatedData.dueDate || validatedData.paymentDate),
      notes: validatedData.notes,
    });
    return res.status(201).json({ success: true, data: payment });
  }

  async updatePayment(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError('ID do pagamento é obrigatório');
    if (req.userRole !== 'ADMIN') throw new ForbiddenError('Acesso negado');

    const updated = await collaboratorService.updatePayment(id, req.body);
    return res.json({ success: true, data: updated });
  }

  async deletePayment(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    if (!id) throw new BadRequestError('ID do pagamento é obrigatório');
    if (req.userRole !== 'ADMIN') throw new ForbiddenError('Acesso negado');

    await collaboratorService.deletePayment(id);
    return res.json({ success: true, message: "Pagamento removido" });
  }

  async getCollaboratorPayments(req: Request, res: Response, _next: NextFunction) {
    const { collaboratorId } = req.params as { collaboratorId: string };
    const payments = await collaboratorService.getCollaboratorPayments(collaboratorId);
    return res.json({ success: true, data: payments });
  }

  async getPaymentStats(req: Request, res: Response, _next: NextFunction) {
    const stats = await collaboratorService.getPaymentStats();
    return res.json({ success: true, data: stats });
  }

  async getAllEventCollaborators(req: Request, res: Response, _next: NextFunction) {
    const assignments = await collaboratorService.getAllEventCollaborators();
    return res.json({ success: true, data: assignments });
  }

  async updateEventCollaborator(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    const updated = await collaboratorService.updateEventCollaborator(id, req.body);
    return res.json({ success: true, data: updated });
  }

  async removeCollaboratorFromEvent(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params as { id: string };
    await collaboratorService.removeCollaboratorFromEvent(id);
    return res.json({ success: true, message: "Colaborador removido do evento" });
  }
}

// Instância única do controller
const collaboratorController = new CollaboratorController();

// Exportar métodos do controller
export const {
  createCollaborator,
  getAllCollaborators,
  getCollaboratorById,
  updateCollaborator,
  deleteCollaborator,
  assignCollaboratorToEvent,
  getAllEventCollaborators,
  updateEventCollaborator,
  removeCollaboratorFromEvent,
  getEventCollaborators,
  getCollaboratorEvents,
  searchCollaborators,
  getCollaboratorStats,
  getMyDashboard,
  getMyProfile,
  updateMyProfile,
  getAvailableCollaborators,
  getAllAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getCollaboratorAvailabilities,
  getAllPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getCollaboratorPayments,
  getPaymentStats,
  getMyAvailability,
  getMyPayments,
  getMyStats,
  getMyEvents,
  getMyNotifications,
} = collaboratorController;

// Alias para createEventCollaborator
export const createEventCollaborator = assignCollaboratorToEvent;
