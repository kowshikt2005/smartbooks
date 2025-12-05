'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DashboardLayout, LoadingSkeleton } from '../../components/layout';
import Card from '../../components/ui/Card';
import { 
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  PaperAirplaneIcon,
  UsersIcon,
  DocumentArrowUpIcon,
  PhoneIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface WhatsAppAnalytics {
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

const DashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<WhatsAppAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch WhatsApp analytics
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch('/api/whatsapp/stats');
        const data = await response.json();
        
        if (data.success) {
          setAnalytics(data.analytics);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading WhatsApp analytics:', error);
        setLoading(false);
      }
    };

    loadAnalytics();

    // Refresh analytics every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);

    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    {
      name: 'Send Reminders',
      href: '/whatsapp',
      icon: PaperAirplaneIcon,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Send WhatsApp payment reminders'
    },
    {
      name: 'View Customers',
      href: '/customers',
      icon: UsersIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Manage customer database'
    },
    {
      name: 'Import Excel',
      href: '/whatsapp',
      icon: DocumentArrowUpIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Import customer data from Excel'
    },
    {
      name: 'WhatsApp Messages',
      href: '/whatsapp',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-teal-500 hover:bg-teal-600',
      description: 'View all WhatsApp messages'
    },
    {
      name: 'Manage Phones',
      href: '/whatsapp',
      icon: PhoneIcon,
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'Manage customer phone numbers'
    },
    {
      name: 'View Meta Analytics',
      href: 'https://business.facebook.com/latest/inbox/settings/whatsapp',
      icon: ChartBarIcon,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'View detailed analytics in Meta Business Manager',
      external: true
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };



  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 pb-20 lg:pb-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your WhatsApp messaging performance and activity</p>
          </div>

          {loading ? (
            <div className="space-y-6">
              <LoadingSkeleton variant="stats" count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" />
              <LoadingSkeleton variant="card" count={1} className="grid grid-cols-1 gap-6" />
            </div>
          ) : (
            <>
              {/* WhatsApp Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Messages Sent Today */}
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 mr-4">
                      <PaperAirplaneIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Messages Today</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics?.messagesToday || 0}</p>
                    </div>
                  </div>
                </Card>

                {/* Success Rate */}
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 mr-4">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics?.successRate || 0}%</p>
                      <p className="text-xs text-gray-500 mt-1">Sent successfully</p>
                    </div>
                  </div>
                </Card>

                {/* Failed Messages */}
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-red-100 mr-4">
                      <XCircleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics?.failedCount || 0}</p>
                    </div>
                  </div>
                </Card>

                {/* Monthly Cost */}
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 mr-4">
                      <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(analytics?.monthlyCost || 0)}
                        {analytics?.totalCostWithoutFreeTier && analytics.totalCostWithoutFreeTier > 0 && (
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            ({formatCurrency(analytics.totalCostWithoutFreeTier)})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{analytics?.conversationsThisMonth || 0} conversations</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    const isExternal = action.external;
                    
                    if (isExternal) {
                      return (
                        <a 
                          key={action.name} 
                          href={action.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                            <div className="text-center">
                              <div className={`inline-flex p-3 rounded-full ${action.color} mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon className="h-6 w-6 text-white" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.name}</h3>
                              <p className="text-sm text-gray-600">{action.description}</p>
                            </div>
                          </Card>
                        </a>
                      );
                    }
                    
                    return (
                      <Link key={action.name} href={action.href}>
                        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                          <div className="text-center">
                            <div className={`inline-flex p-3 rounded-full ${action.color} mb-4 group-hover:scale-110 transition-transform`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.name}</h3>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Total Messages Summary */}
              <div className="text-center text-gray-600">
                <p className="text-sm">
                  Total messages sent: <span className="font-semibold text-gray-900">{analytics?.totalMessages || 0}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardPage;