import { CustomerService } from './customers';
import type { Customer } from '../supabase/types';

export interface MatchResult {
  customer: Customer | null;
  confidence: 'exact' | 'none'; // SIMPLIFIED: Only exact or none
  matchType: 'name_exact' | 'no_match'; // SIMPLIFIED: Only two types
}

/**
 * Customer Name Matcher - Replaces WhatsAppMappingService Complex Logic
 * 
 * This service implements simplified customer matching that:
 * - Uses exact name matching only (case-insensitive)
 * - No fuzzy matching or similarity algorithms
 * - Simple normalization for consistent matching
 * - Fast performance with cached customer data
 */
export class CustomerMatcher {
  private static customerCache: Customer[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Find customer by name with exact matching only
   * Requirements: 3.1, 3.2, 3.3
   */
  static async findByName(name: string): Promise<MatchResult> {
    try {
      const normalizedName = this.normalizeNameForMatching(name);
      const customers = await this.getAllCustomersForMatching();
      
      // Exact match only - no fuzzy logic
      const exactMatch = customers.find(customer => 
        this.normalizeNameForMatching(customer.name) === normalizedName
      );
      
      if (exactMatch) {
        return {
          customer: exactMatch,
          confidence: 'exact',
          matchType: 'name_exact'
        };
      }
      
      return {
        customer: null,
        confidence: 'none',
        matchType: 'no_match'
      };
    } catch (error) {
      console.error('Error finding customer by name:', error);
      return {
        customer: null,
        confidence: 'none',
        matchType: 'no_match'
      };
    }
  }

  /**
   * Simple name normalization for exact matching
   * Requirements: 3.1, 3.2
   */
  static normalizeNameForMatching(name: string): string {
    return name.trim().toLowerCase()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s]/g, ''); // Remove special characters
  }

  /**
   * Get all customers for matching with caching
   * Requirements: 3.3, 10.3
   */
  static async getAllCustomersForMatching(): Promise<Customer[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.customerCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.customerCache;
    }
    
    try {
      const { data: customers } = await CustomerService.getAll();
      
      // Update cache
      this.customerCache = customers;
      this.cacheTimestamp = now;
      
      return customers;
    } catch (error) {
      console.error('Error fetching customers for matching:', error);
      
      // Return cached data if available, even if expired
      if (this.customerCache) {
        console.warn('Using expired customer cache due to fetch error');
        return this.customerCache;
      }
      
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Clear customer cache (useful for testing or after customer updates)
   */
  static clearCache(): void {
    this.customerCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Find multiple customers by names (batch operation)
   * Requirements: 10.1, 10.2
   */
  static async findMultipleByNames(names: string[]): Promise<Map<string, MatchResult>> {
    const results = new Map<string, MatchResult>();
    const customers = await this.getAllCustomersForMatching();
    
    // Create a normalized name lookup map for performance
    const customerLookup = new Map<string, Customer>();
    customers.forEach(customer => {
      const normalizedName = this.normalizeNameForMatching(customer.name);
      customerLookup.set(normalizedName, customer);
    });
    
    // Process all names
    names.forEach(name => {
      const normalizedName = this.normalizeNameForMatching(name);
      const matchedCustomer = customerLookup.get(normalizedName);
      
      if (matchedCustomer) {
        results.set(name, {
          customer: matchedCustomer,
          confidence: 'exact',
          matchType: 'name_exact'
        });
      } else {
        results.set(name, {
          customer: null,
          confidence: 'none',
          matchType: 'no_match'
        });
      }
    });
    
    return results;
  }

  /**
   * Get matching statistics for a set of names
   * Requirements: 5.3, 8.3
   */
  static async getMatchingStatistics(names: string[]): Promise<{
    totalNames: number;
    exactMatches: number;
    noMatches: number;
    matchRate: number;
  }> {
    const results = await this.findMultipleByNames(names);
    
    let exactMatches = 0;
    let noMatches = 0;
    
    results.forEach(result => {
      if (result.confidence === 'exact') {
        exactMatches++;
      } else {
        noMatches++;
      }
    });
    
    const totalNames = names.length;
    const matchRate = totalNames > 0 ? (exactMatches / totalNames) * 100 : 0;
    
    return {
      totalNames,
      exactMatches,
      noMatches,
      matchRate: Math.round(matchRate * 100) / 100
    };
  }

  /**
   * Validate customer name for matching
   * Requirements: 7.1, 7.2
   */
  static validateCustomerName(name: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!name || typeof name !== 'string') {
      return {
        isValid: false,
        error: 'Name is required'
      };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return {
        isValid: false,
        error: 'Name cannot be empty'
      };
    }
    
    if (trimmedName.length < 2) {
      return {
        isValid: false,
        error: 'Name must be at least 2 characters long'
      };
    }
    
    if (trimmedName.length > 255) {
      return {
        isValid: false,
        error: 'Name cannot exceed 255 characters'
      };
    }
    
    return {
      isValid: true
    };
  }

  /**
   * Check if a customer name already exists (for duplicate prevention)
   * Requirements: 7.3
   */
  static async checkNameExists(name: string): Promise<boolean> {
    const result = await this.findByName(name);
    return result.customer !== null;
  }

  /**
   * Get customer suggestions for partial names (for UI autocomplete)
   * Requirements: 8.2
   */
  static async getNameSuggestions(partialName: string, limit: number = 5): Promise<Customer[]> {
    if (!partialName || partialName.trim().length < 2) {
      return [];
    }
    
    const customers = await this.getAllCustomersForMatching();
    const normalizedPartial = this.normalizeNameForMatching(partialName);
    
    const suggestions = customers
      .filter(customer => {
        const normalizedCustomerName = this.normalizeNameForMatching(customer.name);
        return normalizedCustomerName.includes(normalizedPartial);
      })
      .slice(0, limit);
    
    return suggestions;
  }
}