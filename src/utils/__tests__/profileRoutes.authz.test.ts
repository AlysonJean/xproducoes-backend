// Teste de regressão do achado crítico da auditoria adversarial (2026-07-24/25):
// /api/v1/profile/collaborators, /collaborators/:id e /clients vazavam dado de QUALQUER
// outro usuário (incluindo passwordHash/tokens, no caso de collaborators) para qualquer
// conta autenticada, sem checagem de role. Este teste reproduz o ataque (chamar como
// CLIENT) e comprova o bloqueio, além de travar o formato real da query Prisma para que
// uma futura regressão a `include` (sem `select`) quebre o teste mesmo com Prisma mockado.
import request from "supertest";
import jwt from "jsonwebtoken";
import { config } from "../../config/environment";

jest.mock("../../config/prisma", () => ({
  prisma: {
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock("../../services/clientService", () => ({
  listClientsWithProfiles: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../../app").default;
const { prisma } = require("../../config/prisma");
const clientService = require("../../services/clientService");

function signAccessToken(role: "CLIENT" | "COLLABORATOR" | "ADMIN") {
  return jwt.sign(
    { userId: `user-${role.toLowerCase()}`, role, type: "access" },
    config.jwtSecret,
    { expiresIn: "15m" },
  );
}

const fakeCollaboratorRow = {
  id: "collab-1",
  name: "Colaborador Teste",
  email: "colab@teste.com",
  avatarUrl: null,
  role: "COLLABORATOR",
  bio: null,
  location: null,
  website: null,
  socialLinks: null,
  isVip: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  collaboratorProfile: { id: "cp-1", averageRating: 4.8 },
};

describe("GET /api/v1/profile/collaborators — autorização (achado crítico)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([fakeCollaboratorRow]);
    prisma.user.findUnique.mockResolvedValue(fakeCollaboratorRow);
    clientService.listClientsWithProfiles.mockResolvedValue([]);
  });

  it("bloqueia CLIENT com 403 (antes da correção, isto retornava 200 + passwordHash de outros usuários)", async () => {
    const token = signAccessToken("CLIENT");
    const res = await request(app)
      .get("/api/v1/profile/collaborators")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("bloqueia CLIENT em /collaborators/:id com 403", async () => {
    const token = signAccessToken("CLIENT");
    const res = await request(app)
      .get("/api/v1/profile/collaborators/collab-1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("bloqueia CLIENT em /clients com 403", async () => {
    const token = signAccessToken("CLIENT");
    const res = await request(app)
      .get("/api/v1/profile/clients")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("permite ADMIN, e a query ao Prisma usa `select` seguro (sem passwordHash/tokens, sem `include` cru)", async () => {
    const token = signAccessToken("ADMIN");
    const res = await request(app)
      .get("/api/v1/profile/collaborators")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    const callArgs = prisma.user.findMany.mock.calls[0][0];
    expect(callArgs.include).toBeUndefined();
    expect(callArgs.select).toBeDefined();
    expect(callArgs.select.passwordHash).toBeUndefined();
    expect(callArgs.select.passwordResetToken).toBeUndefined();
    expect(callArgs.select.emailVerificationToken).toBeUndefined();
    expect(callArgs.select.googleRefreshToken).toBeUndefined();
  });

  it("permite COLLABORATOR em /collaborators/:id, com select seguro na busca por id", async () => {
    const token = signAccessToken("COLLABORATOR");
    const res = await request(app)
      .get("/api/v1/profile/collaborators/collab-1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const callArgs = prisma.user.findUnique.mock.calls[0][0];
    expect(callArgs.include).toBeUndefined();
    expect(callArgs.select).toBeDefined();
    expect(callArgs.select.passwordHash).toBeUndefined();
  });

  it("permite ADMIN em /clients (dado já filtrado pelo clientService, não pelo profileController)", async () => {
    const token = signAccessToken("ADMIN");
    const res = await request(app)
      .get("/api/v1/profile/clients")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("sem token, retorna 401 (não 403) — confirma que o gate de staff vem depois do gate de autenticação", async () => {
    const res = await request(app).get("/api/v1/profile/collaborators");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/collaborators/:id — autorização (achado médio, mesma classe)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("bloqueia CLIENT com 403", async () => {
    const token = signAccessToken("CLIENT");
    const res = await request(app)
      .get("/api/v1/collaborators/collab-1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
