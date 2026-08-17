import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Crown, Sparkles, ArrowRight, X } from 'lucide-react';

interface FeatureGateProps {
  title: string;
  description: string;
  onClose?: () => void;
  inline?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  title,
  description,
  onClose,
  inline = false,
}) => {
  const content = (
    <Card className="border-2 border-[#0B6B3A]/30 bg-gradient-to-br from-emerald-50/80 via-white to-[#E8F5EE]/60 p-6 sm:p-8 shadow-xl text-center space-y-5 relative overflow-hidden">
      {/* Decorative Gold Crown */}
      <div className="w-14 h-14 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center mx-auto shadow-md border-2 border-amber-300">
        <Crown className="w-7 h-7 text-amber-300" />
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-charcoal-muted hover:text-black hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="space-y-2 max-w-md mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Premium Feature</span>
        </div>
        <h3 className="text-xl font-heading font-extrabold text-black">{title}</h3>
        <p className="text-xs sm:text-sm text-charcoal-dark leading-relaxed">{description}</p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/premium" className="w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold w-full"
          >
            Unlock Premium (₦2,500/mo)
          </Button>
        </Link>
        {onClose && (
          <Button variant="outline" size="md" onClick={onClose} className="w-full sm:w-auto">
            Maybe Later
          </Button>
        )}
      </div>
    </Card>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-scale-up">{content}</div>
    </div>
  );
};
