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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      invoice_type: 'sales' | 'purchase';
      invoice_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
      movement_type: 'in' | 'out' | 'adjustment';
      whatsapp_status: 'pending' | 'sent' | 'delivered' | 'failed';
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

// Customer Types
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  gst_id: string | null;
  address: string | null;
  discount_rules: DiscountRules;
  bank_balance: number | null;
  outstanding_purchase_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInsert {
  id?: string;
  name: string;
  phone?: string | null;
  gst_id?: string | null;
  address?: string | null;
  discount_rules?: DiscountRules;
  bank_balance?: number | null;
  outstanding_purchase_amount?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerUpdate {
  id?: string;
  name?: string;
  phone?: string | null;
  gst_id?: string | null;
  address?: string | null;
  discount_rules?: DiscountRules;
  bank_balance?: number | null;
  outstanding_purchase_amount?: number | null;
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
};