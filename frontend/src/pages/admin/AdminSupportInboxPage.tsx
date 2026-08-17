import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { supportService } from '@/services/support.service';
import {
  SupportTicket,
  SupportMessage,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportStats,
} from '@/types/support';
import { SupportStatusBadge, SupportPriorityBadge, SupportTypeBadge } from '@/components/support/SupportStatusBadge';
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Send,
  Lock,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export const AdminSupportInboxPage: React.FC = () => {
  const { user } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    open_tickets: 0,
    under_review: 0,
    waiting_for_contributor: 0,
    urgent_tickets: 0,
    resolved_this_week: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriority | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Selected Ticket
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Composer Form
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTicketsAndStats = async () => {
    setLoading(true);
    const [tList, sData] = await Promise.all([
      supportService.getAdminTickets({
        status: statusFilter,
        priority: priorityFilter,
        searchQuery,
      }),
      supportService.getAdminSupportStats(),
    ]);

    setTickets(tList);
    setStats(sData);
    setLoading(false);

    if (tList.length > 0 && !selectedTicket) {
      handleSelectTicket(tList[0]);
    }
  };

  useEffect(() => {
    loadTicketsAndStats();
  }, [statusFilter, priorityFilter, searchQuery]);

  const handleSelectTicket = async (t: SupportTicket) => {
    setSelectedTicket(t);
    setMessagesLoading(true);
    setActionError(null);
    const mList = await supportService.getTicketMessages(t.id);
    setMessages(mList);
    setMessagesLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSending(true);
    setActionError(null);

    const res = await supportService.sendMessage(
      selectedTicket.id,
      replyText.trim(),
      isInternalNote
    );

    setIsSending(false);

    if (res.success) {
      setReplyText('');
      const updatedMessages = await supportService.getTicketMessages(selectedTicket.id);
      setMessages(updatedMessages);
      loadTicketsAndStats();
    } else {
      setActionError(res.error || 'Failed to send message.');
    }
  };

  const handleUpdateStatus = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;
    setActionError(null);

    const res = await supportService.updateTicketStatus(
      selectedTicket.id,
      newStatus,
      undefined,
      undefined,
      resolutionNotes.trim() || undefined
    );

    if (res.success) {
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      loadTicketsAndStats();
      setIsResolving(false);
    } else {
      setActionError(res.error || 'Failed to update status.');
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !user) return;
    setActionError(null);

    const res = await supportService.updateTicketStatus(
      selectedTicket.id,
      selectedTicket.status,
      undefined,
      user.id
    );

    if (res.success) {
      setSelectedTicket((prev) => (prev ? { ...prev, assigned_admin_id: user.id } : null));
      loadTicketsAndStats();
    }
  };

  const STATUS_TABS: { label: string; value: SupportTicketStatus | 'ALL'; count?: number }[] = [
    { label: 'All Requests', value: 'ALL', count: tickets.length },
    { label: 'Open', value: 'open', count: stats.open_tickets },
    { label: 'Under Review', value: 'under_review', count: stats.under_review },
    { label: 'Waiting on User', value: 'waiting_for_contributor', count: stats.waiting_for_contributor },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-[#0B6B3A]" />
            <span>Support & Report Inbox</span>
          </h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Manage contributor tickets, review moderation reports, assign staff, and respond directly.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadTicketsAndStats}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs self-start sm:self-auto"
        >
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 rounded-2xl border border-border bg-white space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">Open Tickets</span>
          <p className="text-2xl font-extrabold text-blue-600">{stats.open_tickets}</p>
        </Card>

        <Card className="p-4 rounded-2xl border border-border bg-white space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">Under Review</span>
          <p className="text-2xl font-extrabold text-amber-600">{stats.under_review}</p>
        </Card>

        <Card className="p-4 rounded-2xl border border-border bg-white space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">Urgent Priority</span>
          <p className="text-2xl font-extrabold text-red-600">{stats.urgent_tickets}</p>
        </Card>

        <Card className="p-4 rounded-2xl border border-border bg-white space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">Resolved This Week</span>
          <p className="text-2xl font-extrabold text-[#0B6B3A]">{stats.resolved_this_week}</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.value
                  ? 'bg-[#0B6B3A] text-white shadow-2xs'
                  : 'bg-white border border-border text-charcoal-dark hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-charcoal-dark'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Priority Filter & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as SupportTicketPriority | 'ALL')}
            className="h-9 px-3 rounded-xl border border-border text-xs bg-white font-semibold text-charcoal-dark focus:outline-none focus:border-[#0B6B3A]"
          >
            <option value="ALL">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tickets, user, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
            />
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left List vs Right Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border rounded-2xl bg-white space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#0B6B3A] mx-auto opacity-70" />
              <h4 className="text-xs font-bold text-black">Inbox Zero</h4>
              <p className="text-[11px] text-charcoal-muted">No tickets matching the current filter.</p>
            </Card>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              return (
                <Card
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'border-[#0B6B3A] bg-emerald-50/20 ring-2 ring-[#0B6B3A]/20'
                      : 'border-border bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <SupportTypeBadge type={t.type} size="sm" />
                      <SupportStatusBadge status={t.status} size="sm" />
                    </div>

                    <h4 className="text-xs font-bold text-black truncate">{t.subject}</h4>

                    <div className="flex items-center justify-between text-[11px] text-charcoal-muted pt-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <UserAvatar src={t.user?.avatar_url} name={t.user?.full_name || 'User'} size="sm" />
                        <span className="truncate">{t.user?.full_name || 'Contributor'}</span>
                      </div>

                      <span>{new Date(t.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Right: Active Ticket Detail & Conversation */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <Card className="rounded-3xl border border-border bg-white shadow-xs overflow-hidden flex flex-col">
              {/* Ticket Top Action Bar */}
              <div className="p-5 border-b border-border bg-gray-50/70 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SupportTypeBadge type={selectedTicket.type} size="sm" />
                      <SupportStatusBadge status={selectedTicket.status} size="sm" />
                      {selectedTicket.priority === 'urgent' && (
                        <SupportPriorityBadge priority="urgent" size="sm" />
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base font-heading font-extrabold text-black">
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as SupportTicketStatus)}
                    className="h-8 px-2.5 rounded-xl border border-border bg-white text-xs font-bold text-charcoal-dark focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="open">Status: Open</option>
                    <option value="under_review">Status: Under Review</option>
                    <option value="waiting_for_contributor">Status: Waiting on User</option>
                    <option value="resolved">Status: Resolved</option>
                    <option value="closed">Status: Closed</option>
                  </select>
                </div>

                {/* Contributor & Object Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      src={selectedTicket.user?.avatar_url}
                      name={selectedTicket.user?.full_name || 'User'}
                      size="sm"
                    />
                    <div>
                      <p className="font-bold text-black">{selectedTicket.user?.full_name || 'Contributor'}</p>
                      <p className="text-[10px] text-charcoal-muted capitalize">
                        Role: {selectedTicket.user?.role || 'Contributor'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedTicket.assigned_admin_id ? (
                      <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                        Assigned
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleAssignToMe} className="text-xs">
                        Assign to Me
                      </Button>
                    )}
                  </div>
                </div>

                {/* Related Memory Link */}
                {selectedTicket.related_memory && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs flex items-center justify-between text-[#0B6B3A]">
                    <span>Target Memory: <strong>{selectedTicket.related_memory.title}</strong></span>
                    <a
                      href={`/memory/${selectedTicket.related_memory.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold flex items-center gap-1 hover:underline text-[11px]"
                    >
                      <span>Open Pin</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Conversation Area */}
              <div className="p-5 max-h-[420px] overflow-y-auto space-y-4 bg-gray-50/30">
                {messagesLoading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0B6B3A] mx-auto" />
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.is_internal || msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-2xl p-4 space-y-1.5 shadow-2xs border ${
                          msg.is_internal
                            ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                            : isStaff
                            ? 'bg-white border-border text-black'
                            : 'bg-emerald-50/60 border-emerald-100 text-emerald-950'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] opacity-80">
                          <span className="font-bold flex items-center gap-1.5">
                            {msg.is_internal ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-700" />
                                <span className="text-amber-800">Staff Internal Note</span>
                              </>
                            ) : (
                              <span>{msg.sender?.full_name || 'User'}</span>
                            )}
                          </span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <p className="text-xs whitespace-pre-line leading-relaxed font-body">
                          {msg.message}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Action Error */}
              {actionError && (
                <p className="p-3 bg-red-50 text-red-700 text-xs font-medium border-t border-red-200">
                  {actionError}
                </p>
              )}

              {/* Admin Reply & Internal Note Composer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        !isInternalNote ? 'bg-white text-[#0B6B3A] shadow-2xs' : 'text-charcoal-muted'
                      }`}
                    >
                      Reply to Contributor
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                        isInternalNote ? 'bg-amber-600 text-white shadow-2xs' : 'text-charcoal-muted'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Internal Note</span>
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsResolving(!isResolving)}
                    className="text-xs text-[#0B6B3A]"
                  >
                    Resolve Ticket
                  </Button>
                </div>

                {isResolving && (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 animate-fade-in">
                    <label className="block text-xs font-bold text-emerald-900">
                      Resolution Message for Contributor
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Memory location corrected and updated on the public map."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full p-2 text-xs rounded-xl border border-emerald-300 bg-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsResolving(false)} className="text-xs">
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus('resolved')}
                        className="bg-[#0B6B3A] text-white text-xs font-bold"
                      >
                        Confirm Resolution
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <textarea
                    rows={2}
                    placeholder={
                      isInternalNote
                        ? 'Add internal staff note (never visible to contributor)...'
                        : 'Reply to contributor (sends in-app notification)...'
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className={`flex-1 p-2.5 text-xs rounded-2xl border focus:outline-none resize-none ${
                      isInternalNote ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-border'
                    }`}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSending || !replyText.trim()}
                    className={`font-bold rounded-xl h-10 px-4 shrink-0 text-xs ${
                      isInternalNote ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-[#0B6B3A] text-white'
                    }`}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <span>{isInternalNote ? 'Save Note' : 'Send'}</span>
                        <Send className="w-3 h-3" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="p-16 text-center border border-border rounded-3xl bg-white space-y-2">
              <LifeBuoy className="w-10 h-10 text-charcoal-muted mx-auto opacity-40" />
              <h4 className="text-sm font-bold text-black">Select a Ticket</h4>
              <p className="text-xs text-charcoal-muted">Choose a support request on the left to view details and reply.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
