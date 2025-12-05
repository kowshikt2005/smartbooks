import { 
  WhatsAppApiResponse, 
  MessageResult, 
  BulkMessage, 
  BulkMessageResult,
  WhatsAppError,
  WhatsAppErrorCategory,
  SendMessageResponse,
  PhoneNumberInfo,
  AccountInfo
} from '@/types/whatsapp';
import { whatsappConfig } from './whatsappConfig';
import { AxiosError } from 'axios';
import { supabase } from '../supabase/client';

/**
 * WhatsApp Cloud API Service
 * Main service for WhatsApp Cloud API communication with authentication and token management
 */
export class WhatsAppCloudService {
  private static instance: WhatsAppCloudService;
  private accessTokenValidUntil: Date | null = null;
  private lastTokenValidation: Date | null = null;
  private readonly TOKEN_VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): WhatsAppCloudService {
    if (!WhatsAppCloudService.instance) {
      WhatsAppCloudService.instance = new WhatsAppCloudService();
    }
    return WhatsAppCloudService.instance;
  }

  /**
   * Validate and refresh access token if needed
   */
  public async validateAccessToken(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const now = new Date();
      
      // Check if we need to validate the token
      if (this.lastTokenValidation && 
          (now.getTime() - this.lastTokenValidation.getTime()) < this.TOKEN_VALIDATION_INTERVAL) {
        return { isValid: true };
      }

      // Test token by making a simple API call
      const accountInfo = await this.getAccountInfo();
      
      if (accountInfo.success) {
        this.lastTokenValidation = now;
        // WhatsApp Cloud API tokens don't expire, but we track validation time
        this.accessTokenValidUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        return { isValid: true };
      } else {
        this.lastTokenValidation = null;
        this.accessTokenValidUntil = null;
        return { 
          isValid: false, 
          error: accountInfo.error?.message || 'Token validation failed' 
        };
      }
    } catch (error) {
      this.lastTokenValidation = null;
      this.accessTokenValidUntil = null;
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Token validation error' 
      };
    }
  }

  /**
   * Get account information (also serves as token validation)
   */
  public async getAccountInfo(): Promise<WhatsAppApiResponse<AccountInfo>> {
    try {
      const validation = whatsappConfig.validateConfiguration();
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            category: WhatsAppErrorCategory.AUTHENTICATION,
            code: 'CONFIG_INVALID',
            message: `Configuration invalid: ${validation.errors.join(', ')}`,
            shouldRetry: false
          }
        };
      }

      const config = whatsappConfig.getConfig();
      const apiClient = whatsappConfig.getApiClient();

      // Get phone number information
      const response = await apiClient.get(`/${config.phoneNumberId}`);
      
      const accountInfo: AccountInfo = {
        id: response.data.id,
        name: response.data.verified_name || 'Unknown',
        phoneNumber: response.data.display_phone_number || 'Unknown',
        verificationStatus: response.data.code_verification_status || 'VERIFIED',
        qualityRating: response.data.quality_rating || 'GREEN',
        messagingLimit: response.data.messaging_limit_tier || 'TIER_1000'
      };

      return {
        success: true,
        data: accountInfo
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleApiError(error as AxiosError)
      };
    }
  }

  /**
   * Enhanced phone number validation and formatting for WhatsApp Cloud API
   */
  public validatePhoneNumber(phoneNumber: string): { 
    isValid: boolean; 
    formatted?: string; 
    error?: string;
    countryCode?: string;
    nationalNumber?: string;
  } {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        isValid: false,
        error: 'Phone number is required'
      };
    }

    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if empty after cleaning
    if (!cleaned) {
      return {
        isValid: false,
        error: 'Phone number must contain digits'
      };
    }

    // Check length (should be 10-15 digits for international format)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        isValid: false,
        error: 'Phone number must be between 10 and 15 digits'
      };
    }

    let formatted = cleaned;
    let countryCode = '';
    let nationalNumber = '';

    // Handle different country codes and formats
    if (cleaned.length === 10) {
      // Assume India (+91) for 10-digit numbers
      countryCode = '91';
      nationalNumber = cleaned;
      formatted = '91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      // India number with country code
      countryCode = '91';
      nationalNumber = cleaned.substring(2);
      formatted = cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // US/Canada number
      countryCode = '1';
      nationalNumber = cleaned.substring(1);
      formatted = cleaned;
    } else if (cleaned.length === 13 && cleaned.startsWith('44')) {
      // UK number
      countryCode = '44';
      nationalNumber = cleaned.substring(2);
      formatted = cleaned;
    } else {
      // For other formats, assume the number is already in international format
      // Extract country code (1-4 digits) and national number
      if (cleaned.length >= 11) {
        // Try common country code lengths
        const possibleCountryCodes = [
          cleaned.substring(0, 1), // 1 digit (US, Canada)
          cleaned.substring(0, 2), // 2 digits (most countries)
          cleaned.substring(0, 3), // 3 digits (some countries)
          cleaned.substring(0, 4)  // 4 digits (rare)
        ];
        
        // For now, assume 2-digit country code for most international numbers
        countryCode = cleaned.substring(0, 2);
        nationalNumber = cleaned.substring(2);
        formatted = cleaned;
      } else {
        formatted = cleaned;
        nationalNumber = cleaned;
      }
    }

    // Additional validation for national number
    if (nationalNumber && (nationalNumber.length < 7 || nationalNumber.length > 12)) {
      return {
        isValid: false,
        error: 'Invalid national phone number length'
      };
    }

    return {
      isValid: true,
      formatted: formatted,
      countryCode: countryCode,
      nationalNumber: nationalNumber
    };
  }

  /**
   * Format phone number for WhatsApp Cloud API (E.164 format without +)
   */
  public formatPhoneForApi(phoneNumber: string): string | null {
    const validation = this.validatePhoneNumber(phoneNumber);
    return validation.isValid ? validation.formatted! : null;
  }

  /**
   * Test API connectivity and authentication
   */
  public async testConnection(): Promise<WhatsAppApiResponse<PhoneNumberInfo>> {
    try {
      // First validate the access token
      const tokenValidation = await this.validateAccessToken();
      if (!tokenValidation.isValid) {
        return {
          success: false,
          error: {
            category: WhatsAppErrorCategory.AUTHENTICATION,
            code: 'TOKEN_INVALID',
            message: tokenValidation.error || 'Access token is invalid',
            shouldRetry: false
          }
        };
      }

      const config = whatsappConfig.getConfig();
      const apiClient = whatsappConfig.getApiClient();

      const response = await apiClient.get(`/${config.phoneNumberId}`);
      
      return {
        success: true,
        data: {
          verified_name: response.data.verified_name,
          display_phone_number: response.data.display_phone_number,
          id: response.data.id,
          quality_rating: response.data.quality_rating
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleApiError(error as AxiosError)
      };
    }
  }

  /**
   * Ensure authentication is valid before making API calls
   */
  private async ensureAuthenticated(): Promise<{ success: boolean; error?: WhatsAppError }> {
    const validation = whatsappConfig.validateConfiguration();
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          category: WhatsAppErrorCategory.AUTHENTICATION,
          code: 'CONFIG_INVALID',
          message: `Configuration invalid: ${validation.errors.join(', ')}`,
          shouldRetry: false
        }
      };
    }

    const tokenValidation = await this.validateAccessToken();
    if (!tokenValidation.isValid) {
      return {
        success: false,
        error: {
          category: WhatsAppErrorCategory.AUTHENTICATION,
          code: 'TOKEN_INVALID',
          message: tokenValidation.error || 'Access token validation failed',
          shouldRetry: false
        }
      };
    }

    return { success: true };
  }

  /**
   * Send a template message via WhatsApp Cloud API with enhanced validation
   */
  public async sendTemplateMessage(
    to: string, 
    templateName: string, 
    templateLanguage: string = 'en',
    parameters: { [key: string]: string } = {},
    expectedVariables: string[] = []
  ): Promise<MessageResult> {
    const startTime = Date.now();
    
    try {
      // Ensure authentication is valid
      const authCheck = await this.ensureAuthenticated();
      if (!authCheck.success) {
        return {
          success: false,
          to: to,
          error: authCheck.error?.message || 'Authentication failed'
        };
      }

      // Validate phone number
      const phoneValidation = this.validatePhoneNumber(to);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          to: to,
          error: phoneValidation.error || 'Invalid phone number'
        };
      }

      // Enhanced template validation
      const templateValidation = this.validateTemplateParameters(templateName, parameters, expectedVariables);
      if (!templateValidation.isValid) {
        return {
          success: false,
          to: to,
          error: `Template validation failed: ${templateValidation.errors.join(', ')}`
        };
      }

      // Log warnings if any
      if (templateValidation.warnings.length > 0) {
        console.warn('⚠️ Template validation warnings:');
        templateValidation.warnings.forEach(warning => console.warn(`   ${warning}`));
      }

      const config = whatsappConfig.getConfig();
      const apiClient = whatsappConfig.getApiClient();

      // Build template components with enhanced parameter handling
      const templateComponents = this.buildTemplateComponents(parameters);

      // Prepare template message payload
      const templatePayload = {
        messaging_product: 'whatsapp',
        to: phoneValidation.formatted,
        type: 'template',
        template: {
          name: templateName.trim().toLowerCase(),
          language: {
            code: templateLanguage
          },
          components: templateComponents
        }
      };

      // Log template payload for debugging (without sensitive data)
      console.log(`📤 Sending template message:`);
      console.log(`   Template: ${templateName} (${templateLanguage})`);
      console.log(`   To: ${phoneValidation.formatted}`);
      console.log(`   Components: ${templateComponents.length} components`);
      console.log(`   Parameters: ${Object.keys(parameters).length} variables`);

      // Send template message via WhatsApp Cloud API
      const response = await apiClient.post(`/${config.phoneNumberId}/messages`, templatePayload);
      
      const responseData = response.data as SendMessageResponse;
      const messageId = responseData.messages?.[0]?.id;
      const waId = responseData.contacts?.[0]?.wa_id;

      if (!messageId) {
        return {
          success: false,
          to: to,
          error: 'No message ID returned from WhatsApp API'
        };
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`✅ WhatsApp template message sent successfully in ${responseTime}ms`);
      console.log(`   Message ID: ${messageId}`);
      console.log(`   Template: ${templateName} (${templateLanguage})`);
      console.log(`   To: ${waId || phoneValidation.formatted}`);
      console.log(`   Parameters: ${Object.keys(parameters).length} variables`);

      // Save message metadata to database (async, non-blocking)
      this.saveMessageMetadata({
        phoneNumber: waId || phoneValidation.formatted!,
        messageType: 'template',
        status: 'sent',
        whatsappMessageId: messageId
      }).catch(err => console.error('Failed to save message metadata:', err));

      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        to: waId || phoneValidation.formatted!,
        cost: 0, // Cost will be updated via webhook
        responseTime: responseTime
      };

    } catch (error) {
      const whatsappError = this.handleApiError(error as AxiosError);
      
      console.error('❌ WhatsApp template message sending failed:');
      console.error(`   To: ${to}`);
      console.error(`   Template: ${templateName}`);
      console.error(`   Error: ${whatsappError.message}`);
      console.error(`   Category: ${whatsappError.category}`);
      
      // Save failed message metadata to database (async, non-blocking)
      const phoneValidation = this.validatePhoneNumber(to);
      if (phoneValidation.isValid) {
        this.saveMessageMetadata({
          phoneNumber: phoneValidation.formatted!,
          messageType: 'template',
          status: 'failed',
          errorMessage: whatsappError.message
        }).catch(err => console.error('Failed to save failed message metadata:', err));
      }
      
      return {
        success: false,
        to: to,
        error: whatsappError.message,
        errorCode: whatsappError.code,
        shouldRetry: whatsappError.shouldRetry,
        retryAfter: whatsappError.retryAfter
      };
    }
  }

  /**
   * Enhanced template components builder with comprehensive parameter handling
   */
  private buildTemplateComponents(parameters: { [key: string]: string }): any[] {
    const components: any[] = [];
    
    // Extract and organize parameters by component type
    const headerParams: string[] = [];
    const bodyParams: string[] = [];
    const buttonParams: { [key: string]: string } = {};
    const defaultParams: string[] = [];
    
    Object.entries(parameters).forEach(([key, value]) => {
      if (key.startsWith('header_')) {
        const index = parseInt(key.replace('header_', '')) - 1;
        if (!isNaN(index) && index >= 0) {
          headerParams[index] = value;
        }
      } else if (key.startsWith('body_')) {
        const index = parseInt(key.replace('body_', '')) - 1;
        if (!isNaN(index) && index >= 0) {
          bodyParams[index] = value;
        }
      } else if (key.startsWith('button_')) {
        buttonParams[key] = value;
      } else {
        // For simple parameters without prefixes, add to body by default
        defaultParams.push(value);
      }
    });

    // Add default parameters to body if no explicit body parameters
    if (bodyParams.length === 0 && defaultParams.length > 0) {
      defaultParams.forEach((param, index) => {
        bodyParams[index] = param;
      });
    }

    // Add header component if there are header parameters
    if (headerParams.length > 0) {
      const validHeaderParams = headerParams.filter(p => p !== undefined && p !== null && p.trim() !== '');
      if (validHeaderParams.length > 0) {
        components.push({
          type: 'header',
          parameters: validHeaderParams.map(text => ({
            type: 'text',
            text: WhatsAppCloudService.formatTemplateParameters.cleanText(text)
          }))
        });
      }
    }

    // Add body component if there are body parameters
    if (bodyParams.length > 0) {
      const validBodyParams = bodyParams.filter(p => p !== undefined && p !== null && p.trim() !== '');
      if (validBodyParams.length > 0) {
        components.push({
          type: 'body',
          parameters: validBodyParams.map(text => ({
            type: 'text',
            text: WhatsAppCloudService.formatTemplateParameters.cleanText(text)
          }))
        });
      }
    }

    // Add button components if there are button parameters
    Object.entries(buttonParams).forEach(([key, value]) => {
      const buttonMatch = key.match(/button_(\d+)(?:_(.+))?/);
      if (buttonMatch) {
        const buttonIndex = parseInt(buttonMatch[1]) - 1; // Convert to 0-based index
        const buttonType = buttonMatch[2] || 'url'; // Default to URL button
        
        if (!isNaN(buttonIndex) && buttonIndex >= 0 && value && value.trim() !== '') {
          const buttonComponent: any = {
            type: 'button',
            sub_type: buttonType,
            index: buttonIndex,
            parameters: [{
              type: 'text',
              text: WhatsAppCloudService.formatTemplateParameters.cleanText(value)
            }]
          };

          components.push(buttonComponent);
        }
      }
    });

    // Sort button components by index to ensure correct order
    const buttonComponents = components.filter(c => c.type === 'button');
    const otherComponents = components.filter(c => c.type !== 'button');
    buttonComponents.sort((a, b) => a.index - b.index);

    return [...otherComponents, ...buttonComponents];
  }

  /**
   * Validate template before sending (comprehensive pre-send validation)
   */
  public async validateTemplateBeforeSending(
    templateName: string,
    parameters: { [key: string]: string },
    expectedVariables: string[] = []
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    components: any[];
    estimatedLength: number;
  }> {
    const validation = this.validateTemplateParameters(templateName, parameters, expectedVariables);
    const components = this.buildTemplateComponents(parameters);
    
    // Estimate message length for cost calculation
    let estimatedLength = 0;
    components.forEach(component => {
      if (component.parameters) {
        component.parameters.forEach((param: any) => {
          if (param.text) {
            estimatedLength += param.text.length;
          }
        });
      }
    });

    // Additional validation for component structure
    const additionalErrors: string[] = [];
    const additionalWarnings: string[] = [];

    // Check if template has at least one component
    if (components.length === 0) {
      additionalErrors.push('Template must have at least one component (header, body, or button)');
    }

    // Validate component limits (WhatsApp limits)
    const headerComponents = components.filter(c => c.type === 'header');
    const bodyComponents = components.filter(c => c.type === 'body');
    const buttonComponents = components.filter(c => c.type === 'button');

    if (headerComponents.length > 1) {
      additionalErrors.push('Template can have at most one header component');
    }

    if (bodyComponents.length > 1) {
      additionalErrors.push('Template can have at most one body component');
    }

    if (buttonComponents.length > 3) {
      additionalErrors.push('Template can have at most 3 button components');
    }

    // Check parameter limits per component
    headerComponents.forEach(component => {
      if (component.parameters && component.parameters.length > 1) {
        additionalWarnings.push('Header component should typically have only one parameter');
      }
    });

    bodyComponents.forEach(component => {
      if (component.parameters && component.parameters.length > 10) {
        additionalErrors.push('Body component can have at most 10 parameters');
      }
    });

    return {
      isValid: validation.isValid && additionalErrors.length === 0,
      errors: [...validation.errors, ...additionalErrors],
      warnings: [...validation.warnings, ...additionalWarnings],
      components,
      estimatedLength
    };
  }

  /**
   * Enhanced template validation with comprehensive checks
   */
  public validateTemplateParameters(
    templateName: string,
    parameters: { [key: string]: string },
    expectedVariables: string[] = []
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if template name is valid
    if (!templateName || templateName.trim().length === 0) {
      errors.push('Template name is required');
      return { isValid: false, errors, warnings };
    }

    // Validate template name format (WhatsApp requirements)
    const templateNameRegex = /^[a-z0-9_]+$/;
    if (!templateNameRegex.test(templateName.trim())) {
      errors.push('Template name must contain only lowercase letters, numbers, and underscores');
    }

    // Check for required variables
    expectedVariables.forEach(variable => {
      const hasVariable = Object.keys(parameters).some(key => 
        key === variable || 
        key.includes(variable) ||
        Object.values(parameters).some(value => value.includes(`{{${variable}}}`))
      );
      
      if (!hasVariable) {
        warnings.push(`Expected variable '${variable}' not found in parameters`);
      }
    });

    // Validate parameter values
    Object.entries(parameters).forEach(([key, value]) => {
      if (!value || value.trim().length === 0) {
        errors.push(`Parameter '${key}' cannot be empty`);
      }
      
      if (value && value.length > 1024) {
        errors.push(`Parameter '${key}' exceeds 1024 character limit`);
      }

      // Check for invalid characters in parameters
      if (value && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(value)) {
        warnings.push(`Parameter '${key}' contains emojis which may not render correctly in all templates`);
      }
    });

    // Validate parameter structure for WhatsApp template components
    const headerParams = Object.keys(parameters).filter(key => key.startsWith('header_'));
    const bodyParams = Object.keys(parameters).filter(key => key.startsWith('body_'));
    const buttonParams = Object.keys(parameters).filter(key => key.startsWith('button_'));

    // Check parameter indexing (should be sequential)
    if (headerParams.length > 0) {
      const headerIndices = headerParams.map(key => parseInt(key.replace('header_', ''))).sort((a, b) => a - b);
      for (let i = 0; i < headerIndices.length; i++) {
        if (headerIndices[i] !== i + 1) {
          errors.push(`Header parameters must be sequential starting from 1. Missing header_${i + 1}`);
          break;
        }
      }
    }

    if (bodyParams.length > 0) {
      const bodyIndices = bodyParams.map(key => parseInt(key.replace('body_', ''))).sort((a, b) => a - b);
      for (let i = 0; i < bodyIndices.length; i++) {
        if (bodyIndices[i] !== i + 1) {
          errors.push(`Body parameters must be sequential starting from 1. Missing body_${i + 1}`);
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Enhanced template message formatting with comprehensive variable substitution
   */
  public formatTemplateMessage(
    messageTemplate: string,
    variables: { [key: string]: string }
  ): { formatted: string; missingVariables: string[]; substitutionCount: number } {

    let formatted = messageTemplate;
    const missingVariables: string[] = [];
    let substitutionCount = 0;

    // Find all variables in the template (format: {{variable_name}})
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches = messageTemplate.match(variablePattern) || [];
    
    matches.forEach(match => {
      const variableName = match.replace(/[{}]/g, '').trim();
      
      if (variables[variableName] !== undefined && variables[variableName] !== null) {
        // Replace all occurrences of this variable
        const regex = new RegExp(`\\{\\{\\s*${variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
        const replacementCount = (formatted.match(regex) || []).length;
        formatted = formatted.replace(regex, variables[variableName]);
        substitutionCount += replacementCount;
      } else {
        if (!missingVariables.includes(variableName)) {
          missingVariables.push(variableName);
        }
      }
    });
    
    return {
      formatted,
      missingVariables,
      substitutionCount
    };
  }

  /**
   * Template parameter formatting utilities
   */
  public static formatTemplateParameters = {
    /**
     * Format currency values for templates
     */
    formatCurrency: (amount: number | string, currency: string = '₹'): string => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount)) return '0';
      return `${currency}${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    },

    /**
     * Format dates for templates
     */
    formatDate: (date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      
      switch (format) {
        case 'long':
          return dateObj.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'iso':
          return dateObj.toISOString().split('T')[0];
        default:
          return dateObj.toLocaleDateString('en-IN');
      }
    },

    /**
     * Format phone numbers for display in templates
     */
    formatPhone: (phone: string): string => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
      } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
        const national = cleaned.substring(2);
        return `+91 ${national.substring(0, 5)} ${national.substring(5)}`;
      }
      return phone;
    },

    /**
     * Capitalize first letter of each word
     */
    titleCase: (text: string): string => {
      return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    },

    /**
     * Truncate text to specified length with ellipsis
     */
    truncate: (text: string, maxLength: number = 50): string => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    },

    /**
     * Format business hours or time
     */
    formatTime: (time: string | Date): string => {
      const timeObj = typeof time === 'string' ? new Date(`1970-01-01T${time}`) : time;
      if (isNaN(timeObj.getTime())) return time.toString();
      
      return timeObj.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    },

    /**
     * Clean and format text for WhatsApp (remove extra spaces, line breaks)
     */
    cleanText: (text: string): string => {
      return text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n')  // Replace multiple line breaks with single
        .trim();
    },

    /**
     * Format invoice or reference numbers
     */
    formatReference: (ref: string, prefix: string = ''): string => {
      const cleaned = ref.toString().toUpperCase();
      return prefix ? `${prefix}${cleaned}` : cleaned;
    }
  };

  /**
   * Build customer-specific template parameters from customer data
   */
  public buildCustomerTemplateParameters(
    customerData: {
      name?: string;
      phone?: string;
      location?: string;
      invoiceId?: string;
      amount?: number | string;
      dueDate?: Date | string;
      [key: string]: any;
    },
    additionalParams: { [key: string]: string } = {}
  ): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const formatter = WhatsAppCloudService.formatTemplateParameters;

    // Standard customer parameters
    if (customerData.name) {
      params.customer_name = formatter.titleCase(customerData.name);
      params.name = formatter.titleCase(customerData.name);
    }

    if (customerData.phone) {
      params.customer_phone = formatter.formatPhone(customerData.phone);
      params.phone = formatter.formatPhone(customerData.phone);
    }

    if (customerData.location) {
      params.customer_location = formatter.titleCase(customerData.location);
      params.location = formatter.titleCase(customerData.location);
    }

    if (customerData.invoiceId) {
      params.invoice_id = formatter.formatReference(customerData.invoiceId, 'INV-');
      params.invoice = formatter.formatReference(customerData.invoiceId, 'INV-');
    }

    if (customerData.amount) {
      params.amount = formatter.formatCurrency(customerData.amount);
      params.outstanding = formatter.formatCurrency(customerData.amount);
    }

    if (customerData.dueDate) {
      params.due_date = formatter.formatDate(customerData.dueDate);
      params.date = formatter.formatDate(customerData.dueDate);
    }

    // Add current date and time
    params.current_date = formatter.formatDate(new Date());
    params.current_time = formatter.formatTime(new Date());

    // Add any additional custom parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      params[key] = formatter.cleanText(value);
    });

    // Add any extra fields from customer data
    Object.entries(customerData).forEach(([key, value]) => {
      if (!params[key] && value !== undefined && value !== null) {
        params[key] = formatter.cleanText(value.toString());
      }
    });

    return params;
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  public async sendMessage(
    to: string, 
    message: string, 
    templateName?: string
  ): Promise<MessageResult> {
    const startTime = Date.now();
    
    try {
      // Ensure authentication is valid
      const authCheck = await this.ensureAuthenticated();
      if (!authCheck.success) {
        return {
          success: false,
          to: to,
          error: authCheck.error?.message || 'Authentication failed'
        };
      }

      // Validate phone number
      const phoneValidation = this.validatePhoneNumber(to);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          to: to,
          error: phoneValidation.error || 'Invalid phone number'
        };
      }

      // Validate message content
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          to: to,
          error: 'Message content cannot be empty'
        };
      }

      // Check message length (WhatsApp limit is 4096 characters)
      if (message.length > 4096) {
        return {
          success: false,
          to: to,
          error: 'Message exceeds 4096 character limit'
        };
      }

      const config = whatsappConfig.getConfig();
      const apiClient = whatsappConfig.getApiClient();

      // Prepare message payload
      const messagePayload = {
        messaging_product: 'whatsapp',
        to: phoneValidation.formatted,
        type: 'text',
        text: {
          body: message.trim()
        }
      };

      // Send message via WhatsApp Cloud API
      const response = await apiClient.post(`/${config.phoneNumberId}/messages`, messagePayload);
      
      const responseData = response.data as SendMessageResponse;
      const messageId = responseData.messages?.[0]?.id;
      const waId = responseData.contacts?.[0]?.wa_id;

      if (!messageId) {
        return {
          success: false,
          to: to,
          error: 'No message ID returned from WhatsApp API'
        };
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`✅ WhatsApp message sent successfully in ${responseTime}ms`);
      console.log(`   Message ID: ${messageId}`);
      console.log(`   To: ${waId || phoneValidation.formatted}`);
      console.log(`   Length: ${message.length} characters`);

      // Save message metadata to database (async, non-blocking)
      this.saveMessageMetadata({
        phoneNumber: waId || phoneValidation.formatted!,
        messageType: 'text',
        status: 'sent',
        whatsappMessageId: messageId
      }).catch(err => console.error('Failed to save message metadata:', err));

      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        to: waId || phoneValidation.formatted!,
        cost: 0, // Cost will be updated via webhook
        responseTime: responseTime
      };

    } catch (error) {
      const whatsappError = this.handleApiError(error as AxiosError);
      
      console.error('❌ WhatsApp message sending failed:');
      console.error(`   To: ${to}`);
      console.error(`   Error: ${whatsappError.message}`);
      console.error(`   Category: ${whatsappError.category}`);
      
      // Save failed message metadata to database (async, non-blocking)
      const phoneValidation = this.validatePhoneNumber(to);
      if (phoneValidation.isValid) {
        this.saveMessageMetadata({
          phoneNumber: phoneValidation.formatted!,
          messageType: 'text',
          status: 'failed',
          errorMessage: whatsappError.message
        }).catch(err => console.error('Failed to save failed message metadata:', err));
      }
      
      return {
        success: false,
        to: to,
        error: whatsappError.message,
        errorCode: whatsappError.code,
        shouldRetry: whatsappError.shouldRetry,
        retryAfter: whatsappError.retryAfter
      };
    }
  }

  /**
   * Send template message with customer data (implements requirement 3.4)
   * WHERE a template includes variables, THE SmartBooks System SHALL populate them with customer-specific data
   */
  public async sendTemplateMessageWithCustomerData(
    to: string,
    templateName: string,
    customerData: {
      name?: string;
      phone?: string;
      location?: string;
      invoiceId?: string;
      amount?: number | string;
      dueDate?: Date | string;
      [key: string]: any;
    },
    templateLanguage: string = 'en',
    additionalParams: { [key: string]: string } = {},
    expectedVariables: string[] = []
  ): Promise<MessageResult> {
    try {
      // Build customer-specific template parameters
      const templateParameters = this.buildCustomerTemplateParameters(customerData, additionalParams);
      
      console.log(`📋 Building template message with customer data:`);
      console.log(`   Customer: ${customerData.name || 'Unknown'}`);
      console.log(`   Template: ${templateName}`);
      console.log(`   Parameters: ${Object.keys(templateParameters).length} variables`);
      
      // Log parameter mapping for debugging
      Object.entries(templateParameters).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Send template message with populated parameters
      return await this.sendTemplateMessage(
        to,
        templateName,
        templateLanguage,
        templateParameters,
        expectedVariables
      );
    } catch (error) {
      console.error('❌ Failed to send template message with customer data:', error);
      return {
        success: false,
        to: to,
        error: error instanceof Error ? error.message : 'Failed to process customer data for template'
      };
    }
  }

  /**
   * Send message with automatic retry logic
   */
  public async sendMessageWithRetry(
    to: string, 
    message: string, 
    templateName?: string,
    maxRetries: number = 3
  ): Promise<MessageResult> {
    let lastResult: MessageResult | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📤 Sending WhatsApp message (attempt ${attempt}/${maxRetries})`);
      
      const result = await this.sendMessage(to, message, templateName);
      
      if (result.success) {
        if (attempt > 1) {
          console.log(`✅ Message sent successfully after ${attempt} attempts`);
        }
        return result;
      }
      
      lastResult = result;
      
      // Don't retry if it's not a retryable error
      if (!result.shouldRetry) {
        console.log(`❌ Non-retryable error: ${result.error}`);
        break;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        console.log(`❌ Max retries (${maxRetries}) reached`);
        break;
      }
      
      // Calculate delay for next retry
      const delay = result.retryAfter ? 
        result.retryAfter * 1000 : 
        this.calculateRetryDelay(attempt);
      
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return lastResult || {
      success: false,
      to: to,
      error: 'Failed to send message after retries'
    };
  }

  /**
   * Track message status and handle status updates
   */
  public async trackMessageStatus(messageId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      // Ensure authentication is valid
      const authCheck = await this.ensureAuthenticated();
      if (!authCheck.success) {
        return {
          success: false,
          error: authCheck.error?.message || 'Authentication failed'
        };
      }

      // Note: WhatsApp Cloud API doesn't provide a direct endpoint to query message status
      // Status updates are received via webhooks only
      // This method is a placeholder for future webhook integration
      
      console.log(`📊 Message status tracking initiated for: ${messageId}`);
      console.log('   Status updates will be received via webhook');
      
      return {
        success: true,
        status: 'tracking_initiated'
      };
    } catch (error) {
      const whatsappError = this.handleApiError(error as AxiosError);
      return {
        success: false,
        error: whatsappError.message
      };
    }
  }

  /**
   * Process message status update from webhook
   */
  public processStatusUpdate(statusUpdate: {
    messageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    error?: any;
  }): {
    success: boolean;
    processedStatus: string;
    error?: string;
  } {
    try {
      const { messageId, status, timestamp, error } = statusUpdate;
      
      console.log(`📨 Processing status update for message ${messageId}:`);
      console.log(`   Status: ${status}`);
      console.log(`   Timestamp: ${timestamp}`);
      
      if (error) {
        console.log(`   Error: ${JSON.stringify(error)}`);
      }

      // Here we would typically update the database
      // For now, we'll just log the status update
      
      const processedStatus = this.mapWhatsAppStatus(status);
      
      return {
        success: true,
        processedStatus: processedStatus
      };
    } catch (err) {
      console.error('Failed to process status update:', err);
      return {
        success: false,
        processedStatus: 'unknown',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Map WhatsApp status to internal status
   */
  private mapWhatsAppStatus(whatsappStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
      'warning': 'sent', // Sent but with warnings
      'accepted': 'sent'  // Message accepted by WhatsApp
    };
    
    return statusMap[whatsappStatus] || 'unknown';
  }

  /**
   * Send bulk messages (foundation for future implementation)
   * This is a placeholder that will be fully implemented in task 5
   */
  public async sendBulkMessages(messages: BulkMessage[]): Promise<BulkMessageResult> {
    console.log(`Bulk message sending foundation ready for ${messages.length} messages`);
    
    return {
      totalSent: 0,
      totalFailed: messages.length,
      results: messages.map(msg => ({
        success: false,
        to: msg.to,
        error: 'Bulk messaging not yet implemented - will be completed in task 5'
      })),
      totalCost: 0
    };
  }

  /**
   * Enhanced API error handling with detailed categorization
   */
  private handleApiError(error: AxiosError): WhatsAppError {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 401:
          // Clear cached token validation on auth errors
          this.lastTokenValidation = null;
          this.accessTokenValidUntil = null;
          return {
            category: WhatsAppErrorCategory.AUTHENTICATION,
            code: data?.error?.code?.toString() || 'AUTH_ERROR',
            message: data?.error?.message || 'Invalid access token or authentication failed',
            shouldRetry: false
          };
        
        case 403:
          return {
            category: WhatsAppErrorCategory.AUTHENTICATION,
            code: data?.error?.code?.toString() || 'FORBIDDEN',
            message: data?.error?.message || 'Access forbidden - check permissions',
            shouldRetry: false
          };
        
        case 429:
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          return {
            category: WhatsAppErrorCategory.RATE_LIMIT,
            code: 'RATE_LIMIT',
            message: `Rate limit exceeded. Retry after ${retryAfter} seconds`,
            shouldRetry: true,
            retryAfter: retryAfter
          };
        
        case 400:
          // Handle specific WhatsApp error codes
          const errorCode = data?.error?.code;
          
          if (errorCode === 131026 || errorCode === 131047 || errorCode === 131048) {
            return {
              category: WhatsAppErrorCategory.INVALID_PHONE,
              code: errorCode.toString(),
              message: data?.error?.message || 'Invalid phone number format',
              shouldRetry: false
            };
          }
          
          if (errorCode === 131005 || errorCode === 131009) {
            return {
              category: WhatsAppErrorCategory.TEMPLATE_ERROR,
              code: errorCode.toString(),
              message: data?.error?.message || 'Template error',
              shouldRetry: false
            };
          }
          
          if (errorCode === 131051 || errorCode === 131052) {
            return {
              category: WhatsAppErrorCategory.POLICY_VIOLATION,
              code: errorCode.toString(),
              message: data?.error?.message || 'Message violates WhatsApp policy',
              shouldRetry: false
            };
          }
          
          return {
            category: WhatsAppErrorCategory.POLICY_VIOLATION,
            code: errorCode?.toString() || 'BAD_REQUEST',
            message: data?.error?.message || 'Bad request',
            shouldRetry: false
          };
        
        case 404:
          return {
            category: WhatsAppErrorCategory.UNKNOWN,
            code: 'NOT_FOUND',
            message: 'Resource not found - check phone number ID or endpoint',
            shouldRetry: false
          };
        
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            category: WhatsAppErrorCategory.NETWORK_ERROR,
            code: status.toString(),
            message: 'WhatsApp API server error - please try again later',
            shouldRetry: true
          };
        
        default:
          return {
            category: WhatsAppErrorCategory.UNKNOWN,
            code: status.toString(),
            message: data?.error?.message || `HTTP ${status} error`,
            shouldRetry: status >= 500
          };
      }
    } else if (error.request) {
      return {
        category: WhatsAppErrorCategory.NETWORK_ERROR,
        code: 'NETWORK_ERROR',
        message: 'Network error - unable to reach WhatsApp API',
        shouldRetry: true
      };
    } else {
      return {
        category: WhatsAppErrorCategory.UNKNOWN,
        code: 'UNKNOWN',
        message: error.message || 'Unknown error occurred',
        shouldRetry: false
      };
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  public calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
    const maxDelay = 30000; // 30 seconds max
    const jitter = Math.random() * 0.1; // 10% jitter
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    return Math.floor(delay * (1 + jitter));
  }

  /**
   * Get comprehensive service status and configuration info
   */
  public async getServiceStatus(): Promise<{
    configured: boolean;
    authenticated: boolean;
    errors: string[];
    warnings: string[];
    accountInfo?: AccountInfo;
    tokenStatus?: {
      isValid: boolean;
      lastValidated?: Date;
      validUntil?: Date;
    };
  }> {
    const validation = whatsappConfig.validateConfiguration();
    const result = {
      configured: validation.isValid,
      authenticated: false,
      errors: [...validation.errors],
      warnings: [...validation.warnings],
      accountInfo: undefined as AccountInfo | undefined,
      tokenStatus: {
        isValid: false,
        lastValidated: this.lastTokenValidation || undefined,
        validUntil: this.accessTokenValidUntil || undefined
      }
    };

    // If configuration is valid, test authentication
    if (validation.isValid) {
      try {
        const tokenValidation = await this.validateAccessToken();
        result.authenticated = tokenValidation.isValid;
        result.tokenStatus.isValid = tokenValidation.isValid;

        if (tokenValidation.isValid) {
          // Get account info if authenticated
          const accountInfo = await this.getAccountInfo();
          if (accountInfo.success) {
            result.accountInfo = accountInfo.data;
          } else {
            result.errors.push(accountInfo.error?.message || 'Failed to get account info');
          }
        } else {
          result.errors.push(tokenValidation.error || 'Token validation failed');
        }
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Authentication test failed');
      }
    }

    return result;
  }

  /**
   * Reset authentication cache (useful for testing or token refresh)
   */
  public resetAuthenticationCache(): void {
    this.lastTokenValidation = null;
    this.accessTokenValidUntil = null;
  }

  /**
   * Save message metadata to database (lightweight tracking)
   * Only saves essential info: phone, status, timestamp, message type
   */
  private async saveMessageMetadata(params: {
    phoneNumber: string;
    messageType: 'text' | 'template';
    status: 'sent' | 'failed';
    whatsappMessageId?: string;
    errorMessage?: string;
    customerId?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          phone_number: params.phoneNumber,
          message_content: '', // Empty - we don't store full message content
          message_type: params.messageType,
          status: params.status,
          whatsapp_message_id: params.whatsappMessageId,
          error_message: params.errorMessage,
          customer_id: params.customerId,
          sent_at: params.status === 'sent' ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to save message metadata:', error);
        // Don't throw - we don't want to fail the message send if DB save fails
      }
    } catch (error) {
      console.error('Error saving message metadata:', error);
      // Silent fail - DB tracking is secondary to actual message sending
    }
  }
}

// Export singleton instance
export const whatsappCloudService = WhatsAppCloudService.getInstance();

  /**
   * Send document (Excel, PDF, etc.) via WhatsApp Cloud API
   */
  public async sendDocumentMessage(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<MessageResult> {
    const startTime = Date.now();
    
    try {
      // Ensure authentication is valid
      const authCheck = await this.ensureAuthenticated();
      if (!authCheck.success) {
        return {
          success: false,
          to: to,
          error: authCheck.error?.message || 'Authentication failed'
        };
      }

      // Validate phone number
      const phoneValidation = this.validatePhoneNumber(to);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          to: to,
          error: phoneValidation.error || 'Invalid phone number'
        };
      }

      // Validate document URL
      if (!documentUrl || !documentUrl.startsWith('http')) {
        return {
          success: false,
          to: to,
          error: 'Invalid document URL'
        };
      }

      const config = whatsappConfig.getConfig();
      const apiClient = whatsappConfig.getApiClient();

      // Prepare document message payload
      const documentPayload = {
        messaging_product: 'whatsapp',
        to: phoneValidation.formatted,
        type: 'document',
        document: {
          link: documentUrl,
          filename: filename || 'document.xlsx',
          caption: caption || ''
        }
      };

      console.log(`📎 Sending document message:`);
      console.log(`   To: ${phoneValidation.formatted}`);
      console.log(`   File: ${filename}`);
      console.log(`   URL: ${documentUrl}`);

      // Send document message via WhatsApp Cloud API
      const response = await apiClient.post(`/${config.phoneNumberId}/messages`, documentPayload);
      
      const responseData = response.data as SendMessageResponse;
      const messageId = responseData.messages?.[0]?.id;
      const waId = responseData.contacts?.[0]?.wa_id;

      if (!messageId) {
        return {
          success: false,
          to: to,
          error: 'No message ID returned from WhatsApp API'
        };
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`✅ WhatsApp document sent successfully in ${responseTime}ms`);
      console.log(`   Message ID: ${messageId}`);
      console.log(`   To: ${waId || phoneValidation.formatted}`);
      console.log(`   File: ${filename}`);

      // Save message metadata to database (async, non-blocking)
      this.saveMessageMetadata({
        phoneNumber: waId || phoneValidation.formatted!,
        messageType: 'template',
        status: 'sent',
        whatsappMessageId: messageId
      }).catch(err => console.error('Failed to save message metadata:', err));

      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        to: waId || phoneValidation.formatted!,
        cost: 0,
        responseTime: responseTime
      };

    } catch (error) {
      const whatsappError = this.handleApiError(error as AxiosError);
      
      console.error('❌ WhatsApp document sending failed:');
      console.error(`   To: ${to}`);
      console.error(`   File: ${filename}`);
      console.error(`   Error: ${whatsappError.message}`);
      
      return {
        success: false,
        to: to,
        error: whatsappError.message,
        errorCode: whatsappError.code,
        shouldRetry: whatsappError.shouldRetry,
        retryAfter: whatsappError.retryAfter
      };
    }
  }
