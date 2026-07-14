// Testes de caracterização — capturam o comportamento REAL e atual das consultas de
// calendário/agenda de reservas, como rede de segurança da decomposição de bookingService.ts
// (1351 linhas/25 métodos) em 6 services menores. Cobre BookingCalendarService: getUpcoming,
// getHistory, getCalendar.

import { BookingStatus } from "@prisma/client";
import { BookingCalendarService } from "../../services/booking/bookingCalendarService";

describe("BookingCalendarService — testes de caracterização", () => {
  let service: BookingCalendarService;
  let mockPrisma: any;

  const baseBooking = {
    id: "b1",
    status: BookingStatus.PENDING,
    eventTitle: "Festa",
    eventDate: new Date("2027-01-10T18:00:00Z"),
    eventEndDate: new Date("2027-01-10T22:00:00Z"),
    clientId: "cli1",
    clientName: "Cliente Teste",
    clientContact: "31999999999",
    totalPrice: 500,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      booking: { findMany: jest.fn() },
    };
    service = new BookingCalendarService();
    // @ts-expect-error - prisma é private em BookingCalendarService; injeção só para teste
    service.prisma = mockPrisma;
  });

  describe("getUpcoming / getHistory", () => {
    it("getUpcoming busca reservas futuras não canceladas, limitadas a 10", async () => {
      mockPrisma.booking.findMany.mockResolvedValue([baseBooking]);
      await service.getUpcoming("cli1");
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: "cli1", status: { not: BookingStatus.CANCELLED } }),
          take: 10,
        })
      );
    });

    it("getHistory busca reservas passadas ou finalizadas/canceladas, limitadas a 50", async () => {
      mockPrisma.booking.findMany.mockResolvedValue([baseBooking]);
      await service.getHistory("cli1");
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: "cli1",
            OR: [
              { eventDate: { lt: expect.any(Date) } },
              { status: { in: [BookingStatus.COMPLETED, BookingStatus.CANCELLED] } },
            ],
          }),
          take: 50,
        })
      );
    });
  });

  describe("getCalendar", () => {
    it("sem month/year, busca todas não-canceladas e transforma cada item", async () => {
      mockPrisma.booking.findMany.mockResolvedValue([
        { ...baseBooking, eventCollaborators: [], kit: null, equipments: [], client: { user: { name: "Cliente Teste" }, phone: "31999999999" } },
      ]);

      const result = await service.getCalendar();

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: { not: BookingStatus.CANCELLED } } })
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "b1",
        status: BookingStatus.PENDING,
        client: { name: "Cliente Teste", phone: "31999999999" },
      });
      // Duração calculada pela diferença real entre eventDate/eventEndDate (4h no fixture)
      expect(result[0].duration).toBe(4);
    });

    it("com month/year, filtra pelo intervalo do mês", async () => {
      mockPrisma.booking.findMany.mockResolvedValue([]);
      await service.getCalendar(3, 2027);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventDate: { gte: new Date(2027, 2, 1), lte: new Date(2027, 3, 0) },
          }),
        })
      );
    });
  });
});
