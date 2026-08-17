import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'outline';
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <Card className="w-full max-w-md bg-white border border-border shadow-2xl rounded-3xl overflow-hidden animate-scale-up">
        <div className="flex items-center justify-between p-4 border-b border-border/80 bg-gray-50/70">
          <div className="flex items-center gap-2 text-xs font-heading font-extrabold text-charcoal-dark uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Confirm Action</span>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-heading font-extrabold text-black">
              {title}
            </h3>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isProcessing}
              className="rounded-xl px-4 font-bold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onConfirm}
              disabled={isProcessing}
              leftIcon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              className={`rounded-xl px-4 font-bold ${
                confirmVariant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#0B6B3A] hover:bg-[#064D2A] text-white'
              }`}
            >
              {isProcessing ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
