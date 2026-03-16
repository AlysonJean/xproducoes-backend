import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../config/prisma';
import * as authService from '../services/authService';
import * as bookingService from '../services/bookingService';
import jwt from 'jsonwebtoken';

// Test credentials
const TEST_USER = {
  email: 'testuser@example.com',
  password: 'TestPass123!',
  name: 'Test User',
  phone: '11999999999',
};

const TEST_USER_2 = {
  email: 'testuser2@example.com',
  password: 'TestPass456!',
  name: 'Another User',
  phone: '11988888888',
};

describe('AuthService', () => {
  let testUserId: string;
  let testRefreshToken: string;

  beforeAll(async () => {
    // Clean up test data before tests
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_USER.email, TEST_USER_2.email] } },
    });
  });

  afterAll(async () => {
    // Clean up test data after tests
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_USER.email, TEST_USER_2.email] } },
    });
  });

  it('should register a new user', async () => {
    const result = await authService.register({
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
      phone: TEST_USER.phone,
    });

    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(TEST_USER.email);
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    testUserId = result.user.id;
    testRefreshToken = result.refreshToken;
  });

  it('should not register duplicate email', async () => {
    try {
      await authService.register({
        email: TEST_USER.email,
        password: 'DifferentPass123!',
        name: 'Different Name',
        phone: '11977777777',
      });
      expect.fail('Should have thrown error for duplicate email');
    } catch (error: any) {
      expect(error.message).toContain('already');
    }
  });

  it('should login with correct credentials', async () => {
    const result = await authService.login({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe(testUserId);
    expect(result.token).toBeDefined();
  });

  it('should fail login with wrong password', async () => {
    try {
      await authService.login({
        email: TEST_USER.email,
        password: 'WrongPassword123!',
      });
      expect.fail('Should have thrown error for wrong password');
    } catch (error: any) {
      expect(error.message).toContain('invalid|incorrect|password');
    }
  });

  it('should refresh token with valid refresh token', async () => {
    const result = await authService.refreshToken(testRefreshToken);

    expect(result).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('should validate JWT token', async () => {
    const result = await authService.login({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    const decoded = authService.verifyToken(result.token);
    expect(decoded).toBeDefined();
    expect(decoded.userId || decoded.id).toBe(testUserId);
  });

  it('should logout user', async () => {
    const result = await authService.logout(testUserId);
    expect(result).toBeDefined();
  });
});

describe('BookingService', () => {
  let testClientId: string;
  let testBookingId: string;
  let equipmentId: string;

  beforeAll(async () => {
    // Create test client
    const user = await prisma.user.create({
      data: {
        email: `bookingtest${Date.now()}@example.com`,
        password: 'hashed',
        role: 'CLIENT',
        profile: { create: { name: 'Booking Tester', phone: '11966666666' } },
      },
    });

    const client = await prisma.client.create({
      data: { userId: user.id },
    });
    testClientId = client.id;

    // Create test equipment
    const equipment = await prisma.equipment.create({
      data: {
        name: 'Test Equipment',
        description: 'For testing',
        category: 'CAMERA',
        dailyRate: 100,
      },
    });
    equipmentId = equipment.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.booking.deleteMany({
      where: { clientId: testClientId },
    });
    await prisma.client.deleteMany({
      where: { id: testClientId },
    });
    await prisma.equipment.deleteMany({
      where: { id: equipmentId },
    });
  });

  it('should create a new booking', async () => {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 7);

    const result = await bookingService.createBooking({
      clientId: testClientId,
      eventTitle: 'Test Event',
      eventDate: eventDate,
      location: 'Test Location',
      estimatedBudget: 1000,
      notes: 'Test booking',
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.clientId).toBe(testClientId);
    expect(result.eventTitle).toBe('Test Event');
    expect(result.status).toBe('PENDING');

    testBookingId = result.id;
  });

  it('should get booking by id', async () => {
    const result = await bookingService.getBookingById(testBookingId);

    expect(result).toBeDefined();
    expect(result.id).toBe(testBookingId);
    expect(result.clientId).toBe(testClientId);
  });

  it('should update booking status', async () => {
    const result = await bookingService.updateBookingStatus(testBookingId, 'CONFIRMED');

    expect(result).toBeDefined();
    expect(result.status).toBe('CONFIRMED');
  });

  it('should get all bookings with filters', async () => {
    const results = await bookingService.getAllBookings({
      clientId: testClientId,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].clientId).toBe(testClientId);
  });

  it('should cancel booking with reason', async () => {
    const result = await bookingService.cancel(testBookingId, 'Test cancellation');

    expect(result).toBeDefined();
    expect(result.status).toBe('CANCELLED');
  });
});

describe('Equipment Service', () => {
  let equipmentId: string;

  it('should create equipment', async () => {
    const result = await prisma.equipment.create({
      data: {
        name: 'Test Camera',
        description: 'High quality camera',
        category: 'CAMERA',
        dailyRate: 150,
      },
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('Test Camera');
    expect(result.dailyRate).toBe(150);

    equipmentId = result.id;
  });

  it('should get equipment by id', async () => {
    const result = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe(equipmentId);
  });

  it('should list all active equipment', async () => {
    const results = await prisma.equipment.findMany({
      where: { deleted: false },
    });

    expect(Array.isArray(results)).toBe(true);
  });

  it('should update equipment', async () => {
    const result = await prisma.equipment.update({
      where: { id: equipmentId },
      data: { dailyRate: 200 },
    });

    expect(result.dailyRate).toBe(200);
  });

  it('should delete equipment', async () => {
    await prisma.equipment.delete({
      where: { id: equipmentId },
    });

    const result = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    expect(result).toBeNull();
  });
});

describe('Validation & Error Handling', () => {
  it('should validate email format', async () => {
    try {
      await authService.register({
        email: 'invalid-email',
        password: 'TestPass123!',
        name: 'Test',
        phone: '11999999999',
      });
      expect.fail('Should reject invalid email');
    } catch (error: any) {
      expect(error.message).toContain('email|invalid');
    }
  });

  it('should validate password strength', async () => {
    try {
      await authService.register({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test',
        phone: '11999999999',
      });
      expect.fail('Should reject weak password');
    } catch (error: any) {
      expect(error.message).toContain('password|strength|requirements');
    }
  });

  it('should handle database connection errors gracefully', async () => {
    // Mock DB failure
    const originalFindUnique = prisma.user.findUnique;
    prisma.user.findUnique = vi.fn().mockRejectedValue(new Error('DB Connection Error'));

    try {
      await authService.login({
        email: 'test@example.com',
        password: 'password',
      });
      expect.fail('Should handle DB error');
    } catch (error: any) {
      expect(error.message).toContain('error|failed');
    }

    // Restore
    prisma.user.findUnique = originalFindUnique;
  });
});
