/**
 * Integration utilities for Contact Clustering Service with existing WhatsApp functionality
 * This file provides helper functions to integrate clustering with the existing WhatsApp page
 */

import { ContactClusteringService, type ContactCluster, type WhatsAppCustomer } from './contactClustering';
import { normalizePhoneNumber, validatePhoneNumber } from '../../utils/phoneUtils';
import { normalizeName, calculateNameSimilarity } from '../../utils/nameUtils';

/**
 * Integration helper class for contact clustering
 */
export class ContactClusteringIntegration {
  /**
   * Convert existing WhatsApp customers to clustered format
   * This is a safe wrapper that preserves existing functionality
   */
  static createClustersFromWhatsAppCustomers(customers: WhatsAppCustomer[]): {
    clusters: ContactCluster[];
    shouldUseClustering: boolean;
    statistics: ReturnType<typeof ContactClusteringService.getClusterStatistics>;
  } {
    try {
      // Check if clustering would be beneficial
      const shouldUseClustering = ContactClusteringService.shouldUseClustering(customers);
      
      // Create clusters
      const clusters = ContactClusteringService.clusterContacts(customers);
      
      // Get statistics
      const statistics = ContactClusteringService.getClusterStatistics(clusters);
      
      return {
        clusters,
        shouldUseClustering,
        statistics
      };
    } catch (error) {
      console.error('Error creating clusters from WhatsApp customers:', error);
      
      // Return safe fallback - no clustering
      return {
        clusters: [],
        shouldUseClustering: false,
        statistics: {
          totalClusters: 0,
          totalContacts: customers.length,
          clustersWithConflicts: 0,
          totalConflicts: 0,
          singleContactClusters: customers.length,
          multiContactClusters: 0,
          totalOutstanding: 0,
          expandedClusters: 0
        }
      };
    }
  }

  /**
   * Update phone numbers across a cluster while maintaining data integrity
   * This function ensures that phone number updates don't break existing functionality
   */
  static async updateClusterPhoneNumbers(
    clusterId: string,
    newPhone: string,
    clusters: ContactCluster[],
    onUpdate?: (contactId: string, newPhone: string) => Promise<void>
  ): Promise<{ success: boolean; error?: string; affectedContacts: number }> {
    try {
      // Validate the new phone number
      const validation = validatePhoneNumber(newPhone);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.message || 'Invalid phone number',
          affectedContacts: 0
        };
      }

      // Find the cluster
      const cluster = clusters.find(c => c.id === clusterId);
      if (!cluster) {
        return {
          success: false,
          error: 'Cluster not found',
          affectedContacts: 0
        };
      }

      const affectedContacts = cluster.contacts.length;

      // Update the cluster using the service
      const updateResult = await ContactClusteringService.updateClusterPhone(
        clusterId,
        newPhone,
        clusters
      );

      if (!updateResult) {
        return {
          success: false,
          error: 'Failed to update cluster phone number',
          affectedContacts: 0
        };
      }

      // If an update callback is provided, call it for each contact
      if (onUpdate) {
        for (const contact of cluster.contacts) {
          try {
            await onUpdate(contact.id, newPhone);
          } catch (error) {
            console.error(`Failed to update contact ${contact.id}:`, error);
            // Continue with other contacts even if one fails
          }
        }
      }

      return {
        success: true,
        affectedContacts
      };
    } catch (error) {
      console.error('Error updating cluster phone numbers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        affectedContacts: 0
      };
    }
  }

  /**
   * Get cluster information for a specific contact
   * Useful for UI components that need to know if a contact is part of a cluster
   */
  static getContactClusterInfo(
    contactId: string,
    clusters: ContactCluster[]
  ): {
    isInCluster: boolean;
    cluster?: ContactCluster;
    clusterSize: number;
    hasPhoneConflicts: boolean;
  } {
    const cluster = ContactClusteringService.findClusterByContactId(contactId, clusters);
    
    if (!cluster) {
      return {
        isInCluster: false,
        clusterSize: 1,
        hasPhoneConflicts: false
      };
    }

    return {
      isInCluster: true,
      cluster,
      clusterSize: cluster.contacts.length,
      hasPhoneConflicts: cluster.conflictCount > 0
    };
  }

  /**
   * Generate WhatsApp messages for clustered contacts
   * Handles both single contacts and clusters appropriately
   */
  static generateClusterWhatsAppMessage(
    cluster: ContactCluster,
    messageTemplate?: string
  ): string {
    if (cluster.contacts.length === 1) {
      // Single contact - use existing message format
      const contact = cluster.contacts[0];
      return this.generateSingleContactMessage(contact, messageTemplate);
    } else {
      // Multiple contacts - create combined message
      return this.generateMultiContactMessage(cluster, messageTemplate);
    }
  }

  /**
   * Generate message for a single contact
   */
  private static generateSingleContactMessage(
    contact: WhatsAppCustomer,
    messageTemplate?: string
  ): string {
    if (messageTemplate) {
      return messageTemplate
        .replace('{name}', contact.name)
        .replace('{phone}', contact.phone_no)
        .replace('{outstanding}', contact.balance_pays?.toString() || '0');
    }

    // Default message format
    const data = contact.originalData || contact;
    const outstandingAmount = data.outstanding || data.balance_pays || data.balance || data.amount || data.due || 0;

    let message = `Dear ${contact.name},

Hope you are doing well! 

This is a friendly reminder regarding your payment:

📋 *Details:*`;

    // Add available fields dynamically
    if (data.invoice_id) message += `\n• Invoice ID: ${data.invoice_id}`;
    if (data.invoice_num) message += `\n• Invoice Number: ${data.invoice_num}`;
    if (data.location) message += `\n• Location: ${data.location}`;

    message += `\n\n💰 *Outstanding Balance: ₹${outstandingAmount.toLocaleString('en-IN')}*

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
SmartBooks Team`;

    return message;
  }

  /**
   * Generate combined message for multiple contacts in a cluster
   */
  private static generateMultiContactMessage(
    cluster: ContactCluster,
    messageTemplate?: string
  ): string {
    if (messageTemplate) {
      return messageTemplate
        .replace('{name}', cluster.name)
        .replace('{phone}', cluster.primaryPhone)
        .replace('{outstanding}', cluster.totalOutstanding.toString())
        .replace('{count}', cluster.contacts.length.toString());
    }

    // Default combined message format
    let message = `Dear ${cluster.name},

Hope you are doing well! 

This is a friendly reminder regarding outstanding amounts for multiple records:

📋 *Details:*
`;

    // Add each contact's details
    cluster.contacts.forEach((contact, index) => {
      const data = contact.originalData || contact;
      const customerOutstanding = data.outstanding || data.balance_pays || data.balance || data.amount || data.due || 0;
      
      message += `
${index + 1}. *Record ${index + 1}*`;
      if (data.invoice_id) message += `\n   • Invoice: ${data.invoice_id}`;
      if (data.location) message += `\n   • Location: ${data.location}`;
      message += `\n   • Outstanding: ₹${customerOutstanding.toLocaleString('en-IN')}
`;
    });

    message += `
💰 *Total Outstanding Balance: ₹${cluster.totalOutstanding.toLocaleString('en-IN')}*

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
SmartBooks Team`;

    return message;
  }

  /**
   * Validate cluster data integrity
   * Ensures that clustering hasn't corrupted any existing data
   */
  static validateClusterIntegrity(
    originalContacts: WhatsAppCustomer[],
    clusters: ContactCluster[]
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check that all original contacts are present in clusters
      const clusteredContacts = ContactClusteringService.flattenClusters(clusters);
      
      if (originalContacts.length !== clusteredContacts.length) {
        errors.push(`Contact count mismatch: original ${originalContacts.length}, clustered ${clusteredContacts.length}`);
      }

      // Check that no contacts are duplicated
      const clusteredIds = new Set(clusteredContacts.map(c => c.id));
      if (clusteredIds.size !== clusteredContacts.length) {
        errors.push('Duplicate contacts found in clusters');
      }

      // Check that all original contact IDs are present
      const originalIds = new Set(originalContacts.map(c => c.id));
      for (const id of originalIds) {
        if (!clusteredIds.has(id)) {
          errors.push(`Missing contact ID in clusters: ${id}`);
        }
      }

      // Check cluster consistency
      for (const cluster of clusters) {
        if (cluster.contacts.length === 0) {
          errors.push(`Empty cluster found: ${cluster.id}`);
        }

        // Check that all contacts in cluster have similar names
        const firstContactName = normalizeName(cluster.contacts[0]?.name);
        for (const contact of cluster.contacts) {
          const similarity = calculateNameSimilarity(firstContactName, contact.name);
          if (similarity.similarity < 0.8) {
            warnings.push(`Low name similarity in cluster ${cluster.id}: ${contact.name}`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Create a safe fallback when clustering fails
   * Returns individual "clusters" for each contact to maintain UI compatibility
   */
  static createFallbackClusters(contacts: WhatsAppCustomer[]): ContactCluster[] {
    return contacts.map((contact, index) => ({
      id: `fallback_${index}`,
      name: contact.name,
      contacts: [contact],
      totalOutstanding: contact.balance_pays || 0,
      primaryPhone: normalizePhoneNumber(contact.phone_no),
      alternatePhones: [],
      isExpanded: false,
      lastUpdated: new Date(),
      conflictCount: 0
    }));
  }
}