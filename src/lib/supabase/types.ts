// TypeScript types for Supabase database schema
// This file is generated based on the database schema

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      items: {
        Row: Item;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
      invoices: {
        Row: Invoice;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
      };
      ledger_entries: {
        Row: LedgerEntry;
        Insert: LedgerEntryInsert;
        Update: LedgerEntryUpdate;
      };
      stock_movements: {
        Row: StockMovement;
        Insert: StockMovementInsert;
        Update: StockMovementUpdate;
      };
      tax_profiles: {
        Row: TaxProfile;
        Insert: TaxProfileInsert;
        Update: TaxProfileUpdate;
      };
      whatsapp_logs: {
        Row: WhatsAppLog;
        Insert: WhatsAppLogInsert;
        Update: WhatsAppLogUpdate;
      };
      whatsapp_messages: {
        Row: WhatsAppMessage;
        Insert: WhatsAppMessageInsert;
        Update: WhatsAppMessageUpdate;
      };
      whatsapp_templates: {
        Row: WhatsAppTemplate;
        Insert: WhatsAppTemplateInsert;
        Update: WhatsAppTemplateUpdate;
      };
      whatsapp_campaigns: {
        Row: WhatsAppCampaign;
        Insert: WhatsAppCampaignInsert;
        Update: WhatsAppCampaignUpdate;
      };
    };
    Views: {
      whatsapp_campaign_summary: {
        Row: WhatsAppCampaignSummary;
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      invoice_type: 'sales' | 'purchase';
      invoice_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
      movement_type: 'in' | 'out' | 'adjustment';
      whatsapp_status: 'pending' | 'sent' | 'delivered' | 'failed';
      whatsapp_message_type: 'text' | 'template' | 'media';
      whatsapp_message_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
      whatsapp_template_category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
      whatsapp_campaign_status: 'draft' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';
    };
  };
}

// Discount Rules Interface
export interface DiscountRules {
  line_discount?: number;
  group_discount?: number;
  brand_discount?: number;
}

// Invoice Item Interface
export interface InvoiceItem {
  item_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  line_total: number;
}

// Customer Types - Simplified Schema
export interface Customer {
  id: string;
  name: string;
  phone_no: string;
  location: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInsert {
  id?: string;
  name: string;
  phone_no: string;
  location?: string | null;
  invoice_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerUpdate {
  id?: string;
  name?: string;
  phone_no?: string;
  location?: string | null;
  invoice_id?: string | null;
  updated_at?: string;
}

// Item Types
export interface Item {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  sub_brand: string | null;
  category: string | null;
  sub_category: string | null;
  unit: string | null;
  purchase_price: number;
  margin_percentage: number;
  sales_price: number; // computed field
  tax_rate: number;
  current_stock: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface ItemInsert {
  id?: string;
  sku: string;
  name: string;
  brand?: string | null;
  sub_brand?: string | null;
  category?: string | null;
  sub_category?: string | null;
  unit?: string | null;
  purchase_price?: number;
  margin_percentage?: number;
  tax_rate?: number;
  current_stock?: number;
  reorder_level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ItemUpdate {
  id?: string;
  sku?: string;
  name?: string;
  brand?: string | null;
  sub_brand?: string | null;
  category?: string | null;
  sub_category?: string | null;
  unit?: string | null;
  purchase_price?: number;
  margin_percentage?: number;
  tax_rate?: number;
  current_stock?: number;
  reorder_level?: number;
  updated_at?: string;
}

// Invoice Types
export interface Invoice {
  id: string;
  invoice_number: string;
  type: 'sales' | 'purchase';
  customer_id: string | null;
  vendor_name: string | null;
  invoice_date: string;
  due_date: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  id?: string;
  invoice_number: string;
  type: 'sales' | 'purchase';
  customer_id?: string | null;
  vendor_name?: string | null;
  invoice_date: string;
  due_date?: string | null;
  items?: InvoiceItem[];
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceUpdate {
  id?: string;
  invoice_number?: string;
  type?: 'sales' | 'purchase';
  customer_id?: string | null;
  vendor_name?: string | null;
  invoice_date?: string;
  due_date?: string | null;
  items?: InvoiceItem[];
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  updated_at?: string;
}

// Ledger Entry Types
export interface LedgerEntry {
  id: string;
  customer_id: string | null;
  invoice_id: string | null;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  description: string | null;
  transaction_date: string;
}

export interface LedgerEntryInsert {
  id?: string;
  customer_id?: string | null;
  invoice_id?: string | null;
  transaction_type: string;
  debit_amount?: number;
  credit_amount?: number;
  balance?: number;
  description?: string | null;
  transaction_date?: string;
}

export interface LedgerEntryUpdate {
  id?: string;
  customer_id?: string | null;
  invoice_id?: string | null;
  transaction_type?: string;
  debit_amount?: number;
  credit_amount?: number;
  balance?: number;
  description?: string | null;
  transaction_date?: string;
}

// Stock Movement Types
export interface StockMovement {
  id: string;
  item_id: string;
  invoice_id: string | null;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_price: number | null;
  reference_number: string | null;
  movement_date: string;
}

export interface StockMovementInsert {
  id?: string;
  item_id: string;
  invoice_id?: string | null;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_price?: number | null;
  reference_number?: string | null;
  movement_date?: string;
}

export interface StockMovementUpdate {
  id?: string;
  item_id?: string;
  invoice_id?: string | null;
  movement_type?: 'in' | 'out' | 'adjustment';
  quantity?: number;
  unit_price?: number | null;
  reference_number?: string | null;
  movement_date?: string;
}

// Tax Profile Types
export interface TaxProfile {
  id: string;
  name: string;
  tax_type: string;
  rate: number;
  is_active: boolean;
  created_at: string;
}

export interface TaxProfileInsert {
  id?: string;
  name: string;
  tax_type: string;
  rate: number;
  is_active?: boolean;
  created_at?: string;
}

export interface TaxProfileUpdate {
  id?: string;
  name?: string;
  tax_type?: string;
  rate?: number;
  is_active?: boolean;
}

// WhatsApp Log Types
export interface WhatsAppLog {
  id: string;
  customer_id: string | null;
  invoice_id: string | null;
  phone_number: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string | null;
  response: string | null;
  created_at: string;
}

export interface WhatsAppLogInsert {
  id?: string;
  customer_id?: string | null;
  invoice_id?: string | null;
  phone_number: string;
  message: string;
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string | null;
  response?: string | null;
  created_at?: string;
}

export interface WhatsAppLogUpdate {
  id?: string;
  customer_id?: string | null;
  invoice_id?: string | null;
  phone_number?: string;
  message?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string | null;
  response?: string | null;
}

// Utility types for common operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// WhatsApp Messages Types
export interface WhatsAppMessage {
  id: string;
  customer_id: string | null;
  phone_number: string;
  message_content: string;
  whatsapp_message_id: string | null;
  campaign_id: string | null;
  message_type: 'text' | 'template' | 'media';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageInsert {
  id?: string;
  customer_id?: string | null;
  phone_number: string;
  message_content: string;
  whatsapp_message_id?: string | null;
  campaign_id?: string | null;
  message_type?: 'text' | 'template' | 'media';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string | null;
  sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppMessageUpdate {
  id?: string;
  customer_id?: string | null;
  phone_number?: string;
  message_content?: string;
  whatsapp_message_id?: string | null;
  campaign_id?: string | null;
  message_type?: 'text' | 'template' | 'media';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string | null;
  sent_at?: string | null;
  updated_at?: string;
}

// WhatsApp Templates Types
export interface WhatsAppTemplate {
  id: string;
  name: string;
  display_name: string;
  body_content: string;
  variables: string[]; // JSON array of variable names
  is_active: boolean;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  header_content: string | null;
  footer_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateInsert {
  id?: string;
  name: string;
  display_name: string;
  body_content: string;
  variables?: string[];
  is_active?: boolean;
  category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language?: string;
  header_content?: string | null;
  footer_content?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppTemplateUpdate {
  id?: string;
  name?: string;
  display_name?: string;
  body_content?: string;
  variables?: string[];
  is_active?: boolean;
  category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language?: string;
  header_content?: string | null;
  footer_content?: string | null;
  updated_at?: string;
}

// WhatsApp Campaigns Types
export interface WhatsAppCampaign {
  id: string;
  name: string;
  template_name: string | null;
  total_recipients: number;
  status: 'draft' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';
  created_by: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  description: string | null;
  target_criteria: Record<string, any>; // JSONB object
  created_at: string;
  updated_at: string;
}

export interface WhatsAppCampaignInsert {
  id?: string;
  name: string;
  template_name?: string | null;
  total_recipients?: number;
  status?: 'draft' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';
  created_by?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  description?: string | null;
  target_criteria?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppCampaignUpdate {
  id?: string;
  name?: string;
  template_name?: string | null;
  total_recipients?: number;
  status?: 'draft' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';
  created_by?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  description?: string | null;
  target_criteria?: Record<string, any>;
  updated_at?: string;
}

// WhatsApp Campaign Summary View Type
export interface WhatsAppCampaignSummary {
  id: string;
  name: string;
  template_name: string | null;
  total_recipients: number;
  status: 'draft' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';
  created_by: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
}

// Export all table types for convenience
export type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  Item,
  ItemInsert,
  ItemUpdate,
  Invoice,
  InvoiceInsert,
  InvoiceUpdate,
  LedgerEntry,
  LedgerEntryInsert,
  LedgerEntryUpdate,
  StockMovement,
  StockMovementInsert,
  StockMovementUpdate,
  TaxProfile,
  TaxProfileInsert,
  TaxProfileUpdate,
  WhatsAppLog,
  WhatsAppLogInsert,
  WhatsAppLogUpdate,
  WhatsAppMessage,
  WhatsAppMessageInsert,
  WhatsAppMessageUpdate,
  WhatsAppTemplate,
  WhatsAppTemplateInsert,
  WhatsAppTemplateUpdate,
  WhatsAppCampaign,
  WhatsAppCampaignInsert,
  WhatsAppCampaignUpdate,
  WhatsAppCampaignSummary,
};