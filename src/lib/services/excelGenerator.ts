import * as XLSX from 'xlsx';

/**
 * Excel Generator Service
 * Generates Excel files for transaction statements and reports
 */
export class ExcelGenerator {
  /**
   * Generate transaction statement Excel file
   */
  static generateTransactionStatement(
    customerName: string,
    transactions: Array<{
      date: string;
      transactionId: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }>
  ): Buffer {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create header data
    const data: any[][] = [
      ['TRANSACTION STATEMENT'],
      ['Customer:', customerName],
      ['Generated:', new Date().toLocaleDateString('en-IN')],
      [''],
      ['Date', 'Transaction ID', 'Description', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)']
    ];
    
    // Add transaction rows
    transactions.forEach(t => {
      data.push([
        t.date,
        t.transactionId,
        t.description,
        t.debit || '',
        t.credit || '',
        t.balance
      ]);
    });
    
    // Calculate totals
    const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const finalBalance = transactions[transactions.length - 1]?.balance || 0;
    
    // Add summary
    data.push(['']);
    data.push(['', '', 'TOTAL', totalDebit, totalCredit, finalBalance]);
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 15 },  // Transaction ID
      { wch: 30 },  // Description
      { wch: 12 },  // Debit
      { wch: 12 },  // Credit
      { wch: 12 }   // Balance
    ];
    
    // Add to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    
    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Generate customer statement from imported Excel data
   * Preserves ALL original Excel columns exactly as imported
   */
  static generateCustomerStatement(
    customerName: string,
    records: Array<{
      originalData?: Record<string, any>;
      [key: string]: any;
    }>
  ): Buffer {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create header
    const data: any[][] = [
      ['CUSTOMER STATEMENT'],
      ['Customer:', customerName],
      ['Generated:', new Date().toLocaleDateString('en-IN')],
      ['']
    ];
    
    // Extract originalData from records (this is where the Excel data is stored)
    const flatRecords = records.map(record => record.originalData || record);
    
    // Get all unique keys from records (preserve Excel column order)
    const allKeys = new Set<string>();
    flatRecords.forEach(record => {
      Object.keys(record).forEach(key => {
        // Skip internal/system fields
        if (key !== 'rowNumber' && key !== 'id' && key !== 'phone_no' && key !== 'name' && key !== 'created_at' && key !== 'updated_at') {
          allKeys.add(key);
        }
      });
    });
    
    // Create header row with original Excel column names
    const headers = Array.from(allKeys);
    data.push(headers);
    
    // Add data rows
    flatRecords.forEach(record => {
      const row = headers.map(header => {
        const value = record[header];
        
        // Keep numbers as numbers for Excel formatting
        if (typeof value === 'number') {
          return value;
        }
        
        // Format dates
        if (value instanceof Date) {
          return value.toLocaleDateString('en-IN');
        }
        
        return value !== null && value !== undefined ? value : '';
      });
      data.push(row);
    });
    
    // Calculate totals for numeric columns
    const totals: any[] = [];
    headers.forEach((header, index) => {
      const values = flatRecords.map(r => r[header]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        totals[index] = sum;
      } else {
        totals[index] = index === 0 ? 'TOTAL' : '';
      }
    });
    
    // Add totals row if there are numeric columns
    if (totals.some(t => typeof t === 'number')) {
      data.push(['']);
      data.push(totals);
    }
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths based on content
    ws['!cols'] = headers.map(header => {
      const headerLower = header.toLowerCase();
      if (headerLower.includes('date')) return { wch: 12 };
      if (headerLower.includes('trans') || headerLower.includes('invoice')) return { wch: 15 };
      if (headerLower.includes('contact') || headerLower.includes('name')) return { wch: 25 };
      if (headerLower.includes('balance') || headerLower.includes('amount') || headerLower.includes('outstanding')) return { wch: 15 };
      return { wch: 15 };
    });
    
    // Add to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Statement');
    
    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }
}
