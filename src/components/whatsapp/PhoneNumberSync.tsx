'use client';

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import type { ContactCluster } from '../../lib/services/contactClustering';
import { formatPhoneForDisplay, validatePhoneNumber } from '../../utils/phoneUtils';
import Button from '../ui/Button';

export interface PhoneNumberSyncProps {
  cluster: ContactCluster;
  onSyncPhone: (clusterId: string, newPhone: string) => Promise<void>;
  className?: string;
}

/**
 * Component for handling phone number synchronization across cluster contacts
 * Shows conflicts and provides options to resolve them
 */
const PhoneNumberSync: React.FC<PhoneNumberSyncProps> = ({
  cluster,
  onSyncPhone,
  className
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Get all unique phone numbers in the cluster
  const uniquePhones = React.useMemo(() => {
    const phones = cluster.contacts
      .map(contact => contact.phone_no)
      .filter(phone => phone && phone.trim())
      .map(phone => phone!.trim());
    
    return [...new Set(phones)];
  }, [cluster.contacts]);

  const hasPhoneConflicts = uniquePhones.length > 1;
  const hasNoPhones = uniquePhones.length === 0;

  const handleSyncToPhone = useCallback(async (targetPhone: string) => {
    const validation = validatePhoneNumber(targetPhone);
    if (!validation.isValid) {
      setSyncError(validation.message || 'Invalid phone number');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      await onSyncPhone(cluster.id, targetPhone);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Failed to sync phone number');
    } finally {
      setIsSyncing(false);
    }
  }, [cluster.id, onSyncPhone]);

  if (hasNoPhones) {
    return (
      <div className={clsx('p-3 bg-yellow-50 border border-yellow-200 rounded-md', className)}>
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800">No Phone Numbers</h4>
            <p className="text-xs text-yellow-700 mt-1">
              None of the contacts in this cluster have phone numbers. Add a phone number to enable WhatsApp messaging.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPhoneConflicts) {
    return (
      <div className={clsx('p-3 bg-green-50 border border-green-200 rounded-md', className)}>
        <div className="flex items-center space-x-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-green-800">Phone Numbers Synchronized</h4>
            <p className="text-xs text-green-700 mt-1">
              All contacts in this cluster have the same phone number: {formatPhoneForDisplay(uniquePhones[0])}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('p-3 bg-orange-50 border border-orange-200 rounded-md', className)}>
      <div className="flex items-start space-x-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-orange-800">Phone Number Conflicts</h4>
          <p className="text-xs text-orange-700 mt-1">
            Contacts in this cluster have different phone numbers. Choose which number to use for all contacts:
          </p>
          
          <div className="mt-3 space-y-2">
            {uniquePhones.map((phone, index) => {
              const contactsWithThisPhone = cluster.contacts.filter(
                contact => contact.phone_no?.trim() === phone
              );
              
              return (
                <div key={phone} className="flex items-center justify-between p-2 bg-white border border-orange-200 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {formatPhoneForDisplay(phone)}
                    </div>
                    <div className="text-xs text-slate-600">
                      Used by {contactsWithThisPhone.length} contact{contactsWithThisPhone.length !== 1 ? 's' : ''}: {' '}
                      {contactsWithThisPhone.map(c => c.name).join(', ')}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={index === 0 ? 'primary' : 'outline'}
                    onClick={() => handleSyncToPhone(phone)}
                    disabled={isSyncing}
                    loading={isSyncing}
                    icon={<ArrowPathIcon className="h-3 w-3" />}
                  >
                    Use This
                  </Button>
                </div>
              );
            })}
          </div>
          
          {syncError && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {syncError}
            </div>
          )}
          
          <div className="mt-2 text-xs text-orange-600">
            <strong>Note:</strong> Selecting a phone number will update all contacts in this cluster to use the same number.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneNumberSync;