'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PhoneIcon,
  MapPinIcon,
  DocumentTextIcon,
  TagIcon,
  ArrowLeftIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { DashboardLayout } from '../layout';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CustomerService } from '../../lib/services/customers';
import type { Customer } from '../../lib/supabase/types';
import toast from 'react-hot-toast';

interface ContactDetailsProps {
  customerId: string;
}

interface ContactWithBalance extends Customer {
  current_balance?: number;
  outstanding_amount?: number;
}

export function ContactDetails({ customerId }: ContactDetailsProps) {
  const router = useRouter();
  const [contact, setContact] = useState<ContactWithBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load contact data
  const loadContact = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const contactData = await CustomerService.getWithBalance(customerId);
      setContact(contactData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadContact();
  }, [customerId, loadContact]);

  const handleEdit = () => {
    router.push(`/customers/${customerId}/edit`);
  };

  const handleDelete = async () => {
    if (!contact) return;

    const confirmed = confirm(
      `Are you sure you want to delete contact "${contact.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await CustomerService.delete(customerId);
      toast.success(`Contact "${contact.name}" has been deleted successfully.`);
      router.push('/customers');
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact. Please try again.');
    }
  };





  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6 space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <Card>
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <Card>
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={loadContact}>Try Again</Button>
              </div>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!contact) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <Card>
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">Contact not found</div>
                <Button onClick={() => router.push('/customers')}>Back to Contacts</Button>
              </div>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }



  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/customers')}
                icon={<ArrowLeftIcon className="h-4 w-4" />}
              >
                Back to Contacts
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
                <p className="text-gray-600">Contact Details</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleEdit}
                icon={<PencilIcon className="h-4 w-4" />}
              >
                Edit Contact
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                icon={<TrashIcon className="h-4 w-4" />}
              >
                Delete Contact
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <div className="lg:col-span-3 space-y-6">
              <Card title="Contact Information">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Contact Name</p>
                      <p className="text-sm text-gray-600">{contact.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <PhoneIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Phone Number</p>
                      <p className="text-sm text-gray-600">{contact.phone_no}</p>
                    </div>
                  </div>

                  {contact.location && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <MapPinIcon className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Location</p>
                        <p className="text-sm text-gray-600">{contact.location}</p>
                      </div>
                    </div>
                  )}

                  {contact.invoice_id && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <TagIcon className="h-4 w-4 text-teal-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Invoice ID</p>
                        <p className="text-sm text-gray-600 font-mono">{contact.invoice_id}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">
                        {new Date(contact.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}