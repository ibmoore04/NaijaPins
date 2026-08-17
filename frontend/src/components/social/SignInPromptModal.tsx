import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MapPin, X, Heart, MessageSquare, Repeat, Bookmark, UserPlus } from 'lucide-react';

interface SignInPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  actionText?: string;
}

export const SignInPromptModal: React.FC<SignInPromptModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  actionText = 'interact with the community',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <Card className="w-full max-w-md bg-white border border-border shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
        <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/70">
          <div className="flex items-center gap-2 text-[#0B6B3A] font-semibold text-sm">
            <div className="w-6 h-6 rounded-full bg-[#0B6B3A] flex items-center justify-center text-white">
              <MapPin className="w-3.5 h-3.5 fill-white stroke-[#0B6B3A]" />
            </div>
            <span>Join the NaijaPins Community</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 space-y-6 text-center">
          <div className="flex justify-center items-center gap-3 text-[#0B6B3A]">
            <span className="p-2.5 rounded-full bg-emerald-50 text-red-500 border border-red-100">
              <Heart className="w-5 h-5 fill-red-500" />
            </span>
            <span className="p-2.5 rounded-full bg-emerald-50 text-[#0B6B3A] border border-emerald-100">
              <MessageSquare className="w-5 h-5" />
            </span>
            <span className="p-2.5 rounded-full bg-emerald-50 text-amber-600 border border-amber-100">
              <Repeat className="w-5 h-5" />
            </span>
            <span className="p-2.5 rounded-full bg-emerald-50 text-blue-600 border border-blue-100">
              <Bookmark className="w-5 h-5" />
            </span>
            <span className="p-2.5 rounded-full bg-emerald-50 text-purple-600 border border-purple-100">
              <UserPlus className="w-5 h-5" />
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-black tracking-tight">
              Sign in to {actionText}
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-dark leading-relaxed">
              Connect with thousands of Nigerians preserving heritage, sharing historic photos, liking stories, and engaging in cultural discussions.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                onClose();
                onOpenAuth('register');
              }}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl shadow-xs"
            >
              Create Free Account
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                onClose();
                onOpenAuth('login');
              }}
              className="rounded-xl font-semibold border-border hover:bg-gray-50"
            >
              Log In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
