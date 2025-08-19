import { AuthService } from "../services/authService";

describe("AuthService", () => {
  let service: AuthService;
  let uniqueEmail: string;
  const phone = "11999999999";

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
    uniqueEmail = `teste${Date.now()}@teste.com`; // Garante e-mail único por teste
  });

  it("deve lançar erro ao registrar e-mail duplicado", async () => {
    await service.register({
      name: "Teste",
      email: uniqueEmail,
      password: "123456",
      phone,
    });
    await expect(
      service.register({
        name: "Teste",
        email: uniqueEmail,
        password: "123456",
        phone,
      }),
    ).rejects.toThrow("Email já está em uso.");
  });

  it("deve lançar erro ao logar com senha errada", async () => {
    await service.register({
      name: "Teste",
      email: uniqueEmail,
      password: "123456",
      phone,
    });
    await expect(
      service.login({ email: uniqueEmail, password: "senhaerrada" }),
    ).rejects.toThrow();
  });
});
