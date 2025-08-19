"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe("Cart", () => {
    it("deve retornar o carrinho do usuário", async () => {
        const res = await (0, supertest_1.default)(app_1.default).get("/api/cart");
        expect([200, 401]).toContain(res.statusCode);
        if (res.statusCode === 200) {
            expect(res.body).toHaveProperty("equipments");
        }
    });
});
