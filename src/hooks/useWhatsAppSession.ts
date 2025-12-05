import { useState, useEffect, useCallback } from 'react';
import type { MappingResult } from '../lib/services/whatsappMapping';
import { PhoneNumberPropagationService } from '../lib/services/phoneNumberPropagationService';
import { validatePhoneNumber } from '../utils/phoneUtils';
import { useAuth } from '../contexts/AuthContext';

interface WhatsAppCustomer {
  id: string;
  name: string;
  phone_no: string;
  invoice_id: string;
  invoice_num: string;
  grn_no: string;
  grn_date: string;
  location: string;
  month_year: string;
  balance_pays: number;
  paid_amount: number;
  adjusted_amount: number;
  tds: number;
  branding_adjustment: number;
  originalData?: Record<string, unknown>;
}

interface WhatsAppSessionData {
  customers: WhatsAppCustomer[];
  originalCustomers: WhatsAppCustomer[];
  mappingResults: MappingResult[];
  importedContacts: Record<string, unknown>[];
  isShowingImportedData: boolean;
  lastImportTimestamp?: number;
  importType?: 'enhanced' | 'legacy';
}

const STORAGE_KEY = 'whatsapp_session_data';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export const useWhatsAppSession = () => {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<WhatsAppSessionData>({
    customers: [],
    originalCustomers: [],
    mappingResults: [],
    importedContacts: [],
    isShowingImportedData: false,
  });
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Load session data from localStorage on mount
  useEffect(() => {
    const loadSessionData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedData: WhatsAppSessionData = JSON.parse(stored);
          
          // Check if session has expired
          if (parsedData.lastImportTimestamp) {
            const now = Date.now();
            const timeDiff = now - parsedData.lastImportTimestamp;
            
            if (timeDiff > SESSION_TIMEOUT) {
              console.log('WhatsApp session expired, clearing stored data');
              localStorage.removeItem(STORAGE_KEY);
              return;
            }
          }
          
          console.log('Restored WhatsApp session data:', {
            customers: parsedData.customers.length,
            isShowingImported: parsedData.isShowingImportedData,
            importType: parsedData.importType
          });
          
          setSessionData(parsedData);
        }
      } catch (error) {
        console.error('Error loading WhatsApp session data:', error);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setSessionLoaded(true);
      }
    };

    loadSessionData();
  }, []);

  // Clear session when user logs out
  useEffect(() => {
    if (!user && sessionLoaded) {
      // User has logged out, clear the session
      console.log('User logged out, clearing WhatsApp session');
      localStorage.removeItem(STORAGE_KEY);
      setSessionData({
        customers: [],
        originalCustomers: [],
        mappingResults: [],
        importedContacts: [],
        isShowingImportedData: false,
      });
    }
  }, [user, sessionLoaded]);

  // Save session data to localStorage whenever it changes
  const saveSessionData = useCallback((data: Partial<WhatsAppSessionData>) => {
    try {
      setSessionData(prevSessionData => {
        const updatedData = {
          ...prevSessionData,
          ...data,
          lastImportTimestamp: Date.now(),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
        
        console.log('Saved WhatsApp session data:', {
          customers: updatedData.customers.length,
          isShowingImported: updatedData.isShowingImportedData,
          importType: updatedData.importType
        });
        
        return updatedData;
      });
    } catch (error) {
      console.error('Error saving WhatsApp session data:', error);
    }
  }, []);

  // Handle enhanced import completion with phone number propagation
  const handleEnhancedImportComplete = useCallback((mappingResults: MappingResult[], originalCustomers: WhatsAppCustomer[]) => {
    // Transform mapping results to WhatsApp customers with dynamic field mapping
    const transformedData = mappingResults.map((result, index) => {
      // Core field mapping with multiple fallbacks
      const getName = () => result.final_name || result.additional_data.customer_name || result.additional_data.name || 'Unknown';
      
      const getBalance = () => {
        const balanceFields = ['outstanding', 'balance', 'Outstanding', 'Balance', 'balance_amount', 'outstanding_amount', 'due', 'Due'];
        for (const field of balanceFields) {
          if (result.additional_data[field] && typeof result.additional_data[field] === 'number') {
            return result.additional_data[field];
          }
        }
        return 0;
      };
      
      const getTotal = () => {
        const totalFields = ['total', 'total_amount', 'Total', 'Total Amount', 'invoice_total', 'bill_total', 'amount'];
        for (const field of totalFields) {
          if (result.additional_data[field] && typeof result.additional_data[field] === 'number') {
            return result.additional_data[field];
          }
        }
        return getBalance(); // Fallback to balance if no total found
      };
      
      const getPaid = () => {
        const paidFields = ['paid', 'paid_amount', 'Paid', 'Paid Amount', 'payment', 'received'];
        for (const field of paidFields) {
          if (result.additional_data[field] && typeof result.additional_data[field] === 'number') {
            return result.additional_data[field];
          }
        }
        return 0;
      };

      // ENHANCED: Ensure phone number is validated and properly formatted
      const getValidatedPhone = () => {
        const phone = result.final_phone || '';
        const validation = validatePhoneNumber(phone);
        return validation.isValid ? validation.normalized! : phone;
      };

      return {
        id: `mapped-${index}-${Date.now()}`,
        name: getName(),
        phone_no: getValidatedPhone(), // Enhanced with validation
        invoice_id: result.additional_data.invoice_id || result.additional_data['Invoice ID'] || '',
        invoice_num: result.additional_data.invoice_num || result.additional_data['Invoice Number'] || '',
        grn_no: result.additional_data.grn_no || result.additional_data['GRN'] || '',
        grn_date: result.additional_data.grn_date || result.additional_data['Date'] || '',
        location: result.additional_data.location || result.additional_data['Location'] || '',
        month_year: result.additional_data.month_year || result.additional_data['Period'] || '',
        balance_pays: getBalance(),
        paid_amount: getPaid(),
        adjusted_amount: getTotal() - getPaid(), // Calculate adjusted amount
        tds: result.additional_data.tds || result.additional_data['TDS'] || 0,
        branding_adjustment: result.additional_data.branding_adjustment || 0,
        originalData: result.additional_data
      };
    });

    // ENHANCED: Apply phone number propagation to session data
    const initialSessionData = {
      customers: transformedData,
      originalCustomers: originalCustomers,
      mappingResults: mappingResults,
      importedContacts: [],
      isShowingImportedData: true,
      importType: 'enhanced'
    };

    // Update session storage with customer database phones
    const { updatedSessionData, updates } = PhoneNumberPropagationService.updateSessionStorageWithCustomerPhones(
      initialSessionData,
      mappingResults
    );

    if (updates.length > 0) {
      console.log(`Phone propagation: Updated ${updates.length} records with customer database phones`);
    }

    saveSessionData(updatedSessionData);
  }, [saveSessionData]);

  // Handle legacy import completion
  const handleLegacyImportComplete = useCallback((importedData: Record<string, unknown>[], originalCustomers: WhatsAppCustomer[]) => {
    const transformedData = importedData.map((contact, index) => {
      // Find name field from various possible names
      const nameFields = Object.keys(contact).filter(key => 
        key.toLowerCase().includes('name') || 
        key.toLowerCase().includes('contact') || 
        key.toLowerCase().includes('party') ||
        key.toLowerCase().includes('customer') ||
        key.toLowerCase().includes('client')
      );
      const nameValue = nameFields.length > 0 ? contact[nameFields[0]] : 'Unknown';

      // Find phone field from various possible names
      const phoneFields = Object.keys(contact).filter(key => 
        key.toLowerCase().includes('phone') || 
        key.toLowerCase().includes('mobile') || 
        key.toLowerCase().includes('contact')
      );
      const phoneValue = phoneFields.length > 0 ? contact[phoneFields[0]] : '';

      // Find amount field from various possible names
      const amountFields = Object.keys(contact).filter(key => 
        key.toLowerCase().includes('balance') || 
        key.toLowerCase().includes('outstanding') || 
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('due') ||
        key.toLowerCase().includes('total')
      );
      const amountValue = amountFields.length > 0 ? contact[amountFields[0]] : 0;

      return {
        id: `imported-${index}-${Date.now()}`,
        name: nameValue || 'Unknown',
        phone_no: phoneValue || '',
        invoice_id: contact['Trans#'] || contact['Transaction'] || contact['Invoice ID'] || '',
        invoice_num: contact['Invoice Number'] || contact['Invoice No'] || '',
        grn_no: contact['GRN'] || contact['GRN No'] || '',
        grn_date: contact['Date'] || contact['GRN Date'] || '',
        location: contact['Location'] || contact['Branch'] || '',
        month_year: contact['Month'] || contact['Period'] || '',
        balance_pays: typeof amountValue === 'number' ? amountValue : 0,
        paid_amount: contact['Paid Amount'] || contact['Paid'] || 0,
        adjusted_amount: contact['Adjusted Amount'] || contact['Adjusted'] || 0,
        tds: contact['TDS'] || contact['Tax'] || 0,
        branding_adjustment: contact['Branding'] || 0,
        originalData: contact
      };
    });

    saveSessionData({
      customers: transformedData,
      originalCustomers: originalCustomers,
      mappingResults: [],
      importedContacts: importedData,
      isShowingImportedData: true,
      importType: 'legacy'
    });
  }, [saveSessionData]);

  // Switch back to database data
  const showDatabaseData = useCallback(() => {
    setSessionData(prevData => {
      const updatedData = {
        ...prevData,
        customers: prevData.originalCustomers,
        isShowingImportedData: false,
        importedContacts: [],
        lastImportTimestamp: Date.now(),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  // Update original customers (when database data is loaded)
  const updateOriginalCustomers = useCallback((customers: WhatsAppCustomer[]) => {
    setSessionData(prevData => {
      const updatedData = {
        ...prevData,
        customers: prevData.isShowingImportedData ? prevData.customers : customers,
        originalCustomers: customers,
        lastImportTimestamp: Date.now(),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  // Clear session data
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionData({
      customers: [],
      originalCustomers: [],
      mappingResults: [],
      importedContacts: [],
      isShowingImportedData: false,
    });
  }, []);

  // ENHANCED: Update phone number with automatic propagation
  const updatePhoneWithPropagation = useCallback(async (customerId: string, newPhone: string) => {
    try {
      // Validate phone number first
      const validation = validatePhoneNumber(newPhone);
      if (!validation.isValid) {
        throw new Error(validation.message || 'Invalid phone number format');
      }

      // Get current session data
      const currentSessionData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      
      // Sync phone numbers between systems
      const result = await PhoneNumberPropagationService.syncPhoneNumbersBetweenSystems(
        customerId,
        validation.normalized!,
        currentSessionData
      );

      if (result.success) {
        // Reload session data to reflect changes
        const updatedSessionData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        setSessionData(updatedSessionData);
        
        console.log(`Phone update successful: ${result.propagatedCount} records updated`);
        return { success: true, propagatedCount: result.propagatedCount };
      } else {
        throw new Error(result.errors.join(', ') || 'Phone update failed');
      }
    } catch (error) {
      console.error('Error updating phone with propagation:', error);
      throw error;
    }
  }, []);

  // ENHANCED: Validate messaging readiness
  const validateMessagingReadiness = useCallback(() => {
    if (!sessionData.mappingResults || sessionData.mappingResults.length === 0) {
      return { ready: true, readyCount: sessionData.customers.length, issues: [], recommendations: [] };
    }

    return PhoneNumberPropagationService.validateMessagingReadiness(sessionData.mappingResults);
  }, [sessionData.mappingResults]);

  // ENHANCED: Get phone propagation statistics
  const getPhonePropagationStats = useCallback(() => {
    if (!sessionData.mappingResults || sessionData.mappingResults.length === 0) {
      return null;
    }

    // For stats, we need original results - we'll approximate from current data
    const originalResults = sessionData.mappingResults.map(result => ({
      ...result,
      final_phone: result.imported_phone || '' // Simulate original state
    }));

    return PhoneNumberPropagationService.getPhonePropagationStatistics(
      originalResults,
      sessionData.mappingResults
    );
  }, [sessionData.mappingResults]);

  // Check if there's active imported data
  const hasImportedData = sessionData.isShowingImportedData && sessionData.customers.length > 0;

  // Get session info for display
  const getSessionInfo = useCallback(() => {
    const currentHasImportedData = sessionData.isShowingImportedData && sessionData.customers.length > 0;
    if (!currentHasImportedData) return null;

    const timeSinceImport = sessionData.lastImportTimestamp 
      ? Date.now() - sessionData.lastImportTimestamp 
      : 0;
    
    const hoursAgo = Math.floor(timeSinceImport / (1000 * 60 * 60));
    const minutesAgo = Math.floor((timeSinceImport % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeText = '';
    if (hoursAgo > 0) {
      timeText = `${hoursAgo}h ${minutesAgo}m ago`;
    } else if (minutesAgo > 0) {
      timeText = `${minutesAgo}m ago`;
    } else {
      timeText = 'just now';
    }

    return {
      importType: sessionData.importType || 'unknown',
      recordCount: sessionData.customers.length,
      timeText,
      hasOriginalData: sessionData.originalCustomers.length > 0
    };
  }, [sessionData.isShowingImportedData, sessionData.customers.length, sessionData.lastImportTimestamp, sessionData.importType, sessionData.originalCustomers.length]);

  return {
    // Current state
    customers: sessionData.customers,
    originalCustomers: sessionData.originalCustomers,
    mappingResults: sessionData.mappingResults,
    importedContacts: sessionData.importedContacts,
    isShowingImportedData: sessionData.isShowingImportedData,
    sessionLoaded,
    
    // Actions
    handleEnhancedImportComplete,
    handleLegacyImportComplete,
    showDatabaseData,
    updateOriginalCustomers,
    clearSession,
    
    // ENHANCED: Phone propagation actions
    updatePhoneWithPropagation,
    validateMessagingReadiness,
    getPhonePropagationStats,
    
    // Utilities
    hasImportedData,
    getSessionInfo,
  };
};