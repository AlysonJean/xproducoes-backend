import { BookingService } from "../../services/bookingService";
import { BookingValidationError } from "../bookingErrors";

describe("BookingService - cálculo de preço total", () => {
  let service: BookingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(mockPrisma)),
      user: { findUnique: jest.fn().mockResolvedValue({ id: "u1" }) },
      kit: { findUnique: jest.fn() },
      equipment: { findMany: jest.fn() },
      service: { findMany: jest.fn().mockResolvedValue([]) },
      client: { upsert: jest.fn() },
      booking: { create: jest.fn().mockResolvedValue({ id: "b1" }) },
    };
    service = new BookingService();
    // @ts-ignore
    service.prisma = mockPrisma;
  });

  it("usa totalPrice explícito se fornecido", async () => {
    const data: any = { eventDate: new Date(Date.now()+100000).toISOString(), eventEndDate: new Date(Date.now()+200000).toISOString(), totalPrice: 123, userId: "u1", clientName: "c", clientContact: "x" };
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
    mockPrisma.client.upsert.mockResolvedValue({ id: "cli1" });
    await service.createBooking(data, "u1");
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalPrice: 123 }) }));
  });

  it("calcula preço pelo kit se kitId fornecido", async () => {
    const data: any = { eventDate: new Date(Date.now()+100000).toISOString(), eventEndDate: new Date(Date.now()+200000).toISOString(), eventDuration: 1, kitId: "kit1", userId: "u1", clientName: "c", clientContact: "x" };
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
    mockPrisma.kit.findUnique.mockResolvedValue({ id: "kit1", price: 555 });
    mockPrisma.client.upsert.mockResolvedValue({ id: "cli1" });
    await service.createBooking(data, "u1");
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalPrice: 555 }) }));
  });

  it("calcula preço por equipamentos se equipmentIds fornecido", async () => {
    const data: any = { eventDate: new Date(Date.now()+100000).toISOString(), eventEndDate: new Date(Date.now()+200000).toISOString(), eventDuration: 1, equipmentIds: ["e1","e2"], userId: "u1", clientName: "c", clientContact: "x" };
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
    mockPrisma.equipment.findMany.mockResolvedValue([{ pricePerHour: 10 }, { pricePerHour: 20 }]);
    mockPrisma.client.upsert.mockResolvedValue({ id: "cli1" });
    await service.createBooking(data, "u1");
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalPrice: 30 }) }));
  });

  it("lança erro se não houver cliente identificado", async () => {
    const data: any = { eventDate: new Date(Date.now()+100000).toISOString(), eventEndDate: new Date(Date.now()+200000).toISOString() };
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
    await expect(service.createBooking(data, "u1")).rejects.toThrow(BookingValidationError);
  });
});
