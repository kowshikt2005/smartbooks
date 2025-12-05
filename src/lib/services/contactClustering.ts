import type { Customer } from '../supabase/types';

// WhatsApp Customer interface (from existing WhatsApp page)
export interface WhatsAppCustomer {
  id: string;
  name: string;
  phone_no: string;
  invoice_id?: string;
  invoice_num?: string;
  grn_no?: string;
  grn_date?: string;
  location?: string;
  month_year?: string;
  balance_pays: number;
  paid_amount?: number;
  adjusted_amount?: number;
  tds?: number;
  branding_adjustment?: number;
  originalData?: Record<string, unknown>;
  [key: string]: unknown;
}

// Contact Cluster interface
export interface ContactCluster {
  id: string;
  name: string;
  contacts: WhatsAppCustomer[];
  totalOutstanding: number;
  primaryPhone: string;
  alternatePhones: string[];
  isExpanded: boolean;
  lastUpdated: Date;
  conflictCount: number;
}

// Phone number update tracking
export interface PhoneNumberUpdate {
  clusterId: string;
  oldPhone: string;
  newPhone: string;
  affectedContactIds: string[];
  timestamp: Date;
}

/**
 * Contact Clustering Service
 * Groups contacts by name and provides phone number management utilities
 */
export class ContactClusteringService {
  /**
   * Normalize phone number for comparison
   * Removes spaces, dashes, parentheses, and standardizes format
   */
  static normalizePhone(phone: string | null | undefined): string {
    if (!phone) return '';
    return phone.toString()
      .replace(/[\s\-\(\)\+]/g, '')
      .replace(/^91/, '')
      .replace(/^0/, '');
  }

  /**
   * Normalize name for comparison
   * Converts to lowercase, trims whitespace, and normalizes spacing
   */
  static normalizeName(name: string | null | undefined): string {
    if (!name) return '';
    return name.toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Calculate name similarity using Levenshtein distance
   * Returns a similarity score between 0 and 1
   */
  static calculateNameSimilarity(name1: string, name2: string): number {
    const norm1 = this.normalizeName(name1);
    const norm2 = this.normalizeName(name2);
    
    if (norm1 === norm2) return 1.0;
    if (!norm1 || !norm2) return 0.0;
    
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Simple grouping by exact name match - follows Excel structure
   * Groups contacts with identical names exactly as they appear in Excel
   */
  static clusterContacts(contacts: WhatsAppCustomer[]): ContactCluster[] {
    if (!contacts || contacts.length === 0) {
      return [];
    }

    // Group contacts by exact name (case-sensitive, as in Excel)
    const contactGroups = new Map<string, WhatsAppCustomer[]>();
    
    contacts.forEach(contact => {
      const exactName = contact.name?.trim();
      if (!exactName) return; // Skip contacts without names
      
      if (!contactGroups.has(exactName)) {
        contactGroups.set(exactName, []);
      }
      contactGroups.get(exactName)!.push(contact);
    });

    // Convert groups to simple clusters - maintain Excel order
    const clusters: ContactCluster[] = [];
    let clusterIndex = 0;

    // Process in the order they appear (don't sort alphabetically)
    const processedNames = new Set<string>();
    
    contacts.forEach(contact => {
      const exactName = contact.name?.trim();
      if (!exactName || processedNames.has(exactName)) return;
      
      processedNames.add(exactName);
      const groupContacts = contactGroups.get(exactName) || [];
      
      if (groupContacts.length === 0) return;

      // Calculate total outstanding
      // Strategy: If "Total" column exists, use it directly. Otherwise, sum all balance amounts.
      let totalOutstanding = 0;
      let hasTotalColumn = false;
      
      // Check if any contact has a "Total" column
      for (const contact of groupContacts) {
        if (contact.originalData) {
          const totalFields = ['Total', 'total', 'TOTAL'];
          for (const field of totalFields) {
            if (field in contact.originalData) {
              hasTotalColumn = true;
              break;
            }
          }
          if (hasTotalColumn) break;
        }
      }
      
      if (hasTotalColumn) {
        // Use Total column directly (don't sum, just take the first Total value found)
        for (const contact of groupContacts) {
          if (contact.originalData) {
            const totalFields = ['Total', 'total', 'TOTAL'];
            for (const field of totalFields) {
              const value = contact.originalData[field];
              if (value !== null && value !== undefined && value !== '-' && value !== '') {
                if (typeof value === 'number') {
                  totalOutstanding = value;
                  break;
                } else if (typeof value === 'string') {
                  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
                  if (!isNaN(parsed)) {
                    totalOutstanding = parsed;
                    break;
                  }
                }
              }
            }
            if (totalOutstanding !== 0) break;
          }
        }
      } else {
        // No Total column - sum all balance amounts
        totalOutstanding = groupContacts.reduce((sum, contact) => {
          let amount = 0;
          
          // Use originalData first (Excel import data)
          if (contact.originalData) {
            // Try all common balance field names
            const balanceFields = ['Outstanding', 'outstanding', 'Balance', 'balance', 'balance_pays', 'Balance Pays', 'Amount', 'amount', 'Due', 'due'];
            for (const field of balanceFields) {
              const value = contact.originalData[field];
              if (value !== null && value !== undefined && value !== '-' && value !== '') {
                if (typeof value === 'number' && value !== 0) {
                  amount = value;
                  break;
                } else if (typeof value === 'string') {
                  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
                  if (!isNaN(parsed) && parsed !== 0) {
                    amount = parsed;
                    break;
                  }
                }
              }
            }
          }
          
          // Fallback to contact properties
          if (amount === 0 && typeof contact.balance_pays === 'number') {
            amount = contact.balance_pays;
          }
          
          return sum + amount;
        }, 0);
      }

      // Get phone number - use the first available phone
      let primaryPhone = '';
      for (const contact of groupContacts) {
        if (contact.phone_no && contact.phone_no.trim()) {
          primaryPhone = contact.phone_no.trim();
          break;
        }
      }

      // Check for phone conflicts (different phones for same name)
      const phoneNumbers = groupContacts
        .map(contact => contact.phone_no?.trim())
        .filter(phone => phone)
        .filter((phone, index, arr) => arr.indexOf(phone) === index); // unique phones
      
      const conflictCount = phoneNumbers.length > 1 ? phoneNumbers.length - 1 : 0;

      const cluster: ContactCluster = {
        id: `cluster_${clusterIndex++}`,
        name: exactName,
        contacts: groupContacts, // Keep original Excel order
        totalOutstanding,
        primaryPhone,
        alternatePhones: phoneNumbers.slice(1), // Other phones
        isExpanded: false,
        lastUpdated: new Date(),
        conflictCount
      };

      clusters.push(cluster);
    });

    return clusters;
  }

  /**
   * Update phone number for all contacts in a cluster
   */
  static async updateClusterPhone(
    clusterId: string, 
    newPhone: string, 
    clusters: ContactCluster[]
  ): Promise<PhoneNumberUpdate | null> {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) {
      throw new Error(`Cluster with ID ${clusterId} not found`);
    }

    // Validate phone number
    const normalizedPhone = this.normalizePhone(newPhone);
    if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      throw new Error('Invalid phone number format. Please enter a valid 10-15 digit phone number.');
    }

    const oldPhone = cluster.primaryPhone;
    const affectedContactIds = cluster.contacts.map(contact => contact.id);

    // Update all contacts in the cluster with the new phone number
    cluster.contacts.forEach(contact => {
      contact.phone_no = newPhone;
    });

    // Update cluster metadata
    cluster.primaryPhone = normalizedPhone;
    cluster.alternatePhones = []; // Clear alternate phones since all contacts now have the same number
    cluster.conflictCount = 0; // No more conflicts
    cluster.lastUpdated = new Date();

    // Create update record for tracking
    const phoneUpdate: PhoneNumberUpdate = {
      clusterId,
      oldPhone,
      newPhone: normalizedPhone,
      affectedContactIds,
      timestamp: new Date()
    };

    return phoneUpdate;
  }

  /**
   * Update all contacts with the same name when one contact receives a phone number
   * This ensures consistency across all records with the same contact name
   */
  static updateContactsByName(
    contactName: string,
    newPhone: string,
    allContacts: WhatsAppCustomer[]
  ): WhatsAppCustomer[] {
    const normalizedTargetName = this.normalizeName(contactName);
    
    // Validate phone number
    const normalizedPhone = this.normalizePhone(newPhone);
    if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      throw new Error('Invalid phone number format. Please enter a valid 10-15 digit phone number.');
    }

    // Update all contacts with the same normalized name
    const updatedContacts = allContacts.map(contact => {
      const contactNormalizedName = this.normalizeName(contact.name);
      if (contactNormalizedName === normalizedTargetName) {
        return {
          ...contact,
          phone_no: newPhone
        };
      }
      return contact;
    });

    return updatedContacts;
  }

  /**
   * Get all contact IDs that share the same name as the given contact
   */
  static getContactIdsByName(contactName: string, allContacts: WhatsAppCustomer[]): string[] {
    const normalizedTargetName = this.normalizeName(contactName);
    
    return allContacts
      .filter(contact => this.normalizeName(contact.name) === normalizedTargetName)
      .map(contact => contact.id);
  }

  /**
   * Expand a cluster to show individual contacts
   */
  static expandCluster(clusterId: string, clusters: ContactCluster[]): void {
    const cluster = clusters.find(c => c.id === clusterId);
    if (cluster) {
      cluster.isExpanded = true;
      cluster.lastUpdated = new Date();
    }
  }

  /**
   * Collapse a cluster to hide individual contacts
   */
  static collapseCluster(clusterId: string, clusters: ContactCluster[]): void {
    const cluster = clusters.find(c => c.id === clusterId);
    if (cluster) {
      cluster.isExpanded = false;
      cluster.lastUpdated = new Date();
    }
  }

  /**
   * Toggle cluster expansion state
   */
  static toggleClusterExpansion(clusterId: string, clusters: ContactCluster[]): void {
    const cluster = clusters.find(c => c.id === clusterId);
    if (cluster) {
      cluster.isExpanded = !cluster.isExpanded;
      cluster.lastUpdated = new Date();
    }
  }

  /**
   * Get cluster statistics
   */
  static getClusterStatistics(clusters: ContactCluster[]) {
    const stats = {
      totalClusters: clusters.length,
      totalContacts: clusters.reduce((sum, cluster) => sum + cluster.contacts.length, 0),
      clustersWithConflicts: clusters.filter(cluster => cluster.conflictCount > 0).length,
      totalConflicts: clusters.reduce((sum, cluster) => sum + cluster.conflictCount, 0),
      singleContactClusters: clusters.filter(cluster => cluster.contacts.length === 1).length,
      multiContactClusters: clusters.filter(cluster => cluster.contacts.length > 1).length,
      totalOutstanding: clusters.reduce((sum, cluster) => sum + cluster.totalOutstanding, 0),
      expandedClusters: clusters.filter(cluster => cluster.isExpanded).length
    };

    return stats;
  }

  /**
   * Find clusters that contain a specific contact
   */
  static findClusterByContactId(contactId: string, clusters: ContactCluster[]): ContactCluster | null {
    return clusters.find(cluster => 
      cluster.contacts.some(contact => contact.id === contactId)
    ) || null;
  }

  /**
   * Get all contacts from clusters in a flat array
   */
  static flattenClusters(clusters: ContactCluster[]): WhatsAppCustomer[] {
    return clusters.reduce((allContacts, cluster) => {
      return allContacts.concat(cluster.contacts);
    }, [] as WhatsAppCustomer[]);
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): { isValid: boolean; message?: string } {
    if (!phone || !phone.trim()) {
      return { isValid: false, message: 'Phone number is required' };
    }

    const normalized = this.normalizePhone(phone);
    
    if (normalized.length < 10) {
      return { isValid: false, message: 'Phone number must be at least 10 digits' };
    }
    
    if (normalized.length > 15) {
      return { isValid: false, message: 'Phone number cannot exceed 15 digits' };
    }
    
    if (!/^\d+$/.test(normalized)) {
      return { isValid: false, message: 'Phone number can only contain digits' };
    }

    return { isValid: true };
  }

  /**
   * Format phone number for display
   */
  static formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';
    
    const normalized = this.normalizePhone(phone);
    
    // Format Indian phone numbers
    if (normalized.length === 10) {
      return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
    } else if (normalized.length === 11 && normalized.startsWith('91')) {
      const number = normalized.slice(2);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    }
    
    // Return as-is for other formats
    return phone;
  }

  /**
   * Get cluster by ID
   */
  static getClusterById(clusterId: string, clusters: ContactCluster[]): ContactCluster | null {
    return clusters.find(cluster => cluster.id === clusterId) || null;
  }

  /**
   * Check if clustering would benefit the dataset
   * Returns true if there are contacts that can be clustered
   */
  static shouldUseClustering(contacts: WhatsAppCustomer[]): boolean {
    if (!contacts || contacts.length < 2) return false;

    // Check if there are contacts with the same normalized name
    const nameGroups = new Map<string, number>();
    
    contacts.forEach(contact => {
      const normalizedName = this.normalizeName(contact.name);
      if (normalizedName) {
        nameGroups.set(normalizedName, (nameGroups.get(normalizedName) || 0) + 1);
      }
    });

    // Return true if any name appears more than once
    return Array.from(nameGroups.values()).some(count => count > 1);
  }
}