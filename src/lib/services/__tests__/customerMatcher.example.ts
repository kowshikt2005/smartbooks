/**
 * Example usage of the CustomerMatcher service
 * This demonstrates how to use the simplified customer matching system
 */

import { CustomerMatcher } from '../customerMatcher';
import { 
  validateAndFormatPhone, 
  formatPhoneForDisplay, 
  normalizePhoneNumber,
  isValidForWhatsApp 
} from '../../utils/phoneUtils';

/**
 * Example: Basic customer name matching
 */
export async function exampleNameMatching() {
  console.log('=== Customer Name Matching Examples ===');
  
  // Example 1: Exact name match
  const result1 = await CustomerMatcher.findByName('John Doe');
  console.log('Searching for "John Doe":', result1);
  
  // Example 2: Case-insensitive match
  const result2 = await CustomerMatcher.findByName('JANE SMITH');
  console.log('Searching for "JANE SMITH":', result2);
  
  // Example 3: Whitespace handling
  const result3 = await CustomerMatcher.findByName('  ABC   Company   Ltd  ');
  console.log('Searching for "  ABC   Company   Ltd  ":', result3);
  
  // Example 4: No match found
  const result4 = await CustomerMatcher.findByName('Non Existent Customer');
  console.log('Searching for "Non Existent Customer":', result4);
}

/**
 * Example: Phone number validation and formatting
 */
export function examplePhoneValidation() {
  console.log('=== Phone Number Validation Examples ===');
  
  const phoneNumbers = [
    '1234567890',           // Valid 10-digit
    '+1-234-567-8901',      // Valid with formatting
    '123',                  // Too short
    '12345678901234567890', // Too long
    '',                     // Empty
    'abc123def456ghi7890'   // Mixed characters
  ];
  
  phoneNumbers.forEach(phone => {
    const validation = CustomerMatcher.validatePhoneNumber(phone);
    const formatted = formatPhoneForDisplay(phone);
    const normalized = normalizePhoneNumber(phone);
    const whatsappReady = isValidForWhatsApp(phone);
    
    console.log(`Phone: "${phone}"`);
    console.log(`  Valid: ${validation.isValid}`);
    console.log(`  Error: ${validation.error || 'None'}`);
    console.log(`  Formatted: ${validation.formatted}`);
    console.log(`  Display: ${formatted}`);
    console.log(`  Normalized: ${normalized}`);
    console.log(`  WhatsApp Ready: ${whatsappReady}`);
    console.log('---');
  });
}

/**
 * Example: Name normalization
 */
export function exampleNameNormalization() {
  console.log('=== Name Normalization Examples ===');
  
  const names = [
    'John Doe',
    '  JANE   SMITH  ',
    'ABC Company Ltd.',
    'Test@Company#123',
    '',
    null,
    undefined
  ];
  
  names.forEach(name => {
    const normalized = CustomerMatcher.normalizeNameForMatching(name as string);
    console.log(`Original: "${name}" -> Normalized: "${normalized}"`);
  });
}

/**
 * Example: Customer statistics
 */
export async function exampleCustomerStats() {
  console.log('=== Customer Statistics Example ===');
  
  try {
    const stats = await CustomerMatcher.getMatchingStats();
    console.log('Customer Statistics:');
    console.log(`  Total Customers: ${stats.totalCustomers}`);
    console.log(`  With Phone Numbers: ${stats.customersWithPhones}`);
    console.log(`  Without Phone Numbers: ${stats.customersWithoutPhones}`);
    console.log(`  Phone Coverage: ${stats.totalCustomers > 0 ? 
      ((stats.customersWithPhones / stats.totalCustomers) * 100).toFixed(1) : 0}%`);
  } catch (error) {
    console.error('Error getting customer stats:', error);
  }
}

/**
 * Example: Duplicate checking
 */
export async function exampleDuplicateChecking() {
  console.log('=== Duplicate Checking Examples ===');
  
  // Check if name is taken
  const nameExists = await CustomerMatcher.isNameTaken('John Doe');
  console.log('Is "John Doe" name taken?', nameExists);
  
  // Check if phone is taken
  const phoneExists = await CustomerMatcher.isPhoneTaken('1234567890');
  console.log('Is "1234567890" phone taken?', phoneExists);
  
  // Check with exclusion (useful for updates)
  const nameExistsExcluding = await CustomerMatcher.isNameTaken('John Doe', 'customer-id-to-exclude');
  console.log('Is "John Doe" name taken (excluding specific ID)?', nameExistsExcluding);
}

/**
 * Example: Complete workflow for import processing
 */
export async function exampleImportWorkflow() {
  console.log('=== Import Workflow Example ===');
  
  // Simulate imported record
  const importedRecord = {
    name: '  ABC   Company   Ltd  ',
    phone: '+1-234-567-8901',
    location: 'New York',
    invoice_id: 'INV001'
  };
  
  console.log('Processing imported record:', importedRecord);
  
  // Step 1: Normalize and validate phone
  const phoneValidation = validateAndFormatPhone(importedRecord.phone);
  console.log('Phone validation:', phoneValidation);
  
  if (!phoneValidation.isValid) {
    console.log('❌ Invalid phone number, would prompt user for correction');
    return;
  }
  
  // Step 2: Try to find existing customer by name
  const nameMatch = await CustomerMatcher.findByName(importedRecord.name);
  console.log('Name matching result:', nameMatch);
  
  if (nameMatch.customer) {
    console.log('✅ Found existing customer, would auto-link with customer phone:', nameMatch.customer.phone_no);
    return;
  }
  
  // Step 3: Try to find by phone (secondary matching)
  const phoneMatch = await CustomerMatcher.findByPhone(importedRecord.phone);
  console.log('Phone matching result:', phoneMatch);
  
  if (phoneMatch.customer) {
    console.log('✅ Found existing customer by phone, would handle name mismatch');
    return;
  }
  
  // Step 4: No match found, would prompt for new customer creation
  console.log('❓ No existing customer found, would prompt user to create new customer');
  console.log('Suggested customer data:', {
    name: CustomerMatcher.normalizeNameForMatching(importedRecord.name),
    phone_no: phoneValidation.formatted,
    location: importedRecord.location,
    invoice_id: importedRecord.invoice_id
  });
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await exampleNameMatching();
    console.log('\n');
    
    examplePhoneValidation();
    console.log('\n');
    
    exampleNameNormalization();
    console.log('\n');
    
    await exampleCustomerStats();
    console.log('\n');
    
    await exampleDuplicateChecking();
    console.log('\n');
    
    await exampleImportWorkflow();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export individual examples for testing
export {
  exampleNameMatching,
  examplePhoneValidation,
  exampleNameNormalization,
  exampleCustomerStats,
  exampleDuplicateChecking,
  exampleImportWorkflow
};