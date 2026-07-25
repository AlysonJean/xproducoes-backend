// Teste de regressão do achado #4 (Alto) da auditoria adversarial: POST
// /public/social/upload/:slug é um endpoint público (sem login, por design — QR code de
// evento) que aceitava qualquer arquivo sem checar a assinatura binária real (magic bytes)
// e sem limite de tamanho. Mantém multer/fileFilter/limits REAIS (não mockados) para provar
// que o pipeline de validação inteiro funciona de ponta a ponta — só a chamada de rede ao
// Cloudinary é substituída.
//
// Correção ao relatório original: o achado dizia "sem rate limit" — falso por completo.
// Existe `createApiRateLimiter` (app.ts, global, 50 req/15min por IP) aplicado a TODO
// /api/v1/*, então este endpoint sempre teve algum limite. O que faltava era um limite
// PRÓPRIO e mais apertado para uma operação cara (upload real para o Cloudinary): em
// produção `uploadRateLimit` é 10/5min contra os 50/15min genéricos — um aperto real, não a
// criação de proteção onde não havia nenhuma. Em ambiente de teste/dev os dois limites
// coincidem em 50, então o teste abaixo não consegue distinguir qual dos dois disparou —
// documentado aqui para não reivindicar uma prova que este teste não dá.
import request from "supertest";
import { UploadService } from "../../services/uploadService";

jest.mock("../../config/prisma", () => ({
  prisma: {
    eventSocialSetting: { findUnique: jest.fn() },
    socialPost: { create: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../../app").default;
const { prisma } = require("../../config/prisma");

const REAL_JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const FAKE_BYTES_CLAIMING_JPEG = Buffer.from("<html><body>não sou uma imagem de verdade</body></html>");

describe("POST /api/v1/public/social/upload/:slug — validação (achado #4)", () => {
  let uploadFileSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    uploadFileSpy = jest.spyOn(UploadService.prototype, "uploadFile").mockResolvedValue("https://cloudinary.fake/img.jpg");
    prisma.eventSocialSetting.findUnique.mockResolvedValue({ id: "setting-1", autoApprove: false });
    prisma.socialPost.create.mockResolvedValue({ id: "post-1", status: "PENDING" });
  });

  afterEach(() => uploadFileSpy.mockRestore());

  it("rejeita arquivo cujo conteúdo real não bate com o mimetype declarado (magic bytes)", async () => {
    const res = await request(app)
      .post("/api/v1/public/social/upload/evento-teste")
      .attach("image", FAKE_BYTES_CLAIMING_JPEG, { filename: "foto.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
    expect(uploadFileSpy).not.toHaveBeenCalled();
  });

  it("rejeita mimetype fora da lista permitida (ex.: executável disfarçado)", async () => {
    const res = await request(app)
      .post("/api/v1/public/social/upload/evento-teste")
      .attach("image", Buffer.from("MZ fake exe header"), {
        filename: "virus.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(400);
    expect(uploadFileSpy).not.toHaveBeenCalled();
  });

  it("aceita um JPEG real cujo conteúdo bate com o mimetype declarado", async () => {
    const res = await request(app)
      .post("/api/v1/public/social/upload/evento-teste")
      .attach("image", REAL_JPEG_HEADER, { filename: "foto.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(uploadFileSpy).toHaveBeenCalledWith(expect.objectContaining({ mimetype: "image/jpeg" }), "social_direct");
  });

  it("aplica rate limit por IP no endpoint (50 = limite de teste/dev, a 51ª request recebe 429)", async () => {
    let last: request.Response | undefined;
    for (let i = 0; i < 51; i++) {
      // eslint-disable-next-line no-await-in-loop
      last = await request(app).post("/api/v1/public/social/upload/evento-teste");
    }
    expect(last?.status).toBe(429);
  }, 20000);
});
