'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
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
import { MagnifyingGlassIcon, EyeIcon, HomeIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

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
    router.push(`/customers/${customer.id}/edit`);
  };

  const handleDelete = async (customer: Customer) => {
    const confirmed = confirm(
      `Are you sure you want to delete contact "${customer.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await CustomerService.delete(customer.id);
      setCustomers(customers.filter(c => c.id !== customer.id));
      toast.success(`Contact "${customer.name}" has been deleted successfully.`);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete contact. Please try again.');
    }
  };

  const handleCreateNew = () => {
    router.push('/customers/new');
  };

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
      const allCustomerIds = customers.map(customer => customer.id);
      setSelectedCustomers(new Set(allCustomerIds));
    } else {
      setSelectedCustomers(new Set());
    }
    setSelectAll(checked);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) {
      toast.error('Please select contacts to delete');
      return;
    }

    const selectedCustomerNames = customers
      .filter(customer => selectedCustomers.has(customer.id))
      .map(customer => customer.name);

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedCustomers.size} contact(s)?\n\n` +
      `Contacts to be deleted:\n${selectedCustomerNames.join('\n')}\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const selectedIds = Array.from(selectedCustomers);
      await CustomerService.deleteMultiple(selectedIds);
      
      // Remove deleted customers from the list
      setCustomers(customers.filter(customer => !selectedCustomers.has(customer.id)));
      setSelectedCustomers(new Set());
      setSelectAll(false);
      
      toast.success(`Successfully deleted ${selectedIds.length} contact(s)`);
    } catch (error) {
      console.error('Error deleting customers:', error);
      toast.error('Failed to delete contacts. Please try again.');
    }
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Contact Name',
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
              title="View contact details"
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(info.row.original)}
              icon={<PencilIcon className="h-4 w-4" />}
              title="Edit contact"
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(info.row.original)}
              icon={<TrashIcon className="h-4 w-4" />}
              title="Delete contact"
            >
              Delete
            </Button>
          </div>
        ),
      }),
    ],
    [handleView, handleEdit, handleDelete, handleSelectCustomer, handleSelectAll, selectedCustomers, selectAll, columnHelper]
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
      // Clear selection when customers are reloaded
      setSelectedCustomers(new Set());
      setSelectAll(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
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
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <p className="text-gray-600">Manage your contact database</p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                icon={<HomeIcon className="h-5 w-5" />}
              >
                Dashboard
              </Button>
              {selectedCustomers.size > 0 && (
                <Button
                  variant="danger"
                  onClick={handleBulkDelete}
                  icon={<TrashIcon className="h-5 w-5" />}
                >
                  Delete Selected ({selectedCustomers.size})
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleCreateNew}
                icon={<PlusIcon className="h-5 w-5" />}
              >
                Create Contact
              </Button>
            </div>
          </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              label=""
              placeholder="Search contacts by name, phone, or invoice details..."
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
            emptyMessage="No contacts found"
          />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} contacts
            </span>
            {selectedCustomers.size > 0 && (
              <span className="text-sm text-blue-600 font-medium">
                {selectedCustomers.size} contact{selectedCustomers.size !== 1 ? 's' : ''} selected
              </span>
            )}
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