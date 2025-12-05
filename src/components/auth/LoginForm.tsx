'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { AuthServiceError, AUTH_ERROR_MESSAGES } from '../../lib/auth';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  className = '',
}) => {
  const { signIn, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setAuthError('');
      await signIn({
        email: data.email,
        password: data.password,
      });
      onSuccess?.();
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof AuthServiceError) {
        // Handle specific auth errors
        switch (error.message) {
          case 'Invalid login credentials':
            setAuthError(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
            break;
          case 'Email not confirmed':
            setAuthError(AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED);
            break;
          default:
            setAuthError(error.message || AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
        }
      } else {
        setAuthError(AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white shadow-lg rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to KSolutions
          </h1>
          <p className="text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* Error Message */}
        {authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{authError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            {/* Forgot Password Link */}
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Forgot password?
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <a href="/auth/signup" className="text-blue-600 hover:text-blue-500 font-medium">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};