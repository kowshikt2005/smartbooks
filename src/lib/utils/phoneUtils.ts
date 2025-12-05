/**
 * Phone number utility functions for the simplified customer matching system
 * These utilities are used by CustomerMatcher and can be used throughout the app
 */

import { CustomerMatcher } from '../services/customerMatcher';

/**
 * Validate and format a phone number
 * @param phone - Raw phone number input
 * @returns Validation result with formatted phone number
 */
export function validateAndFormatPhone(phone: string) {
  return CustomerMatcher.validatePhoneNumber(phone);
}

/**
 * Format phone number for display (with formatting)
 * @param phone - Phone number to format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const digits = CustomerMatcher.formatPhoneNumber(phone);
  
  // Format based on length
  if (digits.length === 10) {
    // US format: (123) 456-7890
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US format with country code: +1 (123) 456-7890
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length >= 10) {
    // International format: +XX XXXXXXXXXX
    const countryCode = digits.slice(0, digits.length - 10);
    const number = digits.slice(-10);
    return `+${countryCode} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  
  // Fallback: just return the digits
  return digits;
}

/**
 * Check if two phone numbers are equivalent
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns True if phones are equivalent
 */
export function arePhoneNumbersEquivalent(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false;
  
  const formatted1 = CustomerMatcher.formatPhoneNumber(phone1);
  const formatted2 = CustomerMatcher.formatPhoneNumber(phone2);
  
  return formatted1 === formatted2;
}

/**
 * Extract phone numbers from text (useful for parsing Excel data)
 * @param text - Text that might contain phone numbers
 * @returns Array of potential phone numbers found
 */
export function extractPhoneNumbers(text: string): string[] {
  if (!text) return [];
  
  // Regex to find potential phone numbers (10-15 digits with optional formatting)
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})(?:\s?(?:ext|x|extension)\.?\s?(\d+))?/g;
  
  const matches = [];
  let match;
  
  while ((match = phoneRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const formatted = CustomerMatcher.formatPhoneNumber(fullMatch);
    
    if (CustomerMatcher.validatePhoneNumber(formatted).isValid) {
      matches.push(formatted);
    }
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Normalize phone number for consistent storage and comparison
 * This is the main function used throughout the app for phone number handling
 * @param phone - Raw phone number input
 * @returns Normalized phone number or empty string if invalid
 */
export function normalizePhoneNumber(phone: string): string {
  const validation = CustomerMatcher.validatePhoneNumber(phone);
  return validation.isValid ? validation.formatted : '';
}

/**
 * Get phone number validation error message
 * @param phone - Phone number to validate
 * @returns Error message or null if valid
 */
export function getPhoneValidationError(phone: string): string | null {
  const validation = CustomerMatcher.validatePhoneNumber(phone);
  return validation.error || null;
}

/**
 * Check if a phone number is valid for WhatsApp messaging
 * @param phone - Phone number to check
 * @returns True if valid for WhatsApp
 */
export function isValidForWhatsApp(phone: string): boolean {
  const validation = CustomerMatcher.validatePhoneNumber(phone);
  
  if (!validation.isValid) return false;
  
  // WhatsApp typically requires at least 10 digits
  return validation.formatted.length >= 10;
}

/**
 * Format phone number for WhatsApp API
 * @param phone - Phone number to format
 * @returns Phone number formatted for WhatsApp API
 */
export function formatForWhatsApp(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) return '';
  
  // WhatsApp API typically expects numbers without + prefix
  // but with country code (assuming Indian numbers if 10 digits)
  if (normalized.length === 10) {
    return `91${normalized}`; // Add India country code
  }
  
  return normalized;
}