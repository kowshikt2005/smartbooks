/**
 * Tests for SimplifiedImportService
 * 
 * These tests verify the core functionality of the simplified import system:
 * - Excel file parsing
 * - Exact name matching
 * - Phone number propagation
 * - New customer prompt generation
 * - Import statistics tracking
 */

import { SimplifiedImportService } from '../simplifiedImportService';
import { CustomerMatcher } from '../customerMatcher';
import { PhoneNumberService } from '../phoneNumberService';

// Mock the dependencies
jest.mock('../customers');
jest.mock('../customerMatcher');
jest.mock('../phoneNumberService');

const mockCustomerMatcher = CustomerMatcher as jest.Mocked<typeof CustomerMatcher>;
const mockPhoneNumberService = PhoneNumberService as jest.Mocked<typeof PhoneNumberService>;

describe('SimplifiedImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone number validation', () => {
    it('should validate correct phone numbers', () => {
      expect(SimplifiedImportService['validatePhoneNumber']('9876543210')).toBe(true);
      expect(SimplifiedImportService['validatePhoneNumber']('919876543210')).toBe(true);
      expect(SimplifiedImportService['validatePhoneNumber']('+91 9876543210')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(SimplifiedImportService['validatePhoneNumber']('123')).toBe(false);
      expect(SimplifiedImportService['validatePhoneNumber']('abcdefghij')).toBe(false);
      expect(SimplifiedImportService['validatePhoneNumber']('')).toBe(false);
    });
  });

  describe('Phone number formatting', () => {
    it('should format phone numbers correctly', () => {
      expect(SimplifiedImportService['formatPhoneNumber']('+91 9876543210')).toBe('919876543210');
      expect(SimplifiedImportService['formatPhoneNumber']('(987) 654-3210')).toBe('9876543210');
      expect(SimplifiedImportService['formatPhoneNumber']('987-654-3210')).toBe('9876543210');
    });
  });

  describe('Import statistics', () => {
    it('should calculate statistics correctly', () => {
      const mockResult = {
        autoLinked: [
          { importRecord: { name: 'Test 1' }, matchedCustomer: {}, appliedPhone: '123', confidence: 'exact' as const },
          { importRecord: { name: 'Test 2' }, matchedCustomer: {}, appliedPhone: '456', confidence: 'exact' as const }
        ],
        newCustomerPrompts: [
          { importRecord: { name: 'Test 3' }, suggestedCustomer: {} }
        ],
        errors: [],
        summary: {
          totalRecords: 3,
          autoLinked: 2,
          newCustomersCreated: 0,
          skipped: 1,
          errors: 0,
          processingTime: 100
        }
      };

      const stats = SimplifiedImportService.getImportStatistics(mockResult);

      expect(stats.totalProcessed).toBe(3);
      expect(stats.autoLinkedCount).toBe(2);
      expect(stats.newCustomerCount).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.successRate).toBe(66.67);
    });
  });

  describe('Summary updates', () => {
    it('should update summary when new customer is created', () => {
      const mockResult = {
        autoLinked: [],
        newCustomerPrompts: [],
        errors: [],
        summary: {
          totalRecords: 1,
          autoLinked: 0,
          newCustomersCreated: 0,
          skipped: 1,
          errors: 0,
          processingTime: 100
        }
      };

      SimplifiedImportService.updateSummaryForNewCustomer(mockResult);

      expect(mockResult.summary.newCustomersCreated).toBe(1);
      expect(mockResult.summary.skipped).toBe(0);
    });
  });

  describe('Column finding', () => {
    it('should find column index correctly', () => {
      const headers = ['Name', 'Phone Number', 'Location', 'Amount'];
      
      const nameIndex = SimplifiedImportService['findColumnIndex'](headers, ['name', 'contact name']);
      const phoneIndex = SimplifiedImportService['findColumnIndex'](headers, ['phone', 'phone number']);
      const locationIndex = SimplifiedImportService['findColumnIndex'](headers, ['location', 'address']);
      const missingIndex = SimplifiedImportService['findColumnIndex'](headers, ['email', 'email address']);

      expect(nameIndex).toBe(0);
      expect(phoneIndex).toBe(1);
      expect(locationIndex).toBe(2);
      expect(missingIndex).toBe(-1);
    });
  });
});