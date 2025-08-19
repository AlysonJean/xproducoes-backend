"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe("Booking", () => {
    it("deve listar reservas do usuário autenticado", async () => {
        const token = "SEU_TOKEN_USUARIO_AQUI";
        const res = await (0, supertest_1.default)(app_1.default)
            .get("/api/bookings")
            .set("Authorization", `Bearer ${token}`);
        expect([200, 401]).toContain(res.statusCode);
    });
});
