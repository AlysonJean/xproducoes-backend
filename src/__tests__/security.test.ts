import { beforeAll, describe, expect, it, jest } from '@jest/globals';

// Mock do JWT para evitar dependência de env vars reais
jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken') as Record<string, unknown>;
  return {
    ...actual,
    verify: jest.fn((token: string) => {
      if (token === 'valid-admin-token') return { userId: 'admin-id', role: 'ADMIN' };
      if (token === 'valid-user-token') return { userId: 'user-id', role: 'CLIENT' };
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
    it('POST /admin/sponsors - deve rejeitar sem token (401)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .send({ name: 'Sponsor X' });
      
      expect(res.status).toBe(401);
    });

    it('POST /admin/sponsors - deve rejeitar token de usuário comum (403)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .set('Authorization', 'Bearer valid-user-token') // Mockado para role CLIENT
        .send({ name: 'Sponsor X' });
      
      expect(res.status).toBe(403);
    });

    it('POST /admin/sponsors - deve rejeitar body inválido mesmo com admin (400)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({}); // Sem name
      
      expect(res.status).toBe(400);
    });

    it('POST /admin/sponsors - deve aceitar requisição válida de admin (200/201)', async () => {
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
});
