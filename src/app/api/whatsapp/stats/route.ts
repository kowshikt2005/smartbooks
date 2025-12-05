import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppAnalyticsService } from '@/lib/services/whatsappAnalytics';

/**
 * GET /api/whatsapp/stats
 * Get WhatsApp analytics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Get analytics data
    const analytics = await WhatsAppAnalyticsService.getAnalytics();

    return NextResponse.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching WhatsApp stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch WhatsApp statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
