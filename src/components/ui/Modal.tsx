'use client';

import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    isOpen, 
    onClose, 
    title, 
    description, 
    children, 
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    className,
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-7xl'
    };

    const modalClasses = twMerge(
      clsx([
        'relative',
        'transform',
        'overflow-hidden',
        'rounded-lg',
        'bg-white',
        'px-4',
        'pb-4',
        'pt-5',
        'text-left',
        'shadow-xl',
        'transition-all',
        'sm:my-8',
        'sm:w-full',
        'sm:p-6',
        sizeClasses[size],
        className
      ])
    );

    return (
      <Transition appear show={isOpen} as={React.Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={closeOnOverlayClick ? onClose : () => {}}
        >
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={modalClasses} ref={ref} {...props}>
                  {(title || showCloseButton) && (
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        {title && (
                          <Dialog.Title
                            as="h3"
                            className="text-lg font-semibold leading-6 text-slate-900"
                          >
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="mt-1 text-sm text-slate-600">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                      {showCloseButton && (
                        <button
                          type="button"
                          className="ml-4 rounded-md bg-white text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-2">
                    {children}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;