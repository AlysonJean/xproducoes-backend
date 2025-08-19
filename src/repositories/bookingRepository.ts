import { Prisma, BookingStatus, DeliveryStatus } from "@prisma/client";
import { BookingFilters } from "../validators/bookingSchema";
import { prisma } from "../config/prisma";

export class BookingRepository {
  private prisma = prisma;

  // Configuração de includes padrão
  private readonly defaultInclude = {
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
    }
  };

  async create(data: Prisma.BookingCreateInput) {
    return await this.prisma.booking.create({
      data,
      include: this.defaultInclude
    });
  }

  async findById(id: string) {
    return await this.prisma.booking.findUnique({
      where: { id },
      include: this.defaultInclude
    });
  }

  async findMany(filters: BookingFilters = {}) {
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

    return await this.prisma.booking.findMany({
      where,
      include: this.defaultInclude,
      orderBy: { eventDate: "asc" }
    });
  }

  async findByClient(clientId: string) {
    return await this.findMany({ clientId });
  }

  async update(id: string, data: Prisma.BookingUpdateInput) {
    return await this.prisma.booking.update({
      where: { id },
      data,
      include: this.defaultInclude
    });
  }

  async delete(id: string) {
    return await this.prisma.booking.delete({
      where: { id }
    });
  }

  async findUpcoming(clientId: string, limit = 10) {
    const now = new Date();
    return await this.prisma.booking.findMany({
      where: {
        clientId,
        eventDate: { gte: now },
        status: { not: BookingStatus.CANCELLED }
      },
      include: this.defaultInclude,
      orderBy: { eventDate: "asc" },
      take: limit
    });
  }

  async findHistory(clientId: string, limit = 50) {
    const now = new Date();
    return await this.prisma.booking.findMany({
      where: {
        clientId,
        OR: [
          { eventDate: { lt: now } },
          { status: { in: [BookingStatus.COMPLETED, BookingStatus.CANCELLED] } }
        ]
      },
      include: this.defaultInclude,
      orderBy: { eventDate: "desc" },
      take: limit
    });
  }

  async findCalendarEvents(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return await this.prisma.booking.findMany({
      where: {
        eventDate: {
          gte: startDate,
          lte: endDate
        },
        status: { not: BookingStatus.CANCELLED }
      },
      include: this.defaultInclude,
      orderBy: { eventDate: "asc" }
    });
  }

  async getDashboardStats() {
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
  }

  async checkConflicts(eventDate: Date, eventEndDate: Date, equipmentIds?: string[], kitId?: string, excludeBookingId?: string) {
    const conditions: Prisma.BookingWhereInput[] = [
      // Verificar sobreposição de datas
      {
        OR: [
          // Evento existente começa durante o novo evento
          {
            eventDate: {
              gte: eventDate,
              lt: eventEndDate
            }
          },
          // Evento existente termina durante o novo evento
          {
            eventEndDate: {
              gt: eventDate,
              lte: eventEndDate
            }
          },
          // Novo evento está completamente dentro do evento existente
          {
            AND: [
              { eventDate: { lte: eventDate } },
              { eventEndDate: { gte: eventEndDate } }
            ]
          }
        ]
      },
      // Excluir status cancelados
      {
        status: { not: BookingStatus.CANCELLED }
      }
    ];

    // Excluir a própria reserva em caso de atualização
    if (excludeBookingId) {
      conditions.push({ id: { not: excludeBookingId } });
    }

    // Verificar conflitos de kit
    if (kitId) {
      conditions.push({ kitId });
    }

    // Verificar conflitos de equipamentos
    if (equipmentIds && equipmentIds.length > 0) {
      conditions.push({
        equipments: {
          some: {
            id: { in: equipmentIds }
          }
        }
      });
    }

    return await this.prisma.booking.findFirst({
      where: { AND: conditions },
      select: {
        id: true,
        eventDate: true,
        eventEndDate: true,
        kit: { select: { name: true } },
        equipments: { select: { name: true } }
      }
    });
  }
}
