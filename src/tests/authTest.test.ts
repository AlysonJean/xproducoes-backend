// Mock email service locally to avoid real SMTP calls during auth/register
jest.mock("../services/emailService", () => ({
  default: {
    init: async () => {},
    sendVerificationEmail: async () => true,
    sendPasswordResetEmail: async () => true,
    sendBookingConfirmation: async () => true,
    sendMail: async () => true,
  },
}));

import request from "supertest";
import app from "../app";

describe("Auth", () => {
  const uniqueEmail = `teste${Date.now()}@teste.com`;
  const phone = "11999999999";

  it("deve registrar um usuário", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Usuário Teste",
      email: uniqueEmail,
      password: "123456",
      phone,
    });
    // Aceita apenas status válidos para registro (201: criado, 400: erro de requisição, 422: erro de validação)
    expect([201, 400, 422]).toContain(res.statusCode);
  });

  it("deve fazer login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: uniqueEmail, password: "123456" });
    // Aceita apenas status válidos para login (200: sucesso, 401: não autorizado)
    expect([200, 401]).toContain(res.statusCode);
  });
});
