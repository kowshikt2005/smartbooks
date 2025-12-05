import { NextRequest, NextResponse } from 'next/server';
import { FileUploadService } from '@/lib/services/fileUpload';

/**
 * Cleanup old Excel files from Vercel Blob Storage
 * GET /api/whatsapp/cleanup-files?days=7
 * 
 * This endpoint should be called periodically (e.g., via cron job)
 * to free up storage space
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('days') || '7');

    console.log(`🧹 Starting cleanup of files older than ${daysOld} days...`);

    const result = await FileUploadService.cleanupOldFiles(daysOld);

    if (result.error) {
      return NextResponse.json(
        { 
          error: result.error,
          deleted: result.deleted
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      message: `Successfully deleted ${result.deleted} old files`
    });

  } catch (error) {
    console.error('❌ Cleanup API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
