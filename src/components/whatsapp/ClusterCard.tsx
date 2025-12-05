'use client';

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  PhoneIcon,
  CurrencyRupeeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import type { ContactCluster, WhatsAppCustomer } from '../../lib/services/contactClustering';
import { formatPhoneForDisplay, validatePhoneNumber } from '../../utils/phoneUtils';
import { sendWhatsAppMessage, getMessagingMode } from '../../utils/whatsappSender';
import Button from '../ui/Button';

export interface ClusterCardProps {
  cluster: ContactCluster;
  onPhoneUpdate: (clusterId: string, phone: string) => Promise<void>;
  onToggleExpand: (clusterId: string) => void;
  onSelectContact: (contactId: string, selected: boolean) => void;
  selectedContacts: Set<string>;
  isSelected?: boolean;
  onSelectCluster?: (clusterId: string, selected: boolean) => void;
  onEditContact?: (contactId: string, updates: { name?: string; phone_no?: string }) => Promise<void>;
  isShowingImportedData?: boolean;
}

interface ContactRowProps {
  contact: WhatsAppCustomer;
  isSelected: boolean;
  onSelect: (contactId: string, selected: boolean) => void;
  showPhoneEditor?: boolean;
  onEditContact?: (contactId: string, updates: { name?: string; phone_no?: string }) => Promise<void>;
  isShowingImportedData?: boolean;
}

const ContactRow: React.FC<ContactRowProps> = ({ 
  contact, 
  isSelected, 
  onSelect,
  showPhoneEditor = false,
  onEditContact,
  isShowingImportedData = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: contact.name, phone_no: contact.phone_no });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditForm({ name: contact.name, phone_no: contact.phone_no });
  }, [contact.name, contact.phone_no]);

  const handleSaveEdit = useCallback(async () => {
    if (!onEditContact) return;
    
    // Validate form data
    if (!editForm.name.trim()) {
      alert('Name is required');
      return;
    }
    
    // Validate phone number format (basic validation)
    if (editForm.phone_no && !/^\d{10,15}$/.test(editForm.phone_no.replace(/[\s\-\(\)\+]/g, ''))) {
      alert('Please enter a valid phone number (10-15 digits)');
      return;
    }

    setIsUpdating(true);
    try {
      await onEditContact(contact.id, {
        name: editForm.name.trim(),
        phone_no: editForm.phone_no.trim()
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }, [contact.id, editForm, onEditContact]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({ name: contact.name, phone_no: contact.phone_no });
  }, [contact.name, contact.phone_no]);
  // Calculate outstanding amount from various possible fields - prioritize Excel data
  const getOutstandingAmount = (contact: WhatsAppCustomer): number => {
    // First check originalData (Excel import data) for the exact amount
    if (contact.originalData) {
      const amountFields = ['outstanding', 'Outstanding', 'balance_pays', 'balance', 'Balance', 'amount', 'Amount', 'due', 'Due'];
      for (const field of amountFields) {
        if (contact.originalData[field] !== null && contact.originalData[field] !== undefined && typeof contact.originalData[field] === 'number') {
          return contact.originalData[field];
        }
      }
    }
    
    // Fallback to contact properties
    const amountFields = ['balance_pays', 'outstanding', 'balance', 'amount', 'due'];
    for (const field of amountFields) {
      if (contact[field as keyof WhatsAppCustomer] && typeof contact[field as keyof WhatsAppCustomer] === 'number') {
        return contact[field as keyof WhatsAppCustomer] as number;
      }
    }
    
    return 0;
  };

  const outstandingAmount = getOutstandingAmount(contact);

  return (
    <div className="flex items-center justify-between py-2 px-4 bg-slate-50 border-l-4 border-blue-200">
      <div className="flex items-center space-x-3 flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(contact.id, e.target.checked)}
          disabled={!contact.phone_no || (() => {
            const cleanPhone = contact.phone_no.replace(/[\s\-\(\)\+]/g, '');
            return !/^\d{10,15}$/.test(cleanPhone);
          })()}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          title={!contact.phone_no || (() => {
            const cleanPhone = contact.phone_no.replace(/[\s\-\(\)\+]/g, '');
            return !/^\d{10,15}$/.test(cleanPhone);
          })() ? 'Invalid or missing phone number - WhatsApp messaging not available' : ''}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 flex-1 min-w-0"
                placeholder="Contact name"
                disabled={isUpdating}
              />
            ) : (
              <span className="text-sm font-medium text-slate-900 truncate">
                {contact.name}
              </span>
            )}
            {(contact.invoice_id || contact.originalData?.invoice_id) && (
              <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                {contact.invoice_id || contact.originalData?.invoice_id}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4 mt-1">
            {isEditing ? (
              <div className="flex items-center space-x-1">
                <PhoneIcon className="h-3 w-3 text-slate-600" />
                <input
                  type="tel"
                  value={editForm.phone_no}
                  onChange={(e) => setEditForm({...editForm, phone_no: e.target.value})}
                  className="text-xs text-slate-600 bg-white border border-slate-300 rounded px-2 py-1"
                  placeholder="Phone number"
                  disabled={isUpdating}
                />
              </div>
            ) : (
              contact.phone_no && !showPhoneEditor && (
                <div className="flex items-center space-x-1 text-xs text-slate-600">
                  <PhoneIcon className="h-3 w-3" />
                  <span>{formatPhoneForDisplay(contact.phone_no)}</span>
                </div>
              )
            )}
            
            {(contact.location || contact.originalData?.location) && (
              <span className="text-xs text-slate-600">
                📍 {contact.location || contact.originalData?.location}
              </span>
            )}
            
            {/* Show Excel data exactly as imported */}
            {contact.originalData && Object.keys(contact.originalData).length > 0 && (
              <div className="flex items-center space-x-2 flex-wrap">
                {Object.entries(contact.originalData).map(([key, value]) => {
                  // Skip system fields and empty values
                  if (key === 'rowNumber' || value === null || value === undefined || value === '') return null;
                  
                  return (
                    <span key={key} className="text-xs text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                      {key}: {typeof value === 'number' ? 
                        (key.toLowerCase().includes('amount') || key.toLowerCase().includes('outstanding') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('due') ? 
                          `₹${value.toLocaleString('en-IN')}` : value.toString()) 
                        : value.toString()}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm font-medium text-green-600">
            <CurrencyRupeeIcon className="h-4 w-4" />
            <span>₹{outstandingAmount.toLocaleString('en-IN')}</span>
          </div>
          
          {/* Action Controls */}
          {isEditing ? (
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                loading={isUpdating}
                icon={<CheckIcon className="h-3 w-3" />}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                icon={<XMarkIcon className="h-3 w-3" />}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              {/* Quick Send WhatsApp Button - Only show for valid phone numbers */}
              {contact.phone_no && (() => {
                const cleanPhone = contact.phone_no.replace(/[\s\-\(\)\+]/g, '');
                return /^\d{10,15}$/.test(cleanPhone);
              })() && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const mode = getMessagingMode();
                    const amount = getOutstandingAmount(contact);
                    const invoiceId = contact.invoice_id || contact.originalData?.invoice_id || contact.originalData?.['Invoice ID'] || 'N/A';
                    
                    if (mode === 'cloud') {
                      // Use template for Cloud API
                      try {
                        // Build clean message data for template
                        const contactName = contact.name;
                        const transactionDetails = [];
                        
                        if (contact.originalData) {
                          // Extract key fields from Excel data
                          if (contact.originalData['Contacts']) transactionDetails.push(`Contacts: ${contact.originalData['Contacts']}`);
                          if (contact.originalData['Date']) transactionDetails.push(`Date: ${contact.originalData['Date']}`);
                          if (contact.originalData['Trans#']) transactionDetails.push(`Trans#: ${contact.originalData['Trans#']}`);
                          if (contact.originalData['Balance']) transactionDetails.push(`Balance: ₹${contact.originalData['Balance'].toLocaleString('en-IN')}`);
                        } else {
                          if (invoiceId && invoiceId !== 'N/A') transactionDetails.push(`Invoice: ${invoiceId}`);
                          transactionDetails.push(`Amount: ₹${amount.toLocaleString('en-IN')}`);
                        }
                        
                        const detailsText = transactionDetails.join(' ');
                        
                        const response = await fetch('/api/whatsapp/send-message', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: contact.phone_no,
                            templateName: 'payment_reminder',
                            templateParams: {
                              body_1: contactName,
                              body_2: detailsText,
                              body_3: 'sri balaji enterprises'
                            }
                          })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                          alert(`✅ Message sent!\nMessage ID: ${result.messageId}`);
                        } else {
                          alert(`❌ Failed: ${result.error}`);
                        }
                      } catch (error) {
                        alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    } else {
                      // WhatsApp Web mode - use free-form message
                      let message = `Dear ${contact.name},\n\n`;
                      message += `This is a friendly reminder regarding your payment.\n\n`;
                      message += `*Payment Details:*\n`;
                      
                      if (contact.originalData) {
                        // Show Excel data in a clean format
                        Object.entries(contact.originalData).forEach(([key, value]) => {
                          if (key !== 'rowNumber' && value !== null && value !== undefined && value !== '') {
                            if (typeof value === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('outstanding') || key.toLowerCase().includes('balance'))) {
                              message += `${key}: ₹${value.toLocaleString('en-IN')}\n`;
                            } else {
                              message += `${key}: ${value}\n`;
                            }
                          }
                        });
                      } else {
                        message += `Outstanding: ₹${amount.toLocaleString('en-IN')}\n`;
                      }
                      
                      message += `\nPlease make the payment at your earliest convenience.\n\n`;
                      message += `Thank you!\nSri Balaji Enterprises Team`;
                      
                      await sendWhatsAppMessage({
                        to: contact.phone_no,
                        message,
                        mode
                      });
                    }
                  }}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Send WhatsApp message using template"
                >
                  💬
                </Button>
              )}
              
              {/* Edit Button */}
              {onEditContact && isShowingImportedData && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStartEdit}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  icon={<PencilIcon className="h-3 w-3" />}
                  title="Edit contact details"
                >
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  onPhoneUpdate,
  onToggleExpand,
  onSelectContact,
  selectedContacts,
  isSelected = false,
  onSelectCluster,
  onEditContact,
  isShowingImportedData = false
}) => {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState(cluster.primaryPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if all contacts in cluster are selected
  const allContactsSelected = cluster.contacts.every(contact => 
    selectedContacts.has(contact.id) || !contact.phone_no
  );
  
  // Check if some contacts in cluster are selected
  const someContactsSelected = cluster.contacts.some(contact => 
    selectedContacts.has(contact.id)
  );

  const handleToggleExpand = useCallback(() => {
    onToggleExpand(cluster.id);
  }, [cluster.id, onToggleExpand]);

  const handleStartPhoneEdit = useCallback(() => {
    setIsEditingPhone(true);
    setPhoneValue(cluster.primaryPhone);
    setPhoneError(null);
  }, [cluster.primaryPhone]);

  const handleCancelPhoneEdit = useCallback(() => {
    setIsEditingPhone(false);
    setPhoneValue(cluster.primaryPhone);
    setPhoneError(null);
  }, [cluster.primaryPhone]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneValue(value);
    
    // Validate phone number in real-time
    if (value.trim()) {
      const validation = validatePhoneNumber(value);
      setPhoneError(validation.isValid ? null : validation.message || 'Invalid phone number');
    } else {
      setPhoneError('Phone number is required');
    }
  }, []);

  const handleSavePhone = useCallback(async () => {
    if (phoneError || !phoneValue.trim()) {
      return;
    }

    setIsUpdating(true);
    try {
      await onPhoneUpdate(cluster.id, phoneValue.trim());
      setIsEditingPhone(false);
      setPhoneError(null);
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Failed to update phone number');
    } finally {
      setIsUpdating(false);
    }
  }, [cluster.id, phoneValue, phoneError, onPhoneUpdate]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !phoneError && phoneValue.trim()) {
      handleSavePhone();
    } else if (e.key === 'Escape') {
      handleCancelPhoneEdit();
    }
  }, [phoneError, phoneValue, handleSavePhone, handleCancelPhoneEdit]);

  const handleClusterSelect = useCallback((checked: boolean) => {
    if (onSelectCluster) {
      onSelectCluster(cluster.id, checked);
    } else {
      // Fallback: select/deselect all contacts in cluster
      cluster.contacts.forEach(contact => {
        if (contact.phone_no) { // Only select contacts with phone numbers
          onSelectContact(contact.id, checked);
        }
      });
    }
  }, [cluster, onSelectCluster, onSelectContact]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Cluster Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {/* Cluster Selection Checkbox */}
            <input
              type="checkbox"
              checked={allContactsSelected}
              ref={(input) => {
                if (input) input.indeterminate = someContactsSelected && !allContactsSelected;
              }}
              onChange={(e) => handleClusterSelect(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              title="Select all contacts in cluster"
            />

            {/* Expand/Collapse Area */}
            <div className="flex items-center space-x-2 flex-1">
              <button
                onClick={handleToggleExpand}
                className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
                title="Expand/collapse cluster"
              >
                {cluster.isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5 text-slate-600" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-slate-600" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 
                    className="text-lg font-semibold text-slate-900 truncate cursor-pointer hover:text-blue-600"
                    onClick={handleToggleExpand}
                  >
                    {cluster.name}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    cluster.contacts.length > 1 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {cluster.contacts.length} row{cluster.contacts.length !== 1 ? 's' : ''}
                  </span>
                  {cluster.conflictCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                      {cluster.conflictCount} phone conflict{cluster.conflictCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mt-1">
                  {/* Phone Number Display/Editor */}
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="h-4 w-4 text-slate-500" />
                    {isEditingPhone ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="tel"
                          value={phoneValue}
                          onChange={handlePhoneChange}
                          onKeyDown={handleKeyPress}
                          className={clsx(
                            'px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
                            phoneError ? 'border-red-300 bg-red-50' : 'border-slate-300'
                          )}
                          placeholder="Enter phone number"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleSavePhone}
                          disabled={!!phoneError || !phoneValue.trim() || isUpdating}
                          loading={isUpdating}
                          icon={<CheckIcon className="h-3 w-3" />}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelPhoneEdit}
                          disabled={isUpdating}
                          icon={<XMarkIcon className="h-3 w-3" />}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-700">
                          {cluster.primaryPhone ? formatPhoneForDisplay(cluster.primaryPhone) : 'No phone'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartPhoneEdit();
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit phone number for all contacts in cluster"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Total Outstanding Amount */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-lg font-bold text-green-600">
                      <CurrencyRupeeIcon className="h-5 w-5" />
                      <span>₹{cluster.totalOutstanding.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-500 font-normal ml-1">(Total)</span>
                    </div>
                    
                    {/* Send to All Button - Only show for valid phone numbers */}
                    {cluster.primaryPhone && (() => {
                      const cleanPhone = cluster.primaryPhone.replace(/[\s\-\(\)\+]/g, '');
                      return /^\d{10,15}$/.test(cleanPhone);
                    })() && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={async () => {
                          const mode = getMessagingMode();
                          
                          if (mode === 'cloud') {
                            // Use template for Cloud API
                            try {
                              // Build transaction details for template
                              const transactionDetails = [];
                              
                              cluster.contacts.forEach((contact, index) => {
                                if (contact.originalData) {
                                  // Use Excel data
                                  const trans = contact.originalData['Trans#'] || contact.originalData['Invoice ID'] || `Entry ${index + 1}`;
                                  const amount = contact.originalData['Balance'] || contact.originalData['Outstanding'] || 0;
                                  const date = contact.originalData['Date'] || '';
                                  
                                  if (date) {
                                    transactionDetails.push(`${trans} (${date}): ₹${amount.toLocaleString('en-IN')}`);
                                  } else {
                                    transactionDetails.push(`${trans}: ₹${amount.toLocaleString('en-IN')}`);
                                  }
                                } else {
                                  const trans = contact.invoice_id || `Entry ${index + 1}`;
                                  const amount = contact.balance_pays || 0;
                                  transactionDetails.push(`${trans}: ₹${amount.toLocaleString('en-IN')}`);
                                }
                              });
                              
                              const detailsText = transactionDetails.join(' | ');
                              
                              const response = await fetch('/api/whatsapp/send-message', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  to: cluster.primaryPhone,
                                  templateName: 'payment_reminder',
                                  templateParams: {
                                    body_1: cluster.name,
                                    body_2: detailsText,
                                    body_3: 'sri balaji enterprises'
                                  }
                                })
                              });
                              
                              const result = await response.json();
                              
                              if (result.success) {
                                alert(`✅ Message sent via Cloud API!\nMessage ID: ${result.messageId}`);
                              } else {
                                alert(`❌ Failed: ${result.error}`);
                              }
                            } catch (error) {
                              alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                          } else {
                            // WhatsApp Web mode - use free-form message
                            let message = `Dear ${cluster.name},\n\n`;
                            message += `This is a friendly reminder regarding your payment.\n\n`;
                            
                            if (cluster.contacts.length === 1) {
                              // Single record - show all details
                              const contact = cluster.contacts[0];
                              message += `*Payment Details:*\n`;
                              
                              if (contact.originalData) {
                                // Show Excel data in a clean format
                                Object.entries(contact.originalData).forEach(([key, value]) => {
                                  if (key !== 'rowNumber' && value !== null && value !== undefined && value !== '') {
                                    if (typeof value === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('outstanding') || key.toLowerCase().includes('balance'))) {
                                      message += `${key}: ₹${value.toLocaleString('en-IN')}\n`;
                                    } else {
                                      message += `${key}: ${value}\n`;
                                    }
                                  }
                                });
                              } else {
                                // Fallback to standard fields
                                const amount = contact.balance_pays || 0;
                                if (contact.invoice_id) message += `Invoice: ${contact.invoice_id}\n`;
                                message += `Amount: ₹${amount.toLocaleString('en-IN')}\n`;
                              }
                            } else {
                              // Multiple records - show summary
                              message += `*Payment Summary for ${cluster.contacts.length} transactions:*\n\n`;
                              
                              cluster.contacts.forEach((contact, index) => {
                                const amount = contact.originalData?.Outstanding || contact.originalData?.outstanding || contact.balance_pays || 0;
                                const invoiceId = contact.invoice_id || contact.originalData?.invoice_id || contact.originalData?.['Invoice ID'] || `Entry ${index + 1}`;
                                message += `${index + 1}. ${invoiceId}: ₹${amount.toLocaleString('en-IN')}\n`;
                              });
                              
                              message += `\n*Total Outstanding: ₹${cluster.totalOutstanding.toLocaleString('en-IN')}*\n`;
                            }
                            
                            message += `\nPlease make the payment at your earliest convenience.\n\n`;
                            message += `Thank you!\nSri Balaji Enterprises Team`;
                            
                            await sendWhatsAppMessage({
                              to: cluster.primaryPhone,
                              message,
                              mode
                            });
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        title="Send WhatsApp message using template"
                      >
                        💬 Send
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Phone Error Message */}
                {phoneError && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {phoneError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Contact List */}
      {cluster.isExpanded && (
        <div className="divide-y divide-slate-200">
          {cluster.contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              isSelected={selectedContacts.has(contact.id)}
              onSelect={onSelectContact}
              showPhoneEditor={isEditingPhone}
              onEditContact={onEditContact}
              isShowingImportedData={isShowingImportedData}
            />
          ))}
        </div>
      )}

      {/* Cluster Summary (when collapsed) */}
      {!cluster.isExpanded && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-slate-600">
              <span className="font-medium">
                {cluster.contacts.length} record{cluster.contacts.length !== 1 ? 's' : ''} grouped
              </span>
              <span 
                className="flex items-center space-x-1 cursor-help" 
                title={`Individual amounts: ${cluster.contacts.map(c => {
                  const data = c.originalData || c;
                  const amountFields = ['outstanding', 'Outstanding', 'balance_pays', 'balance', 'Balance', 'amount', 'Amount', 'due', 'Due'];
                  let amount = 0;
                  for (const field of amountFields) {
                    if (data[field] !== null && data[field] !== undefined && typeof data[field] === 'number') {
                      amount = data[field];
                      break;
                    }
                  }
                  return `${c.name}: ₹${amount.toLocaleString('en-IN')}`;
                }).join(', ')}`}
              >
                <CurrencyRupeeIcon className="h-3 w-3" />
                <span>Total: ₹{cluster.totalOutstanding.toLocaleString('en-IN')}</span>
              </span>
              {cluster.conflictCount > 0 && (
                <span className="text-yellow-600 font-medium">
                  {cluster.conflictCount} phone conflict{cluster.conflictCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              onClick={handleToggleExpand}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Click to expand and view individual records →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusterCard;
