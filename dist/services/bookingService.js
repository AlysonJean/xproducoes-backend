"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
// ...código existente...
const client_1 = require("@prisma/client");
const bookingErrors_1 = require("../utils/bookingErrors");
const logger_1 = __importDefault(require("../config/logger"));
const prisma_1 = require("../config/prisma");
class BookingService {
    constructor() {
        this.prisma = prisma_1.prisma;
        // Configuração de includes para queries otimizadas
        this.bookingInclude = {
            client: {
                select: {
                    id: true,
                    phone: true,
                    companyName: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                }
            },
            // Inclui resumo de avaliação para controlar UI de "Deixar Avaliação"
            review: {
                select: {
                    id: true,
                    rating: true,
                    reported: true,
                    createdAt: true,
                }
            },
            creator: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            },
            assignee: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            },
            kit: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    imageUrl: true,
                    equipments: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            pricePerHour: true,
                            imageUrl: true,
                            category: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            },
            equipments: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    pricePerHour: true,
                    imageUrl: true,
                    isAvailable: true,
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            },
            attachments: {
                select: {
                    id: true,
                    url: true,
                    filename: true,
                    mimeType: true,
                    createdAt: true
                }
            }
        };
    }
    /**
     * Retorna receita total agrupada por mês e ano (para gráfico)
     */
    async getMonthlyRevenueByYear(year) {
        const now = new Date();
        const targetYear = year || now.getFullYear();
        // Busca todas as reservas confirmadas ou concluídas do ano
        const bookings = await this.prisma.booking.findMany({
            where: {
                eventDate: {
                    gte: new Date(targetYear, 0, 1),
                    lte: new Date(targetYear, 11, 31, 23, 59, 59, 999),
                },
                status: { in: ["CONFIRMED", "COMPLETED"] },
            },
            select: {
                eventDate: true,
                totalPrice: true,
            },
        });
        // Agrupa por mês
        const monthlyTotals = {};
        for (const booking of bookings) {
            const date = new Date(booking.eventDate);
            const month = date.getMonth() + 1; // 1-12
            const key = `${targetYear}-${month}`;
            monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(booking.totalPrice || 0);
        }
        // Gera array para todos os meses do ano
        const result = [];
        for (let m = 1; m <= 12; m++) {
            const key = `${targetYear}-${m}`;
            result.push({
                month: m,
                year: targetYear,
                total: monthlyTotals[key] || 0,
            });
        }
        return result;
    }
    /**
     * Cria uma nova reserva
     */
    async createBooking(data, creatorId, idempotencyKey) {
        try {
            // Validações básicas
            if (!data.eventDate || !data.eventEndDate) {
                throw new bookingErrors_1.BookingValidationError("Datas do evento são obrigatórias");
            }
            const eventDate = new Date(data.eventDate);
            const eventEndDate = new Date(data.eventEndDate);
            if (eventDate < new Date()) {
                throw new bookingErrors_1.BookingValidationError("A data do evento deve ser futura");
            }
            if (eventEndDate <= eventDate) {
                throw new bookingErrors_1.BookingValidationError("A data final deve ser posterior à data inicial");
            }
            // Buscar o usuário criador
            const creator = await this.prisma.user.findUnique({
                where: { id: creatorId }
            });
            if (!creator) {
                throw new bookingErrors_1.BookingValidationError("Usuário criador não encontrado");
            }
            // Calcular preço total
            let totalPrice = data.totalPrice || 0;
            if (!totalPrice) {
                if (data.kitId) {
                    const kit = await this.prisma.kit.findUnique({
                        where: { id: data.kitId }
                    });
                    totalPrice = kit?.price ? Number(kit.price) : 0;
                }
                else if (data.equipmentIds && data.equipmentIds.length > 0) {
                    const equipments = await this.prisma.equipment.findMany({
                        where: { id: { in: data.equipmentIds } }
                    });
                    totalPrice = equipments.reduce((sum, eq) => sum + Number(eq.pricePerHour), 0);
                }
            }
            // Lidar com cliente
            let clientId = data.clientId;
            if (!clientId && data.userId) {
                let client = await this.prisma.client.findFirst({
                    where: { userId: data.userId }
                });
                if (!client) {
                    client = await this.prisma.client.create({
                        data: {
                            userId: data.userId,
                            phone: data.clientContact || "",
                            companyName: data.clientName
                        }
                    });
                }
                clientId = client.id;
            }
            else if (!clientId && data.clientName && data.clientContact) {
                // Para clientes temporários, devemos conectar a um usuário existente se userId for fornecido
                if (data.userId) {
                    // Verificar se o usuário existe
                    const user = await this.prisma.user.findUnique({
                        where: { id: data.userId }
                    });
                    if (user) {
                        const client = await this.prisma.client.create({
                            data: {
                                userId: data.userId,
                                phone: data.clientContact,
                                companyName: data.clientName
                            }
                        });
                        clientId = client.id;
                    }
                    else {
                        throw new bookingErrors_1.BookingValidationError("Usuário não encontrado");
                    }
                }
                else {
                    throw new bookingErrors_1.BookingValidationError("Para criar um cliente temporário, é necessário fornecer um userId válido");
                }
            }
            if (!clientId) {
                throw new bookingErrors_1.BookingValidationError("É necessário identificar um cliente para a reserva");
            }
            // Criar a reserva com suporte a idempotência usando coluna dedicada.
            // Tentamos criar com idempotencyKey quando fornecida. Em caso de
            // violação de unicidade (P2002), buscamos o registro existente e o retornamos.
            const createData = {
                eventDate: eventDate,
                eventEndDate: eventEndDate,
                eventTitle: data.eventTitle || "Evento",
                location: data.location,
                street: data.street,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                addressNumber: data.addressNumber,
                addressComplement: data.addressComplement,
                requiresStairs: data.requiresStairs || false,
                isCovered: data.isCovered || true,
                hasParking: data.hasParking || true,
                eventDuration: data.eventDuration,
                notes: data.notes,
                clientId: clientId,
                creatorId: creatorId,
                clientName: data.clientName,
                clientContact: data.clientContact,
                clientEmail: data.clientEmail,
                status: data.status || client_1.BookingStatus.DRAFT,
                deliveryStatus: data.deliveryStatus || client_1.DeliveryStatus.PENDING,
                specialRequests: data.specialRequests,
                totalPrice: totalPrice,
                idempotencyKey: idempotencyKey || undefined,
                kitId: data.kitId,
                // Campos admin-only
                serviceValue: data.serviceValue,
                paymentProofUrl: data.paymentProofUrl,
                equipments: data.equipmentIds ? {
                    connect: data.equipmentIds.map(id => ({ id }))
                } : undefined
            };
            let booking;
            try {
                booking = await this.prisma.booking.create({
                    data: createData,
                    include: this.bookingInclude
                });
            }
            catch (err) {
                // Prisma: código P2002 -> violação de unicidade
                if (err?.code === 'P2002' && idempotencyKey) {
                    logger_1.default.info(`Idempotency unique constraint hit for key ${idempotencyKey}, fetching existing record`);
                    const existing = await this.prisma.booking.findFirst({
                        where: { idempotencyKey },
                        include: this.bookingInclude
                    });
                    if (existing)
                        return existing;
                }
                throw err;
            }
            logger_1.default.info(`Booking created successfully: ${booking.id}`);
            return booking;
        }
        catch (error) {
            logger_1.default.error("Error creating booking: " + String(error));
            if (error instanceof bookingErrors_1.BookingValidationError) {
                throw error;
            }
            throw new Error(`Erro interno ao criar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Busca uma reserva por ID
     */
    async getBookingById(id) {
        try {
            // Para a página de detalhes, incluímos os colaboradores do evento e os pagamentos
            // relacionados ao booking (filtrados por eventId). Construímos um include dinamicamente
            // para poder usar o id do booking ao filtrar collaborator.payments.
            const includeWithPayments = {
                ...this.bookingInclude,
                eventCollaborators: {
                    include: {
                        collaborator: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatarUrl: true
                                    }
                                },
                                payments: {
                                    where: { eventId: id },
                                    select: {
                                        id: true,
                                        amount: true,
                                        status: true,
                                        dueDate: true,
                                        paymentDate: true,
                                        type: true,
                                        notes: true,
                                        collaboratorId: true
                                    }
                                }
                            }
                        }
                    }
                }
            };
            const booking = await this.prisma.booking.findUnique({
                where: { id },
                include: includeWithPayments
            });
            if (!booking) {
                throw new bookingErrors_1.BookingNotFoundError();
            }
            return booking;
        }
        catch (error) {
            if (error instanceof bookingErrors_1.BookingNotFoundError) {
                throw error;
            }
            throw new Error(`Erro ao buscar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Busca todas as reservas com filtros
     */
    async getAllBookings(filters = {}) {
        try {
            const where = {};
            if (filters.status) {
                where.status = filters.status;
            }
            if (filters.deliveryStatus) {
                where.deliveryStatus = filters.deliveryStatus;
            }
            if (filters.clientId) {
                where.clientId = filters.clientId;
            }
            if (filters.creatorId) {
                where.creatorId = filters.creatorId;
            }
            if (filters.assigneeId) {
                where.assigneeId = filters.assigneeId;
            }
            if (filters.kitId) {
                where.kitId = filters.kitId;
            }
            if (filters.eventDateFrom || filters.eventDateTo) {
                where.eventDate = {};
                if (filters.eventDateFrom) {
                    where.eventDate.gte = filters.eventDateFrom;
                }
                if (filters.eventDateTo) {
                    where.eventDate.lte = filters.eventDateTo;
                }
            }
            const bookings = await this.prisma.booking.findMany({
                where,
                include: this.bookingInclude,
                orderBy: { eventDate: "asc" }
            });
            return bookings;
        }
        catch (error) {
            throw new Error(`Erro ao buscar reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Busca reservas por cliente
     */
    async getBookingsByClient(clientId) {
        try {
            return await this.getAllBookings({ clientId });
        }
        catch (error) {
            throw new Error(`Erro ao buscar reservas do cliente: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Atualiza uma reserva
     */
    async updateBooking(id, data) {
        try {
            const existingBooking = await this.getBookingById(id);
            const updateData = {};
            // Atualizar campos básicos
            if (data.eventTitle)
                updateData.eventTitle = data.eventTitle;
            if (data.eventDate)
                updateData.eventDate = new Date(data.eventDate);
            if (data.eventEndDate)
                updateData.eventEndDate = new Date(data.eventEndDate);
            if (data.location)
                updateData.location = data.location;
            if (data.notes)
                updateData.notes = data.notes;
            if (data.specialRequests)
                updateData.specialRequests = data.specialRequests;
            if (data.totalPrice)
                updateData.totalPrice = data.totalPrice;
            // Atualizar endereço
            if (data.street)
                updateData.street = data.street;
            if (data.neighborhood)
                updateData.neighborhood = data.neighborhood;
            if (data.city)
                updateData.city = data.city;
            if (data.state)
                updateData.state = data.state;
            if (data.zipCode)
                updateData.zipCode = data.zipCode;
            if (data.addressNumber)
                updateData.addressNumber = data.addressNumber;
            if (data.addressComplement !== undefined)
                updateData.addressComplement = data.addressComplement;
            // Atualizar configurações do local
            if (data.requiresStairs !== undefined)
                updateData.requiresStairs = data.requiresStairs;
            if (data.isCovered !== undefined)
                updateData.isCovered = data.isCovered;
            if (data.hasParking !== undefined)
                updateData.hasParking = data.hasParking;
            if (data.eventDuration)
                updateData.eventDuration = data.eventDuration;
            // Atualizar campos admin-only
            if (data.serviceValue !== undefined)
                updateData.serviceValue = data.serviceValue;
            if (data.paymentProofUrl !== undefined)
                updateData.paymentProofUrl = data.paymentProofUrl;
            const updatedBooking = await this.prisma.booking.update({
                where: { id },
                data: updateData,
                include: this.bookingInclude
            });
            logger_1.default.info(`Booking updated successfully: ${id}`);
            return updatedBooking;
        }
        catch (error) {
            if (error instanceof bookingErrors_1.BookingNotFoundError) {
                throw error;
            }
            throw new Error(`Erro ao atualizar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Atualiza o status de uma reserva
     */
    async updateBookingStatus(id, status) {
        try {
            const booking = await this.getBookingById(id);
            const updatedBooking = await this.prisma.booking.update({
                where: { id },
                data: { status },
                include: this.bookingInclude
            });
            logger_1.default.info(`Booking status updated: ${id} -> ${status}`);
            return updatedBooking;
        }
        catch (error) {
            if (error instanceof bookingErrors_1.BookingNotFoundError) {
                throw error;
            }
            throw new Error(`Erro ao atualizar status da reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Atualiza o status de entrega de uma reserva
     */
    async updateDeliveryStatus(id, deliveryStatus) {
        try {
            const booking = await this.getBookingById(id);
            const updatedBooking = await this.prisma.booking.update({
                where: { id },
                data: { deliveryStatus },
                include: this.bookingInclude
            });
            logger_1.default.info(`Booking delivery status updated: ${id} -> ${deliveryStatus}`);
            return updatedBooking;
        }
        catch (error) {
            if (error instanceof bookingErrors_1.BookingNotFoundError) {
                throw error;
            }
            throw new Error(`Erro ao atualizar status de entrega: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Deleta uma reserva
     */
    async deleteBooking(id) {
        try {
            const booking = await this.getBookingById(id);
            await this.prisma.booking.delete({
                where: { id }
            });
            logger_1.default.info(`Booking deleted: ${id}`);
        }
        catch (error) {
            if (error instanceof bookingErrors_1.BookingNotFoundError) {
                throw error;
            }
            throw new Error(`Erro ao deletar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Adiciona um comprovante/attachment à reserva
     */
    async addAttachment(bookingId, payload) {
        const booking = await this.getBookingById(bookingId);
        if (!booking)
            throw new bookingErrors_1.BookingNotFoundError();
        const attachment = await this.prisma.bookingAttachment.create({
            data: {
                bookingId,
                url: payload.url,
                filename: payload.filename || undefined,
                mimeType: payload.mimeType || undefined,
            }
        });
        return attachment;
    }
    async removeAttachment(attachmentId) {
        const att = await this.prisma.bookingAttachment.delete({ where: { id: attachmentId } });
        return att;
    }
    /**
     * Confirma uma reserva
     */
    async confirm(id) {
        return await this.updateBookingStatus(id, client_1.BookingStatus.CONFIRMED);
    }
    /**
     * Confirma reserva com detalhes: define totalPrice e atribui colaboradores (event_collaborators)
     */
    async confirmWithDetails(id, details) {
        try {
            const booking = await this.getBookingById(id);
            const data = { status: client_1.BookingStatus.CONFIRMED };
            if (details.totalPrice !== undefined)
                data.totalPrice = details.totalPrice;
            // Atualiza reserva com preço e status primeiro
            const updated = await this.prisma.booking.update({ where: { id }, data, include: this.bookingInclude });
            // Se colaboradores forem passados, criar eventCollaborator entries
            if (Array.isArray(details.collaborators) && details.collaborators.length > 0) {
                for (const c of details.collaborators) {
                    try {
                        await this.prisma.eventCollaborator.create({
                            data: {
                                bookingId: id,
                                collaboratorId: c.collaboratorId,
                                role: c.role,
                                startTime: c.startTime || '',
                                endTime: c.endTime || '',
                                hourlyRate: c.hourlyRate || undefined,
                                fixedRate: c.fixedRate || undefined,
                                totalHours: c.totalHours || undefined,
                                totalPayment: c.totalPayment || undefined,
                                notes: c.notes || undefined,
                                status: 'ASSIGNED'
                            }
                        });
                    }
                    catch (e) {
                        // Não bloquear toda operação se uma atribuição falhar
                        console.warn('Falha ao atribuir colaborador:', e);
                    }
                }
            }
            // Disparar notificações: email para o cliente e webhook externo (se configurado)
            try {
                const EmailService = (await Promise.resolve().then(() => __importStar(require('./emailService')))).default;
                const bookingFull = await this.getBookingById(id);
                const clientEmail = bookingFull.client?.user?.email || bookingFull.clientEmail || bookingFull.clientContact;
                const clientName = bookingFull.client?.user?.name || bookingFull.clientName || '';
                if (clientEmail) {
                    await EmailService.sendBookingConfirmation({ email: clientEmail, name: clientName }, bookingFull);
                }
            }
            catch (e) {
                console.warn('Erro ao enviar email de confirmação:', e);
            }
            // Webhook: delegate to WebhookService for dispatching & persistence
            try {
                const WebhookService = (await Promise.resolve().then(() => __importStar(require('./webhookService')))).default;
                const bookingFull = await this.getBookingById(id);
                void WebhookService.dispatchBookingConfirmed(bookingFull);
            }
            catch (e) {
                console.warn('Erro ao disparar webhook de confirmação (delegado):', e);
            }
            return await this.getBookingById(id);
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Cancela uma reserva
     */
    async cancel(id, reason) {
        try {
            const booking = await this.getBookingById(id);
            const updatedBooking = await this.prisma.booking.update({
                where: { id },
                data: {
                    status: client_1.BookingStatus.CANCELLED,
                    notes: reason ? `${booking.notes || ""}\n\nMotivo do cancelamento: ${reason}` : booking.notes
                },
                include: this.bookingInclude
            });
            logger_1.default.info(`Booking cancelled: ${id}`);
            return updatedBooking;
        }
        catch (error) {
            if (error instanceof bookingErrors_1.BookingNotFoundError) {
                throw error;
            }
            throw new Error(`Erro ao cancelar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Busca reservas próximas de um cliente
     */
    async getUpcoming(clientId) {
        try {
            const now = new Date();
            const bookings = await this.prisma.booking.findMany({
                where: {
                    clientId,
                    eventDate: { gte: now },
                    status: { not: client_1.BookingStatus.CANCELLED }
                },
                include: this.bookingInclude,
                orderBy: { eventDate: "asc" },
                take: 10
            });
            return bookings;
        }
        catch (error) {
            throw new Error(`Erro ao buscar próximas reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Busca histórico de reservas de um cliente
     */
    async getHistory(clientId) {
        try {
            const now = new Date();
            const bookings = await this.prisma.booking.findMany({
                where: {
                    clientId,
                    OR: [
                        { eventDate: { lt: now } },
                        { status: { in: [client_1.BookingStatus.COMPLETED, client_1.BookingStatus.CANCELLED] } }
                    ]
                },
                include: this.bookingInclude,
                orderBy: { eventDate: "desc" },
                take: 50
            });
            return bookings;
        }
        catch (error) {
            throw new Error(`Erro ao buscar histórico de reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Busca eventos do calendário
     */
    async getCalendar(month, year) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const bookings = await this.prisma.booking.findMany({
                where: {
                    eventDate: {
                        gte: startDate,
                        lte: endDate
                    },
                    status: { not: client_1.BookingStatus.CANCELLED }
                },
                include: this.bookingInclude,
                orderBy: { eventDate: "asc" }
            });
            return bookings.map(booking => ({
                id: booking.id,
                title: booking.eventTitle,
                start: booking.eventDate,
                end: booking.eventEndDate,
                status: booking.status,
                deliveryStatus: booking.deliveryStatus,
                client: booking.client,
                location: booking.location
            }));
        }
        catch (error) {
            throw new Error(`Erro ao buscar calendário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
    /**
     * Busca estatísticas do dashboard
     */
    async getDashboardStats() {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const [totalBookings, pendingBookings, confirmedBookings, monthlyBookings, monthlyRevenue] = await Promise.all([
                this.prisma.booking.count(),
                this.prisma.booking.count({ where: { status: client_1.BookingStatus.PENDING } }),
                this.prisma.booking.count({ where: { status: client_1.BookingStatus.CONFIRMED } }),
                this.prisma.booking.count({
                    where: {
                        eventDate: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        }
                    }
                }),
                this.prisma.booking.aggregate({
                    _sum: { totalPrice: true },
                    where: {
                        eventDate: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        },
                        status: { not: client_1.BookingStatus.CANCELLED }
                    }
                })
            ]);
            return {
                totalBookings,
                pendingBookings,
                confirmedBookings,
                monthlyBookings,
                monthlyRevenue: monthlyRevenue._sum.totalPrice || 0
            };
        }
        catch (error) {
            throw new Error(`Erro ao buscar estatísticas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
}
exports.BookingService = BookingService;
