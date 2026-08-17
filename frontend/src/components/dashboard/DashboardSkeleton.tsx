import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header Banner Skeleton */}
      <div className="h-24 bg-gray-200 rounded-2xl w-full"></div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
        ))}
      </div>

      {/* Table / List Skeleton */}
      <div className="space-y-3 pt-4">
        <div className="h-8 bg-gray-200 rounded-lg w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
        <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
      </div>
    </div>
  );
};
