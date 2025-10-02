'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  MagnifyingGlassIcon, 
  ChatBubbleLeftRightIcon, 
  PhoneIcon,
  CurrencyRupeeIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../components/layout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import { CustomerService } from '../../lib/services/customers';
import type { Customer } from '../../lib/supabase/types';

interface WhatsAppCustomer {
  id: string;
  name: string;
  phone_no: string;
  invoice_id: string;
  invoice_num: string;
  grn_no: string;
  grn_date: string;
  location: string;
  month_year: string;
  balance_pays: number;
  paid_amount: number;
  adjusted_amount: number;
  tds: number;
  branding_adjustment: number;
}

const WhatsAppPage: React.FC = () => {
  const router = useRouter();
  const [customers, setCustomers] = useState<WhatsAppCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showOnlyOutstanding, setShowOnlyOutstanding] = useState(false);

  // Column helper for type safety
  const columnHelper = createColumnHelper<WhatsAppCustomer>();

  // Handle selection of individual customers
  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
    
    // Update select all state
    setSelectAll(newSelected.size === customers.length && customers.length > 0);
  };

  // Handle select all functionality
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCustomerIds = customers
        .filter(customer => customer.phone_no) // Only select customers with phone numbers
        .map(customer => customer.id);
      setSelectedCustomers(new Set(allCustomerIds));
    } else {
      setSelectedCustomers(new Set());
    }
    setSelectAll(checked);
  };

  // Handle bulk WhatsApp messages
  const handleBulkSendMessages = async () => {
    const selectedCustomerData = customers.filter(customer => 
      selectedCustomers.has(customer.id)
    );

    if (selectedCustomerData.length === 0) {
      alert('Please select at least one customer to send messages to.');
      return;
    }

    // Check if all selected customers have phone numbers
    const customersWithoutPhone = selectedCustomerData.filter(customer => !customer.phone_no);
    if (customersWithoutPhone.length > 0) {
      const customerNames = customersWithoutPhone.map(c => c.name).join(', ');
      alert(`The following customers don't have phone numbers: ${customerNames}`);
      return;
    }

    // Group customers by phone number to handle duplicates
    const customersByPhone = new Map<string, WhatsAppCustomer[]>();
    selectedCustomerData.forEach(customer => {
      const cleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
      if (!customersByPhone.has(cleanPhone)) {
        customersByPhone.set(cleanPhone, []);
      }
      customersByPhone.get(cleanPhone)!.push(customer);
    });

    const totalOutstanding = selectedCustomerData.reduce((sum, customer) => 
      sum + customer.balance_pays, 0
    );

    const uniquePhoneNumbers = customersByPhone.size;
    const duplicatePhones = selectedCustomerData.length - uniquePhoneNumbers;

    let confirmMessage = `Send WhatsApp messages to ${selectedCustomerData.length} customers?\n\n` +
      `Total outstanding amount: ₹${totalOutstanding.toLocaleString('en-IN')}\n` +
      `Unique phone numbers: ${uniquePhoneNumbers}\n`;

    if (duplicatePhones > 0) {
      confirmMessage += `Note: ${duplicatePhones} customers share phone numbers - their messages will be combined.\n`;
    }

    confirmMessage += `\nThis will open ${uniquePhoneNumbers} WhatsApp tabs/windows.\n\n` +
      `Important:\n` +
      `• Please allow popups for this site if prompted\n` +
      `• Each WhatsApp tab will open with a pre-filled message\n` +
      `• You can then send each message individually in WhatsApp`;

    const confirmed = confirm(confirmMessage);

    if (!confirmed) return;

    // Show progress feedback
    const originalButtonText = `Send Messages (${selectedCustomers.size})`;
    
    // Send messages grouped by phone number
    let processedCount = 0;
    for (const [phone, customersGroup] of customersByPhone) {
      processedCount++;
      
      // Update button text to show progress
      const button = document.querySelector('[data-bulk-send-button]') as HTMLButtonElement;
      if (button) {
        button.textContent = `Opening ${processedCount}/${uniquePhoneNumbers}...`;
      }
      
      // Send combined message for this phone number
      handleBulkSendToSameNumber(customersGroup);
      
      // Wait before sending next message
      if (processedCount < uniquePhoneNumbers) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // Reset button text and clear selection
    setTimeout(() => {
      const button = document.querySelector('[data-bulk-send-button]') as HTMLButtonElement;
      if (button) {
        button.textContent = originalButtonText;
      }
      setSelectedCustomers(new Set());
      setSelectAll(false);
    }, 1000);
  };

  // Handle sending messages to multiple customers with the same phone number
  const handleBulkSendToSameNumber = (customersGroup: WhatsAppCustomer[]) => {
    if (customersGroup.length === 0) return;

    const firstCustomer = customersGroup[0];
    
    if (!firstCustomer.phone_no) {
      console.error('No phone number for customer group');
      return;
    }

    let combinedMessage = '';

    if (customersGroup.length === 1) {
      // Single customer - use detailed message
      const customer = customersGroup[0];
      combinedMessage = `Dear ${customer.name},

Hope you are doing well! 

This is a friendly reminder regarding your invoice payment:

📋 *Invoice Details:*
• Invoice ID: ${customer.invoice_id}
• Invoice Number: ${customer.invoice_num}
• GRN Number: ${customer.grn_no}
${customer.grn_date ? `• GRN Date: ${new Date(customer.grn_date).toLocaleDateString('en-IN')}` : ''}
${customer.location ? `• Location: ${customer.location}` : ''}
${customer.month_year ? `• Period: ${customer.month_year}` : ''}

💰 *Payment Summary:*
• Total Adjusted Amount: ₹${customer.adjusted_amount.toLocaleString('en-IN')}
• Amount Paid: ₹${customer.paid_amount.toLocaleString('en-IN')}
• TDS Deducted: ₹${customer.tds.toLocaleString('en-IN')}
• Branding Adjustment: ₹${customer.branding_adjustment.toLocaleString('en-IN')}
• *Outstanding Balance: ₹${customer.balance_pays.toLocaleString('en-IN')}*

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
SmartBooks Team`;
    } else {
      // Multiple customers with same phone - combine messages with detailed info
      const totalOutstanding = customersGroup.reduce((sum, customer) => sum + customer.balance_pays, 0);
      const totalAdjusted = customersGroup.reduce((sum, customer) => sum + customer.adjusted_amount, 0);
      const totalPaid = customersGroup.reduce((sum, customer) => sum + customer.paid_amount, 0);
      const totalTds = customersGroup.reduce((sum, customer) => sum + customer.tds, 0);
      
      combinedMessage = `Dear Customer,

Hope you are doing well! 

This is a friendly reminder regarding outstanding amounts for multiple invoices:

📋 *Invoice Details:*
`;

      // Add each customer's details
      customersGroup.forEach((customer, index) => {
        combinedMessage += `
${index + 1}. *${customer.name}*
   • Invoice: ${customer.invoice_id} (${customer.invoice_num})
   • GRN: ${customer.grn_no}
   ${customer.location ? `• Location: ${customer.location}` : ''}
   • Outstanding: ₹${customer.balance_pays.toLocaleString('en-IN')}
`;
      });

      combinedMessage += `
💰 *Combined Payment Summary:*
• Total Adjusted Amount: ₹${totalAdjusted.toLocaleString('en-IN')}
• Total Amount Paid: ₹${totalPaid.toLocaleString('en-IN')}
• Total TDS Deducted: ₹${totalTds.toLocaleString('en-IN')}
• *Total Outstanding Balance: ₹${totalOutstanding.toLocaleString('en-IN')}*

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
SmartBooks Team`;
    }

    // Clean and format the phone number
    let cleanPhone = firstCustomer.phone_no.replace(/[\s\-\(\)\+]/g, '');
    
    // Handle different phone number formats
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '91' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone;
    }
    
    // Validate phone number length
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      console.error(`Invalid phone number for customer group: ${firstCustomer.phone_no}`);
      return;
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(combinedMessage);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, '_blank');
  };

  // Handle WhatsApp message action (with optional confirmation for single messages)
  const handleSendMessage = (customer: WhatsAppCustomer, skipConfirmation = false) => {
    if (!customer.phone_no) {
      alert('This customer does not have a phone number');
      return;
    }
    
    // Create the prebuilt message with professional template including invoice details
    const message = `Dear ${customer.name},

Hope you are doing well! 

This is a friendly reminder regarding your invoice payment:

📋 *Invoice Details:*
• Invoice ID: ${customer.invoice_id}
• Invoice Number: ${customer.invoice_num}
• GRN Number: ${customer.grn_no}
${customer.grn_date ? `• GRN Date: ${new Date(customer.grn_date).toLocaleDateString('en-IN')}` : ''}
${customer.location ? `• Location: ${customer.location}` : ''}
${customer.month_year ? `• Period: ${customer.month_year}` : ''}

💰 *Payment Summary:*
• Total Adjusted Amount: ₹${customer.adjusted_amount.toLocaleString('en-IN')}
• Amount Paid: ₹${customer.paid_amount.toLocaleString('en-IN')}
• TDS Deducted: ₹${customer.tds.toLocaleString('en-IN')}
• Branding Adjustment: ₹${customer.branding_adjustment.toLocaleString('en-IN')}
• *Outstanding Balance: ₹${customer.balance_pays.toLocaleString('en-IN')}*

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your business!

Best regards,
SmartBooks Team`;
    
    // Show confirmation dialog only for single messages (not bulk)
    if (!skipConfirmation) {
      const confirmed = confirm(
        `Send WhatsApp message to ${customer.name} (${customer.phone_no})?\n\nMessage preview:\n"${message}"`
      );
      
      if (!confirmed) return;
    }
    
    // Clean and format the phone number
    let cleanPhone = customer.phone_no.replace(/[\s\-\(\)\+]/g, '');
    
    // Handle different phone number formats
    if (cleanPhone.startsWith('0')) {
      // Remove leading 0 and add country code
      cleanPhone = '91' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
      // Add Indian country code for 10-digit numbers
      cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      // Already has country code, use as is
      cleanPhone = cleanPhone;
    }
    
    // Validate phone number length
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      console.error(`Invalid phone number for ${customer.name}: ${customer.phone_no}`);
      return;
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, '_blank');
  };

  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedCustomers.has(row.original.id)}
              onChange={(e) => handleSelectCustomer(row.original.id, e.target.checked)}
              disabled={!row.original.phone_no}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Customer Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('phone_no', {
        header: 'Phone Number',
        cell: (info) => (
          <div className="flex items-center text-gray-600">
            <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
            {info.getValue() || 'No phone number'}
          </div>
        ),
      }),
      columnHelper.accessor('invoice_id', {
        header: 'Invoice ID',
        cell: (info) => (
          <div className="text-gray-600 font-mono text-sm">
            {info.getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.accessor('paid_amount', {
        header: 'Paid Amount',
        cell: (info) => (
          <div className="flex items-center text-green-600 font-medium">
            <CurrencyRupeeIcon className="h-4 w-4 mr-1" />
            {info.getValue().toLocaleString('en-IN')}
          </div>
        ),
      }),
      columnHelper.accessor('balance_pays', {
        header: 'Balance Amount',
        cell: (info) => (
          <div className="flex items-center text-red-600 font-medium">
            <CurrencyRupeeIcon className="h-4 w-4 mr-1" />
            {info.getValue().toLocaleString('en-IN')}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendMessage(info.row.original)}
              icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
              disabled={!info.row.original.phone_no}
            >
              Send Message
            </Button>
          </div>
        ),
      }),
    ],
    [columnHelper]
  );

  // Load customers with phone numbers and outstanding amounts
  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all customers with their financial data
      const result = await CustomerService.getAll({
        orderBy: 'name',
        orderDirection: 'asc',
      });
      
      // Filter and transform data for WhatsApp view
      const whatsappCustomers: WhatsAppCustomer[] = result.data
        .map(customer => ({
          id: customer.id,
          name: customer.name,
          phone_no: customer.phone_no || '',
          invoice_id: customer.invoice_id || '',
          invoice_num: customer.invoice_num || '',
          grn_no: customer.grn_no || '',
          grn_date: customer.grn_date || '',
          location: customer.location || '',
          month_year: customer.month_year || '',
          balance_pays: customer.balance_pays || 0,
          paid_amount: customer.paid_amount || 0,
          adjusted_amount: customer.adjusted_amount || 0,
          tds: customer.tds || 0,
          branding_adjustment: customer.branding_adjustment || 0,
        }));
      
      setCustomers(whatsappCustomers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers based on outstanding amount filter
  const filteredCustomers = useMemo(() => {
    if (showOnlyOutstanding) {
      return customers.filter(customer => customer.balance_pays > 0);
    }
    return customers;
  }, [customers, showOnlyOutstanding]);

  // Create table instance
  const table = useReactTable({
    data: filteredCustomers,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchTerm,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearchTerm,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Calculate totals based on filtered data
  const totalOutstanding = filteredCustomers.reduce((sum, customer) => sum + customer.balance_pays, 0);
  const customersWithPhone = filteredCustomers.filter(customer => customer.phone_no).length;
  const customersWithOutstanding = filteredCustomers.filter(customer => customer.balance_pays > 0).length;

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6">
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
                <Button onClick={loadCustomers}>Try Again</Button>
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
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Messages</h1>
              <p className="text-gray-600">Send payment reminders and messages to customers</p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                icon={<HomeIcon className="h-5 w-5" />}
              >
                Dashboard
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <PhoneIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Customers with Phone</p>
                  <p className="text-2xl font-bold text-gray-900">{customersWithPhone}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 mr-4">
                  <CurrencyRupeeIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Outstanding Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{customersWithOutstanding}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100 mr-4">
                  <CurrencyRupeeIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalOutstanding.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Bulk Actions */}
          <Card className="mb-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1">
                <Input
                  label=""
                  placeholder="Search customers by name or phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                />
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Filter Toggle */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyOutstanding}
                    onChange={(e) => setShowOnlyOutstanding(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">Outstanding only</span>
                </label>

                {/* Quick Select Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const outstandingCustomers = filteredCustomers
                      .filter(customer => customer.balance_pays > 0 && customer.phone_no)
                      .map(customer => customer.id);
                    setSelectedCustomers(new Set(outstandingCustomers));
                  }}
                >
                  Select Outstanding
                </Button>

                {/* Bulk Actions */}
                {selectedCustomers.size > 0 && (
                  <>
                    <span className="text-sm text-gray-600">
                      {selectedCustomers.size} selected
                    </span>
                    <Button
                      onClick={handleBulkSendMessages}
                      icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
                      className="bg-green-600 hover:bg-green-700"
                      data-bulk-send-button="true"
                    >
                      Send Messages ({selectedCustomers.size})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCustomers(new Set());
                        setSelectAll(false);
                      }}
                    >
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Customer Table */}
          <Card>
            <div className="overflow-hidden">
              <DataTable
                table={table}
                loading={loading}
                emptyMessage="No customers found"
              />
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}{' '}
                  of {table.getFilteredRowModel().rows.length} customers
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default WhatsAppPage;