import { sendInvite, registerFromInvite } from '../../controllers/inviteController';
import { prisma } from '../../config/database';
import * as mailer from '../../services/mailerService';

// override prisma exported object at runtime
const p: any = prisma as any;
jest.spyOn(mailer as any, 'sendMail').mockImplementation(async () => ({ messageId: 'm1' }));

describe('inviteController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should create invite and send email', async () => {
    const req: any = { body: { email: 'a@b.com' }, userId: 'admin1' };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  p.inviteToken = { create: jest.fn().mockResolvedValue({ id: 'inv1' }) };

    await sendInvite(req, res);

    expect((prisma as any).inviteToken.create).toHaveBeenCalled();
    expect((mailer as any).sendMail).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should register from invite', async () => {
    const req: any = { body: { token: 'tok', email: 'x@y.com', name: 'X', password: 'pass' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  p.inviteToken = { findUnique: jest.fn().mockResolvedValue({ id: 'inv1', token: 'tok', email: 'x@y.com', used: false, expiresAt: new Date(Date.now() + 10000) }), update: jest.fn().mockResolvedValue({}) };
  p.user = { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'u1' }) };
  p.collaborator = { create: jest.fn().mockResolvedValue({ id: 'c1' }) };

    await registerFromInvite(req, res);

    expect((prisma as any).user.create).toHaveBeenCalled();
    expect((prisma as any).collaborator.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
