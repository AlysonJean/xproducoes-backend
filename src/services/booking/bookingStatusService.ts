import { Prisma, BookingStatus, DeliveryStatus, CollaboratorRole } from "@prisma/client";
import { BookingNotFoundError, BookingBusinessLogicError, BookingConflictError } from "../../utils/bookingErrors.js";
import logger from "../../config/logger.js";
import { prisma } from "../../config/prisma.js";
import { cacheService } from "../cacheService.js";
import { whatsappService } from "../whatsappService.js";
import { googleCalendarService } from "../googleCalendarService.js";
import { bookingIncludeConfig, BookingWithIncludes } from "./bookingShared.js";
import { bookingCrudService } from "./bookingCrudService.js";
import { bookingCalendarService } from "./bookingCalendarService.js";
import { createNotification } from "../notificationService.js";
import { getOrCreateEventChat } from "../chatService.js";

export interface ConfirmCollaboratorInput {
  collaboratorId: string;
  role?: CollaboratorRole;
  functionId?: string;
  startTime?: string;
  endTime?: string;
  fixedRate?: number;
}

// Transições de status de reservas: confirmar, cancelar, atualizar status de entrega, e os
// efeitos colaterais de uma confirmação (sync de calendário, notificações por email/WhatsApp,
// chat operacional do evento). Extraído de bookingService.ts (antes uma única classe de 1351
// linhas/25 métodos) na decomposição em 6 services menores. Depende de bookingCrudService
// (validar existência da reserva) e bookingCalendarService (sync com Google Calendar).
export class BookingStatusService {
  private prisma = prisma;
  private readonly bookingInclude = bookingIncludeConfig;

  /**
   * Atualiza o status de uma reserva
   */
  async updateBookingStatus(id: string, status: BookingStatus) {
    try {
      // Valida se a reserva existe
      const existingBooking = await bookingCrudService.getBookingById(id);

      // Checagem de conflito de agenda: só no momento de CONFIRMAR (reservas PENDING
      // concorrendo pelo mesmo equipamento são normais — a equipe decide na confirmação).
      if (status === BookingStatus.CONFIRMED) {
        const equipmentIds = (existingBooking.equipments ?? []).map((e) => e.id);
        const conflicts = await bookingCrudService.checkEquipmentConflicts(
          id,
          equipmentIds,
          existingBooking.kitId,
          existingBooking.eventDate,
          existingBooking.eventEndDate
        );
        if (conflicts.length > 0) {
          const details = conflicts
            .map((c) => `"${c.eventTitle || c.id}" em ${new Date(c.eventDate).toLocaleDateString('pt-BR')}`)
            .join(', ');
          throw new BookingConflictError(
            `Não é possível confirmar: equipamento(s) já reservado(s) para outro evento confirmado no mesmo período: ${details}`
          );
        }
      }

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
        void bookingCalendarService.syncGoogleCalendar(updatedBooking);

        // Enviar email de confirmação
        try {
          const EmailService = (await import('../emailService.js')).default;
          const clientUser = updatedBooking.client?.user;
          const clientEmail = clientUser?.email || updatedBooking.clientEmail || updatedBooking.clientContact;
          const clientName = clientUser?.name || updatedBooking.clientName || '';

          if (clientEmail) {
            void EmailService.sendBookingApproved({ name: clientName, email: clientEmail }, updatedBooking);
          }
        } catch (e: unknown) {
          logger.warn({ error: e }, 'Erro ao enviar email de aprovação via updateBookingStatus');
        }

        // WhatsApp Notification
        void whatsappService.sendBookingConfirmation(updatedBooking).catch((e: unknown) => {
            logger.warn({ error: e }, 'Erro ao enviar notificação WhatsApp');
        });

        // Achado (auditoria de produto): sino de notificação nunca recebia dado nenhum —
        // avisa o cliente dentro da própria plataforma, além do e-mail/WhatsApp.
        void createNotification({
          userId: updatedBooking.creatorId,
          type: "BOOKING_UPDATED",
          title: "Reserva confirmada!",
          message: `Sua reserva${updatedBooking.eventTitle ? ` para "${updatedBooking.eventTitle}"` : ""} foi confirmada.`,
          actionUrl: `/cliente/reservas/${updatedBooking.id}`,
        });

        // Notify Collaborators (WhatsApp + Google Calendar)
        void this.notifyCollaborators(updatedBooking).catch((e: unknown) => {
            logger.warn({ error: e }, 'Erro ao notificar colaboradores');
        });

        // Sync Admin Calendars (Master Agenda)
        void this.syncAdminCalendars(updatedBooking).catch((e: unknown) => {
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
   * Sincroniza chat operacional do evento (garante cliente + colaboradores + admins como participantes)
   */
  private async syncEventChat(bookingId: string) {
    try {
      await getOrCreateEventChat(bookingId);
    } catch (error) {
      logger.error('Erro ao sincronizar chat do evento', error);
    }
  }

  /**
   * Atualiza o status de entrega de uma reserva
   */
  async updateDeliveryStatus(id: string, deliveryStatus: DeliveryStatus) {
    try {
      // Valida se a reserva existe
      await bookingCrudService.getBookingById(id);

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
   * Confirma uma reserva
   */
  async confirm(id: string) {
    return await this.updateBookingStatus(id, BookingStatus.CONFIRMED);
  }

  /**
   * Confirma uma reserva com detalhes (atribuição de equipe e ajuste de valor)
   */
  async confirmWithDetails(id: string, data: { totalPrice?: number; collaborators?: ConfirmCollaboratorInput[] }) {
    try {
      // Atualizar a reserva com novo valor e status
      const updateData: Prisma.BookingUncheckedUpdateInput = { status: BookingStatus.CONFIRMED };
      if (data.totalPrice) updateData.totalPrice = data.totalPrice;

      if (data.collaborators && data.collaborators.length > 0) {
        updateData.eventCollaborators = {
           deleteMany: {}, // Limpa anteriores para novo set
           create: data.collaborators.map((c) => ({
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
  async cancel(id: string, reason?: string) {
    try {
      await bookingCrudService.getBookingById(id);

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
   * Notifica colaboradores escalados
   */
  private async notifyCollaborators(booking: BookingWithIncludes) {
    try {
      const collabs = await this.prisma.eventCollaborator.findMany({
        where: { bookingId: booking.id },
        include: { collaborator: { include: { user: true } } }
      });

      for (const ec of collabs) {
        // Nota: User não tem campo phone no schema (só Collaborator) - só existe uma fonte real de telefone aqui
        const phone = ec.collaborator.phone;
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
  private async syncAdminCalendars(booking: BookingWithIncludes) {
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
            location: booking.location || '',
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
}

export const bookingStatusService = new BookingStatusService();
