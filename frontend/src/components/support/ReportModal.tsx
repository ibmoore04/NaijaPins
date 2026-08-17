import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { supportService } from '@/services/support.service';
import { SupportTicketType } from '@/types/support';
import { Flag, X, Check, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

interface ReportTargetInfo {
  type: 'memory' | 'comment' | 'user';
  id: string;
  titleOrName: string;
  snippet?: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ReportTargetInfo | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, target }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reason, setReason] = useState('inappropriate_content');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  if (!isOpen || !target) return null;

  const getReasonOptions = () => {
    if (target.type === 'memory') {
      return [
        { value: 'inappropriate_content', label: 'Inappropriate or harmful content' },
        { value: 'false_information', label: 'False or misleading historical information' },
        { value: 'wrong_location', label: 'Incorrect location or state tagging' },
        { value: 'copyright_violation', label: 'Copyright / Uncredited photo or media' },
        { value: 'harassment', label: 'Harassment or hate speech' },
        { value: 'spam', label: 'Spam, scam, or advertising' },
        { value: 'other', label: 'Other issue' },
      ];
    }
    if (target.type === 'comment') {
      return [
        { value: 'harassment', label: 'Harassment or hate speech' },
        { value: 'spam', label: 'Spam, scam, or unsolicited links' },
        { value: 'inappropriate_content', label: 'Inappropriate or abusive language' },
        { value: 'other', label: 'Other concern' },
      ];
    }
    return [
      { value: 'impersonation', label: 'Impersonation or fake account' },
      { value: 'harassment', label: 'Targeted harassment or threats' },
      { value: 'spam', label: 'Spamming or malicious activity' },
      { value: 'other', label: 'Other violations' },
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Please sign in to submit a report.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const ticketTypeMap: Record<string, SupportTicketType> = {
      memory: 'memory_report',
      comment: 'comment_report',
      user: 'user_report',
    };

    const selectedReasonLabel =
      getReasonOptions().find((r) => r.value === reason)?.label || reason;

    const subject = `Report: ${target.type.toUpperCase()} - ${target.titleOrName}`;
    const description = `Reason: ${selectedReasonLabel}\n\nTarget Details: ${target.titleOrName}\n${
      target.snippet ? `Snippet: "${target.snippet}"\n` : ''
    }\nContributor Message: ${details.trim() || 'No additional details provided.'}`;

    const res = await supportService.createTicket({
      type: ticketTypeMap[target.type] || 'general',
      subject,
      description,
      priority: 'high',
      related_memory_id: target.type === 'memory' ? target.id : undefined,
      related_comment_id: target.type === 'comment' ? target.id : undefined,
      related_user_id: target.type === 'user' ? target.id : undefined,
      metadata: {
        report_reason_key: reason,
        report_reason_label: selectedReasonLabel,
        target_type: target.type,
        target_id: target.id,
      },
    });

    setIsSubmitting(false);

    if (res.success && res.ticketId) {
      setSubmittedTicketId(res.ticketId);
    } else {
      setErrorMessage(res.error || 'Failed to submit report. Please try again.');
    }
  };

  const handleReset = () => {
    setReason('inappropriate_content');
    setDetails('');
    setErrorMessage(null);
    setSubmittedTicketId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white border border-border shadow-2xl rounded-3xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-black">
                Report {target.type === 'memory' ? 'Memory' : target.type === 'comment' ? 'Comment' : 'Contributor'}
              </h3>
              <p className="text-[11px] text-charcoal-muted truncate max-w-[240px]">
                {target.titleOrName}
              </p>
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

        {/* Body Content */}
        <div className="p-5">
          {submittedTicketId ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-base text-black">
                  Report Submitted Successfully
                </h4>
                <p className="text-xs text-charcoal-muted max-w-xs mx-auto leading-relaxed">
                  Our moderation team has received your report. You can track this report in your Support Requests.
                </p>
              </div>
              <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleReset();
                    navigate(`/help/requests/${submittedTicketId}`);
                  }}
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs font-bold"
                >
                  Track Report
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

              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                  What is wrong? *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-white text-xs font-semibold focus:outline-none focus:border-[#0B6B3A]"
                  required
                >
                  {getReasonOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1.5">
                  Tell us more <span className="text-charcoal-muted font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide additional details or context to help our moderation team review this quickly..."
                  className="w-full p-3 rounded-xl border border-border bg-white text-xs font-medium focus:outline-none focus:border-[#0B6B3A] resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-border/80 text-[11px] text-charcoal-muted leading-relaxed">
                NaijaPins moderation reviews reports within 24 hours. You will receive an in-app notification once action has been taken.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </span>
                  ) : (
                    <span>Submit Report</span>
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
