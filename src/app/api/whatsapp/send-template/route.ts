import { NextRequest, NextResponse } from 'next/server';
import { whatsappCloudService } from '@/lib/services';

/**
 * Send WhatsApp template message
 * POST /api/whatsapp/send-template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      to, 
      templateName, 
      templateLanguage = 'en',
      parameters = {},
      customerData,
      expectedVariables = []
    } = body;

    // Validate required fields
    if (!to || !templateName) {
      return NextResponse.json(
        { error: 'Phone number and template name are required' },
        { status: 400 }
      );
    }

    let result;

    // If customer data is provided, use the customer-specific method
    if (customerData) {
      result = await whatsappCloudService.sendTemplateMessageWithCustomerData(
        to,
        templateName,
        customerData,
        templateLanguage,
        parameters,
        expectedVariables
      );
    } else {
      // Use regular template message sending
      result = await whatsappCloudService.sendTemplateMessage(
        to,
        templateName,
        templateLanguage,
        parameters,
        expectedVariables
      );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        status: result.status,
        to: result.to,
        responseTime: result.responseTime
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error,
          errorCode: result.errorCode,
          shouldRetry: result.shouldRetry,
          retryAfter: result.retryAfter
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Template message API error:', error);
    return NextResponse.json(
      { error: 'Failed to send template message' },
      { status: 500 }
    );
  }
}

/**
 * Validate template before sending
 * GET /api/whatsapp/send-template?validate=true&templateName=...&parameters=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validate = searchParams.get('validate');
    const templateName = searchParams.get('templateName');
    const parametersParam = searchParams.get('parameters');
    const expectedVariablesParam = searchParams.get('expectedVariables');

    if (validate === 'true' && templateName) {
      const parameters = parametersParam ? JSON.parse(parametersParam) : {};
      const expectedVariables = expectedVariablesParam ? JSON.parse(expectedVariablesParam) : [];

      const validation = await whatsappCloudService.validateTemplateBeforeSending(
        templateName,
        parameters,
        expectedVariables
      );

      return NextResponse.json({
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        components: validation.components,
        estimatedLength: validation.estimatedLength
      });
    }

    return NextResponse.json(
      { error: 'Invalid validation request' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Template validation API error:', error);
    return NextResponse.json(
      { error: 'Failed to validate template' },
      { status: 500 }
    );
  }
}