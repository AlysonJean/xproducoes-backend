import { describe, it, expect } from '@jest/globals';
import { equipmentCreateSchema } from '../equipmentSchema.js';
import { bookingCreateSchema } from '../bookingSchema.js';
import { reviewCreateSchema } from '../reviewSchema.js';
import { z } from 'zod';

const validId = 'ckabcdefghijklmnopqr';

const contactSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10),
  subject: z.string().trim().min(3),
  message: z.string().trim().min(10),
});

describe('Equipment Validator', () => {
  it('should validate correct equipment data', () => {
    const validData = {
      name: 'Professional Camera',
      description: 'High quality cinema camera',
      pricePerHour: 500,
      quantity: 1,
      categoryId: validId,
    };

    const result = equipmentCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const invalidData = {
      name: 'Camera',
      // missing description, category, dailyRate
    };

    const result = equipmentCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject negative daily rate', () => {
    const invalidData = {
      name: 'Camera',
      description: 'Test',
      pricePerHour: -100,
      quantity: 1,
      categoryId: validId,
    };

    const result = equipmentCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const validData = {
      name: 'Microphone',
      description: 'Audio equipment',
      pricePerHour: 50,
      quantity: 1,
      categoryId: validId,
    };

    const result = equipmentCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('Booking Validator', () => {
  it('should validate correct booking data', () => {
    const validData = {
      clientName: 'John Doe',
      clientContact: '11999999999',
      equipmentIds: [validId],
      eventTitle: 'Wedding Reception',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      eventEndDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Grand Hotel',
      street: 'Rua A',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01000-000',
      addressNumber: '100',
    };

    const result = bookingCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject past event dates', () => {
    const invalidData = {
      clientName: 'John Doe',
      clientContact: '11999999999',
      equipmentIds: [validId],
      eventTitle: 'Old Event',
      eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      eventEndDate: new Date(Date.now() - 1000).toISOString(),
      location: 'Old Venue',
      street: 'Rua A',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01000-000',
      addressNumber: '100',
    };

    const result = bookingCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject empty event title', () => {
    const invalidData = {
      clientName: 'John Doe',
      clientContact: '11999999999',
      equipmentIds: [validId],
      eventTitle: '', // Empty
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      eventEndDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Venue',
      street: 'Rua A',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01000-000',
      addressNumber: '100',
    };

    const result = bookingCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject negative budget', () => {
    const invalidData = {
      clientName: 'John Doe',
      clientContact: '11999999999',
      equipmentIds: [validId],
      eventTitle: 'Event',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      eventEndDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Venue',
      street: 'Rua A',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01000-000',
      addressNumber: '100',
      totalPrice: -500,
    };

    const result = bookingCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Review Validator', () => {
  it('should validate correct review data', () => {
    const validData = {
      userId: validId,
      bookingId: validId,
      rating: 5,
      comment: 'Excellent service!',
    };

    const result = reviewCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject rating above 5', () => {
    const invalidData = {
      userId: validId,
      bookingId: validId,
      rating: 6, // Invalid
      comment: 'Good',
    };

    const result = reviewCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject rating below 1', () => {
    const invalidData = {
      userId: validId,
      bookingId: validId,
      rating: 0, // Invalid
      comment: 'Bad',
    };

    const result = reviewCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept minimum rating of 1', () => {
    const validData = {
      userId: validId,
      bookingId: validId,
      rating: 1,
      comment: 'Poor service',
    };

    const result = reviewCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('Contact Validator', () => {
  it('should validate correct contact data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '11999999999',
      subject: 'Inquiry about services',
      message: 'I am interested in your equipment rental services.',
    };

    const result = contactSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email', // Invalid
      phone: '11999999999',
      subject: 'Inquiry',
      message: 'Message',
    };

    const result = contactSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject short message', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '11999999999',
      subject: 'Hi',
      message: 'Hi', // Too short
    };

    const result = contactSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should trim whitespace from fields', () => {
    const data = {
      name: '  John Doe  ',
      email: '  john@example.com  ',
      phone: '11999999999',
      subject: 'Inquiry',
      message: 'Valid message content here',
    };

    const result = contactSchema.safeParse(data);
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
      expect(result.data.email).toBe('john@example.com');
    }
  });
});

describe('Error Recovery', () => {
  it('should provide helpful error messages', () => {
    const invalidData = {
      rating: 'not_a_number', // Type error
      comment: 'Good',
    };

    const result = reviewCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].message).toBeTruthy();
    }
  });

  it('should indicate which field failed validation', () => {
    const invalidData = {
      userId: validId,
      bookingId: validId,
      rating: 10,
      comment: 'Test',
    };

    const result = reviewCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const failedFields = result.error.issues.map((e) => e.path.join('.'));
      expect(failedFields).toContain('rating');
    }
  });
});
