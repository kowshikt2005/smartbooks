'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DiscountRulesForm } from '../../../../components/customers/DiscountRulesForm';
import { CustomerService } from '../../../../lib/services/customers';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import type { Customer } from '../../../../lib/supabase/types';
import type { DiscountRules } from '../../../../lib/validations/customer';

interface CustomerDiscountsPageProps {
  params: {
    id: string;
  };
}

export default function CustomerDiscountsPage({ params }: CustomerDiscountsPageProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        setError(null);
        const customerData = await CustomerService.getById(params.id);
        setCustomer(customerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [params.id]);

  const handleSaveDiscountRules = async (rules: DiscountRules) => {
    if (!customer) return;

    try {
      setSaving(true);
      setError(null);
      
      const updatedCustomer = await CustomerService.update(customer.id, {
        discount_rules: rules,
      });
      
      setCustomer(updatedCustomer);
      router.push(`/customers/${customer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save discount rules');
      throw err; // Re-throw to let the form handle it
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/customers/${params.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-gray-600 mb-4">Customer not found</div>
          <Button onClick={() => router.push('/customers')}>Back to Customers</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-4">
          <li>
            <button
              onClick={() => router.push('/customers')}
              className="text-gray-400 hover:text-gray-500"
            >
              Customers
            </button>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <button
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="ml-4 text-gray-400 hover:text-gray-500"
              >
                {customer.name}
              </button>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-4 text-sm font-medium text-gray-500">Discount Rules</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Customer Info Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-600">Configure discount rules for this customer</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Customer ID</p>
            <p className="text-sm font-mono text-gray-900">{customer.id.slice(0, 8)}...</p>
          </div>
        </div>
      </Card>

      {/* Discount Rules Form */}
      <DiscountRulesForm
        initialRules={customer.discount_rules}
        onSave={handleSaveDiscountRules}
        onCancel={handleCancel}
        loading={saving}
      />
    </div>
  );
}