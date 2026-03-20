import { Prisma, BookingStatus, DeliveryStatus } from "@prisma/client";
import { BookingCreateInput, BookingUpdateInput, BookingFilters } from "../validators/bookingSchema.js";
import { 
  BookingValidationError, 
  BookingNotFoundError,
  BookingBusinessLogicError
} from "../utils/bookingErrors.js";
import logger from "../config/logger.js";
import { prisma } from "../config/prisma.js";
import { generateSemanticBookingId } from "../utils/bookingIdGenerator.js";
import { cacheService } from "./cacheService.js";
import { googleCalendarService } from "./googleCalendarService.js";
import { whatsappService } from "./whatsappService.js";

type BookingUpdateExtras = {
  technicalRider?: string | null;
  technicalRiderUrl?: string | null;
  locationUrl?: string | null;
  venueContactName?: string | null;
  venueContactPhone?: string | null;
};

export class BookingService {
  /**
   * Retorna receita total agrupada por mês e ano (para gráfico)
   */
  async getMonthlyRevenueByYear(year?: number): Promise<{ month: number; year: number; total: number }[]> {
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
    const monthlyTotals: { [key: string]: number } = {};
    for (const booking of bookings) {
      const date = new Date(booking.eventDate);
      const month = date.getMonth() + 1; // 1-12
      const key = `${targetYear}-${month}`;
      monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(booking.totalPrice || 0);
    }

    // Gera array para todos os meses do ano
    const result: { month: number; year: number; total: number }[] = [];
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
  private prisma = prisma;

  // Configuração de includes para queries otimizadas
  private readonly bookingInclude = {
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
        items: {
          select: {
            equipment: {
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
        status: true,
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
    },
    services: {
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        duration: true
      }
    },
    items: {
      select: {
        id: true,
        description: true,
        quantity: true,
        unitPrice: true,
        discount: true,
        totalPrice: true,
        itemType: true,
        equipmentId: true,
        serviceId: true,
        kitId: true
      }
    },
    chats: {
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true
      }
    },
    tasks: {
      orderBy: { createdAt: 'asc' as const }
    },
    expenses: {
      include: {
        collaborator: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    }
  };

  /**
   * Cria uma nova reserva
   */
  async createBooking(data: BookingCreateInput, creatorId: string, idempotencyKey?: string): Promise<any> {
    try {
      // BACK-003: Check idempotency key first to avoid duplicate work
      if (idempotencyKey) {
        const existing = await this.prisma.booking.findFirst({
          where: ({ idempotencyKey } as any),
          include: this.bookingInclude
        });
        if (existing) return existing;
      }

      // Validações básicas
      if (!data.eventDate || !data.eventEndDate) {
        throw new BookingValidationError("Datas do evento são obrigatórias");
      }

      const eventDate = new Date(data.eventDate);
      const eventEndDate = new Date(data.eventEndDate);

      if (eventDate < new Date()) {
        throw new BookingValidationError("A data do evento deve ser futura");
      }

      if (eventEndDate <= eventDate) {
        throw new BookingValidationError("A data final deve ser posterior à data inicial");
      }

      // BACK-001: Parallel independent queries to fix N+1
      const [creator, kit, equipments, services] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: creatorId } }),
        data.kitId ? this.prisma.kit.findUnique({ where: { id: data.kitId } }) : null,
        data.equipmentIds?.length ? this.prisma.equipment.findMany({ where: { id: { in: data.equipmentIds } } }) : [],
        (data as any).serviceIds?.length ? this.prisma.service.findMany({ where: { id: { in: (data as any).serviceIds } } }) : [],
      ]);

      if (!creator) {
        throw new BookingValidationError("Usuário criador não encontrado");
      }

      // Calcular preço total
      // Kits e Equipamentos são por HORA. Serviços são fixos.
      let totalPrice = data.totalPrice || 0;
      const duration = data.eventDuration || 0;

      if (!totalPrice) {
        const kitsPrice = kit?.price ? Number(kit.price) * duration : 0;
        const equipmentsPrice = (equipments as any[]).reduce((sum: number, eq: any) => sum + Number(eq.pricePerHour), 0) * duration;
        const servicesPrice = (services as any[]).reduce((sum: number, s: any) => sum + Number(s.price), 0);
        totalPrice = kitsPrice + equipmentsPrice + servicesPrice;
      }

      // BACK-002: Lidar com cliente usando upsert para evitar race condition
      let clientId = data.clientId;
      if (!clientId && data.userId) {
        const client = await this.prisma.client.upsert({
          where: { userId: data.userId },
          create: {
            userId: data.userId,
            phone: data.clientContact || "",
            companyName: data.clientName
          },
          update: {}
        });
        clientId = client.id;
      } else if (!clientId && data.clientName && data.clientContact) {
        if (data.userId) {
          const user = await this.prisma.user.findUnique({
            where: { id: data.userId }
          });
          
          if (user) {
            const client = await this.prisma.client.upsert({
              where: { userId: data.userId },
              create: {
                userId: data.userId,
                phone: data.clientContact,
                companyName: data.clientName
              },
              update: {}
            });
            clientId = client.id;
          } else {
            throw new BookingValidationError("Usuário não encontrado");
          }
        } else {
          throw new BookingValidationError("Para criar um cliente temporário, é necessário fornecer um userId válido");
        }
      }

      if (!clientId) {
        throw new BookingValidationError("É necessário identificar um cliente para a reserva");
      }

      // Gerar ID semântico (Ex: XP-JOAO-20260210-1430-8K2)
      const bookingId = generateSemanticBookingId(data.clientName || "CLIENTE");

      const createData: any = {
        id: bookingId,
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
        status: data.status || BookingStatus.DRAFT,
        deliveryStatus: data.deliveryStatus || DeliveryStatus.PENDING,
        specialRequests: data.specialRequests,
        totalPrice: totalPrice,
        idempotencyKey: idempotencyKey || undefined,
        kitId: data.kitId,
        technicalRider: data.technicalRider,
        technicalRiderUrl: data.technicalRiderUrl,
        locationUrl: data.locationUrl,
        venueContactName: data.venueContactName,
        venueContactPhone: data.venueContactPhone,
        // Campos admin-only e logísticos
        serviceValue: data.serviceValue,
        paymentProofUrl: data.paymentProofUrl,
        setupTime: (data as any).setupTime ? new Date((data as any).setupTime) : undefined,
        pickupTime: (data as any).pickupTime ? new Date((data as any).pickupTime) : undefined,
        items: data.items ? {
          create: data.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            itemType: item.itemType as any,
            equipmentId: item.equipmentId,
            serviceId: item.serviceId,
            kitId: item.kitId
          }))
        } : undefined,
        equipments: data.equipmentIds ? {
          connect: data.equipmentIds.map((id: string) => ({ id }))
        } : undefined,
        services: (data as any).serviceIds ? {
          connect: (data as any).serviceIds.map((id: string) => ({ id }))
        } : undefined
      };

      // BACK-001: Wrap booking creation in a transaction
      let booking: any;
      try {
        booking = await this.prisma.$transaction(async (tx: any) => {
          return tx.booking.create({
            data: createData,
            include: this.bookingInclude
          });
        });
      } catch (err: any) {
        // Prisma: código P2002 -> violação de unicidade
        if (err?.code === 'P2002' && idempotencyKey) {
          logger.info(`Idempotency unique constraint hit for key ${idempotencyKey}, fetching existing record`);
          const existing = await this.prisma.booking.findFirst({
            where: ({ idempotencyKey } as any),
            include: this.bookingInclude
          });
          if (existing) return existing;
        }
        throw err;
      }

      logger.info(`Booking created successfully: ${booking.id}`);
      // Invalida cache do dashboard
      void cacheService.invalidateBookingCaches(booking.id);
      return booking;

    } catch (error) {
      logger.error("Error creating booking: " + String(error));
      if (error instanceof BookingValidationError) {
        throw error;
      }
      if (
        error instanceof Error &&
        error.message &&
        error.message.includes("Cannot read properties of undefined")
      ) {
        throw new BookingValidationError("É necessário identificar um cliente para a reserva");
      }
      throw new BookingBusinessLogicError(`Erro interno ao criar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca uma reserva por ID
   */
  async getBookingById(id: string): Promise<any> {
    try {
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
      } as any;

      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: includeWithPayments
      });

      if (!booking) {
        throw new BookingNotFoundError();
      }

      return booking;
    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new BookingBusinessLogicError(`Erro ao buscar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca todas as reservas com filtros
   */
  async getAllBookings(filters: BookingFilters = {}): Promise<any[]> {
    try {
      const where: Prisma.BookingWhereInput = {};

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
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao buscar reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Conta o total de reservas com filtros (para paginação)
   */
  async countBookings(filters: BookingFilters = {}): Promise<number> {
    try {
      const where: Prisma.BookingWhereInput = {};

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

      return await this.prisma.booking.count({ where });
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao contar reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca reservas por cliente
   */
  async getBookingsByClient(clientId: string): Promise<any[]> {
    try {
      return await this.getAllBookings({ clientId });
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao buscar reservas do cliente: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Atualiza uma reserva
   */
  async updateBooking(id: string, data: BookingUpdateInput & BookingUpdateExtras): Promise<any> {
    try {
      // Valida se booking existe (throws se não existir)
      await this.getBookingById(id);

      const updateData: Prisma.BookingUpdateInput = {};

      // Atualizar campos básicos
      if (data.eventTitle) updateData.eventTitle = data.eventTitle;
      if (data.eventDate) updateData.eventDate = new Date(data.eventDate);
      if (data.eventEndDate) updateData.eventEndDate = new Date(data.eventEndDate);
      if (data.location) updateData.location = data.location;
      if (data.notes) updateData.notes = data.notes;
      if (data.specialRequests) updateData.specialRequests = data.specialRequests;
      if (data.totalPrice) updateData.totalPrice = data.totalPrice;

      // Atualizar endereço
      if (data.street) updateData.street = data.street;
      if (data.neighborhood) updateData.neighborhood = data.neighborhood;
      if (data.city) updateData.city = data.city;
      if (data.state) updateData.state = data.state;
      if (data.zipCode) updateData.zipCode = data.zipCode;
      if (data.addressNumber) updateData.addressNumber = data.addressNumber;
      if (data.addressComplement !== undefined) updateData.addressComplement = data.addressComplement;

      // Atualizar configurações do local
      if (data.requiresStairs !== undefined) updateData.requiresStairs = data.requiresStairs;
      if (data.isCovered !== undefined) updateData.isCovered = data.isCovered;
      if (data.hasParking !== undefined) updateData.hasParking = data.hasParking;
      if (data.eventDuration) updateData.eventDuration = data.eventDuration;

      // Atualizar campos admin-only
      if (data.serviceValue !== undefined) (updateData as any).serviceValue = data.serviceValue;
      if (data.paymentProofUrl !== undefined) (updateData as any).paymentProofUrl = data.paymentProofUrl;
      
      // Crew Experience fields
      if (data.technicalRider !== undefined) (updateData as any).technicalRider = data.technicalRider;
      if (data.technicalRiderUrl !== undefined) (updateData as any).technicalRiderUrl = data.technicalRiderUrl;
      if (data.locationUrl !== undefined) (updateData as any).locationUrl = data.locationUrl;
      if ((data as any).venueContactName !== undefined) (updateData as any).venueContactName = (data as any).venueContactName;
      if ((data as any).venueContactPhone !== undefined) (updateData as any).venueContactPhone = (data as any).venueContactPhone;

      // Atualizar itens (substituição total para simplicidade no orçamento)
      if (data.items) {
        // Primeiro remove os antigos
        await this.prisma.bookingItem.deleteMany({ where: { bookingId: id } });
        // Cria os novos
        (updateData as any).items = {
          create: data.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            itemType: item.itemType as any,
            equipmentId: item.equipmentId,
            serviceId: item.serviceId,
            kitId: item.kitId
          }))
        };
      }

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: updateData,
        include: this.bookingInclude
      });

      logger.info(`Booking updated successfully: ${id}`);
      // Invalida cache do dashboard
      void cacheService.invalidateBookingCaches(id);
      return updatedBooking;

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new BookingBusinessLogicError(`Erro ao atualizar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Atualiza o status de uma reserva
   */
  async updateBookingStatus(id: string, status: BookingStatus): Promise<any> {
    try {
      // Valida se a reserva existe
      await this.getBookingById(id);

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: { status },
        include: this.bookingInclude
      });

      logger.info(`Booking status updated: ${id} -> ${status}`);
      // Invalida cache do dashboard
      void cacheService.invalidateBookingCaches(id);

      if (status === BookingStatus.CONFIRMED) {
        // Sync automático com Google Calendar
        void this.syncGoogleCalendar(updatedBooking);

        // Enviar email de confirmação
        try {
          const EmailService = (await import('./emailService.js')).default;
          const clientUser = updatedBooking.client?.user;
          const clientEmail = clientUser?.email || updatedBooking.clientEmail || (updatedBooking as any).clientContact;
          const clientName = clientUser?.name || updatedBooking.clientName || '';
          
          if (clientEmail) {
            void EmailService.sendBookingApproved({ name: clientName, email: clientEmail }, updatedBooking);
          }
        } catch (e: any) {
          logger.warn({ error: e }, 'Erro ao enviar email de aprovação via updateBookingStatus');
        }

        // WhatsApp Notification
        void whatsappService.sendBookingConfirmation(updatedBooking).catch((e: any) => {
            logger.warn({ error: e }, 'Erro ao enviar notificação WhatsApp');
        });

        // Notify Collaborators (WhatsApp + Google Calendar)
        void this.notifyCollaborators(updatedBooking).catch((e: any) => {
            logger.warn({ error: e }, 'Erro ao notificar colaboradores');
        });

        // Sync Admin Calendars (Master Agenda)
        void this.syncAdminCalendars(updatedBooking).catch((e: any) => {
            logger.warn({ error: e }, 'Erro ao sincronizar agendas dos admins');
        });

        // Sync Chat Operacional
        void this.syncEventChat(updatedBooking.id);
      }

      return updatedBooking;

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new BookingBusinessLogicError(`Erro ao atualizar status da reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Sincroniza chat operacional do evento
   */
  private async syncEventChat(bookingId: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          eventCollaborators: { include: { collaborator: true } },
          creator: true
        }
      });

      if (!booking) return;

      let chat = await this.prisma.chat.findFirst({
        where: { bookingId, type: 'EVENT' }
      });

      const participantIds = new Set<string>();
      if (booking.creator.role === 'ADMIN' || booking.creator.role === 'MANAGER') {
        participantIds.add(booking.creatorId);
      }
      booking.eventCollaborators.forEach((ec: any) => participantIds.add(ec.collaborator.userId));

      if (!chat) {
        chat = await this.prisma.chat.create({
          data: {
            name: `Evento: ${booking.eventTitle || booking.id}`,
            type: 'EVENT',
            bookingId,
            participants: {
              create: Array.from(participantIds).map(userId => ({ userId }))
            }
          }
        });
        logger.info(`Chat de evento criado: ${chat.id}`);
      } else {
        // Atualizar participantes se necessário
        for (const userId of participantIds) {
          await this.prisma.chatParticipant.upsert({
            where: { chatId_userId: { chatId: chat.id, userId } },
            create: { chatId: chat.id, userId },
            update: {}
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao sincronizar chat do evento', error);
    }
  }

  /**
   * Atualiza o status de entrega de uma reserva
   */
  async updateDeliveryStatus(id: string, deliveryStatus: DeliveryStatus): Promise<any> {
    try {
      // Valida se a reserva existe
      await this.getBookingById(id);

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: { deliveryStatus },
        include: this.bookingInclude
      });

      logger.info(`Booking delivery status updated: ${id} -> ${deliveryStatus}`);
      // Invalida cache do dashboard
      void cacheService.invalidateBookingCaches(id);
      return updatedBooking;

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new BookingBusinessLogicError(`Erro ao atualizar status de entrega: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Deleta uma reserva
   */
  async deleteBooking(id: string): Promise<void> {
    try {
      // Valida se a reserva existe
      await this.getBookingById(id);

      await this.prisma.$transaction(async (tx) => {
        // Desvincula chats (bookingId nullable — preserva histórico de mensagens)
        await tx.chat.updateMany({ where: { bookingId: id }, data: { bookingId: null } });

        await tx.booking.delete({ where: { id } });
      });

      logger.info(`Booking deleted: ${id}`);
      // Invalida cache do dashboard
      void cacheService.invalidateBookingCaches(id);

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new BookingBusinessLogicError(`Erro ao deletar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Adiciona um comprovante/attachment à reserva
   */
  async addAttachment(bookingId: string, payload: { url: string; filename?: string; mimeType?: string }) {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new BookingNotFoundError();

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

  async removeAttachment(attachmentId: string) {
  const att = await this.prisma.bookingAttachment.delete({ where: { id: attachmentId } });
    return att;
  }

  /**
   * Confirma uma reserva
   */
  async confirm(id: string): Promise<any> {
    return await this.updateBookingStatus(id, BookingStatus.CONFIRMED);
  }

  /**
   * Confirma uma reserva com detalhes (atribuição de equipe e ajuste de valor)
   */
  async confirmWithDetails(id: string, data: { totalPrice?: number; collaborators?: any[] }): Promise<any> {
    try {
      // Atualizar a reserva com novo valor e status
      const updateData: any = { status: BookingStatus.CONFIRMED };
      if (data.totalPrice) updateData.totalPrice = data.totalPrice;

      if (data.collaborators && data.collaborators.length > 0) {
        updateData.eventCollaborators = {
           deleteMany: {}, // Limpa anteriores para novo set
           create: data.collaborators.map((c: any) => ({
              collaboratorId: c.collaboratorId,
              role: c.role || 'OTHER',
              functionId: c.functionId,
              startTime: c.startTime || '08:00',
              endTime: c.endTime || '18:00',
              totalPayment: c.fixedRate || 0,
              fixedRate: c.fixedRate || 0,
              status: 'CONFIRMED'
           }))
        };
      }

      const booking = await this.prisma.booking.update({
        where: { id },
        data: updateData,
        include: this.bookingInclude
      });

      // Triggers de confirmação (Emails, Zap, Calendar)
      void this.updateBookingStatus(id, BookingStatus.CONFIRMED);

      return booking;
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao confirmar com detalhes: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Cancela uma reserva
   */
  async cancel(id: string, reason?: string): Promise<any> {
    try {
      await this.getBookingById(id);

      const booking = await this.prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          notes: reason ? `Cancelado: ${reason}` : "Reserva cancelada."
        },
        include: this.bookingInclude
      });

      logger.info(`Booking cancelled: ${id}`);
      // Invalida cache do dashboard
      void cacheService.invalidateBookingCaches(id);
      return booking;
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao cancelar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Sincroniza reserva com Google Calendar (Admin principal)
   */
  async syncGoogleCalendar(booking: any) {
    try {
      if (!booking.creator.googleRefreshToken) return;

      const eventData = {
        title: `Evento: ${booking.eventTitle || 'X Produções'}`,
        description: `Cliente: ${booking.clientName}\nLocal: ${booking.location}\nValor: R$ ${booking.totalPrice}`,
        location: booking.location || '',
        startDate: booking.eventDate,
        endDate: booking.eventEndDate
      };

      await googleCalendarService.createEvent(booking.creatorId, eventData);
      logger.info(`Google Calendar sync completed for booking ${booking.id}`);
    } catch (error) {
      logger.error('Google Calendar Sync Error:', error);
    }
  }

  /**
   * Notifica colaboradores escalados
   */
  private async notifyCollaborators(booking: any) {
    try {
      const collabs = await this.prisma.eventCollaborator.findMany({
        where: { bookingId: booking.id },
        include: { collaborator: { include: { user: true } } }
      });

      for (const ec of collabs) {
        const phone = ec.collaborator.phone || (ec.collaborator.user as any).phone;
        if (phone) {
             const message = `Olá ${ec.collaborator.user.name}, você foi escalado para o evento "${booking.eventTitle}" em ${new Date(booking.eventDate).toLocaleDateString('pt-BR')}.

Confirme sua presença no painel.`;

             await whatsappService.sendMessage(phone, message).catch(e => logger.warn('Erro zap collab', e));
        }
      }

    } catch (e) {
      logger.error('Erro ao notificar colaboradores', e);
    }
  }

  /**
   * Sincroniza a reserva com a agenda de todos os admins conectados
   */
  private async syncAdminCalendars(booking: any) {
    try {
        const admins = await this.prisma.user.findMany({
            where: {
                role: 'ADMIN',
                googleRefreshToken: { not: null }
            }
        });

        if (admins.length === 0) return;

        const eventData = {
            title: `[X] ${booking.eventTitle || 'Evento'} - ${booking.client?.user?.name || 'Cliente'}`,
            description: `Evento Confirmado\nCliente: ${booking.client?.user?.name}\nLocal: ${booking.location}\nValor: R$ ${booking.totalPrice}\n\nGestão: ${process.env.FRONTEND_URL}/admin/reservas/${booking.id}`,
            location: booking.location,
            startDate: booking.eventDate,
            endDate: booking.eventEndDate || new Date(booking.eventDate.getTime() + 4 * 3600 * 1000)
        };

        for (const admin of admins) {
            try {
                await googleCalendarService.createEvent(admin.id, eventData);
                logger.info(`Agenda Admin ${admin.email} atualizada`);
            } catch (error) {
                logger.warn(`Erro ao atualizar agenda admin ${admin.email}`, error);
            }
        }
    } catch (error) {
        logger.error('Erro ao sync admins calendars', error);
    }
  }

  /**
   * Busca reservas próximas de um cliente
   */
  async getUpcoming(clientId: string): Promise<any[]> {
    try {
      const now = new Date();
      const bookings = await this.prisma.booking.findMany({
        where: {
          clientId,
          eventDate: { gte: now },
          status: { not: BookingStatus.CANCELLED }
        },
        include: this.bookingInclude,
        orderBy: { eventDate: "asc" },
        take: 10
      });

      return bookings;
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao buscar próximas reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca histórico de reservas de um cliente
   */
  async getHistory(clientId: string): Promise<any[]> {
    try {
      const now = new Date();
      const bookings = await this.prisma.booking.findMany({
        where: {
          clientId,
          OR: [
            { eventDate: { lt: now } },
            { status: { in: [BookingStatus.COMPLETED, BookingStatus.CANCELLED] } }
          ]
        },
        include: this.bookingInclude,
        orderBy: { eventDate: "desc" },
        take: 50
      });

      return bookings;
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao buscar histórico de reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca eventos do calendário
   */
  async getCalendar(month?: number, year?: number): Promise<any[]> {
    try {
      let dateFilter = {};
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        dateFilter = {
          eventDate: {
            gte: startDate,
            lte: endDate
          }
        };
      }

      const bookings = await this.prisma.booking.findMany({
        where: {
          ...dateFilter,
          status: { not: BookingStatus.CANCELLED }
        },
        include: {
          ...this.bookingInclude,
          eventCollaborators: {
            include: {
              collaborator: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { eventDate: "asc" }
      });

      return bookings.map((booking: any) => {
        const eventDate = booking.eventDate;
        const eventEndDate = booking.eventEndDate;
        const durationHours = eventDate && eventEndDate
          ? Math.max(1, Math.round((new Date(eventEndDate).getTime() - new Date(eventDate).getTime()) / 3600000))
          : (booking.eventDuration || 4);

        const client = booking.client
          ? {
              name: booking.client.user?.name || booking.clientName || undefined,
              phone: booking.client.phone || booking.clientContact || undefined,
            }
          : (booking.clientName || booking.clientContact
              ? { name: booking.clientName, phone: booking.clientContact }
              : undefined);

        const venue = (booking.street || booking.city || booking.zipCode)
          ? {
              street: booking.street || undefined,
              city: booking.city || undefined,
              postalCode: booking.zipCode || undefined,
            }
          : undefined;

        const equipments = Array.isArray(booking.equipments) ? booking.equipments : [];
        const kits = booking.kit ? [booking.kit] : [];
        const collaborators = Array.isArray(booking.eventCollaborators)
          ? booking.eventCollaborators.map((ec: any) => ({
              collaboratorId: ec.collaboratorId,
              role: ec.role,
              collaborator: ec.collaborator
                ? {
                    id: ec.collaborator.id,
                    name: ec.collaborator.user?.name || ec.collaborator.name,
                    email: ec.collaborator.user?.email || ec.collaborator.email,
                    avatar: ec.collaborator.user?.avatarUrl || ec.collaborator.avatar,
                  }
                : undefined,
            }))
          : undefined;

        return {
          id: booking.id,
          eventDate: booking.eventDate,
          eventEndDate: booking.eventEndDate,
          duration: durationHours,
          status: booking.status,
          deliveryStatus: booking.deliveryStatus,
          client,
          venue,
          equipments,
          kits,
          collaborators,
          internalNotes: booking.notes,
          serviceValue: booking.serviceValue,
          totalPrice: booking.totalPrice,
        };
      });
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao buscar calendário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca estatísticas do dashboard
   */
  async getDashboardStats(): Promise<any> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [
        totalBookings,
        pendingBookings,
        confirmedBookings,
        monthlyBookings,
        monthlyRevenue
      ] = await Promise.all([
        this.prisma.booking.count(),
        this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
        this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
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
            status: { not: BookingStatus.CANCELLED }
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
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao buscar estatísticas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Vincula orçamentos manuais a um usuário recém-registrado
   */
  async linkBookingsToUser(userId: string, email: string, bookingId?: string): Promise<void> {
    try {
      let client = await this.prisma.client.findUnique({ where: { userId } });
      if (!client) {
        client = await this.prisma.client.create({
          data: { userId }
        });
      }

      await this.prisma.booking.updateMany({
        where: {
          OR: [
            { clientEmail: email, clientId: null },
            { id: bookingId, clientId: null }
          ]
        },
        data: {
          clientId: client.id
        }
      });
      
      logger.info({ userId, email, bookingId }, "Orçamentos vinculados ao usuário com sucesso");
    } catch (error) {
      logger.error({ error, userId, email }, "Erro ao vincular orçamentos ao usuário");
    }
  }

  /**
   * Crie uma nova tarefa para a reserva
   */
  async createBookingTask(bookingId: string, data: { title: string; description?: string }) {
    return await this.prisma.bookingTask.create({
      data: {
        bookingId,
        title: data.title,
        description: data.description,
      }
    });
  }

  /**
   * Alterna o status de conclusão de uma tarefa
   */
  async toggleTaskStatus(taskId: string, isCompleted: boolean) {
    return await this.prisma.bookingTask.update({
      where: { id: taskId },
      data: { 
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });
  }

  /**
   * Registra uma nova despesa para a reserva
   */
  async createBookingExpense(data: { 
    bookingId: string; 
    collaboratorId: string; 
    amount: number; 
    description: string; 
    receiptUrl?: string 
  }) {
    return await this.prisma.bookingExpense.create({
      data: {
        bookingId: data.bookingId,
        collaboratorId: data.collaboratorId,
        amount: data.amount,
        description: data.description,
        receiptUrl: data.receiptUrl,
        status: 'PENDING'
      }
    });
  }

  /**
   * Retorna os dados completos para o Roadmap do Evento (Crew Experience)
   */
  async getEventRoadmap(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
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
                }
              }
            },
            function: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' as const }
        },
        expenses: {
          include: {
            collaborator: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!booking) throw new BookingNotFoundError();
    return booking;
  }
}
