/**
 * Comprehensive validation schemas using Zod
 * Provides type-safe validation for all API inputs
 */

import { z } from 'zod';

// Base validation patterns
const emailSchema = z.string().email('Invalid email format');
// Enhanced phone schema - more flexible, country-specific validation handled in validators
const phoneSchema = z.string().regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format').refine(
  (val) => val.replace(/\D/g, '').length >= 7 && val.replace(/\D/g, '').length <= 15,
  { message: 'Phone number must be between 7 and 15 digits' }
);
const zipCodeSchema = z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format');
const uuidSchema = z.string().uuid('Invalid UUID format');
const positiveNumber = z.number().positive('Must be a positive number');
const nonNegativeNumber = z.number().min(0, 'Must be non-negative');

// Address validation - Enhanced with country-specific support
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(255, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().max(100, 'State/Province too long').optional(),
  zip_code: z.string().optional(),
  postal_code: z.string().max(20, 'Postal code too long').optional(),
  country: z.string().default('United States'),
  region: z.string().max(100, 'Region too long').optional(),
  district: z.string().max(100, 'District too long').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
}).refine(
  (data) => {
    // Country-specific validation
    if (data.country === 'United States') {
      return data.state && data.state.length === 2 && data.zip_code && /^\d{5}(-\d{4})?$/.test(data.zip_code);
    }
    if (data.country === 'Guyana') {
      return data.region && data.region.length > 0;
    }
    if (data.country === 'Canada') {
      return data.state && data.postal_code && /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(data.postal_code);
    }
    return true; // Other countries - basic validation passed
  },
  { message: 'Address does not meet country-specific requirements' }
);

// User profile validation
export const userProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  phone_country_code: z.string().default('+1'),
  company_name: z.string().max(100, 'Company name too long').optional(),
  contact_person: z.string().max(100, 'Contact person name too long').optional(),
  address_line1: z.string().max(255, 'Address line 1 too long').optional(),
  address_line2: z.string().max(255, 'Address line 2 too long').optional(),
  city: z.string().max(100, 'City name too long').optional(),
  state: z.string().max(100, 'State/Province too long').optional(), // Increased for full state names
  zip_code: z.string().optional(), // Made more flexible - validation in address-validators
  postal_code: z.string().max(20, 'Postal code too long').optional(),
  country: z.string().max(100, 'Country name too long').default('United States'),
  region: z.string().max(100, 'Region name too long').optional(),
  district: z.string().max(100, 'District name too long').optional(),
  business_type: z.string().max(100, 'Business type too long').optional(),
  tax_id: z.string().max(50, 'Tax ID too long').optional(),
  preferred_contact_method: z.enum(['email', 'phone', 'sms']).default('email'),
  emergency_contact: z.string().max(100, 'Emergency contact name too long').optional(),
  emergency_phone: phoneSchema.optional(),
  preferences: z.record(z.any()).optional()
});

// Booking validation
export const createBookingSchema = z.object({
  quote_id: z.number().int().positive().optional(),
  shipment_id: z.number().int().positive().optional(),
  window_start: z.string().datetime('Invalid start time format'),
  window_end: z.string().datetime('Invalid end time format'),
  address: addressSchema,
  pickup_or_drop: z.enum(['pickup', 'dropoff'], { message: 'Invalid pickup/dropoff type' }),
  service_type: z.enum(['standard', 'express', 'priority']).default('standard'),
  estimated_weight: positiveNumber,
  notes: z.string().max(1000, 'Notes too long').optional(),
  idempotency_key: z.string().min(1, 'Idempotency key is required').max(255, 'Idempotency key too long')
}).refine(
  (data) => new Date(data.window_start) < new Date(data.window_end),
  {
    message: 'End time must be after start time',
    path: ['window_end']
  }
).refine(
  (data) => new Date(data.window_start) > new Date(),
  {
    message: 'Cannot book for past time slots',
    path: ['window_start']
  }
);

// Quote request validation
export const quoteRequestSchema = z.object({
  customerInfo: z.object({
    fullName: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
    email: emailSchema,
    phone: phoneSchema.optional(),
    company: z.string().max(100, 'Company name too long').optional()
  }),
  destinationId: z.number().int().positive('Invalid destination ID'),
  weight: positiveNumber,
  dimensions: z.object({
    length: positiveNumber.optional(),
    width: positiveNumber.optional(),
    height: positiveNumber.optional()
  }).optional(),
  serviceType: z.enum(['standard', 'express', 'priority']).default('standard'),
  declaredValue: nonNegativeNumber.optional(),
  rateBreakdown: z.object({
    baseShippingCost: nonNegativeNumber,
    expressSurcharge: nonNegativeNumber,
    totalCost: nonNegativeNumber
  }),
  specialInstructions: z.string().max(1000, 'Special instructions too long').optional()
});

// Shipment validation
export const createShipmentSchema = z.object({
  destination_id: z.number().int().positive('Invalid destination ID'),
  service_level: z.enum(['standard', 'express'], { message: 'Invalid service level' }),
  pickup_date: z.string().datetime().optional(),
  special_instructions: z.string().max(1000, 'Special instructions too long').optional(),
  declared_value: nonNegativeNumber.optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description is required').max(255, 'Description too long'),
    weight: positiveNumber,
    quantity: z.number().int().positive('Quantity must be positive'),
    length: positiveNumber.optional(),
    width: positiveNumber.optional(),
    height: positiveNumber.optional(),
    value: nonNegativeNumber.optional(),
    category: z.string().min(1, 'Category is required').max(50, 'Category too long'),
    notes: z.string().max(500, 'Item notes too long').optional()
  })).min(1, 'At least one item is required')
});

// Vehicle validation
export const vehicleSchema = z.object({
  name: z.string().min(1, 'Vehicle name is required').max(100, 'Name too long'),
  capacity_lbs: positiveNumber,
  active: z.boolean().default(true),
  vehicle_type: z.string().max(50, 'Vehicle type too long').optional(),
  license_plate: z.string().max(20, 'License plate too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional()
});

// Admin operations validation
export const adminUpdateBookingSchema = z.object({
  booking_id: z.number().int().positive('Invalid booking ID'),
  action: z.enum(['update', 'reschedule', 'assign_vehicle', 'change_status', 'bulk_update']),
  updates: z.record(z.any()).optional(),
  bulk_booking_ids: z.array(z.number().int().positive()).optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
  notify_customer: z.boolean().default(true)
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(1000, 'Limit cannot exceed 1000').default(50),
  cursor: z.string().optional(),
  sort_by: z.string().max(50, 'Sort field too long').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Search validation
export const searchSchema = z.object({
  query: z.string().max(255, 'Search query too long').optional(),
  filters: z.record(z.any()).optional(),
  date_range: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional()
});

// Contact form validation
export const contactFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.string().max(200, 'Subject too long').optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'),
  inquiryType: z.enum(['general', 'support', 'billing', 'partnership']).default('general')
});

// Rate limiting validation
export const rateLimitSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  endpoint: z.string().min(1, 'Endpoint is required'),
  limit: z.number().int().min(1).max(1000).default(10),
  windowMs: z.number().int().min(1000).max(3600000).default(60000)
});

// Error response validation
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().optional()
  })
});

// Success response validation
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  meta: z.object({
    timestamp: z.string().datetime(),
    requestId: z.string().optional(),
    pagination: paginationSchema.optional()
  }).optional()
});

// Generic API response
export const apiResponseSchema = z.union([errorResponseSchema, successResponseSchema]);

// Validation helper functions
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      throw new Error(`Validation failed: ${JSON.stringify(formattedErrors)}`);
    }
    throw error;
  }
};

// Sanitization helpers
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};
