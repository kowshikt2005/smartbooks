'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DashboardLayout, LoadingSkeleton } from '../../components/layout';
import Card from '../../components/ui/Card';
import { supabase } from '../../lib/supabase/client';
import { getDashboardStats } from '../../lib/services/customers';
import { 
  UsersIcon,
  CurrencyRupeeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalCustomers: number;
  totalBankBalance: number;
  totalOutstanding: number;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);


  // Fetch actual dashboard stats from database
  useEffect(() => {
    const loadStats = async () => {
      try {
        const dashboardStats = await getDashboardStats();
        setStats(dashboardStats);
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        setLoading(false);
      }
    };

    // Load stats immediately
    loadStats();

    // Set up real-time subscription for customer changes
    const subscription = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'customers' 
      }, () => {
        // Reload stats when customer data changes
        loadStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'customer_ledger' 
      }, () => {
        // Reload stats when ledger changes
        loadStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const quickActions = [
    {
      name: 'New Customer',
      href: '/customers/new',
      icon: UsersIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Add a new customer'
    },
    {
      name: 'WhatsApp Message',
      href: '/whatsapp',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Send WhatsApp message'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 pb-20 lg:pb-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here&apos;s what&apos;s happening with your business today.</p>
          </div>

          {loading ? (
            <div className="space-y-6">
              <LoadingSkeleton variant="stats" count={3} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />
              <LoadingSkeleton variant="card" count={2} className="grid grid-cols-1 lg:grid-cols-2 gap-6" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 mr-4">
                      <UsersIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalCustomers}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 mr-4">
                      <CurrencyRupeeIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Bank Balance</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalBankBalance || 0)}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-red-100 mr-4">
                      <CurrencyRupeeIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Outstanding Purchases</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalOutstanding || 0)}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
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
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardPage;