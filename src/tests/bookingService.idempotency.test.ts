import { BookingService } from '../services/bookingService';

jest.mock('../config/prisma', () => {
  return {
    prisma: {
      booking: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      client: {
        findFirst: jest.fn(),
        create: jest.fn(),
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

const { prisma } = require('../config/prisma');

describe('BookingService idempotency', () => {
  const service = new BookingService();

  beforeEach(() => {
    jest.clearAllMocks();
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
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: 'client-1' });

    // Simulate prisma.create throwing unique constraint error
    (prisma.booking.create as jest.Mock).mockImplementation(() => {
      const err: any = new Error('Unique constraint');
      err.code = 'P2002';
      throw err;
    });

    const existing = { id: 'existing-1', idempotencyKey };
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(existing);

    const result = await service.createBooking(bookingData as any, 'creator-1', idempotencyKey);

    expect(prisma.booking.create).toHaveBeenCalled();
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({ where: { idempotencyKey }, include: expect.any(Object) });
    expect(result).toEqual(existing);
  });
});
