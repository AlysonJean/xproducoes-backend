import { BookingStatus } from '@prisma/client';
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

const { prisma } = require('../../config/prisma');
const { queueEmail } = require('../../config/jobQueue');

// Achado (auditoria de produto): quem enviava um orçamento não recebia nenhuma
// confirmação até um admin aprovar manualmente. createBooking agora enfileira o e-mail
// 'booking-confirmation' (já existia no worker, nunca era chamado por ninguém).
describe('BookingCrudService — e-mail de confirmação ao criar orçamento', () => {
  const service = new BookingCrudService();
  const creator = { id: 'creator-1', name: 'Cliente Teste', email: 'cliente@teste.com' };
  const bookingData = {
    eventDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    eventEndDate: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 3600 * 1000).toISOString(),
    clientId: 'client-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(creator);
    (prisma.client.upsert as jest.Mock).mockResolvedValue({ id: 'client-1' });
  });

  it('enfileira o e-mail de confirmação quando a reserva é enviada (não DRAFT)', async () => {
    (prisma.booking.create as jest.Mock).mockResolvedValue({ id: 'b1', status: BookingStatus.PENDING, equipments: [], totalPrice: 100 });

    await service.createBooking({ ...bookingData, status: BookingStatus.PENDING } as any, creator.id);

    expect(queueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'booking-confirmation',
        to: creator.email,
        templateData: expect.objectContaining({
          user: { name: creator.name, email: creator.email },
        }),
      })
    );
  });

  it('não enfileira e-mail quando a reserva criada é um carrinho em rascunho (DRAFT)', async () => {
    (prisma.booking.create as jest.Mock).mockResolvedValue({ id: 'b2', status: BookingStatus.DRAFT, equipments: [], totalPrice: 0 });

    await service.createBooking({ ...bookingData, status: BookingStatus.DRAFT } as any, creator.id);

    expect(queueEmail).not.toHaveBeenCalled();
  });

  it('não lança erro para o chamador quando o envio do e-mail falha (só loga, não bloqueante)', async () => {
    (prisma.booking.create as jest.Mock).mockResolvedValue({ id: 'b3', status: BookingStatus.PENDING, equipments: [], totalPrice: 50 });
    (queueEmail as jest.Mock).mockRejectedValue(new Error('SMTP fora do ar'));

    await expect(service.createBooking({ ...bookingData, status: BookingStatus.PENDING } as any, creator.id)).resolves.toMatchObject({ id: 'b3' });
  });
});
