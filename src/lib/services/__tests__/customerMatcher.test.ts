import { CustomerMatcher } from '../customerMatcher';
import type { Customer } from '../../supabase/types';

// Mock Supabase client
jest.mock('../../supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: mockCustomers,
          error: null
        })),
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { code: 'PGRST116' }
            }))
          }))
        }))
      }))
    }))
  },
  handleSupabaseError: jest.fn((error) => error.message || 'Database error')
}));

// Mock customer data for testing
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Doe',
    phone_no: '1234567890',
    location: 'New York',
    invoice_id: 'INV001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone_no: '9876543210',
    location: 'Los Angeles',
    invoice_id: 'INV002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'ABC Company Ltd',
    phone_no: '5555555555',
    location: 'Chicago',
    invoice_id: 'INV003',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('CustomerMatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeNameForMatching', () => {
    it('should normalize names correctly', () => {
      expect(CustomerMatcher.normalizeNameForMatching('John Doe')).toBe('john doe');
      expect(CustomerMatcher.normalizeNameForMatching('  JANE   SMITH  ')).toBe('jane smith');
      expect(CustomerMatcher.normalizeNameForMatching('ABC Company Ltd.')).toBe('abc company ltd');
      expect(CustomerMatcher.normalizeNameForMatching('Test@Company#123')).toBe('testcompany123');
    });

    it('should handle empty or null names', () => {
      expect(CustomerMatcher.normalizeNameForMatching('')).toBe('');
      expect(CustomerMatcher.normalizeNameForMatching(null as any)).toBe('');
      expect(CustomerMatcher.normalizeNameForMatching(undefined as any)).toBe('');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      const result1 = CustomerMatcher.validatePhoneNumber('1234567890');
      expect(result1.isValid).toBe(true);
      expect(result1.formatted).toBe('1234567890');

      const result2 = CustomerMatcher.validatePhoneNumber('+1-234-567-8901');
      expect(result2.isValid).toBe(true);
      expect(result2.formatted).toBe('12345678901');
    });

    it('should reject invalid phone numbers', () => {
      const result1 = CustomerMatcher.validatePhoneNumber('123');
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Phone number must be at least 10 digits');

      const result2 = CustomerMatcher.validatePhoneNumber('12345678901234567890');
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Phone number must not exceed 15 digits');

      const result3 = CustomerMatcher.validatePhoneNumber('');
      expect(result3.isValid).toBe(false);
      expect(result3.error).toBe('Phone number is required');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone numbers correctly', () => {
      expect(CustomerMatcher.formatPhoneNumber('123-456-7890')).toBe('1234567890');
      expect(CustomerMatcher.formatPhoneNumber('+1 (234) 567-8901')).toBe('12345678901');
      expect(CustomerMatcher.formatPhoneNumber('abc123def456ghi7890')).toBe('1234567890');
    });

    it('should handle empty phone numbers', () => {
      expect(CustomerMatcher.formatPhoneNumber('')).toBe('');
      expect(CustomerMatcher.formatPhoneNumber(null as any)).toBe('');
    });
  });

  describe('findByName', () => {
    it('should find exact name matches', async () => {
      // Mock the getAllCustomersForMatching method
      jest.spyOn(CustomerMatcher, 'getAllCustomersForMatching').mockResolvedValue(mockCustomers);

      const result = await CustomerMatcher.findByName('John Doe');
      expect(result.confidence).toBe('exact');
      expect(result.matchType).toBe('name_exact');
      expect(result.customer?.name).toBe('John Doe');
    });

    it('should find case-insensitive matches', async () => {
      jest.spyOn(CustomerMatcher, 'getAllCustomersForMatching').mockResolvedValue(mockCustomers);

      const result = await CustomerMatcher.findByName('JANE SMITH');
      expect(result.confidence).toBe('exact');
      expect(result.matchType).toBe('name_exact');
      expect(result.customer?.name).toBe('Jane Smith');
    });

    it('should handle whitespace variations', async () => {
      jest.spyOn(CustomerMatcher, 'getAllCustomersForMatching').mockResolvedValue(mockCustomers);

      const result = await CustomerMatcher.findByName('  ABC   Company   Ltd  ');
      expect(result.confidence).toBe('exact');
      expect(result.matchType).toBe('name_exact');
      expect(result.customer?.name).toBe('ABC Company Ltd');
    });

    it('should return no match for non-existent names', async () => {
      jest.spyOn(CustomerMatcher, 'getAllCustomersForMatching').mockResolvedValue(mockCustomers);

      const result = await CustomerMatcher.findByName('Non Existent Customer');
      expect(result.confidence).toBe('none');
      expect(result.matchType).toBe('no_match');
      expect(result.customer).toBeNull();
    });

    it('should handle empty names', async () => {
      const result = await CustomerMatcher.findByName('');
      expect(result.confidence).toBe('none');
      expect(result.matchType).toBe('no_match');
      expect(result.customer).toBeNull();
    });
  });

  describe('getMatchingStats', () => {
    it('should calculate customer statistics correctly', async () => {
      jest.spyOn(CustomerMatcher, 'getAllCustomersForMatching').mockResolvedValue(mockCustomers);

      const stats = await CustomerMatcher.getMatchingStats();
      expect(stats.totalCustomers).toBe(3);
      expect(stats.customersWithPhones).toBe(3); // All mock customers have valid phones
      expect(stats.customersWithoutPhones).toBe(0);
    });

    it('should handle customers without phones', async () => {
      const customersWithoutPhones = [
        ...mockCustomers,
        {
          id: '4',
          name: 'No Phone Customer',
          phone_no: '',
          location: null,
          invoice_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      jest.spyOn(CustomerMatcher, 'getAllCustomersForMatching').mockResolvedValue(customersWithoutPhones);

      const stats = await CustomerMatcher.getMatchingStats();
      expect(stats.totalCustomers).toBe(4);
      expect(stats.customersWithPhones).toBe(3);
      expect(stats.customersWithoutPhones).toBe(1);
    });
  });
});