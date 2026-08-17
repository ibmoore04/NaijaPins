import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { supportService } from '@/services/support.service';
import { SupportTicket, SupportMessage } from '@/types/support';
import { SupportStatusBadge, SupportPriorityBadge, SupportTypeBadge } from '@/components/support/SupportStatusBadge';
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const SupportConversationPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTicketAndMessages = async () => {
    if (!ticketId) return;
    setLoading(true);
    const [tData, mData] = await Promise.all([
      supportService.getTicketDetails(ticketId),
      supportService.getTicketMessages(ticketId),
    ]);
    setTicket(tData);
    setMessages(mData);
    setLoading(false);
  };

  useEffect(() => {
    loadTicketAndMessages();
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !replyText.trim()) return;

    setIsSending(true);
    setErrorMsg(null);

    const res = await supportService.sendMessage(ticketId, replyText.trim(), false);
    setIsSending(false);

    if (res.success) {
      setReplyText('');
      loadTicketAndMessages();
    } else {
      setErrorMsg(res.error || 'Failed to send message.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-3xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-black">Support Request Not Found</h2>
        <p className="text-xs text-charcoal-muted">
          This ticket may have been removed or you do not have permission to access it.
        </p>
        <Link to="/help/requests">
          <Button variant="primary" className="bg-[#0B6B3A] text-xs font-bold">
            Back to My Requests
          </Button>
        </Link>
      </div>
    );
  }

  const isClosed = ticket.status === 'closed';
  const isResolved = ticket.status === 'resolved';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-6 animate-fade-in font-body">
      {/* Top Breadcrumb & Status Header */}
      <div className="space-y-3">
        <Link
          to="/help/requests"
          className="text-xs font-semibold text-charcoal-muted hover:text-[#0B6B3A] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Requests</span>
        </Link>

        <Card className="p-5 rounded-3xl border border-border bg-white shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <SupportTypeBadge type={ticket.type} size="sm" />
              <span className="text-gray-300">•</span>
              <SupportStatusBadge status={ticket.status} size="sm" />
              {ticket.priority === 'urgent' && (
                <SupportPriorityBadge priority="urgent" size="sm" />
              )}
            </div>

            <span className="text-[11px] text-charcoal-muted font-mono">
              Ticket #{ticket.id.slice(0, 8)}
            </span>
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-heading font-extrabold text-black">
              {ticket.subject}
            </h1>
            <p className="text-xs text-charcoal-muted mt-1">
              Opened on {new Date(ticket.created_at).toLocaleDateString()} at{' '}
              {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Related Object Banner if exists */}
          {ticket.related_memory && (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs flex items-center justify-between text-[#0B6B3A]">
              <span>Related Memory: <strong>{ticket.related_memory.title}</strong></span>
              <Link
                to={`/memory/${ticket.related_memory.slug}`}
                className="font-bold flex items-center gap-1 hover:underline text-[11px]"
              >
                <span>View Memory</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Resolution Card if resolved */}
      {isResolved && (
        <Card className="p-5 rounded-3xl border border-[#A3D9BC] bg-[#E8F5EE]/70 space-y-2.5 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2 text-[#0B6B3A]">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-heading font-bold text-sm">Request Resolved</h3>
          </div>
          <p className="text-xs text-charcoal-dark leading-relaxed">
            Our support and moderation team has reviewed your ticket and taken the necessary action.
          </p>
          {ticket.resolution_notes && (
            <div className="p-3 rounded-2xl bg-white border border-[#A3D9BC]/60 text-xs text-charcoal-dark font-medium whitespace-pre-line">
              <span className="font-bold block text-[11px] text-[#0B6B3A] mb-1">Support Resolution Response:</span>
              {ticket.resolution_notes}
            </div>
          )}
        </Card>
      )}

      {/* Conversation Stream */}
      <div className="space-y-4 py-2">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start`}
            >
              <UserAvatar
                src={msg.sender?.avatar_url}
                name={isMe ? 'Me' : 'NaijaPins Support'}
                size="sm"
              />

              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-4 space-y-1.5 shadow-2xs ${
                  isMe
                    ? 'bg-[#0B6B3A] text-white rounded-tr-xs'
                    : 'bg-white border border-border text-black rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                  <span className="font-bold flex items-center gap-1">
                    {!isMe && <ShieldCheck className="w-3 h-3 text-[#0B6B3A]" />}
                    <span>{isMe ? 'You' : 'NaijaPins Support Staff'}</span>
                  </span>
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed font-body">
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Composer */}
      {!isClosed ? (
        <form onSubmit={handleSendReply} className="space-y-2 pt-2">
          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center gap-2 bg-white border border-border rounded-2xl p-2 shadow-xs focus-within:border-[#0B6B3A] focus-within:ring-2 focus-within:ring-[#0B6B3A]/20">
            <textarea
              rows={2}
              placeholder="Type your response to support..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 p-2 text-xs sm:text-sm bg-transparent border-0 focus:outline-none resize-none font-body"
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSending || !replyText.trim()}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl h-10 px-4 shrink-0 text-xs"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </span>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-gray-100 text-center text-xs text-charcoal-muted">
          This support ticket has been closed. If you need further assistance, please open a new request.
        </div>
      )}
    </div>
  );
};
