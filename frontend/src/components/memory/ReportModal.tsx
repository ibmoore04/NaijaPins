import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ReportReason } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { supportService } from '@/services/support.service';
import { X, Flag, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  memoryId: string;
  memoryTitle: string;
  onClose: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam or Promotional', description: 'Commercial advertising, repeated posts, or irrelevant text' },
  { value: 'MISINFORMATION', label: 'Historical Misinformation', description: 'Inaccurate historical facts, dates, or false attribution' },
  { value: 'HARASSMENT', label: 'Harassment or Hate Speech', description: 'Targeting individuals, communities, or offensive language' },
  { value: 'PRIVACY_VIOLATION', label: 'Privacy Violation', description: 'Personal private contact information, addresses, or unconsented photos' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate Content', description: 'Explicit images, violence, or unsafe material' },
  { value: 'COPYRIGHT', label: 'Copyright Infringement', description: 'Using photos or text without permission from rights holder' },
  { value: 'OTHER', label: 'Other Concern', description: 'Any other issue not listed above' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  memoryId,
  memoryTitle,
  onClose,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('You must be logged in to submit a report.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const selectedReasonObj = REPORT_REASONS.find((r) => r.value === reason);
      const subject = `Memory Report: ${memoryTitle}`;
      const description = `Reason: ${selectedReasonObj?.label || reason}\n\nTarget Memory: ${memoryTitle}\nDetails: ${
        details.trim() || 'No additional details provided.'
      }`;

      // 1. Create support ticket for user communication loop
      const ticketRes = await supportService.createTicket({
        type: 'memory_report',
        subject,
        description,
        priority: 'high',
        related_memory_id: memoryId,
        metadata: {
          report_reason: reason,
          memory_title: memoryTitle,
        },
      });

      // 2. Also insert into moderation reports table for compatibility
      try {
        await supabase.from('reports').insert({
          reporter_id: user.id,
          memory_id: memoryId,
          reason,
          details: details.trim() || null,
          status: 'pending',
          support_ticket_id: ticketRes.ticketId || null,
        });
      } catch {}

      if (ticketRes.success && ticketRes.ticketId) {
        setTicketId(ticketRes.ticketId);
      } else {
        setTicketId('done');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('SPAM');
    setDetails('');
    setErrorMsg(null);
    setTicketId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-body">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-border p-6 space-y-5">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-black">Report Memory Story</h3>
            <p className="text-xs text-charcoal-muted line-clamp-1">{memoryTitle}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {ticketId ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-bold text-sm sm:text-base text-black">
                Report Submitted to Moderation
              </h4>
              <p className="text-xs text-charcoal-muted max-w-xs mx-auto leading-relaxed">
                Thank you. Our team will review this memory and notify you when action has been taken.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                Done
              </Button>
              {ticketId !== 'done' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleClose();
                    navigate(`/help/requests/${ticketId}`);
                  }}
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs font-bold"
                >
                  Track in Support
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-charcoal-dark uppercase tracking-wider">
                Select Reason *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'border-red-500 bg-red-50/50'
                        : 'border-border hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5 accent-red-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-black">{r.label}</p>
                      <p className="text-[11px] text-charcoal-muted leading-tight">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-dark mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Provide any context to help our moderation team understand the issue..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
