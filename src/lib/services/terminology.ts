/**
 * TerminologyService - Centralized service for managing application terminology
 * 
 * This service provides consistent label management for the transition from
 * "Customers" to "Contacts" terminology throughout the application.
 */

export interface TerminologyMapping {
  readonly [key: string]: string;
}

export class TerminologyService {
  /**
   * Core terminology mapping constants
   * Maps old terminology to new terminology
   */
  static readonly TERMINOLOGY_MAP: TerminologyMapping = {
    // Singular forms
    'customer': 'contact',
    'Customer': 'Contact',
    'CUSTOMER': 'CONTACT',
    
    // Plural forms
    'customers': 'contacts',
    'Customers': 'Contacts',
    'CUSTOMERS': 'CONTACTS',
    
    // Common phrases
    'customer database': 'contact database',
    'Customer Database': 'Contact Database',
    'customer management': 'contact management',
    'Customer Management': 'Contact Management',
    'customer details': 'contact details',
    'Customer Details': 'Contact Details',
    'customer information': 'contact information',
    'Customer Information': 'Contact Information',
    'customer list': 'contact list',
    'Customer List': 'Contact List',
    'customer data': 'contact data',
    'Customer Data': 'Contact Data',
    'customer profile': 'contact profile',
    'Customer Profile': 'Contact Profile',
    'customer record': 'contact record',
    'Customer Record': 'Contact Record',
    'customer records': 'contact records',
    'Customer Records': 'Contact Records',
    
    // Action-related terms
    'Create Customer': 'Create Contact',
    'Add Customer': 'Add Contact',
    'Edit Customer': 'Edit Contact',
    'Update Customer': 'Update Contact',
    'Delete Customer': 'Delete Contact',
    'View Customer': 'View Contact',
    'Manage Customer': 'Manage Contact',
    'Search Customer': 'Search Contact',
    'Find Customer': 'Find Contact',
    
    // Form and field labels
    'Customer Name': 'Contact Name',
    'Customer Phone': 'Contact Phone',
    'Customer Location': 'Contact Location',
    'Customer ID': 'Contact ID',
    
    // Messages and notifications
    'customer has been': 'contact has been',
    'Customer has been': 'Contact has been',
    'customer successfully': 'contact successfully',
    'Customer successfully': 'Contact successfully',
    'customer not found': 'contact not found',
    'Customer not found': 'Contact not found',
    'customer already exists': 'contact already exists',
    'Customer already exists': 'Contact already exists',
  };

  /**
   * Get the contact label (singular or plural)
   */
  static getContactLabel(singular: boolean = true): string {
    return singular ? 'Contact' : 'Contacts';
  }

  /**
   * Get the contact label in lowercase (singular or plural)
   */
  static getContactLabelLower(singular: boolean = true): string {
    return singular ? 'contact' : 'contacts';
  }

  /**
   * Transform a string by replacing customer terminology with contact terminology
   */
  static transformText(text: string): string {
    if (!text) return text;
    
    let transformedText = text;
    
    // Apply all terminology mappings
    for (const [oldTerm, newTerm] of Object.entries(this.TERMINOLOGY_MAP)) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${oldTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      transformedText = transformedText.replace(regex, newTerm);
    }
    
    return transformedText;
  }

  /**
   * Transform multiple strings at once
   */
  static transformTexts(texts: string[]): string[] {
    return texts.map(text => this.transformText(text));
  }

  /**
   * Get navigation labels with updated terminology
   */
  static getNavigationLabels() {
    return {
      dashboard: 'Dashboard',
      contacts: 'Contacts', // Changed from 'Customers'
      whatsapp: 'WhatsApp',
      reports: 'Reports',
      settings: 'Settings',
    };
  }

  /**
   * Get page titles with updated terminology
   */
  static getPageTitles() {
    return {
      contactsList: 'Contacts',
      contactDetails: 'Contact Details',
      createContact: 'Create Contact',
      editContact: 'Edit Contact',
      contactManagement: 'Contact Management',
      dashboard: 'Dashboard',
      whatsapp: 'WhatsApp',
    };
  }

  /**
   * Get form labels with updated terminology
   */
  static getFormLabels() {
    return {
      contactName: 'Contact Name',
      contactPhone: 'Contact Phone',
      contactLocation: 'Contact Location',
      contactId: 'Contact ID',
      invoiceId: 'Invoice ID',
      createContact: 'Create Contact',
      updateContact: 'Update Contact',
      deleteContact: 'Delete Contact',
      saveContact: 'Save Contact',
      cancelContact: 'Cancel',
      searchContacts: 'Search contacts...',
      selectContact: 'Select Contact',
      selectAllContacts: 'Select All Contacts',
      bulkDeleteContacts: 'Delete Selected Contacts',
    };
  }

  /**
   * Get button labels with updated terminology
   */
  static getButtonLabels() {
    return {
      createContact: 'Create Contact',
      addContact: 'Add Contact',
      editContact: 'Edit Contact',
      updateContact: 'Update Contact',
      deleteContact: 'Delete Contact',
      viewContact: 'View Contact',
      saveContact: 'Save Contact',
      cancelContact: 'Cancel',
      searchContact: 'Search Contact',
      selectContact: 'Select Contact',
      manageContacts: 'Manage Contacts',
      importContacts: 'Import Contacts',
      exportContacts: 'Export Contacts',
    };
  }

  /**
   * Get system messages with updated terminology
   */
  static getSystemMessages() {
    return {
      contactCreated: 'Contact has been created successfully.',
      contactUpdated: 'Contact has been updated successfully.',
      contactDeleted: 'Contact has been deleted successfully.',
      contactsDeleted: 'Contacts have been deleted successfully.',
      contactNotFound: 'Contact not found.',
      contactAlreadyExists: 'Contact already exists.',
      contactSaved: 'Contact saved successfully.',
      contactLoadError: 'Failed to load contact.',
      contactsLoadError: 'Failed to load contacts.',
      contactCreateError: 'Failed to create contact.',
      contactUpdateError: 'Failed to update contact.',
      contactDeleteError: 'Failed to delete contact.',
      contactsDeleteError: 'Failed to delete contacts.',
      noContactsFound: 'No contacts found.',
      selectContactsToDelete: 'Please select contacts to delete.',
      confirmDeleteContact: 'Are you sure you want to delete this contact?',
      confirmDeleteContacts: 'Are you sure you want to delete the selected contacts?',
    };
  }

  /**
   * Get metadata with updated terminology
   */
  static getMetadata() {
    return {
      contactsPageTitle: 'Contacts - SmartBooks',
      contactsPageDescription: 'Manage your contact database',
      contactDetailsPageTitle: 'Contact Details - SmartBooks',
      contactDetailsPageDescription: 'View and manage contact information',
      createContactPageTitle: 'Create Contact - SmartBooks',
      createContactPageDescription: 'Add a new contact to your database',
      editContactPageTitle: 'Edit Contact - SmartBooks',
      editContactPageDescription: 'Update contact information',
    };
  }

  /**
   * Utility method to check if a string contains customer terminology
   */
  static containsCustomerTerminology(text: string): boolean {
    if (!text) return false;
    
    const customerTerms = Object.keys(this.TERMINOLOGY_MAP);
    return customerTerms.some(term => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(text);
    });
  }

  /**
   * Get all available terminology mappings for debugging/testing
   */
  static getAllMappings(): TerminologyMapping {
    return { ...this.TERMINOLOGY_MAP };
  }

  /**
   * Validate that all required terminology has been updated
   */
  static validateTerminologyUpdate(texts: string[]): {
    isValid: boolean;
    remainingCustomerTerms: string[];
  } {
    const remainingTerms: string[] = [];
    
    texts.forEach(text => {
      if (this.containsCustomerTerminology(text)) {
        const customerTerms = Object.keys(this.TERMINOLOGY_MAP);
        customerTerms.forEach(term => {
          const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(text)) {
            remainingTerms.push(term);
          }
        });
      }
    });
    
    return {
      isValid: remainingTerms.length === 0,
      remainingCustomerTerms: [...new Set(remainingTerms)], // Remove duplicates
    };
  }
}

/**
 * Convenience functions for common terminology operations
 */

/**
 * Transform customer terminology to contact terminology in a string
 */
export function transformCustomerToContact(text: string): string {
  return TerminologyService.transformText(text);
}

/**
 * Get contact label (singular or plural)
 */
export function getContactLabel(singular: boolean = true): string {
  return TerminologyService.getContactLabel(singular);
}

/**
 * Get contact label in lowercase (singular or plural)
 */
export function getContactLabelLower(singular: boolean = true): string {
  return TerminologyService.getContactLabelLower(singular);
}

/**
 * Check if text contains customer terminology that needs updating
 */
export function needsTerminologyUpdate(text: string): boolean {
  return TerminologyService.containsCustomerTerminology(text);
}