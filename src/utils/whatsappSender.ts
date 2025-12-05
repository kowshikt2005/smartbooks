/**
 * WhatsApp Message Sender Utility
 * Centralized function to send WhatsApp messages via Cloud API or Web
 */

export type MessagingMode = 'cloud' | 'web';

export interface SendMessageOptions {
  to: string;
  message: string;
  mode?: MessagingMode;
  onSuccess?: (messageId?: string) => void;
  onError?: (error: string) => void;
}

/**
 * Send a WhatsApp message using the configured mode
 */
export async function sendWhatsAppMessage(options: SendMessageOptions): Promise<void> {
  const { to, message, mode = 'cloud', onSuccess, onError } = options;

  // Clean and format phone number
  let cleanPhone = to.replace(/[\s\-\(\)\+]/g, '');
  
  // Handle different phone number formats
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '91' + cleanPhone.substring(1);
  } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
    cleanPhone = '91' + cleanPhone;
  } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone;
  }

  // Validate phone number
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    const error = `Invalid phone number: ${to}`;
    if (onError) onError(error);
    else alert(error);
    return;
  }

  if (mode === 'cloud') {
    // Send via WhatsApp Cloud API using template message (required for unrestricted sending)
    // Free-form text only works within 24-hour window after customer initiates conversation
    try {
      // Use payment_reminder template for all messages
      const response = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          templateName: 'payment_reminder',
          templateLanguage: 'en',
          parameters: {
            body_1: message.split('\n')[0] || 'Payment Reminder', // First line as greeting
            body_2: message.split('\n').slice(1).join('\n') || message, // Rest as details
            body_3: 'SmartBooks Team' // Signature
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        if (onSuccess) {
          onSuccess(result.messageId);
        } else {
          alert(`✅ Message sent successfully via WhatsApp Cloud API!\n\nMessage ID: ${result.messageId}`);
        }
      } else {
        const error = `Failed to send message: ${result.error}`;
        if (onError) onError(error);
        else alert(`❌ ${error}\n\nPlease try again or switch to WhatsApp Web mode.`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (onError) onError(errorMsg);
      else alert(`❌ Error sending message: ${errorMsg}\n\nPlease check your internet connection.`);
    }
  } else {
    // Send via WhatsApp Web (open in browser)
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Track web mode messages in database for analytics
    try {
      await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          message: message,
          trackOnly: true // Flag to only track, not actually send
        })
      });
    } catch (error) {
      console.error('Failed to track web mode message:', error);
      // Don't fail the whole operation if tracking fails
    }
    
    if (onSuccess) onSuccess();
  }
}

/**
 * Get the current messaging mode from localStorage
 */
export function getMessagingMode(): MessagingMode {
  if (typeof window === 'undefined') return 'cloud';
  
  try {
    const stored = localStorage.getItem('whatsapp_messaging_mode');
    return (stored === 'web' || stored === 'cloud') ? stored : 'cloud';
  } catch {
    return 'cloud';
  }
}

/**
 * Set the messaging mode in localStorage
 */
export function setMessagingMode(mode: MessagingMode): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('whatsapp_messaging_mode', mode);
  } catch (error) {
    console.error('Failed to save messaging mode:', error);
  }
}
