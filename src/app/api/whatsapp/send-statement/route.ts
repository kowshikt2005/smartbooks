import { NextRequest, NextResponse } from 'next/server';
import { ExcelGenerator } from '@/lib/services/excelGenerator';
import { FileUploadService } from '@/lib/services/fileUpload';
import { whatsappCloudService } from '@/lib/services';

/**
 * Send WhatsApp statement with Excel attachment
 * POST /api/whatsapp/send-statement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      customerId, 
      customerName, 
      phoneNumber, 
      records 
    } = body;

    // Validate required fields
    if (!customerName || !phoneNumber || !records || records.length === 0) {
      return NextResponse.json(
        { error: 'Customer name, phone number, and records are required' },
        { status: 400 }
      );
    }

    console.log(`📊 Generating statement for ${customerName} with ${records.length} records`);

    // 1. Generate Excel file
    const excelBuffer = ExcelGenerator.generateCustomerStatement(
      customerName,
      records
    );

    // 2. Upload to Vercel Blob
    const timestamp = Date.now();
    const filename = `statement_${customerName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
    const uploadResult = await FileUploadService.uploadExcel(excelBuffer, filename);

    if (uploadResult.error || !uploadResult.url) {
      return NextResponse.json(
        { error: `File upload failed: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    console.log(`✅ Excel uploaded: ${uploadResult.url}`);

    // 3. Calculate summary
    const totalRecords = records.length;
    
    // Calculate total outstanding from various possible fields
    let totalOutstanding = 0;
    records.forEach((record: any) => {
      const amountFields = ['outstanding', 'Outstanding', 'balance_pays', 'balance', 'Balance', 'amount', 'Amount', 'due', 'Due'];
      for (const field of amountFields) {
        if (record[field] && typeof record[field] === 'number') {
          totalOutstanding += record[field];
          break;
        }
      }
    });

    // 4. Send summary message (template) with download link
    const summaryText = totalRecords === 1
      ? `You have 1 transaction. Outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}. Download statement: ${uploadResult.url}`
      : `You have ${totalRecords} transactions. Total outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}. Download: ${uploadResult.url}`;

    const summaryResult = await whatsappCloudService.sendTemplateMessage(
      phoneNumber,
      'payment_reminder',
      'en',
      {
        body_1: customerName,
        body_2: summaryText,
        body_3: 'sri balaji enterprises'
      }
    );

    if (!summaryResult.success) {
      return NextResponse.json(
        { error: `Failed to send summary: ${summaryResult.error}` },
        { status: 400 }
      );
    }

    console.log(`✅ Summary message sent: ${summaryResult.messageId}`);

    // 5. Send Excel attachment
    const documentResult = await whatsappCloudService.sendDocumentMessage(
      phoneNumber,
      uploadResult.url,
      filename,
      `Transaction Statement - ${customerName}`
    );

    if (!documentResult.success) {
      return NextResponse.json(
        { 
          error: `Failed to send document: ${documentResult.error}`,
          summaryMessageId: summaryResult.messageId,
          fileUrl: uploadResult.url
        },
        { status: 400 }
      );
    }

    console.log(`✅ Document sent: ${documentResult.messageId}`);

    return NextResponse.json({
      success: true,
      summaryMessageId: summaryResult.messageId,
      documentMessageId: documentResult.messageId,
      fileUrl: uploadResult.url,
      totalRecords,
      totalOutstanding
    });

  } catch (error) {
    console.error('❌ Send statement error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send statement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
