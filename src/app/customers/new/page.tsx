'use client';

import React from 'react';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../../components/layout';
import { ContactForm } from '../../../components/customers/CustomerForm';

export default function NewContactPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6">
          <ContactForm />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Metadata is handled by the parent layout since this is a client component