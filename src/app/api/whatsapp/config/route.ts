import { NextRequest, NextResponse } from 'next/server';
import { whatsappConfig, whatsappCloudService } from '@/lib/services';

/**
 * GET /api/whatsapp/config
 * Get WhatsApp Cloud API configuration status and account information
 */
export async function GET(request: NextRequest) {
  try {
    // Get configuration validation
    const validation = whatsappConfig.validateConfiguration();
    
    // Get service status
    const serviceStatus = whatsappCloudService.getServiceStatus();
    
    let accountInfo = null;
    if (validation.isValid) {
      try {
        const accountResponse = await whatsappConfig.getAccountInfo();
        if (accountResponse.success) {
          accountInfo = accountResponse.data;
        }
      } catch (error) {
        console.error('Failed to get account info:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        configured: validation.isValid,
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        },
        serviceStatus,
        accountInfo,
        setupInstructions: validation.isValid ? [] : whatsappConfig.getSetupInstructions()
      }
    });
  } catch (error: any) {
    console.error('WhatsApp config API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get WhatsApp configuration status',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/config/test
 * Test WhatsApp Cloud API connectivity
 */
export async function POST(request: NextRequest) {
  try {
    const testResult = await whatsappCloudService.testConnection();
    
    return NextResponse.json({
      success: testResult.success,
      data: testResult.data,
      error: testResult.error
    });
  } catch (error: any) {
    console.error('WhatsApp connection test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test WhatsApp API connection',
      details: error.message
    }, { status: 500 });
  }
}