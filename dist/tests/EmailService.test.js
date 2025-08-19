"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emailService_1 = require("../services/emailService");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
jest.mock("nodemailer");
describe("EmailService", () => {
    it("deve chamar o método de envio de email", async () => {
        const service = new emailService_1.EmailService();
        const spy = jest
            .spyOn(service, "sendBookingConfirmation")
            .mockResolvedValue(undefined);
        const user = {
            name: "Usuário",
            id: "1",
            createdAt: new Date(),
            email: "user@mail.com",
            password: "123",
            phone: "11999999999", // <-- Corrigido aqui
            avatarUrl: null,
            role: client_1.UserRole.CLIENT,
            updatedAt: new Date(),
        };
        const booking = {
            id: "1",
            userId: user.id,
            kitId: null,
            eventDate: new Date(),
            eventEndDate: new Date(),
            totalPrice: new library_1.Decimal(100),
            status: client_1.BookingStatus.PENDING,
            requiresStairs: false,
            isCovered: false,
            createdAt: new Date(),
            deliveryStatus: client_1.DeliveryStatus.PENDING,
            clientName: "Cliente Teste",
            clientContact: "contato@teste.com",
            location: "Salão de Festas",
            street: "Rua dos Testes",
            neighborhood: "Bairro Teste",
            city: "Cidade Teste",
            state: "Estado Teste",
            zipCode: "12345-678",
            addressNumber: "123",
            addressComplement: null,
            eventDuration: 6,
            hasParking: true,
            notes: null,
            equipments: [
                {
                    id: "eq1",
                    name: "Equipamento Teste",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    description: "Descrição teste",
                    imageUrl: "http://imagem.com/img.png",
                    pricePerHour: new library_1.Decimal(10),
                    quantity: 1,
                    categoryId: "cat1",
                },
            ],
        };
        await service.sendBookingConfirmation(user, booking);
        expect(spy).toHaveBeenCalledWith(user, booking);
    });
});
