
import request from 'supertest';
import { UserRole } from '@prisma/client';

// Mock auth middleware before app import
jest.mock('../../middlewares/unifiedAuth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: '1', role: 'ADMIN' };
    req.userId = '1';
    req.userRole = 'ADMIN';
    next();
  },
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: '1', role: 'ADMIN' };
    req.userId = '1';
    req.userRole = 'ADMIN';
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
  requireAdminOrCollaborator: (req: any, res: any, next: any) => next(),
  requireCollaborator: (req: any, res: any, next: any) => next(),
  requireManager: (req: any, res: any, next: any) => next(),
  requireStaff: (req: any, res: any, next: any) => next(),
  optionalAuth: (req: any, res: any, next: any) => next(),
}));

// Mock rate limiters to avoid issues in tests
jest.mock('../../middlewares/rateLimitMiddleware', () => ({
  authRateLimit: (req: any, res: any, next: any) => next(),
  uploadRateLimit: (req: any, res: any, next: any) => next(),
  apiRateLimit: (req: any, res: any, next: any) => next(), // Note: apiLimiter or apiRateLimit? File says apiRateLimit
  createResourceRateLimit: (req: any, res: any, next: any) => next(),
  searchRateLimit: (req: any, res: any, next: any) => next(),
  passwordResetRateLimit: (req: any, res: any, next: any) => next(),
  dynamicRateLimit: (req: any, res: any, next: any) => next(),
  criticalEndpointRateLimit: (req: any, res: any, next: any) => next(),
  paymentRateLimit: (req: any, res: any, next: any) => next(),
  cartRateLimit: (req: any, res: any, next: any) => next(),
  quoteRateLimit: (req: any, res: any, next: any) => next(),
  reviewRateLimit: (req: any, res: any, next: any) => next(),
  dashboardRateLimit: (req: any, res: any, next: any) => next(),
  apiLimiter: (req: any, res: any, next: any) => next(), // Just in case
}));

import app from '../../app';
import * as userService from '../../services/userService';

describe('userController', () => {
  describe('register', () => {
    it('deve registrar usuário com dados válidos', async () => {
      jest.spyOn(userService, 'register').mockResolvedValue({
        needsEmailVerification: true,
        id: '1',
        name: 'Ana',
        email: 'a@a.com',
        role: UserRole.CLIENT,
        createdAt: new Date(),
      });
      const res = await request(app)
        .post('/api/users/register')
        .send({ email: 'a@a.com', password: 'Password123!', name: 'Ana' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });
    it('deve retornar 400 se dados inválidos', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({ email: 'a@a.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('login', () => {
    it('deve logar usuário com dados válidos', async () => {
      jest.spyOn(userService, 'login').mockResolvedValue({
        user: {
          id: '1',
          name: 'A',
          email: 'a@a.com',
          role: UserRole.CLIENT,
        },
        token: 'jwt',
        refreshToken: 'refresh',
        redirectTo: '/',
      });
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'a@a.com', password: '123456' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
    it('deve retornar 400 se dados inválidos', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'a@a.com' });
      expect(res.status).toBe(400);
    });
    it('deve retornar 401 se login falhar', async () => {
      jest.spyOn(userService, 'login').mockRejectedValue(new Error('fail'));
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'a@a.com', password: '123456' });
      expect(res.status).toBe(401);
    });
  });

  describe('getProfile', () => {
    it('deve retornar 404 se não encontrar usuário', async () => {
      jest.spyOn(userService, 'getProfile').mockRejectedValue(new Error('not found'));
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer token');
      expect(res.status).toBe(404);
    });
  });

  describe('updateProfile', () => {
    it('deve retornar 400 se dados inválidos', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('listUsers', () => {
    it('deve retornar lista de usuários', async () => {
      jest.spyOn(userService, 'listUsers').mockResolvedValue([
        {
          id: '1',
          name: 'A',
          email: 'a@a.com',
          role: UserRole.CLIENT,
          isVip: false,
          createdAt: new Date(),
        },
      ]);
      const res = await request(app)
        .get('/api/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
