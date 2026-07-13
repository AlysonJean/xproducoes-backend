// Testes de caracterização — capturam o comportamento REAL e atual de bookingService.ts
// (não necessariamente "correto"), como rede de segurança antes de uma decomposição proposta
// da classe BookingService (1351 linhas/25 métodos) em 6 services menores (Crud/Status/
// Calendar/Reporting/Attachment/Task — ver relatório de auditoria). Cobrem os métodos que
// não tinham nenhum teste próprio antes desta sessão (confirmado via relatório de cobertura:
// linhas 475-673, 761-869, 883-1349 sem cobertura alguma).
//
// Objetivo: pegar "movi a lógica errada de arquivo" durante o refactor, não testar
// exaustivamente cada branch de negócio — por isso cada método tem 1-3 testes focados no
// caminho principal + a ramificação mais importante (erro de não encontrado, status
// condicional etc.), seguindo o mesmo padrão de injeção de mock já estabelecido em
// bookingService.price.test.ts (service.prisma = mockPrisma).

import { BookingStatus, DeliveryStatus } from "@prisma/client";
import { BookingService } from "../../services/bookingService";
import { BookingNotFoundError } from "../bookingErrors";

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

jest.mock("../../services/cacheService", () => ({
  cacheService: {
    invalidateBookingCaches: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("BookingService — testes de caracterização (métodos sem cobertura prévia)", () => {
  let service: BookingService;
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
    location: "Rua X",
    totalPrice: 500,
    client: { user: { name: "Cliente Teste", email: "cliente@teste.com" } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(mockPrisma)),
      booking: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      },
      bookingItem: { deleteMany: jest.fn() },
      bookingAttachment: { create: jest.fn(), delete: jest.fn() },
      bookingTask: { create: jest.fn(), update: jest.fn() },
      bookingExpense: { create: jest.fn() },
      chat: { updateMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      chatParticipant: { upsert: jest.fn() },
      client: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      eventCollaborator: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new BookingService();
    // @ts-expect-error - prisma é private em BookingService; injeção só para teste (mesmo padrão de bookingService.price.test.ts)
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

  describe("updateDeliveryStatus", () => {
    it("atualiza deliveryStatus após confirmar existência", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, deliveryStatus: DeliveryStatus.DELIVERED });

      const result = await service.updateDeliveryStatus("b1", DeliveryStatus.DELIVERED);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "b1" }, data: { deliveryStatus: DeliveryStatus.DELIVERED } })
      );
      expect(result.deliveryStatus).toBe(DeliveryStatus.DELIVERED);
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

  describe("addAttachment / removeAttachment", () => {
    it("addAttachment cria o anexo vinculado à reserva existente", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.bookingAttachment.create.mockResolvedValue({ id: "att1", url: "http://x/a.pdf" });

      const result = await service.addAttachment("b1", { url: "http://x/a.pdf", filename: "a.pdf" });

      expect(mockPrisma.bookingAttachment.create).toHaveBeenCalledWith({
        data: { bookingId: "b1", url: "http://x/a.pdf", filename: "a.pdf", mimeType: undefined },
      });
      expect(result.id).toBe("att1");
    });

    it("removeAttachment deleta pelo id do anexo", async () => {
      mockPrisma.bookingAttachment.delete.mockResolvedValue({ id: "att1" });
      const result = await service.removeAttachment("att1");
      expect(mockPrisma.bookingAttachment.delete).toHaveBeenCalledWith({ where: { id: "att1" } });
      expect(result.id).toBe("att1");
    });
  });

  describe("confirmWithDetails", () => {
    it("atualiza status/valor/colaboradores e dispara updateBookingStatus (fire-and-forget)", async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CONFIRMED, totalPrice: 999 });
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);

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
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CANCELLED });

      await service.cancel("b1", "Cliente desistiu");

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: BookingStatus.CANCELLED, notes: "Cancelado: Cliente desistiu" },
        })
      );
    });

    it("usa nota padrão quando nenhum motivo é informado", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CANCELLED });

      await service.cancel("b1");

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: BookingStatus.CANCELLED, notes: "Reserva cancelada." } })
      );
    });
  });

  describe("updateBookingStatus", () => {
    it("atualiza status sem disparar efeitos colaterais quando != CONFIRMED", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CANCELLED });

      const result = await service.updateBookingStatus("b1", BookingStatus.CANCELLED);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: BookingStatus.CANCELLED } })
      );
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it("ao confirmar (CONFIRMED), dispara sync/notificações sem lançar erro", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.booking.update.mockResolvedValue({ ...baseBooking, status: BookingStatus.CONFIRMED });
      mockPrisma.chat.findFirst.mockResolvedValue(null);

      // updateBookingStatus retorna antes dos efeitos colaterais fire-and-forget terminarem —
      // caracteriza o comportamento real (não espera notificações), não um bug a corrigir aqui.
      const result = await service.updateBookingStatus("b1", BookingStatus.CONFIRMED);

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: BookingStatus.CONFIRMED } })
      );
    });
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
        { ...baseBooking, eventCollaborators: [], kit: null, equipments: [] },
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

  describe("createBookingTask / toggleTaskStatus / createBookingExpense", () => {
    it("createBookingTask cria a tarefa vinculada à reserva", async () => {
      mockPrisma.bookingTask.create.mockResolvedValue({ id: "task1", title: "Levar equipamento" });
      const result = await service.createBookingTask("b1", { title: "Levar equipamento" });
      expect(mockPrisma.bookingTask.create).toHaveBeenCalledWith({
        data: { bookingId: "b1", title: "Levar equipamento", description: undefined },
      });
      expect(result.id).toBe("task1");
    });

    it("toggleTaskStatus define completedAt ao concluir e null ao reabrir", async () => {
      mockPrisma.bookingTask.update.mockResolvedValue({ id: "task1", isCompleted: true });
      await service.toggleTaskStatus("task1", true);
      expect(mockPrisma.bookingTask.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isCompleted: true, completedAt: expect.any(Date) }) })
      );

      await service.toggleTaskStatus("task1", false);
      expect(mockPrisma.bookingTask.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isCompleted: false, completedAt: null } })
      );
    });

    it("createBookingExpense cria a despesa com status PENDING", async () => {
      mockPrisma.bookingExpense.create.mockResolvedValue({ id: "exp1" });
      await service.createBookingExpense({
        bookingId: "b1",
        collaboratorId: "col1",
        amount: 150,
        description: "Combustível",
      });
      expect(mockPrisma.bookingExpense.create).toHaveBeenCalledWith({
        data: {
          bookingId: "b1",
          collaboratorId: "col1",
          amount: 150,
          description: "Combustível",
          receiptUrl: undefined,
          status: "PENDING",
        },
      });
    });
  });

  describe("getEventRoadmap", () => {
    it("retorna a reserva com colaboradores/tarefas/despesas quando encontrada", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      const result = await service.getEventRoadmap("b1");
      expect(result).toEqual(baseBooking);
    });

    it("lança BookingNotFoundError quando a reserva não existe", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.getEventRoadmap("inexistente")).rejects.toThrow(BookingNotFoundError);
    });
  });
});
