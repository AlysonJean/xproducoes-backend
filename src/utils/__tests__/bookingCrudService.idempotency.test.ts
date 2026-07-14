import { Prisma } from '@prisma/client';
import { BookingCrudService } from '../../services/booking/bookingCrudService';

jest.mock('../../config/prisma', () => {
  return {
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
      }
    }
  };
});

const { prisma } = require('../../config/prisma');

// Achado (decomposição de bookingService.ts em 6 services): createBooking agora vive em
// BookingCrudService — só o import e o tipo mudaram, o comportamento testado é idêntico.
describe('BookingCrudService idempotency', () => {
  const service = new BookingCrudService();

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: typeof prisma) => unknown) => {
      return callback(prisma);
    });
  });

  it('returns existing booking when create fails with P2002', async () => {
    const idempotencyKey = 'test-key-123';
    const start = Date.now() + 2 * 24 * 3600 * 1000;
    const bookingData = {
      eventDate: new Date(start).toISOString(),
      eventEndDate: new Date(start + 3600 * 1000).toISOString(),
      userId: 'user-1',
      // minimal required fields for creation in the service path
    };

    // Prepare other prisma mocks that the service will call
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'creator-1', name: 'Creator' });
    (prisma.client.upsert as jest.Mock).mockResolvedValue({ id: 'client-1' });

    // Simulate prisma.create throwing unique constraint error (instância real, já que o serviço
    // narra o erro via `instanceof Prisma.PrismaClientKnownRequestError`, não duck-typing em `.code`)
    (prisma.booking.create as jest.Mock).mockImplementation(() => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      });
    });

    const existing = { id: 'existing-1', idempotencyKey };
    (prisma.booking.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

    const result = await service.createBooking(bookingData as any, 'creator-1', idempotencyKey);

    expect(prisma.booking.create).toHaveBeenCalled();
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({ where: { idempotencyKey }, include: expect.any(Object) });
    expect(result).toEqual(existing);
  });
});
