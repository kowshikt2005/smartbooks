/**
 * Tests for WhatsApp Template Service
 */

import { WhatsAppTemplateService } from '../whatsappTemplates';

describe('WhatsAppTemplateService', () => {
  
  describe('getDefaultTemplates', () => {
    it('should return all default templates', () => {
      const templates = WhatsAppTemplateService.getDefaultTemplates();
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('bodyContent');
    });
  });

  describe('getTemplateByName', () => {
    it('should return template by name', () => {
      const template = WhatsAppTemplateService.getTemplateByName('payment_reminder_basic');
      expect(template).toBeDefined();
      expect(template?.name).toBe('payment_reminder_basic');
    });

    it('should return undefined for non-existent template', () => {
      const template = WhatsAppTemplateService.getTemplateByName('non_existent');
      expect(template).toBeUndefined();
    });
  });

  describe('generateTemplatePreview', () => {
    it('should generate preview with example data', () => {
      const template = WhatsAppTemplateService.getTemplateByName('payment_reminder_basic');
      if (template) {
        const preview = WhatsAppTemplateService.generateTemplatePreview(template);
        expect(preview).toBeDefined();
        expect(preview).toContain('John Doe'); // Example customer name
        expect(preview).toContain('₹5,000'); // Example amount
        expect(preview).not.toContain('{{1}}'); // Should not contain placeholders
      }
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = WhatsAppTemplateService.getTemplateByName('payment_reminder_basic');
      if (template) {
        const validation = WhatsAppTemplateService.validateTemplate(template);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should detect invalid template name', () => {
      const invalidTemplate = {
        ...WhatsAppTemplateService.getTemplateByName('payment_reminder_basic')!,
        name: 'Invalid Name With Spaces'
      };
      
      const validation = WhatsAppTemplateService.validateTemplate(invalidTemplate);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Template name must contain only lowercase letters, numbers, and underscores');
    });
  });

  describe('createCustomTemplate', () => {
    it('should create custom template with valid structure', () => {
      const customTemplate = WhatsAppTemplateService.createCustomTemplate(
        'custom_test',
        'Custom Test Template',
        'Hello {{1}}, your amount is {{2}}',
        ['customer_name', 'amount']
      );

      expect(customTemplate.name).toBe('custom_test');
      expect(customTemplate.displayName).toBe('Custom Test Template');
      expect(customTemplate.variables).toEqual(['customer_name', 'amount']);
      expect(customTemplate.category).toBe('UTILITY');
    });

    it('should sanitize template name', () => {
      const customTemplate = WhatsAppTemplateService.createCustomTemplate(
        'Custom Template With Spaces!',
        'Display Name',
        'Body content {{1}}',
        ['variable']
      );

      expect(customTemplate.name).toBe('custom_template_with_spaces_');
    });
  });

  describe('getTemplateSuggestions', () => {
    it('should return payment reminder templates', () => {
      const suggestions = WhatsAppTemplateService.getTemplateSuggestions('payment_reminder');
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(template => {
        expect(template.name).toContain('payment_reminder');
      });
    });

    it('should return payment confirmation templates', () => {
      const suggestions = WhatsAppTemplateService.getTemplateSuggestions('payment_confirmation');
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(template => {
        expect(template.name).toContain('payment_confirmation');
      });
    });
  });

  describe('formatTemplateForSubmission', () => {
    it('should format template for WhatsApp API submission', () => {
      const template = WhatsAppTemplateService.getTemplateByName('payment_reminder_basic');
      if (template) {
        const formatted = WhatsAppTemplateService.formatTemplateForSubmission(template);
        
        expect(formatted).toHaveProperty('name');
        expect(formatted).toHaveProperty('category');
        expect(formatted).toHaveProperty('language');
        expect(formatted).toHaveProperty('components');
        expect(formatted.components).toBeInstanceOf(Array);
        expect(formatted.components.length).toBeGreaterThan(0);
        
        // Should have at least a BODY component
        const bodyComponent = formatted.components.find(c => c.type === 'BODY');
        expect(bodyComponent).toBeDefined();
        expect(bodyComponent.text).toBeDefined();
      }
    });
  });
});