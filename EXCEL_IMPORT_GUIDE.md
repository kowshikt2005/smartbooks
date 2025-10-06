# Excel Import for WhatsApp Feature

## Overview
The Excel import feature allows users to upload .xls or .xlsx files containing contact information for bulk WhatsApp messaging.

## Features Implemented

### 1. File Upload & Parsing
- **Supported formats**: .xls, .xlsx files
- **Drag & drop interface** with file browser fallback
- **Real-time validation** of file format and content
- **Error handling** for corrupted or invalid files

### 2. Column Detection
The system automatically detects the following columns (case-insensitive):
- **Name** (optional) - Contact's name
- **Phone / PhoneNo** (required) - Phone number for WhatsApp
- **Outstanding Amount / Outstanding** (optional) - Outstanding payment amount

### 3. Data Validation
- **Phone number validation**: Accepts 10-15 digit numbers
- **Missing field handling**: Sets missing fields to null instead of failing
- **Row validation**: Requires at least Name OR Phone for each row
- **Duplicate detection**: Handles multiple contacts with same phone number

### 4. Import Results
- **Summary statistics**: Total, valid, and invalid row counts
- **Column detection status**: Shows which columns were found
- **Data preview**: First 5 valid rows displayed
- **Error reporting**: Detailed errors for invalid rows with row numbers

### 5. WhatsApp Integration
- **Bulk messaging**: Send to all imported contacts at once
- **Standard message template**: Professional payment reminder with outstanding amount
- **Phone formatting**: Automatically formats Indian phone numbers
- **Staggered sending**: 800ms delay between messages to prevent spam

## API Endpoints

### POST /api/whatsapp/import
Handles Excel file upload and parsing.

**Request**: FormData with 'file' field
**Response**: 
```json
{
  "success": true,
  "data": {
    "totalRows": 100,
    "validRows": 95,
    "invalidRows": 5,
    "foundColumns": {
      "name": true,
      "phone": true,
      "outstanding": false
    },
    "validData": [...],
    "invalidData": [...],
    "preview": [...]
  }
}
```

### GET /api/whatsapp/template
Downloads a sample Excel template with proper column headers and example data.

**Response**: Excel file download

## Usage Instructions

### For Users:
1. **Click "Import Excel"** button on WhatsApp page
2. **Download template** (optional) to see required format
3. **Upload your Excel file** via drag & drop or file browser
4. **Review import results** - check valid/invalid rows
5. **Confirm import** to load contacts into the system
6. **Send messages** using "Send to Imported" button

### Excel File Requirements:
- Must contain **Name**, **Phone/PhoneNo**, and/or **Outstanding Amount** columns
- Column names are case-insensitive
- At least one of Name or Phone must be provided per row
- Phone numbers should be 10-15 digits
- Outstanding amounts can include currency symbols (₹) and commas
- Empty rows are automatically filtered out

## Technical Implementation

### Dependencies Added:
```bash
npm install multer xlsx @types/multer
```

### Key Components:
- `ExcelImport.tsx` - Main import modal component
- `/api/whatsapp/import/route.ts` - File processing API
- `/api/whatsapp/template/route.ts` - Template download API
- Updated `whatsapp/page.tsx` - Integration with existing WhatsApp functionality

### Error Handling:
- **File validation**: Checks file type and extension
- **Parse errors**: Handles corrupted Excel files gracefully
- **Data validation**: Validates each row and provides specific error messages
- **Network errors**: Proper error display for API failures

## Security Considerations
- **File type validation**: Only allows .xls/.xlsx files
- **Size limits**: Handled by Next.js default limits
- **Data sanitization**: Cleans and validates all imported data
- **No file storage**: Files are processed in memory only

## Performance Notes
- **Memory efficient**: Processes files in memory without disk storage
- **Batch processing**: Handles large files efficiently
- **Staggered messaging**: Prevents overwhelming WhatsApp Web
- **Client-side validation**: Reduces server load

## Future Enhancements
- **CSV support**: Add .csv file import capability
- **Column mapping**: Allow users to map custom column names
- **Import history**: Track and manage previous imports
- **Scheduled sending**: Queue messages for later delivery
- **Contact management**: Save imported contacts for reuse