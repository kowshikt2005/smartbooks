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
import { MagnifyingGlassIcon, EyeIcon, HomeIcon } from '@heroicons/react/24/outline';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { DashboardLayout } from '../layout';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import DataTable from '../ui/DataTable';
import { CustomerService } from '../../lib/services/customers';
import type { Customer } from '../../lib/supabase/types';

interface CustomerListProps {
  onView?: (customer: Customer) => void;
}

export function CustomerList({ onView }: CustomerListProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Column helper for type safety
  const columnHelper = createColumnHelper<Customer>();

  // Handle actions
  const handleView = (customer: Customer) => {
    if (onView) {
      onView(customer);
    } else {
      router.push(`/customers/${customer.id}`);
    }
  };



  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Customer Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('phone_no', {
        header: 'Phone',
        cell: (info) => (
          <div className="text-gray-600">
            {info.getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: (info) => (
          <div className="text-gray-600 max-w-xs truncate">
            {info.getValue() || '-'}
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
      columnHelper.accessor('grn_no', {
        header: 'GRN No',
        cell: (info) => (
          <div className="text-gray-600 font-mono text-sm">
            {info.getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.accessor('month_year', {
        header: 'Month-Year',
        cell: (info) => (
          <div className="text-gray-600 text-sm">
            {info.getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.accessor('paid_amount', {
        header: 'Paid Amount',
        cell: (info) => (
          <div className="text-green-600 font-medium">
            ₹{info.getValue()?.toLocaleString('en-IN') || '0'}
          </div>
        ),
      }),
      columnHelper.accessor('balance_pays', {
        header: 'Balance',
        cell: (info) => (
          <div className="text-red-600 font-medium">
            ₹{info.getValue()?.toLocaleString('en-IN') || '0'}
          </div>
        ),
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        cell: (info) => (
          <div className="text-gray-500 text-sm">
            {new Date(info.getValue()).toLocaleDateString()}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(info.row.original)}
              icon={<EyeIcon className="h-4 w-4" />}
            >
              View
            </Button>
          </div>
        ),
      }),
    ],
    [handleView, columnHelper]
  );

  // Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await CustomerService.getAll({
        orderBy: 'name',
        orderDirection: 'asc',
      });
      setCustomers(result.data);
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

  // Create table instance
  const table = useReactTable({
    data: customers,
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

  const handleCreateNew = () => {
    router.push('/customers/new');
  };

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
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
              <p className="text-gray-600">Manage your customer database</p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                icon={<HomeIcon className="h-5 w-5" />}
              >
                Dashboard
              </Button>
              {/* Create customer option removed as per requirements */}
            </div>
          </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              label=""
              placeholder="Search customers by name, phone, or invoice details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
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
}