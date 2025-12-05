'use client';

import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { CustomerService } from '../../lib/services/customers';
import type { Customer } from '../../lib/supabase/types';

interface PhoneNumberSuggestionsProps {
  contactName: string;
  onPhoneSelected: (phone: string, source: 'manual' | 'customer') => void;
  onSkip: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const PhoneNumberSuggestions: React.FC<PhoneNumberSuggestionsProps> = ({
  contactName,
  onPhoneSelected,
  onSkip,
  onClose,
  isOpen
}) => {
  const [suggestedCustomers, setSuggestedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load suggested customers when component opens
  useEffect(() => {
    if (isOpen && contactName) {
      loadSuggestions(contactName);
    }
  }, [isOpen, contactName]);

  const loadSuggestions = async (name: string) => {
    setLoading(true);
    try {
      const customers = await CustomerService.getCustomersWithPhoneByName(name);
      setSuggestedCustomers(customers);
    } catch (error) {
      console.error('Error loading phone suggestions:', error);
      setSuggestedCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const customers = await CustomerService.getCustomersWithPhoneByName(searchTerm);
      setSuggestedCustomers(customers);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPhoneSubmit = async () => {
    const cleanPhone = manualPhone.replace(/[\s\-\(\)\+]/g, '');
    if (!manualPhone.trim()) {
      alert('Please enter a phone number');
      return;
    }
    if (!cleanPhone || !/^\d{10,15}$/.test(cleanPhone)) {
      alert('Please enter a valid phone number (10-15 digits)\nExample: 9876543210 or +91 98765 43210');
      return;
    }

    // Check for duplicate phone numbers in database
    try {
      setLoading(true);
      
      // Search for existing customers with this phone number
      const { data: existingCustomers } = await CustomerService.getAll({
        search: manualPhone.trim(),
        limit: 10
      });
      
      const duplicateCustomers = existingCustomers.filter(customer => {
        if (!customer.phone_no) return false;
        const existingCleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
        return existingCleanPhone === cleanPhone;
      });
      
      if (duplicateCustomers.length > 0) {
        const customerNames = duplicateCustomers.map(c => c.name).join(', ');
        const confirmed = confirm(
          `⚠️ Duplicate Phone Number Detected!\n\n` +
          `The phone number "${manualPhone.trim()}" is already used by:\n` +
          `${customerNames}\n\n` +
          `Do you want to proceed anyway?\n\n` +
          `Note: This will add the phone number to "${contactName}" for this import session only. ` +
          `The existing customer records will not be affected.`
        );
        
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }
      
      onPhoneSelected(manualPhone.trim(), 'manual');
    } catch (error) {
      console.error('Error checking for duplicate phone numbers:', error);
      // If duplicate check fails, still allow the user to proceed
      const confirmed = confirm(
        `Unable to check for duplicate phone numbers.\n\n` +
        `Do you want to proceed with adding "${manualPhone.trim()}" to "${contactName}"?`
      );
      
      if (confirmed) {
        onPhoneSelected(manualPhone.trim(), 'manual');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerPhoneSelect = async (customer: Customer) => {
    if (!customer.phone_no) return;
    
    // When selecting from customer database, inform about the source
    const confirmed = confirm(
      `Use phone number from customer database?\n\n` +
      `Customer: ${customer.name}\n` +
      `Phone: ${customer.phone_no}\n` +
      `Contact: ${contactName}\n\n` +
      `This will add the phone number to "${contactName}" for this import session.`
    );
    
    if (confirmed) {
      onPhoneSelected(customer.phone_no, 'customer');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <PhoneIcon className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Add Phone Number
                </h3>
                <p className="text-sm text-gray-600">
                  For contact: <span className="font-medium">{contactName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Manual Phone Entry */}
          <Card className="p-4 mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Enter Phone Number Manually
            </h4>
            <div className="flex space-x-3">
              <Input
                type="tel"
                placeholder="Enter phone number (e.g., 9876543210)"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleManualPhoneSubmit}
                disabled={!manualPhone.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This phone number will be applied to ALL records with the name "{contactName}"
            </p>
          </Card>

          {/* Customer Database Suggestions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900">
                Suggestions from Customer Database
              </h4>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Search different name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  disabled={!searchTerm.trim() || loading}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Searching customers...</p>
              </div>
            ) : suggestedCustomers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suggestedCustomers.map((customer) => (
                  <Card key={customer.id} className="p-3 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-600">
                            <PhoneIcon className="h-3 w-3 inline mr-1" />
                            {customer.phone_no}
                          </p>
                          {customer.location && (
                            <p className="text-xs text-gray-500">{customer.location}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCustomerPhoneSelect(customer)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Use This
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center">
                <UserIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  No customers found with similar names and phone numbers
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Try searching with a different name or enter manually above
                </p>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onSkip}
            >
              Skip for Now
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneNumberSuggestions;