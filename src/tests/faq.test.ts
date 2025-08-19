import request from "supertest";
import app from "../app";

describe("FAQ", () => {
  it("deve listar perguntas frequentes", async () => {
    const res = await request(app).get("/api/faq");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
