import { put } from '@vercel/blob';

/**
 * File Upload Service
 * Handles file uploads to Vercel Blob Storage
 */
export class FileUploadService {
  /**
   * Upload Excel file to Vercel Blob Storage
   * Returns public URL for WhatsApp Cloud API
   * Files auto-delete after 7 days to save storage
   */
  static async uploadExcel(
    buffer: Buffer,
    filename: string
  ): Promise<{ url: string; error?: string }> {
    try {
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        return { url: '', error: 'Empty file buffer' };
      }

      // Validate filename
      if (!filename || !filename.endsWith('.xlsx')) {
        filename = `${filename || 'statement'}.xlsx`;
      }

      // Calculate expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Upload to Vercel Blob with auto-deletion
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        addRandomSuffix: true, // Prevents filename conflicts
        cacheControlMaxAge: 604800 // 7 days in seconds
      });

      console.log(`✅ Excel file uploaded: ${blob.url}`);
      console.log(`🗑️  File will auto-delete after 7 days`);
      
      return { url: blob.url };
    } catch (error) {
      console.error('❌ File upload failed:', error);
      return {
        url: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload any file to Vercel Blob Storage
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<{ url: string; error?: string }> {
    try {
      if (!buffer || buffer.length === 0) {
        return { url: '', error: 'Empty file buffer' };
      }

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: true
      });

      console.log(`✅ File uploaded: ${blob.url}`);
      
      return { url: blob.url };
    } catch (error) {
      console.error('❌ File upload failed:', error);
      return {
        url: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Clean up old files from Vercel Blob Storage
   * Call this periodically to free up space
   */
  static async cleanupOldFiles(daysOld: number = 7): Promise<{
    deleted: number;
    error?: string;
  }> {
    try {
      const { list, del } = await import('@vercel/blob');
      
      // List all blobs
      const { blobs } = await list();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      
      // Delete old files
      for (const blob of blobs) {
        const uploadDate = new Date(blob.uploadedAt);
        
        if (uploadDate < cutoffDate) {
          await del(blob.url);
          deletedCount++;
          console.log(`🗑️  Deleted old file: ${blob.pathname}`);
        }
      }
      
      console.log(`✅ Cleanup complete: ${deletedCount} files deleted`);
      
      return { deleted: deletedCount };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return {
        deleted: 0,
        error: error instanceof Error ? error.message : 'Cleanup failed'
      };
    }
  }
}
