'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PhoneIcon,
  MapPinIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  TagIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ReceiptPercentIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { DashboardLayout } from '../layout';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CustomerService } from '../../lib/services/customers';
import type { Customer } from '../../lib/supabase/types';

interface CustomerDetailsProps {
  customerId: string;
}

interface CustomerWithBalance extends Customer {
  current_balance?: number;
  outstanding_amount?: number;
}

export function CustomerDetails({ customerId }: CustomerDetailsProps) {
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
                <Button onClick={loadCustomer}>Try Again</Button>
              </div>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!customer) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <Card>
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">Customer not found</div>
                <Button onClick={() => router.push('/customers')}>Back to Customers</Button>
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
                Back to Customers
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-gray-600">Customer Details</p>
              </div>
            </div>
            {/* Edit and Delete functionality removed */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Customer Name</p>
                      <p className="text-sm text-gray-600">{customer.name}</p>
                    </div>
                  </div>

                  {customer.phone_no && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <PhoneIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Phone Number</p>
                        <p className="text-sm text-gray-600">{customer.phone_no}</p>
                      </div>
                    </div>
                  )}

                  {customer.location && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <MapPinIcon className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Location</p>
                        <p className="text-sm text-gray-600">{customer.location}</p>
                      </div>
                    </div>
                  )}

                  {customer.month_year && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Month-Year</p>
                        <p className="text-sm text-gray-600">{customer.month_year}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* GRN Information */}
              <Card title="GRN Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.grn_no && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">GRN Number</p>
                        <p className="text-sm text-gray-600 font-mono">{customer.grn_no}</p>
                      </div>
                    </div>
                  )}

                  {customer.grn_date && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">GRN Date</p>
                        <p className="text-sm text-gray-600">
                          {new Date(customer.grn_date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Invoice Information */}
              <Card title="Invoice Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.invoice_id && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <TagIcon className="h-4 w-4 text-teal-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Invoice ID</p>
                        <p className="text-sm text-gray-600 font-mono">{customer.invoice_id}</p>
                      </div>
                    </div>
                  )}

                  {customer.invoice_num && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <ReceiptPercentIcon className="h-4 w-4 text-cyan-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Invoice Number</p>
                        <p className="text-sm text-gray-600 font-mono">{customer.invoice_num}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Payment Information */}
              <Card title="Payment Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.payment_date && (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Payment Date</p>
                        <p className="text-sm text-gray-600">
                          {new Date(customer.payment_date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
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


            </div>

            {/* Financial Information Sidebar */}
            <div className="space-y-6">
              {/* Adjusted Amount */}
              <Card title="Adjusted Amount">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CurrencyRupeeIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-900">
                    ₹{(customer.adjusted_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-blue-600">
                    Total Adjusted
                  </div>
                </div>
              </Card>

              {/* Paid Amount */}
              <Card title="Paid Amount">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BanknotesIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-900">
                    ₹{(customer.paid_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-green-600">
                    Amount Paid
                  </div>
                </div>
              </Card>

              {/* Balance Pays */}
              <Card title="Balance Amount">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CurrencyRupeeIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="text-3xl font-bold text-red-900">
                    ₹{(customer.balance_pays || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-red-600">
                    Balance Due
                  </div>
                </div>
              </Card>

              {/* TDS */}
              <Card title="TDS Amount">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ReceiptPercentIcon className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-orange-900">
                    ₹{(customer.tds || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-orange-600">
                    TDS Deducted
                  </div>
                </div>
              </Card>

              {/* Branding Adjustment */}
              <Card title="Branding Adjustment">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TagIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-900">
                    ₹{(customer.branding_adjustment || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-purple-600">
                    Branding Adjustment
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