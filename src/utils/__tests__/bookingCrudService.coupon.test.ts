import { BookingStatus, CouponDiscountType } from '@prisma/client';
import { BookingCrudService } from '../../services/booking/bookingCrudService';

jest.mock('../../config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    client: {
      upsert: jest.fn(),
    },
    kit: {
      findUnique: jest.fn(),
    },
    equipment: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../config/jobQueue', () => ({
  queueEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/cacheService', () => ({
  cacheService: {
    invalidateBookingCaches: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/notificationService', () => ({
  notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));

const mockValidateCoupon = jest.fn();
jest.mock('../../services/couponService', () => ({
  validateCoupon: (...args: unknown[]) => mockValidateCoupon(...args),
}));

const { prisma } = require('../../config/prisma');

// Achado (auditoria de produto): não existia nenhum mecanismo de cupom/desconto por código no
// fluxo de criação de orçamento. createBooking agora aceita `couponCode` opcional, valida via
// couponService e abate o desconto do totalPrice antes de persistir.
describe('BookingCrudService — aplicação de cupom ao criar orçamento', () => {
  const service = new BookingCrudService();
  const creator = { id: 'creator-1', name: 'Cliente Teste', email: 'cliente@teste.com' };
  const bookingData = {
    eventDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    eventEndDate: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 3600 * 1000).toISOString(),
    clientId: 'client-1',
    totalPrice: 200,
    status: BookingStatus.PENDING,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(creator);
    (prisma.client.upsert as jest.Mock).mockResolvedValue({ id: 'client-1' });
    (prisma.booking.create as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: 'b1',
      status: data.status,
      totalPrice: data.totalPrice,
      couponId: data.couponId,
      discountAmount: data.discountAmount,
      equipments: [],
    }));
  });

  it('não altera o totalPrice quando nenhum couponCode é informado', async () => {
    const booking = await service.createBooking({ ...bookingData } as any, creator.id);
    expect(mockValidateCoupon).not.toHaveBeenCalled();
    expect(booking.totalPrice).toBe(200);
    expect(booking.couponId).toBeUndefined();
  });

  it('abate o desconto do totalPrice e grava couponId/discountAmount quando o cupom é válido', async () => {
    mockValidateCoupon.mockResolvedValue({
      valid: true,
      coupon: { id: 'coupon-1', code: 'BEMVINDO10', discountType: CouponDiscountType.PERCENTAGE, discountValue: 10 },
      discountAmount: 20,
    });

    const booking = await service.createBooking({ ...bookingData, couponCode: 'bemvindo10' } as any, creator.id);

    expect(mockValidateCoupon).toHaveBeenCalledWith('bemvindo10', { subtotal: 200, userId: creator.id });
    expect(booking.totalPrice).toBe(180);
    expect(booking.couponId).toBe('coupon-1');
    expect(booking.discountAmount).toBe(20);
  });

  it('rejeita a criação do orçamento quando o cupom é inválido, sem criar a reserva', async () => {
    mockValidateCoupon.mockResolvedValue({ valid: false, reason: 'Este cupom expirou.' });

    await expect(
      service.createBooking({ ...bookingData, couponCode: 'EXPIRADO' } as any, creator.id)
    ).rejects.toThrow('Este cupom expirou.');
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('nunca deixa o totalPrice ficar negativo mesmo se o desconto exceder o subtotal', async () => {
    mockValidateCoupon.mockResolvedValue({
      valid: true,
      coupon: { id: 'coupon-1', code: 'GRANDE', discountType: CouponDiscountType.FIXED, discountValue: 500 },
      discountAmount: 200,
    });

    const booking = await service.createBooking({ ...bookingData, couponCode: 'GRANDE' } as any, creator.id);
    expect(booking.totalPrice).toBe(0);
  });
});
