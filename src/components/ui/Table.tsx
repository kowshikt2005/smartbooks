'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  Row,
} from '@tanstack/react-table';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Button from './Button';
import Input from './Input';

export interface TableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  pagination?: boolean;
  sorting?: boolean;
  filtering?: boolean;
  selection?: boolean;
  loading?: boolean;
  onRowClick?: (row: Row<TData>) => void;
  className?: string;
}

function Table<TData>({
  data,
  columns,
  pagination = true,
  sorting = true,
  filtering = true,
  selection = false,
  loading = false,
  onRowClick,
  className,
}: TableProps<TData>) {
  const [sortingState, setSortingState] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSortingState,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: sorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: filtering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: selection ? setRowSelection : undefined,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting: sortingState,
      columnFilters,
      columnVisibility,
      rowSelection: selection ? rowSelection : {},
      globalFilter,
    },
    enableRowSelection: selection,
    enableMultiRowSelection: selection,
  });

  const tableClasses = twMerge(
    clsx([
      'w-full',
      'border-collapse',
      'bg-white',
      'shadow-sm',
      'rounded-lg',
      'overflow-hidden',
      'border',
      'border-slate-200',
      className
    ])
  );

  return (
    <div className="space-y-4">
      {filtering && (
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={tableClasses}>
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={clsx(
                      'px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-slate-100'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center space-x-1">
                      <span>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </span>
                      {sorting && header.column.getCanSort() && (
                        <span className="flex flex-col">
                          {header.column.getIsSorted() === 'desc' ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : header.column.getIsSorted() === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <div className="h-4 w-4 opacity-50">
                              <ChevronUpIcon className="h-2 w-4" />
                              <ChevronDownIcon className="h-2 w-4 -mt-1" />
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td 
                  colSpan={table.getAllColumns().length}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    'hover:bg-slate-50 transition-colors duration-150',
                    onRowClick && 'cursor-pointer',
                    row.getIsSelected() && 'bg-blue-50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-slate-900"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-slate-700">
              Showing{' '}
              <span className="font-medium">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
              </span>{' '}
              of{' '}
              <span className="font-medium">
                {table.getFilteredRowModel().rows.length}
              </span>{' '}
              results
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              icon={<ChevronDoubleLeftIcon className="h-4 w-4" />}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              icon={<ChevronLeftIcon className="h-4 w-4" />}
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
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              Last
              <ChevronDoubleRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {selection && (
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <span>
            {Object.keys(rowSelection).length} of {table.getFilteredRowModel().rows.length} row(s) selected
          </span>
        </div>
      )}
    </div>
  );
}

export default Table;