import { WhatsAppConfig, ConfigValidation, AccountInfo, WhatsAppApiResponse } from '@/types/whatsapp';
import axios, { AxiosInstance } from 'axios';

/**
 * WhatsApp Cloud API Configuration Service
 * Handles configuration validation, API client setup, and account verification
 */
export class WhatsAppConfigService {
  private static instance: WhatsAppConfigService;
  private config: WhatsAppConfig | null = null;
  private apiClient: AxiosInstance | null = null;

  private constructor() {}

  public static getInstance(): WhatsAppConfigService {
    if (!WhatsAppConfigService.instance) {
      WhatsAppConfigService.instance = new WhatsAppConfigService();
    }
    return WhatsAppConfigService.instance;
  }

  /**
   * Load configuration from environment variables
   */
  public loadConfig(): WhatsAppConfig {
    const config: WhatsAppConfig = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      appId: process.env.WHATSAPP_APP_ID || '',
      appSecret: process.env.WHATSAPP_APP_SECRET || '',
      webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
      rateLimitPerSecond: parseInt(process.env.WHATSAPP_RATE_LIMIT_PER_SECOND || '80'),
      batchSize: parseInt(process.env.WHATSAPP_BATCH_SIZE || '10'),
      retryAttempts: parseInt(process.env.WHATSAPP_RETRY_ATTEMPTS || '3'),
      retryDelayMs: parseInt(process.env.WHATSAPP_RETRY_DELAY_MS || '1000'),
      defaultTemplate: process.env.WHATSAPP_DEFAULT_TEMPLATE || 'payment_reminder',
      messageTimeoutHours: parseInt(process.env.WHATSAPP_MESSAGE_TIMEOUT_HOURS || '24'),
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0'
    };

    this.config = config;
    return config;
  }

  /**
   * Get current configuration
   */
  public getConfig(): WhatsAppConfig {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Validate WhatsApp Cloud API configuration
   */
  public validateConfiguration(): ConfigValidation {
    const config = this.getConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!config.accessToken) {
      errors.push('WHATSAPP_ACCESS_TOKEN is required');
    }

    if (!config.phoneNumberId) {
      errors.push('WHATSAPP_PHONE_NUMBER_ID is required');
    }

    if (!config.businessAccountId) {
      errors.push('WHATSAPP_BUSINESS_ACCOUNT_ID is required');
    }

    if (!config.appId) {
      errors.push('WHATSAPP_APP_ID is required');
    }

    if (!config.appSecret) {
      errors.push('WHATSAPP_APP_SECRET is required');
    }

    // Webhook validation
    if (!config.webhookUrl) {
      warnings.push('WHATSAPP_WEBHOOK_URL is not configured - delivery status updates will not work');
    } else if (!config.webhookUrl.startsWith('https://')) {
      errors.push('WHATSAPP_WEBHOOK_URL must use HTTPS');
    }

    if (!config.webhookVerifyToken) {
      warnings.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured - webhook verification will fail');
    }

    // Rate limiting validation
    if (config.rateLimitPerSecond <= 0 || config.rateLimitPerSecond > 1000) {
      warnings.push('WHATSAPP_RATE_LIMIT_PER_SECOND should be between 1 and 1000');
    }

    if (config.batchSize <= 0 || config.batchSize > 100) {
      warnings.push('WHATSAPP_BATCH_SIZE should be between 1 and 100');
    }

    if (config.retryAttempts < 0 || config.retryAttempts > 10) {
      warnings.push('WHATSAPP_RETRY_ATTEMPTS should be between 0 and 10');
    }

    // API version validation
    const validVersions = ['v18.0', 'v19.0', 'v20.0'];
    if (!validVersions.includes(config.apiVersion)) {
      warnings.push(`WHATSAPP_API_VERSION should be one of: ${validVersions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get or create API client instance
   */
  public getApiClient(): AxiosInstance {
    if (!this.apiClient) {
      const config = this.getConfig();
      
      this.apiClient = axios.create({
        baseURL: `https://graph.facebook.com/${config.apiVersion}`,
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      });

      // Add request interceptor for logging
      this.apiClient.interceptors.request.use(
        (config) => {
          console.log(`WhatsApp API Request: ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => {
          console.error('WhatsApp API Request Error:', error);
          return Promise.reject(error);
        }
      );

      // Add response interceptor for error handling
      this.apiClient.interceptors.response.use(
        (response) => {
          console.log(`WhatsApp API Response: ${response.status} ${response.statusText}`);
          return response;
        },
        (error) => {
          console.error('WhatsApp API Response Error:', error.response?.data || error.message);
          return Promise.reject(error);
        }
      );
    }

    return this.apiClient;
  }

  /**
   * Test API connectivity and get account information
   */
  public async getAccountInfo(): Promise<WhatsAppApiResponse<AccountInfo>> {
    try {
      const validation = this.validateConfiguration();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            category: 'authentication' as any,
            message: `Configuration invalid: ${validation.errors.join(', ')}`,
            shouldRetry: false
          }
        };
      }

      const config = this.getConfig();
      const apiClient = this.getApiClient();

      // Get phone number information
      const response = await apiClient.get(`/${config.phoneNumberId}`);
      
      const accountInfo: AccountInfo = {
        id: response.data.id,
        name: response.data.verified_name || 'Unknown',
        phoneNumber: response.data.display_phone_number || 'Unknown',
        verificationStatus: response.data.code_verification_status || 'Unknown',
        qualityRating: response.data.quality_rating || 'Unknown',
        messagingLimit: response.data.messaging_limit_tier || 'Unknown'
      };

      return {
        success: true,
        data: accountInfo
      };
    } catch (error: any) {
      console.error('Failed to get account info:', error);
      
      return {
        success: false,
        error: {
          category: 'network_error' as any,
          message: error.response?.data?.error?.message || error.message || 'Failed to connect to WhatsApp API',
          shouldRetry: true
        }
      };
    }
  }

  /**
   * Validate webhook configuration
   */
  public validateWebhookToken(token: string): boolean {
    const config = this.getConfig();
    return token === config.webhookVerifyToken;
  }

  /**
   * Get setup instructions for missing configuration
   */
  public getSetupInstructions(): string[] {
    const validation = this.validateConfiguration();
    const instructions: string[] = [];

    if (!validation.isValid) {
      instructions.push('Complete WhatsApp Cloud API setup:');
      instructions.push('1. Create a Meta Business Account at business.facebook.com');
      instructions.push('2. Create a WhatsApp Business App in Meta for Developers');
      instructions.push('3. Add WhatsApp product to your app');
      instructions.push('4. Get a permanent access token');
      instructions.push('5. Add a phone number to your WhatsApp Business Account');
      instructions.push('6. Configure the following environment variables:');
      
      validation.errors.forEach(error => {
        instructions.push(`   - ${error}`);
      });

      if (validation.warnings.length > 0) {
        instructions.push('');
        instructions.push('Optional configuration (recommended):');
        validation.warnings.forEach(warning => {
          instructions.push(`   - ${warning}`);
        });
      }

      instructions.push('');
      instructions.push('For detailed setup instructions, visit:');
      instructions.push('https://developers.facebook.com/docs/whatsapp/cloud-api/get-started');
    }

    return instructions;
  }

  /**
   * Reset configuration (useful for testing)
   */
  public resetConfig(): void {
    this.config = null;
    this.apiClient = null;
  }
}

// Export singleton instance
export const whatsappConfig = WhatsAppConfigService.getInstance();