/**
 * Test Excel Generation Only (No WhatsApp Sending)
 * 
 * This script tests Excel generation and saves it locally
 * No WhatsApp API calls, no Blob upload needed
 * 
 * Usage: node test-excel-generation-only.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Test data
const customerName = 'Sidarth Enterprise';
const records = [
  {
    date: '2024-01-15',
    transactionId: 'TXN001',
    description: 'Invoice Payment',
    debit: 0,
    credit: 5000,
    balance: 45000
  },
  {
    date: '2024-01-20',
    transactionId: 'TXN002',
    description: 'Purchase Order',
    debit: 10000,
    credit: 0,
    balance: 55000
  },
  {
    date: '2024-01-25',
    transactionId: 'TXN003',
    description: 'Payment Received',
    debit: 0,
    credit: 15000,
    balance: 40000
  },
  {
    date: '2024-02-01',
    transactionId: 'TXN004',
    description: 'Service Charge',
    debit: 2000,
    credit: 0,
    balance: 42000
  },
  {
    date: '2024-02-05',
    transactionId: 'TXN005',
    description: 'Partial Payment',
    debit: 0,
    credit: 8000,
    balance: 34000
  }
];

function generateExcel() {
  console.log('📊 Generating Excel Statement...\n');
  console.log(`Customer: ${customerName}`);
  console.log(`Records: ${records.length}\n`);

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create header data
  const data = [
    ['TRANSACTION STATEMENT'],
    ['Customer:', customerName],
    ['Generated:', new Date().toLocaleDateString('en-IN')],
    [''],
    ['Date', 'Transaction ID', 'Description', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)']
  ];
  
  // Add transaction rows
  records.forEach(t => {
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
  const totalDebit = records.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = records.reduce((sum, t) => sum + (t.credit || 0), 0);
  const finalBalance = records[records.length - 1]?.balance || 0;
  
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
  
  // Save to file
  const filename = `test_statement_${Date.now()}.xlsx`;
  const filepath = path.join(__dirname, filename);
  
  XLSX.writeFile(wb, filepath);
  
  console.log('✅ Excel file generated successfully!\n');
  console.log(`📁 File saved: ${filename}`);
  console.log(`📍 Location: ${filepath}\n`);
  console.log('📊 Summary:');
  console.log(`   Total Debit: ₹${totalDebit.toLocaleString('en-IN')}`);
  console.log(`   Total Credit: ₹${totalCredit.toLocaleString('en-IN')}`);
  console.log(`   Final Balance: ₹${finalBalance.toLocaleString('en-IN')}`);
  console.log('\n✅ Open the Excel file to verify!');
}

// Run test
console.log('═══════════════════════════════════════════════════════');
console.log('  Excel Generation Test (Local Only)');
console.log('═══════════════════════════════════════════════════════\n');

try {
  generateExcel();
} catch (error) {
  console.error('❌ Error generating Excel:', error.message);
  console.error('\n💡 Make sure xlsx package is installed:');
  console.error('   npm install xlsx');
}
