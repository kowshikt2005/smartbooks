'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon, 
    children, 
    className, 
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = [
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'font-medium',
      'rounded-md',
      'border',
      'transition-all',
      'duration-200',
      'ease-in-out',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'disabled:pointer-events-none'
    ];

    const variantClasses = {
      primary: [
        'bg-blue-600',
        'text-white',
        'border-blue-600',
        'hover:bg-blue-700',
        'hover:border-blue-700',
        'focus:ring-blue-500',
        'active:bg-blue-800'
      ],
      secondary: [
        'bg-slate-100',
        'text-slate-900',
        'border-slate-200',
        'hover:bg-slate-200',
        'hover:border-slate-300',
        'focus:ring-slate-500',
        'active:bg-slate-300'
      ],
      outline: [
        'bg-transparent',
        'text-blue-600',
        'border-blue-600',
        'hover:bg-blue-50',
        'hover:text-blue-700',
        'focus:ring-blue-500',
        'active:bg-blue-100'
      ],
      ghost: [
        'bg-transparent',
        'text-slate-600',
        'border-transparent',
        'hover:bg-slate-100',
        'hover:text-slate-900',
        'focus:ring-slate-500',
        'active:bg-slate-200'
      ],
      danger: [
        'bg-red-600',
        'text-white',
        'border-red-600',
        'hover:bg-red-700',
        'hover:border-red-700',
        'focus:ring-red-500',
        'active:bg-red-800'
      ]
    };

    const sizeClasses = {
      sm: ['px-3', 'py-1.5', 'text-sm'],
      md: ['px-4', 'py-2', 'text-base'],
      lg: ['px-6', 'py-3', 'text-lg']
    };

    const classes = twMerge(
      clsx([
        ...baseClasses,
        ...variantClasses[variant],
        ...sizeClasses[size],
        loading && 'cursor-wait',
        className
      ])
    );

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;