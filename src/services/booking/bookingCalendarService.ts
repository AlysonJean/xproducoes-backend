import { BookingStatus } from "@prisma/client";
import { BookingBusinessLogicError } from "../../utils/bookingErrors.js";
import logger from "../../config/logger.js";
import { prisma } from "../../config/prisma.js";
import { googleCalendarService } from "../googleCalendarService.js";
import { bookingIncludeConfig, BookingWithIncludes } from "./bookingShared.js";

// Calendário/agenda de reservas: sync com Google Calendar, visão de calendário (admin),
// próximas reservas e histórico (cliente). Extraído de bookingService.ts (antes uma única
// classe de 1351 linhas/25 métodos) na decomposição em 6 services menores.
export class BookingCalendarService {
  private prisma = prisma;
  private readonly bookingInclude = bookingIncludeConfig;

  /**
   * Sincroniza reserva com Google Calendar (Admin principal)
   */
  async syncGoogleCalendar(booking: BookingWithIncludes) {
    try {
      // Nota: `creator` (via bookingInclude) não seleciona googleRefreshToken (evita expor o
      // token OAuth cifrado em qualquer resposta que reutilize este include) - a checagem real
      // de conexão com o Google Calendar é feita dentro de googleCalendarService.createEvent,
      // que busca o próprio usuário e faz no-op silencioso (com log) se não houver token.
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
   * Busca reservas próximas de um cliente
   */
  async getUpcoming(clientId: string) {
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
  async getHistory(clientId: string) {
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
  async getCalendar(month?: number, year?: number) {
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

      return bookings.map((booking) => {
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
          ? booking.eventCollaborators.map((ec) => ({
              collaboratorId: ec.collaboratorId,
              role: ec.role,
              collaborator: ec.collaborator
                ? {
                    // Nota: Collaborator não tem name/email/avatar próprios no schema (só via User)
                    id: ec.collaborator.id,
                    name: ec.collaborator.user?.name,
                    email: ec.collaborator.user?.email,
                    avatar: ec.collaborator.user?.avatarUrl,
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
}

export const bookingCalendarService = new BookingCalendarService();
