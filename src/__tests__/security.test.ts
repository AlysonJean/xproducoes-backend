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
    user: { findUnique: jest.fn() },
    sponsorLogo: { create: jest.fn(), findMany: jest.fn() },
    newsletterSubscription: { create: jest.fn() },
    collaborator: { create: jest.fn() },
    // Adicione outros modelos conforme necessário
  },
}));

// Mock do middleware de upload (multer) para não falhar
jest.mock('../middlewares/upload', () => ({
  uploadSingle: () => (req: any, res: any, next: any) => next(),
  uploadMultiple: () => (req: any, res: any, next: any) => next(),
  processUpload: (req: any, res: any, next: any) => {
    req.body.imageUrl = 'http://example.com/image.jpg'; // Simula upload
    next();
  },
}));

import request from 'supertest';

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
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('email'); // Deve reclamar do email
    });

    it('POST /newsletter/subscribe - deve rejeitar email inválido (400)', async () => {
      const res = await request(app)
        .post('/api/v1/newsletter/subscribe')
        .send({ email: 'invalid-email' });
      
      expect(res.status).toBe(400);
    });

    it('POST /newsletter/subscribe - deve aceitar email válido (200/201)', async () => {
      // Mock prisma response
      (prisma.newsletterSubscription.create as jest.Mock<any>).mockResolvedValue({ id: '1', email: 'test@test.com' });

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
      
      const res = await request(app)
        .post('/api/v1/admin/sponsors')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ name: 'Sponsor Valid' }); // Imagem mockada pelo middleware
      
      expect(res.status).toBe(200); // Sponsor controller retorna json direto (200) ou 201? Controller usa res.json(sponsor) -> 200
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
});
