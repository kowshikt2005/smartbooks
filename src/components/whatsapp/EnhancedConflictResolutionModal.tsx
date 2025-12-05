'use client';

import React, { useState, useMemo } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilIcon,
  UserIcon,
  PhoneIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import type { MappingResult, ConflictResolution } from '../../lib/services/whatsappMapping';

interface EnhancedConflictResolutionModalProps {
  conflicts: MappingResult[];
  onResolveConflict: (index: number, resolution: ConflictResolution) => void;
  onBatchResolve: (action: 'keep_contact' | 'use_imported', conflictType?: string) => void;
  onComplete: () => void;
  onSkipRemaining?: () => void;
  onClose: () => void;
}

interface EditingState {
  isEditing: boolean;
  name: string;
  phone: string;
}

const EnhancedConflictResolutionModal: React.FC<EnhancedConflictResolutionModalProps> = ({
  conflicts,
  onResolveConflict,
  onBatchResolve,
  onComplete,
  onSkipRemaining,
  onClose
}) => {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [editingState, setEditingState] = useState<EditingState>({
    isEditing: false,
    name: '',
    phone: ''
  });
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<number>>(new Set());

  const currentConflict = conflicts[currentConflictIndex];
  
  // Group conflicts by type for batch operations
  const conflictGroups = useMemo(() => {
    const groups = {
      name_mismatch: conflicts.filter(c => c.conflict_type === 'name_mismatch'),
      phone_mismatch: conflicts.filter(c => c.conflict_type === 'phone_mismatch'),
      no_match: conflicts.filter(c => c.conflict_type === 'no_match')
    };
    return groups;
  }, [conflicts]);

  const handleResolveConflict = (action: ConflictResolution['action'], manualName?: string, manualPhone?: string) => {
    const resolution: ConflictResolution = {
      recordIndex: currentConflictIndex,
      action,
      manual_name: manualName,
      manual_phone: manualPhone
    };

    onResolveConflict(currentConflictIndex, resolution);
    const newResolvedConflicts = new Set([...resolvedConflicts, currentConflictIndex]);
    setResolvedConflicts(newResolvedConflicts);
    
    // Check if all conflicts are now resolved
    if (newResolvedConflicts.size === conflicts.length) {
      // All conflicts resolved, auto-complete after a short delay
      setTimeout(() => {
        onComplete();
      }, 1000);
    } else {
      // Move to next unresolved conflict
      const nextIndex = findNextUnresolvedConflict(currentConflictIndex);
      if (nextIndex !== -1) {
        setCurrentConflictIndex(nextIndex);
      }
    }
    
    setEditingState({ isEditing: false, name: '', phone: '' });
  };

  const findNextUnresolvedConflict = (fromIndex: number): number => {
    for (let i = fromIndex + 1; i < conflicts.length; i++) {
      if (!resolvedConflicts.has(i)) return i;
    }
    for (let i = 0; i < fromIndex; i++) {
      if (!resolvedConflicts.has(i)) return i;
    }
    return -1;
  };

  const startEditing = () => {
    setEditingState({
      isEditing: true,
      name: currentConflict.imported_name || '',
      phone: currentConflict.imported_phone || ''
    });
  };

  const cancelEditing = () => {
    setEditingState({ isEditing: false, name: '', phone: '' });
  };

  const saveManualEdit = () => {
    if (editingState.name.trim() && editingState.phone.trim()) {
      handleResolveConflict('manual_edit', editingState.name.trim(), editingState.phone.trim());
    }
  };

  const handleBatchResolve = (action: 'keep_contact' | 'use_imported', conflictType?: string) => {
    onBatchResolve(action, conflictType);
    
    let newResolvedConflicts: Set<number>;
    
    // Mark all conflicts of this type as resolved
    if (conflictType) {
      const conflictIndices = conflicts
        .map((conflict, index) => ({ conflict, index }))
        .filter(({ conflict }) => conflict.conflict_type === conflictType)
        .map(({ index }) => index);
      
      newResolvedConflicts = new Set([...resolvedConflicts, ...conflictIndices]);
    } else {
      // Mark all conflicts as resolved
      newResolvedConflicts = new Set(conflicts.map((_, index) => index));
    }
    
    setResolvedConflicts(newResolvedConflicts);
    
    // Check if all conflicts are now resolved
    if (newResolvedConflicts.size === conflicts.length) {
      // All conflicts resolved, auto-complete after a short delay
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  };

  const navigateToConflict = (index: number) => {
    setCurrentConflictIndex(index);
    setEditingState({ isEditing: false, name: '', phone: '' });
  };

  const getConflictTypeLabel = (conflictType: string | undefined): string => {
    switch (conflictType) {
      case 'name_mismatch': return 'Name Mismatch';
      case 'phone_mismatch': return 'Phone Mismatch';
      case 'no_match': return 'New Contact';
      default: return 'Unknown';
    }
  };

  const getConflictTypeColor = (conflictType: string | undefined): string => {
    switch (conflictType) {
      case 'name_mismatch': return 'text-orange-600 bg-orange-100';
      case 'phone_mismatch': return 'text-red-600 bg-red-100';
      case 'no_match': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!currentConflict) {
    return null;
  }

  const resolvedCount = resolvedConflicts.size;
  const totalConflicts = conflicts.length;
  const isComplete = resolvedCount === totalConflicts;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Enhanced Conflict Resolution</h2>
              <p className="text-sm text-gray-600">
                Resolving {resolvedCount}/{totalConflicts} conflicts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar - Conflict List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Conflicts ({totalConflicts})</h3>
              
              {/* Batch Actions */}
              <div className="mb-4 space-y-2">
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Batch Actions</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBatchResolve('keep_contact')}
                    className="text-xs"
                  >
                    Keep All Contact Data
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBatchResolve('use_imported')}
                    className="text-xs"
                  >
                    Use All Imported Data
                  </Button>
                </div>
                
                {/* Type-specific batch actions */}
                {Object.entries(conflictGroups).map(([type, typeConflicts]) => {
                  if (typeConflicts.length === 0) return null;
                  return (
                    <div key={type} className="mt-3">
                      <h5 className="text-xs text-gray-600 mb-1">
                        {getConflictTypeLabel(type)} ({typeConflicts.length})
                      </h5>
                      <div className="grid grid-cols-2 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBatchResolve('keep_contact', type)}
                          className="text-xs px-2 py-1"
                        >
                          Keep Contact
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBatchResolve('use_imported', type)}
                          className="text-xs px-2 py-1"
                        >
                          Use Imported
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Conflict List */}
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    onClick={() => navigateToConflict(index)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      index === currentConflictIndex
                        ? 'border-blue-500 bg-blue-50'
                        : resolvedConflicts.has(index)
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        #{index + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        {resolvedConflicts.has(index) && (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getConflictTypeColor(conflict.conflict_type)}`}>
                          {getConflictTypeLabel(conflict.conflict_type)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      <div className="truncate">{conflict.imported_name || 'No name'}</div>
                      <div className="truncate">{conflict.imported_phone || 'No phone'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Side-by-side Comparison */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Navigation */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToConflict(Math.max(0, currentConflictIndex - 1))}
                    disabled={currentConflictIndex === 0}
                    icon={<ArrowLeftIcon className="h-4 w-4" />}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Conflict {currentConflictIndex + 1} of {totalConflicts}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToConflict(Math.min(totalConflicts - 1, currentConflictIndex + 1))}
                    disabled={currentConflictIndex === totalConflicts - 1}
                    icon={<ArrowRightIcon className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`text-sm px-3 py-1 rounded-full ${getConflictTypeColor(currentConflict.conflict_type)}`}>
                    {getConflictTypeLabel(currentConflict.conflict_type)}
                  </span>
                  <span className="text-sm text-gray-600">
                    Confidence: {Math.round((currentConflict.confidence === 'exact' ? 1 : 
                                           currentConflict.confidence === 'fuzzy' ? 0.8 : 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Side-by-side Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Existing Contact Data */}
                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <UserIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-green-800">Contact Database</h3>
                      <p className="text-sm text-green-600">Existing record</p>
                    </div>
                  </div>
                  
                  {currentConflict.matched_contact ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          {currentConflict.matched_contact.name}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          {currentConflict.matched_contact.phone_no}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Location</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          {currentConflict.matched_contact.location || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Invoice ID</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          {currentConflict.matched_contact.invoice_id || 'Not set'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <UserIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No existing contact found</p>
                      <p className="text-sm">This will create a new contact</p>
                    </div>
                  )}
                </Card>

                {/* Imported Data */}
                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-blue-800">Imported Data</h3>
                      <p className="text-sm text-blue-600">From Excel file</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded border">
                        {currentConflict.imported_name || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded border">
                        {currentConflict.imported_phone || 'Not provided'}
                      </div>
                    </div>
                    
                    {/* Additional imported data */}
                    {Object.entries(currentConflict.additional_data).map(([key, value]) => {
                      if (key === 'rowNumber' || !value) return null;
                      return (
                        <div key={key}>
                          <label className="text-sm font-medium text-gray-700">{key}</label>
                          <div className="mt-1 p-2 bg-gray-50 rounded border">
                            {typeof value === 'number' && key.toLowerCase().includes('amount') 
                              ? `₹${value.toLocaleString('en-IN')}`
                              : value.toString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Manual Edit Section */}
              {editingState.isEditing && (
                <Card className="p-4 mb-6 bg-purple-50 border-purple-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <PencilIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-medium text-purple-800">Manual Edit</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        value={editingState.name}
                        onChange={(e) => setEditingState(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter contact name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <Input
                        value={editingState.phone}
                        onChange={(e) => setEditingState(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-4">
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveManualEdit}
                      disabled={!editingState.name.trim() || !editingState.phone.trim()}
                    >
                      Save Manual Edit
                    </Button>
                  </div>
                </Card>
              )}

              {/* Resolution Actions */}
              {!resolvedConflicts.has(currentConflictIndex) && (
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Resolution</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentConflict.matched_contact && (
                      <Button
                        onClick={() => handleResolveConflict('keep_contact')}
                        className="h-auto p-4 text-left"
                        variant="outline"
                      >
                        <div className="flex items-start space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mt-1" />
                          <div>
                            <div className="font-medium text-green-800">Keep Contact Data</div>
                            <div className="text-sm text-green-600 mt-1">
                              Use existing contact information
                            </div>
                          </div>
                        </div>
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handleResolveConflict('use_imported')}
                      className="h-auto p-4 text-left"
                      variant="outline"
                    >
                      <div className="flex items-start space-x-3">
                        <DocumentTextIcon className="h-5 w-5 text-blue-600 mt-1" />
                        <div>
                          <div className="font-medium text-blue-800">Use Imported Data</div>
                          <div className="text-sm text-blue-600 mt-1">
                            {currentConflict.matched_contact ? 'Update with imported information' : 'Create new contact'}
                          </div>
                        </div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={startEditing}
                      className="h-auto p-4 text-left"
                      variant="outline"
                    >
                      <div className="flex items-start space-x-3">
                        <PencilIcon className="h-5 w-5 text-purple-600 mt-1" />
                        <div>
                          <div className="font-medium text-purple-800">Manual Edit</div>
                          <div className="text-sm text-purple-600 mt-1">
                            Create custom resolution
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </Card>
              )}

              {/* Resolved Indicator */}
              {resolvedConflicts.has(currentConflictIndex) && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-medium text-green-800">Conflict Resolved</h3>
                      <p className="text-sm text-green-600">
                        {isComplete 
                          ? 'All conflicts resolved! Completing import automatically...'
                          : 'This conflict has been resolved and will be processed.'
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Progress: {resolvedCount}/{totalConflicts} conflicts resolved
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(resolvedCount / totalConflicts) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {!isComplete && onSkipRemaining && (
              <Button 
                variant="outline"
                onClick={onSkipRemaining}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                Skip Remaining ({totalConflicts - resolvedCount})
              </Button>
            )}
            <Button 
              onClick={onComplete}
              disabled={!isComplete && resolvedCount === 0}
              icon={<ClipboardDocumentListIcon className="h-4 w-4" />}
            >
              {isComplete ? 'Complete Resolution' : 
               resolvedCount > 0 ? `Continue with ${resolvedCount} Resolved` : 
               `Resolve ${totalConflicts - resolvedCount} More`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedConflictResolutionModal;