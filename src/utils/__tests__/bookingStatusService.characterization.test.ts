// Testes de caracterização — capturam o comportamento REAL e atual das transições de status
// de reserva, como rede de segurança da decomposição de bookingService.ts (1351 linhas/25
// métodos) em 6 services menores. Cobre BookingStatusService: updateBookingStatus,
// updateDeliveryStatus, confirmWithDetails, cancel.
//
// BookingStatusService depende de bookingCrudService.getBookingById (validar existência) e
// bookingCalendarService.syncGoogleCalendar (sync ao confirmar) — módulos mockados aqui para
// testar a lógica própria do Status service isolada da implementação das outras duas.

import { BookingStatus, DeliveryStatus } from "@prisma/client";
import { BookingStatusService } from "../../services/booking/bookingStatusService";
import { bookingCrudService } from "../../services/booking/bookingCrudService";
import { createNotification } from "../../services/notificationService";

jest.mock("../../services/booking/bookingCrudService", () => ({
  bookingCrudService: {
    getBookingById: jest.fn().mockResolvedValue({ id: "b1" }),
    checkEquipmentConflicts: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../services/booking/bookingCalendarService", () => ({
  bookingCalendarService: {
    syncGoogleCalendar: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../services/whatsappService", () => ({
  whatsappService: {
    sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("../../services/googleCalendarService", () => ({
  googleCalendarService: {
    createEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../services/emailService", () => ({
  __esModule: true,
  default: {
    sendBookingApproved: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../services/notificationService", () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/cacheService", () => ({
  cacheService: {
    invalidateBookingCaches: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("BookingStatusService — testes de caracterização", () => {
  let service: BookingStatusService;
  let mockPrisma: any;

  const baseBooking = {
    id: "b1",
    status: BookingStatus.PENDING,
    deliveryStatus: DeliveryStatus.PENDING,
    eventTitle: "Festa",
    eventDate: new Date("2027-01-10T18:00:00Z"),
    eventEndDate: new Date("2027-01-10T22:00:00Z"),
    clientId: "cli1",
    clientName: "Cliente Teste",
    clientContact: "31999999999",
    clientEmail: "cliente@teste.com",
    creatorId: "creator1",
    totalPrice: 500,
    client: { user: { name: "Cliente Teste", email: "cliente@teste.com" } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      // findUnique é usado internamente por syncEventChat (efeito colateral fire-and-forget
      // de updateBookingStatus ao confirmar) — sem isso, a chamada falha com "is not a
      // function" e o erro fica só logado (try/catch interno), mascarando o caminho real.
      booking: { update: jest.fn(), findUnique: jest.fn() },
      chat: { updateMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      chatParticipant: { upsert: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      eventCollaborator: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new BookingStatusService();
    // @ts-expect-error - prisma é private em BookingStatusService; injeção só para teste
    service.prisma = mockPrisma;
  });

  describe("updateBookingStatus", () => {
    it("atualiza status sem disparar efeitos colaterais quando != CONFIRMED", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CANCELLED });

      const result = await service.updateBookingStatus("b1", BookingStatus.CANCELLED);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: BookingStatus.CANCELLED } })
      );
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it("ao confirmar (CONFIRMED), dispara sync/notificações sem lançar erro", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CONFIRMED });

      // updateBookingStatus retorna antes dos efeitos colaterais fire-and-forget terminarem —
      // caracteriza o comportamento real (não espera notificações), não um bug a corrigir aqui.
      const result = await service.updateBookingStatus("b1", BookingStatus.CONFIRMED);

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: BookingStatus.CONFIRMED } })
      );
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: baseBooking.creatorId, type: "BOOKING_UPDATED" })
      );
    });

    it("bloqueia a confirmação quando o equipamento já está reservado em outro evento confirmado no mesmo período", async () => {
      (bookingCrudService.getBookingById as jest.Mock).mockResolvedValueOnce({
        ...baseBooking,
        equipments: [{ id: "eq1", name: "Caixa JBL" }],
        kitId: null,
      });
      (bookingCrudService.checkEquipmentConflicts as jest.Mock).mockResolvedValueOnce([
        { id: "b2", eventTitle: "Casamento Silva", eventDate: new Date("2027-01-10T18:00:00Z") },
      ]);

      await expect(service.updateBookingStatus("b1", BookingStatus.CONFIRMED)).rejects.toThrow(/Casamento Silva/);
      expect(mockPrisma.booking.update).not.toHaveBeenCalled();
    });
  });

  describe("updateDeliveryStatus", () => {
    it("atualiza deliveryStatus após confirmar existência", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, deliveryStatus: DeliveryStatus.DELIVERED });

      const result = await service.updateDeliveryStatus("b1", DeliveryStatus.DELIVERED);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "b1" }, data: { deliveryStatus: DeliveryStatus.DELIVERED } })
      );
      expect(result.deliveryStatus).toBe(DeliveryStatus.DELIVERED);
    });
  });

  describe("confirmWithDetails", () => {
    it("atualiza status/valor/colaboradores e dispara updateBookingStatus (fire-and-forget)", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CONFIRMED, totalPrice: 999 });

      const result = await service.confirmWithDetails("b1", {
        totalPrice: 999,
        collaborators: [{ collaboratorId: "col1" }],
      });

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "b1" },
          data: expect.objectContaining({
            status: BookingStatus.CONFIRMED,
            totalPrice: 999,
            eventCollaborators: expect.objectContaining({ deleteMany: {}, create: expect.any(Array) }),
          }),
        })
      );
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe("cancel", () => {
    it("marca CANCELLED com o motivo informado nas notas", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CANCELLED });

      await service.cancel("b1", "Cliente desistiu");

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: BookingStatus.CANCELLED, notes: "Cancelado: Cliente desistiu" },
        })
      );
    });

    it("usa nota padrão quando nenhum motivo é informado", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CANCELLED });

      await service.cancel("b1");

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: BookingStatus.CANCELLED, notes: "Reserva cancelada." } })
      );
    });
  });

  describe("confirm", () => {
    it("delega para updateBookingStatus com CONFIRMED", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CONFIRMED });
      const result = await service.confirm("b1");
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: BookingStatus.CONFIRMED } })
      );
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });
});
