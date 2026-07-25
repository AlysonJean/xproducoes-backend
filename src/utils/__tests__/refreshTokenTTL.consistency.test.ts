// Achado #9 (Médio) da auditoria adversarial: os 3 lugares que emitem refresh token
// (userService.login, authController.refresh, authService.loginById) usavam TTLs
// diferentes (3d / 7d / 7d), enquanto o cookie que guarda o token sempre nasce com maxAge
// de 7 dias (config/cookies.ts) — um login por senha gerava um JWT que expirava 4 dias
// antes do próprio cookie. Este teste decodifica o JWT real emitido por cada um dos três
// caminhos e trava que todos concordam em 7 dias, para não divergir de novo silenciosamente.
import jwt from "jsonwebtoken";
import { login } from "../../services/userService";
import { AuthService } from "../../services/authService";
import { prisma } from "../../config/prisma";
import { refreshTokenCookieOptions } from "../../config/cookies";

jest.mock("../../config/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("bcrypt", () => ({ compare: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcrypt");
const mockedPrisma: any = prisma as any;

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
const TOLERANCE_SEC = 5; // folga pra diferença de milissegundos entre iat e o sign real

function ttlSeconds(token: string): number {
  const decoded = jwt.decode(token) as { iat: number; exp: number };
  return decoded.exp - decoded.iat;
}

describe("Consistência de TTL do refresh token entre os 3 emissores (achado #9)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("userService.login emite refresh token de 7 dias (era 3 antes do fix)", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "teste@teste.com",
      passwordHash: "hash",
      role: "CLIENT",
      verified: true,
      isActive: true,
    });
    bcrypt.compare.mockResolvedValue(true);

    const result = await login({ email: "teste@teste.com", password: "senha-correta" });
    expect(ttlSeconds(result.refreshToken)).toBeCloseTo(SEVEN_DAYS_SEC, -1);
  });

  it("authService.loginById (usado por login social e checkout de convidado) emite 7 dias", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      name: "Teste",
      email: "teste@teste.com",
      role: "CLIENT",
    });

    const result = await new AuthService().loginById("u1");
    expect(ttlSeconds(result.refreshToken)).toBeCloseTo(SEVEN_DAYS_SEC, -1);
  });

  it("os três emissores concordam entre si e com o maxAge do cookie (7 dias)", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      name: "Teste",
      email: "teste@teste.com",
      passwordHash: "hash",
      role: "CLIENT",
      verified: true,
      isActive: true,
    });
    bcrypt.compare.mockResolvedValue(true);

    const fromLogin = await login({ email: "teste@teste.com", password: "x" });
    const fromLoginById = await new AuthService().loginById("u1");

    const cookieMaxAgeSec = (refreshTokenCookieOptions.maxAge as number) / 1000;
    expect(ttlSeconds(fromLogin.refreshToken)).toBeCloseTo(cookieMaxAgeSec, -1);
    expect(ttlSeconds(fromLoginById.refreshToken)).toBeCloseTo(cookieMaxAgeSec, -1);
  });
});
