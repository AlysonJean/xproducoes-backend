import request from 'supertest';
import express from 'express';
import * as userController from '../../controllers/userController';

jest.mock('../../services/userService', () => ({
  promoteToVip: jest.fn(),
}));

const userService = require('../../services/userService');

describe('userController.promoteVip', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();

    // Simple auth middleware stub
    const authStub = (req: any, res: any, next: any) => {
      req.userId = 'test-user-1';
      next();
    };

    app.post('/user/promote-vip', authStub, userController.promoteVip);
  });

  it('returns 200 on success', async () => {
    userService.promoteToVip.mockResolvedValue(true);
    const res = await request(app).post('/user/promote-vip');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Usuário promovido a VIP' });
  });

  it('returns 400 when business rule not satisfied', async () => {
    userService.promoteToVip.mockRejectedValue(new Error('Regra de promoção para VIP não satisfeita'));
    const res = await request(app).post('/user/promote-vip');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('returns 500 on generic error', async () => {
    userService.promoteToVip.mockRejectedValue(new Error('DB connection lost'));
    const res = await request(app).post('/user/promote-vip');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
  });
});
