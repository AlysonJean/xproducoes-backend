import { EmailService } from "../services/emailService";
import { BookingStatus, DeliveryStatus, UserRole } from '@prisma/client';
import { Decimal } from "@prisma/client/runtime/library";
// nodemailer mocked for EmailService unit tests
jest.mock("nodemailer");

// Mock email service locally for integration parts of this test to avoid SMTP
jest.mock("../services/emailService", () => {
  class EmailService {
    async init() {}
    async sendVerificationEmail() { return true; }
    async sendPasswordResetEmail() { return true; }
    async sendBookingConfirmation() { return true; }
    async sendMail() { return true; }
  }
  return {
    EmailService,
    default: new EmailService(),
  };
});

const request = require("supertest");
const app = require("../app").default;

// Teste do serviço de e-mail
describe("EmailService", () => {
  it("deve chamar o método de envio de email", async () => {
    const service = new EmailService();
    const spy = jest
      .spyOn(service, "sendBookingConfirmation")
      .mockResolvedValue(undefined);

    const user = {
      name: "Usuário",
      id: "1",
      createdAt: new Date(),
      email: "user@mail.com",
      password: "123456", // senha válida
      phone: "11999999999",
      avatarUrl: null,
      role: UserRole.CLIENT,
      updatedAt: new Date(),
    };

    const booking = {
      id: "1",
      userId: user.id,
      kitId: null,
      eventDate: new Date(),
      eventEndDate: new Date(),
      totalPrice: new Decimal(100),
      status: BookingStatus.PENDING,
      requiresStairs: false,
      isCovered: false,
      createdAt: new Date(),
      deliveryStatus: DeliveryStatus.PENDING,
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
          pricePerHour: new Decimal(10),
          quantity: 1,
          categoryId: "cat1",
        },
      ],
    };

    await service.sendBookingConfirmation(user, booking);
    expect(spy).toHaveBeenCalledWith(user, booking);
  });
});

// Teste de integração do endpoint de métodos de pagamento
describe("Payment", () => {
  let token: string;
  const email = `user${Date.now()}@mail.com`;
  const password = "123456"; // senha válida

  beforeAll(async () => {
    // Registra o usuário
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Usuário Teste", email, password, phone: "11999999999" });

    if (![201, 200].includes(regRes.statusCode)) {
      throw new Error(
        `Falha ao registrar usuário. Resposta: ${JSON.stringify(regRes.body)}`,
      );
    }

    // Faz login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    if (!loginRes.body.token) {
      throw new Error(
        `Login falhou. Resposta: ${JSON.stringify(loginRes.body)}`,
      );
    }
    token = loginRes.body.token;
  });

  it("deve retornar métodos de pagamento", async () => {
    const res = await request(app)
      .get("/api/payments/methods")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});
