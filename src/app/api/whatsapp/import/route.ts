import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  console.log('Excel import API called');
  
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
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];

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

    // Find the actual header row (look for the first row with multiple non-empty values)
    let headerRowIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
      const row = jsonData[i] as any[];
      if (row && row.length > 1) {
        const nonEmptyValues = row.filter(cell => cell && cell.toString().trim()).length;
        if (nonEmptyValues >= 2) { // At least 2 columns with data
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

    // Find column indices for common fields (case-insensitive)
    const findColumnIndex = (fieldNames: string[]): number => {
      for (const fieldName of fieldNames) {
        const index = headers.findIndex(header => 
          header && header.toLowerCase().trim() === fieldName.toLowerCase()
        );
        if (index >= 0) return index;
      }
      return -1;
    };

    // Try to identify common columns but don't require them
    const nameIndex = findColumnIndex(['name', 'customer name', 'client name', 'party name', 'contacts', 'contact']);
    const phoneIndex = findColumnIndex(['phone', 'phoneno', 'phone number', 'mobile', 'contact number']);
    const outstandingIndex = findColumnIndex(['outstanding', 'outstanding amount', 'balance', 'due amount', 'amount due', 'total']);
    
    console.log('Column indices - Name:', nameIndex, 'Phone:', phoneIndex, 'Outstanding:', outstandingIndex);

    // Parse data rows dynamically
    console.log('Starting data parsing...');
    const parsedData = dataRows.map((row: any[], index: number) => {
      const rowData: any = {
        rowNumber: index + 2 // +2 because we start from row 2 (after header)
      };

      try {
        // Add all columns dynamically
        headers.forEach((header, colIndex) => {
          if (header) {
            const value = row[colIndex];
            
            if (value !== undefined && value !== null && value !== '') {
              // Clean the value
              let cleanValue = value.toString().trim();
              
              // Try to parse numbers for amount-like columns
              const headerLower = header.toLowerCase();
              if (headerLower.includes('amount') || 
                  headerLower.includes('balance') || 
                  headerLower.includes('outstanding') ||
                  headerLower.includes('due') ||
                  headerLower.includes('total') ||
                  headerLower.includes('sum')) {
                // Remove currency symbols and commas, then try to parse
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

        // Add identified common fields for backward compatibility
        if (nameIndex >= 0) rowData.name = row[nameIndex] || null;
        if (phoneIndex >= 0) rowData.phone = row[phoneIndex] || null;
        if (outstandingIndex >= 0) {
          const outstandingValue = row[outstandingIndex];
          if (outstandingValue) {
            const cleanAmount = outstandingValue.toString().replace(/[₹,\s]/g, '');
            const parsedAmount = parseFloat(cleanAmount);
            rowData.outstanding = isNaN(parsedAmount) ? null : parsedAmount;
          } else {
            rowData.outstanding = null;
          }
        }
      } catch (rowError) {
        console.error('Error parsing row', index, ':', rowError);
        // Continue with partial data
      }

      return rowData;
    }).filter(row => {
      // Filter out completely empty rows (excluding rowNumber)
      const values = Object.keys(row).filter(key => key !== 'rowNumber').map(key => row[key]);
      return values.some(value => value !== null && value !== undefined && value !== '');
    });
    
    console.log('Parsed data count:', parsedData.length);

    // Validate data - be very lenient, accept almost everything
    const validationErrors: string[] = [];
    const validRows: any[] = [];
    const invalidRows: any[] = [];

    parsedData.forEach((row, index) => {
      const errors: string[] = [];

      // Check if row has any data at all
      const hasAnyData = Object.keys(row)
        .filter(key => key !== 'rowNumber')
        .some(key => row[key] !== null && row[key] !== undefined && row[key] !== '');

      if (!hasAnyData) {
        errors.push('Row contains no data');
      } else {
        // Only validate phone number format if phone field exists and has value
        // But don't mark row as invalid if phone is missing or invalid
        if (row.phone) {
          const cleanPhone = row.phone.toString().replace(/[\s\-\(\)\+]/g, '');
          if (!/^\d{10,15}$/.test(cleanPhone)) {
            // Add warning but don't invalidate the row
            row.phoneWarning = 'Invalid phone number format - WhatsApp messaging not available';
          }
        }
      }

      if (errors.length > 0) {
        invalidRows.push({
          ...row,
          errors
        });
      } else {
        validRows.push(row);
      }
    });

    // Return results
    console.log('Preparing response...');
    const response = {
      success: true,
      data: {
        totalRows: parsedData.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        headers: headers,
        foundColumns: {
          name: nameIndex >= 0,
          phone: phoneIndex >= 0,
          outstanding: outstandingIndex >= 0
        },
        allColumns: headers,
        detectedFields: {
          nameColumn: nameIndex >= 0 ? headers[nameIndex] : null,
          phoneColumn: phoneIndex >= 0 ? headers[phoneIndex] : null,
          outstandingColumn: outstandingIndex >= 0 ? headers[outstandingIndex] : null
        },
        validData: validRows,
        invalidData: invalidRows,
        preview: validRows.slice(0, 5) // First 5 valid rows for preview
      }
    };
    
    console.log('Response prepared, returning...');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Excel import error:', error);
    
    // Return a more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to process Excel file', 
        details: errorMessage,
        suggestion: 'Please ensure the file is a valid Excel file (.xls or .xlsx) and try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Excel import API is working. Use POST to upload Excel files.' },
    { status: 200 }
  );
}