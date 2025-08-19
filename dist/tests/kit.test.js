"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe("Kit", () => {
    let token;
    beforeAll(async () => {
        // Cria um usuário ADMIN de teste e obtém o token JWT
        const userData = {
            name: "Test User",
            email: `kit_test_${Date.now()}@test.com`,
            password: "12345678",
            role: "ADMIN",
        };
        await (0, supertest_1.default)(app_1.default).post("/api/auth/register").send(userData);
        const loginRes = await (0, supertest_1.default)(app_1.default).post("/api/auth/login").send({
            email: userData.email,
            password: userData.password,
        });
        token = loginRes.body.token;
    });
    it("deve listar kits", async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get("/api/kits")
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
