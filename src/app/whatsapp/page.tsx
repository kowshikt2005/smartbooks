'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  MagnifyingGlassIcon, 
  ChatBubbleLeftRightIcon, 
  PhoneIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../components/layout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import EnhancedExcelImport from '../../components/whatsapp/EnhancedExcelImport';
import type { MappingResult } from '../../lib/services/whatsappMapping';
import { CustomerService } from '../../lib/services/customers';
// Removed unused Customer import
import { useWhatsAppSession } from '../../hooks/useWhatsAppSession';
import { SessionDebugUtils } from '../../utils/sessionDebug';
import { ContactClusteringService, type ContactCluster } from '../../lib/services/contactClustering';
import { EnhancedPhonePropagationService } from '../../lib/services/enhancedPhonePropagation';
import ClusterCard from '../../components/whatsapp/ClusterCard';
import PhoneNumberManager from '../../components/whatsapp/PhoneNumberManager';
import { sendWhatsAppMessage, getMessagingMode } from '../../utils/whatsappSender';

interface WhatsAppCustomer {
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
  originalData?: Record<string, unknown>; // For imported Excel data - contains all dynamic columns
  [key: string]: unknown; // Allow dynamic properties for imported data
}

const WhatsAppPage: React.FC = () => {
  const router = useRouter();
  
  // Use the session hook for persistent data
  const {
    customers: contacts,
    originalCustomers: originalContacts,
    importedContacts,
    isShowingImportedData,
    sessionLoaded,
    handleEnhancedImportComplete,
    showDatabaseData,
    updateOriginalCustomers: updateOriginalContacts,
    clearSession,
    hasImportedData,
    getSessionInfo
  } = useWhatsAppSession();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showOnlyOutstanding, setShowOnlyOutstanding] = useState(false);
  
  // Clustering state
  const [useClusterView, setUseClusterView] = useState(false);
  const [clusters, setClusters] = useState<ContactCluster[]>([]);
  const [clusterStateLoaded, setClusterStateLoaded] = useState(false);

  const [showEnhancedImport, setShowEnhancedImport] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string; phone_no: string}>({name: '', phone_no: ''});
  
  // Messaging mode state
  const [messagingMode, setMessagingMode] = useState<'web' | 'cloud'>('cloud'); // Default to Cloud API
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Load messaging mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('whatsapp_messaging_mode');
      if (stored === 'web' || stored === 'cloud') {
        setMessagingMode(stored);
      }
    }
  }, []);
  
  // Save messaging mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatsapp_messaging_mode', messagingMode);
    }
  }, [messagingMode]);
  
  // Phone number management state
  const [showPhoneManager, setShowPhoneManager] = useState(false);

  // Handle phone number added through phone manager
  const handlePhoneAdded = useCallback((contactName: string, phoneNumber: string) => {
    // Update the session data and trigger re-render without page reload
    try {
      // Clear cluster state to force recalculation
      localStorage.removeItem('whatsapp_cluster_state');
      setClusterStateLoaded(false);
      setClusters([]);
      
      // Force re-render by updating a state that triggers useEffect
      setShowPhoneManager(false);
      
      // Show success message
      console.log(`Phone number ${phoneNumber} added for ${contactName}`);
      
      // Re-open phone manager after a brief delay to show updated data
      setTimeout(() => {
        setShowPhoneManager(true);
      }, 100);
    } catch (error) {
      console.error('Error handling phone number addition:', error);
    }
  }, []);

  // Handle edit customer
  const handleEditCustomer = useCallback((customer: WhatsAppCustomer) => {
    setEditingCustomer(customer.id);
    setEditForm({
      name: customer.name,
      phone_no: customer.phone_no
    });
  }, []);

  // Handle contact edit (for cluster cards) - Enhanced with phone propagation service
  const handleEditContact = useCallback(async (contactId: string, updates: { name?: string; phone_no?: string }) => {
    if (!isShowingImportedData) {
      throw new Error('Editing is only available for imported data');
    }

    try {
      const sessionData = JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}');
      
      // Find the contact being edited to get its current name
      const contactToEdit = sessionData.customers.find((c: WhatsAppCustomer) => c.id === contactId);
      if (!contactToEdit) {
        throw new Error('Contact not found');
      }

      // If phone number is being updated, use enhanced phone propagation service
      if (updates.phone_no && updates.phone_no.trim() !== contactToEdit.phone_no?.trim()) {
        const result = EnhancedPhonePropagationService.propagatePhoneInSession(
          contactToEdit.name,
          updates.phone_no,
          sessionData
        );
        
        if (!result.success) {
          throw new Error(result.message);
        }
        
        // Save updated session data
        localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
        
        // Show success notification
        if (result.affectedRecords > 1) {
          alert(`✅ ${result.message}\n\nAll records with this name now have the same phone number.`);
        }
      } else if (updates.name && updates.name.trim() !== contactToEdit.name.trim()) {
        // If name is being updated, only update the specific contact
        sessionData.customers = sessionData.customers.map((customer: WhatsAppCustomer) => 
          customer.id === contactId 
            ? { ...customer, name: updates.name?.trim() || customer.name }
            : customer
        );
        
        sessionData.lastImportTimestamp = Date.now();
        localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
      } else {
        // Regular update for single contact (other fields)
        sessionData.customers = sessionData.customers.map((customer: WhatsAppCustomer) => 
          customer.id === contactId 
            ? { ...customer, ...updates }
            : customer
        );
        
        sessionData.lastImportTimestamp = Date.now();
        localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
      }
      
      // Clear cluster state to force recalculation
      localStorage.removeItem('whatsapp_cluster_state');
      
      // Force a page reload to reflect changes in clustering
      window.location.reload();
      
    } catch (error) {
      console.error('Error updating session data:', error);
      throw new Error('Failed to save changes. Please try again.');
    }
  }, [isShowingImportedData]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (!editingCustomer) return;
    
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
    
    // Use the new handleEditContact function
    handleEditContact(editingCustomer, {
      name: editForm.name.trim(),
      phone_no: editForm.phone_no.trim()
    }).then(() => {
      setEditingCustomer(null);
      setEditForm({name: '', phone_no: ''});
    }).catch((error) => {
      alert(error.message);
    });
  }, [editingCustomer, editForm.name, editForm.phone_no, handleEditContact]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingCustomer(null);
    setEditForm({name: '', phone_no: ''});
  }, []);

  // Cluster state persistence functions (moved up to avoid initialization issues)
  const saveClusterState = useCallback((clustersToSave: ContactCluster[]) => {
    try {
      const clusterState = {
        useClusterView,
        clusterStates: clustersToSave.map(cluster => ({
          id: cluster.id,
          name: cluster.name,
          isExpanded: cluster.isExpanded,
          primaryPhone: cluster.primaryPhone,
          lastUpdated: cluster.lastUpdated.toISOString()
        })),
        timestamp: Date.now()
      };
      
      localStorage.setItem('whatsapp_cluster_state', JSON.stringify(clusterState));
    } catch (error) {
      console.error('Failed to save cluster state:', error);
    }
  }, [useClusterView]);

  const loadClusterState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('whatsapp_cluster_state');
      if (!savedState) return null;
      
      const clusterState = JSON.parse(savedState);
      
      // Check if state is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - clusterState.timestamp > maxAge) {
        localStorage.removeItem('whatsapp_cluster_state');
        return null;
      }
      
      return clusterState;
    } catch (error) {
      console.error('Failed to load cluster state:', error);
      localStorage.removeItem('whatsapp_cluster_state');
      return null;
    }
  }, []);

  const applyClusterState = useCallback((clustersToUpdate: ContactCluster[], savedState: any) => {
    if (!savedState || !savedState.clusterStates) return clustersToUpdate;
    
    const stateMap = new Map(
      savedState.clusterStates.map((state: any) => [state.name.toLowerCase(), state])
    );
    
    return clustersToUpdate.map(cluster => {
      const savedClusterState = stateMap.get(cluster.name.toLowerCase());
      if (savedClusterState) {
        return {
          ...cluster,
          isExpanded: savedClusterState.isExpanded,
          primaryPhone: savedClusterState.primaryPhone || cluster.primaryPhone,
          lastUpdated: new Date(savedClusterState.lastUpdated)
        };
      }
      return cluster;
    });
  }, []);

  // Clustering handlers
  const handleToggleClusterView = useCallback(() => {
    setUseClusterView(prev => {
      const newValue = !prev;
      // Save the new cluster view preference
      setTimeout(() => {
        if (newValue && clusters.length > 0) {
          saveClusterState(clusters);
        }
      }, 100);
      return newValue;
    });
  }, [clusters, saveClusterState]);

  const handleClusterPhoneUpdate = useCallback(async (clusterId: string, newPhone: string) => {
    try {
      // Validate phone number first
      const cleanPhone = newPhone.replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone && !/^\d{10,15}$/.test(cleanPhone)) {
        throw new Error('Please enter a valid phone number (10-15 digits)');
      }

      const phoneUpdate = await ContactClusteringService.updateClusterPhone(clusterId, newPhone, clusters);
      if (phoneUpdate) {
        // Update clusters state
        const updatedClusters = [...clusters];
        setClusters(updatedClusters);
        
        // Save cluster state with phone number changes
        saveClusterState(updatedClusters);
        
        // If showing imported data, update session storage for ALL records with same name
        if (isShowingImportedData) {
          const sessionData = JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}');
          
          // Find the cluster to get the contact name
          const cluster = clusters.find(c => c.id === clusterId);
          if (cluster) {
            const contactName = cluster.name.trim();
            
            // Update ALL contacts with the same name (not just cluster contacts)
            let totalUpdated = 0;
            sessionData.customers = sessionData.customers.map((customer: WhatsAppCustomer) => {
              if (customer.name.trim() === contactName) {
                totalUpdated++;
                return { ...customer, phone_no: newPhone.trim() };
              }
              return customer;
            });
            
            console.log(`Phone number propagated to ${totalUpdated} records with name "${contactName}"`);
            
            // Show user notification
            if (totalUpdated > 1) {
              alert(`✅ Phone number updated for ALL ${totalUpdated} records with the name "${contactName}"\n\nAll records with this name now have the same phone number.`);
            }
          }
          
          sessionData.lastImportTimestamp = Date.now();
          localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
          
          // Clear cluster state to force recalculation
          localStorage.removeItem('whatsapp_cluster_state');
          
          // Force reload to ensure all data is consistent
          window.location.reload();
        }
        
        console.log(`Updated phone number for cluster ${clusterId}: ${phoneUpdate.affectedContactIds.length} contacts affected`);
      }
    } catch (error) {
      console.error('Failed to update cluster phone:', error);
      throw error; // Re-throw to let ClusterCard handle the error display
    }
  }, [clusters, isShowingImportedData, saveClusterState]);

  const handleToggleClusterExpansion = useCallback((clusterId: string) => {
    ContactClusteringService.toggleClusterExpansion(clusterId, clusters);
    const updatedClusters = [...clusters];
    setClusters(updatedClusters);
    
    // Save cluster state with expansion changes
    saveClusterState(updatedClusters);
  }, [clusters, saveClusterState]);

  const handleClusterSelection = useCallback((clusterId: string, selected: boolean) => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) return;

    const newSelected = new Set(selectedContacts);
    
    cluster.contacts.forEach(contact => {
      if (contact.phone_no) { // Only select contacts with phone numbers
        if (selected) {
          newSelected.add(contact.id);
        } else {
          newSelected.delete(contact.id);
        }
      }
    });
    
    setSelectedContacts(newSelected);
    
    // Update select all state
    setSelectAll(newSelected.size === contacts.length && contacts.length > 0);
  }, [clusters, selectedContacts, contacts.length]);



  // Show session restoration notification
  useEffect(() => {
    if (sessionLoaded) {
      const sessionInfo = getSessionInfo();
      if (hasImportedData && sessionInfo) {
        console.log(`WhatsApp session restored: ${sessionInfo.recordCount} records from ${sessionInfo.importType} import (${sessionInfo.timeText})`);
      } else {
        console.log('No WhatsApp session data to restore');
      }
      
      // Log session data for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        SessionDebugUtils.logSessionData();
      }
    }
  }, [sessionLoaded, hasImportedData, getSessionInfo]);

  // Column helper for type safety
  const columnHelper = createColumnHelper<WhatsAppCustomer>();

  // Handle selection of individual customers
  const handleSelectCustomer = useCallback((customerId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedContacts(newSelected);
    
    // Update select all state
    setSelectAll(newSelected.size === contacts.length && contacts.length > 0);
  }, [selectedContacts, contacts.length]);

  // Helper function to get balance amount from any record
  const getBalanceAmount = useCallback((customer: WhatsAppCustomer): number => {
    // Check originalData first (Excel import data)
    if (customer.originalData) {
      // Try common balance field names (case-insensitive)
      const balanceFields = ['Outstanding', 'outstanding', 'Balance', 'balance', 'balance_pays', 'Balance Pays', 'Amount', 'amount', 'Due', 'due'];
      for (const field of balanceFields) {
        const value = customer.originalData[field];
        if (typeof value === 'number' && value !== 0) {
          return value;
        }
      }
    }
    
    // Fallback to customer properties
    if (typeof customer.balance_pays === 'number') return customer.balance_pays;
    
    return 0;
  }, []);

  // Build message for bulk send
  const buildBulkMessage = useCallback((customersGroup: WhatsAppCustomer[]) => {
    if (customersGroup.length === 1) {
      const customer = customersGroup[0];
      const balance = getBalanceAmount(customer);
      
      let message = `Dear ${customer.name},\n\nPayment Reminder:\n`;
      
      if (customer.originalData) {
        Object.entries(customer.originalData).forEach(([key, value]) => {
          if (key !== 'rowNumber' && value !== null && value !== undefined && value !== '') {
            if (typeof value === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('outstanding') || key.toLowerCase().includes('balance'))) {
              message += `${key}: ₹${value.toLocaleString('en-IN')}\n`;
            } else {
              message += `${key}: ${value}\n`;
            }
          }
        });
      }
      
      message += `\nThank you!\nSri Balaji Enterprises Team`;
      return message;
    } else {
      // Calculate total by summing balance from all records
      const totalOutstanding = customersGroup.reduce((sum, customer) => {
        return sum + getBalanceAmount(customer);
      }, 0);
      
      let message = `Dear Customer,\n\nPayment reminder for ${customersGroup.length} entries:\n\n`;
      customersGroup.forEach((customer, index) => {
        const amount = getBalanceAmount(customer);
        message += `${index + 1}. ${customer.name}: ₹${amount.toLocaleString('en-IN')}\n`;
      });
      message += `\nTotal: ₹${totalOutstanding.toLocaleString('en-IN')}\n\nThank you!\nSri Balaji Enterprises Team`;
      return message;
    }
  }, [getBalanceAmount]);

  // Handle select all functionality
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allCustomerIds = contacts
        .filter(customer => {
          if (!customer.phone_no || customer.phone_no.trim() === '') return false;
          const cleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
          return /^\d{10,15}$/.test(cleanPhone); // Only select customers with valid phone numbers
        })
        .map(customer => customer.id);
      setSelectedContacts(new Set(allCustomerIds));
    } else {
      setSelectedContacts(new Set());
    }
    setSelectAll(checked);
  }, [contacts]);

  // Handle bulk WhatsApp messages (works with both cluster and list views)
  const handleBulkSendMessages = async () => {
    const selectedCustomerData = contacts.filter(customer => 
      selectedContacts.has(customer.id)
    );

    if (selectedCustomerData.length === 0) {
      alert('Please select at least one customer to send messages to.');
      return;
    }

    // Check if all selected customers have valid phone numbers
    const customersWithoutPhone = selectedCustomerData.filter(customer => {
      if (!customer.phone_no || customer.phone_no.trim() === '') return true;
      const cleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
      return !/^\d{10,15}$/.test(cleanPhone);
    });
    
    if (customersWithoutPhone.length > 0) {
      const customerNames = customersWithoutPhone.map(c => c.name).slice(0, 5).join(', ');
      const moreCount = customersWithoutPhone.length > 5 ? ` and ${customersWithoutPhone.length - 5} more` : '';
      
      alert(
        `🚫 Cannot send WhatsApp messages!\n\n` +
        `❌ ${customersWithoutPhone.length} selected customer(s) don't have phone numbers:\n` +
        `${customerNames}${moreCount}\n\n` +
        `💡 Solution:\n` +
        `1. Click "Manage Phone Numbers" to add missing phone numbers\n` +
        `2. Or deselect customers without phone numbers\n\n` +
        `📊 Current Selection:\n` +
        `✅ ${selectedCustomerData.length - customersWithoutPhone.length} ready for messaging\n` +
        `❌ ${customersWithoutPhone.length} missing phone numbers`
      );
      return;
    }

    // Group customers by phone number to handle duplicates
    const customersByPhone = new Map<string, WhatsAppCustomer[]>();
    selectedCustomerData.forEach(customer => {
      const cleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
      if (!customersByPhone.has(cleanPhone)) {
        customersByPhone.set(cleanPhone, []);
      }
      customersByPhone.get(cleanPhone)!.push(customer);
    });

    // Calculate total outstanding
    const totalOutstanding = selectedCustomerData.reduce((sum, customer) => {
      const amountFields = ['balance_pays', 'outstanding', 'balance', 'amount', 'due'];
      let amount = 0;
      
      for (const field of amountFields) {
        if (customer.originalData?.[field] && typeof customer.originalData[field] === 'number') {
          amount = customer.originalData[field];
          break;
        } else if (customer[field as keyof WhatsAppCustomer] && typeof customer[field as keyof WhatsAppCustomer] === 'number') {
          amount = customer[field as keyof WhatsAppCustomer] as number;
          break;
        }
      }
      
      return sum + amount;
    }, 0);

    const uniquePhoneNumbers = customersByPhone.size;
    const modeText = messagingMode === 'cloud' ? 'WhatsApp Cloud API' : 'WhatsApp Web';

    let confirmMessage = `Send messages via ${modeText} to ${selectedCustomerData.length} customers?\n\n` +
      `💰 Total outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}\n` +
      `📞 Unique phone numbers: ${uniquePhoneNumbers}\n` +
      `👥 Selected customers: ${selectedCustomerData.length}\n`;

    if (messagingMode === 'cloud') {
      confirmMessage += `\n☁️ Cloud API Mode:\n` +
        `• Messages will be sent automatically\n` +
        `• You'll see success/error notifications\n` +
        `• Rate limited to ~60 messages/second\n`;
    } else {
      confirmMessage += `\n🌐 Web Mode:\n` +
        `• Will open ${uniquePhoneNumbers} WhatsApp tabs\n` +
        `• You'll need to send each message manually\n`;
    }

    const confirmed = confirm(confirmMessage);
    if (!confirmed) return;

    setSendingMessage(true);

    if (messagingMode === 'cloud') {
      // Cloud API mode - send via API
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const [phone, customersGroup] of customersByPhone) {
        const message = buildBulkMessage(customersGroup);
        
        try {
          // Use Web mode for bulk sends to preserve message formatting
          // Cloud API requires templates which don't support dynamic multi-line messages
          await sendWhatsAppMessage({
            to: phone,
            message: message,
            mode: 'web', // Force web mode for proper formatting
            onSuccess: () => {
              successCount++;
            },
            onError: (error) => {
              failCount++;
              errors.push(`${customersGroup[0].name}: ${error}`);
            }
          });

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failCount++;
          errors.push(`${customersGroup[0].name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setSendingMessage(false);
      
      let resultMessage = `✅ Bulk send complete!\n\n` +
        `📊 Results:\n` +
        `✅ Sent: ${successCount}\n` +
        `❌ Failed: ${failCount}\n`;

      if (errors.length > 0) {
        resultMessage += `\n❌ Errors:\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) {
          resultMessage += `\n... and ${errors.length - 5} more`;
        }
      }

      alert(resultMessage);
      
      // Clear selection
      setSelectedContacts(new Set());
      setSelectAll(false);
    } else {
      // Web mode - open WhatsApp Web tabs
      let processedCount = 0;
      for (const [, customersGroup] of customersByPhone) {
        processedCount++;
        handleBulkSendToSameNumber(customersGroup);
        
        if (processedCount < uniquePhoneNumbers) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      setSendingMessage(false);
      setSelectedContacts(new Set());
      setSelectAll(false);
    }

    // Reset button text and clear selection
    setTimeout(() => {
      const button = document.querySelector('[data-bulk-send-button]') as HTMLButtonElement;
      if (button) {
        button.textContent = originalButtonText;
      }
      setSelectedContacts(new Set());
      setSelectAll(false);
    }, 1000);
  };

  // Handle sending messages to multiple customers with the same phone number
  const handleBulkSendToSameNumber = (customersGroup: WhatsAppCustomer[]) => {
    if (customersGroup.length === 0) return;

    const firstCustomer = customersGroup[0];
    
    if (!firstCustomer.phone_no) {
      console.error('No phone number for customer group');
      return;
    }

    let combinedMessage = '';

    if (customersGroup.length === 1) {
      // Single customer - use detailed message with dynamic fields
      const customer = customersGroup[0];
      const data = customer.originalData || customer;
      
      // Get outstanding amount from various possible fields
      const outstandingAmount = data.outstanding || data.balance_pays || data.balance || data.amount || data.due || 0;
      const paidAmount = data.paid_amount || data.paid || 0;
      const totalAmount = data.total_amount || data.total || data.adjusted_amount || 0;
      
      combinedMessage = `Dear ${customer.name},

Hope you are doing well! 

This is a friendly reminder regarding your payment:

📋 *Details:*`;

      // Add available fields dynamically
      if (data.invoice_id) combinedMessage += `\n• Invoice ID: ${data.invoice_id}`;
      if (data.invoice_num) combinedMessage += `\n• Invoice Number: ${data.invoice_num}`;
      if (data.grn_no) combinedMessage += `\n• GRN Number: ${data.grn_no}`;
      if (data.grn_date) combinedMessage += `\n• GRN Date: ${new Date(data.grn_date).toLocaleDateString('en-IN')}`;
      if (data.location) combinedMessage += `\n• Location: ${data.location}`;
      if (data.month_year) combinedMessage += `\n• Period: ${data.month_year}`;

      combinedMessage += `\n\n💰 *Payment Summary:*`;
      if (totalAmount > 0) combinedMessage += `\n• Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`;
      if (paidAmount > 0) combinedMessage += `\n• Amount Paid: ₹${paidAmount.toLocaleString('en-IN')}`;
      if (data.tds) combinedMessage += `\n• TDS Deducted: ₹${data.tds.toLocaleString('en-IN')}`;
      if (data.branding_adjustment) combinedMessage += `\n• Branding Adjustment: ₹${data.branding_adjustment.toLocaleString('en-IN')}`;
      combinedMessage += `\n• *Outstanding Balance: ₹${outstandingAmount.toLocaleString('en-IN')}*`;

      combinedMessage += `\n\nWe would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
Sri Balaji Enterprises Team`;
    } else {
      // Multiple customers with same phone - combine messages with dynamic fields
      const totalOutstanding = customersGroup.reduce((sum, customer) => {
        const data = customer.originalData || customer;
        return sum + (data.outstanding || data.balance_pays || data.balance || data.amount || data.due || 0);
      }, 0);
      
      const totalPaid = customersGroup.reduce((sum, customer) => {
        const data = customer.originalData || customer;
        return sum + (data.paid_amount || data.paid || 0);
      }, 0);
      
      const totalAmount = customersGroup.reduce((sum, customer) => {
        const data = customer.originalData || customer;
        return sum + (data.total_amount || data.total || data.adjusted_amount || 0);
      }, 0);
      
      combinedMessage = `Dear Customer,

Hope you are doing well! 

This is a friendly reminder regarding outstanding amounts for multiple records:

📋 *Details:*
`;

      // Add each customer's details dynamically
      customersGroup.forEach((customer, index) => {
        const data = customer.originalData || customer;
        const customerOutstanding = data.outstanding || data.balance_pays || data.balance || data.amount || data.due || 0;
        
        combinedMessage += `
${index + 1}. *${customer.name}*`;
        if (data.invoice_id) combinedMessage += `\n   • Invoice: ${data.invoice_id}`;
        if (data.invoice_num) combinedMessage += ` (${data.invoice_num})`;
        if (data.grn_no) combinedMessage += `\n   • GRN: ${data.grn_no}`;
        if (data.location) combinedMessage += `\n   • Location: ${data.location}`;
        combinedMessage += `\n   • Outstanding: ₹${customerOutstanding.toLocaleString('en-IN')}
`;
      });

      combinedMessage += `
💰 *Combined Payment Summary:*`;
      if (totalAmount > 0) combinedMessage += `\n• Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`;
      if (totalPaid > 0) combinedMessage += `\n• Total Amount Paid: ₹${totalPaid.toLocaleString('en-IN')}`;
      combinedMessage += `\n• *Total Outstanding Balance: ₹${totalOutstanding.toLocaleString('en-IN')}*

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
Sri Balaji Enterprises Team`;
    }

    // Clean and format the phone number
    let cleanPhone = firstCustomer.phone_no.replace(/[\s\-\(\)\+]/g, '');
    
    // Handle different phone number formats
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '91' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone;
    }
    
    // Validate phone number length
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      console.error(`Invalid phone number for customer group: ${firstCustomer.phone_no}`);
      return;
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(combinedMessage);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, '_blank');
  };

  // Handle Enhanced Excel import completion
  const handleEnhancedImportCompleteLocal = (mappingResults: MappingResult[], importedData?: unknown[]) => {
    setShowEnhancedImport(false);
    
    // Use the session hook to handle the import
    handleEnhancedImportComplete(mappingResults, contacts);
    
    // Store imported data for "Send to Imported" functionality
    if (importedData) {
      // Update session to include imported contacts
      const sessionData = JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}');
      sessionData.importedContacts = importedData;
      localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
    }
    
    // Clear cluster state to force recalculation with new data
    localStorage.removeItem('whatsapp_cluster_state');
    setClusterStateLoaded(false);
    setClusters([]);
    
    // Show success message with mapping statistics
    const stats = mappingResults.reduce((acc, result) => {
      if (result.confidence === 'exact') acc.exact++;
      else if (result.confidence === 'fuzzy') acc.fuzzy++;
      else acc.new++;
      return acc;
    }, { exact: 0, fuzzy: 0, new: 0 });
    
    alert(`Successfully imported and mapped ${mappingResults.length} records!\n\n` +
          `• ${stats.exact} exact customer matches\n` +
          `• ${stats.fuzzy} fuzzy matches (resolved)\n` +
          `• ${stats.new} new records\n\n` +
          `Customer data was prioritized where conflicts existed.\n\n` +
          `Clustering will be recalculated with the new data.`);
  };

  // Handle Excel import completion (legacy) - currently unused
  // const handleImportComplete = (importedData: unknown[]) => {
  //   // Use the session hook to handle the import
  //   handleLegacyImportComplete(importedData, customers);
  //   
  //   // Show success message
  //   alert(`Successfully imported ${importedData.length} records from Excel file! The table now shows your imported data.`);
  // };

  // Handle switching back to database data
  const handleShowDatabaseData = () => {
    showDatabaseData();
  };

  // Handle sending messages to imported contacts
  const handleSendToImported = () => {
    if (importedContacts.length === 0) {
      alert('No imported contacts available');
      return;
    }

    // Find contacts with phone numbers (check various possible phone field names)
    const contactsWithPhone = importedContacts.filter(contact => {
      const phoneFields = ['phone', 'Phone', 'phoneno', 'PhoneNo', 'mobile', 'Mobile', 'contact', 'Contact'];
      return phoneFields.some(field => contact[field]);
    });
    
    if (contactsWithPhone.length === 0) {
      alert('No imported contacts have phone numbers');
      return;
    }

    // Calculate total outstanding from various amount fields
    const totalOutstanding = contactsWithPhone.reduce((sum, contact) => {
      const amountFields = ['outstanding', 'Outstanding', 'balance', 'Balance', 'amount', 'Amount', 'due', 'Due'];
      const amount = amountFields.find(field => contact[field] && typeof contact[field] === 'number');
      return sum + (amount ? contact[amount] : 0);
    }, 0);

    const confirmed = confirm(
      `Send WhatsApp messages to ${contactsWithPhone.length} imported contacts?\n\n` +
      `Total outstanding amount: ₹${totalOutstanding.toLocaleString('en-IN')}\n` +
      `This will open ${contactsWithPhone.length} WhatsApp tabs/windows.`
    );

    if (!confirmed) return;

    // Send messages to imported contacts
    contactsWithPhone.forEach((contact, index) => {
      setTimeout(() => {
        // Get name from various possible name fields
        const nameFields = ['name', 'Name', 'customer name', 'Customer Name', 'client name', 'Client Name', 'party name', 'Party Name'];
        const customerName = nameFields.find(field => contact[field]) ? contact[nameFields.find(field => contact[field])!] : 'Customer';

        // Get phone from various possible phone fields
        const phoneFields = ['phone', 'Phone', 'phoneno', 'PhoneNo', 'mobile', 'Mobile', 'contact', 'Contact'];
        const phoneField = phoneFields.find(field => contact[field]);
        const phoneNumber = phoneField ? contact[phoneField] : '';

        // Outstanding amount is handled dynamically in the message loop below

        // Create dynamic message with all available data
        let message = `Dear ${customerName},

Hope you are doing well! 

This is a friendly reminder regarding your account:

`;

        // Add all relevant data from the Excel
        Object.keys(contact).forEach(key => {
          if (key !== 'rowNumber' && key !== 'errors' && contact[key] !== null && contact[key] !== undefined) {
            const value = typeof contact[key] === 'number' && key.toLowerCase().includes('amount') 
              ? `₹${contact[key].toLocaleString('en-IN')}`
              : contact[key];
            message += `• ${key}: ${value}\n`;
          }
        });

        message += `
We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
Sri Balaji Enterprises Team`;
        
        // Clean phone number
        let cleanPhone = phoneNumber.toString().replace(/[\s\-\(\)\+]/g, '');
        
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '91' + cleanPhone.substring(1);
        } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
          cleanPhone = '91' + cleanPhone;
        }
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
      }, index * 800); // Stagger the opening of tabs
    });

    // Clear imported contacts after sending
    setTimeout(() => {
      // Note: importedContacts are managed by the session hook
      // They will be cleared when switching back to database data
    }, contactsWithPhone.length * 800 + 1000);
  };

  // Handle WhatsApp message action (with optional confirmation for single messages)
  const handleSendMessage = useCallback(async (customer: WhatsAppCustomer, skipConfirmation = false) => {
    if (!customer.phone_no) {
      alert('This customer does not have a phone number');
      return;
    }
    
    let message;
    
    if (isShowingImportedData && customer.originalData) {
      // Create message with all imported data
      message = `Dear ${customer.name},

Hope you are doing well! 

This is a friendly reminder regarding your account:

`;
      // Add all relevant data from the Excel
      Object.keys(customer.originalData).forEach(key => {
        if (key !== 'rowNumber' && key !== 'errors' && customer.originalData[key] !== null && customer.originalData[key] !== undefined) {
          const value = typeof customer.originalData[key] === 'number' && key.toLowerCase().includes('amount') 
            ? `₹${customer.originalData[key].toLocaleString('en-IN')}`
            : customer.originalData[key];
          message += `• ${key}: ${value}\n`;
        }
      });

      message += `
We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
Sri Balaji Enterprises Team`;
    } else {
      // Create the standard database message
      message = `Dear ${customer.name},

Hope you are doing well! 

This is a friendly reminder regarding your invoice payment:

📋 *Invoice Details:*
• Invoice ID: ${customer.invoice_id}
• Invoice Number: ${customer.invoice_num}
• GRN Number: ${customer.grn_no}
${customer.grn_date ? `• GRN Date: ${new Date(customer.grn_date).toLocaleDateString('en-IN')}` : ''}
${customer.location ? `• Location: ${customer.location}` : ''}
${customer.month_year ? `• Period: ${customer.month_year}` : ''}

💰 *Payment Summary:*
• Total Adjusted Amount: ₹${customer.adjusted_amount.toLocaleString('en-IN')}
• Amount Paid: ₹${customer.paid_amount.toLocaleString('en-IN')}
• TDS Deducted: ₹${customer.tds.toLocaleString('en-IN')}
• Branding Adjustment: ₹${customer.branding_adjustment.toLocaleString('en-IN')}
• *Outstanding Balance: ₹${customer.balance_pays.toLocaleString('en-IN')}*

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
Sri Balaji Enterprises Team`;
    }
    
    // Show confirmation dialog only for single messages (not bulk)
    if (!skipConfirmation) {
      const modeText = messagingMode === 'cloud' ? 'WhatsApp Cloud API' : 'WhatsApp Web';
      const confirmed = confirm(
        `Send message via ${modeText} to ${customer.name} (${customer.phone_no})?\n\nMessage preview:\n"${message.substring(0, 200)}..."`
      );
      
      if (!confirmed) return;
    }
    
    // Clean and format the phone number
    let cleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
    
    // Handle different phone number formats
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '91' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone;
    }
    
    // Validate phone number length
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      alert(`Invalid phone number for ${customer.name}: ${customer.phone_no}`);
      return;
    }
    
    // Send via Cloud API or WhatsApp Web
    if (messagingMode === 'cloud') {
      try {
        setSendingMessage(true);
        
        // Get amount from customer data
        const amount = customer.originalData?.Outstanding || customer.originalData?.outstanding || 
                      customer.originalData?.Total || customer.originalData?.total ||
                      customer.originalData?.Balance || customer.originalData?.balance ||
                      customer.balance_pays || 0;
        
        // Get invoice ID
        const invoiceId = customer.invoice_id || customer.originalData?.invoice_id || 
                         customer.originalData?.['Invoice ID'] || 'N/A';
        
        // Use template for Cloud API
        const response = await fetch('/api/whatsapp/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanPhone,
            templateName: 'payment_reminder',
            templateParams: {
              body_1: customer.name, // Customer name
              body_2: amount.toString(), // Amount
              body_3: invoiceId // Invoice
            }
          })
        });

        const result = await response.json();

        if (result.success) {
          alert(`✅ Message sent successfully via WhatsApp Cloud API!\n\nMessage ID: ${result.messageId}\nTo: ${result.to}`);
        } else {
          alert(`❌ Failed to send message: ${result.error}\n\nPlease try again or switch to WhatsApp Web mode.`);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        alert('❌ Error sending message. Please check your internet connection and try again.');
      } finally {
        setSendingMessage(false);
      }
    } else {
      // WhatsApp Web mode - open in browser
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
  }, [isShowingImportedData, messagingMode]);

  // Get all unique columns from the current data - PURE Excel columns only
  const allColumns = useMemo(() => {
    if (typeof window === 'undefined') return []; // Prevent SSR issues
    if (contacts.length === 0) return [];
    
    // Check if we have imported data
    const hasImportedData = contacts.some(customer => customer.originalData);
    
    if (hasImportedData) {
      // For imported data, get ONLY the Excel columns from the first customer
      const firstCustomerWithData = contacts.find(customer => customer.originalData);
      if (firstCustomerWithData?.originalData) {
        return Object.keys(firstCustomerWithData.originalData).filter(key => key !== 'rowNumber');
      }
    } else {
      // For database customers, use standard fields
      return ['name', 'phone_no', 'invoice_id', 'paid_amount', 'balance_pays', 'location'];
    }
    
    return [];
  }, [contacts]);

  // Define table columns dynamically
  const columns = useMemo(
    () => {
      const dynamicColumns = [
        // Selection column
        columnHelper.display({
          id: 'select',
          header: () => (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          ),
          cell: ({ row }) => (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedContacts.has(row.original.id)}
                onChange={(e) => handleSelectCustomer(row.original.id, e.target.checked)}
                disabled={!row.original.phone_no}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                title={!row.original.phone_no ? 'No phone number - WhatsApp messaging not available' : ''}
              />
            </div>
          ),
        }),
      ];

      // Add dynamic columns based on available data - use ONLY Excel column names
      allColumns.forEach(columnKey => {
        dynamicColumns.push(
          columnHelper.accessor(columnKey as keyof WhatsAppCustomer, {
            header: columnKey, // Use exact Excel column name
            cell: (info) => {
              const value = info.row.original.originalData?.[columnKey] ?? info.row.original[columnKey as keyof WhatsAppCustomer];
              
              if (value === null || value === undefined || value === '') {
                return <span className="text-gray-400">-</span>;
              }
              
              // Special handling for name field (editing capability)
              if (columnKey.toLowerCase().includes('name') && columnKey === 'name') {
                const isEditing = editingCustomer === info.row.original.id;
                return isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    autoFocus
                  />
                ) : (
                  <div className="font-medium text-gray-900">
                    {value.toString()}
                  </div>
                );
              }
              
              // Special handling for phone field (editing capability)
              if (columnKey.toLowerCase().includes('phone') && columnKey === 'phone_no') {
                const isEditing = editingCustomer === info.row.original.id;
                const phoneNumber = value?.toString();
                
                // Check if this phone number is shared by multiple customers
                const customersWithSamePhone = phoneNumber 
                  ? contacts.filter(c => c.phone_no === phoneNumber).length 
                  : 0;
                
                return isEditing ? (
                  <input
                    type="text"
                    value={editForm.phone_no}
                    onChange={(e) => setEditForm({...editForm, phone_no: e.target.value})}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div className="flex items-center text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <div className="flex flex-col">
                      <span className={!phoneNumber ? 'text-red-500 italic' : ''}>
                        {phoneNumber || 'No phone number'}
                      </span>
                      {customersWithSamePhone > 1 && (
                        <span className="text-xs text-orange-600 font-medium">
                          🔗 Shared by {customersWithSamePhone} customers
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              
              // Format currency fields
              if (typeof value === 'number' && (
                columnKey.toLowerCase().includes('amount') ||
                columnKey.toLowerCase().includes('balance') ||
                columnKey.toLowerCase().includes('outstanding') ||
                columnKey.toLowerCase().includes('paid') ||
                columnKey.toLowerCase().includes('total') ||
                columnKey.toLowerCase().includes('due')
              )) {
                const isNegative = value < 0;
                const colorClass = isNegative ? 'text-red-600' : 
                                 columnKey.toLowerCase().includes('paid') ? 'text-green-600' : 'text-gray-900';
                
                return (
                  <div className={`flex items-center font-medium ${colorClass}`}>
                    <CurrencyRupeeIcon className="h-4 w-4 mr-1" />
                    {Math.abs(value).toLocaleString('en-IN')}
                    {isNegative && ' (CR)'}
                  </div>
                );
              }
              
              // Format phone numbers (but keep original column name)
              if (columnKey.toLowerCase().includes('phone') || columnKey.toLowerCase().includes('mobile')) {
                return (
                  <div className="flex items-center text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {value.toString()}
                  </div>
                );
              }
              
              // Default formatting
              return (
                <div className="text-gray-900">
                  {value.toString()}
                </div>
              );
            },
          })
        );
      });

      // Add actions column
      dynamicColumns.push(
        columnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: (info) => {
            const isEditing = editingCustomer === info.row.original.id;
            return (
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="text-green-600 hover:text-green-700"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCustomer(info.row.original)}
                      className="text-blue-600 hover:text-blue-700"
                      disabled={!isShowingImportedData}
                      title={!isShowingImportedData ? 'Editing only available for imported data' : 'Edit customer details'}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(info.row.original)}
                      disabled={!info.row.original.phone_no}
                      className="text-green-600 hover:text-green-700 disabled:opacity-50"
                      title={!info.row.original.phone_no ? 'No phone number available' : 'Send WhatsApp message'}
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            );
          },
        })
      );

      return dynamicColumns;
    },
    [contacts, allColumns, editingCustomer, editForm, selectedContacts, selectAll, isShowingImportedData, columnHelper, handleSaveEdit, handleSelectAll, handleSelectCustomer, handleSendMessage]
  );

  // Load customers with phone numbers and outstanding amounts
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all customers with their financial data
      const result = await CustomerService.getAll({
        orderBy: 'name',
        orderDirection: 'asc',
      });
      
      // Filter and transform data for WhatsApp view
      const whatsappCustomers: WhatsAppCustomer[] = result.data
        .map(customer => ({
          id: customer.id,
          name: customer.name,
          phone_no: customer.phone_no || '',
          invoice_id: customer.invoice_id || '',
          invoice_num: customer.invoice_num || '',
          grn_no: customer.grn_no || '',
          grn_date: customer.grn_date || '',
          location: customer.location || '',
          month_year: customer.month_year || '',
          balance_pays: customer.balance_pays || 0,
          paid_amount: customer.paid_amount || 0,
          adjusted_amount: customer.adjusted_amount || 0,
          tds: customer.tds || 0,
          branding_adjustment: customer.branding_adjustment || 0,
        }));
      
      // Update customers using session hook
      updateOriginalContacts(whatsappCustomers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [updateOriginalContacts]);

  // Load cluster state on component mount
  useEffect(() => {
    const savedState = loadClusterState();
    if (savedState && savedState.useClusterView !== undefined) {
      setUseClusterView(savedState.useClusterView);
    }
  }, [loadClusterState]);

  // Save cluster state on unmount or when clusters change
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (useClusterView && clusters.length > 0) {
        saveClusterState(clusters);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save state on cleanup
      if (useClusterView && clusters.length > 0) {
        saveClusterState(clusters);
      }
    };
  }, [useClusterView, clusters, saveClusterState]);

  // Ensure phone number consistency across records with same name
  const ensurePhoneConsistency = useCallback(() => {
    if (!isShowingImportedData) return;

    try {
      const sessionData = JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}');
      if (!sessionData.customers) return;

      // Group contacts by exact name
      const nameGroups = new Map<string, WhatsAppCustomer[]>();
      sessionData.customers.forEach((customer: WhatsAppCustomer) => {
        const exactName = customer.name.trim();
        if (!nameGroups.has(exactName)) {
          nameGroups.set(exactName, []);
        }
        nameGroups.get(exactName)!.push(customer);
      });

      let updated = false;
      // For each name group, ensure all records have the same phone number
      nameGroups.forEach((group, name) => {
        if (group.length > 1) {
          // Find the first non-empty phone number in the group
          const phoneNumber = group.find(contact => contact.phone_no && contact.phone_no.trim())?.phone_no?.trim();
          
          if (phoneNumber) {
            // Update all contacts in this group to have the same phone number
            group.forEach(contact => {
              if (!contact.phone_no || contact.phone_no.trim() !== phoneNumber) {
                contact.phone_no = phoneNumber;
                updated = true;
              }
            });
          }
        }
      });

      // Save back to session if any updates were made
      if (updated) {
        sessionData.lastImportTimestamp = Date.now();
        localStorage.setItem('whatsapp_session_data', JSON.stringify(sessionData));
        console.log('Phone number consistency ensured across all records with same names');
      }
    } catch (error) {
      console.error('Error ensuring phone consistency:', error);
    }
  }, [isShowingImportedData]);

  // Load customers on component mount (only if no session data exists)
  useEffect(() => {
    if (!sessionLoaded) {
      // Session is still loading, wait
      return;
    }

    if (hasImportedData) {
      // We have session data, ensure phone consistency and stop loading
      console.log('Session data found, ensuring phone consistency');
      ensurePhoneConsistency();
      setLoading(false);
    } else {
      // No session data, load customers from database
      console.log('No session data, loading customers from database');
      loadCustomers();
    }
  }, [sessionLoaded, hasImportedData, loadCustomers, ensurePhoneConsistency]);

  // Memoized clustering calculations
  const shouldUseClustering = useMemo(() => {
    if (typeof window === 'undefined') return false; // Prevent SSR issues
    return ContactClusteringService.shouldUseClustering(contacts);
  }, [contacts]);

  const clusteredContacts = useMemo(() => {
    if (typeof window === 'undefined') return []; // Prevent SSR issues
    if (!useClusterView || !shouldUseClustering) {
      return [];
    }
    
    const newClusters = ContactClusteringService.clusterContacts(contacts);
    
    // Apply saved state if available and not already loaded
    if (!clusterStateLoaded) {
      const savedState = loadClusterState();
      if (savedState) {
        setUseClusterView(savedState.useClusterView);
        return applyClusterState(newClusters, savedState);
      }
    }
    
    return newClusters;
  }, [contacts, useClusterView, shouldUseClustering, clusterStateLoaded, loadClusterState, applyClusterState]);

  // Filter clusters based on search term
  const filteredClusters = useMemo(() => {
    if (!searchTerm.trim()) return clusteredContacts;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return clusteredContacts.filter(cluster => {
      // Search in cluster name
      if (cluster.name.toLowerCase().includes(searchLower)) return true;
      
      // Search in cluster phone number
      if (cluster.primaryPhone && cluster.primaryPhone.includes(searchLower)) return true;
      
      // Search in individual contacts within the cluster
      return cluster.contacts.some(contact => {
        // Search in contact name
        if (contact.name.toLowerCase().includes(searchLower)) return true;
        
        // Search in contact phone
        if (contact.phone_no && contact.phone_no.includes(searchLower)) return true;
        
        // Search in Excel data fields
        if (contact.originalData) {
          return Object.entries(contact.originalData).some(([key, value]) => {
            if (value === null || value === undefined) return false;
            return value.toString().toLowerCase().includes(searchLower);
          });
        }
        
        return false;
      });
    });
  }, [clusteredContacts, searchTerm]);

  // Update clusters state when clusteredContacts changes
  useEffect(() => {
    setClusters(clusteredContacts);
    if (!clusterStateLoaded && clusteredContacts.length > 0) {
      setClusterStateLoaded(true);
    }
  }, [clusteredContacts, clusterStateLoaded]);

  // Filter customers based on outstanding amount filter
  const filteredCustomers = useMemo(() => {
    if (typeof window === 'undefined') return []; // Prevent SSR issues
    if (showOnlyOutstanding) {
      return contacts.filter(customer => customer.balance_pays > 0);
    }
    return contacts;
  }, [contacts, showOnlyOutstanding]);

  // Create table instance
  const table = useReactTable({
    data: filteredCustomers,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchTerm,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearchTerm,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Calculate totals based on filtered data with dynamic amount fields
  const totalOutstanding = filteredCustomers.reduce((sum, customer) => {
    // Try different amount field names for dynamic data
    const amountFields = ['balance_pays', 'outstanding', 'balance', 'amount', 'due'];
    let amount = 0;
    
    for (const field of amountFields) {
      if (customer.originalData?.[field] && typeof customer.originalData[field] === 'number') {
        amount = customer.originalData[field];
        break;
      } else if (customer[field as keyof WhatsAppCustomer] && typeof customer[field as keyof WhatsAppCustomer] === 'number') {
        amount = customer[field as keyof WhatsAppCustomer] as number;
        break;
      }
    }
    
    return sum + amount;
  }, 0);
  
  const customersWithPhone = filteredCustomers.filter(customer => customer.phone_no).length;
  const customersWithOutstanding = filteredCustomers.filter(customer => {
    // Check for outstanding amount in various fields
    const amountFields = ['balance_pays', 'outstanding', 'balance', 'amount', 'due'];
    for (const field of amountFields) {
      if (customer.originalData?.[field] && typeof customer.originalData[field] === 'number' && customer.originalData[field] > 0) {
        return true;
      } else if (customer[field as keyof WhatsAppCustomer] && typeof customer[field as keyof WhatsAppCustomer] === 'number' && (customer[field as keyof WhatsAppCustomer] as number) > 0) {
        return true;
      }
    }
    return false;
  }).length;

  // Cluster statistics
  const clusterStats = useMemo(() => {
    if (typeof window === 'undefined') return null; // Prevent SSR issues
    if (!useClusterView || clusters.length === 0) {
      return null;
    }
    return ContactClusteringService.getClusterStatistics(clusters);
  }, [useClusterView, clusters]);

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <Card>
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={loadCustomers}>Try Again</Button>
              </div>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Messages</h1>
              <p className="text-gray-600">
                {isShowingImportedData 
                  ? `Showing imported Excel data (${contacts.length} records)`
                  : 'Send payment reminders and messages to customers'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              {/* Messaging Mode Toggle */}
              <Button
                variant={messagingMode === 'cloud' ? "primary" : "outline"}
                onClick={() => setMessagingMode(messagingMode === 'cloud' ? 'web' : 'cloud')}
                icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                className={messagingMode === 'cloud' ? "bg-purple-600 hover:bg-purple-700" : "border-purple-600 text-purple-600 hover:bg-purple-50"}
                title={messagingMode === 'cloud' ? 'Using WhatsApp Cloud API' : 'Using WhatsApp Web'}
              >
                {messagingMode === 'cloud' ? '☁️ Cloud API' : '🌐 Web'}
              </Button>
              
              {shouldUseClustering && (
                <Button
                  variant={useClusterView ? "primary" : "outline"}
                  onClick={handleToggleClusterView}
                  className={useClusterView ? "bg-green-600 hover:bg-green-700" : "border-green-600 text-green-600 hover:bg-green-50"}
                >
                  {useClusterView ? 'Clustered View' : 'Enable Clustering'}
                </Button>
              )}
              {isShowingImportedData && (
                <Button
                  variant="outline"
                  onClick={handleShowDatabaseData}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Show Database Data
                </Button>
              )}
              <Button
                onClick={() => setShowEnhancedImport(true)}
                icon={<DocumentArrowUpIcon className="h-5 w-5" />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Import Excel
              </Button>
              {isShowingImportedData && (
                <Button
                  onClick={() => setShowPhoneManager(!showPhoneManager)}
                  icon={<PhoneIcon className="h-5 w-5" />}
                  variant={showPhoneManager ? "primary" : "outline"}
                  className={showPhoneManager ? "bg-green-600 hover:bg-green-700" : "border-green-600 text-green-600 hover:bg-green-50"}
                >
                  {showPhoneManager ? 'Hide' : 'Manage'} Phone Numbers
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                icon={<HomeIcon className="h-5 w-5" />}
              >
                Dashboard
              </Button>
            </div>
          </div>

          {/* Messaging Mode Indicator */}
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  {messagingMode === 'cloud' ? '☁️ WhatsApp Cloud API Active' : '🌐 WhatsApp Web Mode Active'}
                </span>
                <span className="text-xs text-purple-600">
                  {messagingMode === 'cloud' 
                    ? '• Messages sent via official API • Automated delivery' 
                    : '• Opens WhatsApp Web in browser • Manual sending'}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMessagingMode(messagingMode === 'cloud' ? 'web' : 'cloud')}
                className="text-purple-600 border-purple-600 hover:bg-purple-100"
              >
                Switch to {messagingMode === 'cloud' ? 'Web' : 'Cloud API'}
              </Button>
            </div>
          </div>

          {/* Data Source Indicator */}
          {isShowingImportedData && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DocumentArrowUpIcon className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Currently showing imported Excel data
                  </span>
                  <span className="text-xs text-green-600">
                    ({contacts.length} records imported)
                  </span>
                  {getSessionInfo() && (
                    <span className="text-xs text-green-500">
                      • {getSessionInfo()?.importType} import • {getSessionInfo()?.timeText}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={showDatabaseData}
                    disabled={!originalContacts.length}
                  >
                    Show Database Data
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSession}
                    className="text-red-600 hover:text-red-700"
                  >
                    Clear Import
                  </Button>
                </div>
              </div>
            </div>
          )}



          {/* Phone Number Manager */}
          {isShowingImportedData && showPhoneManager && (
            <div className="mb-6">
              <PhoneNumberManager
                sessionData={JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}')}
                onPhoneAdded={handlePhoneAdded}
                isVisible={showPhoneManager}
              />
            </div>
          )}

          {/* Session Restoration Indicator */}
          {hasImportedData && getSessionInfo() && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-800">
                  Session restored: {getSessionInfo()?.recordCount} records from {getSessionInfo()?.importType} import ({getSessionInfo()?.timeText})
                </span>
              </div>
            </div>
          )}

          {/* Clustering Information */}
          {useClusterView && clusterStats && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Smart Clustering Active
                  </span>
                  <span className="text-xs text-green-600">
                    ({clusterStats.totalClusters} clusters from {clusterStats.totalContacts} records)
                  </span>
                  {clusterStateLoaded && (
                    <span className="text-xs text-blue-600">
                      • State restored
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-xs text-green-700">
                  <span>Multi-record clusters: {clusterStats.multiContactClusters}</span>
                  {clusterStats.expandedClusters > 0 && (
                    <span>Expanded: {clusterStats.expandedClusters}</span>
                  )}
                  {clusterStats.clustersWithConflicts > 0 && (
                    <span className="text-yellow-700">Phone conflicts: {clusterStats.clustersWithConflicts}</span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleClusterView}
                    className="text-green-600 hover:text-green-700"
                  >
                    Switch to List View
                  </Button>
                </div>
              </div>
              
              {/* Enhanced clustering info */}
              <div className="mt-2 text-xs text-green-700">
                <span>💡 Clusters group records by name. Each cluster shows total outstanding amount and individual record details when expanded.</span>
                {isShowingImportedData && (
                  <span className="ml-2 text-blue-700">✏️ Edit functionality available for imported data.</span>
                )}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <PhoneIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {useClusterView && clusterStats ? 'Contact Clusters' : 
                     isShowingImportedData ? 'Imported Records with Phone' : 'Customers with Phone'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {useClusterView && clusterStats ? clusterStats.totalClusters : customersWithPhone}
                  </p>
                  {useClusterView && clusterStats && (
                    <p className="text-xs text-gray-500 mt-1">
                      {clusterStats.totalContacts} total records • {clusterStats.singleContactClusters} single-record clusters
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 mr-4">
                  <CurrencyRupeeIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {useClusterView && clusterStats ? 'Multi-Record Clusters' :
                     isShowingImportedData ? 'Records with Outstanding' : 'Outstanding Customers'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {useClusterView && clusterStats ? clusterStats.multiContactClusters : customersWithOutstanding}
                  </p>
                  {useClusterView && clusterStats && clusterStats.clustersWithConflicts > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      {clusterStats.clustersWithConflicts} with phone conflicts
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Dynamic Columns Information - Show for imported data */}
          {isShowingImportedData && allColumns.length > 0 && (
            <Card className="p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Detected Columns ({allColumns.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {allColumns.map((column, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <DocumentTextIcon className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-800 truncate">
                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Auto-Detection Summary */}
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Auto-Detected Special Fields:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className={`h-4 w-4 ${contacts.some(c => c.name) ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-xs">Name: {contacts.some(c => c.name) ? 'Detected' : 'Not detected'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className={`h-4 w-4 ${contacts.some(c => c.phone_no) ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-xs">Phone: {contacts.some(c => c.phone_no) ? 'Detected' : 'Not detected'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className={`h-4 w-4 ${totalOutstanding > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-xs">Amount: {totalOutstanding > 0 ? 'Detected' : 'Not detected'}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Search and Bulk Actions */}
          <Card className="mb-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1">
                <Input
                  label=""
                  placeholder={useClusterView 
                    ? "Search clusters by name, phone, or any Excel field..." 
                    : "Search customers by name, phone, or any field..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                />
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Filter Toggle */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyOutstanding}
                    onChange={(e) => setShowOnlyOutstanding(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">Outstanding only</span>
                </label>

                {/* Quick Select Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (useClusterView) {
                      // In cluster view, select all contacts from clusters with outstanding amounts
                      const outstandingContacts = new Set<string>();
                      clusters.forEach(cluster => {
                        if (cluster.totalOutstanding > 0) {
                          cluster.contacts.forEach(contact => {
                            if (contact.phone_no) {
                              outstandingContacts.add(contact.id);
                            }
                          });
                        }
                      });
                      setSelectedContacts(outstandingContacts);
                    } else {
                      // In list view, select outstanding customers directly
                      const outstandingCustomers = filteredCustomers
                        .filter(customer => {
                          const amountFields = ['balance_pays', 'outstanding', 'balance', 'amount', 'due'];
                          for (const field of amountFields) {
                            if (customer.originalData?.[field] && typeof customer.originalData[field] === 'number' && customer.originalData[field] > 0) {
                              return customer.phone_no;
                            } else if (customer[field as keyof WhatsAppCustomer] && typeof customer[field as keyof WhatsAppCustomer] === 'number' && (customer[field as keyof WhatsAppCustomer] as number) > 0) {
                              return customer.phone_no;
                            }
                          }
                          return false;
                        })
                        .map(customer => customer.id);
                      setSelectedContacts(new Set(outstandingCustomers));
                    }
                  }}
                >
                  Select Outstanding
                </Button>

                {/* Imported Contacts Actions */}
                {importedContacts.length > 0 && (
                  <>
                    <span className="text-sm text-blue-600 font-medium">
                      {importedContacts.length} imported contacts
                    </span>
                    <Button
                      onClick={handleSendToImported}
                      icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Send to Imported ({importedContacts.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => showDatabaseData()}
                    >
                      Clear Imported
                    </Button>
                  </>
                )}

                {/* Bulk Actions */}
                {selectedContacts.size > 0 && (
                  <>
                    <span className="text-sm text-gray-600">
                      {selectedContacts.size} selected
                    </span>
                    <Button
                      onClick={handleBulkSendMessages}
                      icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
                      className="bg-green-600 hover:bg-green-700"
                      data-bulk-send-button="true"
                    >
                      {(() => {
                        const selectedWithPhone = contacts.filter(c => {
                          if (!selectedContacts.has(c.id)) return false;
                          if (!c.phone_no || c.phone_no.trim() === '') return false;
                          const cleanPhone = c.phone_no.replace(/[\s\-\(\)\+]/g, '');
                          return /^\d{10,15}$/.test(cleanPhone);
                        }).length;
                        const selectedWithoutPhone = selectedContacts.size - selectedWithPhone;
                        
                        if (selectedContacts.size === 0) {
                          return 'Send Messages (0)';
                        } else if (selectedWithoutPhone === 0) {
                          return `Send Messages (${selectedContacts.size})`;
                        } else {
                          return `Send Messages (${selectedWithPhone}/${selectedContacts.size})`;
                        }
                      })()}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedContacts(new Set());
                        setSelectAll(false);
                      }}
                    >
                      Clear
                    </Button>
                  </>
                )}
              </div>
              
              {/* Messaging Restrictions Helper */}
              {isShowingImportedData && selectedContacts.size > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  {(() => {
                    const selectedWithPhone = contacts.filter(c => {
                      if (!selectedContacts.has(c.id)) return false;
                      if (!c.phone_no || c.phone_no.trim() === '') return false;
                      const cleanPhone = c.phone_no.replace(/[\s\-\(\)\+]/g, '');
                      return /^\d{10,15}$/.test(cleanPhone);
                    }).length;
                    const selectedWithoutPhone = selectedContacts.size - selectedWithPhone;
                    
                    if (selectedWithoutPhone === 0) {
                      return (
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800">
                            All {selectedContacts.size} selected records are ready for WhatsApp messaging
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-yellow-800">
                              {selectedWithoutPhone} selected record(s) cannot receive messages (missing phone numbers)
                            </span>
                          </div>
                          <div className="text-xs text-yellow-700">
                            💡 Only {selectedWithPhone} out of {selectedContacts.size} selected records will receive messages. 
                            Click "Manage Phone Numbers" to add missing phone numbers.
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </Card>

          {/* Cluster View */}
          {useClusterView && shouldUseClustering ? (
            <div className="space-y-4">
              {/* Search Results Info for Clusters */}
              {searchTerm.trim() && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MagnifyingGlassIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Search results: {filteredClusters.length} cluster{filteredClusters.length !== 1 ? 's' : ''} found for "{searchTerm}"
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              
              {filteredClusters.length > 0 ? (
                filteredClusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    onPhoneUpdate={handleClusterPhoneUpdate}
                    onToggleExpand={handleToggleClusterExpansion}
                    onSelectContact={handleSelectCustomer}
                    onSelectCluster={handleClusterSelection}
                    selectedContacts={selectedContacts}
                    onEditContact={handleEditContact}
                    isShowingImportedData={isShowingImportedData}
                  />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <div className="text-gray-500">
                    {searchTerm.trim() ? (
                      <div>
                        <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p>No clusters found matching "{searchTerm}"</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSearchTerm('')}
                          className="mt-2"
                        >
                          Clear search
                        </Button>
                      </div>
                    ) : (
                      <p>No clusters found</p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            /* Customer Table */
            <Card>
              <div className="overflow-hidden">
                <DataTable
                  table={table}
                  loading={loading}
                  emptyMessage="No customers found"
                />
              </div>

              {/* Totals Row */}
              {filteredCustomers.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium">
                    <div className="text-gray-900">
                      Total: {filteredCustomers.length} customers
                    </div>
                    <div className="text-gray-900">
                      With Phone: {customersWithPhone}
                    </div>
                    <div className="text-gray-900">
                      Outstanding: {customersWithOutstanding}
                    </div>
                    <div className="text-green-600">
                      Paid: ₹{filteredCustomers.reduce((sum, customer) => sum + customer.paid_amount, 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-red-600">
                      Outstanding: ₹{totalOutstanding.toLocaleString('en-IN')}
                    </div>
                    <div className="text-blue-600">
                      Total: ₹{filteredCustomers.reduce((sum, customer) => sum + customer.paid_amount + customer.balance_pays, 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      table.getFilteredRowModel().rows.length
                    )}{' '}
                    of {table.getFilteredRowModel().rows.length} customers
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Enhanced Excel Import Modal */}
          {showEnhancedImport && (
            <EnhancedExcelImport
              onImportComplete={handleEnhancedImportCompleteLocal}
              onClose={() => setShowEnhancedImport(false)}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default WhatsAppPage;
