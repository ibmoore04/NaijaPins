import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { supportService } from '@/services/support.service';
import { SupportTicketType, SupportTicketPriority } from '@/types/support';
import {
  LifeBuoy,
  X,
  Check,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Bug,
  User,
  Shield,
  CreditCard,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: SupportTicketType;
  initialSubject?: string;
}

const SUPPORT_CATEGORIES: { type: SupportTicketType; label: string; icon: any; description: string }[] = [
  { type: 'bug', label: 'Something isn’t working', icon: Bug, description: 'Technical glitch or app error' },
  { type: 'account', label: 'Account & Profile', icon: User, description: 'Sign-in, profile, or username issues' },
  { type: 'security', label: 'Security & Privacy', icon: Shield, description: 'Privacy, password, or security concern' },
  { type: 'membership', label: 'Membership & Premium', icon: CreditCard, description: 'Billing, subscription, or limits' },
  { type: 'map_issue', label: 'Map or Location Problem', icon: MapPin, description: 'Pins, GPS, or LGA tagging problem' },
  { type: 'media_issue', label: 'Media Upload Problem', icon: ImageIcon, description: 'Photo, audio, or video uploads' },
  { type: 'feature_request', label: 'Suggest a Feature', icon: Sparkles, description: 'Ideas to improve NaijaPins' },
  { type: 'general', label: 'General Question', icon: HelpCircle, description: 'Other heritage questions' },
];

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
  initialType = 'general',
  initialSubject = '',
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [type, setType] = useState<SupportTicketType>(initialType);
  const [subject, setSubject] = useState(initialSubject);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SupportTicketPriority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Please sign in to contact support.');
      return;
    }

    if (!subject.trim() || subject.trim().length < 3) {
      setErrorMessage('Please provide a subject (at least 3 characters).');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Please provide a detailed description (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const safeMetadata = {
      page_url: location.pathname + location.search,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString(),
    };

    const res = await supportService.createTicket({
      type,
      subject: subject.trim(),
      description: description.trim(),
      priority,
      metadata: safeMetadata,
    });

    setIsSubmitting(false);

    if (res.success && res.ticketId) {
      setCreatedTicketId(res.ticketId);
    } else {
      setErrorMessage(res.error || 'Failed to submit support request.');
    }
  };

  const handleReset = () => {
    setType('general');
    setSubject('');
    setDescription('');
    setPriority('normal');
    setErrorMessage(null);
    setCreatedTicketId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-border shadow-2xl rounded-3xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-black">Contact NaijaPins Support</h3>
              <p className="text-[11px] text-charcoal-muted">We’re here to assist your heritage contributions</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto no-scrollbar">
          {createdTicketId ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-base text-black">
                  Support Ticket Created!
                </h4>
                <p className="text-xs text-charcoal-muted max-w-xs mx-auto leading-relaxed">
                  Your ticket has been logged with our team. You can chat directly with support staff from your requests page.
                </p>
              </div>
              <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                  Done
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleReset();
                    navigate(`/help/requests/${createdTicketId}`);
                  }}
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs font-bold"
                >
                  View Conversation
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                  Category *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as SupportTicketType)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-white text-xs font-semibold focus:outline-none focus:border-[#0B6B3A]"
                  required
                >
                  {SUPPORT_CATEGORIES.map((cat) => (
                    <option key={cat.type} value={cat.type}>
                      {cat.label} — {cat.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cannot save location in Abeokuta"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-white text-xs font-semibold focus:outline-none focus:border-[#0B6B3A]"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                  Describe what happened *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide any details, steps to reproduce, or questions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-white text-xs font-medium focus:outline-none focus:border-[#0B6B3A] resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                  Urgency
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'normal', 'high', 'urgent'] as SupportTicketPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-colors border ${
                        priority === p
                          ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-2xs'
                          : 'bg-gray-50 border-border text-charcoal-dark hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold text-xs"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </span>
                  ) : (
                    <span>Submit Ticket</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
