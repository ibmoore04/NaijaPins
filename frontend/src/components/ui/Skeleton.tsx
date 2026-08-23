import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
      {...props}
    />
  );
};

export const MemoryCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#141A17] rounded-xl overflow-hidden border border-border shadow-xs flex flex-col animate-fade-in">
      <Skeleton className="h-44 sm:h-48 w-full rounded-none" />
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
};

export const ListItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#141A17] border border-border rounded-xl">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
};

export default Skeleton;
