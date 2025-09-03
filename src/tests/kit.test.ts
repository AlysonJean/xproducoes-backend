// Mock email service locally to avoid real SMTP calls during user registration in tests
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

describe("Kit", () => {
  let token: string;

  beforeAll(async () => {
    // Cria um usuário ADMIN de teste e obtém o token JWT
    const userData = {
      name: "Test User",
      email: `kit_test_${Date.now()}@test.com`,
      password: "12345678",
      role: "ADMIN",
    };
    await request(app).post("/api/auth/register").send(userData);
    const loginRes = await request(app).post("/api/auth/login").send({
      email: userData.email,
      password: userData.password,
    });
    token = loginRes.body.token;
  });

  it("deve listar kits", async () => {
    const res = await request(app)
      .get("/api/kits")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
