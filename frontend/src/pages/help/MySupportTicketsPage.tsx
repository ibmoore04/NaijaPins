import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { supportService } from '@/services/support.service';
import { SupportTicket } from '@/types/support';
import { SupportStatusBadge, SupportPriorityBadge, SupportTypeBadge } from '@/components/support/SupportStatusBadge';
import { ContactSupportModal } from '@/components/support/ContactSupportModal';
import {
  LifeBuoy,
  PlusCircle,
  ArrowLeft,
  ChevronRight,
  Clock,
  HelpCircle,
} from 'lucide-react';

export const MySupportTicketsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  useEffect(() => {
    const loadTickets = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const list = await supportService.getContributorTickets(user.id);
      setTickets(list);
      setLoading(false);
    };

    loadTickets();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto">
          <LifeBuoy className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-black">Sign In to View Requests</h2>
        <p className="text-xs text-charcoal-muted">
          Please sign in to track your support tickets, moderation reports, and official responses.
        </p>
        <Link to="/help">
          <Button variant="primary" className="bg-[#0B6B3A] text-xs font-bold">
            Back to Help Center
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-fade-in font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/help"
              className="text-xs font-semibold text-charcoal-muted hover:text-[#0B6B3A] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Help Center</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-black tracking-tight flex items-center gap-2">
            <span>My Support & Report Requests</span>
          </h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Track reports, technical tickets, and communicate directly with the NaijaPins support team.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setContactModalOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
          className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold text-xs self-start sm:self-auto"
        >
          New Request
        </Button>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-border rounded-3xl space-y-4 bg-white">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-black">No Support Requests</h3>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              You have not submitted any technical issues or moderation reports yet.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setContactModalOpen(true)}
            className="text-xs font-semibold"
          >
            Create a Request
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              onClick={() => navigate(`/help/requests/${ticket.id}`)}
              className="p-4 sm:p-5 rounded-2xl border border-border bg-white hover:border-[#0B6B3A]/60 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SupportTypeBadge type={ticket.type} size="sm" />
                    <span className="text-gray-300">•</span>
                    <SupportStatusBadge status={ticket.status} size="sm" />
                    {ticket.priority === 'urgent' && (
                      <SupportPriorityBadge priority="urgent" size="sm" />
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-black truncate">
                    {ticket.subject}
                  </h3>

                  <p className="text-xs text-charcoal-muted line-clamp-2 leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-charcoal-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Updated {new Date(ticket.updated_at).toLocaleDateString()}</span>
                    </span>

                    {ticket.related_memory && (
                      <span className="truncate max-w-[200px] text-emerald-700 font-medium">
                        Memory: {ticket.related_memory.title}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-charcoal-muted shrink-0 self-center" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Support Modal */}
      <ContactSupportModal
        isOpen={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          if (user) {
            supportService.getContributorTickets(user.id).then(setTickets);
          }
        }}
      />
    </div>
  );
};
