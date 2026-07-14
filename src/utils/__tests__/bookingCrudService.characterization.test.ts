// Testes de caracterização — capturam o comportamento REAL e atual dos métodos de CRUD de
// reserva, como rede de segurança da decomposição de bookingService.ts (1351 linhas/25
// métodos) em 6 services menores. Cobre a fatia de métodos que hoje vive em
// BookingCrudService: getAllBookings, countBookings, getBookingsByClient, updateBooking,
// deleteBooking, linkBookingsToUser (createBooking já tinha testes próprios — ver
// bookingCrudService.price.test.ts e bookingCrudService.idempotency.test.ts).

import { BookingStatus } from "@prisma/client";
import { BookingCrudService } from "../../services/booking/bookingCrudService";
import { BookingNotFoundError } from "../bookingErrors";

jest.mock("../../services/cacheService", () => ({
  cacheService: {
    invalidateBookingCaches: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("BookingCrudService — testes de caracterização", () => {
  let service: BookingCrudService;
  let mockPrisma: any;

  const baseBooking = {
    id: "b1",
    status: BookingStatus.PENDING,
    eventTitle: "Festa",
    eventDate: new Date("2027-01-10T18:00:00Z"),
    eventEndDate: new Date("2027-01-10T22:00:00Z"),
    clientId: "cli1",
    clientName: "Cliente Teste",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(mockPrisma)),
      booking: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      bookingItem: { deleteMany: jest.fn() },
      chat: { updateMany: jest.fn() },
      client: { findUnique: jest.fn(), create: jest.fn() },
    };
    service = new BookingCrudService();
    // @ts-expect-error - prisma é private em BookingCrudService; injeção só para teste
    service.prisma = mockPrisma;
  });

  describe("getAllBookings", () => {
    it("busca sem filtros com where vazio", async () => {
      mockPrisma.booking.findMany.mockResolvedValue([baseBooking]);
      const result = await service.getAllBookings();
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, orderBy: { eventDate: "asc" } })
      );
      expect(result).toEqual([baseBooking]);
    });

    it("monta where com status, clientId e intervalo de datas", async () => {
      mockPrisma.booking.findMany.mockResolvedValue([]);
      const from = new Date("2027-01-01");
      const to = new Date("2027-01-31");
      await service.getAllBookings({
        status: BookingStatus.CONFIRMED,
        clientId: "cli1",
        eventDateFrom: from,
        eventDateTo: to,
      });
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: BookingStatus.CONFIRMED,
            clientId: "cli1",
            eventDate: { gte: from, lte: to },
          },
        })
      );
    });
  });

  describe("countBookings", () => {
    it("conta com os mesmos filtros de getAllBookings", async () => {
      mockPrisma.booking.count.mockResolvedValue(7);
      const result = await service.countBookings({ status: BookingStatus.PENDING });
      expect(mockPrisma.booking.count).toHaveBeenCalledWith({ where: { status: BookingStatus.PENDING } });
      expect(result).toBe(7);
    });
  });

  describe("getBookingsByClient", () => {
    it("delega para getAllBookings com clientId", async () => {
      mockPrisma.booking.findMany.mockResolvedValue([baseBooking]);
      const result = await service.getBookingsByClient("cli1");
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: "cli1" } })
      );
      expect(result).toEqual([baseBooking]);
    });
  });

  describe("updateBooking", () => {
    it("atualiza campos básicos após confirmar que a reserva existe", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, eventTitle: "Festa Atualizada" });

      const result = await service.updateBooking("b1", { eventTitle: "Festa Atualizada" } as any);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "b1" }, data: expect.objectContaining({ eventTitle: "Festa Atualizada" }) })
      );
      expect(result.eventTitle).toBe("Festa Atualizada");
    });

    it("substitui itens (deleteMany + create) quando data.items é fornecido", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.booking.update.mockResolvedValue(baseBooking);

      await service.updateBooking("b1", {
        items: [{ description: "Item novo", quantity: 1, unitPrice: 10, totalPrice: 10 }],
      } as any);

      expect(mockPrisma.bookingItem.deleteMany).toHaveBeenCalledWith({ where: { bookingId: "b1" } });
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ items: { create: expect.any(Array) } }) })
      );
    });

    it("propaga BookingNotFoundError quando a reserva não existe", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.updateBooking("inexistente", {} as any)).rejects.toThrow(BookingNotFoundError);
    });
  });

  describe("deleteBooking", () => {
    it("desvincula chats (bookingId -> null) e deleta a reserva numa transação", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);

      await service.deleteBooking("b1");

      expect(mockPrisma.chat.updateMany).toHaveBeenCalledWith({ where: { bookingId: "b1" }, data: { bookingId: null } });
      expect(mockPrisma.booking.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
    });

    it("propaga BookingNotFoundError quando a reserva não existe", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.deleteBooking("inexistente")).rejects.toThrow(BookingNotFoundError);
    });
  });

  describe("linkBookingsToUser", () => {
    it("cria Client se não existir e vincula orçamentos por email/bookingId", async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null);
      mockPrisma.client.create.mockResolvedValue({ id: "cli-novo" });

      await service.linkBookingsToUser("user1", "novo@teste.com", "b1");

      expect(mockPrisma.client.create).toHaveBeenCalledWith({ data: { userId: "user1" } });
      expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { clientEmail: "novo@teste.com", clientId: null },
            { id: "b1", clientId: null },
          ],
        },
        data: { clientId: "cli-novo" },
      });
    });

    it("reaproveita Client existente sem criar um novo", async () => {
      mockPrisma.client.findUnique.mockResolvedValue({ id: "cli-existente" });

      await service.linkBookingsToUser("user1", "existente@teste.com");

      expect(mockPrisma.client.create).not.toHaveBeenCalled();
      expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { clientId: "cli-existente" } })
      );
    });

    it("não lança erro para o chamador quando o Prisma falha (só loga)", async () => {
      mockPrisma.client.findUnique.mockRejectedValue(new Error("DB fora do ar"));
      await expect(service.linkBookingsToUser("user1", "x@teste.com")).resolves.toBeUndefined();
    });
  });
});
