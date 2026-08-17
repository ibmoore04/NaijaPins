import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Share2, Copy, Check, MessageSquare } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  title: string;
  url: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, title, url, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`Check out this Nigerian story on NaijaPins: "${title}"`);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-border p-6 space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-black">Share Memory</h3>
            <p className="text-xs text-charcoal-muted line-clamp-1">{title}</p>
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>WhatsApp</span>
          </a>

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-black hover:bg-gray-900 text-white font-bold text-xs transition-colors"
          >
            <span className="text-sm font-black leading-none">𝕏</span>
            <span>X</span>
          </a>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
          >
            <span className="text-sm font-black leading-none">f</span>
            <span>Facebook</span>
          </a>
        </div>

        {/* Native Web Share Button (if supported) */}
        {navigator.share && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.share({
                title,
                text: `Check out "${title}" on NaijaPins`,
                url,
              }).catch(() => {});
            }}
            leftIcon={<Share2 className="w-4 h-4 text-[#0B6B3A]" />}
            className="w-full text-xs font-bold rounded-xl border-border justify-center"
          >
            Share via Device Options...
          </Button>
        )}

        {/* Copy Link Input */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <label className="block text-xs font-semibold text-charcoal-dark">Direct Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50 text-xs text-charcoal-dark focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
