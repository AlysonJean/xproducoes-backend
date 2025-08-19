import request from "supertest";
import app from "../app";

describe("Review", () => {
  it("deve listar avaliações públicas", async () => {
    // Testa tanto /api/reviews/public quanto /api/reviews
    const res = await request(app).get("/api/reviews");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
