import { AuthService } from "../../services/authService";

jest.mock("../../services/userService", () => ({
  register: jest.fn(async (data) => {
    if (data.email.includes("duplicate")) throw new Error("Email já está em uso.");
    return { id: 'u1', ...data };
  }),
  login: jest.fn(async (data) => {
    if (data.password === "senhaerrada") throw new Error("Credenciais inválidas");
    return { token: 'jwt', user: { id: 'u1', ...data } };
  }),
  requestPasswordReset: jest.fn(async (email) => ({ success: true })),
  resetPassword: jest.fn(async (token, newPassword) => ({ success: true })),
  getProfile: jest.fn(async (userId) => ({ id: userId, name: 'User' })),
  updateProfile: jest.fn(async (userId, data, file) => ({ id: userId, ...data })),
  changePassword: jest.fn(async (userId, currentPassword, newPassword) => ({ success: true })),
}));

describe("AuthService", () => {
  let service;
  let uniqueEmail;
  const phone = "11999999999";

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
    uniqueEmail = `teste${Date.now()}@teste.com`;
  });

  it("deve registrar usuário", async () => {
    const result = await service.register({ name: "Teste", email: uniqueEmail, password: "123456", phone });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name', 'Teste');
  });

  it("deve fazer login", async () => {
    const result = await service.login({ email: uniqueEmail, password: "123456" });
    expect(result).toHaveProperty('token');
    expect(result.user).toHaveProperty('id');
  });

  it("deve solicitar reset de senha", async () => {
    const result = await service.requestPasswordReset(uniqueEmail);
    expect(result).toHaveProperty('success', true);
  });

  it("deve resetar senha", async () => {
    const result = await service.resetPassword('token', 'nova');
    expect(result).toHaveProperty('success', true);
  });

  it("deve retornar perfil", async () => {
    const result = await service.getProfile('u1');
    expect(result).toHaveProperty('id', 'u1');
  });

  it("deve atualizar perfil", async () => {
    const result = await service.updateProfile('u1', { name: 'Novo' });
    expect(result).toHaveProperty('id', 'u1');
    expect(result).toHaveProperty('name', 'Novo');
  });

  it("deve trocar senha", async () => {
    const result = await service.changePassword('u1', 'old', 'new');
    expect(result).toHaveProperty('success', true);
  });

  // Mantém os testes originais para cenários de erro
  it("deve lançar erro ao registrar e-mail duplicado", async () => {
    // Simulando erro no mock
    const duplicateEmail = "duplicate@teste.com";
    await expect(
      service.register({
        name: "Teste",
        email: duplicateEmail,
        password: "123456",
        phone,
      }),
    ).rejects.toThrow("Email já está em uso.");
  });

  it("deve lançar erro ao logar com senha errada", async () => {
    // O mock já está configurado para falhar com 'senhaerrada'
    await expect(
      service.login({ email: uniqueEmail, password: "senhaerrada" }),
    ).rejects.toThrow();
  });
});
