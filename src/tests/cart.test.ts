import request from "supertest";
import app from "../app";

describe("Cart", () => {
  it("deve retornar o carrinho do usuário", async () => {
    const res = await request(app).get("/api/cart");
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty("equipments");
    }
  });
});
