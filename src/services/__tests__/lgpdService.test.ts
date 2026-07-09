import { jest } from '@jest/globals';

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
    },
    client: {
      updateMany: jest.fn(),
    },
    collaborator: {
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => 'unusable-hash'),
}));

import { prisma } from '../../config/prisma';
import { exportUserData, eraseUserData, eraseUserDataBySocialId } from '../lgpdService';

const mockedPrisma: any = prisma as any;

// Achado (Fase 4): a página de LGPD só orientava o titular a mandar um email para
// "exercer seus direitos" — não havia nenhum mecanismo real de exportação ou exclusão de
// dados. Estes testes cobrem o mecanismo real que substitui isso.
describe('lgpdService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    it('reúne perfil, reservas e avaliações do titular', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Fulano',
        email: 'fulano@example.com',
        role: 'CLIENT',
        clientProfile: { phone: '3199999999' },
        collaboratorProfile: null,
      });
      mockedPrisma.booking.findMany.mockResolvedValue([{ id: 'booking-1' }]);
      mockedPrisma.review.findMany.mockResolvedValue([{ id: 'review-1' }]);

      const result = await exportUserData('user-1');

      expect(result.profile).toMatchObject({ id: 'user-1', email: 'fulano@example.com' });
      expect(result.bookings).toEqual([{ id: 'booking-1' }]);
      expect(result.reviews).toEqual([{ id: 'review-1' }]);
      expect(result.exportedAt).toBeTruthy();

      // Busca reservas pelo relacionamento client.userId, não por um campo direto no User.
      expect(mockedPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client: { userId: 'user-1' } } }),
      );
    });

    it('lança NotFoundError quando o usuário não existe', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      await expect(exportUserData('missing')).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('eraseUserData', () => {
    it('anonimiza nome/email/senha e desativa a conta, sem apagar o registro', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'real@example.com' });

      await eraseUserData('user-2');

      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-2' },
          data: expect.objectContaining({
            name: 'Usuário removido',
            isActive: false,
            socialProvider: null,
            socialProviderId: null,
          }),
        }),
      );
      const updateCall = mockedPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.email).toContain('user-2');
      expect(updateCall.data.email).not.toBe('real@example.com');

      expect(mockedPrisma.client.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-2' } }),
      );
      expect(mockedPrisma.collaborator.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-2' } }),
      );
    });

    it('lança NotFoundError quando o usuário não existe', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      await expect(eraseUserData('missing')).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('eraseUserDataBySocialId', () => {
    it('localiza a conta pelo par (provider, providerId) e anonimiza', async () => {
      mockedPrisma.user.findFirst.mockResolvedValue({ id: 'user-3' });
      mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-3', email: 'x@example.com' });

      const result = await eraseUserDataBySocialId('facebook', 'fb-12345');

      expect(mockedPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { socialProvider: 'facebook', socialProviderId: 'fb-12345' },
        select: { id: true },
      });
      expect(result).toEqual({ userId: 'user-3' });
      expect(mockedPrisma.user.update).toHaveBeenCalled();
    });

    it('retorna null quando nenhuma conta local está mapeada a este ID social', async () => {
      mockedPrisma.user.findFirst.mockResolvedValue(null);

      const result = await eraseUserDataBySocialId('facebook', 'fb-unknown');

      expect(result).toBeNull();
      expect(mockedPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});
