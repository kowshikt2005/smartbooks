/**
 * Phone number utility functions for contact clustering and WhatsApp integration
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  formatted?: string;
  message?: string;
}

/**
 * Normalize phone number for comparison and storage
 * Removes formatting characters and standardizes the format
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.toString().replace(/[\s\-\(\)\+]/g, '');
  
  // Remove leading country code if present
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove leading zero if present
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Format phone number for display
 * Adds appropriate formatting for readability
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length === 10) {
    // Format as: +91 XXXXX XXXXX
    return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  } else if (normalized.length === 11 && normalized.startsWith('91')) {
    // Already has country code
    const number = normalized.slice(2);
    return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
  }
  
  // Return original if format is unclear
  return phone;
}

/**
 * Format phone number for WhatsApp URL
 * Ensures proper country code format for WhatsApp links
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length === 10) {
    // Add Indian country code
    return `91${normalized}`;
  } else if (normalized.length === 11 && normalized.startsWith('91')) {
    // Already has country code
    return normalized;
  } else if (normalized.length === 12 && normalized.startsWith('91')) {
    // Remove extra digit if present
    return normalized.slice(0, 12);
  }
  
  // For other formats, try to add country code if it looks like a 10-digit number
  if (normalized.length === 10 && /^\d{10}$/.test(normalized)) {
    return `91${normalized}`;
  }
  
  return normalized;
}

/**
 * Validate phone number format
 * Checks if the phone number is in a valid format
 */
export function validatePhoneNumber(phone: string | null | undefined): PhoneValidationResult {
  if (!phone || !phone.toString().trim()) {
    return {
      isValid: false,
      message: 'Phone number is required'
    };
  }
  
  const normalized = normalizePhoneNumber(phone);
  
  // Check if it contains only digits
  if (!/^\d+$/.test(normalized)) {
    return {
      isValid: false,
      message: 'Phone number can only contain digits'
    };
  }
  
  // Check length constraints
  if (normalized.length < 10) {
    return {
      isValid: false,
      message: 'Phone number must be at least 10 digits'
    };
  }
  
  if (normalized.length > 15) {
    return {
      isValid: false,
      message: 'Phone number cannot exceed 15 digits'
    };
  }
  
  // Additional validation for Indian phone numbers
  if (normalized.length === 10) {
    // Check if it starts with valid Indian mobile prefixes
    const firstDigit = normalized.charAt(0);
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return {
        isValid: false,
        message: 'Indian mobile numbers should start with 6, 7, 8, or 9'
      };
    }
  }
  
  return {
    isValid: true,
    normalized,
    formatted: formatPhoneForDisplay(phone)
  };
}

/**
 * Compare two phone numbers for equality
 * Normalizes both numbers before comparison
 */
export function arePhoneNumbersEqual(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  const norm1 = normalizePhoneNumber(phone1);
  const norm2 = normalizePhoneNumber(phone2);
  
  return norm1 === norm2 && norm1.length > 0;
}

/**
 * Extract phone numbers from text
 * Finds potential phone numbers in a text string
 */
export function extractPhoneNumbers(text: string): string[] {
  if (!text) return [];
  
  // Regex patterns for different phone number formats
  const patterns = [
    /\+91[\s\-]?\d{5}[\s\-]?\d{5}/g,  // +91 XXXXX XXXXX
    /91[\s\-]?\d{5}[\s\-]?\d{5}/g,    // 91 XXXXX XXXXX
    /\d{5}[\s\-]?\d{5}/g,              // XXXXX XXXXX
    /\d{10}/g                          // XXXXXXXXXX
  ];
  
  const phoneNumbers: string[] = [];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const validation = validatePhoneNumber(match);
        if (validation.isValid && validation.normalized) {
          phoneNumbers.push(validation.normalized);
        }
      });
    }
  });
  
  // Remove duplicates
  return [...new Set(phoneNumbers)];
}

/**
 * Generate WhatsApp URL with message
 * Creates a properly formatted WhatsApp URL
 */
export function generateWhatsAppUrl(phone: string, message?: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  
  if (!formattedPhone) {
    throw new Error('Invalid phone number for WhatsApp');
  }
  
  let url = `https://wa.me/${formattedPhone}`;
  
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    url += `?text=${encodedMessage}`;
  }
  
  return url;
}

/**
 * Batch validate phone numbers
 * Validates multiple phone numbers and returns results
 */
export function batchValidatePhoneNumbers(phones: (string | null | undefined)[]): PhoneValidationResult[] {
  return phones.map(phone => validatePhoneNumber(phone));
}

/**
 * Get unique phone numbers from a list
 * Returns deduplicated list of normalized phone numbers
 */
export function getUniquePhoneNumbers(phones: (string | null | undefined)[]): string[] {
  const normalized = phones
    .map(phone => normalizePhoneNumber(phone))
    .filter(phone => phone.length > 0);
  
  return [...new Set(normalized)];
}

/**
 * Check if phone number is likely Indian mobile number
 */
export function isIndianMobileNumber(phone: string | null | undefined): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length !== 10) return false;
  
  const firstDigit = normalized.charAt(0);
  return ['6', '7', '8', '9'].includes(firstDigit);
}