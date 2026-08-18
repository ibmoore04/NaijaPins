import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  showCloseButton?: boolean;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  maxHeight = 'max-h-[88vh]',
  showCloseButton = true,
}) => {
  // Body scroll lock & escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-fade-in font-body">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        className={`relative z-10 w-full bg-white rounded-t-3xl border-t border-border shadow-2xl overflow-hidden flex flex-col ${maxHeight} animate-slide-up pb-[env(safe-area-inset-bottom)] ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag Handle */}
        <div
          className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onClick={onClose}
        >
          <div className="w-12 h-1.5 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors" />
        </div>

        {/* Optional Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/70">
            <div className="min-w-0 flex-1 pr-3">
              {title && (
                <h3 className="font-heading font-bold text-base text-black truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-charcoal-muted truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-black hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Sheet Body with clean scroll */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
