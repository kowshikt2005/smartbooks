'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  ExpandedState,
  getExpandedRowModel,
} from '@tanstack/react-table';
import { 
  MagnifyingGlassIcon, 

  DocumentTextIcon,
  CurrencyRupeeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import DataTable from '../ui/DataTable';
import { LedgerService } from '../../lib/services/ledger';
import { CustomerService } from '../../lib/services/customers';
import type { LedgerEntry, Customer } from '../../lib/supabase/types';

interface CustomerLedgerProps {
  customerId: string;
}

interface LedgerEntryWithInvoice extends LedgerEntry {
  invoices?: {
    invoice_number: string;
    type: string;
    invoice_date: string;
  };
}

export function CustomerLedger({ customerId }: CustomerLedgerProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryWithInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Column helper for type safety
  const columnHelper = createColumnHelper<LedgerEntryWithInvoice>();

  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'expander',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={() => row.toggleExpanded()}
            className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600"
          >
            {row.getIsExpanded() ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        ),
      }),
      columnHelper.accessor('transaction_date', {
        header: 'Date',
        cell: (info) => (
          <div className="text-sm">
            {new Date(info.getValue()).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        ),
      }),
      columnHelper.accessor('transaction_type', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue();
          const colorMap = {
            invoice: 'bg-blue-100 text-blue-800',
            payment: 'bg-green-100 text-green-800',
            adjustment: 'bg-yellow-100 text-yellow-800',
            return: 'bg-purple-100 text-purple-800',
          };
          return (
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
            }`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          );
        },
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => (
          <div className="max-w-xs">
            <div className="text-sm font-medium text-gray-900 truncate">
              {info.getValue() || '-'}
            </div>
            {info.row.original.invoices && (
              <div className="text-xs text-gray-500">
                {info.row.original.invoices.invoice_number}
              </div>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('debit_amount', {
        header: 'Debit',
        cell: (info) => {
          const amount = info.getValue();
          return amount > 0 ? (
            <div className="text-right">
              <div className="text-sm font-medium text-red-600">
                ₹{amount.toLocaleString('en-IN')}
              </div>
              <ArrowUpIcon className="h-3 w-3 text-red-500 inline ml-1" />
            </div>
          ) : (
            <div className="text-right text-gray-400">-</div>
          );
        },
      }),
      columnHelper.accessor('credit_amount', {
        header: 'Credit',
        cell: (info) => {
          const amount = info.getValue();
          return amount > 0 ? (
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">
                ₹{amount.toLocaleString('en-IN')}
              </div>
              <ArrowDownIcon className="h-3 w-3 text-green-500 inline ml-1" />
            </div>
          ) : (
            <div className="text-right text-gray-400">-</div>
          );
        },
      }),
      columnHelper.accessor('balance', {
        header: 'Balance',
        cell: (info) => {
          const balance = info.getValue();
          return (
            <div className="text-right">
              <div className={`text-sm font-bold ${
                balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹{Math.abs(balance).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-500">
                {balance >= 0 ? 'Credit' : 'Outstanding'}
              </div>
            </div>
          );
        },
      }),
    ],
    [columnHelper]
  );

  // Create table instance
  const table = useReactTable({
    data: ledgerEntries,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchTerm,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearchTerm,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Load customer and ledger data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load customer info
      const customerData = await CustomerService.getById(customerId);
      setCustomer(customerData);

      // Load ledger entries
      const ledgerResult = await LedgerService.getCustomerLedger(customerId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      // Filter by transaction type if specified
      let filteredEntries = ledgerResult.data;
      if (transactionTypeFilter) {
        filteredEntries = filteredEntries.filter(
          entry => entry.transaction_type === transactionTypeFilter
        );
      }

      setLedgerEntries(filteredEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }, [customerId, dateFrom, dateTo, transactionTypeFilter]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
  }, [customerId, dateFrom, dateTo, transactionTypeFilter, loadData]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
    const currentBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;
    
    return {
      totalDebits,
      totalCredits,
      currentBalance,
      transactionCount: ledgerEntries.length,
    };
  }, [ledgerEntries]);

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setTransactionTypeFilter('');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
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
          <Button onClick={loadData}>Try Again</Button>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 text-primary-600" />
            Customer Ledger
          </h1>
          <p className="text-gray-600">{customer.name} - Transaction History</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/customers/${customerId}`)}
        >
          Back to Customer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyRupeeIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Current Balance</p>
              <p className={`text-2xl font-bold ${
                summary.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₹{Math.abs(summary.currentBalance).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500">
                {summary.currentBalance >= 0 ? 'Credit Balance' : 'Outstanding'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowUpIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Debits</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{summary.totalDebits.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowDownIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Credits</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{summary.totalCredits.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.transactionCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card title="Filters" actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          icon={<FunnelIcon className="h-4 w-4" />}
        >
          Clear Filters
        </Button>
      }>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Search"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5" />}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <select
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="payment">Payment</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card title="Transaction History">
        <div className="overflow-hidden">
          <DataTable
            table={table}
            loading={loading}
            emptyMessage="No transactions found"
            renderSubComponent={({ row }) => (
              <div className="px-6 py-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Transaction ID:</dt>
                        <dd className="font-mono text-xs">{row.original.id.slice(0, 8)}...</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Date & Time:</dt>
                        <dd>{new Date(row.original.transaction_date).toLocaleString('en-IN')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Type:</dt>
                        <dd className="capitalize">{row.original.transaction_type}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  {row.original.invoices && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Invoice Details</h4>
                      <dl className="space-y-1">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Invoice Number:</dt>
                          <dd className="font-mono">{row.original.invoices.invoice_number}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Invoice Type:</dt>
                          <dd className="capitalize">{row.original.invoices.type}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Invoice Date:</dt>
                          <dd>{new Date(row.original.invoices.invoice_date).toLocaleDateString('en-IN')}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
                
                {row.original.description && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                    <p className="text-gray-600">{row.original.description}</p>
                  </div>
                )}
              </div>
            )}
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
              of {table.getFilteredRowModel().rows.length} transactions
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
  );
}