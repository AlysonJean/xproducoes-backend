"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authService_1 = require("../services/authService");
describe("AuthService", () => {
    let service;
    let uniqueEmail;
    const phone = "11999999999";
    beforeEach(() => {
        service = new authService_1.AuthService();
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
        await expect(service.register({
            name: "Teste",
            email: uniqueEmail,
            password: "123456",
            phone,
        })).rejects.toThrow("Email já está em uso.");
    });
    it("deve lançar erro ao logar com senha errada", async () => {
        await service.register({
            name: "Teste",
            email: uniqueEmail,
            password: "123456",
            phone,
        });
        await expect(service.login({ email: uniqueEmail, password: "senhaerrada" })).rejects.toThrow();
    });
});
