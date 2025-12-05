'use client';

import React, { useState, useRef } from 'react';
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  DocumentTextIcon,
  UserIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CurrencyRupeeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { WhatsAppMappingService, type ImportedRecord, type MappingResult, type ConflictResolution } from '../../lib/services/whatsappMapping';
import { SimplifiedImportService, type NewCustomerPrompt } from '../../lib/services/simplifiedImportService';
import type { Customer } from '../../lib/supabase/types';
import EnhancedConflictResolutionModal from './EnhancedConflictResolutionModal';
import NewCustomerModal from './NewCustomerModal';
import toast from 'react-hot-toast';

interface ImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  headers: string[];
  validData: ImportedRecord[];
  invalidData: ImportedRecord[];
  preview: ImportedRecord[];
}

interface EnhancedExcelImportProps {
  onImportComplete?: (mappingResults: MappingResult[], importedData?: Record<string, unknown>[]) => void;
  onClose?: () => void;
}

const EnhancedExcelImport: React.FC<EnhancedExcelImportProps> = ({ onImportComplete, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [mappingResults, setMappingResults] = useState<MappingResult[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<ConflictResolution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'import' | 'auto-import' | 'conflicts' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Enhanced import state - simplified
  const [showEnhancedConflictModal, setShowEnhancedConflictModal] = useState(false);
  
  // New customer creation state
  const [newCustomerPrompts, setNewCustomerPrompts] = useState<NewCustomerPrompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [createdCustomers, setCreatedCustomers] = useState<Customer[]>([]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    setMappingResults([]);
    setConflictResolutions([]);
    setError(null);
    setCurrentStep('upload');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fileExtension = droppedFile.name.toLowerCase().split('.').pop();
      if (['xls', 'xlsx'].includes(fileExtension || '')) {
        handleFileSelect(droppedFile);
      } else {
        setError('Please select a valid Excel file (.xls or .xlsx)');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setCurrentStep('import');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/whatsapp/enhanced-import', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      console.log('API Response Status:', response.status);
      console.log('API Response Text (first 200 chars):', responseText.substring(0, 200));
      
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError);
        console.error('Full Response Text:', responseText);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      // Handle the enhanced import response - simplified
      if (result.data.mappingResults && result.data.mappingResults.length > 0) {
        setMappingResults(result.data.mappingResults);
        
        // Check for conflicts that need resolution
        const hasActualConflicts = result.data.mappingResults.some((result: MappingResult) => 
          result.conflict_type && result.confidence !== 'exact' && result.conflict_type !== 'no_match'
        );
        
        const hasNoMatchRecords = result.data.mappingResults.some((result: MappingResult) => 
          result.conflict_type === 'no_match'
        );
        
        if (hasActualConflicts || hasNoMatchRecords) {
          setCurrentStep('conflicts');
        } else {
          setCurrentStep('complete');
        }
      } else {
        setError('No valid data found to import');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
      setCurrentStep('upload');
    } finally {
      setImporting(false);
    }
  };

  // Mapping is now handled in the API endpoint

  const handleConflictResolution = (recordIndex: number, action: ConflictResolution['action'], manualName?: string, manualPhone?: string) => {
    const newResolutions = conflictResolutions.filter(r => r.recordIndex !== recordIndex);
    newResolutions.push({
      recordIndex,
      action,
      manual_name: manualName,
      manual_phone: manualPhone
    });
    setConflictResolutions(newResolutions);
  };

  const handleResolveAllConflicts = () => {
    // Auto-resolve no-match records if not already resolved
    const conflictResults = mappingResults.filter(result => 
      result.conflict_type && result.confidence !== 'exact'
    );
    
    const autoResolutions = [...conflictResolutions];
    
    conflictResults.forEach((result, index) => {
      const originalIndex = mappingResults.findIndex(r => r === result);
      const existingResolution = autoResolutions.find(r => r.recordIndex === originalIndex);
      
      // Auto-resolve no-match records to use imported data if not already resolved
      if (!existingResolution && result.conflict_type === 'no_match') {
        autoResolutions.push({
          recordIndex: originalIndex,
          action: 'use_imported'
        });
      }
    });
    
    const updatedResults = WhatsAppMappingService.applyConflictResolutions(mappingResults, autoResolutions);
    setMappingResults(updatedResults);
    setCurrentStep('complete');
  };

  // Enhanced conflict resolution handlers
  const handleEnhancedConflictResolution = (index: number, resolution: ConflictResolution) => {
    const newResolutions = conflictResolutions.filter(r => r.recordIndex !== index);
    newResolutions.push(resolution);
    setConflictResolutions(newResolutions);
  };

  const handleEnhancedBatchResolve = (action: 'keep_contact' | 'use_imported', conflictType?: string) => {
    const newResolutions = [...conflictResolutions];
    
    mappingResults.forEach((result, index) => {
      // Skip if already resolved
      if (conflictResolutions.some(r => r.recordIndex === index)) return;
      
      // Apply to specific conflict type or all conflicts
      if (!conflictType || result.conflict_type === conflictType) {
        newResolutions.push({
          recordIndex: index,
          action
        });
      }
    });
    
    setConflictResolutions(newResolutions);
  };



  const handleConflictModalComplete = () => {
    setShowEnhancedConflictModal(false);
    
    // Apply all conflict resolutions
    const updatedResults = WhatsAppMappingService.applyConflictResolutions(mappingResults, conflictResolutions);
    setMappingResults(updatedResults);
    setCurrentStep('complete');
  };

  const handleSkipRemainingConflicts = () => {
    setShowEnhancedConflictModal(false);
    
    // Auto-resolve remaining conflicts by keeping contact data (or using imported for no-match)
    const autoResolutions = [...conflictResolutions];
    
    mappingResults.forEach((result, index) => {
      // Skip if already resolved
      if (conflictResolutions.some(r => r.recordIndex === index)) return;
      
      // Auto-resolve based on conflict type
      if (result.conflict_type === 'no_match') {
        autoResolutions.push({
          recordIndex: index,
          action: 'use_imported'
        });
      } else {
        autoResolutions.push({
          recordIndex: index,
          action: 'keep_contact'
        });
      }
    });
    
    setConflictResolutions(autoResolutions);
    const updatedResults = WhatsAppMappingService.applyConflictResolutions(mappingResults, autoResolutions);
    setMappingResults(updatedResults);
    setCurrentStep('complete');
  };

  // New customer creation handlers
  const handleNewCustomerConfirm = async (customer: Customer) => {
    try {
      // Add to created customers list
      setCreatedCustomers(prev => [...prev, customer]);
      
      // Move to next prompt or complete
      const nextIndex = currentPromptIndex + 1;
      if (nextIndex < newCustomerPrompts.length) {
        setCurrentPromptIndex(nextIndex);
      } else {
        setShowNewCustomerModal(false);
        setCurrentStep('complete');
      }
      
      toast.success(`✅ Customer created: ${customer.name}`);
    } catch (error) {
      console.error('Error handling new customer confirmation:', error);
      toast.error('Failed to process new customer');
    }
  };

  const handleNewCustomerSkip = () => {
    // Move to next prompt or complete
    const nextIndex = currentPromptIndex + 1;
    if (nextIndex < newCustomerPrompts.length) {
      setCurrentPromptIndex(nextIndex);
    } else {
      setShowNewCustomerModal(false);
      setCurrentStep('complete');
    }
    
    toast('Customer creation skipped', { icon: 'ℹ️' });
  };

  const handleNewCustomerCancel = () => {
    setShowNewCustomerModal(false);
    setCurrentStep('conflicts');
  };

  const startNewCustomerCreation = (prompts: NewCustomerPrompt[]) => {
    setNewCustomerPrompts(prompts);
    setCurrentPromptIndex(0);
    setShowNewCustomerModal(true);
  };

  const handleFinalImport = async () => {
    try {
      // Save mapping results to database
      await WhatsAppMappingService.saveMappingResults(mappingResults);
      
      const stats = WhatsAppMappingService.getMappingStatistics(mappingResults);
      const newContacts = stats.newRecords;
      const updatedContacts = stats.customersUpdated;
      
      // Calculate phone number statistics
      const recordsWithPhone = mappingResults.filter(result => result.final_phone && result.final_phone.trim() !== '').length;
      const recordsWithoutPhone = mappingResults.length - recordsWithPhone;
      
      let successMessage = `🎉 Import completed successfully! ${mappingResults.length} records processed.`;
      if (newContacts > 0) {
        successMessage += ` ${newContacts} new contact${newContacts !== 1 ? 's' : ''} created.`;
      }
      if (updatedContacts > 0) {
        successMessage += ` ${updatedContacts} contact${updatedContacts !== 1 ? 's' : ''} updated.`;
      }
      
      // Add detailed phone number information
      if (recordsWithoutPhone > 0) {
        successMessage += `\n\n📱 WhatsApp Messaging Status:`;
        successMessage += `\n✅ ${recordsWithPhone} records ready for messaging`;
        successMessage += `\n❌ ${recordsWithoutPhone} records CANNOT send messages (no phone numbers)`;
        successMessage += `\n\n🚫 Messaging Restriction: Records without phone numbers will be excluded from bulk messaging.`;
        successMessage += `\n💡 Solution: Click "Manage Phone Numbers" to add phone numbers for the ${recordsWithoutPhone} missing records.`;
      } else {
        successMessage += `\n\n📱 All ${mappingResults.length} records have phone numbers and are ready for WhatsApp messaging!`;
      }
      
      toast.success(successMessage, { duration: 6000 });
      
      if (onImportComplete) {
        // Pass both mapping results and raw imported data for "Send to Imported" functionality
        const importedData = mappingResults.map(result => ({
          name: result.final_name,
          phone: result.final_phone,
          ...result.additional_data
        }));
        
        onImportComplete(mappingResults, importedData);
      }
    } catch (err) {
      console.error('Final import error:', err);
      toast.error('Import failed. Please check the console for details.');
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    setMappingResults([]);
    setConflictResolutions([]);
    setError(null);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Create sample data
    const sampleData = [
      ['Name', 'Phone', 'Outstanding', 'Location', 'Invoice ID'],
      ['John Doe', '9876543210', '5000', 'Mumbai', 'INV001'],
      ['Jane Smith', '9876543211', '3500', 'Delhi', 'INV002'],
      ['Bob Johnson', '9876543212', '7200', 'Bangalore', 'INV003']
    ];

    // Create CSV content
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStepStatus = (step: string) => {
    const steps = ['upload', 'import', 'conflicts', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {[
          { key: 'upload', label: 'Upload', icon: DocumentArrowUpIcon },
          { key: 'import', label: 'Import', icon: DocumentTextIcon },
          { key: 'conflicts', label: 'Conflicts', icon: ExclamationTriangleIcon },
          { key: 'complete', label: 'Complete', icon: CheckCircleIcon }
        ].map((step, index) => {
          const status = getStepStatus(step.key);
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                status === 'completed' ? 'bg-green-600 text-white' :
                status === 'current' ? 'bg-blue-600 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`ml-2 text-sm ${
                status === 'current' ? 'font-medium text-blue-600' :
                status === 'completed' ? 'text-green-600' :
                'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < 3 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Smart Excel Import</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-3">
            Upload any Excel file with contact data. The system will automatically detect and import all columns without restrictions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Any Column Names</span>
              <span className="text-xs text-blue-600">(Dynamic)</span>
            </div>
            <div className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Smart Contact Mapping</span>
              <span className="text-xs text-blue-600">(Auto)</span>
            </div>
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Conflict Resolution</span>
              <span className="text-xs text-blue-600">(Interactive)</span>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-3">
            The system will automatically detect Name, Phone, and Amount columns while importing ALL other columns as-is. Contact matching and conflict resolution included.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              Download Sample Template
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />

        {file ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">
              Size: {(file.size / 1024).toFixed(1)} KB
            </p>
            <div className="flex justify-center space-x-3">
              <Button onClick={handleImport} loading={importing}>
                {importing ? 'Processing...' : 'Import & Map Data'}
              </Button>
              <Button variant="outline" onClick={resetImport}>
                Choose Different File
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-lg font-medium text-gray-900">
              Drop your Excel file here
            </p>
            <p className="text-sm text-gray-500">
              or click to browse for .xls or .xlsx files
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose File
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </>
  );

  const renderMappingStep = () => {
    if (!importResult) return null;

    const stats = WhatsAppMappingService.getMappingStatistics(mappingResults);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900">Mapping Data with Contact Records</h3>
          <p className="text-gray-600">Please wait while we match your imported data...</p>
        </div>

        {mappingResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{stats.exactMatches}</p>
                <p className="text-sm text-gray-600">Exact Matches</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{stats.fuzzyMatches}</p>
                <p className="text-sm text-gray-600">Fuzzy Matches</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <XMarkIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{stats.noMatches}</p>
                <p className="text-sm text-gray-600">No Matches</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{stats.conflicts}</p>
                <p className="text-sm text-gray-600">Conflicts</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderConflictsStep = () => {
    const conflictResults = mappingResults.filter(result => 
      result.conflict_type && result.confidence !== 'exact'
    );

    // Separate actual conflicts from no-match records
    const actualConflicts = conflictResults.filter(result => 
      result.conflict_type !== 'no_match'
    );
    const noMatchRecords = conflictResults.filter(result => 
      result.conflict_type === 'no_match'
    );

    if (conflictResults.length === 0) {
      return (
        <div className="text-center py-8">
          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Conflicts Found</h3>
          <p className="text-gray-600">All records were mapped successfully!</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Simplified Import Processing</h3>
          <div className="space-y-2">
            <p className="text-gray-600">
              {actualConflicts.length} conflict(s) will be auto-resolved using Customer database data.
            </p>
            {noMatchRecords.length > 0 && (
              <p className="text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2 inline-block">
                {noMatchRecords.length} new contact(s) will be created with imported data.
              </p>
            )}
          </div>
        </div>

        {/* Simplified Auto-Resolution Summary */}
        <Card>
          <div className="p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">📋 Import Summary</h4>
            
            {/* Auto-resolved conflicts */}
            {actualConflicts.length > 0 && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h5 className="font-medium text-green-800">Auto-Resolved Conflicts ({actualConflicts.length})</h5>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  These records will automatically use Customer database phone numbers:
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {actualConflicts.slice(0, 5).map((result, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded border">
                      <span className="font-medium">{result.imported_name}</span>
                      {result.matched_contact && (
                        <span className="text-gray-600 ml-2">
                          → Will use: {result.matched_contact.phone_no}
                        </span>
                      )}
                    </div>
                  ))}
                  {actualConflicts.length > 5 && (
                    <p className="text-xs text-green-600">
                      ... and {actualConflicts.length - 5} more records
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* New customers to create */}
            {noMatchRecords.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <UserIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h5 className="font-medium text-blue-800">New Customers to Create ({noMatchRecords.length})</h5>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  These contacts will be created as new customers:
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {noMatchRecords.slice(0, 5).map((result, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded border">
                      <span className="font-medium">{result.imported_name}</span>
                      <span className="text-gray-600 ml-2">
                        Phone: {result.imported_phone || 'Will need phone number'}
                      </span>
                    </div>
                  ))}
                  {noMatchRecords.length > 5 && (
                    <p className="text-xs text-blue-600">
                      ... and {noMatchRecords.length - 5} more records
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced action buttons with skip options */}
            <div className="space-y-4">
              {/* Primary Actions */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => {
                    // Auto-resolve conflicts (use customer data for conflicts)
                    actualConflicts.forEach((result) => {
                      const originalIndex = mappingResults.findIndex(r => r === result);
                      handleConflictResolution(originalIndex, 'keep_contact');
                    });
                    
                    // Handle no-match records with new customer creation workflow
                    if (noMatchRecords.length > 0) {
                      // Convert no-match records to NewCustomerPrompt format
                      const prompts: NewCustomerPrompt[] = noMatchRecords
                        .filter(result => result.imported_name) // Ensure name exists
                        .map(result => ({
                          importRecord: {
                            name: result.imported_name!,
                            phone: result.imported_phone || undefined,
                            originalData: result.additional_data,
                            rowIndex: mappingResults.findIndex(r => r === result)
                          },
                          suggestedCustomer: {
                            name: result.imported_name!,
                            phone_no: result.imported_phone || '',
                            location: result.additional_data.location || null,
                            invoice_id: result.additional_data.invoice_id || null
                          }
                        }));
                      
                      if (prompts.length > 0) {
                        startNewCustomerCreation(prompts);
                      } else {
                        setCurrentStep('complete');
                      }
                    } else {
                      // No new customers to create, proceed to complete
                      setCurrentStep('complete');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✅ Auto-Resolve & Create New Customers
                </Button>
                
                <Button
                  onClick={() => {
                    // Skip new customer creation, just auto-resolve conflicts and import without phone numbers
                    actualConflicts.forEach((result) => {
                      const originalIndex = mappingResults.findIndex(r => r === result);
                      handleConflictResolution(originalIndex, 'keep_contact');
                    });
                    
                    // Auto-resolve no-match records to use imported data (without creating customers)
                    noMatchRecords.forEach((result) => {
                      const originalIndex = mappingResults.findIndex(r => r === result);
                      handleConflictResolution(originalIndex, 'use_imported');
                    });
                    
                    setCurrentStep('complete');
                  }}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  📋 Skip Customer Creation & Import All
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setCurrentStep('import')}>
            Back to Import
          </Button>
          <Button 
            onClick={handleResolveAllConflicts}
            disabled={conflictResolutions.length === 0}
          >
            Complete Import ({conflictResults.length} records)
          </Button>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => {
    const stats = WhatsAppMappingService.getMappingStatistics(mappingResults);
    
    // Enhanced: Strict phone number validation
    const messagingReadiness = {
      ready: mappingResults.every(result => {
        if (!result.final_phone || result.final_phone.trim() === '') return false;
        const cleanPhone = result.final_phone.replace(/[\s\-\(\)\+]/g, '');
        return /^\d{10,15}$/.test(cleanPhone);
      }),
      readyCount: mappingResults.filter(result => {
        if (!result.final_phone || result.final_phone.trim() === '') return false;
        const cleanPhone = result.final_phone.replace(/[\s\-\(\)\+]/g, '');
        return /^\d{10,15}$/.test(cleanPhone);
      }).length,
      totalCount: mappingResults.length,
      issues: mappingResults.filter(result => {
        if (!result.final_phone || result.final_phone.trim() === '') return true;
        const cleanPhone = result.final_phone.replace(/[\s\-\(\)\+]/g, '');
        return !/^\d{10,15}$/.test(cleanPhone);
      }).map(result => ({
        recordIndex: mappingResults.indexOf(result),
        issue: result.final_phone && result.final_phone.trim() !== '' ? 'Invalid phone number format' : 'Missing phone number',
        record: result
      }))
    };
    
    // Calculate totals from mapping results
    const totalOutstanding = mappingResults.reduce((sum, result) => {
      const outstanding = result.additional_data.outstanding || result.additional_data['Outstanding'] || 0;
      return sum + (typeof outstanding === 'number' ? outstanding : 0);
    }, 0);

    // Get all unique columns from the data
    const allColumns = mappingResults.length > 0 
      ? Array.from(new Set(mappingResults.flatMap(result => Object.keys(result.additional_data))))
      : [];

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Import Complete! 🎉</h3>
          <p className="text-gray-600">
            {mappingResults.length} records have been successfully processed and are ready to import.
          </p>
          
          {/* Phone Number Status */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{messagingReadiness.readyCount}</div>
                <div className="text-sm text-green-700">With Phone Numbers</div>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{messagingReadiness.issues.length}</div>
                <div className="text-sm text-orange-700">Missing Phone Numbers</div>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((messagingReadiness.readyCount / messagingReadiness.totalCount) * 100)}%
                </div>
                <div className="text-sm text-blue-700">Ready for Messaging</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Matched Records</p>
                <p className="text-xl font-bold text-green-600">{stats.exactMatches + stats.fuzzyMatches}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">New Records</p>
                <p className="text-xl font-bold text-blue-600">{stats.noMatches}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <CurrencyRupeeIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Outstanding</p>
                <p className="text-xl font-bold text-orange-600">₹{totalOutstanding.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* All Columns Display - Dynamic Import */}
        {allColumns.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Detected Columns ({allColumns.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
              {allColumns.map((column, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <DocumentTextIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-800 truncate">{column}</span>
                </div>
              ))}
            </div>
            
            {/* Auto-Detection Summary */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Auto-Detected Special Fields:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className={`h-4 w-4 ${mappingResults.some(r => r.final_name) ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-xs">Name: {mappingResults.some(r => r.final_name) ? 'Detected' : 'Not detected'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className={`h-4 w-4 ${mappingResults.some(r => r.final_phone) ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-xs">Phone: {mappingResults.some(r => r.final_phone) ? 'Detected' : 'Not detected'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className={`h-4 w-4 ${totalOutstanding > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-xs">Amount: {totalOutstanding > 0 ? 'Detected' : 'Not detected'}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Preview Table - All Columns */}
        {mappingResults.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Preview (First 5 Records)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {allColumns.map((column, index) => (
                      <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappingResults.slice(0, 5).map((result, rowIndex) => (
                    <tr key={rowIndex}>
                      {allColumns.map((column, colIndex) => (
                        <td key={colIndex} className="px-4 py-2 text-sm text-gray-900">
                          {result.additional_data[column] !== null && result.additional_data[column] !== undefined 
                            ? (typeof result.additional_data[column] === 'number' && column.toLowerCase().includes('amount')
                                ? `₹${result.additional_data[column].toLocaleString('en-IN')}`
                                : result.additional_data[column].toString())
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Post-Import Phone Number Management */}
        {!messagingReadiness.ready && (
          <Card className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                <div>
                  <h4 className="text-lg font-medium text-yellow-800">
                    Phone Numbers Missing
                  </h4>
                  <p className="text-sm text-yellow-700">
                    {messagingReadiness.issues.length} record(s) don't have phone numbers and won't be available for WhatsApp messaging
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-yellow-200">
                <h5 className="font-medium text-gray-900 mb-3">📱 Add Phone Numbers After Import</h5>
                <p className="text-sm text-gray-600 mb-4">
                  Don't worry! You can easily add phone numbers after importing using these options:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <PhoneIcon className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Phone Number Manager</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Use the "Manage Phone Numbers" button to add phone numbers from your customer database or manually
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserIcon className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Auto-Propagation</span>
                    </div>
                    <p className="text-xs text-green-700">
                      Add a phone number to any contact and it automatically applies to ALL records with the same name
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Tip:</strong> After import, click "Manage Phone Numbers" to see coverage statistics and easily add missing phone numbers using suggestions from your customer database.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
        


        {/* Preview of records without phone numbers */}
        {messagingReadiness.issues.length > 0 && messagingReadiness.issues.length <= 10 && (
          <Card className="p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              📋 Records Missing Phone Numbers ({messagingReadiness.issues.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {messagingReadiness.issues.map((issue, index) => (
                <div key={index} className="text-sm bg-gray-50 p-2 rounded border">
                  <span className="font-medium">{issue.record.final_name}</span>
                  {issue.record.additional_data.location && (
                    <span className="text-gray-600 ml-2">
                      • {issue.record.additional_data.location}
                    </span>
                  )}
                  {issue.record.additional_data.outstanding && (
                    <span className="text-blue-600 ml-2">
                      • ₹{issue.record.additional_data.outstanding.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              These contacts will be imported but won't be available for WhatsApp messaging until phone numbers are added.
            </p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={resetImport}>
            Import Different File
          </Button>
          <Button onClick={handleFinalImport} className="bg-green-600 hover:bg-green-700">
            Complete Import ({mappingResults.length} Records)
          </Button>
        </div>
      </div>
    );
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <DocumentArrowUpIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Smart Excel Import</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderStepIndicator()}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'import' && <div className="text-center py-8">
            <ArrowPathIcon className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900">Processing Excel File</h3>
            <p className="text-gray-600">Please wait while we import and analyze your data...</p>
          </div>}
          {currentStep === 'conflicts' && renderConflictsStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </div>
      
      {/* Enhanced Conflict Resolution Modal - simplified */}
      {showEnhancedConflictModal && mappingResults.length > 0 && (
        <EnhancedConflictResolutionModal
          conflicts={mappingResults.filter(result => 
            result.conflict_type && result.confidence !== 'exact'
          )}
          onResolveConflict={handleEnhancedConflictResolution}
          onBatchResolve={handleEnhancedBatchResolve}
          onComplete={handleConflictModalComplete}
          onSkipRemaining={handleSkipRemainingConflicts}
          onClose={() => setShowEnhancedConflictModal(false)}
        />
      )}
      
      {/* New Customer Creation Modal */}
      {showNewCustomerModal && newCustomerPrompts.length > 0 && currentPromptIndex < newCustomerPrompts.length && (
        <NewCustomerModal
          prompt={newCustomerPrompts[currentPromptIndex]}
          onConfirm={handleNewCustomerConfirm}
          onSkip={handleNewCustomerSkip}
          onCancel={handleNewCustomerCancel}
          isOpen={showNewCustomerModal}
        />
      )}
    </div>
  );
};
// Simplified conflict resolution - no complex component needed

export default EnhancedExcelImport;