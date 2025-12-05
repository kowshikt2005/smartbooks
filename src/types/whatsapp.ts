// WhatsApp Cloud API TypeScript Interfaces

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  appId: string;
  appSecret: string;
  webhookUrl: string;
  webhookVerifyToken: string;
  rateLimitPerSecond: number;
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  defaultTemplate: string;
  messageTimeoutHours: number;
  apiVersion: string;
}

export interface WhatsAppMessage {
  id: string;
  customerId?: string;
  phoneNumber: string;
  messageContent: string;
  messageType: 'text' | 'template' | 'media';
  templateName?: string;
  templateLanguage: string;
  status: MessageStatus;
  whatsappMessageId?: string;
  conversationId?: string;
  errorCode?: string;
  errorMessage?: string;
  costUsd?: number;
  isFreeTier: boolean;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  displayName: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerContent?: string;
  bodyContent: string;
  footerContent?: string;
  buttonConfig: TemplateButton[];
  variables: string[];
  whatsappTemplateId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  rejectionReason?: string;
  approvalDate?: Date;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  messageContent?: string;
  totalRecipients: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  freeTierUsed: number;
  status: CampaignStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';

export interface BulkMessage {
  to: string;
  message: string;
  templateName?: string;
  customerId?: string;
  campaignId?: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  status?: string;
  to: string;
  cost?: number;
  error?: string;
  errorCode?: string;
  shouldRetry?: boolean;
  retryAfter?: number;
  responseTime?: number;
}

export interface BulkMessageResult {
  totalSent: number;
  totalFailed: number;
  results: MessageResult[];
  totalCost: number;
}

export interface WhatsAppWebhook {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: Contact[];
    messages?: IncomingMessage[];
    statuses?: MessageStatusUpdate[];
  };
  field: string;
}

export interface Contact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type: string;
}

export interface MessageStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AccountInfo {
  id: string;
  name: string;
  phoneNumber: string;
  verificationStatus: string;
  qualityRating: string;
  messagingLimit: string;
}

export interface QueueStatus {
  totalQueued: number;
  processing: boolean;
  currentBatch: number;
  estimatedTimeRemaining: number;
}

export interface TemplateData {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
}

export interface TemplateResult {
  success: boolean;
  templateId?: string;
  error?: string;
}

export interface TemplateStatus {
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

export interface ApprovalStatus {
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approvedAt?: Date;
}

// Error handling types
export enum WhatsAppErrorCategory {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  INVALID_PHONE = 'invalid_phone',
  TEMPLATE_ERROR = 'template_error',
  POLICY_VIOLATION = 'policy_violation',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

export interface WhatsAppError {
  category: WhatsAppErrorCategory;
  code?: string;
  message: string;
  shouldRetry: boolean;
  retryAfter?: number;
}

// API Response types
export interface WhatsAppApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: WhatsAppError;
}

export interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface PhoneNumberInfo {
  verified_name: string;
  display_phone_number: string;
  id: string;
  quality_rating: string;
}