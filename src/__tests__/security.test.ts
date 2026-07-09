import { beforeAll, describe, expect, it, jest } from '@jest/globals';

// O rate limiter adaptativo de /api/v1/auth/* (app.ts) permite só 5 requisições
// a cada 15 min, sem exceção para NODE_ENV=test — com dezenas de testes batendo
// nesse prefixo ao longo deste arquivo, ele dispara e derruba testes não
// relacionados a rate limiting com 429. Neutralizado aqui (passthrough) porque
// não é o que esta suíte está testando; o comportamento real em produção não é
// afetado (isso só troca o middleware usado durante os testes deste arquivo).
jest.mock('../middlewares/adaptiveRateLimiter', () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return {
    createApiRateLimiter: () => passthrough,
    createAuthRateLimiter: () => passthrough,
    createUploadRateLimiter: () => passthrough,
    createCsrfRateLimiter: () => passthrough,
  };
});

// Mock do JWT para evitar dependência de env vars reais
jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken') as Record<string, unknown>;
  return {
    ...actual,
    verify: jest.fn((token: string) => {
      if (token === 'valid-admin-token') return { userId: 'admin-id', role: 'ADMIN', type: 'access' };
      if (token === 'valid-user-token') return { userId: 'user-id', role: 'CLIENT', type: 'access' };
      if (token === 'valid-collaborator-token') return { userId: 'collaborator-id', role: 'COLLABORATOR', type: 'access' };
      // Token de refresh válido (sem role de acesso) — usado para provar que
      // authenticate rejeita refresh tokens usados como access token.
      if (token === 'valid-refresh-token') return { userId: 'user-id', role: 'CLIENT', type: 'refresh' };
      // Token distinto só para o teste de rotação, para não colidir com o
      // blacklist real (em memória, persistente entre testes) deixado por
      // 'valid-refresh-token' em outro teste deste mesmo arquivo.
      if (token === 'valid-refresh-token-rotation-test') return { userId: 'user-id', role: 'CLIENT', type: 'refresh' };
      // Token "legado", emitido antes do campo `type` existir — deve ser
      // rejeitado por authenticate (não tem como saber se é access ou refresh).
      if (token === 'legacy-token-without-type') return { userId: 'user-id', role: 'CLIENT' };
      throw new Error('Invalid token');
    }),
  };
});

// Mock do Prisma para evitar conexões reais com banco
jest.mock('../config/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    sponsorLogo: { create: jest.fn(), findMany: jest.fn() },
    newsletterSubscriber: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    collaborator: { create: jest.fn() },
    client: { findFirst: jest.fn() },
    booking: { findUnique: jest.fn(), update: jest.fn() },
    appSettings: { findFirst: jest.fn(), upsert: jest.fn() },
    collaboratorPayment: { findMany: jest.fn() },
    review: { findUnique: jest.fn() },
    service: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    eventCollaborator: { findMany: jest.fn() },
    // Adicione outros modelos conforme necessário
  },
}));

// Mock do middleware de upload (multer) para não falhar
jest.mock('../middlewares/upload', () => ({
  uploadSingle: () => (req: any, res: any, next: any) => next(),
  uploadMultiple: () => (req: any, res: any, next: any) => next(),
  processUpload: (req: any, res: any, next: any) => {
    req.body.imageUrl = 'http://example.com/image.jpg'; // Simula upload
    req.file = {
      originalname: 'image.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
      size: 10,
    };
    next();
  },
}));

// Mock do multer para que a rota de sponsors tenha req.file disponível
jest.mock('multer', () => {
  const multerMock = () => ({
    single: () => (req: any, _res: any, next: any) => {
      req.file = {
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image'),
        size: 10,
      };
      next();
    },
    array: () => (req: any, _res: any, next: any) => next(),
    fields: () => (req: any, _res: any, next: any) => next(),
  });
  multerMock.memoryStorage = () => ({});
  multerMock.diskStorage = () => ({});
  return multerMock;
});

// Mock do UploadService para evitar chamadas reais ao Cloudinary
jest.mock('../services/uploadService', () => ({
  UploadService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn().mockResolvedValue('http://res.cloudinary.com/test/image.jpg'),
    getCloudinaryMulterConfig: jest.fn().mockReturnValue({
      single: () => (req: any, _res: any, next: any) => {
        req.file = {
          originalname: 'image.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('fake-image'),
          size: 10,
        };
        next();
      },
      array: () => (req: any, _res: any, next: any) => next(),
      fields: () => (req: any, _res: any, next: any) => next(),
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  })),
}));

import request from 'supertest';
import bcrypt from 'bcrypt';

let app: typeof import('../app').default;
let prisma: any;

beforeAll(async () => {
  ({ default: app } = await import('../app'));
  ({ prisma } = await import('../config/prisma'));
});

describe('🛡️ Security Blindagem Tests', () => {
  
  describe('Public Routes - Input Validation', () => {
    it('POST /newsletter/subscribe - deve rejeitar body vazio (400)', async () => {
      const res = await request(app)
        .post('/api/v1/newsletter/subscribe')
        .send({});
      
      expect(res.status).toBe(400);
      // validateBody retorna { message, errors } sem campo success
      expect(JSON.stringify(res.body)).toContain('email'); // Deve reclamar do email
    });

    it('POST /newsletter/subscribe - deve rejeitar email inválido (400)', async () => {
      const res = await request(app)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: 'invalid-email' });
      
      expect(res.status).toBe(400);
    });

    it('POST /newsletter/subscribe - deve aceitar email válido (200/201)', async () => {
      // Mock prisma response - controller usa newsletterSubscriber
      (prisma.newsletterSubscriber.findUnique as jest.Mock<any>).mockResolvedValue(null);
      (prisma.newsletterSubscriber.create as jest.Mock<any>).mockResolvedValue({ id: '1', email: 'test@test.com' });

      const res = await request(app)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: 'test@test.com' });
      
      expect(res.status).toBe(201);
    });
  });

  describe('Protected Routes - Authentication & Authorization', () => {
    // POST /admin/sponsors passa primeiro pelo gate de adminRoutes.ts (o prefixo
    // /admin/sponsors também bate no mount de /admin — mesma sobreposição de rota
    // já vista em socialRoutes), que agora usa authenticateWithDB e por isso
    // precisa de um usuário ativo mockado no banco para deixar passar o token.
    afterEach(() => {
      (prisma.user.findUnique as jest.Mock<any>).mockReset();
    });

    it('POST /admin/sponsors - deve rejeitar sem token (401)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .send({ name: 'Sponsor X' });

      expect(res.status).toBe(401);
    });

    it('POST /admin/sponsors - deve rejeitar token de usuário comum (403)', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'user-id', email: 'user@example.com', role: 'CLIENT', isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .set('Authorization', 'Bearer valid-user-token') // Mockado para role CLIENT
        .send({ name: 'Sponsor X' });

      expect(res.status).toBe(403);
    });

    it('POST /admin/sponsors - deve rejeitar body inválido mesmo com admin (400)', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({}); // Sem name

      expect(res.status).toBe(400);
    });

    it('POST /admin/sponsors - deve aceitar requisição válida de admin (200/201)', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', isActive: true,
      });
      (prisma.sponsorLogo.create as jest.Mock<any>).mockResolvedValue({ id: '1', name: 'Sponsor Valid' });

      // O mock do multer já injeta req.file, enviamos o name como JSON
      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .set('Authorization', 'Bearer valid-admin-token')
        .set('Content-Type', 'application/json')
        .send({ name: 'Sponsor Valid' });

      expect(res.status).toBe(200);
    });
  });

  describe('Collaborator Routes - Advanced Validation', () => {
    it('POST /collaborators - deve validar enum de Role (400)', async () => {
      const res = await request(app)
        .post('/api/v1/collaborators')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          name: 'Collab',
          email: 'c@c.com',
          role: 'INVALID_ROLE'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Social Login - Bloqueio do bypass de autenticação via "modo legado"', () => {
    it('POST /auth/social/google - deve rejeitar (400) quando accessToken não é enviado, mesmo com userData.email de uma conta existente', async () => {
      const res = await request(app)
        .post('/api/v1/auth/social/google')
        .send({ provider: 'google', userData: { email: 'vitima@example.com' } });

      expect(res.status).toBe(400);
      // Nunca deve consultar o banco por esse e-mail: a requisição tem que ser
      // barrada na validação do schema, antes de qualquer lógica de login/registro.
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('POST /auth/social/facebook - deve rejeitar (400) quando accessToken não é enviado', async () => {
      const res = await request(app)
        .post('/api/v1/auth/social/facebook')
        .send({ provider: 'facebook', userData: { email: 'vitima2@example.com' } });

      expect(res.status).toBe(400);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('POST /auth/social/google - deve rejeitar (400) quando accessToken é string vazia', async () => {
      const res = await request(app)
        .post('/api/v1/auth/social/google')
        .send({ provider: 'google', accessToken: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /users - restrição de acesso a admin e paginação', () => {
    it('deve rejeitar sem token (401)', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
    });

    it('deve rejeitar token de usuário comum (403) - antes vazava a lista de todos os usuários', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-user-token'); // role CLIENT, mockado no topo do arquivo

      expect(res.status).toBe(403);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('deve aceitar token de admin (200) e retornar a lista paginada', async () => {
      (prisma.user.findMany as jest.Mock<any>).mockResolvedValue([
        { id: 'u1', name: 'Fulano', email: 'fulano@example.com', role: 'CLIENT' },
      ]);
      (prisma.user.count as jest.Mock<any>).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toEqual(
        expect.objectContaining({ page: 1, limit: 20, total: 1 })
      );
    });
  });

  describe('PUT /bookings/:id/confirm e /cancel - IDOR (dono ou admin)', () => {
    afterEach(() => {
      (prisma.client.findFirst as jest.Mock<any>).mockReset();
      (prisma.booking.findUnique as jest.Mock<any>).mockReset();
      (prisma.booking.update as jest.Mock<any>).mockReset();
    });

    it('CLIENT não pode confirmar reserva de outro cliente (403)', async () => {
      (prisma.client.findFirst as jest.Mock<any>).mockResolvedValue({ id: 'client-mine' });
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ id: 'booking-1', clientId: 'client-outro' });

      const res = await request(app)
        .put('/api/v1/bookings/booking-1/confirm')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('CLIENT não pode cancelar reserva de outro cliente (403)', async () => {
      (prisma.client.findFirst as jest.Mock<any>).mockResolvedValue({ id: 'client-mine' });
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ id: 'booking-1', clientId: 'client-outro' });

      const res = await request(app)
        .put('/api/v1/bookings/booking-1/cancel')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ reason: 'teste' });

      expect(res.status).toBe(403);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('CLIENT pode cancelar a própria reserva (200)', async () => {
      (prisma.client.findFirst as jest.Mock<any>).mockResolvedValue({ id: 'client-mine' });
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ id: 'booking-1', clientId: 'client-mine' });
      (prisma.booking.update as jest.Mock<any>).mockResolvedValue({ id: 'booking-1', clientId: 'client-mine', status: 'CANCELLED' });

      const res = await request(app)
        .put('/api/v1/bookings/booking-1/cancel')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ reason: 'não vou precisar mais' });

      expect(res.status).toBe(200);
      expect(prisma.booking.update).toHaveBeenCalled();
    });

    it('ADMIN pode confirmar reserva de qualquer cliente (200)', async () => {
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ id: 'booking-1', clientId: 'client-outro' });
      (prisma.booking.update as jest.Mock<any>).mockResolvedValue({ id: 'booking-1', clientId: 'client-outro', status: 'CONFIRMED' });

      const res = await request(app)
        .put('/api/v1/bookings/booking-1/confirm')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      // Admin não deve nem precisar consultar o próprio registro de client
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('POST /users/change-password - deve realmente trocar a senha', () => {
    afterEach(() => {
      (prisma.user.findUnique as jest.Mock<any>).mockReset();
      (prisma.user.update as jest.Mock<any>).mockReset();
    });

    it('deve rejeitar (401) quando currentPassword está incorreta, e NUNCA gravar a nova senha', async () => {
      const realHash = await bcrypt.hash('senha-atual-correta', 10);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'user-id',
        passwordHash: realHash,
      });

      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ currentPassword: 'senha-errada', newPassword: 'NovaSenha123' });

      expect(res.status).toBe(401);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('deve trocar a senha de verdade (200) quando currentPassword está correta', async () => {
      const realHash = await bcrypt.hash('senha-atual-correta', 10);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'user-id',
        passwordHash: realHash,
      });
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({ id: 'user-id' });

      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ currentPassword: 'senha-atual-correta', newPassword: 'NovaSenha123' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id' },
          data: expect.objectContaining({ passwordHash: expect.any(String) }),
        })
      );
      // A nova senha gravada não pode ser a senha antiga nem texto puro
      const updateCall = (prisma.user.update as jest.Mock<any>).mock.calls[0][0];
      expect(updateCall.data.passwordHash).not.toBe(realHash);
      expect(updateCall.data.passwordHash).not.toBe('NovaSenha123');
    });
  });

  describe('PUT /settings - antes estava totalmente aberto (sem auth nenhuma)', () => {
    afterEach(() => {
      (prisma.appSettings.upsert as jest.Mock<any>).mockReset();
    });

    it('deve rejeitar (401) requisição sem token', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .send({ companyName: 'Hackeado' });

      expect(res.status).toBe(401);
      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('deve rejeitar (403) token de usuário comum', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ companyName: 'Hackeado' });

      expect(res.status).toBe(403);
      expect(prisma.appSettings.upsert).not.toHaveBeenCalled();
    });

    it('deve aceitar (200) token de admin', async () => {
      (prisma.appSettings.upsert as jest.Mock<any>).mockResolvedValue({ id: 'default', companyName: 'X Produções e Eventos' });

      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ companyName: 'X Produções e Eventos' });

      expect(res.status).toBe(200);
      expect(prisma.appSettings.upsert).toHaveBeenCalled();
    });
  });

  describe('POST /tv/pair - antes só exigia login, não admin (rota não protegida pelo gate de /admin)', () => {
    it('deve rejeitar (401) sem token', async () => {
      const res = await request(app).post('/api/v1/tv/pair').send({});
      expect(res.status).toBe(401);
    });

    it('deve rejeitar (403) token de usuário comum - antes qualquer CLIENT podia parear um dispositivo de TV', async () => {
      const res = await request(app)
        .post('/api/v1/tv/pair')
        .set('Authorization', 'Bearer valid-user-token')
        .send({});

      expect(res.status).toBe(403);
    });

    it('token de admin deve passar do gate de autorização (chega na validação de negócio, 400 por falta de eventId/settingId)', async () => {
      const res = await request(app)
        .post('/api/v1/tv/pair')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({});

      // 400 (não 401/403) prova que passou pela autenticação/autorização
      // e chegou na regra de negócio do controller.
      expect(res.status).toBe(400);
    });
  });

  describe('Pagamentos de colaborador - dados financeiros antes vazavam para qualquer autenticado', () => {
    afterEach(() => {
      (prisma.collaboratorPayment.findMany as jest.Mock<any>).mockReset();
    });

    it('GET /collaborators/:id/payments deve rejeitar (403) token de usuário comum', async () => {
      const res = await request(app)
        .get('/api/v1/collaborators/collab-1/payments')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
      expect(prisma.collaboratorPayment.findMany).not.toHaveBeenCalled();
    });

    it('GET /collaborators/:id/payments deve aceitar (200) token de admin', async () => {
      (prisma.collaboratorPayment.findMany as jest.Mock<any>).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/collaborators/collab-1/payments')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
    });

    it('GET /collaborator-payments (todos os pagamentos) deve rejeitar (403) token de usuário comum', async () => {
      const res = await request(app)
        .get('/api/v1/collaborator-payments')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
      expect(prisma.collaboratorPayment.findMany).not.toHaveBeenCalled();
    });

    it('GET /collaborator-payments/collaborator/:id/stats deve rejeitar (403) token de usuário comum', async () => {
      const res = await request(app)
        .get('/api/v1/collaborator-payments/collaborator/collab-1/stats')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
    });
  });

  describe('PUT/DELETE /reviews/:id - IDOR (antes qualquer autenticado editava/apagava avaliação de outrem)', () => {
    afterEach(() => {
      (prisma.review.findUnique as jest.Mock<any>).mockReset();
    });

    it('PUT /reviews/:id deve rejeitar (403) quando a avaliação pertence a outro usuário', async () => {
      (prisma.review.findUnique as jest.Mock<any>).mockResolvedValue({ reviewerId: 'outro-user-id' });

      const res = await request(app)
        .put('/api/v1/reviews/review-1')
        .set('Authorization', 'Bearer valid-user-token') // userId: 'user-id'
        .send({ comment: 'editado por invasor' });

      expect(res.status).toBe(403);
    });

    it('DELETE /reviews/:id deve rejeitar (403) quando a avaliação pertence a outro usuário', async () => {
      (prisma.review.findUnique as jest.Mock<any>).mockResolvedValue({ reviewerId: 'outro-user-id' });

      const res = await request(app)
        .delete('/api/v1/reviews/review-1')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
    });

    it('ADMIN pode editar avaliação de qualquer usuário (não recebe 403)', async () => {
      (prisma.review.findUnique as jest.Mock<any>).mockResolvedValue({ reviewerId: 'outro-user-id' });

      const res = await request(app)
        .put('/api/v1/reviews/review-1')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ comment: 'ajuste administrativo' });

      expect(res.status).not.toBe(403);
    });
  });

  describe('Serviços (catálogo) - create/update/delete abertos a qualquer autenticado', () => {
    afterEach(() => {
      (prisma.service.create as jest.Mock<any>).mockReset();
      (prisma.service.update as jest.Mock<any>).mockReset();
      (prisma.service.delete as jest.Mock<any>).mockReset();
      (prisma.service.findUnique as jest.Mock<any>).mockReset();
    });

    it('POST /services deve rejeitar (403) token de usuário comum', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ name: 'Serviço Fake', description: 'Descrição fake', price: 100 });

      expect(res.status).toBe(403);
      expect(prisma.service.create).not.toHaveBeenCalled();
    });

    it('PUT /services/:id deve rejeitar (403) token de usuário comum', async () => {
      const res = await request(app)
        .put('/api/v1/services/service-1')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ name: 'Alterado por invasor' });

      expect(res.status).toBe(403);
      expect(prisma.service.update).not.toHaveBeenCalled();
    });

    it('DELETE /services/:id deve rejeitar (403) token de usuário comum', async () => {
      const res = await request(app)
        .delete('/api/v1/services/service-1')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
      expect(prisma.service.delete).not.toHaveBeenCalled();
    });

    it('POST /services deve aceitar (201) token de admin', async () => {
      (prisma.service.findUnique as jest.Mock<any>).mockResolvedValue(null);
      (prisma.service.create as jest.Mock<any>).mockResolvedValue({ id: 'service-1', name: 'Serviço Fake' });

      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ name: 'Serviço Fake', description: 'Descrição fake', price: 100 });

      expect(res.status).toBe(201);
      expect(prisma.service.create).toHaveBeenCalled();
    });
  });

  describe('Dados operacionais de colaborador (events/availabilities/stats) - antes visíveis a qualquer CLIENT', () => {
    // beforeEach (não só afterEach): uma chamada assíncrona "fire-and-forget" deixada
    // pendente por um teste anterior (bookingService.notifyCollaborators, disparado sem
    // await no fluxo de confirm) pode resolver entre um teste e outro e incrementar essa
    // mesma mock — reseta antes de cada teste aqui para não depender da ordem de execução.
    beforeEach(() => {
      (prisma.eventCollaborator.findMany as jest.Mock<any>).mockReset();
    });
    afterEach(() => {
      (prisma.eventCollaborator.findMany as jest.Mock<any>).mockReset();
    });

    it('GET /collaborators/:id/events deve rejeitar (403) token de CLIENT', async () => {
      const res = await request(app)
        .get('/api/v1/collaborators/collab-1/events')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
      expect(prisma.eventCollaborator.findMany).not.toHaveBeenCalled();
    });

    it('GET /collaborators/:id/events deve aceitar token de COLLABORATOR (não deve quebrar coordenação de equipe)', async () => {
      (prisma.eventCollaborator.findMany as jest.Mock<any>).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/collaborators/collab-1/events')
        .set('Authorization', 'Bearer valid-collaborator-token');

      expect(res.status).toBe(200);
    });

    it('GET /collaborators/:id/stats deve rejeitar (403) token de CLIENT', async () => {
      const res = await request(app)
        .get('/api/v1/collaborators/collab-1/stats')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
    });

    // Nota: GET /collaborators/availabilities (sem :id) não é testado aqui porque
    // a rota /:id (registrada antes, linha 81 de collaboratorRoutes.ts) intercepta
    // esse path primeiro ("availabilities" é lido como um ID de colaborador) —
    // um bug de ordenação de rotas pré-existente e não relacionado a esta correção.
    // O requireAdminOrCollaborator foi adicionado mesmo assim, para quando esse
    // bug de ordenação for corrigido à parte.

    it('GET /collaborators/events/:eventId/collaborators deve rejeitar (403) token de CLIENT', async () => {
      const res = await request(app)
        .get('/api/v1/collaborators/events/event-1/collaborators')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
    });
  });

  describe('Pagamentos por reserva - IDOR (antes qualquer autenticado via bookingId de outrem) + Fase 1: endpoints desativados (501) até haver gateway real', () => {
    afterEach(() => {
      (prisma.client.findFirst as jest.Mock<any>).mockReset();
      (prisma.booking.findUnique as jest.Mock<any>).mockReset();
    });

    it('GET /payments/booking/:bookingId deve rejeitar (403) quando a reserva não pertence ao cliente', async () => {
      (prisma.client.findFirst as jest.Mock<any>).mockResolvedValue({ id: 'client-mine' });
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ clientId: 'client-outro' });

      const res = await request(app)
        .get('/api/v1/payments/booking/booking-1')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
    });

    it('GET /payments/booking/:bookingId - dono autorizado recebe 501 (recurso desativado), não dados falsos', async () => {
      (prisma.client.findFirst as jest.Mock<any>).mockResolvedValue({ id: 'client-mine' });
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ clientId: 'client-mine' });

      const res = await request(app)
        .get('/api/v1/payments/booking/booking-1')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(501);
      expect(res.body.code).toBe('PAYMENT_NOT_AVAILABLE');
    });

    it('POST /payments/create-intent/:bookingId deve rejeitar (403) quando a reserva não pertence ao cliente', async () => {
      (prisma.client.findFirst as jest.Mock<any>).mockResolvedValue({ id: 'client-mine' });
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ clientId: 'client-outro' });

      const res = await request(app)
        .post('/api/v1/payments/create-intent/booking-1')
        .set('Authorization', 'Bearer valid-user-token');

      expect(res.status).toBe(403);
    });

    it('ADMIN não precisa ter registro de client para acessar (recebe 501, recurso desativado)', async () => {
      (prisma.booking.findUnique as jest.Mock<any>).mockResolvedValue({ clientId: 'client-outro' });

      const res = await request(app)
        .get('/api/v1/payments/booking/booking-1')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(501);
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
    });

    it('GET /payments/all e /payments/stats (admin) também retornam 501, não mais totalRevenue fictício', async () => {
      const resAll = await request(app)
        .get('/api/v1/payments/all')
        .set('Authorization', 'Bearer valid-admin-token');
      const resStats = await request(app)
        .get('/api/v1/payments/stats')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(resAll.status).toBe(501);
      expect(resStats.status).toBe(501);
      expect(JSON.stringify(resStats.body)).not.toContain('125000');
    });

    it('POST /payments/webhook sem STRIPE_WEBHOOK_SECRET configurado retorna 503, não "received: true" para qualquer POST', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send({ type: 'payment_intent.succeeded' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Tipo de token (access/refresh) e rotação do refresh - antes eram intercambiáveis', () => {
    afterEach(() => {
      (prisma.user.findUnique as jest.Mock<any>).mockReset();
    });

    it('GET /auth/me rejeita (401) um refresh token usado como access token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-refresh-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN_TYPE');
    });

    it('GET /auth/me rejeita (401) um token "legado" sem o campo type (força novo login)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer legacy-token-without-type');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN_TYPE');
    });

    it('POST /auth/refresh rejeita um access token apresentado como refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-admin-token' }); // type:'access', não 'refresh'

      expect(res.status).toBe(401);
    });

    it('POST /auth/refresh aceita um refresh token válido e emite novos tokens', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'user-id', name: 'Fulano', email: 'fulano@example.com', role: 'CLIENT', isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
    });

    it('rotação: o mesmo refresh token não pode ser usado uma segunda vez (reuse detection)', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'user-id', name: 'Fulano', email: 'fulano@example.com', role: 'CLIENT', isActive: true,
      });

      const first = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token-rotation-test' });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token-rotation-test' });

      expect(second.status).toBe(401);
    });
  });

  describe('Rotas admin agora revalidam isActive no banco (authenticateWithDB) — token válido não bastava mais', () => {
    afterEach(() => {
      (prisma.user.findUnique as jest.Mock<any>).mockReset();
    });

    it('GET /admin/clients rejeita (401) admin com isActive=false no banco, mesmo com JWT válido', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', isActive: false,
      });

      const res = await request(app)
        .get('/api/v1/admin/clients')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('USER_INACTIVE');
    });

    it('GET /dashboard rejeita (401) admin desativado no banco', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', isActive: false,
      });

      const res = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('USER_INACTIVE');
    });

    it('GET /whatsapp/status rejeita (401) admin desativado no banco', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', isActive: false,
      });

      const res = await request(app)
        .get('/api/v1/whatsapp/status')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('USER_INACTIVE');
    });

    it('GET /monitoring/dashboard rejeita (401) admin desativado no banco', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', isActive: false,
      });

      const res = await request(app)
        .get('/api/v1/monitoring/dashboard')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('USER_INACTIVE');
    });

    it('admin com isActive=true continua passando do gate de autenticação (não recebe 401 USER_INACTIVE)', async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: 'admin-id', email: 'admin@example.com', role: 'ADMIN', isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/whatsapp/status')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.body.code).not.toBe('USER_INACTIVE');
      expect(res.status).not.toBe(401);
    });
  });

  describe('Swagger fechado em produção - antes expunha rotas/DTOs internos publicamente', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalInternalKey = process.env.INTERNAL_API_KEY;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.INTERNAL_API_KEY = originalInternalKey;
    });

    it('em produção, GET /api/docs.json rejeita (401) sem X-Internal-Key', async () => {
      process.env.NODE_ENV = 'production';
      process.env.INTERNAL_API_KEY = 'test-internal-key';

      const res = await request(app).get('/api/docs.json');

      expect(res.status).toBe(401);
    });

    it('em produção, GET /api/docs.json aceita com X-Internal-Key correta', async () => {
      process.env.NODE_ENV = 'production';
      process.env.INTERNAL_API_KEY = 'test-internal-key';

      const res = await request(app)
        .get('/api/docs.json')
        .set('X-Internal-Key', 'test-internal-key');

      expect(res.status).not.toBe(401);
    });

    it('fora de produção, GET /api/docs.json continua aberto sem chave (comportamento de dev preservado)', async () => {
      process.env.NODE_ENV = 'test';

      const res = await request(app).get('/api/docs.json');

      expect(res.status).not.toBe(401);
    });
  });

  describe('searchRateLimit agora está de fato aplicado às rotas de busca (antes existia mas não era usado em nenhuma)', () => {
    it('GET /equipment/search carrega o rate limiter (cabeçalho RateLimit-Limit presente)', async () => {
      const res = await request(app).get('/api/v1/equipment/search?q=camera');
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });

    it('GET /collaborators/search carrega o rate limiter (cabeçalho RateLimit-Limit presente)', async () => {
      const res = await request(app)
        .get('/api/v1/collaborators/search')
        .set('Authorization', 'Bearer valid-admin-token');
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });
});
