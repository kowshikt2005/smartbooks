'use client';

import React, { useCallback } from 'react';
import type { ContactCluster, WhatsAppCustomer } from '../../lib/services/contactClustering';
import { ContactClusteringIntegration } from '../../lib/services/contactClusteringIntegration';
import { generateWhatsAppUrl } from '../../utils/phoneUtils';

export interface ClusterBulkMessagingProps {
  clusters: ContactCluster[];
  selectedContacts: Set<string>;
  messageTemplate?: string;
}

export interface BulkMessageStats {
  totalContacts: number;
  uniquePhoneNumbers: number;
  totalOutstanding: number;
  clusteredMessages: number;
  individualMessages: number;
}

/**
 * Service component for handling bulk WhatsApp messaging with cluster support
 * Groups contacts by phone number and generates appropriate messages
 */
export class ClusterBulkMessaging {
  /**
   * Calculate statistics for bulk messaging
   */
  static calculateBulkStats(
    clusters: ContactCluster[], 
    selectedContacts: Set<string>
  ): BulkMessageStats {
    // Get all selected contacts from clusters
    const selectedContactsList: WhatsAppCustomer[] = [];
    
    clusters.forEach(cluster => {
      cluster.contacts.forEach(contact => {
        if (selectedContacts.has(contact.id) && contact.phone_no) {
          selectedContactsList.push(contact);
        }
      });
    });

    // Group by phone number
    const contactsByPhone = new Map<string, WhatsAppCustomer[]>();
    selectedContactsList.forEach(contact => {
      const cleanPhone = contact.phone_no.replace(/[\s\-\(\)\+]/g, '');
      if (!contactsByPhone.has(cleanPhone)) {
        contactsByPhone.set(cleanPhone, []);
      }
      contactsByPhone.get(cleanPhone)!.push(contact);
    });

    // Calculate totals
    const totalOutstanding = selectedContactsList.reduce((sum, contact) => {
      const data = contact.originalData || contact;
      const amountFields = ['balance_pays', 'outstanding', 'balance', 'amount', 'due'];
      
      for (const field of amountFields) {
        if (data[field] && typeof data[field] === 'number') {
          return sum + data[field];
        }
      }
      
      return sum;
    }, 0);

    // Count message types
    let clusteredMessages = 0;
    let individualMessages = 0;
    
    contactsByPhone.forEach(contacts => {
      if (contacts.length > 1) {
        clusteredMessages++;
      } else {
        individualMessages++;
      }
    });

    return {
      totalContacts: selectedContactsList.length,
      uniquePhoneNumbers: contactsByPhone.size,
      totalOutstanding,
      clusteredMessages,
      individualMessages
    };
  }

  /**
   * Generate confirmation message for bulk send
   */
  static generateConfirmationMessage(
    clusters: ContactCluster[], 
    selectedContacts: Set<string>
  ): string {
    const stats = this.calculateBulkStats(clusters, selectedContacts);
    
    if (stats.totalContacts === 0) {
      return 'No contacts selected for messaging.';
    }

    let message = `Send WhatsApp messages to ${stats.totalContacts} contact${stats.totalContacts !== 1 ? 's' : ''}?\n\n`;
    
    message += `💰 Total outstanding amount: ₹${stats.totalOutstanding.toLocaleString('en-IN')}\n`;
    message += `📞 Unique phone numbers: ${stats.uniquePhoneNumbers}\n`;
    message += `👥 Selected contacts: ${stats.totalContacts}\n`;

    if (stats.clusteredMessages > 0) {
      message += `🔗 Clustered messages: ${stats.clusteredMessages} (multiple contacts per phone)\n`;
      message += `📱 Individual messages: ${stats.individualMessages}\n`;
    }

    message += `\n🚀 This will open ${stats.uniquePhoneNumbers} WhatsApp tab${stats.uniquePhoneNumbers !== 1 ? 's' : ''}/window${stats.uniquePhoneNumbers !== 1 ? 's' : ''}.\n\n`;
    
    message += `📋 Important:\n`;
    message += `• Please allow popups for this site if prompted\n`;
    message += `• Each WhatsApp tab will open with a pre-filled message\n`;
    
    if (stats.clusteredMessages > 0) {
      message += `• Combined messages will show all contact details for shared phone numbers\n`;
    }
    
    message += `• You can then send each message individually in WhatsApp`;

    return message;
  }

  /**
   * Send bulk messages with cluster support
   */
  static async sendBulkMessages(
    clusters: ContactCluster[], 
    selectedContacts: Set<string>,
    messageTemplate?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: boolean; error?: string; messagesSent: number }> {
    try {
      // Get selected contacts grouped by phone number
      const selectedContactsList: WhatsAppCustomer[] = [];
      
      clusters.forEach(cluster => {
        cluster.contacts.forEach(contact => {
          if (selectedContacts.has(contact.id) && contact.phone_no) {
            selectedContactsList.push(contact);
          }
        });
      });

      if (selectedContactsList.length === 0) {
        return { success: false, error: 'No contacts with phone numbers selected', messagesSent: 0 };
      }

      // Group contacts by phone number
      const contactsByPhone = new Map<string, WhatsAppCustomer[]>();
      selectedContactsList.forEach(contact => {
        const cleanPhone = contact.phone_no.replace(/[\s\-\(\)\+]/g, '');
        if (!contactsByPhone.has(cleanPhone)) {
          contactsByPhone.set(cleanPhone, []);
        }
        contactsByPhone.get(cleanPhone)!.push(contact);
      });

      const totalMessages = contactsByPhone.size;
      let messagesSent = 0;

      // Send messages for each phone number group
      for (const [phone, contacts] of contactsByPhone) {
        try {
          // Create a temporary cluster for message generation
          const tempCluster: ContactCluster = {
            id: `temp_${phone}`,
            name: contacts[0].name,
            contacts,
            totalOutstanding: contacts.reduce((sum, c) => sum + (c.balance_pays || 0), 0),
            primaryPhone: phone,
            alternatePhones: [],
            isExpanded: false,
            lastUpdated: new Date(),
            conflictCount: 0
          };

          // Generate message using cluster integration
          const message = ContactClusteringIntegration.generateClusterWhatsAppMessage(
            tempCluster, 
            messageTemplate
          );

          // Generate WhatsApp URL
          const whatsappUrl = generateWhatsAppUrl(contacts[0].phone_no, message);
          
          // Open WhatsApp tab
          window.open(whatsappUrl, '_blank');
          
          messagesSent++;
          
          // Report progress
          if (onProgress) {
            onProgress(messagesSent, totalMessages);
          }

          // Wait between messages to prevent overwhelming the browser
          if (messagesSent < totalMessages) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error) {
          console.error(`Failed to send message to ${phone}:`, error);
          // Continue with other messages even if one fails
        }
      }

      return { success: true, messagesSent };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        messagesSent: 0
      };
    }
  }

  /**
   * Preview messages that would be sent
   */
  static previewMessages(
    clusters: ContactCluster[], 
    selectedContacts: Set<string>,
    messageTemplate?: string
  ): Array<{ phone: string; contacts: WhatsAppCustomer[]; message: string }> {
    const selectedContactsList: WhatsAppCustomer[] = [];
    
    clusters.forEach(cluster => {
      cluster.contacts.forEach(contact => {
        if (selectedContacts.has(contact.id) && contact.phone_no) {
          selectedContactsList.push(contact);
        }
      });
    });

    // Group by phone number
    const contactsByPhone = new Map<string, WhatsAppCustomer[]>();
    selectedContactsList.forEach(contact => {
      const cleanPhone = contact.phone_no.replace(/[\s\-\(\)\+]/g, '');
      if (!contactsByPhone.has(cleanPhone)) {
        contactsByPhone.set(cleanPhone, []);
      }
      contactsByPhone.get(cleanPhone)!.push(contact);
    });

    // Generate preview for each group
    const previews: Array<{ phone: string; contacts: WhatsAppCustomer[]; message: string }> = [];
    
    contactsByPhone.forEach((contacts, phone) => {
      const tempCluster: ContactCluster = {
        id: `preview_${phone}`,
        name: contacts[0].name,
        contacts,
        totalOutstanding: contacts.reduce((sum, c) => sum + (c.balance_pays || 0), 0),
        primaryPhone: phone,
        alternatePhones: [],
        isExpanded: false,
        lastUpdated: new Date(),
        conflictCount: 0
      };

      const message = ContactClusteringIntegration.generateClusterWhatsAppMessage(
        tempCluster, 
        messageTemplate
      );

      previews.push({
        phone: contacts[0].phone_no,
        contacts,
        message
      });
    });

    return previews;
  }
}

/**
 * React component wrapper for cluster bulk messaging
 */
const ClusterBulkMessagingComponent: React.FC<ClusterBulkMessagingProps> = ({
  clusters,
  selectedContacts,
  messageTemplate
}) => {
  const handleBulkSend = useCallback(async () => {
    const confirmMessage = ClusterBulkMessaging.generateConfirmationMessage(clusters, selectedContacts);
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const result = await ClusterBulkMessaging.sendBulkMessages(
      clusters, 
      selectedContacts, 
      messageTemplate,
      (current, total) => {
        // Update button text to show progress
        const button = document.querySelector('[data-bulk-send-button]') as HTMLButtonElement;
        if (button) {
          button.textContent = `Opening ${current}/${total}...`;
        }
      }
    );

    if (result.success) {
      // Reset button text
      setTimeout(() => {
        const button = document.querySelector('[data-bulk-send-button]') as HTMLButtonElement;
        if (button) {
          button.textContent = `Send Messages (${selectedContacts.size})`;
        }
      }, 1000);
    } else {
      alert(`Failed to send messages: ${result.error}`);
    }
  }, [clusters, selectedContacts, messageTemplate]);

  // This component doesn't render anything - it's just a service wrapper
  return null;
};

export default ClusterBulkMessagingComponent;