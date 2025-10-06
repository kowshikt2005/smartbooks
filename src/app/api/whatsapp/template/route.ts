import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Create sample data for the template
    const templateData = [
      ['Name', 'Phone', 'Outstanding Amount'],
      ['John Doe', '9876543210', '15000'],
      ['Jane Smith', '9876543211', '25000'],
      ['Bob Johnson', '9876543212', '8500'],
      ['', '9876543213', '12000'],
      ['Alice Brown', '', '5000']
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { width: 20 }, // Name column
      { width: 15 }, // Phone column
      { width: 20 }  // Outstanding Amount column
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WhatsApp Contacts');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="whatsapp_template.xlsx"',
      },
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template file' },
      { status: 500 }
    );
  }
}