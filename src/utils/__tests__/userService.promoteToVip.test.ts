import { jest } from '@jest/globals';
import { promoteToVip } from '../../services/userService';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    }
  }
}));

const mockedPrisma: any = (prisma as any);

describe('promoteToVip service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should promote user to VIP when bookings >= 5', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'u1', clientProfile: { id: 'c1' } });
    mockedPrisma.booking.count.mockResolvedValue(6);
    mockedPrisma.user.update.mockResolvedValue({ id: 'u1', isVip: true });

    await expect(promoteToVip('u1')).resolves.toBe(true);

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isVip: true } });
  });

  it('should throw when user not found', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    await expect(promoteToVip('uX')).rejects.toThrow('Usuário não encontrado');
  });

  it('should throw when client profile missing', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'u2', clientProfile: null });
    await expect(promoteToVip('u2')).rejects.toThrow('Perfil de cliente não encontrado');
  });

  it('should throw when bookings < 5', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'u3', clientProfile: { id: 'c3' } });
    mockedPrisma.booking.count.mockResolvedValue(2);
    await expect(promoteToVip('u3')).rejects.toThrow('Regra de promoção para VIP não satisfeita');
  });
});
