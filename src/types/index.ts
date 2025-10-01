// Base types and interfaces for SmartBooks application

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  gst_id?: string;
  address?: string;
  discount_rules: DiscountRules;
  bank_balance?: number;
  outstanding_purchase_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface DiscountRules {
  line_discount?: number;
  group_discount?: number;
  brand_discount?: number;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  sub_brand?: string;
  category?: string;
  sub_category?: string;
  unit?: string;
  purchase_price: number;
  margin_percentage: number;
  sales_price: number; // computed
  tax_rate: number;
  current_stock: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  type: 'sales' | 'purchase';
  customer_id?: string;
  vendor_name?: string;
  invoice_date: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  item_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  line_total: number;
}

export interface LedgerEntry {
  id: string;
  customer_id?: string;
  invoice_id?: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  description?: string;
  transaction_date: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  invoice_id?: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_price?: number;
  reference_number?: string;
  movement_date: string;
}

export interface TaxProfile {
  id: string;
  name: string;
  tax_type: string;
  rate: number;
  is_active: boolean;
  created_at: string;
}

export interface WhatsAppLog {
  id: string;
  customer_id?: string;
  invoice_id?: string;
  phone_number: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  response?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  description?: string;
  defaults: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  children?: Category[];
  path?: string;
  level?: number;
}

export interface Brand {
  id: string;
  name: string;
  parent_id?: string;
  description?: string;
  defaults: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  children?: Brand[];
  path?: string;
  level?: number;
}

// UI Component Props Types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export interface InputProps {
  label: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  icon?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export interface SelectProps {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  searchable?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Form Types
export interface CustomerFormData {
  name: string;
  phone?: string;
  gst_id?: string;
  address?: string;
  discount_rules: DiscountRules;
}

export interface ItemFormData {
  sku: string;
  name: string;
  brand?: string;
  sub_brand?: string;
  category?: string;
  sub_category?: string;
  unit?: string;
  purchase_price: number;
  margin_percentage: number;
  tax_rate: number;
  reorder_level: number;
}

export interface InvoiceFormData {
  type: 'sales' | 'purchase';
  customer_id?: string;
  vendor_name?: string;
  invoice_date: string;
  due_date?: string;
  items: InvoiceItem[];
}

export interface CategoryFormData {
  name: string;
  parent_id?: string | null;
  description?: string;
  defaults: Record<string, any>;
  sort_order: number;
  is_active: boolean;
}

export interface BrandFormData {
  name: string;
  parent_id?: string | null;
  description?: string;
  defaults: Record<string, any>;
  sort_order: number;
  is_active: boolean;
}

// Utility Types
export type SortDirection = 'asc' | 'desc';
export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

export interface TableSort {
  column: string;
  direction: SortDirection;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}