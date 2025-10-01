'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TagIcon, CalculatorIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { discountRulesSchema, type DiscountRules } from '../../lib/validations/customer';
import { 
  calculateTotalDiscountPercentage,
  getDiscountBreakdown,
  validateDiscountRules,
  formatCurrency,
  formatPercentage
} from '../../lib/utils/pricing';

interface DiscountRulesFormProps {
  initialRules?: DiscountRules;
  onSave: (rules: DiscountRules) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function DiscountRulesForm({ 
  initialRules = {}, 
  onSave, 
  onCancel, 
  loading = false 
}: DiscountRulesFormProps) {
  const [previewPrice, setPreviewPrice] = useState(1000); // Default preview price
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
    setValue,
    reset,
  } = useForm<DiscountRules>({
    resolver: zodResolver(discountRulesSchema),
    defaultValues: {
      line_discount: initialRules.line_discount || 0,
      group_discount: initialRules.group_discount || 0,
      brand_discount: initialRules.brand_discount || 0,
    },
  });

  // Watch all discount values for real-time preview
  const currentRules = watch();

  // Validate rules whenever they change
  useEffect(() => {
    const validation = validateDiscountRules(currentRules);
    setValidationErrors(validation.errors);
  }, [currentRules]);

  const onSubmit = async (data: DiscountRules) => {
    const validation = validateDiscountRules(data);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    try {
      await onSave(data);
    } catch (error) {
      console.error('Failed to save discount rules:', error);
    }
  };

  const handleReset = () => {
    reset(initialRules);
    setValidationErrors([]);
  };

  const handleClearAll = () => {
    setValue('line_discount', 0);
    setValue('group_discount', 0);
    setValue('brand_discount', 0);
  };

  // Calculate preview values
  const breakdown = getDiscountBreakdown(previewPrice, currentRules);
  const hasDiscounts = currentRules.line_discount || currentRules.group_discount || currentRules.brand_discount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <TagIcon className="h-6 w-6 mr-2 text-primary-600" />
            Discount Rules Configuration
          </h2>
          <p className="text-gray-600">Set customer-specific discount percentages</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Discount Rules Input */}
        <Card title="Discount Percentages">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Input
                label="Line Discount (%)"
                placeholder="0"
                type="number"
                error={errors.line_discount?.message}
                {...register('line_discount', { 
                  valueAsNumber: true,
                  min: 0,
                  max: 100,
                })}
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
                error={errors.group_discount?.message}
                {...register('group_discount', { 
                  valueAsNumber: true,
                  min: 0,
                  max: 100,
                })}
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
                error={errors.brand_discount?.message}
                {...register('brand_discount', { 
                  valueAsNumber: true,
                  min: 0,
                  max: 100,
                })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Applied to specific brands
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
            >
              Clear All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              Reset to Original
            </Button>
          </div>
        </Card>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card>
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Validation Errors</h4>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Real-time Preview */}
        <Card 
          title="Discount Preview" 
          subtitle="See how discounts will be applied"
          actions={
            <div className="flex items-center space-x-2">
              <CalculatorIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Live calculation</span>
            </div>
          }
        >
          {/* Preview Price Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview Price (₹)
            </label>
            <input
              type="number"
              value={previewPrice}
              onChange={(e) => setPreviewPrice(Number(e.target.value) || 1000)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="1"
              step="0.01"
            />
          </div>

          {hasDiscounts ? (
            <div className="space-y-4">
              {/* Discount Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Calculation Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span className="font-medium">{formatCurrency(breakdown.basePrice)}</span>
                  </div>
                  
                  {breakdown.lineDiscount.percentage > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Line Discount ({formatPercentage(breakdown.lineDiscount.percentage)}):</span>
                      <span>-{formatCurrency(breakdown.lineDiscount.amount)}</span>
                    </div>
                  )}
                  
                  {breakdown.groupDiscount.percentage > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Group Discount ({formatPercentage(breakdown.groupDiscount.percentage)}):</span>
                      <span>-{formatCurrency(breakdown.groupDiscount.amount)}</span>
                    </div>
                  )}
                  
                  {breakdown.brandDiscount.percentage > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Brand Discount ({formatPercentage(breakdown.brandDiscount.percentage)}):</span>
                      <span>-{formatCurrency(breakdown.brandDiscount.amount)}</span>
                    </div>
                  )}
                  
                  <hr className="my-2" />
                  
                  <div className="flex justify-between font-medium">
                    <span>Total Discount ({formatPercentage(breakdown.totalDiscount.percentage)}):</span>
                    <span className="text-red-600">-{formatCurrency(breakdown.totalDiscount.amount)}</span>
                  </div>
                  
                  <div className="flex justify-between text-lg font-bold text-green-600">
                    <span>Final Price:</span>
                    <span>{formatCurrency(breakdown.finalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Visual Representation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {breakdown.lineDiscount.percentage > 0 && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPercentage(breakdown.lineDiscount.percentage)}
                    </div>
                    <div className="text-sm text-blue-700">Line Discount</div>
                    <div className="text-xs text-blue-600">
                      -{formatCurrency(breakdown.lineDiscount.amount)}
                    </div>
                  </div>
                )}
                
                {breakdown.groupDiscount.percentage > 0 && (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(breakdown.groupDiscount.percentage)}
                    </div>
                    <div className="text-sm text-green-700">Group Discount</div>
                    <div className="text-xs text-green-600">
                      -{formatCurrency(breakdown.groupDiscount.amount)}
                    </div>
                  </div>
                )}
                
                {breakdown.brandDiscount.percentage > 0 && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatPercentage(breakdown.brandDiscount.percentage)}
                    </div>
                    <div className="text-sm text-purple-700">Brand Discount</div>
                    <div className="text-xs text-purple-600">
                      -{formatCurrency(breakdown.brandDiscount.amount)}
                    </div>
                  </div>
                )}
              </div>

              {/* Formula Display */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Discount Formula</h4>
                <div className="text-sm font-mono text-yellow-700">
                  Final Price = Base Price × (1 - {currentRules.line_discount || 0}%) × (1 - {currentRules.group_discount || 0}%) × (1 - {currentRules.brand_discount || 0}%)
                </div>
                <div className="text-sm font-mono text-yellow-700 mt-1">
                  {formatCurrency(breakdown.finalPrice)} = {formatCurrency(previewPrice)} × {((1 - (currentRules.line_discount || 0) / 100) * (1 - (currentRules.group_discount || 0) / 100) * (1 - (currentRules.brand_discount || 0) / 100)).toFixed(4)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TagIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No discounts configured</p>
              <p className="text-sm">Set discount percentages above to see the preview</p>
            </div>
          )}
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            loading={loading}
            disabled={!isDirty || validationErrors.length > 0}
          >
            Save Discount Rules
          </Button>
        </div>
      </form>
    </div>
  );
}