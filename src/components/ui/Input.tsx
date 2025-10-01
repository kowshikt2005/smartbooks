'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    icon, 
    iconPosition = 'left',
    className, 
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseInputClasses = [
      'block',
      'w-full',
      'px-3',
      'py-2',
      'text-base',
      'border',
      'rounded-md',
      'shadow-sm',
      'transition-colors',
      'duration-200',
      'ease-in-out',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-0',
      'disabled:bg-slate-50',
      'disabled:text-slate-500',
      'disabled:cursor-not-allowed',
      'disabled:border-slate-200'
    ];

    const stateClasses = error
      ? [
          'border-red-300',
          'text-red-900',
          'placeholder-red-300',
          'focus:border-red-500',
          'focus:ring-red-500'
        ]
      : [
          'border-slate-300',
          'text-slate-900',
          'placeholder-slate-400',
          'focus:border-blue-500',
          'focus:ring-blue-500'
        ];

    const iconClasses = icon
      ? iconPosition === 'left'
        ? 'pl-10'
        : 'pr-10'
      : '';

    const inputClasses = twMerge(
      clsx([
        ...baseInputClasses,
        ...stateClasses,
        iconClasses,
        className
      ])
    );

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div 
              className={clsx(
                'absolute inset-y-0 flex items-center pointer-events-none',
                iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'
              )}
            >
              <span className={clsx('text-slate-400', error && 'text-red-400')}>
                {icon}
              </span>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            {...props}
          />
        </div>

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

Input.displayName = 'Input';

export default Input;