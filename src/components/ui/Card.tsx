'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    title, 
    subtitle, 
    actions, 
    padding = 'md', 
    children, 
    className, 
    ...props 
  }, ref) => {
    const baseClasses = [
      'bg-white',
      'border',
      'border-slate-200',
      'rounded-lg',
      'shadow-sm',
      'overflow-hidden'
    ];

    const paddingClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    };

    const cardClasses = twMerge(
      clsx([
        ...baseClasses,
        className
      ])
    );

    const contentPadding = paddingClasses[padding];

    return (
      <div ref={ref} className={cardClasses} {...props}>
        {(title || subtitle || actions) && (
          <div className={clsx('border-b border-slate-200 pb-4 mb-4', contentPadding)}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className="text-lg font-semibold text-slate-900 truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-600">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex-shrink-0 ml-4">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        <div className={clsx(contentPadding, (title || subtitle || actions) && '-mt-4')}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;