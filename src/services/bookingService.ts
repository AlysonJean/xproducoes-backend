import { Prisma, BookingStatus, DeliveryStatus } from "@prisma/client";
import { BookingCreateInput, BookingUpdateInput, BookingFilters } from "../validators/bookingSchema";
import { 
  BookingValidationError, 
  BookingNotFoundError
} from "../utils/bookingErrors";
import logger from "../config/logger";
import { prisma } from "../config/prisma";

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
        isAvailable: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }
    ,
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

  /**
   * Cria uma nova reserva
   */
  async createBooking(data: BookingCreateInput, creatorId: string, idempotencyKey?: string): Promise<any> {
    try {
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

      // Buscar o usuário criador
      const creator = await this.prisma.user.findUnique({
        where: { id: creatorId }
      });

      if (!creator) {
        throw new BookingValidationError("Usuário criador não encontrado");
      }

      // Calcular preço total
      let totalPrice = data.totalPrice || 0;
      if (!totalPrice) {
        if (data.kitId) {
          const kit = await this.prisma.kit.findUnique({
            where: { id: data.kitId }
          });
          totalPrice = kit?.price ? Number(kit.price) : 0;
        } else if (data.equipmentIds && data.equipmentIds.length > 0) {
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
      } else if (!clientId && data.clientName && data.clientContact) {
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

      // Criar a reserva com suporte a idempotência usando coluna dedicada.
      // Tentamos criar com idempotencyKey quando fornecida. Em caso de
      // violação de unicidade (P2002), buscamos o registro existente e o retornamos.
  const createData: any = {
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
        // Campos admin-only
        serviceValue: data.serviceValue,
        paymentProofUrl: data.paymentProofUrl,
        equipments: data.equipmentIds ? {
          connect: data.equipmentIds.map(id => ({ id }))
        } : undefined
      };

      let booking: any;
      try {
        booking = await this.prisma.booking.create({
          data: createData,
          include: this.bookingInclude
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
      return booking;

    } catch (error) {
      logger.error("Error creating booking: " + String(error));
      if (error instanceof BookingValidationError) {
        // Garante que só o erro customizado é lançado
        throw error;
      }
      // Se o erro for "Cannot read properties of undefined (reading 'id')" e a mensagem original for de cliente não encontrado, relança BookingValidationError
      if (
        error instanceof Error &&
        error.message &&
        error.message.includes("Cannot read properties of undefined")
      ) {
        throw new BookingValidationError("É necessário identificar um cliente para a reserva");
      }
      throw new Error(`Erro interno ao criar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca uma reserva por ID
   */
  async getBookingById(id: string): Promise<any> {
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
      throw new Error(`Erro ao buscar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      throw new Error(`Erro ao buscar reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      throw new Error(`Erro ao contar reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca reservas por cliente
   */
  async getBookingsByClient(clientId: string): Promise<any[]> {
    try {
      return await this.getAllBookings({ clientId });
    } catch (error) {
      throw new Error(`Erro ao buscar reservas do cliente: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Atualiza uma reserva
   */
  async updateBooking(id: string, data: BookingUpdateInput): Promise<any> {
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

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: updateData,
        include: this.bookingInclude
      });

      logger.info(`Booking updated successfully: ${id}`);
      return updatedBooking;

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new Error(`Erro ao atualizar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      return updatedBooking;

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new Error(`Erro ao atualizar status da reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      return updatedBooking;

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new Error(`Erro ao atualizar status de entrega: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Deleta uma reserva
   */
  async deleteBooking(id: string): Promise<void> {
    try {
      // Valida se a reserva existe
      await this.getBookingById(id);

      await this.prisma.booking.delete({
        where: { id }
      });

      logger.info(`Booking deleted: ${id}`);

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new Error(`Erro ao deletar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
   * Confirma reserva com detalhes: define totalPrice e atribui colaboradores (event_collaborators)
   */
  async confirmWithDetails(id: string, details: { totalPrice?: number; collaborators?: Array<any> }): Promise<any> {
    try {
      // Valida se a reserva existe
      await this.getBookingById(id);

      const data: any = { status: BookingStatus.CONFIRMED };
      if (details.totalPrice !== undefined) data.totalPrice = details.totalPrice;

      // Se colaboradores forem passados, criar eventCollaborator entries primeiro
      if (details.collaborators && Array.isArray(details.collaborators) && details.collaborators.length > 0) {
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
          } catch (e) {
            // Não bloquear toda operação se uma atribuição falhar
            logger.warn({ error: e }, 'Falha ao atribuir colaborador');
          }
        }
      }

      // Atualiza reserva com preço e status por último
      const updatedBooking = await this.prisma.booking.update({ where: { id }, data, include: this.bookingInclude });

      // Disparar notificações: email para o cliente e webhook externo (se configurado)
      try {
        const EmailService = (await import('./emailService')).default;
        const clientEmail = updatedBooking.client?.user?.email || updatedBooking.clientEmail || (updatedBooking as any).clientContact;
        const clientName = updatedBooking.client?.user?.name || updatedBooking.clientName || '';
        if (clientEmail) {
          await EmailService.sendBookingConfirmation({ email: clientEmail, name: clientName }, updatedBooking);
        }
      } catch (e) {
        logger.warn({ error: e }, 'Erro ao enviar email de confirmação');
      }

      // Webhook: delegate to WebhookService for dispatching & persistence
      try {
        const WebhookService = (await import('./webhookService')).default;
        void WebhookService.dispatchBookingConfirmed(updatedBooking);
      } catch (e) {
        logger.warn({ error: e }, 'Erro ao disparar webhook de confirmação (delegado)');
      }

      return updatedBooking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancela uma reserva
   */
  async cancel(id: string, reason?: string): Promise<any> {
    try {
      const booking = await this.getBookingById(id);

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: { 
          status: BookingStatus.CANCELLED,
          notes: reason ? `${booking.notes || ""}\n\nMotivo do cancelamento: ${reason}` : booking.notes
        },
        include: this.bookingInclude
      });

      logger.info(`Booking cancelled: ${id}`);
      return updatedBooking;

    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        throw error;
      }
      throw new Error(`Erro ao cancelar reserva: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      throw new Error(`Erro ao buscar próximas reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      throw new Error(`Erro ao buscar histórico de reservas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Busca eventos do calendário
   */
  async getCalendar(month?: number, year?: number): Promise<any[]> {
    try {
      // Se mês e ano forem fornecidos, filtra por período
      // Caso contrário, busca todas as reservas
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
        // Para o calendário, precisamos de dados mais ricos (client name/phone, equipamentos, kit e colaboradores)
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

      // Normalizamos a resposta para o formato esperado no frontend (CalendarBooking)
      return bookings.map((booking: any) => {
        const eventDate = booking.eventDate;
        const eventEndDate = booking.eventEndDate;
        const durationHours = eventDate && eventEndDate
          ? Math.max(1, Math.round((new Date(eventEndDate).getTime() - new Date(eventDate).getTime()) / 3600000))
          : (booking.eventDuration || 4);

        // Client simplificado
        const client = booking.client
          ? {
              name: booking.client.user?.name || booking.clientName || undefined,
              phone: booking.client.phone || booking.clientContact || undefined,
            }
          : (booking.clientName || booking.clientContact
              ? { name: booking.clientName, phone: booking.clientContact }
              : undefined);

        // Venue normalizado
        const venue = (booking.street || booking.city || booking.zipCode)
          ? {
              street: booking.street || undefined,
              city: booking.city || undefined,
              postalCode: booking.zipCode || undefined,
            }
          : undefined;

        // Equipamentos já vêm como array simples pelo include
        const equipments = Array.isArray(booking.equipments) ? booking.equipments : [];

        // Mapear kit singular para array kits
        const kits = booking.kit ? [booking.kit] : [];

        // Colaboradores do evento (se existirem)
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
          // Campos esperados pelo frontend
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
          // Campos adicionais úteis ao tooltip
          serviceValue: booking.serviceValue,
          totalPrice: booking.totalPrice,
        };
      });
    } catch (error) {
      throw new Error(`Erro ao buscar calendário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      throw new Error(`Erro ao buscar estatísticas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }
}
