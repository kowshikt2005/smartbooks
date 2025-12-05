/**
 * Test Excel Statement Generation and WhatsApp Sending
 * 
 * Usage:
 * 1. Make sure dev server is running: npm run dev
 * 2. Run this script: node test-excel-statement.js
 */

const axios = require('axios');

// Test data
const testData = {
  customerId: 'test-123',
  customerName: 'Sidarth Enterprise',
  phoneNumber: '919876543210', // Replace with your test number
  records: [
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
  ]
};

async function testExcelStatement() {
  console.log('🧪 Testing Excel Statement Generation...\n');
  console.log(`Customer: ${testData.customerName}`);
  console.log(`Phone: ${testData.phoneNumber}`);
  console.log(`Records: ${testData.records.length}\n`);

  try {
    console.log('📤 Sending request to API...');
    
    const response = await axios.post(
      'http://localhost:3000/api/whatsapp/send-statement',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ SUCCESS!\n');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n📊 Summary:');
    console.log(`   Summary Message ID: ${response.data.summaryMessageId}`);
    console.log(`   Document Message ID: ${response.data.documentMessageId}`);
    console.log(`   File URL: ${response.data.fileUrl}`);
    console.log(`   Total Records: ${response.data.totalRecords}`);
    console.log(`   Total Outstanding: ₹${response.data.totalOutstanding?.toLocaleString('en-IN')}`);
    console.log('\n✅ Check your WhatsApp for the messages!');

  } catch (error) {
    console.error('\n❌ ERROR!\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400) {
        console.error('\n💡 Possible issues:');
        console.error('   - Invalid phone number format');
        console.error('   - WhatsApp Cloud API credentials not configured');
        console.error('   - Template not approved');
      } else if (error.response.status === 500) {
        console.error('\n💡 Possible issues:');
        console.error('   - BLOB_READ_WRITE_TOKEN not configured');
        console.error('   - Vercel Blob not set up');
        console.error('   - Server error - check console logs');
      }
    } else if (error.request) {
      console.error('No response received from server');
      console.error('💡 Make sure dev server is running: npm run dev');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run test
console.log('═══════════════════════════════════════════════════════');
console.log('  Excel Statement Test');
console.log('═══════════════════════════════════════════════════════\n');

testExcelStatement();
