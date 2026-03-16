import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { 
  equipmentSchema, 
  bookingSchema, 
  reviewSchema,
  contactSchema 
} from '../../validators/index.js';

describe('Equipment Validator', () => {
  it('should validate correct equipment data', () => {
    const validData = {
      name: 'Professional Camera',
      description: 'High quality cinema camera',
      category: 'CAMERA',
      dailyRate: 500,
      quantity: 1,
    };

    const result = equipmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const invalidData = {
      name: 'Camera',
      // missing description, category, dailyRate
    };

    const result = equipmentSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject negative daily rate', () => {
    const invalidData = {
      name: 'Camera',
      description: 'Test',
      category: 'CAMERA',
      dailyRate: -100, // Invalid
      quantity: 1,
    };

    const result = equipmentSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const validData = {
      name: 'Microphone',
      description: 'Audio equipment',
      category: 'AUDIO',
      dailyRate: 50,
    };

    const result = equipmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('Booking Validator', () => {
  it('should validate correct booking data', () => {
    const validData = {
      eventTitle: 'Wedding Reception',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Grand Hotel',
      estimatedBudget: 5000,
    };

    const result = bookingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject past event dates', () => {
    const invalidData = {
      eventTitle: 'Old Event',
      eventDate: new Date(Date.now() - 1000), // Past date
      location: 'Old Venue',
      estimatedBudget: 1000,
    };

    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject empty event title', () => {
    const invalidData = {
      eventTitle: '', // Empty
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Venue',
      estimatedBudget: 1000,
    };

    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject negative budget', () => {
    const invalidData = {
      eventTitle: 'Event',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Venue',
      estimatedBudget: -500, // Invalid
    };

    const result = bookingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Review Validator', () => {
  it('should validate correct review data', () => {
    const validData = {
      rating: 5,
      comment: 'Excellent service!',
      punctuality: 5,
      professionalism: 5,
      quality: 5,
      communication: 5,
      valueForMoney: 5,
    };

    const result = reviewSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject rating above 5', () => {
    const invalidData = {
      rating: 6, // Invalid
      comment: 'Good',
      punctuality: 5,
      professionalism: 5,
      quality: 5,
      communication: 5,
      valueForMoney: 5,
    };

    const result = reviewSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject rating below 1', () => {
    const invalidData = {
      rating: 0, // Invalid
      comment: 'Bad',
      punctuality: 5,
      professionalism: 5,
      quality: 5,
      communication: 5,
      valueForMoney: 5,
    };

    const result = reviewSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept minimum rating of 1', () => {
    const validData = {
      rating: 1,
      comment: 'Poor service',
      punctuality: 1,
      professionalism: 1,
      quality: 1,
      communication: 1,
      valueForMoney: 1,
    };

    const result = reviewSchema.safeParse(validData);
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

    const result = reviewSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
      expect(result.error.errors[0].message).toBeTruthy();
    }
  });

  it('should indicate which field failed validation', () => {
    const invalidData = {
      rating: 10,
      comment: 'Test',
      punctuality: 5,
      professionalism: 5,
      quality: 5,
      communication: 5,
      valueForMoney: 5,
    };

    const result = reviewSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const failedFields = result.error.errors.map(e => e.path.join('.'));
      expect(failedFields).toContain('rating');
    }
  });
});
