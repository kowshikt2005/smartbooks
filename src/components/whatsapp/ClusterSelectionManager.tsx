'use client';

import React, { useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { 
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import type { ContactCluster, WhatsAppCustomer } from '../../lib/services/contactClustering';
import { ContactClusteringService } from '../../lib/services/contactClustering';
import Button from '../ui/Button';

export interface ClusterSelectionManagerProps {
  clusters: ContactCluster[];
  selectedContacts: Set<string>;
  onSelectContact: (contactId: string, selected: boolean) => void;
  onSelectAllContacts: (selected: boolean) => void;
  onBulkSendMessages: () => void;
  className?: string;
}

export interface ClusterSelectionStats {
  totalClusters: number;
  selectedClusters: number;
  totalContacts: number;
  selectedContacts: number;
  contactsWithPhone: number;
  selectedContactsWithPhone: number;
  totalOutstanding: number;
  selectedOutstanding: number;
  uniquePhoneNumbers: number;
  selectedUniquePhoneNumbers: number;
}

/**
 * Component for managing cluster-based selection and bulk operations
 * Provides selection statistics and bulk action controls
 */
const ClusterSelectionManager: React.FC<ClusterSelectionManagerProps> = ({
  clusters,
  selectedContacts,
  onSelectContact,
  onSelectAllContacts,
  onBulkSendMessages,
  className
}) => {
  // Calculate selection statistics
  const stats: ClusterSelectionStats = useMemo(() => {
    const allContacts = ContactClusteringService.flattenClusters(clusters);
    const selectedContactsList = allContacts.filter(contact => selectedContacts.has(contact.id));
    
    // Get contacts with phone numbers
    const contactsWithPhone = allContacts.filter(contact => contact.phone_no && contact.phone_no.trim());
    const selectedContactsWithPhone = selectedContactsList.filter(contact => contact.phone_no && contact.phone_no.trim());
    
    // Calculate outstanding amounts
    const calculateOutstanding = (contacts: WhatsAppCustomer[]): number => {
      return contacts.reduce((sum, contact) => {
        const data = contact.originalData || contact;
        const amountFields = ['balance_pays', 'outstanding', 'balance', 'amount', 'due'];
        
        for (const field of amountFields) {
          if (data[field] && typeof data[field] === 'number') {
            return sum + data[field];
          }
        }
        
        return sum;
      }, 0);
    };
    
    // Get unique phone numbers
    const getUniquePhones = (contacts: WhatsAppCustomer[]): number => {
      const phones = contacts
        .map(contact => contact.phone_no)
        .filter(phone => phone && phone.trim())
        .map(phone => phone!.replace(/[\s\-\(\)\+]/g, ''));
      
      return new Set(phones).size;
    };
    
    // Count selected clusters (clusters where all contacts are selected)
    const selectedClusters = clusters.filter(cluster => 
      cluster.contacts.every(contact => 
        selectedContacts.has(contact.id) || !contact.phone_no
      )
    ).length;
    
    return {
      totalClusters: clusters.length,
      selectedClusters,
      totalContacts: allContacts.length,
      selectedContacts: selectedContactsList.length,
      contactsWithPhone: contactsWithPhone.length,
      selectedContactsWithPhone: selectedContactsWithPhone.length,
      totalOutstanding: calculateOutstanding(allContacts),
      selectedOutstanding: calculateOutstanding(selectedContactsList),
      uniquePhoneNumbers: getUniquePhones(allContacts),
      selectedUniquePhoneNumbers: getUniquePhones(selectedContactsWithPhone)
    };
  }, [clusters, selectedContacts]);

  // Check if all contacts are selected
  const allContactsSelected = stats.selectedContactsWithPhone === stats.contactsWithPhone && stats.contactsWithPhone > 0;
  
  // Check if some contacts are selected
  const someContactsSelected = stats.selectedContacts > 0;

  const handleSelectAll = useCallback((selected: boolean) => {
    onSelectAllContacts(selected);
  }, [onSelectAllContacts]);

  const handleSelectCluster = useCallback((cluster: ContactCluster, selected: boolean) => {
    cluster.contacts.forEach(contact => {
      if (contact.phone_no) { // Only select contacts with phone numbers
        onSelectContact(contact.id, selected);
      }
    });
  }, [onSelectContact]);

  const handleSelectAllClusters = useCallback((selected: boolean) => {
    clusters.forEach(cluster => {
      handleSelectCluster(cluster, selected);
    });
  }, [clusters, handleSelectCluster]);

  const handleClearSelection = useCallback(() => {
    handleSelectAll(false);
  }, [handleSelectAll]);

  if (clusters.length === 0) {
    return null;
  }

  return (
    <div className={clsx('bg-white border border-slate-200 rounded-lg shadow-sm', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900">Cluster Selection</h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={allContactsSelected}
              ref={(input) => {
                if (input) input.indeterminate = someContactsSelected && !allContactsSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              title="Select all contacts with phone numbers"
            />
            <span className="text-xs text-slate-600">Select All</span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-900">{stats.selectedClusters}</div>
            <div className="text-xs text-slate-600">Selected Clusters</div>
            <div className="text-xs text-slate-500">of {stats.totalClusters}</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{stats.selectedContactsWithPhone}</div>
            <div className="text-xs text-slate-600">Selected Contacts</div>
            <div className="text-xs text-slate-500">of {stats.contactsWithPhone} with phone</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              ₹{stats.selectedOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-600">Selected Outstanding</div>
            <div className="text-xs text-slate-500">of ₹{stats.totalOutstanding.toLocaleString('en-IN')}</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{stats.selectedUniquePhoneNumbers}</div>
            <div className="text-xs text-slate-600">Unique Phone Numbers</div>
            <div className="text-xs text-slate-500">WhatsApp tabs to open</div>
          </div>
        </div>

        {/* Selection Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSelectAllClusters(true)}
              disabled={allContactsSelected}
              icon={<CheckIcon className="h-3 w-3" />}
            >
              Select All Clusters
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              disabled={!someContactsSelected}
              icon={<XMarkIcon className="h-3 w-3" />}
            >
              Clear Selection
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {someContactsSelected && (
              <div className="text-xs text-slate-600 mr-2">
                {stats.selectedContactsWithPhone} contact{stats.selectedContactsWithPhone !== 1 ? 's' : ''} selected
              </div>
            )}
            
            <Button
              variant="primary"
              onClick={onBulkSendMessages}
              disabled={stats.selectedContactsWithPhone === 0}
              icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
              data-bulk-send-button
            >
              Send Messages ({stats.selectedContactsWithPhone})
            </Button>
          </div>
        </div>

        {/* Clustering Benefits Info */}
        {stats.selectedUniquePhoneNumbers < stats.selectedContactsWithPhone && stats.selectedContactsWithPhone > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-2">
              <UsersIcon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <strong>Clustering Benefit:</strong> {stats.selectedContactsWithPhone - stats.selectedUniquePhoneNumbers} fewer WhatsApp tabs will open due to contact clustering. 
                Messages will be combined for contacts sharing the same phone number.
              </div>
            </div>
          </div>
        )}

        {/* Warning for no phone numbers */}
        {stats.selectedContacts > 0 && stats.selectedContactsWithPhone === 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <CurrencyRupeeIcon className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-700">
                <strong>No Phone Numbers:</strong> The selected contacts don't have phone numbers. 
                WhatsApp messaging is not available for these contacts.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClusterSelectionManager;