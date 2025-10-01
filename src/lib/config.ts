// Application configuration
export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'SmartBooks',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
  },
  outputbooks: {
    apiUrl: process.env.OUTPUTBOOKS_API_URL || '',
    apiKey: process.env.OUTPUTBOOKS_API_KEY || '',
  },
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@smartbooks.app',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,csv,xlsx').split(','),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  },
  development: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
} as const;

// Validation function to check required environment variables
export function validateConfig() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Constants
export const CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  INVOICE: {
    NUMBER_PREFIX: 'INV',
    DUE_DAYS_DEFAULT: 30,
  },
  STOCK: {
    LOW_STOCK_THRESHOLD: 10,
    REORDER_QUANTITY_DEFAULT: 50,
  },
  WHATSAPP: {
    MESSAGE_TEMPLATES: {
      PAYMENT_REMINDER: 'Hi {customerName}, your invoice #{invoiceNumber} of ₹{amount} is due on {dueDate}. Please make the payment.',
      PAYMENT_OVERDUE: 'Hi {customerName}, your invoice #{invoiceNumber} of ₹{amount} was due on {dueDate}. Please make the payment immediately.',
      LOW_STOCK_ALERT: 'Low stock alert: {itemName} (SKU: {sku}) has only {currentStock} units remaining.',
    },
  },
  TAX: {
    GST_RATES: [0, 5, 12, 18, 28],
    DEFAULT_TAX_RATE: 18,
  },
  CURRENCY: {
    SYMBOL: '₹',
    CODE: 'INR',
    LOCALE: 'en-IN',
  },
} as const;