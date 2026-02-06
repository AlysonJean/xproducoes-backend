import request from "supertest";
import app from "../../app";

describe("Portfolio", () => {
  it("deve listar portfólios", async () => {
    const res = await request(app).get("/api/portfolio");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
