import request from "supertest";
import app from "../app";

describe("Category", () => {
  it("deve listar categorias", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
