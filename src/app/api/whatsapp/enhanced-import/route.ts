import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { WhatsAppMappingService } from '../../../../lib/services/whatsappMapping';


export async function POST(request: NextRequest) {
  console.log('Enhanced Excel import API called');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('File received:', file?.name, file?.size);

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!['xls', 'xlsx'].includes(fileExtension || '')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload .xls or .xlsx files only.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    console.log('Converting file to buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer created, size:', buffer.length);

    // Parse Excel file
    console.log('Parsing Excel file...');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('Workbook parsed, sheets:', workbook.SheetNames);
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { error: 'No worksheets found in the Excel file' },
        { status: 400 }
      );
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return NextResponse.json(
        { error: 'Could not read the worksheet' },
        { status: 400 }
      );
    }

    // Convert to JSON
    console.log('Converting worksheet to JSON...');
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('JSON data length:', jsonData.length);

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty or could not be parsed' },
        { status: 400 }
      );
    }

    // Find the header row
    let headerRowIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
      const row = jsonData[i] as any[];
      if (row && row.length > 1) {
        const nonEmptyValues = row.filter(cell => cell && cell.toString().trim()).length;
        if (nonEmptyValues >= 2) {
          headers = row.map(h => h ? h.toString().trim() : '').filter(h => h);
          if (headers.length >= 2) {
            headerRowIndex = i;
            break;
          }
        }
      }
    }
    
    console.log('Found header row at index:', headerRowIndex);
    console.log('Headers:', headers);
    
    if (headerRowIndex === -1 || headers.length === 0) {
      return NextResponse.json(
        { error: 'No valid headers found. Please ensure your Excel file has a row with column names.' },
        { status: 400 }
      );
    }

    const dataRows = jsonData.slice(headerRowIndex + 1);
    console.log('Data rows count:', dataRows.length);

    // Enhanced column detection with fuzzy matching
    const findColumnIndex = (fieldNames: string[]): number => {
      for (const fieldName of fieldNames) {
        const index = headers.findIndex(header => {
          if (!header) return false;
          const headerLower = header.toLowerCase().trim();
          const fieldLower = fieldName.toLowerCase();
          
          // Exact match
          if (headerLower === fieldLower) return true;
          
          // Contains match
          if (headerLower.includes(fieldLower) || fieldLower.includes(headerLower)) return true;
          
          // Remove common separators and try again
          const cleanHeader = headerLower.replace(/[\s\-_\.]/g, '');
          const cleanField = fieldLower.replace(/[\s\-_\.]/g, '');
          if (cleanHeader === cleanField || cleanHeader.includes(cleanField) || cleanField.includes(cleanHeader)) return true;
          
          return false;
        });
        if (index >= 0) return index;
      }
      return -1;
    };

    // Comprehensive field detection
    const nameIndex = findColumnIndex([
      'name', 'contact name', 'client name', 'party name', 'contact name', 'contact', 'client', 'party',
      'full name', 'company name', 'business name', 'firm name', 'vendor name', 'supplier name'
    ]);
    
    const phoneIndex = findColumnIndex([
      'phone', 'phone number', 'phoneno', 'phone_no', 'mobile', 'mobile number', 'contact number', 'contact',
      'cell', 'telephone', 'tel', 'mob', 'whatsapp', 'whatsapp number'
    ]);
    
    const balanceIndex = findColumnIndex([
      'balance', 'outstanding', 'due', 'amount due', 'balance amount', 'outstanding amount', 'pending',
      'pending amount', 'receivable', 'amount receivable', 'total due', 'balance due', 'unpaid'
    ]);
    
    const totalIndex = findColumnIndex([
      'total', 'total amount', 'grand total', 'invoice total', 'bill total', 'amount', 'invoice amount',
      'bill amount', 'gross amount', 'net amount', 'final amount'
    ]);
    
    const paidIndex = findColumnIndex([
      'paid', 'paid amount', 'payment', 'received', 'amount received', 'amount paid', 'payments'
    ]);
    
    console.log('Enhanced Column Detection:');
    console.log('- Name:', nameIndex >= 0 ? headers[nameIndex] : 'Not found');
    console.log('- Phone:', phoneIndex >= 0 ? headers[phoneIndex] : 'Not found');
    console.log('- Balance:', balanceIndex >= 0 ? headers[balanceIndex] : 'Not found');
    console.log('- Total:', totalIndex >= 0 ? headers[totalIndex] : 'Not found');
    console.log('- Paid:', paidIndex >= 0 ? headers[paidIndex] : 'Not found');

    // Parse data rows
    const parsedData = dataRows.map((row: any[], index: number) => {
      const rowData: any = {
        rowNumber: index + 2
      };

      // Add all columns dynamically
      headers.forEach((header, colIndex) => {
        if (header) {
          const value = row[colIndex];
          
          if (value !== undefined && value !== null && value !== '') {
            let cleanValue = value.toString().trim();
            
            // Try to parse numbers for amount-like columns
            const headerLower = header.toLowerCase();
            if (headerLower.includes('amount') || 
                headerLower.includes('balance') || 
                headerLower.includes('outstanding') ||
                headerLower.includes('due') ||
                headerLower.includes('total') ||
                headerLower.includes('sum')) {
              const numericValue = cleanValue.replace(/[₹,$,\s]/g, '');
              const parsedAmount = parseFloat(numericValue);
              rowData[header] = isNaN(parsedAmount) ? cleanValue : parsedAmount;
            } else {
              rowData[header] = cleanValue;
            }
          } else {
            rowData[header] = null;
          }
        }
      });

      // Only keep the original Excel columns - no standardized duplicates

      return rowData;
    }).filter(row => {
      // Filter out completely empty rows
      const values = Object.keys(row).filter(key => key !== 'rowNumber').map(key => row[key]);
      return values.some(value => value !== null && value !== undefined && value !== '');
    });
    
    console.log('Parsed data count:', parsedData.length);

    // Convert parsed data to ImportedRecord format for processing
    console.log('Converting data for optimized import processing...');
    const importedRecords = parsedData.map((record, index) => ({
      name: nameIndex >= 0 ? record[headers[nameIndex]] : null,
      phone: phoneIndex >= 0 ? record[headers[phoneIndex]] : null,
      outstanding: balanceIndex >= 0 ? record[headers[balanceIndex]] : null,
      rowNumber: record.rowNumber,
      ...record // Include all other Excel columns
    }));
    
    // Simplified: Use basic mapping service
    console.log('Processing import with simplified mapping...');
    const mappingResults = await WhatsAppMappingService.mapImportedRecords(importedRecords);
    const stats = WhatsAppMappingService.getMappingStatistics(mappingResults);
    console.log('Mapping completed:', stats);
    
    console.log('Enhanced import processing completed:', mappingResults.length, 'total records');

    // Return simplified results
    const response = {
      success: true,
      data: {
        totalRows: parsedData.length,
        mappingResults: mappingResults,
        statistics: stats,
        headers: headers,
        preview: parsedData.slice(0, 5),
        fieldDetection: {
          nameColumn: nameIndex >= 0 ? headers[nameIndex] : null,
          phoneColumn: phoneIndex >= 0 ? headers[phoneIndex] : null,
          balanceColumn: balanceIndex >= 0 ? headers[balanceIndex] : null,
          totalColumn: totalIndex >= 0 ? headers[totalIndex] : null,
          paidColumn: paidIndex >= 0 ? headers[paidIndex] : null,
          detectedCoreFields: {
            hasName: nameIndex >= 0,
            hasBalance: balanceIndex >= 0,
            hasTotal: totalIndex >= 0,
            hasPhone: phoneIndex >= 0,
            hasPaid: paidIndex >= 0
          }
        }
      }
    };
    
    console.log('Enhanced import response prepared, returning...');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Enhanced Excel import error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to process Excel file with contact mapping', 
        details: errorMessage,
        suggestion: 'Please ensure the file is a valid Excel file (.xls or .xlsx) and try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log('Enhanced import GET endpoint called');
  try {
    return NextResponse.json(
      { 
        message: 'Enhanced Excel import API is working. Use POST to upload Excel files with contact mapping.',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Enhanced import GET error:', error);
    return NextResponse.json(
      { error: 'GET endpoint failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}