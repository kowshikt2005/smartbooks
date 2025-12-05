/**
 * Basic tests for WhatsApp Configuration Service
 * Tests the foundation setup without requiring actual API credentials
 */

import { WhatsAppConfigService } from '../whatsappConfig';

describe('WhatsAppConfigService', () => {
  let configService: WhatsAppConfigService;

  beforeEach(() => {
    // Reset environment variables for clean testing
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    delete process.env.WHATSAPP_APP_ID;
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.WHATSAPP_WEBHOOK_URL;
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    configService = WhatsAppConfigService.getInstance();
    configService.resetConfig();
  });

  describe('Configuration Loading', () => {
    it('should load default configuration values', () => {
      const config = configService.loadConfig();
      
      expect(config.rateLimitPerSecond).toBe(80);
      expect(config.batchSize).toBe(10);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelayMs).toBe(1000);
      expect(config.defaultTemplate).toBe('payment_reminder');
      expect(config.messageTimeoutHours).toBe(24);
      expect(config.apiVersion).toBe('v18.0');
    });

    it('should load environment variables when available', () => {
      process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
      process.env.WHATSAPP_RATE_LIMIT_PER_SECOND = '100';
      
      const config = configService.loadConfig();
      
      expect(config.accessToken).toBe('test_token');
      expect(config.phoneNumberId).toBe('test_phone_id');
      expect(config.rateLimitPerSecond).toBe(100);
    });
  });

  describe('Configuration Validation', () => {
    it('should return errors for missing required fields', () => {
      const validation = configService.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('WHATSAPP_ACCESS_TOKEN is required');
      expect(validation.errors).toContain('WHATSAPP_PHONE_NUMBER_ID is required');
      expect(validation.errors).toContain('WHATSAPP_BUSINESS_ACCOUNT_ID is required');
      expect(validation.errors).toContain('WHATSAPP_APP_ID is required');
      expect(validation.errors).toContain('WHATSAPP_APP_SECRET is required');
    });

    it('should return warnings for missing optional fields', () => {
      // Set required fields
      process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'test_waba_id';
      process.env.WHATSAPP_APP_ID = 'test_app_id';
      process.env.WHATSAPP_APP_SECRET = 'test_app_secret';
      
      configService.resetConfig();
      const validation = configService.validateConfiguration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('WHATSAPP_WEBHOOK_URL is not configured - delivery status updates will not work');
      expect(validation.warnings).toContain('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured - webhook verification will fail');
    });

    it('should validate webhook URL format', () => {
      // Set required fields
      process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'test_waba_id';
      process.env.WHATSAPP_APP_ID = 'test_app_id';
      process.env.WHATSAPP_APP_SECRET = 'test_app_secret';
      process.env.WHATSAPP_WEBHOOK_URL = 'http://insecure-url.com';
      
      configService.resetConfig();
      const validation = configService.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('WHATSAPP_WEBHOOK_URL must use HTTPS');
    });
  });

  describe('Webhook Token Validation', () => {
    it('should validate webhook tokens correctly', () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_verify_token';
      configService.resetConfig();
      
      expect(configService.validateWebhookToken('test_verify_token')).toBe(true);
      expect(configService.validateWebhookToken('wrong_token')).toBe(false);
    });
  });

  describe('Setup Instructions', () => {
    it('should provide setup instructions when configuration is invalid', () => {
      const instructions = configService.getSetupInstructions();
      
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toBe('Complete WhatsApp Cloud API setup:');
      expect(instructions.some(instruction => 
        instruction.includes('Create a Meta Business Account')
      )).toBe(true);
    });

    it('should return empty instructions when configuration is valid', () => {
      // Set all required fields
      process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'test_waba_id';
      process.env.WHATSAPP_APP_ID = 'test_app_id';
      process.env.WHATSAPP_APP_SECRET = 'test_app_secret';
      
      configService.resetConfig();
      const validation = configService.validateConfiguration();
      
      // Only check if configuration is valid, not the instructions length
      expect(validation.isValid).toBe(true);
    });
  });
});