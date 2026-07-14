import { Prisma, BookingStatus, DeliveryStatus } from "@prisma/client";
import { BookingCreateInput, BookingUpdateInput, BookingFilters } from "../../validators/bookingSchema.js";
import {
  BookingValidationError,
  BookingNotFoundError,
  BookingBusinessLogicError
} from "../../utils/bookingErrors.js";
import logger from "../../config/logger.js";
import { prisma } from "../../config/prisma.js";
import { generateSemanticBookingId } from "../../utils/bookingIdGenerator.js";
import { cacheService } from "../cacheService.js";
import { bookingIncludeConfig, BookingUpdateExtras } from "./bookingShared.js";

// CRUD de reservas: criar, buscar (por id/lista/filtros/cliente), atualizar, deletar, e
// vincular orçamentos manuais a um usuário recém-registrado. Extraído de bookingService.ts
// (antes uma única classe de 1351 linhas/25 métodos) na decomposição em 6 services menores.
export class BookingCrudService {
  private prisma = prisma;

  // Configuração de includes para queries otimizadas (ver bookingShared.ts)
  private readonly bookingInclude = bookingIncludeConfig;

  /**
   * Cria uma nova reserva
   */
  async createBooking(data: BookingCreateInput, creatorId: string, idempotencyKey?: string) {
    try {
      // BACK-003: Check idempotency key first to avoid duplicate work
      if (idempotencyKey) {
        const existing = await this.prisma.booking.findFirst({
          where: { idempotencyKey },
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
        data.serviceIds?.length ? this.prisma.service.findMany({ where: { id: { in: data.serviceIds } } }) : [],
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
        const equipmentsPrice = equipments.reduce((sum, eq) => sum + Number(eq.pricePerHour), 0) * duration;
        const servicesPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
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

      const createData: Prisma.BookingUncheckedCreateInput = {
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
        setupTime: data.setupTime ? new Date(data.setupTime) : undefined,
        pickupTime: data.pickupTime ? new Date(data.pickupTime) : undefined,
        items: data.items ? {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            itemType: item.itemType,
            equipmentId: item.equipmentId,
            serviceId: item.serviceId,
            kitId: item.kitId
          }))
        } : undefined,
        equipments: data.equipmentIds ? {
          connect: data.equipmentIds.map((id: string) => ({ id }))
        } : undefined,
        services: data.serviceIds ? {
          connect: data.serviceIds.map((id: string) => ({ id }))
        } : undefined
      };

      // BACK-001: Wrap booking creation in a transaction
      let booking;
      try {
        booking = await this.prisma.$transaction(async (tx) => {
          return tx.booking.create({
            data: createData,
            include: this.bookingInclude
          });
        });
      } catch (err: unknown) {
        // Prisma: código P2002 -> violação de unicidade
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && idempotencyKey) {
          logger.info(`Idempotency unique constraint hit for key ${idempotencyKey}, fetching existing record`);
          const existing = await this.prisma.booking.findFirst({
            where: { idempotencyKey },
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
  async getBookingById(id: string) {
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
      };

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
  async getAllBookings(filters: BookingFilters = {}) {
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
  async getBookingsByClient(clientId: string) {
    try {
      return await this.getAllBookings({ clientId });
    } catch (error) {
      throw new BookingBusinessLogicError(`Erro ao buscar reservas do cliente: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Atualiza uma reserva
   */
  async updateBooking(id: string, data: BookingUpdateInput & BookingUpdateExtras) {
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
      if (data.serviceValue !== undefined) updateData.serviceValue = data.serviceValue;
      if (data.paymentProofUrl !== undefined) updateData.paymentProofUrl = data.paymentProofUrl;

      // Crew Experience fields
      if (data.technicalRider !== undefined) updateData.technicalRider = data.technicalRider;
      if (data.technicalRiderUrl !== undefined) updateData.technicalRiderUrl = data.technicalRiderUrl;
      if (data.locationUrl !== undefined) updateData.locationUrl = data.locationUrl;
      if (data.venueContactName !== undefined) updateData.venueContactName = data.venueContactName;
      if (data.venueContactPhone !== undefined) updateData.venueContactPhone = data.venueContactPhone;

      // Atualizar itens (substituição total para simplicidade no orçamento)
      if (data.items) {
        // Primeiro remove os antigos
        await this.prisma.bookingItem.deleteMany({ where: { bookingId: id } });
        // Cria os novos
        updateData.items = {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            itemType: item.itemType,
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
}

export const bookingCrudService = new BookingCrudService();
