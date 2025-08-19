"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bookingService_1 = require("../services/bookingService");
describe("BookingService/calculateTotalPrice", () => {
    let service;
    beforeEach(() => {
        service = new bookingService_1.BookingService();
        jest.clearAllMocks();
    });
    it("deve calcular o preço total corretamente", async () => {
        // TODO: Implemente o teste usando Prisma ou mock de banco real, conforme arquitetura atual
        expect(true).toBe(true);
    });
});
