import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

/**
 * 🧪 VALIDATION SCHEMAS - Unit Tests
 * Testing Zod schema validation for major entities
 */

// Example schemas to test
const emailSchema = z.string().email();
const phoneSchema = z.string().regex(/^\d{10,15}$/);
const bookingSchema = z.object({
  eventDate: z.date(),
  eventTitle: z.string().min(3).max(100),
  clientId: z.string().uuid(),
  equipmentIds: z.array(z.string().uuid()).min(1),
});

const equipmentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  pricePerDay: z.number().positive(),
  availableQuantity: z.number().int().nonnegative(),
});

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'user@example.com',
      'test+tag@domain.co.uk',
      'name.surname@company.org',
    ];

    validEmails.forEach(email => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'not-an-email',
      'user@',
      '@domain.com',
      'user @example.com',
    ];

    invalidEmails.forEach(email => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });
  });
});

describe('Phone Validation', () => {
  it('should accept valid phone numbers', () => {
    const validPhones = [
      '5511987654321',
      '11999999999',
      '4733334444',
      '2125551234',
    ];

    validPhones.forEach(phone => {
      const result = phoneSchema.safeParse(phone);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid phone numbers', () => {
    const invalidPhones = [
      '123', // too short
      'not-a-number',
      '55 11 9999 9999', // spaces
      '11 98765-4321', // wrong format
    ];

    invalidPhones.forEach(phone => {
      const result = phoneSchema.safeParse(phone);
      expect(result.success).toBe(false);
    });
  });
});

describe('Booking Validation', () => {
  const validBooking = {
    eventDate: new Date('2026-04-15'),
    eventTitle: 'Wedding Event',
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    equipmentIds: ['550e8400-e29b-41d4-a716-446655440001'],
  };

  it('should accept valid booking data', () => {
    const result = bookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('should reject booking with missing required fields', () => {
    const invalidBooking = {
      eventDate: new Date(),
      eventTitle: 'Test',
      // Missing clientId and equipmentIds
    };

    const result = bookingSchema.safeParse(invalidBooking);
    expect(result.success).toBe(false);
  });

  it('should reject booking with empty equipment list', () => {
    const invalidBooking = {
      ...validBooking,
      equipmentIds: [],
    };

    const result = bookingSchema.safeParse(invalidBooking);
    expect(result.success).toBe(false);
  });

  it('should reject booking with invalid UUID', () => {
    const invalidBooking = {
      ...validBooking,
      clientId: 'not-a-uuid',
    };

    const result = bookingSchema.safeParse(invalidBooking);
    expect(result.success).toBe(false);
  });

  it('should reject booking with short event title', () => {
    const invalidBooking = {
      ...validBooking,
      eventTitle: 'AB', // Too short (min 3)
    };

    const result = bookingSchema.safeParse(invalidBooking);
    expect(result.success).toBe(false);
  });
});

describe('Equipment Validation', () => {
  const validEquipment = {
    name: 'Professional Sound System',
    description: 'High-quality audio equipment',
    pricePerDay: 250.00,
    availableQuantity: 2,
  };

  it('should accept valid equipment', () => {
    const result = equipmentSchema.safeParse(validEquipment);
    expect(result.success).toBe(true);
  });

  it('should accept equipment without description', () => {
    const equipment = {
      name: 'Projector',
      pricePerDay: 100,
      availableQuantity: 1,
    };

    const result = equipmentSchema.safeParse(equipment);
    expect(result.success).toBe(true);
  });

  it('should reject equipment with negative price', () => {
    const invalidEquipment = {
      ...validEquipment,
      pricePerDay: -50,
    };

    const result = equipmentSchema.safeParse(invalidEquipment);
    expect(result.success).toBe(false);
  });

  it('should reject equipment with negative quantity', () => {
    const invalidEquipment = {
      ...validEquipment,
      availableQuantity: -1,
    };

    const result = equipmentSchema.safeParse(invalidEquipment);
    expect(result.success).toBe(false);
  });

  it('should reject equipment with short name', () => {
    const invalidEquipment = {
      ...validEquipment,
      name: 'A', // Too short (min 2)
    };

    const result = equipmentSchema.safeParse(invalidEquipment);
    expect(result.success).toBe(false);
  });

  it('should reject equipment with very long name', () => {
    const invalidEquipment = {
      ...validEquipment,
      name: 'A'.repeat(101), // Too long (max 100)
    };

    const result = equipmentSchema.safeParse(invalidEquipment);
    expect(result.success).toBe(false);
  });
});

describe('Schema Error Handling', () => {
  it('should provide meaningful error messages for validation failures', () => {
    const result = bookingSchema.safeParse({
      eventDate: 'not-a-date',
      eventTitle: 'AB',
      clientId: 'invalid',
      equipmentIds: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0]).toHaveProperty('message');
    }
  });

  it('should use safeParse instead of parse for non-throwing validation', () => {
    const invalidData = { eventDate: 'invalid' };
    
    // safeParse should NOT throw, just return error
    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
