// OBSOLETO: Centralizado no Prisma Client
import { prisma } from "../config/prisma";
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

  async update(id: string, data: Partial<Collaborator>): Promise<Collaborator> {
    return prisma.collaborator.update({
      where: { id },
      data: data as import("@prisma/client").Prisma.CollaboratorUpdateInput,
    });
  }

  async delete(id: string): Promise<Collaborator> {
    return prisma.collaborator.delete({
      where: { id },
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
        collaborator: true,
      },
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
    eventId?: string;
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
        eventId: data.eventId || "placeholder",
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
    const result = (await prisma.$queryRaw`
      SELECT 
        TO_CHAR(date_trunc('month', ec."createdAt"), 'YYYY-MM') as month,
        COALESCE(SUM(COALESCE(ec."totalPayment", ec."fixedRate", 0)), 0) as earnings,
        COUNT(*) as events
      FROM "EventCollaborator" ec
      WHERE ec."collaboratorId" = ${collaboratorId}
        AND ec.status = 'COMPLETED'
        AND ec."createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY date_trunc('month', ec."createdAt")
      ORDER BY month DESC
    `) as Array<{
      month: string;
      earnings: number;
      events: number;
    }>;

    return result;
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
    const where: Partial<EventCollaborator> = collaboratorId
      ? { collaboratorId }
      : {};

    const [totalCollaborators, activeCollaborators, eventStats, topPerformers] =
      await Promise.all([
        prisma.collaborator.count(),
        prisma.collaborator.count({ where: { status: "ACTIVE" } }),
        prisma.eventCollaborator.groupBy({
          by: ["status"],
          where,
          _count: { id: true },
        }),
        prisma.collaborator.findMany({
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
            _count: {
              select: { eventAssignments: true },
            },
          },
          orderBy: { averageRating: "desc" },
          take: 5,
        }),
      ]);

    return {
      totalCollaborators,
      activeCollaborators,
      eventStats: eventStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      topPerformers,
    };
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
      ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
    };

    const [collaborators, total] = await Promise.all([
      prisma.collaborator.findMany({
        where,
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
