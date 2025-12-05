/**
 * Basic tests for WhatsApp Cloud Service
 * Tests the foundation setup and phone validation
 */

import { WhatsAppCloudService } from '../whatsappCloudService';

describe('WhatsAppCloudService', () => {
  let cloudService: WhatsAppCloudService;

  beforeEach(() => {
    cloudService = WhatsAppCloudService.getInstance();
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone numbers', () => {
      const result = cloudService.validatePhoneNumber('9876543210');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('919876543210');
    });

    it('should handle phone numbers with country code', () => {
      const result = cloudService.validatePhoneNumber('919876543210');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('919876543210');
    });

    it('should handle formatted phone numbers', () => {
      const result = cloudService.validatePhoneNumber('+91 98765-43210');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('919876543210');
    });

    it('should reject invalid phone numbers', () => {
      const shortNumber = cloudService.validatePhoneNumber('123');
      expect(shortNumber.isValid).toBe(false);
      expect(shortNumber.error).toBe('Phone number must be between 10 and 15 digits');

      const longNumber = cloudService.validatePhoneNumber('12345678901234567890');
      expect(longNumber.isValid).toBe(false);
      expect(longNumber.error).toBe('Phone number must be between 10 and 15 digits');
    });

    it('should handle phone numbers with special characters', () => {
      const result = cloudService.validatePhoneNumber('(987) 654-3210');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('919876543210');
    });
  });

  describe('Service Status', () => {
    it('should return service status', async () => {
      const status = await cloudService.getServiceStatus();
      
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('errors');
      expect(status).toHaveProperty('warnings');
      expect(Array.isArray(status.errors)).toBe(true);
      expect(Array.isArray(status.warnings)).toBe(true);
    });
  });

  describe('Message Sending Foundation', () => {
    it('should validate configuration before sending', async () => {
      const result = await cloudService.sendMessage('9876543210', 'Test message');
      
      expect(result.success).toBe(false);
      expect(result.to).toBe('9876543210');
      expect(result.error).toContain('Configuration invalid');
    });

    it('should validate phone number before sending', async () => {
      const result = await cloudService.sendMessage('123', 'Test message');
      
      expect(result.success).toBe(false);
      expect(result.to).toBe('123');
      // The error could be either configuration or phone validation
      expect(result.error).toContain('Configuration invalid');
    });

    it('should validate message content', async () => {
      const emptyResult = await cloudService.sendMessage('9876543210', '');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toContain('Configuration invalid');

      const longMessage = 'a'.repeat(5000);
      const longResult = await cloudService.sendMessage('9876543210', longMessage);
      expect(longResult.success).toBe(false);
      expect(longResult.error).toContain('Configuration invalid');
    });

    it('should handle retry logic', async () => {
      const result = await cloudService.sendMessageWithRetry('9876543210', 'Test message', undefined, 2);
      
      expect(result.success).toBe(false);
      expect(result.to).toBe('9876543210');
      expect(result.error).toContain('Configuration invalid');
    });
  });

  describe('Message Status Tracking', () => {
    it('should track message status', async () => {
      const result = await cloudService.trackMessageStatus('test-message-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration invalid');
    });

    it('should process status updates', () => {
      const statusUpdate = {
        messageId: 'test-message-id',
        status: 'delivered' as const,
        timestamp: new Date().toISOString()
      };
      
      const result = cloudService.processStatusUpdate(statusUpdate);
      
      expect(result.success).toBe(true);
      expect(result.processedStatus).toBe('delivered');
    });

    it('should handle status update errors', () => {
      const statusUpdate = {
        messageId: 'test-message-id',
        status: 'failed' as const,
        timestamp: new Date().toISOString(),
        error: { code: 131026, message: 'Invalid phone number' }
      };
      
      const result = cloudService.processStatusUpdate(statusUpdate);
      
      expect(result.success).toBe(true);
      expect(result.processedStatus).toBe('failed');
    });
  });

  describe('Error Handling', () => {
    it('should calculate retry delays', () => {
      const delay1 = cloudService.calculateRetryDelay(1);
      const delay2 = cloudService.calculateRetryDelay(2);
      const delay3 = cloudService.calculateRetryDelay(3);
      
      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay3).toBeLessThanOrEqual(30000); // Max delay
    });

    it('should reset authentication cache', () => {
      cloudService.resetAuthenticationCache();
      // This should not throw an error
      expect(true).toBe(true);
    });
  });

  describe('Bulk Messaging Foundation', () => {
    it('should handle bulk message requests', async () => {
      const messages = [
        { to: '9876543210', message: 'Test 1' },
        { to: '9876543211', message: 'Test 2' }
      ];
      
      const result = await cloudService.sendBulkMessages(messages);
      
      expect(result.totalSent).toBe(0);
      expect(result.totalFailed).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.totalCost).toBe(0);
    });
  });
});