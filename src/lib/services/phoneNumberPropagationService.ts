/**
 * Enhanced Phone Number Propagation Service
 * Handles automatic phone number propagation from Customer database to WhatsApp data
 * Ensures consistency and validation across both systems
 */

import { validatePhoneNumber, normalizePhoneNumber, arePhoneNumbersEqual } from '../../utils/phoneUtils';
import { CustomerService } from './customers';
import type { Customer } from '../supabase/types';
import type { MappingResult } from './whatsappMapping';

export interface PhoneUpdateResult {
  success: boolean;
  updatedRecords: string[];
  errors: string[];
  validationErrors: string[];
  propagatedCount: number;
}

export interface PhonePropagationSummary {
  totalProcessed: number;
  autoLinked: number;
  validated: number;
  propagated: number;
  errors: number;
  validationFailures: number;
}

export interface SessionPhoneUpdate {
  recordId: string;
  oldPhone: string;
  newPhone: string;
  source: 'customer_db' | 'validation' | 'manual';
  timestamp: Date;
}

export class PhoneNumberPropagationService {
  /**
   * Enhance mapping results with automatic phone number propagation
   * Ensures matched customers automatically provide phone numbers to WhatsApp data
   */
  static async enhanceMappingResultsWithPhonePropagation(
    mappingResults: MappingResult[]
  ): Promise<{ enhancedResults: MappingResult[]; summary: PhonePropagationSummary }> {
    const summary: PhonePropagationSummary = {
      totalProcessed: mappingResults.length,
      autoLinked: 0,
      validated: 0,
      propagated: 0,
      errors: 0,
      validationFailures: 0
    };

    const enhancedResults: MappingResult[] = [];

    for (const result of mappingResults) {
      try {
        const enhancedResult = await this.enhanceSingleMappingResult(result);
        enhancedResults.push(enhancedResult);

        // Update summary statistics
        if (enhancedResult.matched_contact && enhancedResult.final_phone !== result.final_phone) {
          summary.autoLinked++;
          summary.propagated++;
        }

        // Validate final phone number
        const validation = validatePhoneNumber(enhancedResult.final_phone);
        if (validation.isValid) {
          summary.validated++;
        } else {
          summary.validationFailures++;
        }

      } catch (error) {
        console.error('Error enhancing mapping result:', error);
        enhancedResults.push(result); // Keep original on error
        summary.errors++;
      }
    }

    console.log('Phone propagation summary:', summary);
    return { enhancedResults, summary };
  }

  /**
   * Enhance a single mapping result with phone number propagation
   */
  private static async enhanceSingleMappingResult(result: MappingResult): Promise<MappingResult> {
    // If no matched customer, return as-is
    if (!result.matched_contact) {
      return result;
    }

    const customerPhone = result.matched_contact.phone_no;
    const importedPhone = result.imported_phone;
    const currentFinalPhone = result.final_phone;

    // Validate customer database phone
    const customerPhoneValidation = validatePhoneNumber(customerPhone);
    
    // Priority logic for phone number selection
    let selectedPhone = currentFinalPhone;
    let phoneSource = result.source;

    // 1. If customer has valid phone and current final phone is empty/invalid, use customer phone
    if (customerPhoneValidation.isValid && (!currentFinalPhone || !validatePhoneNumber(currentFinalPhone).isValid)) {
      selectedPhone = customerPhoneValidation.normalized!;
      phoneSource = 'contact_db';
    }
    // 2. If customer has valid phone and it's different from current, prefer customer phone (simplified approach)
    else if (customerPhoneValidation.isValid && currentFinalPhone && !arePhoneNumbersEqual(customerPhone, currentFinalPhone)) {
      // For simplified approach, always prefer customer database phone when available
      selectedPhone = customerPhoneValidation.normalized!;
      phoneSource = 'contact_db';
    }
    // 3. If no customer phone but imported phone is valid, use imported
    else if (!customerPhoneValidation.isValid && importedPhone && validatePhoneNumber(importedPhone).isValid) {
      selectedPhone = validatePhoneNumber(importedPhone).normalized!;
      phoneSource = 'imported';
    }

    // Create enhanced result
    const enhancedResult: MappingResult = {
      ...result,
      final_phone: selectedPhone,
      source: phoneSource
    };

    return enhancedResult;
  }

  /**
   * Update WhatsApp session storage with customer database phone numbers
   * Ensures session data uses customer database phones immediately
   */
  static updateSessionStorageWithCustomerPhones(
    sessionData: any,
    mappingResults: MappingResult[]
  ): { updatedSessionData: any; updates: SessionPhoneUpdate[] } {
    if (!sessionData || !sessionData.customers) {
      return { updatedSessionData: sessionData, updates: [] };
    }

    const updates: SessionPhoneUpdate[] = [];
    const updatedCustomers = sessionData.customers.map((customer: any) => {
      // Find corresponding mapping result
      const mappingResult = mappingResults.find(result => 
        result.final_name === customer.name || 
        result.imported_name === customer.name
      );

      if (mappingResult && mappingResult.matched_contact) {
        const customerDbPhone = mappingResult.matched_contact.phone_no;
        const currentPhone = customer.phone_no;

        // Validate customer database phone
        const validation = validatePhoneNumber(customerDbPhone);
        
        if (validation.isValid && !arePhoneNumbersEqual(currentPhone, customerDbPhone)) {
          // Update phone number from customer database
          updates.push({
            recordId: customer.id,
            oldPhone: currentPhone || '',
            newPhone: validation.normalized!,
            source: 'customer_db',
            timestamp: new Date()
          });

          return {
            ...customer,
            phone_no: validation.normalized!
          };
        }
      }

      return customer;
    });

    const updatedSessionData = {
      ...sessionData,
      customers: updatedCustomers,
      lastPhoneUpdate: Date.now()
    };

    return { updatedSessionData, updates };
  }

  /**
   * Validate and ensure phone number consistency across records
   * Adds comprehensive phone number validation and consistency checks
   */
  static validatePhoneNumberConsistency(
    mappingResults: MappingResult[]
  ): { isConsistent: boolean; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Group by customer ID to check consistency
    const customerGroups = new Map<string, MappingResult[]>();
    
    mappingResults.forEach(result => {
      if (result.matched_contact) {
        const customerId = result.matched_contact.id;
        if (!customerGroups.has(customerId)) {
          customerGroups.set(customerId, []);
        }
        customerGroups.get(customerId)!.push(result);
      }
    });

    // Check consistency within customer groups
    customerGroups.forEach((results, customerId) => {
      const phones = results.map(r => r.final_phone).filter(p => p);
      const uniquePhones = [...new Set(phones.map(p => normalizePhoneNumber(p)))].filter(p => p);

      if (uniquePhones.length > 1) {
        issues.push(`Customer ${customerId} has inconsistent phone numbers: ${uniquePhones.join(', ')}`);
        recommendations.push(`Standardize phone number for customer ${customerId} to use database value`);
      }
    });

    // Check for invalid phone numbers
    mappingResults.forEach((result, index) => {
      if (result.final_phone) {
        const validation = validatePhoneNumber(result.final_phone);
        if (!validation.isValid) {
          issues.push(`Record ${index + 1} (${result.final_name}) has invalid phone: ${result.final_phone} - ${validation.message}`);
          recommendations.push(`Fix phone number format for ${result.final_name}`);
        }
      } else if (result.matched_contact) {
        issues.push(`Record ${index + 1} (${result.final_name}) has matched customer but no phone number`);
        recommendations.push(`Add phone number for customer ${result.final_name}`);
      }
    });

    return {
      isConsistent: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Sync phone numbers between Customer database and WhatsApp session
   * Maintains existing WhatsApp session data structure while ensuring consistency
   */
  static async syncPhoneNumbersBetweenSystems(
    customerId: string,
    newPhone: string,
    sessionData: any
  ): Promise<PhoneUpdateResult> {
    const result: PhoneUpdateResult = {
      success: false,
      updatedRecords: [],
      errors: [],
      validationErrors: [],
      propagatedCount: 0
    };

    try {
      // Validate phone number first
      const validation = validatePhoneNumber(newPhone);
      if (!validation.isValid) {
        result.validationErrors.push(validation.message || 'Invalid phone number format');
        return result;
      }

      const normalizedPhone = validation.normalized!;

      // Update customer database
      try {
        await CustomerService.update(customerId, { phone_no: normalizedPhone });
        result.updatedRecords.push(`customer_${customerId}`);
      } catch (error) {
        result.errors.push(`Failed to update customer database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return result;
      }

      // Update session storage if provided
      if (sessionData && sessionData.customers) {
        let sessionUpdated = false;
        
        // Find and update all records for this customer in session
        sessionData.customers = sessionData.customers.map((customer: any) => {
          // Match by customer ID if available, or by name
          const isMatch = customer.customerId === customerId || 
                         (customer.name && sessionData.mappingResults?.some((mr: MappingResult) => 
                           mr.matched_contact?.id === customerId && 
                           (mr.final_name === customer.name || mr.imported_name === customer.name)
                         ));

          if (isMatch) {
            sessionUpdated = true;
            result.propagatedCount++;
            return {
              ...customer,
              phone_no: normalizedPhone
            };
          }
          return customer;
        });

        if (sessionUpdated) {
          // Update session storage
          sessionData.lastPhoneUpdate = Date.now();
          localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
          result.updatedRecords.push('session_storage');
        }
      }

      result.success = true;
      console.log(`Phone number sync completed for customer ${customerId}: ${result.propagatedCount} records updated`);

    } catch (error) {
      result.errors.push(`Sync operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Ensure all contacts have valid phone numbers for messaging
   * Validates that import processing results in messaging-ready contacts
   */
  static validateMessagingReadiness(
    mappingResults: MappingResult[]
  ): { ready: boolean; readyCount: number; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let readyCount = 0;

    mappingResults.forEach((result, index) => {
      const hasValidPhone = result.final_phone && validatePhoneNumber(result.final_phone).isValid;
      
      if (hasValidPhone) {
        readyCount++;
      } else {
        const recordName = result.final_name || `Record ${index + 1}`;
        issues.push(`${recordName} is missing valid phone number for messaging`);
        
        if (result.matched_contact && result.matched_contact.phone_no) {
          recommendations.push(`Use customer database phone for ${recordName}: ${result.matched_contact.phone_no}`);
        } else if (result.imported_phone) {
          recommendations.push(`Validate and fix imported phone for ${recordName}: ${result.imported_phone}`);
        } else {
          recommendations.push(`Add phone number for ${recordName} before messaging`);
        }
      }
    });

    return {
      ready: issues.length === 0,
      readyCount,
      issues,
      recommendations
    };
  }

  /**
   * Get phone propagation statistics for reporting
   */
  static getPhonePropagationStatistics(
    originalResults: MappingResult[],
    enhancedResults: MappingResult[]
  ): {
    totalRecords: number;
    phonesPropagated: number;
    validationFixed: number;
    consistencyImproved: number;
    messagingReady: number;
  } {
    const stats = {
      totalRecords: originalResults.length,
      phonesPropagated: 0,
      validationFixed: 0,
      consistencyImproved: 0,
      messagingReady: 0
    };

    enhancedResults.forEach((enhanced, index) => {
      const original = originalResults[index];
      
      // Count phones propagated from customer database
      if (enhanced.final_phone !== original.final_phone && enhanced.source === 'contact_db') {
        stats.phonesPropagated++;
      }

      // Count validation improvements
      const originalValid = validatePhoneNumber(original.final_phone).isValid;
      const enhancedValid = validatePhoneNumber(enhanced.final_phone).isValid;
      if (!originalValid && enhancedValid) {
        stats.validationFixed++;
      }

      // Count messaging ready records
      if (enhancedValid) {
        stats.messagingReady++;
      }
    });

    return stats;
  }
}