/**
 * WhatsApp Template Management Service
 * Handles default templates and template utilities for SmartBooks
 */

export interface DefaultTemplate {
  name: string;
  displayName: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  description: string;
  variables: string[];
  bodyContent: string;
  headerContent?: string;
  footerContent?: string;
  example: {
    customerName: string;
    amount: string;
    invoiceId: string;
    location: string;
    dueDate: string;
  };
}

/**
 * Default WhatsApp message templates for SmartBooks
 */
export class WhatsAppTemplateService {
  
  /**
   * Default payment reminder templates
   */
  public static readonly DEFAULT_TEMPLATES: DefaultTemplate[] = [
    {
      name: 'payment_reminder_basic',
      displayName: 'Basic Payment Reminder',
      category: 'UTILITY',
      language: 'en',
      description: 'Simple payment reminder with customer details',
      variables: ['customer_name', 'amount', 'invoice_id'],
      bodyContent: `Dear {{1}},

This is a friendly payment reminder for invoice {{3}} with an outstanding amount of {{2}}.

Please make the payment at your earliest convenience.

Thank you for your business!
SmartBooks Team`,
      footerContent: 'SmartBooks - Smart Business Management',
      example: {
        customerName: 'John Doe',
        amount: '₹5,000',
        invoiceId: 'INV-001',
        location: 'Mumbai',
        dueDate: '2024-01-15'
      }
    },
    {
      name: 'payment_reminder_detailed',
      displayName: 'Detailed Payment Reminder',
      category: 'UTILITY',
      language: 'en',
      description: 'Comprehensive payment reminder with all customer details',
      variables: ['customer_name', 'amount', 'invoice_id', 'location', 'due_date'],
      bodyContent: `Dear {{1}},

Hope you are doing well!

📋 Payment Reminder Details:
• Customer: {{1}}
• Invoice: {{3}}
• Amount: {{2}}
• Location: {{4}}
• Due Date: {{5}}

We would appreciate if you could make the payment at your earliest convenience.

Thank you for your continued business!`,
      footerContent: 'SmartBooks Team',
      example: {
        customerName: 'ABC Company',
        amount: '₹15,000',
        invoiceId: 'INV-002',
        location: 'Delhi',
        dueDate: '2024-01-20'
      }
    },
    {
      name: 'payment_reminder_urgent',
      displayName: 'Urgent Payment Reminder',
      category: 'UTILITY',
      language: 'en',
      description: 'Urgent payment reminder for overdue invoices',
      variables: ['customer_name', 'amount', 'invoice_id', 'days_overdue'],
      bodyContent: `Dear {{1}},

🚨 URGENT: Payment Overdue

📋 Details:
• Invoice: {{3}}
• Overdue Amount: {{2}}
• Days Overdue: {{4}}

Please make immediate payment to avoid service disruption.

For any queries, please contact us immediately.`,
      footerContent: 'SmartBooks Team - Urgent',
      example: {
        customerName: 'XYZ Corporation',
        amount: '₹25,000',
        invoiceId: 'INV-003',
        location: 'Bangalore',
        dueDate: '2024-01-10'
      }
    },
    {
      name: 'payment_confirmation',
      displayName: 'Payment Confirmation',
      category: 'UTILITY',
      language: 'en',
      description: 'Confirmation message for received payments',
      variables: ['customer_name', 'amount', 'invoice_id', 'payment_date'],
      bodyContent: `Dear {{1}},

✅ Payment Received Successfully!

📋 Payment Details:
• Invoice: {{3}}
• Amount Received: {{2}}
• Payment Date: {{4}}

Thank you for your prompt payment. Your account has been updated.`,
      footerContent: 'SmartBooks Team',
      example: {
        customerName: 'Customer Name',
        amount: '₹10,000',
        invoiceId: 'INV-004',
        location: 'Chennai',
        dueDate: '2024-01-25'
      }
    },
    {
      name: 'invoice_generated',
      displayName: 'New Invoice Notification',
      category: 'UTILITY',
      language: 'en',
      description: 'Notification for newly generated invoices',
      variables: ['customer_name', 'amount', 'invoice_id', 'due_date'],
      bodyContent: `Dear {{1}},

📄 New Invoice Generated

📋 Invoice Details:
• Invoice Number: {{3}}
• Amount: {{2}}
• Due Date: {{4}}

Please review and make payment by the due date.

Thank you for your business!`,
      footerContent: 'SmartBooks Team',
      example: {
        customerName: 'Business Client',
        amount: '₹8,000',
        invoiceId: 'INV-005',
        location: 'Pune',
        dueDate: '2024-02-01'
      }
    }
  ];

  /**
   * Get all default templates
   */
  public static getDefaultTemplates(): DefaultTemplate[] {
    return this.DEFAULT_TEMPLATES;
  }

  /**
   * Get template by name
   */
  public static getTemplateByName(name: string): DefaultTemplate | undefined {
    return this.DEFAULT_TEMPLATES.find(template => template.name === name);
  }

  /**
   * Get templates by category
   */
  public static getTemplatesByCategory(category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'): DefaultTemplate[] {
    return this.DEFAULT_TEMPLATES.filter(template => template.category === category);
  }

  /**
   * Format template for WhatsApp Cloud API submission
   */
  public static formatTemplateForSubmission(template: DefaultTemplate): {
    name: string;
    category: string;
    language: string;
    components: any[];
  } {
    const components: any[] = [];

    // Add header component if present
    if (template.headerContent) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: template.headerContent
      });
    }

    // Add body component (required)
    components.push({
      type: 'BODY',
      text: template.bodyContent,
      example: {
        body_text: [template.variables.map(variable => {
          const exampleKey = variable.replace('_', '') as keyof typeof template.example;
          return template.example[exampleKey] || `{{${variable}}}`;
        })]
      }
    });

    // Add footer component if present
    if (template.footerContent) {
      components.push({
        type: 'FOOTER',
        text: template.footerContent
      });
    }

    return {
      name: template.name,
      category: template.category,
      language: template.language,
      components
    };
  }

  /**
   * Generate template preview with sample data
   */
  public static generateTemplatePreview(template: DefaultTemplate): string {
    let preview = template.bodyContent;
    
    // Replace variables with example data
    template.variables.forEach((variable, index) => {
      const placeholder = `{{${index + 1}}}`;
      
      // Map variable names to example data
      let exampleValue: string;
      switch (variable) {
        case 'customer_name':
          exampleValue = template.example.customerName;
          break;
        case 'amount':
          exampleValue = template.example.amount;
          break;
        case 'invoice_id':
          exampleValue = template.example.invoiceId;
          break;
        case 'location':
          exampleValue = template.example.location;
          break;
        case 'due_date':
          exampleValue = template.example.dueDate;
          break;
        case 'days_overdue':
          exampleValue = '5 days';
          break;
        case 'payment_date':
          exampleValue = new Date().toLocaleDateString('en-IN');
          break;
        default:
          exampleValue = `[${variable}]`;
      }
      
      preview = preview.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), exampleValue);
    });

    return preview;
  }

  /**
   * Validate template structure
   */
  public static validateTemplate(template: DefaultTemplate): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.bodyContent || template.bodyContent.trim().length === 0) {
      errors.push('Template body content is required');
    }

    // Validate template name format
    if (template.name && !/^[a-z0-9_]+$/.test(template.name)) {
      errors.push('Template name must contain only lowercase letters, numbers, and underscores');
    }

    // Check body content length (WhatsApp limit is 1024 characters)
    if (template.bodyContent && template.bodyContent.length > 1024) {
      errors.push('Template body content exceeds 1024 character limit');
    }

    // Check variable placeholders in body
    const placeholderPattern = /\{\{(\d+)\}\}/g;
    const placeholders = template.bodyContent.match(placeholderPattern) || [];
    const expectedPlaceholders = template.variables.map((_, index) => `{{${index + 1}}}`);

    expectedPlaceholders.forEach(expected => {
      if (!placeholders.includes(expected)) {
        warnings.push(`Expected placeholder ${expected} not found in body content`);
      }
    });

    // Check for unused placeholders
    placeholders.forEach(placeholder => {
      if (!expectedPlaceholders.includes(placeholder)) {
        warnings.push(`Placeholder ${placeholder} found but no corresponding variable defined`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get template suggestions based on use case
   */
  public static getTemplateSuggestions(useCase: 'payment_reminder' | 'payment_confirmation' | 'invoice_notification'): DefaultTemplate[] {
    switch (useCase) {
      case 'payment_reminder':
        return this.DEFAULT_TEMPLATES.filter(t => 
          t.name.includes('payment_reminder')
        );
      case 'payment_confirmation':
        return this.DEFAULT_TEMPLATES.filter(t => 
          t.name.includes('payment_confirmation')
        );
      case 'invoice_notification':
        return this.DEFAULT_TEMPLATES.filter(t => 
          t.name.includes('invoice')
        );
      default:
        return this.DEFAULT_TEMPLATES;
    }
  }

  /**
   * Create custom template from user input
   */
  public static createCustomTemplate(
    name: string,
    displayName: string,
    bodyContent: string,
    variables: string[],
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' = 'UTILITY',
    headerContent?: string,
    footerContent?: string
  ): DefaultTemplate {
    return {
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      displayName,
      category,
      language: 'en',
      description: `Custom template: ${displayName}`,
      variables,
      bodyContent,
      headerContent,
      footerContent,
      example: {
        customerName: 'Sample Customer',
        amount: '₹1,000',
        invoiceId: 'INV-001',
        location: 'Sample Location',
        dueDate: '2024-01-01'
      }
    };
  }
}

// Export singleton instance for convenience
export const whatsappTemplateService = WhatsAppTemplateService;