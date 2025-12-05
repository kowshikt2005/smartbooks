import { CustomerService } from './customers';
import type { Customer } from '../supabase/types';

// Simplified interfaces for the new system
export interface ImportRecord {
  name: string;
  phone?: string;
  originalData: Record<string, any>;
  rowIndex: number;
}

export interface ImportResult {
  autoLinked: AutoLinkedRecord[];
  newCustomerPrompts: NewCustomerPrompt[];
  errors: ImportError[];
  summary: ImportSummary;
}

export interface AutoLinkedRecord {
  importRecord: ImportRecord;
  matchedCustomer: Customer;
  appliedPhone: string;
  confidence: 'exact'; // Only 'exact' - no fuzzy matching
}

export interface NewCustomerPrompt {
  importRecord: ImportRecord;
  suggestedCustomer: Partial<Customer>;
}

export interface ImportError {
  recordIndex: number;
  recordName: string;
  errorType: 'validation' | 'database' | 'duplicate';
  message: string;
}

export interface ImportSummary {
  totalRecords: number;
  autoLinked: number;
  newCustomersCreated: number;
  skipped: number;
  errors: number;
  processingTime: number;
}

export interface AuditRecord {
  id: string;
  importedName: string;
  importedPhone?: string;
  matchedCustomerId?: string;
  finalPhone: string;
  action: 'auto_linked' | 'new_customer' | 'skipped';
  timestamp: Date;
  userId: string;
}

/**
 * Simplified Import Service - Replaces complex EnhancedExcelImport logic
 * 
 * This service implements the simplified customer-WhatsApp integration system that:
 * - Uses exact name matching only (no fuzzy logic)
 * - Automatically propagates phone numbers from Customer database
 * - Prompts for new customer creation for unknown names
 * - Provides import result summary and statistics tracking
 */
export class SimplifiedImportService {
  /**
   * Process import with simplified logic
   * Requirements: 1.1, 1.2, 1.4, 2.1, 2.2
   */
  static async processImport(file: File): Promise<ImportResult> {
    const startTime = Date.now();
    
    try {
      // Parse Excel file to get records
      const records = await this.parseExcelFile(file);
      
      // Initialize result structure
      const result: ImportResult = {
        autoLinked: [],
        newCustomerPrompts: [],
        errors: [],
        summary: this.initializeSummary(records.length)
      };
      
      // Get all customers for matching (cached for performance)
      const { data: customers } = await CustomerService.getAll();
      
      // Process each record with simplified logic
      for (const [index, record] of records.entries()) {
        try {
          await this.processRecord(record, customers, result);
        } catch (error) {
          result.errors.push({
            recordIndex: index,
            recordName: record.name,
            errorType: 'database',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Finalize summary
      const processingTime = Date.now() - startTime;
      result.summary = this.finalizeSummary(result, processingTime);
      
      return result;
    } catch (error) {
      throw new Error(`Import processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a single record with simplified matching logic
   * Requirements: 1.1, 1.2, 3.1, 3.2, 3.3
   */
  private static async processRecord(
    record: ImportRecord, 
    customers: Customer[], 
    result: ImportResult
  ): Promise<void> {
    // Simple exact name matching (case-insensitive)
    const matchedCustomer = this.findCustomerByName(record.name, customers);
    
    if (matchedCustomer) {
      // Auto-link with existing customer - use customer database phone number
      const autoLinked: AutoLinkedRecord = {
        importRecord: record,
        matchedCustomer,
        appliedPhone: matchedCustomer.phone_no,
        confidence: 'exact'
      };
      result.autoLinked.push(autoLinked);
    } else {
      // No match found - prompt for new customer creation
      const prompt: NewCustomerPrompt = {
        importRecord: record,
        suggestedCustomer: {
          name: record.name,
          phone_no: record.phone || '',
          location: record.originalData.location || null,
          invoice_id: record.originalData.invoice_id || null
        }
      };
      result.newCustomerPrompts.push(prompt);
    }
  }

  /**
   * Find customer by exact name match (case-insensitive)
   * Requirements: 3.1, 3.2, 3.3
   */
  private static findCustomerByName(name: string, customers: Customer[]): Customer | null {
    const normalizedName = this.normalizeNameForMatching(name);
    
    return customers.find(customer => 
      this.normalizeNameForMatching(customer.name) === normalizedName
    ) || null;
  }

  /**
   * Simple name normalization for exact matching
   * Requirements: 3.1, 3.2
   */
  private static normalizeNameForMatching(name: string): string {
    return name.trim().toLowerCase()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s]/g, ''); // Remove special characters
  }

  /**
   * Create new customer from prompt
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  static async createNewCustomer(prompt: NewCustomerPrompt, phoneNumber: string): Promise<Customer> {
    // Validate phone number
    if (!this.validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format. Please enter 10-15 digits.');
    }

    // Check for duplicate customers
    const { data: existingCustomers } = await CustomerService.getAll();
    const duplicate = this.findCustomerByName(prompt.importRecord.name, existingCustomers);
    
    if (duplicate) {
      throw new Error('Customer with this name already exists');
    }

    // Sanitize and validate data before creating customer
    const sanitizedData = this.sanitizeCustomerData({
      name: prompt.importRecord.name,
      phone_no: this.formatPhoneNumber(phoneNumber),
      location: prompt.suggestedCustomer.location,
      invoice_id: prompt.suggestedCustomer.invoice_id
    });

    // Create new customer
    const newCustomer = await CustomerService.create(sanitizedData);

    return newCustomer;
  }

  /**
   * Finalize import after all prompts are resolved
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  static async finalizeImport(result: ImportResult): Promise<void> {
    try {
      // All auto-linked records are already processed
      // New customers should be created through createNewCustomer method
      // This method handles any final synchronization if needed
      
      console.log(`Import finalized: ${result.autoLinked.length} auto-linked, ${result.summary.newCustomersCreated} new customers created`);
    } catch (error) {
      throw new Error(`Import finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Excel file to extract import records
   */
  private static async parseExcelFile(file: File): Promise<ImportRecord[]> {
    // This would use the same Excel parsing logic as the current system
    // For now, we'll import the XLSX library and implement basic parsing
    const XLSX = await import('xlsx');
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No worksheets found in the Excel file');
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error('Could not read the worksheet');
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!jsonData || jsonData.length === 0) {
      throw new Error('Excel file is empty or could not be parsed');
    }

    // Find header row
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
    
    if (headerRowIndex === -1 || headers.length === 0) {
      throw new Error('No valid headers found. Please ensure your Excel file has a row with column names.');
    }

    const dataRows = jsonData.slice(headerRowIndex + 1);
    
    // Find name column
    const nameIndex = this.findColumnIndex(headers, [
      'name', 'contact name', 'client name', 'party name', 'contact', 'client', 'party',
      'full name', 'company name', 'business name', 'firm name'
    ]);
    
    if (nameIndex === -1) {
      throw new Error('No name column found. Please ensure your Excel file has a column with names.');
    }

    // Find phone column (optional)
    const phoneIndex = this.findColumnIndex(headers, [
      'phone', 'phone number', 'phoneno', 'phone_no', 'mobile', 'mobile number', 'contact number',
      'cell', 'telephone', 'tel', 'mob', 'whatsapp', 'whatsapp number'
    ]);

    // Parse data rows
    const records: ImportRecord[] = [];
    
    dataRows.forEach((row: any[], index: number) => {
      const name = row[nameIndex]?.toString().trim();
      
      if (name) {
        // Build original data object with all columns
        const originalData: Record<string, any> = {};
        headers.forEach((header, colIndex) => {
          if (header && row[colIndex] !== undefined && row[colIndex] !== null && row[colIndex] !== '') {
            originalData[header] = row[colIndex];
          }
        });

        records.push({
          name,
          phone: phoneIndex >= 0 ? row[phoneIndex]?.toString().trim() : undefined,
          originalData,
          rowIndex: index + headerRowIndex + 2 // Excel row number
        });
      }
    });

    if (records.length === 0) {
      throw new Error('No valid records found in the Excel file');
    }

    return records;
  }

  /**
   * Find column index by field names
   */
  private static findColumnIndex(headers: string[], fieldNames: string[]): number {
    for (const fieldName of fieldNames) {
      const index = headers.findIndex(header => {
        if (!header) return false;
        const headerLower = header.toLowerCase().trim();
        const fieldLower = fieldName.toLowerCase();
        
        // Exact match
        if (headerLower === fieldLower) return true;
        
        // Contains match
        if (headerLower.includes(fieldLower) || fieldLower.includes(headerLower)) return true;
        
        return false;
      });
      if (index >= 0) return index;
    }
    return -1;
  }

  /**
   * Validate phone number format
   * Requirements: 4.3, 7.1
   */
  private static validatePhoneNumber(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Format phone number
   * Requirements: 4.3
   */
  private static formatPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Sanitize customer data to meet database constraints
   */
  private static sanitizeCustomerData(data: {
    name: string;
    phone_no: string;
    location?: string | null;
    invoice_id?: string | null;
  }): {
    name: string;
    phone_no: string;
    location?: string | null;
    invoice_id?: string | null;
  } {
    // Clean and validate name
    const cleanName = data.name ? data.name.trim().substring(0, 255) : '';
    if (!cleanName) {
      throw new Error('Customer name is required and cannot be empty');
    }

    // Clean and validate phone number
    const cleanPhone = data.phone_no ? data.phone_no.replace(/\D/g, '').substring(0, 20) : '';
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error(`Invalid phone number: ${data.phone_no}. Must be at least 10 digits.`);
    }

    return {
      name: cleanName,
      phone_no: cleanPhone,
      location: data.location ? data.location.trim().substring(0, 255) : null, // VARCHAR(255) limit
      invoice_id: data.invoice_id ? data.invoice_id.trim().substring(0, 100) : null // VARCHAR(100) limit
    };
  }

  /**
   * Initialize import summary
   */
  private static initializeSummary(totalRecords: number): ImportSummary {
    return {
      totalRecords,
      autoLinked: 0,
      newCustomersCreated: 0,
      skipped: 0,
      errors: 0,
      processingTime: 0
    };
  }

  /**
   * Finalize import summary with statistics
   * Requirements: 5.3, 5.4
   */
  private static finalizeSummary(result: ImportResult, processingTime: number): ImportSummary {
    return {
      totalRecords: result.summary.totalRecords,
      autoLinked: result.autoLinked.length,
      newCustomersCreated: result.summary.newCustomersCreated, // Updated when customers are created
      skipped: result.newCustomerPrompts.length, // Prompts that weren't resolved
      errors: result.errors.length,
      processingTime
    };
  }

  /**
   * Update summary when new customer is created
   */
  static updateSummaryForNewCustomer(result: ImportResult): void {
    result.summary.newCustomersCreated++;
    // Remove from skipped count if it was a prompt
    if (result.summary.skipped > 0) {
      result.summary.skipped--;
    }
  }

  /**
   * Get import statistics for display
   * Requirements: 5.3, 8.3
   */
  static getImportStatistics(result: ImportResult): {
    totalProcessed: number;
    autoLinkedCount: number;
    newCustomerCount: number;
    errorCount: number;
    successRate: number;
  } {
    const totalProcessed = result.summary.totalRecords;
    const autoLinkedCount = result.autoLinked.length;
    const newCustomerCount = result.summary.newCustomersCreated;
    const errorCount = result.errors.length;
    const successRate = totalProcessed > 0 ? ((autoLinkedCount + newCustomerCount) / totalProcessed) * 100 : 0;

    return {
      totalProcessed,
      autoLinkedCount,
      newCustomerCount,
      errorCount,
      successRate: Math.round(successRate * 100) / 100
    };
  }
}