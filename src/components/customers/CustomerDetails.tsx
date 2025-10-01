'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PencilIcon, 
  TrashIcon, 
  PhoneIcon, 
  MapPinIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CustomerService } from '../../lib/services/customers';
import type { Customer } from '../../lib/supabase/types';

interface CustomerDetailsProps {
  customerId: string;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

interface CustomerWithBalance extends Customer {
  current_balance?: number;
  outstanding_amount?: number;
}

export function CustomerDetails({ customerId, onEdit, onDelete }: CustomerDetailsProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerWithBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load customer data
  const loadCustomer = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const customerData = await CustomerService.getWithBalance(customerId);
      setCustomer(customerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [customerId, loadCustomer]);

  const handleEdit = () => {
    if (customer) {
      if (onEdit) {
        onEdit(customer);
      } else {
        router.push(`/customers/${customer.id}/edit`);
      }
    }
  };

  const handleDelete = async () => {
    if (!customer) return;

    if (onDelete) {
      onDelete(customer);
    } else {
      if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
        try {
          await CustomerService.delete(customer.id);
          router.push('/customers');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete customer');
        }
      }
    }
  };

  const handleViewLedger = () => {
    if (customer) {
      router.push(`/customers/${customer.id}/ledger`);
    }
  };

  const handleManageDiscounts = () => {
    if (customer) {
      router.push(`/customers/${customer.id}/discounts`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
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
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={loadCustomer}>Try Again</Button>
        </div>
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-gray-600 mb-4">Customer not found</div>
          <Button onClick={() => router.push('/customers')}>Back to Customers</Button>
        </div>
      </Card>
    );
  }

  const hasDiscounts = customer.discount_rules && 
    (customer.discount_rules.line_discount || 
     customer.discount_rules.group_discount || 
     customer.discount_rules.brand_discount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-gray-600">Customer Details</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleEdit}
            icon={<PencilIcon className="h-4 w-4" />}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            icon={<TrashIcon className="h-4 w-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basic Information">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="h-4 w-4 text-primary-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Customer Name</p>
                  <p className="text-sm text-gray-600">{customer.name}</p>
                </div>
              </div>

              {customer.phone && (
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <PhoneIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Phone Number</p>
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                  </div>
                </div>
              )}

              {customer.gst_id && (
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TagIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">GST/VAT ID</p>
                    <p className="text-sm text-gray-600 font-mono">{customer.gst_id}</p>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <MapPinIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{customer.address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(customer.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Discount Rules */}
          <Card 
            title="Discount Rules" 
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageDiscounts}
              >
                Manage
              </Button>
            }
          >
            {hasDiscounts ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {customer.discount_rules.line_discount && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {customer.discount_rules.line_discount}%
                    </div>
                    <div className="text-sm text-blue-700">Line Discount</div>
                  </div>
                )}
                {customer.discount_rules.group_discount && (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {customer.discount_rules.group_discount}%
                    </div>
                    <div className="text-sm text-green-700">Group Discount</div>
                  </div>
                )}
                {customer.discount_rules.brand_discount && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {customer.discount_rules.brand_discount}%
                    </div>
                    <div className="text-sm text-purple-700">Brand Discount</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TagIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No discount rules configured</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageDiscounts}
                  className="mt-2"
                >
                  Add Discount Rules
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bank Balance */}
          <Card title="Bank Balance">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CurrencyRupeeIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">
                ₹{(customer.bank_balance || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-green-600">
                Available Balance
              </div>
            </div>
          </Card>

          {/* Outstanding Purchases */}
          <Card title="Outstanding Purchases">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CurrencyRupeeIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">
                ₹{(customer.outstanding_purchase_amount || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-red-600">
                Amount Due
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={handleViewLedger}
                className="w-full"
              >
                View Ledger
              </Button>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/invoices/new?customer=${customer.id}`)}
                className="w-full"
              >
                Create Invoice
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/customers/${customer.id}/rate-sheet`)}
                className="w-full"
              >
                Generate Rate Sheet
              </Button>
              <Button
                variant="outline"
                onClick={handleViewLedger}
                className="w-full"
              >
                View Transaction History
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card title="Recent Activity">
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No recent activity</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}