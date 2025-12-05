'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { formatPhoneForDisplay, validatePhoneNumber } from '../../utils/phoneUtils';
import Button from '../ui/Button';

export interface InlinePhoneEditorProps {
  phone: string;
  onSave: (newPhone: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const InlinePhoneEditor: React.FC<InlinePhoneEditorProps> = ({
  phone,
  onSave,
  disabled = false,
  placeholder = 'Enter phone number',
  className,
  showIcon = true,
  size = 'md'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setPhoneValue(phone);
  }, [phone]);

  const sizeClasses = {
    sm: {
      text: 'text-xs',
      input: 'px-2 py-1 text-xs',
      button: 'sm',
      icon: 'h-3 w-3'
    },
    md: {
      text: 'text-sm',
      input: 'px-2 py-1 text-sm',
      button: 'sm',
      icon: 'h-4 w-4'
    },
    lg: {
      text: 'text-base',
      input: 'px-3 py-2 text-base',
      button: 'md',
      icon: 'h-5 w-5'
    }
  };

  const classes = sizeClasses[size];

  const handleStartEdit = useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    setPhoneValue(phone);
    setPhoneError(null);
  }, [phone, disabled]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setPhoneValue(phone);
    setPhoneError(null);
  }, [phone]);

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

  const handleSave = useCallback(async () => {
    if (phoneError || !phoneValue.trim()) {
      return;
    }

    // Don't save if value hasn't changed
    if (phoneValue.trim() === phone) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onSave(phoneValue.trim());
      setIsEditing(false);
      setPhoneError(null);
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Failed to update phone number');
    } finally {
      setIsUpdating(false);
    }
  }, [phoneValue, phoneError, phone, onSave]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !phoneError && phoneValue.trim()) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [phoneError, phoneValue, handleSave, handleCancelEdit]);

  if (isEditing) {
    return (
      <div className={clsx('flex flex-col space-y-2', className)}>
        <div className="flex items-center space-x-2">
          {showIcon && <PhoneIcon className={clsx(classes.icon, 'text-slate-500 flex-shrink-0')} />}
          <input
            type="tel"
            value={phoneValue}
            onChange={handlePhoneChange}
            onKeyDown={handleKeyPress}
            className={clsx(
              classes.input,
              'border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1',
              phoneError ? 'border-red-300 bg-red-50' : 'border-slate-300'
            )}
            placeholder={placeholder}
            autoFocus
            disabled={isUpdating}
          />
          <Button
            size={classes.button as 'sm' | 'md'}
            variant="primary"
            onClick={handleSave}
            disabled={!!phoneError || !phoneValue.trim() || isUpdating}
            loading={isUpdating}
            icon={<CheckIcon className="h-3 w-3" />}
          >
            Save
          </Button>
          <Button
            size={classes.button as 'sm' | 'md'}
            variant="ghost"
            onClick={handleCancelEdit}
            disabled={isUpdating}
            icon={<XMarkIcon className="h-3 w-3" />}
          >
            Cancel
          </Button>
        </div>
        
        {phoneError && (
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded ml-6">
            {phoneError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      {showIcon && <PhoneIcon className={clsx(classes.icon, 'text-slate-500')} />}
      <span className={clsx(classes.text, 'text-slate-700')}>
        {phone ? formatPhoneForDisplay(phone) : 'No phone number'}
      </span>
      {!disabled && (
        <button
          onClick={handleStartEdit}
          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit phone number"
        >
          <PencilIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default InlinePhoneEditor;