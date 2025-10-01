'use client';

import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'list' | 'stats';
  count?: number;
  className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'card', 
  count = 1,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
            <div className="animate-pulse">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-gray-200 rounded-lg mr-4"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
            <div className="animate-pulse">
              {/* Table header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              </div>
              {/* Table rows */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-6 py-4 border-b border-gray-200">
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'list':
        return (
          <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="animate-pulse divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={count > 1 ? 'mb-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default LoadingSkeleton;