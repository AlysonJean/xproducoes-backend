"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe("Review", () => {
    it("deve listar avaliações públicas", async () => {
        // Testa tanto /api/reviews/public quanto /api/reviews
        const res = await (0, supertest_1.default)(app_1.default).get("/api/reviews");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
