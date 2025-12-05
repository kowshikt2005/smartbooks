import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppCloudService } from '@/lib/services/whatsappCloudService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    const whatsappService = WhatsAppCloudService.getInstance();
    const results = [];
    const errors = [];

    // Send messages with rate limiting (80 messages per second limit)
    for (let i = 0; i < messages.length; i++) {
      const { to, message } = messages[i];

      if (!to || !message) {
        errors.push({
          index: i,
          to,
          error: 'Phone number and message are required'
        });
        continue;
      }

      try {
        const result = await whatsappService.sendMessage(to, message);
        
        if (result.success) {
          results.push({
            index: i,
            success: true,
            messageId: result.messageId,
            to: result.to
          });
        } else {
          errors.push({
            index: i,
            to,
            error: result.error
          });
        }

        // Rate limiting: Wait 15ms between messages (allows ~66 messages/second)
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 15));
        }
      } catch (error) {
        errors.push({
          index: i,
          to,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: messages.length,
      sent: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error in send-bulk API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
