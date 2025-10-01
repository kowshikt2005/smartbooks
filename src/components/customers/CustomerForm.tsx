'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { CustomerService } from '../../lib/services/customers';
import { customerFormSchema, type CustomerFormData } from '../../lib/validations/customer';
import type { Customer } from '../../lib/supabase/types';

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!customer;

  // Initialize form with default values
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name || '',
      phone: customer?.phone || '',
      gst_id: customer?.gst_id || '',
      address: customer?.address || '',
      discount_rules: {
        line_discount: customer?.discount_rules?.line_discount || 0,
        group_discount: customer?.discount_rules?.group_discount || 0,
        brand_discount: customer?.discount_rules?.brand_discount || 0,
      },
    },
  });

  // Watch discount values for real-time updates
  const discountRules = watch('discount_rules');

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setLoading(true);
      setError(null);

      let result: Customer;

      if (isEditing) {
        result = await CustomerService.update(customer.id, {
          name: data.name,
          phone: data.phone || null,
          gst_id: data.gst_id || null,
          address: data.address || null,
          discount_rules: data.discount_rules || {},
        });
      } else {
        result = await CustomerService.create({
          name: data.name,
          phone: data.phone || null,
          gst_id: data.gst_id || null,
          address: data.address || null,
          discount_rules: data.discount_rules || {},
        });
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push(`/customers/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Customer' : 'Add New Customer'}
        </h1>
        <p className="text-gray-600">
          {isEditing ? 'Update customer information' : 'Create a new customer record'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input
                label="Customer Name"
                placeholder="Enter customer name"
                required
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <Input
              label="Phone Number"
              placeholder="Enter phone number"
              type="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="GST/VAT ID"
              placeholder="Enter GST or VAT ID"
              error={errors.gst_id?.message}
              {...register('gst_id')}
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Enter customer address"
                {...register('address')}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Discount Rules */}
        <Card title="Discount Rules" subtitle="Set customer-specific discount percentages">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Input
                label="Line Discount (%)"
                placeholder="0"
                type="number"
                error={errors.discount_rules?.line_discount?.message}
                {...register('discount_rules.line_discount', { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Applied to individual line items
              </p>
            </div>

            <div>
              <Input
                label="Group Discount (%)"
                placeholder="0"
                type="number"
                error={errors.discount_rules?.group_discount?.message}
                {...register('discount_rules.group_discount', { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Applied to item groups/categories
              </p>
            </div>

            <div>
              <Input
                label="Brand Discount (%)"
                placeholder="0"
                type="number"
                error={errors.discount_rules?.brand_discount?.message}
                {...register('discount_rules.brand_discount', { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Applied to specific brands
              </p>
            </div>
          </div>

          {/* Discount Preview */}
          {(discountRules?.line_discount || discountRules?.group_discount || discountRules?.brand_discount) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Discount Preview</h4>
              <p className="text-sm text-blue-700">
                For a ₹100 item, the final price would be calculated as:
              </p>
              <div className="mt-2 text-sm font-mono text-blue-800">
                ₹100 × (1 - {discountRules?.line_discount || 0}%) × (1 - {discountRules?.group_discount || 0}%) × (1 - {discountRules?.brand_discount || 0}%) = 
                ₹{(100 * 
                  (1 - (discountRules?.line_discount || 0) / 100) * 
                  (1 - (discountRules?.group_discount || 0) / 100) * 
                  (1 - (discountRules?.brand_discount || 0) / 100)
                ).toFixed(2)}
              </div>
            </div>
          )}
        </Card>

        {/* Error Display */}
        {error && (
          <Card>
            <div className="text-red-600 text-sm">{error}</div>
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
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
            disabled={!isDirty && isEditing}
          >
            {isEditing ? 'Update Customer' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}