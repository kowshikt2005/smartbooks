/**
 * Example usage of WhatsApp Template functionality
 * This demonstrates how to use the enhanced template features
 */

import { whatsappCloudService, whatsappTemplateService } from '@/lib/services';

/**
 * Example 1: Send template message with customer data (Requirement 3.4)
 */
export async function sendPaymentReminderWithCustomerData() {
  const customerData = {
    name: 'John Doe',
    phone: '9876543210',
    location: 'Mumbai',
    invoiceId: 'INV-001',
    amount: 15000,
    dueDate: new Date('2024-02-01')
  };

  const result = await whatsappCloudService.sendTemplateMessageWithCustomerData(
    '919876543210',
    'payment_reminder_detailed',
    customerData,
    'en',
    {
      // Additional custom parameters
      company_name: 'SmartBooks Solutions'
    },
    ['customer_name', 'amount', 'invoice_id', 'location', 'due_date']
  );

  console.log('Template message result:', result);
  return result;
}

/**
 * Example 2: Validate template before sending
 */
export async function validateTemplateExample() {
  const templateName = 'payment_reminder_basic';
  const parameters = {
    body_1: 'John Doe',
    body_2: '₹15,000',
    body_3: 'INV-001'
  };

  const validation = await whatsappCloudService.validateTemplateBeforeSending(
    templateName,
    parameters,
    ['customer_name', 'amount', 'invoice_id']
  );

  console.log('Template validation:', validation);
  return validation;
}

/**
 * Example 3: Format template message with variables
 */
export function formatTemplateExample() {
  const messageTemplate = `Dear {{customer_name}},

Your payment of {{amount}} for invoice {{invoice_id}} is due on {{due_date}}.

Please make the payment at your earliest convenience.

Thank you!`;

  const variables = {
    customer_name: 'ABC Company',
    amount: '₹25,000',
    invoice_id: 'INV-002',
    due_date: '2024-01-30'
  };

  const formatted = whatsappCloudService.formatTemplateMessage(messageTemplate, variables);
  console.log('Formatted template:', formatted);
  return formatted;
}

/**
 * Example 4: Use default templates
 */
export function useDefaultTemplatesExample() {
  // Get all available templates
  const allTemplates = whatsappTemplateService.getDefaultTemplates();
  console.log(`Available templates: ${allTemplates.length}`);

  // Get payment reminder templates
  const paymentTemplates = whatsappTemplateService.getTemplateSuggestions('payment_reminder');
  console.log('Payment reminder templates:', paymentTemplates.map(t => t.name));

  // Get specific template and generate preview
  const template = whatsappTemplateService.getTemplateByName('payment_reminder_basic');
  if (template) {
    const preview = whatsappTemplateService.generateTemplatePreview(template);
    console.log('Template preview:', preview);
  }

  return {
    allTemplates: allTemplates.length,
    paymentTemplates: paymentTemplates.length,
    preview: template ? whatsappTemplateService.generateTemplatePreview(template) : null
  };
}

/**
 * Example 5: Create custom template
 */
export function createCustomTemplateExample() {
  const customTemplate = whatsappTemplateService.createCustomTemplate(
    'custom_invoice_notification',
    'Custom Invoice Notification',
    `Dear {{1}},

A new invoice {{2}} has been generated for {{3}}.

Due Date: {{4}}
Amount: {{5}}

Please review and make payment by the due date.

Best regards,
{{6}}`,
    ['customer_name', 'invoice_id', 'service_description', 'due_date', 'amount', 'company_name'],
    'UTILITY',
    'New Invoice Generated',
    'Thank you for your business!'
  );

  // Validate the custom template
  const validation = whatsappTemplateService.validateTemplate(customTemplate);
  console.log('Custom template validation:', validation);

  // Generate preview
  const preview = whatsappTemplateService.generateTemplatePreview(customTemplate);
  console.log('Custom template preview:', preview);

  return {
    template: customTemplate,
    validation,
    preview
  };
}

/**
 * Example 6: Build customer parameters with formatting utilities
 */
export function buildCustomerParametersExample() {
  const customerData = {
    name: 'xyz corporation',
    phone: '9876543210',
    location: 'new delhi',
    invoiceId: 'inv001',
    amount: 50000.75,
    dueDate: new Date('2024-03-15')
  };

  const parameters = whatsappCloudService.buildCustomerTemplateParameters(
    customerData,
    {
      company_name: 'SmartBooks Solutions',
      support_phone: '+91-9876543210'
    }
  );

  console.log('Built parameters:', parameters);
  
  // Demonstrate formatting utilities
  const formatter = whatsappCloudService.formatTemplateParameters;
  console.log('Formatted currency:', formatter.formatCurrency(50000.75));
  console.log('Formatted date:', formatter.formatDate(new Date('2024-03-15')));
  console.log('Formatted phone:', formatter.formatPhone('9876543210'));
  console.log('Title case:', formatter.titleCase('xyz corporation'));

  return parameters;
}

/**
 * Complete example demonstrating all template features
 */
export async function completeTemplateExample() {
  console.log('=== WhatsApp Template System Demo ===\n');

  // 1. Show available templates
  console.log('1. Available Templates:');
  const templates = useDefaultTemplatesExample();
  console.log(`   - Total templates: ${templates.allTemplates}`);
  console.log(`   - Payment templates: ${templates.paymentTemplates}\n`);

  // 2. Create and validate custom template
  console.log('2. Custom Template Creation:');
  const customTemplate = createCustomTemplateExample();
  console.log(`   - Template valid: ${customTemplate.validation.isValid}`);
  console.log(`   - Errors: ${customTemplate.validation.errors.length}`);
  console.log(`   - Warnings: ${customTemplate.validation.warnings.length}\n`);

  // 3. Format template with variables
  console.log('3. Template Formatting:');
  const formatted = formatTemplateExample();
  console.log(`   - Variables substituted: ${formatted.substitutionCount}`);
  console.log(`   - Missing variables: ${formatted.missingVariables.length}\n`);

  // 4. Build customer parameters
  console.log('4. Customer Parameter Building:');
  const parameters = buildCustomerParametersExample();
  console.log(`   - Parameters built: ${Object.keys(parameters).length}\n`);

  // 5. Validate template before sending
  console.log('5. Template Validation:');
  const validation = await validateTemplateExample();
  console.log(`   - Template valid: ${validation.isValid}`);
  console.log(`   - Components: ${validation.components.length}`);
  console.log(`   - Estimated length: ${validation.estimatedLength} chars\n`);

  console.log('=== Template System Demo Complete ===');

  return {
    templates,
    customTemplate,
    formatted,
    parameters,
    validation
  };
}