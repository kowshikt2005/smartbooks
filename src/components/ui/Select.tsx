'use client';

import React, { useState, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  searchable?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ 
    label, 
    placeholder = 'Select an option...', 
    error, 
    helperText, 
    options, 
    value, 
    onChange, 
    searchable = false,
    disabled = false,
    required = false,
    className,
    ...props 
  }, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const selectId = `select-${Math.random().toString(36).substr(2, 9)}`;

    const filteredOptions = useMemo(() => {
      if (!searchable || !searchQuery) return options;
      
      return options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [options, searchQuery, searchable]);

    const selectedOption = options.find(option => option.value === value);

    const buttonClasses = twMerge(
      clsx([
        'relative',
        'w-full',
        'cursor-default',
        'rounded-md',
        'border',
        'bg-white',
        'py-2',
        'pl-3',
        'pr-10',
        'text-left',
        'shadow-sm',
        'transition-colors',
        'duration-200',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-0',
        error
          ? [
              'border-red-300',
              'text-red-900',
              'focus:border-red-500',
              'focus:ring-red-500'
            ]
          : [
              'border-slate-300',
              'text-slate-900',
              'focus:border-blue-500',
              'focus:ring-blue-500'
            ],
        disabled && [
          'bg-slate-50',
          'text-slate-500',
          'cursor-not-allowed',
          'border-slate-200'
        ],
        className
      ])
    );

    return (
      <div ref={ref} className="w-full" {...props}>
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <Listbox 
          value={value || ''} 
          onChange={(newValue) => onChange?.(newValue)}
          disabled={disabled}
        >
          <div className="relative">
            <Listbox.Button className={buttonClasses}>
              <span className="block truncate">
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>

            <Transition
              as={React.Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {searchable && (
                  <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-slate-200">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-10 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search options..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {filteredOptions.length === 0 ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-slate-700">
                    {searchQuery ? 'No options found.' : 'No options available.'}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      className={({ active, disabled: optionDisabled }) =>
                        clsx(
                          'relative cursor-default select-none py-2 pl-10 pr-4',
                          active && !optionDisabled && 'bg-blue-100 text-blue-900',
                          optionDisabled && 'text-slate-400 cursor-not-allowed',
                          !active && !optionDisabled && 'text-slate-900'
                        )
                      }
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={clsx(
                              'block truncate',
                              selected ? 'font-medium' : 'font-normal'
                            )}
                          >
                            {option.label}
                          </span>
                          {selected && (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>

        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p className="mt-1 text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;