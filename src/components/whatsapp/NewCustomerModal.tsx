'use client';

import React, { useState, useCallback } from 'react';
import { UserPlusIcon, PhoneIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { NewCustomerWorkflow } from '../../lib/services/newCustomerWorkflow';
import type { NewCustomerPrompt } from '../../lib/services/simplifiedImportService';
import type { Customer } from '../../lib/supabase/types';
import toast from 'react-hot-toast';

export interface NewCustomerModalProps {
  prompt: NewCustomerPrompt;
  onConfirm: (customer: Customer) => Promise<void>;
  onSkip: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface NewCustomerModalState {
  phoneNumber: string;
  isValid: boolean;
  error: string | null;
  isLoading: boolean;
  showPreview: boolean;
}

/**
 * Simple New Customer Creation Modal
 * 
 * This component provides a lightweight interface for creating new customers
 * during the import process. It shows only for no-match records and provides
 * simple Yes/No/Skip actions with phone number validation.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 8.2
 */
const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  prompt,
  onConfirm,
  onSkip,
  onCancel,
  isOpen
}) => {
  const [state, setState] = useState<NewCustomerModalState>({
    phoneNumber: prompt.importRecord.phone || '',
    isValid: false,
    error: null,
    isLoading: false,
    showPreview: false
  });

  // Validate phone number (10-15 digits)
  const validatePhoneNumber = useCallback((phone: string): { isValid: boolean; error: string | null } => {
    if (!phone.trim()) {
      return { isValid: false, error: 'Phone number is required' };
    }

    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return { isValid: false, error: 'Phone number must be at least 10 digits' };
    }
    
    if (cleanPhone.length > 15) {
      return { isValid: false, error: 'Phone number cannot exceed 15 digits' };
    }

    return { isValid: true, error: null };
  }, []);

  // Handle phone number input change
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;
    const validation = validatePhoneNumber(phoneNumber);
    
    setState(prev => ({
      ...prev,
      phoneNumber,
      isValid: validation.isValid,
      error: validation.error
    }));
  }, [validatePhoneNumber]);

  // Handle customer creation confirmation
  const handleConfirm = useCallback(async () => {
    if (!state.isValid) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create new customer using the workflow service
      const result = await NewCustomerWorkflow.handleNewCustomerPrompt(
        prompt,
        state.phoneNumber
      );

      if (result.success && result.customer) {
        toast.success(`✅ Created new customer: ${result.customer.name}`);
        await onConfirm(result.customer);
      } else {
        throw new Error(result.error || 'Failed to create customer');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(`Failed to create customer: ${errorMessage}`);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isValid, state.phoneNumber, prompt, onConfirm]);

  // Handle skip action
  const handleSkip = useCallback(() => {
    toast(`Skipped creating customer: ${prompt.importRecord.name}`, { icon: 'ℹ️' });
    onSkip();
  }, [prompt.importRecord.name, onSkip]);

  // Toggle preview of customer data
  const togglePreview = useCallback(() => {
    setState(prev => ({ ...prev, showPreview: !prev.showPreview }));
  }, []);

  // Get preview data
  const previewData = NewCustomerWorkflow.previewNewCustomer(prompt, state.phoneNumber);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Create New Customer"
      size="md"
      closeOnOverlayClick={false}
    >
      <div className="space-y-6">
        {/* Customer Info Header */}
        <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <UserPlusIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">
              Create customer for "{prompt.importRecord.name}"?
            </h3>
            <p className="text-sm text-blue-700">
              No matching contact found in your database
            </p>
          </div>
        </div>

        {/* Phone Number Input */}
        <div className="space-y-4">
          <Input
            label="Phone Number"
            type="tel"
            value={state.phoneNumber}
            onChange={handlePhoneChange}
            placeholder="Enter 10-15 digit phone number"
            error={state.error}
            helperText="Required for WhatsApp messaging"
            icon={<PhoneIcon className="h-5 w-5" />}
            required
            disabled={state.isLoading}
          />

          {/* Validation Status */}
          {state.phoneNumber && (
            <div className="flex items-center space-x-2">
              {state.isValid ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700">Valid phone number</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">{state.error}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Customer Preview (Optional) */}
        {state.isValid && (
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={togglePreview}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            >
              {state.showPreview ? '▼' : '▶'} Preview customer details
            </button>
            
            {state.showPreview && (
              <div className="px-4 pb-4 space-y-2 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Name:</span>
                    <p className="text-gray-900">{previewData.customerData.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Phone:</span>
                    <p className="text-gray-900">{previewData.customerData.phone_no}</p>
                  </div>
                  {previewData.customerData.location && (
                    <div>
                      <span className="font-medium text-gray-600">Location:</span>
                      <p className="text-gray-900">{previewData.customerData.location}</p>
                    </div>
                  )}
                  {previewData.customerData.invoice_id && (
                    <div>
                      <span className="font-medium text-gray-600">Invoice ID:</span>
                      <p className="text-gray-900">{previewData.customerData.invoice_id}</p>
                    </div>
                  )}
                </div>
                
                {/* Warnings */}
                {previewData.warnings.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Warnings:</span>
                    </div>
                    <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                      {previewData.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {state.error && !state.phoneNumber && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">{state.error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={state.isLoading}
          >
            Skip
          </Button>
          
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={state.isLoading}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!state.isValid || state.isLoading}
            loading={state.isLoading}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            {state.isLoading ? 'Creating...' : 'Yes, Create Customer'}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center">
          This will create a new customer in your database and make them available for WhatsApp messaging.
        </div>
      </div>
    </Modal>
  );
};

export default NewCustomerModal;