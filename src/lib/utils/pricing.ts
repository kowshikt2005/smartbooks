import type { DiscountRules } from '../validations/customer';

/**
 * Calculate final price after applying customer discount rules
 * Formula: FinalPrice = BasePrice × (1-Line) × (1-Group) × (1-Brand)
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discountRules: DiscountRules
): number {
  const lineDiscount = (discountRules.line_discount || 0) / 100;
  const groupDiscount = (discountRules.group_discount || 0) / 100;
  const brandDiscount = (discountRules.brand_discount || 0) / 100;

  const finalPrice = basePrice * 
    (1 - lineDiscount) * 
    (1 - groupDiscount) * 
    (1 - brandDiscount);

  return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate total discount percentage from individual discount rules
 */
export function calculateTotalDiscountPercentage(
  discountRules: DiscountRules
): number {
  const lineDiscount = (discountRules.line_discount || 0) / 100;
  const groupDiscount = (discountRules.group_discount || 0) / 100;
  const brandDiscount = (discountRules.brand_discount || 0) / 100;

  // Calculate compound discount
  const totalDiscountMultiplier = (1 - lineDiscount) * (1 - groupDiscount) * (1 - brandDiscount);
  const totalDiscountPercentage = (1 - totalDiscountMultiplier) * 100;

  return Math.round(totalDiscountPercentage * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate discount amount from base price and discount rules
 */
export function calculateDiscountAmount(
  basePrice: number,
  discountRules: DiscountRules
): number {
  const finalPrice = calculateDiscountedPrice(basePrice, discountRules);
  return basePrice - finalPrice;
}

/**
 * Validate discount rules to ensure they are within acceptable ranges
 */
export function validateDiscountRules(discountRules: DiscountRules): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check individual discount limits
  if (discountRules.line_discount && (discountRules.line_discount < 0 || discountRules.line_discount > 100)) {
    errors.push('Line discount must be between 0% and 100%');
  }

  if (discountRules.group_discount && (discountRules.group_discount < 0 || discountRules.group_discount > 100)) {
    errors.push('Group discount must be between 0% and 100%');
  }

  if (discountRules.brand_discount && (discountRules.brand_discount < 0 || discountRules.brand_discount > 100)) {
    errors.push('Brand discount must be between 0% and 100%');
  }

  // Check total discount doesn't exceed reasonable limits (e.g., 95%)
  const totalDiscount = calculateTotalDiscountPercentage(discountRules);
  if (totalDiscount > 95) {
    errors.push('Total combined discount cannot exceed 95%');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get discount breakdown for display purposes
 */
export function getDiscountBreakdown(
  basePrice: number,
  discountRules: DiscountRules
): {
  basePrice: number;
  lineDiscount: { percentage: number; amount: number };
  groupDiscount: { percentage: number; amount: number };
  brandDiscount: { percentage: number; amount: number };
  totalDiscount: { percentage: number; amount: number };
  finalPrice: number;
} {
  const lineDiscountPercentage = discountRules.line_discount || 0;
  const groupDiscountPercentage = discountRules.group_discount || 0;
  const brandDiscountPercentage = discountRules.brand_discount || 0;

  // Calculate step-by-step discounts
  let currentPrice = basePrice;
  
  // Apply line discount
  const lineDiscountAmount = currentPrice * (lineDiscountPercentage / 100);
  currentPrice -= lineDiscountAmount;

  // Apply group discount
  const groupDiscountAmount = currentPrice * (groupDiscountPercentage / 100);
  currentPrice -= groupDiscountAmount;

  // Apply brand discount
  const brandDiscountAmount = currentPrice * (brandDiscountPercentage / 100);
  currentPrice -= brandDiscountAmount;

  const finalPrice = currentPrice;
  const totalDiscountAmount = basePrice - finalPrice;
  const totalDiscountPercentage = calculateTotalDiscountPercentage(discountRules);

  return {
    basePrice,
    lineDiscount: {
      percentage: lineDiscountPercentage,
      amount: Math.round(lineDiscountAmount * 100) / 100,
    },
    groupDiscount: {
      percentage: groupDiscountPercentage,
      amount: Math.round(groupDiscountAmount * 100) / 100,
    },
    brandDiscount: {
      percentage: brandDiscountPercentage,
      amount: Math.round(brandDiscountAmount * 100) / 100,
    },
    totalDiscount: {
      percentage: totalDiscountPercentage,
      amount: Math.round(totalDiscountAmount * 100) / 100,
    },
    finalPrice: Math.round(finalPrice * 100) / 100,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(2)}%`;
}