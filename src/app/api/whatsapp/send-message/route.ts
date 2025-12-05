import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppCloudService } from '@/lib/services/whatsappCloudService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, templateName, templateParams, trackOnly } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!message && !templateName) {
      return NextResponse.json(
        { error: 'Either message or templateName is required' },
        { status: 400 }
      );
    }

    // If trackOnly flag is set, just save metadata and return success
    if (trackOnly) {
      // Import supabase to save tracking data
      const { supabase } = await import('@/lib/supabase/client');
      
      await supabase.from('whatsapp_messages').insert({
        phone_number: to,
        message_content: '',
        message_type: 'text',
        status: 'sent',
        sent_at: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        tracked: true
      });
    }

    const whatsappService = WhatsAppCloudService.getInstance();

    let result;

    if (templateName && templateParams) {
      // Send template message
      result = await whatsappService.sendTemplateMessage(
        to,
        templateName,
        'en',
        templateParams
      );
    } else {
      // Send text message
      result = await whatsappService.sendMessage(to, message);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        status: result.status,
        to: result.to
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          shouldRetry: result.shouldRetry
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in send-message API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
