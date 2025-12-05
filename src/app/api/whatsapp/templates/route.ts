import { NextRequest, NextResponse } from 'next/server';
import { whatsappTemplateService } from '@/lib/services';

/**
 * Get WhatsApp templates
 * GET /api/whatsapp/templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | null;
    const useCase = searchParams.get('useCase') as 'payment_reminder' | 'payment_confirmation' | 'invoice_notification' | null;
    const templateName = searchParams.get('name');

    // Get specific template by name
    if (templateName) {
      const template = whatsappTemplateService.getTemplateByName(templateName);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Generate preview
      const preview = whatsappTemplateService.generateTemplatePreview(template);
      const validation = whatsappTemplateService.validateTemplate(template);

      return NextResponse.json({
        template,
        preview,
        validation
      });
    }

    // Get templates by use case
    if (useCase) {
      const templates = whatsappTemplateService.getTemplateSuggestions(useCase);
      return NextResponse.json({
        templates,
        count: templates.length,
        useCase
      });
    }

    // Get templates by category
    if (category) {
      const templates = whatsappTemplateService.getTemplatesByCategory(category);
      return NextResponse.json({
        templates,
        count: templates.length,
        category
      });
    }

    // Get all templates
    const templates = whatsappTemplateService.getDefaultTemplates();
    return NextResponse.json({
      templates,
      count: templates.length,
      categories: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      useCases: ['payment_reminder', 'payment_confirmation', 'invoice_notification']
    });

  } catch (error) {
    console.error('Templates API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * Create custom template
 * POST /api/whatsapp/templates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      displayName,
      bodyContent,
      variables = [],
      category = 'UTILITY',
      headerContent,
      footerContent
    } = body;

    // Validate required fields
    if (!name || !displayName || !bodyContent) {
      return NextResponse.json(
        { error: 'Name, display name, and body content are required' },
        { status: 400 }
      );
    }

    // Create custom template
    const customTemplate = whatsappTemplateService.createCustomTemplate(
      name,
      displayName,
      bodyContent,
      variables,
      category,
      headerContent,
      footerContent
    );

    // Validate the created template
    const validation = whatsappTemplateService.validateTemplate(customTemplate);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Template validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        },
        { status: 400 }
      );
    }

    // Generate preview
    const preview = whatsappTemplateService.generateTemplatePreview(customTemplate);

    // Format for WhatsApp submission
    const submissionFormat = whatsappTemplateService.formatTemplateForSubmission(customTemplate);

    return NextResponse.json({
      success: true,
      template: customTemplate,
      preview,
      validation,
      submissionFormat,
      message: 'Custom template created successfully'
    });

  } catch (error) {
    console.error('Create template API error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}