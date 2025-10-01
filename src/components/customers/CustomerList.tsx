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
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon, HomeIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import DataTable from '../ui/DataTable';
import { CustomerService } from '../../lib/services/customers';
import type { Customer } from '../../lib/supabase/types';

interface CustomerListProps {
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
}

export function CustomerList({ onEdit, onDelete, onView }: CustomerListProps) {
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

  const handleEdit = (customer: Customer) => {
    if (onEdit) {
      onEdit(customer);
    } else {
      router.push(`/customers/${customer.id}/edit`);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (onDelete) {
      onDelete(customer);
    } else {
      if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
        try {
          await CustomerService.delete(customer.id);
          await loadCustomers(); // Reload the list
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete customer');
        }
      }
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
      columnHelper.accessor('phone', {
        header: 'Phone',
        cell: (info) => (
          <div className="text-gray-600">
            {info.getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.accessor('gst_id', {
        header: 'GST ID',
        cell: (info) => (
          <div className="text-gray-600 font-mono text-sm">
            {info.getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.accessor('address', {
        header: 'Address',
        cell: (info) => (
          <div className="text-gray-600 max-w-xs truncate">
            {info.getValue() || '-'}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(info.row.original)}
              icon={<PencilIcon className="h-4 w-4" />}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(info.row.original)}
              icon={<TrashIcon className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        ),
      }),
    ],
    [handleView, handleEdit, handleDelete, columnHelper]
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
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={loadCustomers}>Try Again</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
          <Button
            onClick={handleCreateNew}
            icon={<PlusIcon className="h-5 w-5" />}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              label=""
              placeholder="Search customers by name, phone, or GST ID..."
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
  );
}