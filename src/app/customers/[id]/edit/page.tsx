'use client';

import { useState, useEffect } from 'react';
import { CustomerForm } from '../../../../components/customers/CustomerForm';
import { CustomerService } from '../../../../lib/services/customers';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import type { Customer } from '../../../../lib/supabase/types';

interface EditCustomerPageProps {
  params: {
    id: string;
  };
}

export default function EditCustomerPage({ params }: EditCustomerPageProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
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
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </Card>
    );
  }

  return <CustomerForm customer={customer} />;
}