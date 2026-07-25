// Achado #3 da auditoria adversarial — CORRIGIDO NA APURAÇÃO, não é o que o relatório
// original dizia: `sponsorRoutes.ts` de fato não declarava `requireAdmin` na sua própria
// cadeia de middleware, mas ao rastrear o caminho REAL da requisição (o que a auditoria
// original não fez — leu o arquivo isolado, não o roteamento completo) descobri que
// "/admin/sponsors" já era interceptado ANTES por `adminRoutes.ts`: `router.use("/admin",
// adminRoutes)` é registrado antes de `router.use("/admin/sponsors", sponsorRoutes)`
// (routes/index.ts), e `adminRoutes.use(authenticateWithDB, requireAdmin)` roda
// incondicionalmente para qualquer sub-caminho de "/admin" — inclusive "/sponsors", que não
// bate com nenhuma rota própria de adminRoutes, mas isso só é decidido DEPOIS do middleware
// já ter rodado. Confirmado empiricamente abaixo: rodando este teste contra o
// sponsorRoutes.ts ORIGINAL (sem nenhuma mudança), CLIENT já recebia 403.
//
// Ou seja: nunca foi explorável em produção. Mantive a correção (requireAdmin explícito em
// sponsorRoutes.ts) como blindagem — não depender de um efeito colateral de ordem de
// registro de rotas para a autorização real é a prática correta, e barra a lógica de
// autorização mais perto do handler, como o resto do código-base já faz — mas rebaixei a
// severidade de Alto para Baixo/defesa-em-profundidade no relatório e documentei o
// falso-positivo. Este teste agora prova as DUAS coisas: (1) o comportamento correto
// permanece correto com o fix, e (2) serve de regressão caso a ordem de montagem das rotas
// mude no futuro e o gate incidental do adminRoutes deixe de cobrir este path.
import request from "supertest";
import jwt from "jsonwebtoken";
import { config } from "../../config/environment";

jest.mock("../../config/prisma", () => ({
  prisma: {
    sponsorLogo: { create: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
    // authenticateWithDB (adminRoutes.ts) revalida isActive/role no banco a cada request —
    // precisa estar mockado mesmo este teste sendo "sobre" sponsorRoutes.ts, porque é o
    // primeiro gate que a requisição real atravessa.
    user: { findUnique: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../../app").default;
const { prisma } = require("../../config/prisma");

function signAccessToken(role: "CLIENT" | "ADMIN") {
  return jwt.sign({ userId: `user-${role.toLowerCase()}`, role, type: "access" }, config.jwtSecret, {
    expiresIn: "15m",
  });
}

describe("/api/v1/admin/sponsors — autorização (achado #3, reclassificado)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.sponsorLogo.findMany.mockResolvedValue([]);
    prisma.sponsorLogo.delete.mockResolvedValue({ id: "sponsor-1" });
    prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        email: `${where.id}@teste.com`,
        role: where.id.includes("admin") ? "ADMIN" : "CLIENT",
        isActive: true,
      }),
    );
  });

  it("bloqueia CLIENT em GET com 403", async () => {
    const token = signAccessToken("CLIENT");
    const res = await request(app).get("/api/v1/admin/sponsors").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("bloqueia CLIENT em DELETE com 403", async () => {
    const token = signAccessToken("CLIENT");
    const res = await request(app)
      .delete("/api/v1/admin/sponsors/sponsor-1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(prisma.sponsorLogo.delete).not.toHaveBeenCalled();
  });

  it("bloqueia CLIENT em POST com 403 (barrado antes mesmo do multer processar o arquivo)", async () => {
    const token = signAccessToken("CLIENT");
    const res = await request(app)
      .post("/api/v1/admin/sponsors")
      .set("Authorization", `Bearer ${token}`)
      .field("name", "Patrocinador Forjado");
    expect(res.status).toBe(403);
    expect(prisma.sponsorLogo.create).not.toHaveBeenCalled();
  });

  it("permite ADMIN em GET", async () => {
    const token = signAccessToken("ADMIN");
    const res = await request(app).get("/api/v1/admin/sponsors").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
