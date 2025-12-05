import { supabase } from '../supabase/client';

export interface WhatsAppAnalytics {
  messagesToday: number;
  totalMessages: number;
  deliveredCount: number;
  failedCount: number;
  deliveryRate: number;
  successRate: number;
  monthlyCost: number;
  totalCostWithoutFreeTier: number;
  conversationsThisMonth: number;
}

export class WhatsAppAnalyticsService {
  /**
   * Get comprehensive WhatsApp analytics
   */
  static async getAnalytics(): Promise<WhatsAppAnalytics> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get messages sent today
      const { count: messagesToday } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', startOfToday.toISOString());

      // Get total messages
      const { count: totalMessages } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true });

      // Get delivered messages
      const { count: deliveredCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .in('status', ['delivered', 'read']);

      // Get failed messages
      const { count: failedCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      // Calculate delivery rate
      const deliveryRate = totalMessages && totalMessages > 0
        ? Math.round((deliveredCount || 0) / totalMessages * 100)
        : 0;

      // Calculate success rate (sent successfully vs failed)
      const successRate = totalMessages && totalMessages > 0
        ? Math.round(((totalMessages - (failedCount || 0)) / totalMessages) * 100)
        : 0;

      // Get messages this month for cost calculation
      const { count: messagesThisMonth } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', startOfMonth.toISOString());

      // Calculate conversations (approximate - each unique phone number per day is a conversation)
      const { data: conversationData, error: convError } = await supabase
        .from('whatsapp_messages')
        .select('phone_number, sent_at')
        .gte('sent_at', startOfMonth.toISOString())
        .not('sent_at', 'is', null); // Only get messages with sent_at timestamp

      if (convError) {
        console.error('Error fetching conversation data:', convError);
      }

      // Group by phone number and date to estimate conversations
      const conversationsThisMonth = this.estimateConversations(conversationData || []);
      
      console.log(`📊 Analytics: ${conversationsThisMonth} conversations from ${conversationData?.length || 0} messages`);

      // Calculate cost based on WhatsApp pricing
      // Free tier: 1000 conversations/month
      // After that: ~$0.005 per conversation (varies by country)
      const paidConversations = Math.max(0, conversationsThisMonth - 1000);
      const monthlyCost = paidConversations * 0.005; // $0.005 per conversation
      
      // Calculate total cost without free tier (what it would cost if no free tier)
      const totalCostWithoutFreeTier = conversationsThisMonth * 0.005;

      return {
        messagesToday: messagesToday || 0,
        totalMessages: totalMessages || 0,
        deliveredCount: deliveredCount || 0,
        failedCount: failedCount || 0,
        deliveryRate,
        successRate,
        monthlyCost: Math.round(monthlyCost * 100) / 100, // Round to 2 decimal places
        totalCostWithoutFreeTier: Math.round(totalCostWithoutFreeTier * 100) / 100,
        conversationsThisMonth
      };
    } catch (error) {
      console.error('Error fetching WhatsApp analytics:', error);
      throw error;
    }
  }

  /**
   * Estimate conversations from message data
   * A conversation is a unique phone number per 24-hour period
   */
  private static estimateConversations(messages: Array<{ phone_number: string; sent_at: string }>): number {
    const conversationSet = new Set<string>();

    messages.forEach(msg => {
      const date = new Date(msg.sent_at);
      const dateKey = `${msg.phone_number}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      conversationSet.add(dateKey);
    });

    return conversationSet.size;
  }

}

// Export singleton instance
export const whatsappAnalyticsService = WhatsAppAnalyticsService;
