// Testes de caracterização — capturam o comportamento REAL e atual de tarefas, despesas e
// roadmap operacional do evento, como rede de segurança da decomposição de bookingService.ts
// (1351 linhas/25 métodos) em 6 services menores. Cobre BookingTaskService:
// createBookingTask, toggleTaskStatus, createBookingExpense, getEventRoadmap.

import { BookingTaskService } from "../../services/booking/bookingTaskService";
import { BookingNotFoundError } from "../bookingErrors";

describe("BookingTaskService — testes de caracterização", () => {
  let service: BookingTaskService;
  let mockPrisma: any;

  const baseBooking = { id: "b1", eventTitle: "Festa" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      bookingTask: { create: jest.fn(), update: jest.fn() },
      bookingExpense: { create: jest.fn() },
      booking: { findUnique: jest.fn() },
    };
    service = new BookingTaskService();
    // @ts-expect-error - prisma é private em BookingTaskService; injeção só para teste
    service.prisma = mockPrisma;
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
