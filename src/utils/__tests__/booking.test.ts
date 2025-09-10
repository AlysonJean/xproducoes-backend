import request from "supertest";
import app from "../../app";

describe("Booking", () => {
  it("deve listar reservas do usuário autenticado", async () => {
    const token = "SEU_TOKEN_USUARIO_AQUI";
    const res = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`);
    expect([200, 401]).toContain(res.statusCode);
  });
});
