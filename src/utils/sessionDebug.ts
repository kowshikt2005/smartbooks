/**
 * Utility functions for debugging WhatsApp session data
 */

const STORAGE_KEY = 'whatsapp_session_data';

export const SessionDebugUtils = {
  /**
   * Get current session data from localStorage
   */
  getSessionData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading session data:', error);
      return null;
    }
  },

  /**
   * Log session data to console
   */
  logSessionData() {
    const data = this.getSessionData();
    if (data) {
      console.log('WhatsApp Session Data:', {
        customers: data.customers?.length || 0,
        originalCustomers: data.originalCustomers?.length || 0,
        isShowingImported: data.isShowingImportedData,
        importType: data.importType,
        lastImport: data.lastImportTimestamp ? new Date(data.lastImportTimestamp).toLocaleString() : 'Never',
        sessionAge: data.lastImportTimestamp ? `${Math.round((Date.now() - data.lastImportTimestamp) / 1000 / 60)} minutes` : 'N/A'
      });
    } else {
      console.log('No WhatsApp session data found');
    }
  },

  /**
   * Clear session data
   */
  clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('WhatsApp session data cleared');
  },

  /**
   * Check if session has expired
   */
  isSessionExpired() {
    const data = this.getSessionData();
    if (!data || !data.lastImportTimestamp) return true;
    
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const timeDiff = now - data.lastImportTimestamp;
    
    return timeDiff > SESSION_TIMEOUT;
  },

  /**
   * Get session info for display
   */
  getSessionInfo() {
    const data = this.getSessionData();
    if (!data) return null;

    const timeSinceImport = data.lastImportTimestamp 
      ? Date.now() - data.lastImportTimestamp 
      : 0;
    
    const hoursAgo = Math.floor(timeSinceImport / (1000 * 60 * 60));
    const minutesAgo = Math.floor((timeSinceImport % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeText = '';
    if (hoursAgo > 0) {
      timeText = `${hoursAgo}h ${minutesAgo}m ago`;
    } else if (minutesAgo > 0) {
      timeText = `${minutesAgo}m ago`;
    } else {
      timeText = 'just now';
    }

    return {
      hasData: data.customers?.length > 0,
      isShowingImported: data.isShowingImportedData,
      importType: data.importType || 'unknown',
      recordCount: data.customers?.length || 0,
      timeText,
      isExpired: this.isSessionExpired()
    };
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).whatsappSessionDebug = SessionDebugUtils;
}