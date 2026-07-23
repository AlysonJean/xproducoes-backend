import { jest } from '@jest/globals';
import { CouponDiscountType } from '@prisma/client';
import * as referralService from '../../services/referralService';
import { prisma } from '../../config/prisma';
import { createNotification } from '../../services/notificationService';
import { whatsappService } from '../../services/whatsappService';

jest.mock('../../config/prisma', () => ({
  prisma: {
    coupon: { findUnique: jest.fn(), create: jest.fn() },
    client: { findUnique: jest.fn() },
    booking: { count: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../../services/whatsappService', () => ({
  whatsappService: { sendMessage: jest.fn().mockResolvedValue(true) },
}));

const mockedPrisma: any = prisma as any;

// Achado (produto): negócio pediu um programa de indicação ("indique um amigo") pra trazer
// clientes novos, reaproveitando o sistema de Coupon já existente em vez de duplicar regras
// de desconto — o código pessoal do cliente É um Coupon (compartilhável), a recompensa por
// indicação bem-sucedida é OUTRO Coupon (restrito a um único usuário).
describe('referralService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateReferralCoupon', () => {
    it('retorna o cupom existente sem criar um novo', async () => {
      const existing = { id: 'coupon-1', code: 'MARIAX7K2', referrerClientId: 'client-1' };
      mockedPrisma.coupon.findUnique.mockResolvedValue(existing);

      const result = await referralService.getOrCreateReferralCoupon('client-1');

      expect(result).toBe(existing);
      expect(mockedPrisma.coupon.create).not.toHaveBeenCalled();
    });

    it('cria um cupom pessoal na primeira vez, com código derivado do primeiro nome', async () => {
      mockedPrisma.coupon.findUnique
        .mockResolvedValueOnce(null) // busca pelo referrerClientId: não existe ainda
        .mockResolvedValueOnce(null); // checagem de unicidade do código gerado
      mockedPrisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        user: { name: 'Maria Silva' },
      });
      mockedPrisma.coupon.create.mockImplementation(async ({ data }: any) => ({ id: 'coupon-new', ...data }));

      const result = await referralService.getOrCreateReferralCoupon('client-1');

      expect(result.code).toMatch(/^MARIA[A-Z0-9]{4}$/);
      expect(mockedPrisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 10,
            maxUsesPerClient: 1,
            referrerClientId: 'client-1',
          }),
        })
      );
    });

    it('lança erro se o cliente não existe', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue(null);
      mockedPrisma.client.findUnique.mockResolvedValue(null);

      await expect(referralService.getOrCreateReferralCoupon('client-inexistente')).rejects.toThrow(
        'Cliente não encontrado.'
      );
    });
  });

  describe('getReferralStats', () => {
    it('agrega código, usos e recompensas emitidas', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1',
        code: 'MARIAX7K2',
        discountValue: 10,
        referrerClientId: 'client-1',
      });
      mockedPrisma.booking.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      const stats = await referralService.getReferralStats('client-1');

      expect(stats).toEqual({
        code: 'MARIAX7K2',
        discountPercent: 10,
        timesUsed: 3,
        rewardsEarned: 2,
      });
    });
  });

  describe('issueReferralRewardIfApplicable', () => {
    const booking = { id: 'booking-1', couponId: 'coupon-1', referralRewardIssuedAt: null };

    it('não faz nada se a reserva não usou nenhum cupom', async () => {
      await referralService.issueReferralRewardIfApplicable({ ...booking, couponId: null });
      expect(mockedPrisma.coupon.findUnique).not.toHaveBeenCalled();
    });

    it('não faz nada se a recompensa já foi emitida antes', async () => {
      await referralService.issueReferralRewardIfApplicable({
        ...booking,
        referralRewardIssuedAt: new Date(),
      });
      expect(mockedPrisma.coupon.findUnique).not.toHaveBeenCalled();
    });

    it('não faz nada se o cupom usado não é um código de indicação', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ id: 'coupon-1', referrerClientId: null });
      await referralService.issueReferralRewardIfApplicable(booking);
      expect(mockedPrisma.client.findUnique).not.toHaveBeenCalled();
      expect(mockedPrisma.coupon.create).not.toHaveBeenCalled();
    });

    it('emite recompensa restrita ao indicador, marca a reserva e notifica', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ id: 'coupon-1', referrerClientId: 'client-referrer' });
      mockedPrisma.client.findUnique.mockResolvedValue({
        id: 'client-referrer',
        userId: 'user-referrer',
        phone: '31999998888',
        user: { name: 'João' },
      });
      mockedPrisma.coupon.create.mockResolvedValue({ id: 'reward-coupon', code: 'INDICABC123' });

      await referralService.issueReferralRewardIfApplicable(booking);

      expect(mockedPrisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            restrictedToUserId: 'user-referrer',
            maxUses: 1,
          }),
        })
      );
      expect(mockedPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { referralRewardIssuedAt: expect.any(Date) },
      });
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-referrer', type: 'REFERRAL_REWARD' })
      );
      expect(whatsappService.sendMessage).toHaveBeenCalledWith(
        '31999998888',
        expect.stringContaining('recompensa')
      );
    });

    it('não envia WhatsApp se o indicador não tem telefone cadastrado', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ id: 'coupon-1', referrerClientId: 'client-referrer' });
      mockedPrisma.client.findUnique.mockResolvedValue({
        id: 'client-referrer',
        userId: 'user-referrer',
        phone: null,
        user: { name: 'João' },
      });
      mockedPrisma.coupon.create.mockResolvedValue({ id: 'reward-coupon', code: 'INDICABC123' });

      await referralService.issueReferralRewardIfApplicable(booking);

      expect(whatsappService.sendMessage).not.toHaveBeenCalled();
    });
  });
});
