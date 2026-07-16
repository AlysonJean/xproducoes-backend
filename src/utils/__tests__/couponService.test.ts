import { jest } from '@jest/globals';
import { CouponDiscountType, BookingStatus } from '@prisma/client';
import * as couponService from '../../services/couponService';
import { prisma } from '../../config/prisma';

jest.mock('../../config/prisma', () => ({
  prisma: {
    coupon: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    booking: { count: jest.fn() },
  },
}));

const mockedPrisma: any = (prisma as any);

const baseCoupon = {
  id: 'coupon-1',
  code: 'BEMVINDO10',
  description: null,
  discountType: CouponDiscountType.PERCENTAGE,
  discountValue: 10,
  minOrderValue: null,
  maxDiscountAmount: null,
  maxUses: null,
  maxUsesPerClient: null,
  validFrom: null,
  validUntil: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Achado (auditoria de produto): não existia nenhum mecanismo de cupom/desconto por código —
// só um campo livre por item, preenchido manualmente. Cobre as regras de validação (o que a
// bookingCrudService confia cegamente ao aplicar o desconto no orçamento).
describe('couponService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.booking.count.mockResolvedValue(0);
  });

  describe('validateCoupon', () => {
    it('rejeita cupom inexistente', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue(null);
      const result = await couponService.validateCoupon('NAOEXISTE', { subtotal: 100 });
      expect(result).toEqual({ valid: false, reason: 'Cupom não encontrado.' });
    });

    it('normaliza o código para maiúsculas/trim na busca', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue(baseCoupon);
      await couponService.validateCoupon('  bemvindo10  ', { subtotal: 100 });
      expect(mockedPrisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: 'BEMVINDO10' } });
    });

    it('rejeita cupom inativo', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, active: false });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/não está mais ativo/);
    });

    it('rejeita cupom fora do período de validade', async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, validFrom: future });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/ainda não é válido/);
    });

    it('rejeita cupom expirado', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, validUntil: past });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/expirou/);
    });

    it('rejeita quando o subtotal é menor que o pedido mínimo', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, minOrderValue: 200 });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/pedido mínimo/);
    });

    it('rejeita quando o limite total de usos foi atingido', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, maxUses: 5 });
      mockedPrisma.booking.count.mockResolvedValue(5);
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/limite de usos/);
    });

    it('rejeita quando o cliente já atingiu o limite de usos por pessoa', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, maxUsesPerClient: 1 });
      mockedPrisma.booking.count.mockResolvedValue(1);
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100, userId: 'user-1' });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/número máximo de vezes/);
      expect(mockedPrisma.booking.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ creatorId: 'user-1' }) })
      );
    });

    it('não checa limite por cliente quando não há userId (convidado sem conta ainda)', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, maxUsesPerClient: 1 });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(result.valid).toBe(true);
      expect(mockedPrisma.booking.count).not.toHaveBeenCalled();
    });

    it('calcula desconto percentual corretamente', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, discountType: CouponDiscountType.PERCENTAGE, discountValue: 10 });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 200 });
      expect(result).toMatchObject({ valid: true, discountAmount: 20 });
    });

    it('aplica o teto de desconto (maxDiscountAmount) em cupons percentuais', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 50,
        maxDiscountAmount: 30,
      });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 200 });
      expect(result.discountAmount).toBe(30);
    });

    it('nunca desconta mais que o próprio subtotal (cupom fixo maior que o pedido)', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: CouponDiscountType.FIXED,
        discountValue: 500,
      });
      const result = await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(result.discountAmount).toBe(100);
    });

    it('conta apenas reservas não canceladas ao checar limite de uso total', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, maxUses: 5 });
      await couponService.validateCoupon('BEMVINDO10', { subtotal: 100 });
      expect(mockedPrisma.booking.count).toHaveBeenCalledWith({
        where: { couponId: 'coupon-1', status: { not: BookingStatus.CANCELLED } },
      });
    });
  });

  describe('createCoupon', () => {
    it('rejeita código duplicado', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue(baseCoupon);
      await expect(
        couponService.createCoupon({ code: 'BEMVINDO10', discountType: CouponDiscountType.PERCENTAGE, discountValue: 10 })
      ).rejects.toThrow('Já existe um cupom com este código.');
      expect(mockedPrisma.coupon.create).not.toHaveBeenCalled();
    });

    it('normaliza o código para maiúsculas ao criar', async () => {
      mockedPrisma.coupon.findUnique.mockResolvedValue(null);
      mockedPrisma.coupon.create.mockResolvedValue(baseCoupon);
      await couponService.createCoupon({ code: '  promo20  ', discountType: CouponDiscountType.FIXED, discountValue: 20 });
      expect(mockedPrisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'PROMO20' }) })
      );
    });
  });
});
