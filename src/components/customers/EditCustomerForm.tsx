'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { CustomerService } from '../../lib/services/customers';
import type { Customer, CustomerUpdate } from '../../lib/supabase/types';

// Validation schema - simplified with only essential fields
const contactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(255, 'Name is too long'),
  phone_no: z.string().min(1, 'Phone number is required').max(20, 'Phone number is too long'),
  location: z.string().max(255, 'Location is too long').optional().or(z.literal('')),
  invoice_id: z.string().max(100, 'Invoice ID is too long').optional().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface EditContactFormProps {
  customerId: string;
  onSuccess?: (contact: Customer) => void;
  onCancel?: () => void;
}

export function EditContactForm({ customerId, onSuccess, onCancel }: EditContactFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [contact, setContact] = useState<Customer | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  // Load contact data
  useEffect(() => {
    const loadContact = async () => {
      try {
        setInitialLoading(true);
        const contactData = await CustomerService.getById(customerId);
        
        if (!contactData) {
          toast.error('Contact not found');
          router.push('/customers');
          return;
        }

        setContact(contactData);
        
        // Set form values
        setValue('name', contactData.name);
        setValue('phone_no', contactData.phone_no);
        setValue('location', contactData.location || '');
        setValue('invoice_id', contactData.invoice_id || '');
        
      } catch (error) {
        console.error('Error loading contact:', error);
        toast.error('Failed to load contact data');
        router.push('/customers');
      } finally {
        setInitialLoading(false);
      }
    };

    if (customerId) {
      loadContact();
    }
  }, [customerId, router, setValue]);

  const onSubmit = async (data: ContactFormData) => {
    try {
      setLoading(true);

      // Prepare contact data for update
      const updateData: CustomerUpdate = {
        name: data.name,
        phone_no: data.phone_no,
        location: data.location || null,
        invoice_id: data.invoice_id || null,
      };

      const updatedContact = await CustomerService.update(customerId, updateData);
      
      toast.success('Contact updated successfully!');
      
      if (onSuccess) {
        onSuccess(updatedContact);
      } else {
        router.push('/customers');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/customers');
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading customer data...</span>
        </div>
      </Card>
    );
  }

  if (!contact) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">Customer not found</div>
          <Button onClick={() => router.push('/customers')}>Back to Customers</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Edit Customer</h2>
          <p className="text-gray-600 mt-1">Update customer information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Customer Name *"
                  placeholder="Enter customer name"
                  error={errors.name?.message}
                  required
                  {...register('name')}
                />
              </div>
              <div>
                <Input
                  label="Phone Number *"
                  placeholder="Enter phone number"
                  error={errors.phone_no?.message}
                  required
                  {...register('phone_no')}
                />
              </div>
              <div>
                <Input
                  label="Location"
                  placeholder="Enter location"
                  error={errors.location?.message}
                  {...register('location')}
                />
              </div>
              <div>
                <Input
                  label="Invoice ID"
                  placeholder="Enter invoice ID"
                  error={errors.invoice_id?.message}
                  {...register('invoice_id')}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
            >
              Update Customer
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}