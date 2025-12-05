import { CustomerService } from './customers';
import { CustomerMatcher } from './customerMatcher';
import { PhoneNumberService } from './phoneNumberService';
import type { Customer } from '../supabase/types';
import type { NewCustomerPrompt } from './simplifiedImportService';

export interface NewCustomerCreationResult {
  success: boolean;
  customer?: Customer;
  error?: string;
}

export interface NewCustomerValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * New Customer Creation Workflow
 * 
 * This service handles the workflow for creating new customers during import:
 * - Validates customer data before creation
 * - Checks for duplicates
 * - Creates customer with proper phone number validation
 * - Logs audit trail for new customer creation
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 7.3
 */
export class NewCustomerWorkflow {
  /**
   * Handle new customer prompt with validation and creation
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  static async handleNewCustomerPrompt(
    prompt: NewCustomerPrompt,
    userProvidedPhone?: string
  ): Promise<NewCustomerCreationResult> {
    try {
      const phoneToUse = userProvidedPhone || prompt.importRecord.phone;
      
      // Validate required data
      const validation = await this.validateNewCustomerData(prompt, phoneToUse);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }
      
      // Check for duplicate customers
      const duplicateCheck = await this.checkForDuplicates(prompt.importRecord.name, phoneToUse);
      if (!duplicateCheck.isValid) {
        return {
          success: false,
          error: duplicateCheck.error
        };
      }
      
      // Create new customer
      const newCustomer = await this.createNewCustomer(prompt, phoneToUse!);
      
      // Log audit trail
      await this.logNewCustomerCreation(newCustomer, prompt);
      
      return {
        success: true,
        customer: newCustomer
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validate new customer data before creation
   * Requirements: 2.3, 7.1, 7.2
   */
  static async validateNewCustomerData(
    prompt: NewCustomerPrompt,
    phoneNumber?: string
  ): Promise<NewCustomerValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate name
    const nameValidation = CustomerMatcher.validateCustomerName(prompt.importRecord.name);
    if (!nameValidation.isValid) {
      errors.push(nameValidation.error || 'Invalid name');
    }
    
    // Validate phone number
    if (!phoneNumber) {
      errors.push('Phone number is required for new customer');
    } else {
      const phoneValidation = PhoneNumberService.validatePhoneNumberDetailed(phoneNumber);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number');
      }
    }
    
    // Check optional fields
    if (prompt.suggestedCustomer.location && prompt.suggestedCustomer.location.length > 255) {
      warnings.push('Location will be truncated to 255 characters');
    }
    
    if (prompt.suggestedCustomer.invoice_id && prompt.suggestedCustomer.invoice_id.length > 100) {
      warnings.push('Invoice ID will be truncated to 100 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for duplicate customers
   * Requirements: 7.3
   */
  static async checkForDuplicates(name: string, phone?: string): Promise<{
    isValid: boolean;
    error?: string;
    duplicateType?: 'name' | 'phone' | 'both';
  }> {
    try {
      // Check for name duplicate
      const nameExists = await CustomerMatcher.checkNameExists(name);
      
      // Check for phone duplicate
      let phoneExists = false;
      let phoneCustomer: Customer | undefined;
      
      if (phone) {
        const phoneCheck = await PhoneNumberService.checkPhoneExists(phone);
        phoneExists = phoneCheck.exists;
        phoneCustomer = phoneCheck.customer;
      }
      
      if (nameExists && phoneExists) {
        return {
          isValid: false,
          error: 'Customer with this name and phone number already exists',
          duplicateType: 'both'
        };
      }
      
      if (nameExists) {
        return {
          isValid: false,
          error: 'Customer with this name already exists',
          duplicateType: 'name'
        };
      }
      
      if (phoneExists && phoneCustomer) {
        return {
          isValid: false,
          error: `Phone number already belongs to customer: ${phoneCustomer.name}`,
          duplicateType: 'phone'
        };
      }
      
      return {
        isValid: true
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return {
        isValid: false,
        error: 'Failed to check for duplicate customers'
      };
    }
  }

  /**
   * Create new customer with validated data
   * Requirements: 2.1, 2.2, 2.4
   */
  private static async createNewCustomer(
    prompt: NewCustomerPrompt,
    phoneNumber: string
  ): Promise<Customer> {
    const formattedPhone = PhoneNumberService.formatPhoneNumber(phoneNumber);
    
    // Prepare and sanitize customer data
    const customerData = this.sanitizeCustomerData({
      name: prompt.importRecord.name.trim(),
      phone_no: formattedPhone,
      location: prompt.suggestedCustomer.location || null,
      invoice_id: prompt.suggestedCustomer.invoice_id || null
    });
    
    // Create customer
    const newCustomer = await CustomerService.create(customerData);
    
    console.log(`Created new customer: ${newCustomer.name} (${newCustomer.phone_no})`);
    
    return newCustomer;
  }

  /**
   * Log new customer creation for audit trail
   * Requirements: 5.1, 5.2
   */
  private static async logNewCustomerCreation(
    customer: Customer,
    prompt: NewCustomerPrompt
  ): Promise<void> {
    try {
      const auditEntry = {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone_no,
        action: 'new_customer_created',
        source: 'simplified_import',
        originalImportData: prompt.importRecord.originalData,
        timestamp: new Date().toISOString()
      };
      
      console.log('New customer creation audit log:', auditEntry);
      
      // In a real implementation, this would save to whatsapp_mappings table or similar
      // For now, we'll just log to console
    } catch (error) {
      console.error('Error logging new customer creation:', error);
      // Don't throw error - audit logging failure shouldn't break the main functionality
    }
  }

  /**
   * Batch create multiple new customers
   * Requirements: 2.1, 2.2, 10.1, 10.2
   */
  static async batchCreateNewCustomers(
    prompts: Array<{
      prompt: NewCustomerPrompt;
      phoneNumber: string;
    }>
  ): Promise<{
    successful: Customer[];
    failed: Array<{
      prompt: NewCustomerPrompt;
      error: string;
    }>;
  }> {
    const successful: Customer[] = [];
    const failed: Array<{ prompt: NewCustomerPrompt; error: string }> = [];
    
    for (const { prompt, phoneNumber } of prompts) {
      try {
        const result = await this.handleNewCustomerPrompt(prompt, phoneNumber);
        
        if (result.success && result.customer) {
          successful.push(result.customer);
        } else {
          failed.push({
            prompt,
            error: result.error || 'Unknown error'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({
          prompt,
          error: errorMessage
        });
      }
    }
    
    return {
      successful,
      failed
    };
  }

  /**
   * Get new customer creation statistics
   * Requirements: 5.3, 8.3
   */
  static getCreationStatistics(results: NewCustomerCreationResult[]): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    commonErrors: Array<{ error: string; count: number }>;
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    // Count common errors
    const errorCounts = new Map<string, number>();
    results.forEach(result => {
      if (!result.success && result.error) {
        const count = errorCounts.get(result.error) || 0;
        errorCounts.set(result.error, count + 1);
      }
    });
    
    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 errors
    
    return {
      total,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      commonErrors
    };
  }

  /**
   * Sanitize customer data to meet database constraints
   */
  private static sanitizeCustomerData(data: {
    name: string;
    phone_no: string;
    location?: string | null;
    invoice_id?: string | null;
  }): {
    name: string;
    phone_no: string;
    location?: string | null;
    invoice_id?: string | null;
  } {
    // Clean and validate name
    const cleanName = data.name ? data.name.trim().substring(0, 255) : '';
    if (!cleanName) {
      throw new Error('Customer name is required and cannot be empty');
    }

    // Clean and validate phone number
    const cleanPhone = data.phone_no ? data.phone_no.replace(/\D/g, '').substring(0, 20) : '';
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error(`Invalid phone number: ${data.phone_no}. Must be at least 10 digits.`);
    }

    return {
      name: cleanName,
      phone_no: cleanPhone,
      location: data.location ? data.location.trim().substring(0, 255) : null, // VARCHAR(255) limit
      invoice_id: data.invoice_id ? data.invoice_id.trim().substring(0, 100) : null // VARCHAR(100) limit
    };
  }

  /**
   * Preview new customer data before creation
   * Requirements: 2.3, 8.2
   */
  static previewNewCustomer(prompt: NewCustomerPrompt, phoneNumber?: string): {
    customerData: {
      name: string;
      phone_no: string;
      location: string | null;
      invoice_id: string | null;
    };
    validation: NewCustomerValidation;
    warnings: string[];
  } {
    const phoneToUse = phoneNumber || prompt.importRecord.phone || '';
    const formattedPhone = PhoneNumberService.formatPhoneNumber(phoneToUse);
    
    const customerData = {
      name: prompt.importRecord.name.trim(),
      phone_no: formattedPhone,
      location: prompt.suggestedCustomer.location?.substring(0, 255) || null,
      invoice_id: prompt.suggestedCustomer.invoice_id?.substring(0, 100) || null
    };
    
    // Get validation without async checks (for preview)
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Basic validation
    if (!customerData.name) {
      errors.push('Name is required');
    }
    
    if (!phoneToUse) {
      errors.push('Phone number is required');
    } else if (!PhoneNumberService.validatePhoneNumber(phoneToUse)) {
      errors.push('Invalid phone number format');
    }
    
    // Warnings for truncated data
    if (prompt.suggestedCustomer.location && prompt.suggestedCustomer.location.length > 255) {
      warnings.push('Location will be truncated to 255 characters');
    }
    
    if (prompt.suggestedCustomer.invoice_id && prompt.suggestedCustomer.invoice_id.length > 100) {
      warnings.push('Invoice ID will be truncated to 100 characters');
    }
    
    const validation: NewCustomerValidation = {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    
    return {
      customerData,
      validation,
      warnings
    };
  }
}