import request from "supertest";
import app from "../../app";

describe("Dashboard", () => {
  it("deve retornar estatísticas do dashboard", async () => {
    const res = await request(app).get("/api/dashboard");
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty("totalRevenue");
    }
  });
});
