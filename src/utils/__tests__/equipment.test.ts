import request from "supertest";
import app from "../../app";

describe("Equipment", () => {
  it("deve listar equipamentos", async () => {
    const res = await request(app).get("/api/equipments");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
