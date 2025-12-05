# Excel Statement Testing Guide

## Quick Answer: No New Template Needed! ✅

The Excel attachment system uses:
1. **Existing `payment_reminder` template** - for summary message
2. **WhatsApp Document API** - for Excel attachment (no template required!)

---

## Testing Options

### Option 1: Test Excel Generation Only (Easiest)

**No setup required! Just generates Excel locally.**

```bash
cd smartbooks
node test-excel-generation-only.js
```

**What it does:**
- ✅ Generates Excel file with sample data
- ✅ Saves to `smartbooks/` folder
- ✅ No API calls, no credentials needed
- ✅ Open the Excel file to verify format

**Expected output:**
```
📊 Generating Excel Statement...
Customer: Sidarth Enterprise
Records: 5

✅ Excel file generated successfully!
📁 File saved: test_statement_1234567890.xlsx
```

---

### Option 2: Test Full Flow (Requires Setup)

**Tests complete flow: Generate → Upload → Send WhatsApp**

#### Prerequisites:
1. ✅ Vercel Blob token in `.env.local`
2. ✅ WhatsApp credentials in `.env.local`
3. ✅ Dev server running

#### Steps:

**1. Get Vercel Blob Token:**
```bash
# Go to: https://vercel.com/dashboard
# Storage → Create Blob → Copy token
# Add to .env.local:
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

**2. Start Dev Server:**
```bash
cd smartbooks
npm run dev
```

**3. Update Test Phone Number:**
```bash
# Edit test-excel-statement.js
# Line 14: Replace with your WhatsApp number
phoneNumber: '919876543210'  // Your number here
```

**4. Run Test:**
```bash
# In a new terminal
node test-excel-statement.js
```

**Expected output:**
```
✅ SUCCESS!

📊 Summary:
   Summary Message ID: wamid.xxx
   Document Message ID: wamid.yyy
   File URL: https://blob.vercel-storage.com/...
   Total Records: 5
   Total Outstanding: ₹34,000

✅ Check your WhatsApp for the messages!
```

**What you'll receive on WhatsApp:**

**Message 1 (Summary):**
```
Dear Sidarth Enterprise,

You have 5 transactions. Total outstanding: ₹34,000

Please check attached statement for details.

- SmartBooks Team
```

**Message 2 (Excel File):**
```
📎 statement_Sidarth_Enterprise_1234567890.xlsx
   Transaction Statement - Sidarth Enterprise
```

---

### Option 3: Test via API (Postman/Insomnia)

**1. Start dev server:**
```bash
npm run dev
```

**2. Send POST request:**
```
POST http://localhost:3000/api/whatsapp/send-statement
Content-Type: application/json

{
  "customerId": "test-123",
  "customerName": "Sidarth Enterprise",
  "phoneNumber": "919876543210",
  "records": [
    {
      "date": "2024-01-15",
      "transactionId": "TXN001",
      "description": "Invoice Payment",
      "debit": 0,
      "credit": 5000,
      "balance": 45000
    },
    {
      "date": "2024-01-20",
      "transactionId": "TXN002",
      "description": "Purchase Order",
      "debit": 10000,
      "credit": 0,
      "balance": 55000
    }
  ]
}
```

---

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN not configured"
**Solution:** Add Blob token to `.env.local`

### Error: "Invalid phone number"
**Solution:** Use format `919876543210` (country code + number, no spaces)

### Error: "Template not approved"
**Solution:** Your `payment_reminder` template must be approved in Meta Business

### Error: "File upload failed"
**Solution:** 
- Check Blob token is correct
- Verify Vercel Blob storage is created
- Check internet connection

### No WhatsApp message received
**Solution:**
- Verify phone number is correct
- Check WhatsApp Cloud API credentials
- Check Meta Business Manager for errors
- Verify phone number is registered with WhatsApp

---

## What Gets Tested

### ✅ Excel Generation
- Creates proper Excel format
- Includes header with customer name and date
- Lists all transactions
- Calculates totals correctly
- Sets column widths

### ✅ File Upload
- Uploads to Vercel Blob
- Returns public URL
- File is accessible

### ✅ WhatsApp Sending
- Sends summary message using template
- Sends Excel as document attachment
- Returns message IDs
- Tracks in database

---

## Quick Start (Recommended)

**Just want to see if Excel generation works?**

```bash
cd smartbooks
node test-excel-generation-only.js
```

**Opens Excel file → Verify format → Done!** ✅

---

## Next Steps After Testing

1. ✅ Verify Excel format is correct
2. ✅ Test with real customer data
3. ✅ Add UI button (Phase 5)
4. ✅ Deploy to Vercel
5. ✅ Test in production

---

## Support

If tests fail:
1. Check console output for specific error
2. Verify all environment variables
3. Check Vercel Blob is created
4. Verify WhatsApp credentials
5. Review server logs (`npm run dev` output)
