import { NextRequest, NextResponse } from 'next/server';
import { SimplifiedImportService } from '../../../../lib/services/simplifiedImportService';

/**
 * Simplified Import API Endpoint
 * 
 * This endpoint replaces the complex EnhancedExcelImport logic with simplified processing:
 * - Exact name matching only (no fuzzy logic)
 * - Automatic phone number propagation from Customer database
 * - Simple new customer prompts for unknown names
 * - Import result summary and statistics tracking
 * 
 * Requirements: 1.1, 1.2, 1.4, 2.1, 2.2
 */

export async function POST(request: NextRequest) {
  console.log('Simplified Excel import API called');
  
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

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Please upload files smaller than 10MB.' },
        { status: 400 }
      );
    }

    console.log('Processing import with SimplifiedImportService...');
    
    // Process import with simplified service
    const importResult = await SimplifiedImportService.processImport(file);
    
    console.log('Simplified import processing completed');
    console.log('Auto-linked:', importResult.autoLinked.length, 'records');
    console.log('New customer prompts:', importResult.newCustomerPrompts.length, 'records');
    console.log('Errors:', importResult.errors.length, 'records');

    // Get statistics for response
    const statistics = SimplifiedImportService.getImportStatistics(importResult);
    
    // Return simplified results
    const response = {
      success: true,
      data: {
        importResult,
        statistics,
        summary: {
          totalRecords: importResult.summary.totalRecords,
          autoLinked: importResult.autoLinked.length,
          newCustomerPrompts: importResult.newCustomerPrompts.length,
          errors: importResult.errors.length,
          processingTime: importResult.summary.processingTime,
          successRate: statistics.successRate
        },
        // Provide data in format compatible with existing UI
        mappingResults: [
          // Convert auto-linked records to mapping format
          ...importResult.autoLinked.map(record => ({
            imported_name: record.importRecord.name,
            imported_phone: record.importRecord.phone || null,
            matched_contact: record.matchedCustomer,
            confidence: record.confidence,
            conflict_type: undefined,
            source: 'contact_db' as const,
            final_name: record.matchedCustomer.name,
            final_phone: record.appliedPhone,
            additional_data: record.importRecord.originalData
          })),
          // Convert new customer prompts to mapping format
          ...importResult.newCustomerPrompts.map(prompt => ({
            imported_name: prompt.importRecord.name,
            imported_phone: prompt.importRecord.phone || null,
            matched_contact: null,
            confidence: 'none' as const,
            conflict_type: 'no_match' as const,
            source: 'imported' as const,
            final_name: prompt.importRecord.name,
            final_phone: prompt.importRecord.phone || '',
            additional_data: prompt.importRecord.originalData
          }))
        ]
      }
    };
    
    console.log('Simplified import response prepared, returning...');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Simplified Excel import error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to process Excel file with simplified import', 
        details: errorMessage,
        suggestion: 'Please ensure the file is a valid Excel file (.xls or .xlsx) with a name column and try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log('Simplified import GET endpoint called');
  try {
    return NextResponse.json(
      { 
        message: 'Simplified Excel import API is working. Use POST to upload Excel files with simplified customer matching.',
        features: [
          'Exact name matching only (no fuzzy logic)',
          'Automatic phone number propagation from Customer database',
          'Simple new customer prompts for unknown names',
          'Import result summary and statistics tracking'
        ],
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Simplified import GET error:', error);
    return NextResponse.json(
      { error: 'GET endpoint failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}