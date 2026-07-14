// Testes de caracterização — capturam o comportamento REAL e atual das estatísticas do
// dashboard, como rede de segurança da decomposição de bookingService.ts (1351 linhas/25
// métodos) em 6 services menores. Cobre BookingReportingService: getDashboardStats.

import { BookingReportingService } from "../../services/booking/bookingReportingService";

describe("BookingReportingService — testes de caracterização", () => {
  let service: BookingReportingService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      booking: { count: jest.fn(), aggregate: jest.fn() },
    };
    service = new BookingReportingService();
    // @ts-expect-error - prisma é private em BookingReportingService; injeção só para teste
    service.prisma = mockPrisma;
  });

  describe("getDashboardStats", () => {
    it("agrega contagens e receita mensal num único objeto", async () => {
      mockPrisma.booking.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(20) // confirmed
        .mockResolvedValueOnce(5); // monthly
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { totalPrice: 4500 } });

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalBookings: 100,
        pendingBookings: 10,
        confirmedBookings: 20,
        monthlyBookings: 5,
        monthlyRevenue: 4500,
      });
    });

    it("usa 0 quando a agregação de receita vem nula", async () => {
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { totalPrice: null } });

      const result = await service.getDashboardStats();
      expect(result.monthlyRevenue).toBe(0);
    });
  });
});
