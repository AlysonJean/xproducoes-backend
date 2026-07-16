import { BookingStatus } from "@prisma/client";
import { BookingCrudService } from "../../services/booking/bookingCrudService";

jest.mock("../../services/cacheService", () => ({
  cacheService: { invalidateBookingCaches: jest.fn().mockResolvedValue(undefined) },
}));

// Achado (auditoria de produto): não existia nenhuma checagem de conflito de agenda —
// o endpoint que parecia prometer isso (GET /equipments/:id/availability) era um stub
// sempre "disponível" e, além disso, nunca era chamado por nenhuma tela real. O risco de
// verdade é permitir confirmar duas reservas com o MESMO equipamento no mesmo período.
describe("BookingCrudService.checkEquipmentConflicts", () => {
  let service: BookingCrudService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = { booking: { findMany: jest.fn() } };
    service = new BookingCrudService();
    // @ts-expect-error - prisma é private; injeção só para teste
    service.prisma = mockPrisma;
  });

  it("retorna [] sem consultar o banco quando não há equipamento nem kit", async () => {
    const result = await service.checkEquipmentConflicts("b1", [], null, new Date(), new Date());
    expect(result).toEqual([]);
    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled();
  });

  it("consulta conflitos por equipamento, excluindo a própria reserva e só considerando CONFIRMED/IN_PROGRESS", async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);
    const from = new Date("2027-02-10T18:00:00Z");
    const to = new Date("2027-02-10T22:00:00Z");

    await service.checkEquipmentConflicts("b1", ["eq1", "eq2"], null, from, to);

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "b1" },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
          eventDate: { lt: to },
          eventEndDate: { gt: from },
          OR: [{ equipments: { some: { id: { in: ["eq1", "eq2"] } } } }],
        }),
      })
    );
  });

  it("inclui condição de kitId quando fornecido", async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);
    await service.checkEquipmentConflicts("b1", [], "kit1", new Date(), new Date());

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: [{ kitId: "kit1" }] }),
      })
    );
  });

  it("retorna as reservas conflitantes encontradas", async () => {
    const conflicting = [{ id: "b2", eventTitle: "Casamento", eventDate: new Date("2027-02-10"), equipments: [{ id: "eq1", name: "Caixa JBL" }], kit: null }];
    mockPrisma.booking.findMany.mockResolvedValue(conflicting);

    const result = await service.checkEquipmentConflicts("b1", ["eq1"], null, new Date("2027-02-10T18:00:00Z"), new Date("2027-02-10T22:00:00Z"));
    expect(result).toEqual(conflicting);
  });
});
