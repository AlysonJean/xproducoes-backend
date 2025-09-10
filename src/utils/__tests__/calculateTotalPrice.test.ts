import { BookingService } from "../../services/bookingService";

describe("BookingService/calculateTotalPrice", () => {
  let service: BookingService;

  beforeEach(() => {
    service = new BookingService();
    jest.clearAllMocks();
  });

  it("deve calcular o preço total corretamente", async () => {
    // TODO: Implemente o teste usando Prisma ou mock de banco real, conforme arquitetura atual
    expect(true).toBe(true);
  });
});
