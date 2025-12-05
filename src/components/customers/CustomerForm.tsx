'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { CustomerService } from '../../lib/services/customers';
import type { CustomerInsert } from '../../lib/supabase/types';

// Validation schema - simplified with only essential fields
const contactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(255, 'Name is too long'),
  phone_no: z.string().min(1, 'Phone number is required').max(20, 'Phone number is too long'),
  location: z.string().max(255, 'Location is too long').optional().or(z.literal('')),
  invoice_id: z.string().max(100, 'Invoice ID is too long').optional().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  onSuccess?: (contact: any) => void;
  onCancel?: () => void;
}

export function ContactForm({ onSuccess, onCancel }: ContactFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      phone_no: '',
      location: '',
      invoice_id: '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setLoading(true);

      // Prepare contact data for insertion
      const contactData: CustomerInsert = {
        name: data.name,
        phone_no: data.phone_no,
        location: data.location || null,
        invoice_id: data.invoice_id || null,
      };

      const contact = await CustomerService.create(contactData);
      
      toast.success('Contact created successfully!');
      reset();
      
      if (onSuccess) {
        onSuccess(contact);
      } else {
        router.push('/customers');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create contact');
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

  return (
    <Card>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Create New Contact</h2>
          <p className="text-gray-600 mt-1">Add a new contact to your database</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Contact Name *"
                  placeholder="Enter contact name"
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
              Create Contact
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}