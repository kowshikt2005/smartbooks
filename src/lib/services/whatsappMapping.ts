import { supabase, handleSupabaseError } from '../supabase/client';
import { CustomerService } from './customers';
import { PhoneNumberPropagationService } from './phoneNumberPropagationService';
import type { Customer } from '../supabase/types';

export interface ImportedRecord {
  name?: string | null;
  phone?: string | null;
  message?: string | null;
  outstanding?: number | null;
  rowNumber: number;
  [key: string]: any;
}

export interface MappingResult {
  imported_name: string | null;
  imported_phone: string | null;
  matched_contact: Customer | null;
  confidence: 'exact' | 'fuzzy' | 'none';
  conflict_type?: 'name_mismatch' | 'phone_mismatch' | 'no_match';
  source: 'contact_db' | 'imported' | 'manual';
  final_name: string;
  final_phone: string;
  additional_data: Record<string, any>;
}

export interface ConflictResolution {
  recordIndex: number;
  action: 'keep_contact' | 'use_imported' | 'manual_edit';
  manual_name?: string;
  manual_phone?: string;
}

export class WhatsAppMappingService {
  /**
   * Normalize phone number for comparison
   */
  static normalizePhone(phone: string | null | undefined): string {
    if (!phone) return '';
    return phone.toString().replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
  }

  /**
   * Normalize name for comparison
   */
  static normalizeName(name: string | null | undefined): string {
    if (!name) return '';
    return name.toString().toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Calculate name similarity using simple fuzzy matching
   */
  static calculateNameSimilarity(name1: string, name2: string): number {
    const norm1 = this.normalizeName(name1);
    const norm2 = this.normalizeName(name2);
    
    if (norm1 === norm2) return 1.0;
    if (!norm1 || !norm2) return 0.0;
    
    // Simple Levenshtein distance approximation
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Simple Levenshtein distance calculation
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Map imported records to existing customers with enhanced phone number propagation
   */
  static async mapImportedRecords(importedRecords: ImportedRecord[]): Promise<MappingResult[]> {
    try {
      console.log('Starting contact mapping for', importedRecords.length, 'records');
      
      // Get all contacts for mapping
      console.log('Fetching existing contacts from database...');
      const { data: customers } = await CustomerService.getAll();
      console.log('Found', customers.length, 'existing contacts');
      
      const mappingResults: MappingResult[] = [];

      for (const record of importedRecords) {
        try {
          const mapping = await this.mapSingleRecord(record, customers);
          mappingResults.push(mapping);
        } catch (recordError) {
          console.error('Error mapping single record:', record, recordError);
          // Create a fallback mapping for this record
          const fallbackMapping: MappingResult = {
            imported_name: record.name || null,
            imported_phone: record.phone || null,
            matched_contact: null,
            confidence: 'none',
            conflict_type: 'no_match',
            source: 'imported',
            final_name: record.name || '',
            final_phone: record.phone || '',
            additional_data: record
          };
          mappingResults.push(fallbackMapping);
        }
      }

      console.log('Contact mapping completed:', mappingResults.length, 'results');
      
      // ENHANCED: Apply automatic phone number propagation
      console.log('Applying enhanced phone number propagation...');
      const { enhancedResults, summary } = await PhoneNumberPropagationService.enhanceMappingResultsWithPhonePropagation(mappingResults);
      
      console.log('Phone propagation completed:', {
        totalProcessed: summary.totalProcessed,
        autoLinked: summary.autoLinked,
        propagated: summary.propagated,
        validated: summary.validated,
        errors: summary.errors
      });
      
      return enhancedResults;
    } catch (error) {
      console.error('Error mapping imported records:', error);
      throw new Error(`Contact mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map a single imported record to existing contacts
   */
  private static async mapSingleRecord(record: ImportedRecord, customers: Customer[]): Promise<MappingResult> {
    const importedPhone = this.normalizePhone(record.phone);
    const importedName = this.normalizeName(record.name);

    // Extract additional data (exclude standard fields)
    const { name, phone, message, outstanding, rowNumber, ...additionalData } = record;

    let bestMatch: Customer | null = null;
    let confidence: 'exact' | 'fuzzy' | 'none' = 'none';
    let conflictType: 'name_mismatch' | 'phone_mismatch' | 'no_match' | undefined;

    // First, try exact phone match
    if (importedPhone) {
      for (const customer of customers) {
        const customerPhone = this.normalizePhone(customer.phone_no);
        if (customerPhone && customerPhone === importedPhone) {
          bestMatch = customer;
          
          // Check if names match too
          const nameSimilarity = this.calculateNameSimilarity(importedName, customer.name);
          if (nameSimilarity >= 0.8) {
            confidence = 'exact';
          } else {
            confidence = 'fuzzy';
            conflictType = 'name_mismatch';
          }
          break;
        }
      }
    }

    // If no phone match, try fuzzy name matching
    if (!bestMatch && importedName) {
      let bestSimilarity = 0;
      for (const customer of customers) {
        const similarity = this.calculateNameSimilarity(importedName, customer.name);
        if (similarity > bestSimilarity && similarity >= 0.7) {
          bestSimilarity = similarity;
          bestMatch = customer;
          confidence = 'fuzzy';
          
          // Check if phones match
          const customerPhone = this.normalizePhone(customer.phone_no);
          if (importedPhone && customerPhone && customerPhone !== importedPhone) {
            conflictType = 'phone_mismatch';
          }
        }
      }
    }

    // SIMPLIFIED: Always prioritize customer database data when match found
    let finalName: string;
    let finalPhone: string;
    let source: 'contact_db' | 'imported' | 'manual' = 'imported';

    if (bestMatch) {
      // ANY match found - automatically use customer database data (simplified approach)
      finalName = bestMatch.name;
      finalPhone = bestMatch.phone_no;
      source = 'contact_db';
      
      // Simplified conflict handling: no complex resolution needed
      // Just log the type for statistics, but auto-resolve
      console.log(`Auto-resolved ${conflictType || 'match'} for ${record.name} → using customer: ${bestMatch.name}`);
    } else {
      // No match - use imported data (will prompt for new customer creation)
      finalName = record.name || '';
      finalPhone = record.phone || '';
      source = 'imported';
      conflictType = 'no_match';
      console.log(`No match found for ${record.name} - will prompt for new customer creation`);
    }

    return {
      imported_name: record.name || null,
      imported_phone: record.phone || null,
      matched_contact: bestMatch,
      confidence,
      conflict_type: conflictType,
      source,
      final_name: finalName,
      final_phone: finalPhone,
      additional_data: additionalData
    };
  }

  /**
   * Apply conflict resolutions to mapping results
   */
  static applyConflictResolutions(
    mappingResults: MappingResult[],
    resolutions: ConflictResolution[]
  ): MappingResult[] {
    const updatedResults = [...mappingResults];

    for (const resolution of resolutions) {
      const result = updatedResults[resolution.recordIndex];
      if (!result) continue;

      switch (resolution.action) {
        case 'keep_contact':
          if (result.matched_contact) {
            result.final_name = result.matched_contact.name;
            result.final_phone = result.matched_contact.phone_no;
            result.source = 'contact_db';
          }
          break;
        
        case 'use_imported':
          result.final_name = result.imported_name || '';
          result.final_phone = result.imported_phone || '';
          result.source = 'imported';
          break;
        
        case 'manual_edit':
          result.final_name = resolution.manual_name || result.final_name;
          result.final_phone = resolution.manual_phone || result.final_phone;
          result.source = 'manual';
          break;
      }
    }

    return updatedResults;
  }

  /**
   * Save mapping results to database and update customer records when needed
   */
  static async saveMappingResults(mappingResults: MappingResult[]): Promise<void> {
    try {
      // First, create new customers for no-match records
      await this.createNewCustomers(mappingResults);

      // Then, update existing customer records where user chose to use imported data
      await this.updateCustomerRecords(mappingResults);

      // Finally, save mapping records (if table exists)
      const tableExists = await this.ensureMappingTableExists();
      
      if (tableExists) {
        const mappingRecords = mappingResults.map(result => ({
          imported_name: result.imported_name,
          imported_phone: result.imported_phone,
          matched_customer_id: result.matched_contact?.id || null,
          confidence: result.confidence,
          conflict_type: result.conflict_type || null,
          source: result.source,
          final_name: result.final_name,
          final_phone: result.final_phone,
          additional_data: result.additional_data,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('whatsapp_mappings')
          .insert(mappingRecords);

        if (error) {
          console.error('Error saving mapping audit trail:', error);
          // Don't throw error - the main functionality (customer creation/updates) should still work
        } else {
          console.log(`Successfully saved ${mappingRecords.length} mapping records to audit trail`);
        }
      } else {
        console.warn('Mapping audit trail skipped - table does not exist. Run migration 007_whatsapp_mappings_table.sql to enable audit logging.');
      }
    } catch (error) {
      console.error('Error saving mapping results:', error);
      throw error;
    }
  }

  /**
   * Create new customers for no-match records
   */
  private static async createNewCustomers(mappingResults: MappingResult[]): Promise<void> {
    try {
      const newCustomersToCreate = mappingResults.filter(result => 
        result.conflict_type === 'no_match' && result.source === 'imported'
      );

      let successCount = 0;
      let skipCount = 0;

      for (const result of newCustomersToCreate) {
        // Validate that we have required data
        if (!result.final_name || !result.final_name.trim()) {
          console.log(`Skipping customer creation: missing name for record`);
          skipCount++;
          continue;
        }

        if (!result.final_phone || !result.final_phone.trim()) {
          console.log(`Skipping customer creation for ${result.final_name}: missing phone number`);
          skipCount++;
          continue;
        }

        // Validate phone number has digits
        const cleanPhone = result.final_phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          console.log(`Skipping customer creation for ${result.final_name}: invalid phone number (${result.final_phone})`);
          skipCount++;
          continue;
        }

        try {
          // Validate and sanitize data before creating customer
          const sanitizedData = this.sanitizeCustomerData({
            name: result.final_name,
            phone_no: result.final_phone,
            location: result.additional_data.location || null,
            invoice_id: result.additional_data.invoice_id || null
          });

          // Double-check sanitized data meets constraints
          if (!sanitizedData.name || !sanitizedData.phone_no || sanitizedData.phone_no.length < 10) {
            console.log(`Skipping customer creation for ${result.final_name}: data failed validation after sanitization`);
            skipCount++;
            continue;
          }

          const newCustomer = await CustomerService.create(sanitizedData);

          // Update the mapping result with the new contact ID
          result.matched_contact = newCustomer;
          successCount++;
            
          console.log(`Created new customer: ${newCustomer.name} (${newCustomer.phone_no})`);
        } catch (error) {
          console.error(`Failed to create customer for ${result.final_name}:`, error);
          skipCount++;
          // Continue with other customers even if one fails
        }
      }

      console.log(`Customer creation completed: ${successCount} created, ${skipCount} skipped out of ${newCustomersToCreate.length} total`);
    } catch (error) {
      console.error('Error creating new customers:', error);
      throw error;
    }
  }

  /**
   * Update customer records based on mapping results
   */
  private static async updateCustomerRecords(mappingResults: MappingResult[]): Promise<void> {
    try {
      const customersToUpdate: Array<{
        id: string;
        updates: {
          name?: string;
          phone_no?: string;
          location?: string;
          invoice_id?: string;
        };
      }> = [];

      for (const result of mappingResults) {
        // Only update if there's a matched contact and user chose imported/manual data
        if (result.matched_contact && (result.source === 'imported' || result.source === 'manual')) {
          const updates: any = {};
          let hasUpdates = false;

          // Check if name needs updating
          if (result.final_name && result.final_name !== result.matched_contact.name) {
            updates.name = result.final_name;
            hasUpdates = true;
          }

          // Check if phone needs updating
          if (result.final_phone && result.final_phone !== result.matched_contact.phone_no) {
            updates.phone_no = result.final_phone;
            hasUpdates = true;
          }

          // Check if location needs updating (from additional data)
          if (result.additional_data.location && 
              result.additional_data.location !== result.matched_contact.location) {
            updates.location = result.additional_data.location;
            hasUpdates = true;
          }

          // Check if invoice_id needs updating (from additional data)
          if (result.additional_data.invoice_id && 
              result.additional_data.invoice_id !== result.matched_contact.invoice_id) {
            updates.invoice_id = result.additional_data.invoice_id;
            hasUpdates = true;
          }

          if (hasUpdates) {
            // Sanitize the updates before applying
            const sanitizedUpdates = this.sanitizeCustomerData({
              name: updates.name || result.matched_contact.name,
              phone_no: updates.phone_no || result.matched_contact.phone_no,
              location: updates.location !== undefined ? updates.location : result.matched_contact.location,
              invoice_id: updates.invoice_id !== undefined ? updates.invoice_id : result.matched_contact.invoice_id
            });

            // Only include fields that are actually being updated
            const finalUpdates: any = {};
            if (updates.name) finalUpdates.name = sanitizedUpdates.name;
            if (updates.phone_no) finalUpdates.phone_no = sanitizedUpdates.phone_no;
            if (updates.location !== undefined) finalUpdates.location = sanitizedUpdates.location;
            if (updates.invoice_id !== undefined) finalUpdates.invoice_id = sanitizedUpdates.invoice_id;

            customersToUpdate.push({
              id: result.matched_contact.id,
              updates: finalUpdates
            });
          }
        }
      }

      // Perform batch updates
      for (const customerUpdate of customersToUpdate) {
        try {
          await CustomerService.update(customerUpdate.id, customerUpdate.updates);
          console.log(`Updated customer ${customerUpdate.id} with:`, customerUpdate.updates);
        } catch (error) {
          console.error(`Failed to update customer ${customerUpdate.id}:`, error);
          // Continue with other updates even if one fails
        }
      }

      if (customersToUpdate.length > 0) {
        console.log(`Successfully processed ${customersToUpdate.length} customer update requests`);
      }
    } catch (error) {
      console.error('Error updating customer records:', error);
      throw error;
    }
  }

  /**
   * Ensure the mapping table exists
   */
  private static async ensureMappingTableExists(): Promise<boolean> {
    try {
      // Try to query the table to see if it exists
      const { error } = await supabase
        .from('whatsapp_mappings')
        .select('id')
        .limit(1);
      
      if (error && (error.code === 'PGRST106' || error.message.includes('does not exist') || error.message.includes('schema cache'))) {
        console.warn('⚠️ WhatsApp mappings table does not exist. Import will continue without audit trail.');
        console.warn('💡 To enable audit logging, run the SQL in CREATE_WHATSAPP_MAPPINGS_TABLE.sql in your Supabase dashboard.');
        return false;
      } else if (error) {
        console.warn('⚠️ Error accessing whatsapp_mappings table:', error.message);
        return false;
      } else {
        console.log('✅ WhatsApp mappings table is accessible');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ WhatsApp mappings table check failed:', error);
      return false;
    }
  }

  /**
   * Get mapping statistics
   */
  static getMappingStatistics(mappingResults: MappingResult[]) {
    const stats = {
      total: mappingResults.length,
      exactMatches: 0,
      fuzzyMatches: 0,
      noMatches: 0,
      conflicts: 0,
      nameConflicts: 0,
      phoneConflicts: 0,
      customersUpdated: 0,
      newRecords: 0
    };

    for (const result of mappingResults) {
      switch (result.confidence) {
        case 'exact':
          stats.exactMatches++;
          break;
        case 'fuzzy':
          stats.fuzzyMatches++;
          if (result.conflict_type) {
            stats.conflicts++;
            if (result.conflict_type === 'name_mismatch') stats.nameConflicts++;
            if (result.conflict_type === 'phone_mismatch') stats.phoneConflicts++;
          }
          break;
        case 'none':
          stats.noMatches++;
          break;
      }

      // Count customers that will be updated or created
      if (result.conflict_type === 'no_match' && result.source === 'imported') {
        // This will be a new customer
        stats.newRecords++;
      } else if (result.matched_customer && (result.source === 'imported' || result.source === 'manual')) {
        // This will update an existing customer
        const hasNameUpdate = result.final_name !== result.matched_customer.name;
        const hasPhoneUpdate = result.final_phone !== result.matched_customer.phone_no;
        const hasLocationUpdate = result.additional_data.location && 
                                 result.additional_data.location !== result.matched_customer.location;
        const hasInvoiceUpdate = result.additional_data.invoice_id && 
                                result.additional_data.invoice_id !== result.matched_customer.invoice_id;
        
        if (hasNameUpdate || hasPhoneUpdate || hasLocationUpdate || hasInvoiceUpdate) {
          stats.customersUpdated++;
        }
      }
    }

    return stats;
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
   * Get detailed update information for user confirmation
   */
  static getUpdateDetails(mappingResults: MappingResult[]): Array<{
    customerName: string;
    customerId: string;
    changes: Array<{
      field: string;
      oldValue: string;
      newValue: string;
    }>;
  }> {
    const updateDetails: Array<{
      customerName: string;
      customerId: string;
      changes: Array<{
        field: string;
        oldValue: string;
        newValue: string;
      }>;
    }> = [];

    for (const result of mappingResults) {
      if (result.matched_customer && (result.source === 'imported' || result.source === 'manual')) {
        const changes: Array<{
          field: string;
          oldValue: string;
          newValue: string;
        }> = [];

        // Check name changes
        if (result.final_name && result.final_name !== result.matched_customer.name) {
          changes.push({
            field: 'Name',
            oldValue: result.matched_customer.name,
            newValue: result.final_name
          });
        }

        // Check phone changes
        if (result.final_phone && result.final_phone !== result.matched_customer.phone_no) {
          changes.push({
            field: 'Phone',
            oldValue: result.matched_customer.phone_no,
            newValue: result.final_phone
          });
        }

        // Check location changes
        if (result.additional_data.location && 
            result.additional_data.location !== result.matched_customer.location) {
          changes.push({
            field: 'Location',
            oldValue: result.matched_customer.location || 'Not set',
            newValue: result.additional_data.location
          });
        }

        // Check invoice_id changes
        if (result.additional_data.invoice_id && 
            result.additional_data.invoice_id !== result.matched_customer.invoice_id) {
          changes.push({
            field: 'Invoice ID',
            oldValue: result.matched_customer.invoice_id || 'Not set',
            newValue: result.additional_data.invoice_id
          });
        }

        if (changes.length > 0) {
          updateDetails.push({
            customerName: result.matched_customer.name,
            customerId: result.matched_customer.id,
            changes
          });
        }
      }
    }

    return updateDetails;
  }
}