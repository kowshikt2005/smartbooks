import { CustomerService } from './customers';
import type { Customer } from '../supabase/types';

export interface PhonePropagationResult {
  success: boolean;
  affectedRecords: number;
  message: string;
  updatedContacts?: any[];
}

export interface ContactRecord {
  id: string;
  name: string;
  phone_no?: string;
  [key: string]: any;
}

export class EnhancedPhonePropagationService {
  /**
   * Propagate phone number to all records with the same name in session data
   */
  static propagatePhoneInSession(
    contactName: string, 
    phoneNumber: string, 
    sessionData: any
  ): PhonePropagationResult {
    try {
      const exactContactName = contactName.trim();
      const cleanPhone = phoneNumber.trim();
      
      // Validate phone number
      const phoneDigits = cleanPhone.replace(/[\s\-\(\)\+]/g, '');
      if (!phoneDigits || !/^\d{10,15}$/.test(phoneDigits)) {
        return {
          success: false,
          affectedRecords: 0,
          message: 'Invalid phone number format. Please enter 10-15 digits.'
        };
      }

      // Find all contacts with the exact same name
      const affectedContacts = sessionData.customers.filter((customer: ContactRecord) => {
        return customer.name.trim() === exactContactName;
      });

      if (affectedContacts.length === 0) {
        return {
          success: false,
          affectedRecords: 0,
          message: `No contacts found with the name "${exactContactName}"`
        };
      }

      // Update ALL contacts with the exact same name
      const updatedContacts: ContactRecord[] = [];
      sessionData.customers = sessionData.customers.map((customer: ContactRecord) => {
        if (customer.name.trim() === exactContactName) {
          const updated = { ...customer, phone_no: cleanPhone };
          updatedContacts.push(updated);
          return updated;
        }
        return customer;
      });

      // Update timestamp
      sessionData.lastImportTimestamp = Date.now();

      const message = affectedContacts.length === 1 
        ? `Phone number added for "${exactContactName}"`
        : `Phone number propagated to ALL ${affectedContacts.length} records with the name "${exactContactName}"`;

      return {
        success: true,
        affectedRecords: affectedContacts.length,
        message,
        updatedContacts
      };
    } catch (error) {
      console.error('Error propagating phone number:', error);
      return {
        success: false,
        affectedRecords: 0,
        message: 'Failed to update phone number. Please try again.'
      };
    }
  }

  /**
   * Get phone number suggestions from customer database
   */
  static async getPhoneSuggestions(contactName: string): Promise<Customer[]> {
    try {
      return await CustomerService.getCustomersWithPhoneByName(contactName);
    } catch (error) {
      console.error('Error getting phone suggestions:', error);
      return [];
    }
  }

  /**
   * Apply phone number from customer database to session data
   */
  static async applyCustomerPhoneToSession(
    contactName: string,
    customerId: string,
    sessionData: any
  ): Promise<PhonePropagationResult> {
    try {
      // Get the customer from database
      const customer = await CustomerService.getById(customerId);
      
      if (!customer || !customer.phone_no) {
        return {
          success: false,
          affectedRecords: 0,
          message: 'Customer not found or has no phone number'
        };
      }

      // Propagate the phone number
      return this.propagatePhoneInSession(contactName, customer.phone_no, sessionData);
    } catch (error) {
      console.error('Error applying customer phone to session:', error);
      return {
        success: false,
        affectedRecords: 0,
        message: 'Failed to apply customer phone number. Please try again.'
      };
    }
  }

  /**
   * Get contacts without phone numbers grouped by name
   */
  static getContactsWithoutPhone(sessionData: any): { [name: string]: ContactRecord[] } {
    const contactsWithoutPhone: { [name: string]: ContactRecord[] } = {};
    
    if (!sessionData.customers) return contactsWithoutPhone;

    sessionData.customers.forEach((customer: ContactRecord) => {
      // Enhanced validation - check if phone is missing or invalid
      let hasValidPhone = false;
      
      if (customer.phone_no && customer.phone_no.trim() !== '') {
        const cleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
        hasValidPhone = /^\d{10,15}$/.test(cleanPhone);
      }
      
      if (!hasValidPhone) {
        const name = customer.name.trim();
        if (!contactsWithoutPhone[name]) {
          contactsWithoutPhone[name] = [];
        }
        contactsWithoutPhone[name].push(customer);
      }
    });

    return contactsWithoutPhone;
  }

  /**
   * Get statistics about phone number coverage
   */
  static getPhoneNumberStats(sessionData: any): {
    totalContacts: number;
    contactsWithPhone: number;
    contactsWithoutPhone: number;
    uniqueNamesWithoutPhone: number;
    coveragePercentage: number;
  } {
    if (!sessionData.customers) {
      return {
        totalContacts: 0,
        contactsWithPhone: 0,
        contactsWithoutPhone: 0,
        uniqueNamesWithoutPhone: 0,
        coveragePercentage: 0
      };
    }

    const totalContacts = sessionData.customers.length;
    
    // Enhanced phone number validation - must be actual phone numbers, not names
    const contactsWithPhone = sessionData.customers.filter((c: ContactRecord) => {
      if (!c.phone_no || c.phone_no.trim() === '') return false;
      
      const cleanPhone = c.phone_no.replace(/[\s\-\(\)\+]/g, '');
      // Must be 10-15 digits and not contain letters (to exclude names like "SIDDHARTH ENTERPRISES")
      return /^\d{10,15}$/.test(cleanPhone);
    }).length;
    
    const contactsWithoutPhone = totalContacts - contactsWithPhone;
    
    const contactsWithoutPhoneByName = this.getContactsWithoutPhone(sessionData);
    const uniqueNamesWithoutPhone = Object.keys(contactsWithoutPhoneByName).length;
    
    const coveragePercentage = totalContacts > 0 ? Math.round((contactsWithPhone / totalContacts) * 100) : 0;

    return {
      totalContacts,
      contactsWithPhone,
      contactsWithoutPhone,
      uniqueNamesWithoutPhone,
      coveragePercentage
    };
  }

  /**
   * Validate if all contacts are ready for messaging
   */
  static validateMessagingReadiness(sessionData: any): {
    ready: boolean;
    readyCount: number;
    totalCount: number;
    missingPhoneContacts: ContactRecord[];
  } {
    if (!sessionData.customers) {
      return {
        ready: true,
        readyCount: 0,
        totalCount: 0,
        missingPhoneContacts: []
      };
    }

    const totalCount = sessionData.customers.length;
    const missingPhoneContacts = sessionData.customers.filter((c: ContactRecord) => 
      !c.phone_no || c.phone_no.trim() === ''
    );
    const readyCount = totalCount - missingPhoneContacts.length;

    return {
      ready: missingPhoneContacts.length === 0,
      readyCount,
      totalCount,
      missingPhoneContacts
    };
  }
}