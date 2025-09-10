import request from "supertest";
import app from "../../app";

describe("Users", () => {
  it("deve listar usuários (admin ou autenticado)", async () => {
    const res = await request(app).get("/api/users");
    expect([200, 401, 403]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });
});
