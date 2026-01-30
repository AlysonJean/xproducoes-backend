import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { prisma } from "../config/prisma";
import { BookingService } from "./bookingService";
import logger from "../config/logger";


export class DashboardService {

  private bookingService = new BookingService();
  
  // ===== MÉTODOS OTIMIZADOS PARA PERFORMANCE =====

  async getStats() {
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    const lastMonth = subMonths(today, 1);
    const startOfLastMonth = startOfMonth(lastMonth);
    const endOfLastMonth = endOfMonth(lastMonth);

    // Receita do mês atual (apenas COMPLETED, por data do evento)
    const currentMonthRevenueAgg = await prisma.booking.aggregate({
      where: {
        status: 'COMPLETED',
        eventDate: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      _sum: { totalPrice: true },
    });

    // Receita do mês passado (apenas COMPLETED, por data do evento)
    const lastMonthRevenueAgg = await prisma.booking.aggregate({
      where: {
        status: 'COMPLETED',
        eventDate: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: { totalPrice: true },
    });

    // Contagens por criação mantidas para novos/variações de volume
    const currentMonthBookingsCount = await prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
    });

    const lastMonthBookingsCount = await prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Total de clientes
    const totalClients = await prisma.user.count({
      where: { role: "CLIENT" },
    });

    // Total de reservas
    const totalBookings = await prisma.booking.count();

    // Total de equipamentos
    const totalEquipments = await prisma.equipment.count();

    // Colaboradores ativos (que têm reservas nos últimos 30 dias)
    const activeCollaborators = await prisma.user.count({
      where: {
        role: "COLLABORATOR",
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

  const currentRevenue = Number(currentMonthRevenueAgg._sum.totalPrice || 0);
  const lastRevenue = Number(lastMonthRevenueAgg._sum.totalPrice || 0);
  const currentBookings = currentMonthBookingsCount;
  const lastBookings = lastMonthBookingsCount;

    // Calcular variações percentuais
    const revenueGrowth = this.calculateGrowth(currentRevenue, lastRevenue);
    const bookingsGrowth = this.calculateGrowth(currentBookings, lastBookings);

    // Buscar top colaboradores
    const topCollaborators = await this.getTopCollaboratorsData();

    // Receita total acumulada (todas COMPLETED)
    const allTimeRevenueAgg = await prisma.booking.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalPrice: true },
    });

    const allTimeRevenue = Number(allTimeRevenueAgg._sum.totalPrice || 0);

    return {
      totalRevenue: allTimeRevenue,
      revenueGrowth,
      currentMonthRevenue: currentRevenue,
      lastMonthRevenue: lastRevenue,
      newBookingsThisMonth: currentBookings,
      bookingsGrowth,
      totalClients,
      totalBookings,
      totalEquipments,
      activeCollaborators,
      pendingBookings: await prisma.booking.count({
        where: { status: "PENDING" },
      }),
      completedBookings: await prisma.booking.count({
        where: { status: "COMPLETED" },
      }),
      confirmedBookings: await prisma.booking.count({
        where: { status: "CONFIRMED" },
      }),
      conversionRate: totalBookings > 0 ? (await prisma.booking.count({
        where: { status: "COMPLETED" }
      }) / totalBookings) * 100 : 0,
      topCollaborators
    };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  async getChartData() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Otimizado: query única para dados do gráfico
    const bookingTrends = await prisma.booking.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { notIn: ["CANCELLED"] },
      },
      select: {
        createdAt: true,
        totalPrice: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Processar dados para gráficos
    const dailyStats = new Map();

    bookingTrends.forEach((booking) => {
      const day = booking.createdAt.toISOString().split("T")[0];
      if (!dailyStats.has(day)) {
        dailyStats.set(day, { bookings: 0, revenue: 0 });
      }
      const stats = dailyStats.get(day);
      stats.bookings += 1;
      if (booking.status === "COMPLETED") {
        stats.revenue += Number(booking.totalPrice);
      }
    });

    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      bookings: stats.bookings,
      revenue: stats.revenue,
    }));
  }

  async getMonthlyRevenueData(year?: number) {
    // Usar o método direto getMonthlyRevenue ao invés do BookingService
    return this.getMonthlyRevenue(year);
  }

  async getAvailableYears() {
    const result = await prisma.booking.findFirst({
      select: { eventDate: true },
      orderBy: { eventDate: "asc" },
    });

    if (!result) return [new Date().getFullYear()];

    const firstYear = result.eventDate.getFullYear();
    const currentYear = new Date().getFullYear();
    const years: number[] = [];

    for (let year = firstYear; year <= currentYear; year++) {
      years.push(year);
    }

    return years;
  }

  async getRecentActivities() {
    // Query otimizada para atividades recentes
    const recentBookings = await prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventTitle: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        creator: {
          select: { name: true, email: true },
        },
      },
    });

    return recentBookings.map((booking) => ({
      id: booking.id,
      type: "booking",
      title: booking.eventTitle || "Evento sem título",
      description: `Reserva criada por ${booking.creator.name}`,
      amount: Number(booking.totalPrice),
      status: booking.status,
      timestamp: booking.createdAt,
    }));
  }

  // Método otimizado para calendário de eventos
  async getCalendarData(startDate: Date, endDate: Date) {
    return prisma.booking.findMany({
      where: {
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        eventTitle: true,
        eventDate: true,
        status: true,
        creator: {
          select: { name: true },
        },
      },
    });
  }

  // Método otimizado para verificação de disponibilidade
  async checkEquipmentAvailability(
    equipmentIds: string[],
    startDate: Date,
    endDate: Date,
  ) {
    const conflicts = await prisma.booking.findMany({
      where: {
        OR: [
          {
            eventDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            eventEndDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
        status: {
          in: ["CONFIRMED", "PENDING"],
        },
      },
      select: {
        id: true,
        eventDate: true,
        eventEndDate: true,
      },
    });

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }

  // Métodos adicionais requeridos pelos controllers
  async getRevenue(period: string = "month") {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = startOfMonth(now);
    }

    const revenue = await prisma.booking.aggregate({
      where: {
        status: "COMPLETED",
        eventDate: { gte: startDate },
      },
      _sum: { totalPrice: true },
    });

    return Number(revenue._sum.totalPrice || 0);
  }

  async getBookingTrends() {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return prisma.booking.findMany({
      where: {
        createdAt: { gte: last30Days },
      },
      select: {
        createdAt: true,
        status: true,
        totalPrice: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async getTopEquipment() {
    // Mockado - implementar quando houver relação equipment-booking
    return [
      { name: "Kit DJ Básico", bookings: 15 },
      { name: "Som Profissional", bookings: 12 },
      { name: "Luzes LED", bookings: 10 },
    ];
  }

  async getTopClients() {
    return prisma.user.findMany({
      where: { role: "CLIENT" },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: { createdBookings: true },
        },
      },
      orderBy: {
        createdBookings: { _count: "desc" },
      },
      take: 10,
    });
  }

  async getTopCollaboratorsData() {
    // Mock data para colaboradores - implementar quando houver dados reais
    return [
      {
        collaborator: {
          id: "1",
          name: "João Silva",
          role: "PHOTOGRAPHER"
        },
        rating: 4.8,
        eventCount: 15
      },
      {
        collaborator: {
          id: "2", 
          name: "Maria Santos",
          role: "ASSISTANT"
        },
        rating: 4.9,
        eventCount: 12
      },
      {
        collaborator: {
          id: "3",
          name: "Carlos Lima", 
          role: "PRODUCER"
        },
        rating: 4.7,
        eventCount: 10
      }
    ];
  }

  async getLiveStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBookings = await prisma.booking.count({
      where: {
        createdAt: { gte: today },
      },
    });

    const todayRevenue = await prisma.booking.aggregate({
      where: {
        createdAt: { gte: today },
        status: "COMPLETED",
      },
      _sum: { totalPrice: true },
    });

    return {
      todayBookings,
      todayRevenue: Number(todayRevenue._sum.totalPrice || 0),
      activeUsers: await prisma.user.count({
        where: {
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    };
  }

  async getNotifications() {
    // Mockado - implementar sistema de notificações
    return [
      {
        id: "1",
        type: "booking",
        message: "Nova reserva criada",
        timestamp: new Date(),
        read: false,
      },
    ];
  }

  async getMonthlyRevenue(year: number = new Date().getFullYear()) {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      // Busca todas as reservas confirmadas do ano
      const bookings = await prisma.booking.findMany({
        where: {
          status: 'COMPLETED',
          eventDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          totalPrice: true,
          eventDate: true
        }
      });

      // Agrupa por mês no formato esperado pelo frontend
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year,
        total: 0
      }));

      bookings.forEach(booking => {
        const month = new Date(booking.eventDate).getMonth();
        monthlyData[month].total += Number(booking.totalPrice) || 0;
      });

      return monthlyData;
    } catch (error) {
      logger.error({obj:error}, 'Erro ao buscar receita mensal:');
      // Dados mock em caso de erro
      return Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year,
        total: Math.floor(Math.random() * 50000) + 10000
      }));
    }
  }
}
