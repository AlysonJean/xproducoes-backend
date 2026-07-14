// Testes de caracterização — capturam o comportamento REAL e atual dos anexos/comprovantes de
// reserva, como rede de segurança da decomposição de bookingService.ts (1351 linhas/25
// métodos) em 6 services menores. Cobre BookingAttachmentService: addAttachment,
// removeAttachment.
//
// BookingAttachmentService depende de bookingCrudService.getBookingById (validar existência
// antes de anexar) — módulo mockado aqui para testar a lógica própria isolada da
// implementação do Crud service.

import { BookingAttachmentService } from "../../services/booking/bookingAttachmentService";

jest.mock("../../services/booking/bookingCrudService", () => ({
  bookingCrudService: {
    getBookingById: jest.fn().mockResolvedValue({ id: "b1" }),
  },
}));

describe("BookingAttachmentService — testes de caracterização", () => {
  let service: BookingAttachmentService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      bookingAttachment: { create: jest.fn(), delete: jest.fn() },
    };
    service = new BookingAttachmentService();
    // @ts-expect-error - prisma é private em BookingAttachmentService; injeção só para teste
    service.prisma = mockPrisma;
  });

  describe("addAttachment / removeAttachment", () => {
    it("addAttachment cria o anexo vinculado à reserva existente", async () => {
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
});
