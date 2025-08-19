"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaboratorRepository = void 0;
// OBSOLETO: Centralizado no Prisma Client
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
class CollaboratorRepository {
    // CRUD de Colaboradores
    async create(data) {
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
        return prisma_1.prisma.collaborator.create({
            data: collaboratorData,
            include: {
                user: true,
            },
        });
    }
    async findAll() {
        return prisma_1.prisma.collaborator.findMany({
            include: {
                user: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async findById(id) {
        const collaborator = await prisma_1.prisma.collaborator.findUnique({
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
        if (!collaborator)
            return null;
        return collaborator;
    }
    async findByEmail(email) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
                collaboratorProfile: true,
            },
        });
        if (!user?.collaboratorProfile)
            return null;
        return {
            ...user.collaboratorProfile,
            user: {
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
            },
        };
    }
    async update(id, data) {
        return prisma_1.prisma.collaborator.update({
            where: { id },
            data: data,
        });
    }
    async delete(id) {
        return prisma_1.prisma.collaborator.delete({
            where: { id },
        });
    }
    // Gestão de Eventos
    async assignToEvent(data) {
        const eventCollaborator = await prisma_1.prisma.eventCollaborator.create({
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
    async updateEventCollaborator(id, data) {
        return prisma_1.prisma.eventCollaborator.update({
            where: { id },
            data,
            include: {
                collaborator: true,
                booking: true,
            },
        });
    }
    async removeFromEvent(id) {
        const eventCollaborator = await prisma_1.prisma.eventCollaborator.delete({
            where: { id },
            include: {
                collaborator: true,
            },
        });
        // Atualizar estatísticas do colaborador
        await this.updateCollaboratorStats(eventCollaborator.collaboratorId);
        return eventCollaborator;
    }
    async findEventCollaborators(eventId) {
        return prisma_1.prisma.eventCollaborator.findMany({
            where: { bookingId: eventId },
            include: {
                collaborator: true,
            },
        });
    }
    async findCollaboratorEvents(collaboratorId) {
        return prisma_1.prisma.eventCollaborator.findMany({
            where: { collaboratorId },
            include: {
                booking: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    // Disponibilidade
    async setAvailability(data) {
        return prisma_1.prisma.collaboratorAvailability.create({
            data,
        });
    }
    async getAvailableCollaborators(date, role) {
        return prisma_1.prisma.collaborator.findMany({
            where: {
                status: client_1.CollaboratorStatus.ACTIVE,
                ...(role ? { collaboratorRole: role } : {}),
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
    async createPaymentRecord(data) {
        // Criar registro de valor devido
        const result = await prisma_1.prisma.collaboratorPayment.create({
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
    async updatePaymentStatus(id, status) {
        const payment = await prisma_1.prisma.collaboratorPayment.update({
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
    async findAllAvailabilities() {
        return prisma_1.prisma.collaboratorAvailability.findMany({
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
    async updateAvailability(id, data) {
        return prisma_1.prisma.collaboratorAvailability.update({
            where: { id },
            data,
        });
    }
    async deleteAvailability(id) {
        return prisma_1.prisma.collaboratorAvailability.delete({
            where: { id },
        });
    }
    async findCollaboratorAvailabilities(collaboratorId) {
        return prisma_1.prisma.collaboratorAvailability.findMany({
            where: { collaboratorId },
            orderBy: { date: "desc" },
        });
    }
    // Métodos para Pagamentos
    async findAllPayments() {
        return prisma_1.prisma.collaboratorPayment.findMany({
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
    async updatePayment(id, data) {
        const payment = await prisma_1.prisma.collaboratorPayment.update({
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
    async deletePayment(id) {
        return prisma_1.prisma.collaboratorPayment.delete({
            where: { id },
        });
    }
    async findCollaboratorPayments(collaboratorId) {
        return prisma_1.prisma.collaboratorPayment.findMany({
            where: { collaboratorId },
            orderBy: { createdAt: "desc" },
        });
    }
    async getPaymentStats(collaboratorId) {
        const payments = await prisma_1.prisma.collaboratorPayment.findMany({
            where: { collaboratorId },
        });
        const totalPayments = payments.length;
        const paidPayments = payments.filter((p) => p.status === "PAID");
        const pendingPayments = payments.filter((p) => p.status === "PENDING");
        const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const averagePayment = totalPayments > 0 ? totalPaid / paidPayments.length : 0;
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
    async getCollaboratorStats(id, period) {
        const whereClause = {
            collaboratorId: id,
            status: {
                in: ["COMPLETED"],
            },
            ...(period
                ? { createdAt: { gte: period.start, lte: period.end } }
                : {}),
        };
        const events = await prisma_1.prisma.eventCollaborator.findMany({
            where: whereClause,
            include: {
                booking: true,
            },
        });
        const totalEvents = events.length;
        const totalEarnings = events.reduce((sum, event) => {
            // Prisma retorna Decimal | null, então precisamos converter
            const earning = event.totalPayment ?? event.fixedRate ?? 0;
            return sum + (earning ? Number(earning) : 0);
        }, 0);
        const ratings = events
            .filter((e) => typeof e.rating === "number" && e.rating !== null)
            .map((e) => Number(e.rating));
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) /
                ratings.length
            : 0;
        const completedEvents = events.filter((e) => e.status === "COMPLETED").length;
        const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;
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
    async getMonthlyEarnings(collaboratorId) {
        const result = (await prisma_1.prisma.$queryRaw `
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
    `);
        return result;
    }
    async updateCollaboratorStats(collaboratorId) {
        const stats = await this.getCollaboratorStats(collaboratorId);
        await prisma_1.prisma.collaborator.update({
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
    async findAllWithUsers(status, role) {
        const where = {};
        if (status)
            where.status = status;
        if (role)
            where.collaboratorRole = role;
        return prisma_1.prisma.collaborator.findMany({
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
    async getCollaboratorDashboard(collaboratorId) {
        const where = collaboratorId
            ? { collaboratorId }
            : {};
        const [totalCollaborators, activeCollaborators, eventStats, topPerformers] = await Promise.all([
            prisma_1.prisma.collaborator.count(),
            prisma_1.prisma.collaborator.count({ where: { status: "ACTIVE" } }),
            prisma_1.prisma.eventCollaborator.groupBy({
                by: ["status"],
                where,
                _count: { id: true },
            }),
            prisma_1.prisma.collaborator.findMany({
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
            eventStats: eventStats.reduce((acc, stat) => {
                acc[stat.status] = stat._count.id;
                return acc;
            }, {}),
            topPerformers,
        };
    }
    // Availability check otimizado para múltiplos colaboradores
    async checkAvailability(collaboratorIds, eventDate, startTime, endTime) {
        // Removido variável não utilizada dayOfWeek
        // Query única para verificar todos os colaboradores
        const conflictingAssignments = await prisma_1.prisma.eventCollaborator.findMany({
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
        return collaboratorIds.map((collaboratorId) => {
            const conflicts = conflictingAssignments.filter((assignment) => assignment.collaboratorId === collaboratorId);
            return {
                collaboratorId,
                isAvailable: conflicts.length === 0,
                conflicts: conflicts.length,
            };
        });
    }
    // Colaboradores por região/especialidade (query otimizada)
    async findBySpecialties(specialties) {
        return prisma_1.prisma.collaborator.findMany({
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
    async search(params) {
        const { role, status, name, page = 1, limit = 10 } = params;
        // Remover availabilityStatus do filtro, pois não existe no schema
        const where = {
            ...(role ? { collaboratorRole: role } : {}),
            ...(status ? { status: status } : {}),
            ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
        };
        const [collaborators, total] = await Promise.all([
            prisma_1.prisma.collaborator.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.prisma.collaborator.count({ where }),
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
    async rateCollaborator(eventCollaboratorId, rating, feedback) {
        const eventCollaborator = await prisma_1.prisma.eventCollaborator.update({
            where: { id: eventCollaboratorId },
            data: { rating, feedback },
        });
        // Atualizar média de avaliações
        await this.updateCollaboratorStats(eventCollaborator.collaboratorId);
        return eventCollaborator;
    }
}
exports.CollaboratorRepository = CollaboratorRepository;
