'use client';

import React from 'react';
import {
  Table as TanStackTable,
  flexRender,
  Row,
} from '@tanstack/react-table';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: Row<TData>) => void;
  className?: string;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
}

function DataTable<TData>({
  table,
  loading = false,
  emptyMessage = "No data found",
  onRowClick,
  className,
  renderSubComponent,
}: DataTableProps<TData>) {
  if (!table) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Table configuration error</div>
        <p className="text-gray-600">Unable to initialize data table</p>
      </div>
    );
  }

  const tableClasses = twMerge(
    clsx([
      'w-full',
      'border-collapse',
      'bg-white',
      'shadow-sm',
      'rounded-lg',
      'overflow-hidden',
      'border',
      'border-gray-200',
      className
    ])
  );

  return (
    <div className="overflow-x-auto">
      <table className={tableClasses}>
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={clsx(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-100'
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
                    {header.column.getCanSort() && (
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
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td 
                colSpan={table.getAllColumns().length}
                className="px-6 py-12 text-center text-gray-500"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr
                  className={clsx(
                    'hover:bg-gray-50 transition-colors duration-150',
                    onRowClick && 'cursor-pointer',
                    row.getIsSelected() && 'bg-blue-50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && renderSubComponent && (
                  <tr>
                    <td colSpan={row.getVisibleCells().length}>
                      {renderSubComponent({ row })}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="px-6 py-12 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;