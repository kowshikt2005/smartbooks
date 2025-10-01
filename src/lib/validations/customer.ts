import { z } from 'zod';

// Discount rules schema
export const discountRulesSchema = z.object({
  line_discount: z.number().min(0).max(100).optional(),
  group_discount: z.number().min(0).max(100).optional(),
  brand_discount: z.number().min(0).max(100).optional(),
});

// Customer form validation schema
export const customerFormSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255, 'Name is too long'),
  phone: z.string().optional().refine((val) => {
    if (!val) return true;
    // Basic phone validation - allows various formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(val.replace(/[\s\-\(\)]/g, ''));
  }, 'Please enter a valid phone number'),
  gst_id: z.string().optional().refine((val) => {
    if (!val) return true;
    // GST ID validation - basic format check
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(val.toUpperCase());
  }, 'Please enter a valid GST ID (15 characters)'),
  address: z.string().optional(),
  discount_rules: discountRulesSchema.optional().default({}),
});

// Customer search schema
export const customerSearchSchema = z.object({
  search: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  orderBy: z.enum(['name', 'phone', 'gst_id', 'created_at', 'updated_at']).optional().default('name'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Export types
export type CustomerFormData = z.infer<typeof customerFormSchema>;
export type CustomerSearchParams = z.infer<typeof customerSearchSchema>;
export type DiscountRules = z.infer<typeof discountRulesSchema>;