'use client';

import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  UserIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { EnhancedPhonePropagationService } from '../../lib/services/enhancedPhonePropagation';
import { AutoPhoneResolutionService } from '../../lib/services/autoPhoneResolution';
import PhoneNumberSuggestions from './PhoneNumberSuggestions';
import toast from 'react-hot-toast';

interface PhoneNumberManagerProps {
  sessionData: any;
  onPhoneAdded: (contactName: string, phoneNumber: string) => void;
  isVisible: boolean;
}

const PhoneNumberManager: React.FC<PhoneNumberManagerProps> = ({
  sessionData,
  onPhoneAdded,
  isVisible
}) => {
  const [stats, setStats] = useState<any>(null);
  const [contactsWithoutPhone, setContactsWithoutPhone] = useState<{ [name: string]: any[] }>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedContactName, setSelectedContactName] = useState('');
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());
  const [autoResolving, setAutoResolving] = useState(false);

  // Update stats when session data changes
  useEffect(() => {
    if (sessionData) {
      const phoneStats = EnhancedPhonePropagationService.getPhoneNumberStats(sessionData);
      const contactsWithoutPhoneData = EnhancedPhonePropagationService.getContactsWithoutPhone(sessionData);
      
      setStats(phoneStats);
      setContactsWithoutPhone(contactsWithoutPhoneData);
    }
  }, [sessionData]);

  const handleAddPhoneClick = (contactName: string) => {
    setSelectedContactName(contactName);
    setShowSuggestions(true);
  };

  const handlePhoneSelected = async (phone: string, source: 'manual' | 'customer') => {
    try {
      const result = EnhancedPhonePropagationService.propagatePhoneInSession(
        selectedContactName,
        phone,
        sessionData
      );

      if (result.success) {
        // Update localStorage
        localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
        
        // Notify parent component
        onPhoneAdded(selectedContactName, phone);
        
        // Show success message
        toast.success(
          `✅ ${result.message}\n\nSource: ${source === 'manual' ? 'Manual Entry' : 'Customer Database'}`,
          { duration: 4000 }
        );
        
        // Update local state
        const updatedStats = EnhancedPhonePropagationService.getPhoneNumberStats(sessionData);
        const updatedContactsWithoutPhone = EnhancedPhonePropagationService.getContactsWithoutPhone(sessionData);
        setStats(updatedStats);
        setContactsWithoutPhone(updatedContactsWithoutPhone);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error adding phone number:', error);
      toast.error('Failed to add phone number. Please try again.');
    }
    
    setShowSuggestions(false);
    setSelectedContactName('');
  };

  const handleSkipPhone = () => {
    setShowSuggestions(false);
    setSelectedContactName('');
    toast('Phone number addition skipped', { icon: 'ℹ️' });
  };

  const toggleNameExpansion = (name: string) => {
    const newExpanded = new Set(expandedNames);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedNames(newExpanded);
  };

  const handleAutoResolve = async () => {
    if (Object.keys(contactsWithoutPhone).length === 0) {
      toast('No contacts missing phone numbers', { icon: 'ℹ️' });
      return;
    }

    setAutoResolving(true);
    
    try {
      const result = await AutoPhoneResolutionService.autoResolvePhoneNumbers(sessionData);
      
      if (result.phonesAdded > 0) {
        // Update localStorage
        localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
        
        // Update local state
        const updatedStats = EnhancedPhonePropagationService.getPhoneNumberStats(sessionData);
        const updatedContactsWithoutPhone = EnhancedPhonePropagationService.getContactsWithoutPhone(sessionData);
        setStats(updatedStats);
        setContactsWithoutPhone(updatedContactsWithoutPhone);
        
        // Show success message
        toast.success(
          `🎉 Auto-resolution completed!\n\n` +
          `✅ ${result.phonesAdded} phone number(s) added\n` +
          `⏭️ ${result.skipped} contact(s) skipped\n` +
          `❌ ${result.errors} error(s)`,
          { duration: 6000 }
        );
        
        // Notify parent component
        if (result.phonesAdded > 0) {
          onPhoneAdded('multiple', 'auto-resolved');
        }
      } else {
        toast('No phone numbers could be auto-resolved from customer database', { 
          icon: '⏭️',
          duration: 4000 
        });
      }
    } catch (error) {
      console.error('Auto-resolution failed:', error);
      toast.error('Auto-resolution failed. Please try manual resolution.');
    } finally {
      setAutoResolving(false);
    }
  };

  if (!isVisible || !stats) return null;

  const uniqueNamesWithoutPhone = Object.keys(contactsWithoutPhone);

  return (
    <div className="space-y-4">
      {/* Phone Number Coverage Stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <PhoneIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Phone Number Coverage</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{stats.coveragePercentage}%</div>
            <div className="text-xs text-gray-500">Coverage</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-green-800">{stats.contactsWithPhone}</div>
            <div className="text-sm text-green-600">With Phone</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-yellow-800">{stats.contactsWithoutPhone}</div>
            <div className="text-sm text-yellow-600">Missing Phone</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <UserIcon className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-semibold text-blue-800">{stats.uniqueNamesWithoutPhone}</div>
            <div className="text-sm text-blue-600">Unique Names</div>
          </div>
        </div>

        {stats.contactsWithoutPhone > 0 && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">{stats.contactsWithoutPhone} contacts</span> are missing phone numbers and won't be available for WhatsApp messaging.
                </p>
              </div>
            </div>
            
            {/* Auto-Resolution Option */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-800">🤖 Auto-Resolution</h4>
                  <p className="text-sm text-blue-700">
                    Automatically search customer database and add phone numbers for matching contacts
                  </p>
                </div>
                <Button
                  onClick={handleAutoResolve}
                  disabled={autoResolving || uniqueNamesWithoutPhone.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  loading={autoResolving}
                >
                  {autoResolving ? 'Auto-Resolving...' : '🚀 Auto-Resolve'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Contacts Without Phone Numbers */}
      {uniqueNamesWithoutPhone.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">
              Add Phone Numbers ({uniqueNamesWithoutPhone.length} names)
            </h4>
            <div className="text-sm text-gray-600">
              Click "Add Phone" to add numbers from customer database or manually
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uniqueNamesWithoutPhone.map((name) => {
              const contacts = contactsWithoutPhone[name];
              const isExpanded = expandedNames.has(name);
              
              return (
                <div key={name} className="border border-gray-200 rounded-lg">
                  <div className="p-3 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleNameExpansion(name)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <UserIcon className="h-4 w-4" />
                      </button>
                      <div>
                        <p className="font-medium text-gray-900">{name}</p>
                        <p className="text-sm text-gray-600">
                          {contacts.length} record{contacts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => toggleNameExpansion(name)}
                        variant="outline"
                        className="text-xs"
                      >
                        {isExpanded ? 'Hide' : 'Show'} Records
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddPhoneClick(name)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <PlusIcon className="h-3 w-3 mr-1" />
                        Add Phone
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-3 border-t border-gray-200 bg-white">
                      <div className="space-y-2">
                        {contacts.map((contact, index) => (
                          <div key={contact.id || index} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                            <div className="flex justify-between">
                              <span>Record {index + 1}</span>
                              {contact.originalData?.outstanding && (
                                <span className="font-medium">
                                  ₹{contact.originalData.outstanding.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                            {contact.originalData?.invoice_id && (
                              <div className="text-xs text-gray-500">
                                Invoice: {contact.originalData.invoice_id}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Phone Number Suggestions Modal */}
      <PhoneNumberSuggestions
        contactName={selectedContactName}
        onPhoneSelected={handlePhoneSelected}
        onSkip={handleSkipPhone}
        onClose={() => setShowSuggestions(false)}
        isOpen={showSuggestions}
      />
    </div>
  );
};

export default PhoneNumberManager;