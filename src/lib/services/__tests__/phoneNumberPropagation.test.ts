/**
 * Test suite for Phone Number Propagation Service
 * Verifies automatic phone number propagation from Customer database to WhatsApp data
 */

import { PhoneNumberPropagationService } from '../phoneNumberPropagationService';
import type { MappingResult } from '../whatsappMapping';
import type { Customer } from '../../supabase/types';

// Mock customer data
const mockCustomer: Customer = {
  id: 'customer-1',
  name: 'John Doe',
  phone_no: '9876543210',
  location: 'Mumbai',
  invoice_id: 'INV001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Mock mapping results
const mockMappingResults: MappingResult[] = [
  {
    imported_name: 'John Doe',
    imported_phone: '98765-43210', // Different format
    matched_contact: mockCustomer,
    confidence: 'exact',
    source: 'imported',
    final_name: 'John Doe',
    final_phone: '98765-43210',
    additional_data: { location: 'Mumbai', outstanding: 5000 }
  },
  {
    imported_name: 'Jane Smith',
    imported_phone: null,
    matched_contact: {
      id: 'customer-2',
      name: 'Jane Smith',
      phone_no: '9876543211',
      location: 'Delhi',
      invoice_id: 'INV002',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    confidence: 'fuzzy',
    source: 'imported',
    final_name: 'Jane Smith',
    final_phone: '',
    additional_data: { location: 'Delhi', outstanding: 3000 }
  },
  {
    imported_name: 'New Customer',
    imported_phone: '9876543212',
    matched_contact: null,
    confidence: 'none',
    conflict_type: 'no_match',
    source: 'imported',
    final_name: 'New Customer',
    final_phone: '9876543212',
    additional_data: { location: 'Bangalore', outstanding: 2000 }
  }
];

describe('PhoneNumberPropagationService', () => {
  describe('enhanceMappingResultsWithPhonePropagation', () => {
    it('should propagate customer database phone numbers to matched records', async () => {
      const { enhancedResults, summary } = await PhoneNumberPropagationService
        .enhanceMappingResultsWithPhonePropagation(mockMappingResults);

      // First record should use customer database phone (normalized)
      expect(enhancedResults[0].final_phone).toBe('9876543210');
      expect(enhancedResults[0].source).toBe('contact_db');

      // Second record should get phone from customer database
      expect(enhancedResults[1].final_phone).toBe('9876543211');
      expect(enhancedResults[1].source).toBe('contact_db');

      // Third record (no match) should keep imported phone
      expect(enhancedResults[2].final_phone).toBe('9876543212');
      expect(enhancedResults[2].source).toBe('imported');

      // Check summary statistics
      expect(summary.totalProcessed).toBe(3);
      expect(summary.autoLinked).toBe(2); // Two records got customer phones
      expect(summary.validated).toBe(3); // All phones should be valid
    });
  });

  describe('validatePhoneNumberConsistency', () => {
    it('should detect phone number consistency issues', () => {
      const inconsistentResults: MappingResult[] = [
        {
          ...mockMappingResults[0],
          final_phone: '9876543210'
        },
        {
          ...mockMappingResults[0],
          final_phone: '9876543999' // Different phone for same customer
        }
      ];

      const validation = PhoneNumberPropagationService.validatePhoneNumberConsistency(inconsistentResults);

      expect(validation.isConsistent).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should pass validation for consistent phone numbers', () => {
      const consistentResults: MappingResult[] = [
        {
          ...mockMappingResults[0],
          final_phone: '9876543210'
        },
        {
          ...mockMappingResults[1],
          final_phone: '9876543211'
        }
      ];

      const validation = PhoneNumberPropagationService.validatePhoneNumberConsistency(consistentResults);

      expect(validation.isConsistent).toBe(true);
      expect(validation.issues.length).toBe(0);
    });
  });

  describe('validateMessagingReadiness', () => {
    it('should validate that all contacts have valid phone numbers for messaging', () => {
      const readiness = PhoneNumberPropagationService.validateMessagingReadiness(mockMappingResults);

      // Should identify issues with invalid phone formats
      expect(readiness.ready).toBe(false);
      expect(readiness.readyCount).toBeLessThan(mockMappingResults.length);
      expect(readiness.issues.length).toBeGreaterThan(0);
      expect(readiness.recommendations.length).toBeGreaterThan(0);
    });

    it('should pass validation when all phones are valid', () => {
      const validResults: MappingResult[] = mockMappingResults.map(result => ({
        ...result,
        final_phone: result.final_phone ? '9876543210' : '9876543211' // Valid phones
      }));

      const readiness = PhoneNumberPropagationService.validateMessagingReadiness(validResults);

      expect(readiness.ready).toBe(true);
      expect(readiness.readyCount).toBe(validResults.length);
      expect(readiness.issues.length).toBe(0);
    });
  });

  describe('updateSessionStorageWithCustomerPhones', () => {
    it('should update session storage with customer database phone numbers', () => {
      const mockSessionData = {
        customers: [
          {
            id: 'session-1',
            name: 'John Doe',
            phone_no: '98765-43210', // Formatted differently
            balance_pays: 5000
          },
          {
            id: 'session-2',
            name: 'Jane Smith',
            phone_no: '', // Empty phone
            balance_pays: 3000
          }
        ]
      };

      const { updatedSessionData, updates } = PhoneNumberPropagationService
        .updateSessionStorageWithCustomerPhones(mockSessionData, mockMappingResults);

      // Should have updates for records with customer matches
      expect(updates.length).toBeGreaterThan(0);
      
      // Session data should be updated with normalized customer phones
      const johnRecord = updatedSessionData.customers.find((c: any) => c.name === 'John Doe');
      expect(johnRecord?.phone_no).toBe('9876543210'); // Normalized

      // Should have timestamp
      expect(updatedSessionData.lastPhoneUpdate).toBeDefined();
    });
  });

  describe('getPhonePropagationStatistics', () => {
    it('should calculate accurate propagation statistics', () => {
      const originalResults = mockMappingResults.map(r => ({
        ...r,
        final_phone: r.imported_phone || '' // Simulate original state
      }));

      const enhancedResults = mockMappingResults.map(r => ({
        ...r,
        final_phone: r.matched_contact?.phone_no || r.imported_phone || '',
        source: r.matched_contact ? 'contact_db' as const : 'imported' as const
      }));

      const stats = PhoneNumberPropagationService.getPhonePropagationStatistics(
        originalResults,
        enhancedResults
      );

      expect(stats.totalRecords).toBe(3);
      expect(stats.phonesPropagated).toBeGreaterThan(0);
      expect(stats.messagingReady).toBeGreaterThan(0);
    });
  });
});

// Integration test helper
export function testPhonePropagationIntegration() {
  console.log('🧪 Testing Phone Number Propagation Integration...');
  
  // Test 1: Basic propagation
  const testResults = mockMappingResults;
  console.log('Input mapping results:', testResults.length);
  
  // Test 2: Validation
  const validation = PhoneNumberPropagationService.validatePhoneNumberConsistency(testResults);
  console.log('Consistency validation:', validation.isConsistent ? '✅ Passed' : '❌ Failed');
  
  // Test 3: Messaging readiness
  const readiness = PhoneNumberPropagationService.validateMessagingReadiness(testResults);
  console.log('Messaging readiness:', `${readiness.readyCount}/${testResults.length} ready`);
  
  console.log('✅ Phone propagation integration test completed');
}