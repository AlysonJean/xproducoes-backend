
import request from 'supertest';
import app from '../../app';
import * as userService from '../../services/userService';
import { UserRole } from '@prisma/client';

describe('userController', () => {
  describe('register', () => {
    it('deve registrar usuário com dados válidos', async () => {
      jest.spyOn(userService, 'register').mockResolvedValue({
        needsEmailVerification: true,
        id: '1',
        name: 'A',
        email: 'a@a.com',
        role: UserRole.CLIENT,
        createdAt: new Date(),
      });
      const res = await request(app)
        .post('/api/users/register')
        .send({ email: 'a@a.com', password: '123456', name: 'A' });
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
