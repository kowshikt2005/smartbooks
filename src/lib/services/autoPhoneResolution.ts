import { CustomerService } from './customers';
import { EnhancedPhonePropagationService } from './enhancedPhonePropagation';
import type { Customer } from '../supabase/types';

export interface AutoResolutionResult {
  totalProcessed: number;
  phonesAdded: number;
  skipped: number;
  errors: number;
  details: {
    contactName: string;
    action: 'added' | 'skipped' | 'error';
    phone?: string;
    reason?: string;
  }[];
}

export class AutoPhoneResolutionService {
  /**
   * Automatically resolve phone numbers for contacts without phones
   * by searching the customer database for similar names
   */
  static async autoResolvePhoneNumbers(sessionData: any): Promise<AutoResolutionResult> {
    const result: AutoResolutionResult = {
      totalProcessed: 0,
      phonesAdded: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    try {
      // Get contacts without phone numbers grouped by name
      const contactsWithoutPhone = EnhancedPhonePropagationService.getContactsWithoutPhone(sessionData);
      const uniqueNames = Object.keys(contactsWithoutPhone);
      
      result.totalProcessed = uniqueNames.length;

      for (const contactName of uniqueNames) {
        try {
          // Search for customers with similar names that have phone numbers
          const suggestedCustomers = await CustomerService.getCustomersWithPhoneByName(contactName);
          
          if (suggestedCustomers.length > 0) {
            // Use the first exact match or closest match
            const bestMatch = this.findBestMatch(contactName, suggestedCustomers);
            
            if (bestMatch && bestMatch.phone_no) {
              // Apply the phone number to all contacts with this name
              const propagationResult = EnhancedPhonePropagationService.propagatePhoneInSession(
                contactName,
                bestMatch.phone_no,
                sessionData
              );
              
              if (propagationResult.success) {
                result.phonesAdded++;
                result.details.push({
                  contactName,
                  action: 'added',
                  phone: bestMatch.phone_no,
                  reason: `Auto-matched with customer: ${bestMatch.name}`
                });
              } else {
                result.errors++;
                result.details.push({
                  contactName,
                  action: 'error',
                  reason: propagationResult.message
                });
              }
            } else {
              result.skipped++;
              result.details.push({
                contactName,
                action: 'skipped',
                reason: 'No suitable match found with phone number'
              });
            }
          } else {
            result.skipped++;
            result.details.push({
              contactName,
              action: 'skipped',
              reason: 'No similar customers found in database'
            });
          }
        } catch (error) {
          result.errors++;
          result.details.push({
            contactName,
            action: 'error',
            reason: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Auto-resolution failed:', error);
      throw new Error('Auto-resolution process failed. Please try manual resolution.');
    }
  }

  /**
   * Find the best matching customer for a contact name
   */
  private static findBestMatch(contactName: string, customers: Customer[]): Customer | null {
    if (customers.length === 0) return null;

    const normalizedContactName = contactName.toLowerCase().trim();
    
    // First, try to find exact match (case-insensitive)
    const exactMatch = customers.find(customer => 
      customer.name.toLowerCase().trim() === normalizedContactName
    );
    
    if (exactMatch) return exactMatch;

    // If no exact match, calculate similarity scores and return the best one
    let bestMatch = customers[0];
    let bestScore = this.calculateNameSimilarity(normalizedContactName, customers[0].name.toLowerCase().trim());

    for (let i = 1; i < customers.length; i++) {
      const score = this.calculateNameSimilarity(normalizedContactName, customers[i].name.toLowerCase().trim());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = customers[i];
      }
    }

    // Only return if similarity is above threshold (70%)
    return bestScore >= 0.7 ? bestMatch : null;
  }

  /**
   * Calculate name similarity using Levenshtein distance
   */
  private static calculateNameSimilarity(name1: string, name2: string): number {
    const matrix = [];
    const len1 = name1.length;
    const len2 = name2.length;

    // Create matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (name2.charAt(i - 1) === name1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : (maxLength - matrix[len2][len1]) / maxLength;
  }

  /**
   * Get a summary of contacts that could benefit from auto-resolution
   */
  static async getAutoResolutionPreview(sessionData: any): Promise<{
    totalContactsWithoutPhone: number;
    potentialMatches: number;
    previewMatches: { contactName: string; suggestedCustomer: Customer | null }[];
  }> {
    try {
      const contactsWithoutPhone = EnhancedPhonePropagationService.getContactsWithoutPhone(sessionData);
      const uniqueNames = Object.keys(contactsWithoutPhone);
      
      let potentialMatches = 0;
      const previewMatches: { contactName: string; suggestedCustomer: Customer | null }[] = [];

      // Check first 5 names for preview
      const namesToCheck = uniqueNames.slice(0, 5);
      
      for (const contactName of namesToCheck) {
        try {
          const suggestedCustomers = await CustomerService.getCustomersWithPhoneByName(contactName);
          const bestMatch = this.findBestMatch(contactName, suggestedCustomers);
          
          previewMatches.push({
            contactName,
            suggestedCustomer: bestMatch
          });
          
          if (bestMatch) {
            potentialMatches++;
          }
        } catch (error) {
          previewMatches.push({
            contactName,
            suggestedCustomer: null
          });
        }
      }

      return {
        totalContactsWithoutPhone: uniqueNames.length,
        potentialMatches,
        previewMatches
      };
    } catch (error) {
      console.error('Auto-resolution preview failed:', error);
      return {
        totalContactsWithoutPhone: 0,
        potentialMatches: 0,
        previewMatches: []
      };
    }
  }
}