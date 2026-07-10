// OBSOLETO: Centralizado no Prisma Client
import { prisma } from "../config/prisma";
import logger from "../config/logger";
import {
  Collaborator,
  EventCollaborator,
  CollaboratorPayment,
  CollaboratorAvailability,
  User,
  CollaboratorRole,
  CollaboratorStatus,
} from "@prisma/client";

// Alias para retorno customizado, aproveitando tipos do Prisma
type CollaboratorCreateData = Omit<
  Collaborator,
  "id" | "createdAt" | "updatedAt"
>;
type CollaboratorWithUser = Collaborator & {
  user: Pick<User, "name" | "email" | "avatarUrl">;
};
type NullableCollaboratorWithUser = CollaboratorWithUser | null;

// OBSOLETO: Todos os tipos/interfaces abaixo foram centralizados no Prisma Client. Utilize apenas os tipos do Prisma.

// Aliases para tipos de pagamento e status
export type PaymentType =
  | "HOURLY"
  | "FIXED"
  | "COMMISSION"
  | "BONUS"
  | "DEDUCTION";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export class CollaboratorRepository {
  // CRUD de Colaboradores
  async create(
    data: CollaboratorCreateData,
    // Alias para tipo de criação de colaborador
  ): Promise<Collaborator> {
    const collaboratorData = {
      userId: data.userId,
      phone: data.phone,
      collaboratorRole: data.collaboratorRole,
      functionId: data.functionId,
      specialties: data.specialties,
      hourlyRate: data.hourlyRate,
      status: data.status || "ACTIVE",
      totalEvents: 0,
      totalEarnings: 0,
      averageRating: 0,
      // completionRate removido pois não existe no schema
    };

    return prisma.collaborator.create({
      data: collaboratorData,
      include: {
        user: true,
      },
    });
  }

  async findAll(): Promise<Collaborator[]> {
    return prisma.collaborator.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<NullableCollaboratorWithUser> {
    const collaborator = await prisma.collaborator.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        eventAssignments: {
          include: {
            booking: {
              select: {
                id: true,
                eventDate: true,
                eventEndDate: true,
                totalPrice: true,
                status: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!collaborator) return null;
    return collaborator as CollaboratorWithUser;
  }

  async findByEmail(email: string): Promise<NullableCollaboratorWithUser> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        collaboratorProfile: true,
      },
    });

    if (!user?.collaboratorProfile) return null;
    return {
      ...user.collaboratorProfile,
      user: {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    } as CollaboratorWithUser;
  }

  async findByUserId(userId: string): Promise<NullableCollaboratorWithUser> {
    const collaborator = await prisma.collaborator.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            location: true,
            website: true,
          },
        },
      },
    });

    if (!collaborator) return null;
    return collaborator as CollaboratorWithUser;
  }

  async update(id: string, data: Partial<Collaborator>): Promise<Collaborator> {
    return prisma.collaborator.update({
      where: { id },
      data: data as import("@prisma/client").Prisma.CollaboratorUpdateInput,
    });
  }

  async delete(id: string): Promise<Collaborator> {
    return prisma.$transaction(async (tx) => {
      // Desvincular avaliações antes de deletar
      await tx.review.updateMany({
        where: { collaboratorId: id },
        data: { collaboratorId: null }
      });

      // Availabilities, payments e eventAssignments possuem onDelete: Cascade no schema
      return tx.collaborator.delete({
        where: { id },
      });
    });
  }

  // Gestão de Eventos
  async assignToEvent(
    data: Omit<EventCollaborator, "id" | "createdAt" | "updatedAt">,
  ): Promise<EventCollaborator> {
    const eventCollaborator = await prisma.eventCollaborator.create({
      data: {
        ...data,
        status: data.status || "ASSIGNED",
      },
      include: {
        collaborator: true,
        booking: true,
      },
    });

    // Atualizar estatísticas do colaborador
    await this.updateCollaboratorStats(data.collaboratorId);

    return eventCollaborator;
  }

  async updateEventCollaborator(
    id: string,
    data: Partial<EventCollaborator>,
  ): Promise<EventCollaborator> {
    return prisma.eventCollaborator.update({
      where: { id },
      data,
      include: {
        collaborator: true,
        booking: true,
      },
    });
  }

  async removeFromEvent(id: string): Promise<EventCollaborator> {
    const eventCollaborator = await prisma.eventCollaborator.delete({
      where: { id },
      include: {
        collaborator: true,
      },
    });

    // Atualizar estatísticas do colaborador
    await this.updateCollaboratorStats(eventCollaborator.collaboratorId);

    return eventCollaborator;
  }

  async findEventCollaborators(eventId: string): Promise<EventCollaborator[]> {
    return prisma.eventCollaborator.findMany({
      where: { bookingId: eventId },
      include: {
        collaborator: {
          include: {
             user: {
               select: { name: true, email: true, avatarUrl: true }
             }
          }
        },
      },
    });
  }

  async findAllEventAssignments(): Promise<EventCollaborator[]> {
    return prisma.eventCollaborator.findMany({
      include: {
        collaborator: {
          include: {
            user: {
              select: { name: true, email: true, avatarUrl: true }
            }
          }
        },
        booking: {
          select: { id: true, eventTitle: true, eventDate: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findCollaboratorEvents(
    collaboratorId: string,
  ): Promise<EventCollaborator[]> {
    return prisma.eventCollaborator.findMany({
      where: { collaboratorId },
      include: {
        booking: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Disponibilidade

  async setAvailability(
    data: Omit<CollaboratorAvailability, "id" | "createdAt" | "updatedAt">,
  ): Promise<CollaboratorAvailability> {
    return prisma.collaboratorAvailability.create({
      data,
    });
  }

  async getAvailableCollaborators(
    date: Date,
    role?: string,
  ): Promise<Collaborator[]> {
    return prisma.collaborator.findMany({
      where: {
        status: CollaboratorStatus.ACTIVE,
        ...(role ? { collaboratorRole: role as CollaboratorRole } : {}),
      },
      include: {
        availabilities: {
          where: {
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    });
  }

  // Controle de Valores a Pagar (não processamento de pagamento)
  async createPaymentRecord(data: {
    collaboratorId: string;
    eventId: string;
    amount: number;
    type: PaymentType;
    description?: string;
    dueDate: Date;
    notes?: string;
  }): Promise<CollaboratorPayment> {
    // Criar registro de valor devido
    const result = await prisma.collaboratorPayment.create({
      data: {
        collaboratorId: data.collaboratorId,
        eventId: data.eventId,
        amount: data.amount,
        type: data.type || "HOURLY",
        description: data.description || "Pagamento de colaborador",
        dueDate: data.dueDate,
        status: "PENDING",
        notes: data.notes || null,
      },
    });

    return result;
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<CollaboratorPayment> {
    const payment = await prisma.collaboratorPayment.update({
      where: { id },
      data: { status },
    });

    // Converter para nossa interface
    return {
      ...payment,
      eventId: payment.eventId ?? "placeholder",
      amount: payment.amount,
      type: payment.type,
      description: payment.description ?? "Pagamento de evento",
      status: payment.status,
      notes: payment.notes ?? null,
    };
  }

  // Métodos para Disponibilidades
  async findAllAvailabilities(): Promise<CollaboratorAvailability[]> {
    return prisma.collaboratorAvailability.findMany({
      include: {
        collaborator: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  async updateAvailability(
    id: string,
    data: Partial<CollaboratorAvailability>,
  ): Promise<CollaboratorAvailability> {
    return prisma.collaboratorAvailability.update({
      where: { id },
      data,
    });
  }

  async deleteAvailability(id: string): Promise<CollaboratorAvailability> {
    return prisma.collaboratorAvailability.delete({
      where: { id },
    });
  }

  async findCollaboratorAvailabilities(
    collaboratorId: string,
  ): Promise<CollaboratorAvailability[]> {
    return prisma.collaboratorAvailability.findMany({
      where: { collaboratorId },
      orderBy: { date: "desc" },
    });
  }

  // Métodos para Pagamentos
  async findAllPayments(): Promise<CollaboratorPayment[]> {
    return prisma.collaboratorPayment.findMany({
      include: {
        collaborator: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updatePayment(
    id: string,
    data: Partial<{
      amount: number;
      status: PaymentStatus;
      notes: string;
    }>,
  ): Promise<CollaboratorPayment> {
    const payment = await prisma.collaboratorPayment.update({
      where: { id },
      data: {
        ...data,
        paymentDate: data.status === "PAID" ? new Date() : undefined,
      },
    });

    // Se o pagamento foi confirmado, atualizar estatísticas
    if (data.status === "PAID") {
      await this.updateCollaboratorStats(payment.collaboratorId);
    }

    return payment;
  }

  async deletePayment(id: string): Promise<CollaboratorPayment> {
    return prisma.collaboratorPayment.delete({
      where: { id },
    });
  }

  async findCollaboratorPayments(
    collaboratorId: string,
  ): Promise<CollaboratorPayment[]> {
    return prisma.collaboratorPayment.findMany({
      where: { collaboratorId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPaymentStats(collaboratorId: string): Promise<{
    totalPayments: number;
    totalPaid: number;
    totalPending: number;
    averagePayment: number;
    paymentsCompleted: number;
    paymentsPending: number;
  }> {
    const payments = await prisma.collaboratorPayment.findMany({
      where: { collaboratorId },
    });

    const totalPayments = payments.length;
    const paidPayments = payments.filter((p) => p.status === "PAID");
    const pendingPayments = payments.filter((p) => p.status === "PENDING");

    const totalPaid = paidPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalPending = pendingPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const averagePayment =
      totalPayments > 0 ? totalPaid / paidPayments.length : 0;

    return {
      totalPayments,
      totalPaid,
      totalPending,
      averagePayment,
      paymentsCompleted: paidPayments.length,
      paymentsPending: pendingPayments.length,
    };
  }

  // Estatísticas
  async getCollaboratorStats(
    id: string,
    period?: { start: Date; end: Date },
  ): Promise<{
    totalEvents: number;
    totalEarnings: number;
    averageRating: number;
    completionRate: number;
    monthlyEarnings: Array<{ month: string; earnings: number; events: number }>;
  }> {
    const whereClause: import("@prisma/client").Prisma.EventCollaboratorWhereInput =
      {
        collaboratorId: id,
        status: {
          in: ["COMPLETED" as import("@prisma/client").EventCollaboratorStatus],
        },
        ...(period
          ? { createdAt: { gte: period.start, lte: period.end } }
          : {}),
      };

    const events = await prisma.eventCollaborator.findMany({
      where: whereClause,
      include: {
        booking: true,
      },
    });

    const totalEvents = events.length;
    const totalEarnings = events.reduce((sum: number, event) => {
      // Prisma retorna Decimal | null, então precisamos converter
      const earning = event.totalPayment ?? event.fixedRate ?? 0;
      return sum + (earning ? Number(earning) : 0);
    }, 0);

    const ratings = events
      .filter((e) => typeof e.rating === "number" && e.rating !== null)
      .map((e) => Number(e.rating));
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum: number, r: number) => sum + r, 0) /
          ratings.length
        : 0;

    const completedEvents = events.filter(
      (e) => e.status === "COMPLETED",
    ).length;
    const completionRate =
      totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

    // Ganhos mensais (últimos 12 meses)
    const monthlyEarnings = await this.getMonthlyEarnings(id);

    return {
      totalEvents,
      totalEarnings,
      averageRating,
      completionRate,
      monthlyEarnings,
    };
  }

  private async getMonthlyEarnings(collaboratorId: string) {
    try {
      // Data de 12 meses atrás
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      // Buscar eventos concluídos nos últimos 12 meses usando Prisma puro (DB agnostic)
      const events = await prisma.eventCollaborator.findMany({
        where: {
          collaboratorId,
          status: "COMPLETED",
          createdAt: {
            gte: oneYearAgo,
          },
        },
        select: {
          createdAt: true,
          totalPayment: true,
          fixedRate: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Agrupar por mês em memória
      const monthlyData = events.reduce((acc, event) => {
        const date = new Date(event.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = { month: monthKey, earnings: 0, events: 0 };
        }

        // Converter Decimal para number de forma segura
        const toNum = (val: unknown): number => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          if (typeof val === 'object' && 'toNumber' in val && typeof val.toNumber === 'function') {
            return val.toNumber();
          }
          return Number(val);
        };

        const earning = toNum(event.totalPayment) || toNum(event.fixedRate) || 0;

        acc[monthKey].earnings += earning;
        acc[monthKey].events += 1;

        return acc;
      }, {} as Record<string, { month: string; earnings: number; events: number }>);

      return Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
    } catch (error) {
      logger.error({ error, collaboratorId }, "Erro ao calcular ganhos mensais");
      return []; // Retorna lista vazia em caso de erro para não quebrar o dashboard
    }
  }

  private async updateCollaboratorStats(collaboratorId: string): Promise<void> {
    const stats = await this.getCollaboratorStats(collaboratorId);

    await prisma.collaborator.update({
      where: { id: collaboratorId },
      data: {
        totalEvents: stats.totalEvents,
        totalEarnings: stats.totalEarnings,
        averageRating: stats.averageRating,
        // completionRate: stats.completionRate // Campo não existe no schema
      },
    });
  }

  // ===== MÉTODOS OTIMIZADOS PARA PERFORMANCE =====

  // Buscar colaboradores com user data incluído (elimina N+1)
  async findAllWithUsers(status?: string, role?: string) {
    const where: import("@prisma/client").Prisma.CollaboratorWhereInput = {};
    if (status) where.status = status as CollaboratorStatus;
    if (role) where.collaboratorRole = role as CollaboratorRole;

    return prisma.collaborator.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            verified: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
    });
  }

  // Dashboard de colaboradores (queries otimizadas)
  async getCollaboratorDashboard(collaboratorId?: string) {
    if (!collaboratorId) {
      throw new Error('ID do colaborador é obrigatório para dashboard');
    }

    // Buscar dados específicos do colaborador
    const collaborator = await prisma.collaborator.findUnique({
      where: { id: collaboratorId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            location: true,
            bio: true,
          },
        },
        eventAssignments: {
          include: {
            booking: {
              select: {
                id: true,
                eventTitle: true,
                eventDate: true,
                status: true,
                totalPrice: true,
                serviceValue: true,
                location: true,
              },
            },
          },
          where: {
            booking: {
              status: { notIn: ['CANCELLED', 'DRAFT'] },
            },
          },
        },
      },
    });

    if (!collaborator) {
      throw new Error('Colaborador não encontrado');
    }

    // Calcular estatísticas
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Eventos do mês atual
    const currentMonthEvents = collaborator.eventAssignments.filter(
      (assignment) => {
        const eventDate = new Date(assignment.booking.eventDate);
        return eventDate >= currentMonth && eventDate < nextMonth;
      }
    );

    // Próximos eventos (próximos 30 dias)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingEvents = collaborator.eventAssignments
      .filter((assignment) => {
        const eventDate = new Date(assignment.booking.eventDate);
        return eventDate >= now && eventDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.booking.eventDate).getTime() - new Date(b.booking.eventDate).getTime())
      .slice(0, 5);

    // Calcular ganhos totais
    const totalEarnings = collaborator.eventAssignments
      .filter((assignment) => assignment.booking.status === 'COMPLETED')
      .reduce((total, assignment) => {
        const payment = assignment.totalPayment || 0;
        return total + Number(payment);
      }, 0);

    // Eventos por status
    const eventsByStatus = collaborator.eventAssignments.reduce(
      (acc, assignment) => {
        const status = assignment.booking.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calcular taxa de conclusão totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;
    const totalAssignments = collaborator.eventAssignments.length;
    const completionRate = totalAssignments > 0
      ? ((eventsByStatus.COMPLETED || 0) / totalAssignments) * 100
      : 0;

    // Calcular avaliação média
    // Filtrar atribuições que têm rating numérico
    const ratings = collaborator.eventAssignments
      .filter((e) => typeof e.rating === "number" && e.rating !== null)
      .map((e) => Number(e.rating));
      
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    // Atividades recentes (últimos 10 dias)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const recentActivities = collaborator.eventAssignments
      .filter((assignment) => {
        const eventDate = new Date(assignment.booking.eventDate);
        return eventDate >= tenDaysAgo;
      })
      .sort((a, b) => new Date(b.booking.eventDate).getTime() - new Date(a.booking.eventDate).getTime())
      .slice(0, 10)
      .map((assignment) => ({
        id: assignment.id,
        type: assignment.booking.status === 'COMPLETED' ? 'payment' : 'event',
        title:
          assignment.booking.status === 'COMPLETED'
            ? 'Pagamento Recebido'
            : assignment.booking.status === 'CONFIRMED'
            ? 'Evento Confirmado'
            : 'Novo Evento Atribuído',
        description:
          assignment.booking.status === 'COMPLETED'
            ? `Pagamento do evento "${assignment.booking.eventTitle}" foi confirmado`
            : `Você foi atribuído ao evento "${assignment.booking.eventTitle}"`,
        timestamp: assignment.booking.eventDate,
        amount: assignment.totalPayment ? Number(assignment.totalPayment) : 0,
      }));

    return {
      collaborator: {
        id: collaborator.id,
        name: collaborator.user.name,
        email: collaborator.user.email,
        avatarUrl: collaborator.user.avatarUrl,
        location: collaborator.user.location,
        bio: collaborator.user.bio,
        role: collaborator.collaboratorRole,
        hourlyRate: collaborator.hourlyRate,
        workingRadius: collaborator.workingRadius,
        specialties: collaborator.specialties,
        equipment: collaborator.equipment,
        languages: collaborator.languages,
        status: collaborator.status,
      },
      // Stats no nível raiz para compatibilidade com Dashboard Frontend
      totalEarnings,
      totalEvents: totalAssignments,
      completionRate: Math.round(completionRate),
      averageRating,
      stats: {
        totalEvents: totalAssignments,
        completedEvents: eventsByStatus.COMPLETED || 0,
        confirmedEvents: eventsByStatus.CONFIRMED || 0,
        pendingEvents: eventsByStatus.PENDING || 0,
        totalEarnings,
        currentMonthEvents: currentMonthEvents.length,
        averageEventValue: totalAssignments > 0
          ? totalEarnings / totalAssignments
          : 0,
        completionRate: Math.round(completionRate),
        averageRating
      },
      upcomingEvents: upcomingEvents.map((assignment) => ({
        id: assignment.booking.id,
        title: assignment.booking.eventTitle,
        startTime: assignment.booking.eventDate,
        location: assignment.booking.location || 'Local não definido',
        totalPayment: assignment.totalPayment ? Number(assignment.totalPayment) : 0,
        status: assignment.booking.status,
      })),
      recentActivities,
      monthlyEarnings: await this.getMonthlyEarnings(collaboratorId),
      monthlyData: {
        revenue: {},
        events: {},
      },
    };
  }

  // Método auxiliar para buscar receita mensal
  private async getMonthlyRevenue(_collaboratorId: string) {
    // Implementação simplificada - retorna dados vazios por enquanto
    return {};
  }

  // Método auxiliar para buscar eventos mensais
  private async getMonthlyEvents(_collaboratorId: string) {
    // Implementação simplificada - retorna dados vazios por enquanto
    return {};
  }

  // Availability check otimizado para múltiplos colaboradores
  async checkAvailability(
    collaboratorIds: string[],
    eventDate: Date,
    startTime: string,
    endTime: string,
  ) {
    // Removido variável não utilizada dayOfWeek

    // Query única para verificar todos os colaboradores
    const conflictingAssignments = await prisma.eventCollaborator.findMany({
      where: {
        collaboratorId: { in: collaboratorIds },
        booking: {
          eventDate: {
            gte: new Date(eventDate.setHours(0, 0, 0, 0)),
            lte: new Date(eventDate.setHours(23, 59, 59, 999)),
          },
          status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        OR: [
          {
            AND: [
              { startTime: { lte: endTime } },
              { endTime: { gte: startTime } },
            ],
          },
        ],
      },
      select: {
        collaboratorId: true,
        startTime: true,
        endTime: true,
      },
    });

    // Processar disponibilidade
    return collaboratorIds.map((collaboratorId: string) => {
      const conflicts = conflictingAssignments.filter(
        (assignment: { collaboratorId: string }) =>
          assignment.collaboratorId === collaboratorId,
      );

      return {
        collaboratorId,
        isAvailable: conflicts.length === 0,
        conflicts: conflicts.length,
      };
    });
  }

  // Colaboradores por região/especialidade (query otimizada)
  async findBySpecialties(specialties: string[]): Promise<Collaborator[]> {
    return prisma.collaborator.findMany({
      where: {
        status: "ACTIVE",
        specialties: { hasSome: specialties },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            location: true,
          },
        },
      },
      orderBy: [{ averageRating: "desc" }, { totalEvents: "desc" }],
    });
  }

  // Busca e filtros
  async search(params: {
    role?: string;
    status?: string;
    availabilityStatus?: string;
    name?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, status, name, page = 1, limit = 10 } = params;

    // Remover availabilityStatus do filtro, pois não existe no schema
    const where: import("@prisma/client").Prisma.CollaboratorWhereInput = {
      ...(role ? { collaboratorRole: role as CollaboratorRole } : {}),
      ...(status ? { status: status as CollaboratorStatus } : {}),
      ...(name ? { user: { name: { contains: name, mode: "insensitive" } } } : {}),
    };

    const [collaborators, total] = await Promise.all([
      prisma.collaborator.findMany({
        where,
        include: { user: { select: { name: true, email: true, avatarUrl: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.collaborator.count({ where }),
    ]);

    return {
      collaborators,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Avaliações
  async rateCollaborator(
    eventCollaboratorId: string,
    rating: number,
    feedback?: string,
  ): Promise<EventCollaborator> {
    const eventCollaborator = await prisma.eventCollaborator.update({
      where: { id: eventCollaboratorId },
      data: { rating, feedback },
    });

    // Atualizar média de avaliações
    await this.updateCollaboratorStats(eventCollaborator.collaboratorId);

    return eventCollaborator;
  }
}
