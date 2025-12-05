// Export all service classes for easy importing
export { CustomerService } from './customers';
export { CustomerMatcher } from './customerMatcher';
export { TerminologyService } from './terminology';

// WhatsApp Cloud API services
export { WhatsAppConfigService, whatsappConfig } from './whatsappConfig';
export { WhatsAppCloudService, whatsappCloudService } from './whatsappCloudService';
export { WhatsAppTemplateService, whatsappTemplateService } from './whatsappTemplates';
export { WhatsAppAnalyticsService, whatsappAnalyticsService } from './whatsappAnalytics';

// Excel and File services
export { ExcelGenerator } from './excelGenerator';
export { FileUploadService } from './fileUpload';

// Re-export types for convenience
export type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  Database
} from '../supabase/types';

// Re-export CustomerMatcher types
export type {
  MatchResult,
  PhoneValidationResult
} from './customerMatcher';

// Re-export WhatsApp types
export type {
  WhatsAppConfig,
  WhatsAppMessage,
  WhatsAppTemplate,
  WhatsAppCampaign,
  MessageResult,
  BulkMessageResult,
  ConfigValidation,
  AccountInfo
} from '../../types/whatsapp';