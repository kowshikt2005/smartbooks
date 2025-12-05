import { CustomerService } from './customers';
import type { Customer } from '../supabase/types';

export interface PhoneUpdateResult {
  success: boolean;
  updatedRecords: string[];
  errors: string[];
}

export interface PhoneValidationResult {
  isValid: boolean;
  formattedPhone?: string;
  error?: string;
}

/**
 * Phone Number Service for automatic phone propagation
 * 
 * This service handles:
 * - Phone number validation and formatting
 * - Automatic phone number propagation from Customer database
 * - Data synchronization between Customer database and WhatsApp data
 * - Audit trail logging for phone number changes
 */
export class PhoneNumberService {
  /**
   * Validate phone number format
   * Requirements: 4.3, 7.1
   */
  static validatePhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Validate phone number with detailed result
   * Requirements: 4.3, 7.1, 7.2
   */
  static validatePhoneNumberDetailed(phone: string): PhoneValidationResult {
    if (!phone || typeof phone !== 'string') {
      return {
        isValid: false,
        error: 'Phone number is required'
      };
    }
    
    const trimmedPhone = phone.trim();
    
    if (trimmedPhone.length === 0) {
      return {
        isValid: false,
        error: 'Phone number cannot be empty'
      };
    }
    
    const cleanPhone = trimmedPhone.replace(/\D/g, '');
    
    if (cleanPhone.length === 0) {
      return {
        isValid: false,
        error: 'Phone number must contain digits'
      };
    }
    
    if (cleanPhone.length < 10) {
      return {
        isValid: false,
        error: 'Phone number must be at least 10 digits'
      };
    }
    
    if (cleanPhone.length > 15) {
      return {
        isValid: false,
        error: 'Phone number cannot exceed 15 digits'
      };
    }
    
    return {
      isValid: true,
      formattedPhone: cleanPhone
    };
  }

  /**
   * Format phone number to standard format
   * Requirements: 4.3
   */
  static formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    // Remove all non-digits and limit to 20 characters (database constraint)
    return phone.replace(/\D/g, '').substring(0, 20);
  }

  /**
   * Update WhatsApp record with phone number
   * Requirements: 4.1, 4.2
   */
  static async updateWhatsAppRecord(recordId: string, phone: string): Promise<void> {
    // This would update the WhatsApp session data
    // For now, we'll implement basic session storage update
    try {
      const validationResult = this.validatePhoneNumberDetailed(phone);
      
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || 'Invalid phone number');
      }
      
      const formattedPhone = validationResult.formattedPhone!;
      
      // Update session storage (this would be replaced with proper session management)
      if (typeof window !== 'undefined' && window.localStorage) {
        const sessionData = JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}');
        
        if (sessionData.customers && Array.isArray(sessionData.customers)) {
          const recordIndex = sessionData.customers.findIndex((c: any) => c.id === recordId);
          if (recordIndex >= 0) {
            sessionData.customers[recordIndex].phone_no = formattedPhone;
            localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
          }
        }
      }
      
      console.log(`Updated WhatsApp record ${recordId} with phone: ${formattedPhone}`);
    } catch (error) {
      console.error('Error updating WhatsApp record:', error);
      throw error;
    }
  }

  /**
   * Synchronize phone numbers between Customer database and WhatsApp data
   * Requirements: 4.1, 4.2, 4.4, 5.1
   */
  static async syncPhoneNumbers(customerId: string, phone: string): Promise<PhoneUpdateResult> {
    try {
      const validationResult = this.validatePhoneNumberDetailed(phone);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          updatedRecords: [],
          errors: [validationResult.error || 'Invalid phone number format']
        };
      }
      
      const formattedPhone = validationResult.formattedPhone!;
      
      // Update customer database
      await CustomerService.update(customerId, { phone_no: formattedPhone });
      
      // Update WhatsApp session data
      await this.updateWhatsAppSessionPhone(customerId, formattedPhone);
      
      // Log audit trail
      await this.logPhoneUpdate(customerId, formattedPhone);
      
      return {
        success: true,
        updatedRecords: [customerId],
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        updatedRecords: [],
        errors: [errorMessage]
      };
    }
  }

  /**
   * Update WhatsApp session phone number
   * Requirements: 4.1, 4.2
   */
  private static async updateWhatsAppSessionPhone(customerId: string, phone: string): Promise<void> {
    try {
      // Update session storage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        const sessionData = JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}');
        
        if (sessionData.customers && Array.isArray(sessionData.customers)) {
          // Update all records with the same customer ID
          sessionData.customers = sessionData.customers.map((customer: any) => {
            if (customer.id === customerId || customer.customer_id === customerId) {
              return { ...customer, phone_no: phone };
            }
            return customer;
          });
          
          localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
        }
      }
      
      console.log(`Updated WhatsApp session phone for customer ${customerId}: ${phone}`);
    } catch (error) {
      console.error('Error updating WhatsApp session phone:', error);
      // Don't throw error - this is not critical for the main functionality
    }
  }

  /**
   * Log phone number update for audit trail
   * Requirements: 5.1, 5.2
   */
  private static async logPhoneUpdate(customerId: string, phone: string): Promise<void> {
    try {
      // This would log to the audit trail system
      // For now, we'll just log to console
      const auditEntry = {
        customerId,
        action: 'phone_update',
        newPhone: phone,
        timestamp: new Date().toISOString(),
        source: 'simplified_import'
      };
      
      console.log('Phone update audit log:', auditEntry);
      
      // In a real implementation, this would save to whatsapp_mappings table or similar
    } catch (error) {
      console.error('Error logging phone update:', error);
      // Don't throw error - audit logging failure shouldn't break the main functionality
    }
  }

  /**
   * Propagate phone number from customer database to import records
   * Requirements: 1.1, 1.2, 4.1
   */
  static async propagatePhoneFromCustomer(customer: Customer): Promise<string> {
    try {
      if (!customer.phone_no) {
        throw new Error('Customer does not have a phone number');
      }
      
      const validationResult = this.validatePhoneNumberDetailed(customer.phone_no);
      
      if (!validationResult.isValid) {
        throw new Error(`Customer phone number is invalid: ${validationResult.error}`);
      }
      
      return validationResult.formattedPhone!;
    } catch (error) {
      console.error('Error propagating phone from customer:', error);
      throw error;
    }
  }

  /**
   * Batch update phone numbers for multiple records
   * Requirements: 4.4, 10.1, 10.2
   */
  static async batchUpdatePhoneNumbers(updates: Array<{
    customerId: string;
    phone: string;
  }>): Promise<PhoneUpdateResult> {
    const results: PhoneUpdateResult = {
      success: true,
      updatedRecords: [],
      errors: []
    };
    
    for (const update of updates) {
      try {
        const result = await this.syncPhoneNumbers(update.customerId, update.phone);
        
        if (result.success) {
          results.updatedRecords.push(...result.updatedRecords);
        } else {
          results.errors.push(...result.errors);
          results.success = false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to update ${update.customerId}: ${errorMessage}`);
        results.success = false;
      }
    }
    
    return results;
  }

  /**
   * Check if phone number is already in use by another customer
   * Requirements: 7.3
   */
  static async checkPhoneExists(phone: string, excludeCustomerId?: string): Promise<{
    exists: boolean;
    customer?: Customer;
  }> {
    try {
      const validationResult = this.validatePhoneNumberDetailed(phone);
      
      if (!validationResult.isValid) {
        return { exists: false };
      }
      
      const formattedPhone = validationResult.formattedPhone!;
      const { data: customers } = await CustomerService.getAll();
      
      const existingCustomer = customers.find(customer => 
        customer.phone_no === formattedPhone && customer.id !== excludeCustomerId
      );
      
      return {
        exists: !!existingCustomer,
        customer: existingCustomer
      };
    } catch (error) {
      console.error('Error checking phone existence:', error);
      return { exists: false };
    }
  }

  /**
   * Get phone number statistics for import
   * Requirements: 5.3, 8.3
   */
  static getPhoneStatistics(records: Array<{ phone?: string }>): {
    totalRecords: number;
    withPhone: number;
    withoutPhone: number;
    validPhones: number;
    invalidPhones: number;
  } {
    const totalRecords = records.length;
    let withPhone = 0;
    let withoutPhone = 0;
    let validPhones = 0;
    let invalidPhones = 0;
    
    records.forEach(record => {
      if (record.phone) {
        withPhone++;
        if (this.validatePhoneNumber(record.phone)) {
          validPhones++;
        } else {
          invalidPhones++;
        }
      } else {
        withoutPhone++;
      }
    });
    
    return {
      totalRecords,
      withPhone,
      withoutPhone,
      validPhones,
      invalidPhones
    };
  }

  /**
   * Format phone number for display
   * Requirements: 8.4
   */
  static formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';
    
    const cleanPhone = this.formatPhoneNumber(phone);
    
    if (cleanPhone.length === 10) {
      // Format as: (XXX) XXX-XXXX
      return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      // Format as: +1 (XXX) XXX-XXXX
      return `+1 (${cleanPhone.slice(1, 4)}) ${cleanPhone.slice(4, 7)}-${cleanPhone.slice(7)}`;
    } else {
      // For international numbers, just add spaces every 3-4 digits
      return cleanPhone.replace(/(\d{3,4})(?=\d)/g, '$1 ');
    }
  }
}