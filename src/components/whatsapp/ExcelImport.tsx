'use client';

import React, { useState, useRef } from 'react';
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  DocumentTextIcon,
  PhoneIcon,
  CurrencyRupeeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ImportedRow {
  name?: string | null;
  phone?: string | null;
  outstanding?: number | null;
  rowNumber: number;
  errors?: string[];
  [key: string]: unknown; // Allow dynamic properties
}

interface ImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  headers: string[];
  foundColumns: {
    name: boolean;
    phone: boolean;
    outstanding: boolean;
  };
  allColumns: string[];
  detectedFields: {
    nameColumn: string | null;
    phoneColumn: string | null;
    outstandingColumn: string | null;
  };
  validData: ImportedRow[];
  invalidData: ImportedRow[];
  preview: ImportedRow[];
}

interface ExcelImportProps {
  onImportComplete?: (data: ImportedRow[]) => void;
  onClose?: () => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImportComplete, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fileExtension = droppedFile.name.toLowerCase().split('.').pop();
      if (['xls', 'xlsx'].includes(fileExtension || '')) {
        handleFileSelect(droppedFile);
      } else {
        setError('Please select a valid Excel file (.xls or .xlsx)');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      // First test if API is reachable
      console.log('Testing API connection...');
      const testResponse = await fetch('/api/whatsapp/import');
      console.log('API test response:', testResponse.status);

      const formData = new FormData();
      formData.append('file', file);

      console.log('Sending file to API...');
      const response = await fetch('/api/whatsapp/import', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      let result;
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200));

      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please refresh the page and try again.');
        }
        const errorMsg = result.error || 'Import failed';
        const details = result.details ? ` Details: ${result.details}` : '';
        throw new Error(errorMsg + details);
      }

      setImportResult(result.data);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = () => {
    if (importResult && onImportComplete) {
      onImportComplete(importResult.validData);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/whatsapp/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whatsapp_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download template');
      }
    } catch (err) {
      setError('Failed to download template file');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <DocumentArrowUpIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Import Excel File</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!importResult ? (
            <>
              {/* Instructions */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Excel File Requirements</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    Upload any Excel file with contact data. The system will automatically detect and import all columns.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <DocumentTextIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Any Column Names</span>
                      <span className="text-xs text-blue-600">(Dynamic)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Phone Detection</span>
                      <span className="text-xs text-blue-600">(Auto)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CurrencyRupeeIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Amount Detection</span>
                      <span className="text-xs text-blue-600">(Auto)</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-3">
                    The system will automatically detect Name, Phone, and Amount columns. All other columns will be imported as-is. For WhatsApp messaging, a phone number is recommended.
                  </p>
                </div>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  >
                    Download Sample Template
                  </Button>
                </div>
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
                  }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
              >
                <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />

                {file ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      Size: {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Button onClick={handleImport} loading={importing}>
                        {importing ? 'Processing...' : 'Import File'}
                      </Button>
                      <Button variant="outline" onClick={resetImport}>
                        Choose Different File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-lg font-medium text-gray-900">
                      Drop your Excel file here
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse for .xls or .xlsx files
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Import Results */}
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Rows</p>
                        <p className="text-xl font-bold text-gray-900">{importResult.totalRows}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Valid Rows</p>
                        <p className="text-xl font-bold text-green-600">{importResult.validRows}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Invalid Rows</p>
                        <p className="text-xl font-bold text-red-600">{importResult.invalidRows}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* All Columns */}
                <Card className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Detected Columns ({importResult.allColumns.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                    {importResult.allColumns.map((column, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <DocumentTextIcon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-800 truncate">{column}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Special Field Detection */}
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Auto-Detected Special Fields:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className={`h-4 w-4 ${importResult.detectedFields.nameColumn ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-xs">Name: {importResult.detectedFields.nameColumn || 'Not detected'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className={`h-4 w-4 ${importResult.detectedFields.phoneColumn ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-xs">Phone: {importResult.detectedFields.phoneColumn || 'Not detected'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className={`h-4 w-4 ${importResult.detectedFields.outstandingColumn ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-xs">Amount: {importResult.detectedFields.outstandingColumn || 'Not detected'}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Preview */}
                {importResult.preview.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Preview (First 5 Valid Rows)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {importResult.allColumns.map((column, index) => (
                              <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importResult.preview.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {importResult.allColumns.map((column, colIndex) => (
                                <td key={colIndex} className="px-4 py-2 text-sm text-gray-900">
                                  {row[column] !== null && row[column] !== undefined 
                                    ? (typeof row[column] === 'number' && column.toLowerCase().includes('amount')
                                        ? `₹${row[column].toLocaleString('en-IN')}`
                                        : row[column].toString())
                                    : '-'
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Invalid Rows */}
                {importResult.invalidRows > 0 && (
                  <Card className="p-4">
                    <h3 className="text-lg font-medium text-red-600 mb-3">Invalid Rows ({importResult.invalidRows})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importResult.invalidData.map((row, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm font-medium text-red-800">Row {row.rowNumber}:</p>
                          <p className="text-xs text-red-700">
                            Data: {Object.keys(row).filter(key => key !== 'rowNumber' && key !== 'errors').map(key => 
                              `${key}: ${row[key] || 'Empty'}`
                            ).join(', ')}
                          </p>
                          <p className="text-xs text-red-600">Errors: {row.errors?.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={resetImport}>
                    Import Different File
                  </Button>
                  {importResult.validRows > 0 && (
                    <Button onClick={handleConfirmImport}>
                      Import {importResult.validRows} Valid Rows
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImport;