import { NextRequest, NextResponse } from 'next/server';
import { whatsappCloudService } from '@/lib/services';

/**
 * Track message status
 * POST /api/whatsapp/message-status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message ID is required' 
        },
        { status: 400 }
      );
    }

    const result = await whatsappCloudService.trackMessageStatus(messageId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Track message status API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Process message status update from webhook
 * PUT /api/whatsapp/message-status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, status, timestamp, error } = body;

    if (!messageId || !status || !timestamp) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message ID, status, and timestamp are required' 
        },
        { status: 400 }
      );
    }

    const result = whatsappCloudService.processStatusUpdate({
      messageId,
      status,
      timestamp,
      error
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Process status update API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}