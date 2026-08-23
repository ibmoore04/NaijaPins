import React from 'react';
import { Loader2 } from 'lucide-react';
import { NaijaPinsLogo } from '@/components/ui/NaijaPinsLogo';

export const PageLoader: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in"
    >
      <div className="relative flex items-center justify-center">
        <NaijaPinsLogo variant="compact" size="md" />
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold text-[#0B6B3A] dark:text-[#108548] tracking-wide">
        <Loader2 className="w-4 h-4 animate-spin text-[#0B6B3A] dark:text-[#108548]" />
        <span>Loading NaijaPins...</span>
      </div>
    </div>
  );
};

export default PageLoader;
