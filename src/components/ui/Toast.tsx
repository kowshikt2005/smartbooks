'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Transition } from '@headlessui/react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className={clsx(
          'fixed z-50 flex flex-col space-y-2 pointer-events-none',
          positionClasses[position]
        )}
        style={{ maxWidth: '420px' }}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [show, setShow] = useState(true);

  const handleRemove = () => {
    setShow(false);
    setTimeout(onRemove, 150); // Wait for animation to complete
  };

  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-400',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700'
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-400',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700'
    }
  };

  const config = typeConfig[toast.type];
  const Icon = config.icon;

  const toastClasses = twMerge(
    clsx([
      'pointer-events-auto',
      'w-full',
      'max-w-sm',
      'overflow-hidden',
      'rounded-lg',
      'border',
      'shadow-lg',
      'ring-1',
      'ring-black',
      'ring-opacity-5',
      config.bgColor,
      config.borderColor
    ])
  );

  return (
    <Transition
      show={show}
      as={React.Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className={toastClasses}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className={clsx('h-6 w-6', config.iconColor)} aria-hidden="true" />
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className={clsx('text-sm font-medium', config.titleColor)}>
                {toast.title}
              </p>
              {toast.message && (
                <p className={clsx('mt-1 text-sm', config.messageColor)}>
                  {toast.message}
                </p>
              )}
              {toast.action && (
                <div className="mt-3">
                  <button
                    type="button"
                    className={clsx(
                      'rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
                      config.titleColor,
                      'hover:underline'
                    )}
                    onClick={toast.action.onClick}
                  >
                    {toast.action.label}
                  </button>
                </div>
              )}
            </div>
            <div className="ml-4 flex flex-shrink-0">
              <button
                type="button"
                className={clsx(
                  'inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                  config.titleColor,
                  'hover:opacity-75'
                )}
                onClick={handleRemove}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
};

// Convenience hooks for different toast types
export const useSuccessToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'success', title, message, ...options });
  }, [addToast]);
};

export const useErrorToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'error', title, message, ...options });
  }, [addToast]);
};

export const useWarningToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);
};

export const useInfoToast = () => {
  const { addToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'info', title, message, ...options });
  }, [addToast]);
};

export default ToastProvider;