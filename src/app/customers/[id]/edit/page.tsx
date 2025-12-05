'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../../../components/layout';
import { EditContactForm } from '../../../../components/customers/EditCustomerForm';

export default function EditContactPage() {
  const params = useParams();
  const customerId = params.id as string;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6">
          <EditContactForm customerId={customerId} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Metadata is handled by the parent layout since this is a client component