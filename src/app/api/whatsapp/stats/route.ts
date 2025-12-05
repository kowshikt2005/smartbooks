import { NextResponse } from 'next/server';
import { whatsappAnalyticsService } from '@/lib/services/whatsappAnalytics';

/**
 * Get WhatsApp Analytics
 * GET /api/whatsapp/stats
 */
export async function GET() {
  try {
    console.log('📊 Fetching WhatsApp analytics...');
    
    const analytics = await whatsappAnalyticsService.getAnalytics();
    
    console.log('✅ Analytics fetched successfully:', analytics);

    return NextResponse.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('❌ Error fetching WhatsApp analytics:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
