import { BookingStatus } from "@prisma/client";
import { BookingBusinessLogicError } from "../../utils/bookingErrors.js";
import { prisma } from "../../config/prisma.js";

// Relatórios e estatísticas de reservas: receita mensal e resumo do dashboard. Extraído de
// bookingService.ts (antes uma única classe de 1351 linhas/25 métodos) na decomposição em 6
// services menores.
export class BookingReportingService {
  private prisma = prisma;

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

  /**
   * Busca estatísticas do dashboard
   */
  async getDashboardStats() {
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
}

export const bookingReportingService = new BookingReportingService();
