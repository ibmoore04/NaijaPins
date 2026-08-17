import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ContactSupportModal } from '@/components/support/ContactSupportModal';
import { FAQArticle, SupportTicketType } from '@/types/support';
import {
  LifeBuoy,
  Search,
  BookOpen,
  Shield,
  CreditCard,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const FAQ_ARTICLES: FAQArticle[] = [
  {
    id: 'create-memory',
    category: 'Memories & Pinning',
    title: 'How do I create and pin a heritage memory?',
    description: 'Learn how to use the Quick Memory Composer to share stories, photos, and locations.',
    content: `You can share a memory directly from the Community feed or by tapping "Add Memory" in the header.\n\n1. Type your memory in the story box (at least 30 characters).\n2. Tap "Tag Location" to specify the Nigerian town, LGA, state, or landmark.\n3. Optionally attach photos, historical video, or a 3-minute oral voice note.\n4. Select the historical Era / Year and Category (Family, Culture, Landmark, Food, School, etc.).\n5. Choose your visibility: "Community" (public on the map & feed) or "Only Me" (private archive).\n6. Tap "Post Memory".`,
    tags: ['pin', 'create', 'add memory', 'composer', 'story'],
  },
  {
    id: 'map-privacy',
    category: 'Privacy & Visibility',
    title: 'How does map privacy and Community visibility work?',
    description: 'Understanding Community pins vs. personal private memory archives.',
    content: `NaijaPins enforces strict database-level privacy:\n\n• **Community Posted (Public)**: When you post with "Community" visibility, your memory appears on the public interactive map, the social follower map, and the community feed for all Nigerian heritage discoverers.\n• **Only Me (Private)**: When you select "Only Me", your memory is strictly private to your personal dashboard and personal map. Other users and search engines can never see private memories.`,
    tags: ['privacy', 'community', 'only me', 'private', 'map'],
  },
  {
    id: 'voice-notes',
    category: 'Oral History & Media',
    title: 'How do voice notes and oral recordings work?',
    description: 'Preserve authentic Nigerian languages, accents, and spoken heritage.',
    content: `Oral history is central to Nigerian storytelling traditions.\n\n• Tap the microphone icon in the Quick Memory Composer to record up to 3 minutes of spoken memory.\n• You can listen to the preview, re-record if needed, and attach it to your pin.\n• Audio clips appear with a waveform badge on your pin and in the memory player.`,
    tags: ['voice', 'audio', 'microphone', 'oral history', 'recording'],
  },
  {
    id: 'premium-membership',
    category: 'Membership & Perks',
    title: 'What perks are included with NaijaPins Premium?',
    description: 'Submissions limit upgrades, verified badge, audio pins, and priority moderation.',
    content: `NaijaPins Premium offers advanced capabilities for dedicated heritage contributors:\n\n• **Submissions**: Up to 100 memories per month (Free tier is 10/mo).\n• **Photos**: Up to 10 photos per submission (Free tier is 3/mo).\n• **Voice Notes**: Unlimited audio oral recordings.\n• **Badge**: Golden verified badge on your profile and social markers.\n• **Priority**: Fast-track moderation review and priority support.`,
    tags: ['premium', 'subscription', 'membership', 'badge', 'limits'],
  },
  {
    id: 'reporting-content',
    category: 'Safety & Moderation',
    title: 'How do I report inappropriate content or false information?',
    description: 'Help keep Nigerian historical records authentic, safe, and respectful.',
    content: `If you see a memory, comment, or user violating community standards:\n\n1. Tap the three dots (⋯) on the memory, comment, or profile.\n2. Tap "Report".\n3. Select the reason (Inappropriate content, False history, Copyright, Wrong location, Harassment).\n4. Submit your report.\n\nOur team reviews all reports within 24 hours. You will receive an in-app notification and can track your report under "My Support Requests".`,
    tags: ['report', 'moderation', 'fake news', 'safety', 'inappropriate'],
  },
  {
    id: 'following-contributors',
    category: 'Social & Map',
    title: 'How do I follow contributors and explore the Social Map?',
    description: 'Connect with elders, historians, and storytellers across Nigeria.',
    content: `You can follow other contributors to see their latest heritage memories in your "Following" feed and directly on the Interactive Social Map.\n\n• Tap "Follow" on any contributor's profile or memory pin.\n• Open the Map at /explore and select the "Following" tab to see pins from people you follow.\n• Tap "View Pins" on any contributor's profile to isolate only their pins on the map.`,
    tags: ['follow', 'social', 'map', 'pins', 'contributors'],
  },
];

export const HelpCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<FAQArticle | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactType, setContactType] = useState<SupportTicketType>('general');

  const filteredArticles = FAQ_ARTICLES.filter((art) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      art.title.toLowerCase().includes(q) ||
      art.description.toLowerCase().includes(q) ||
      art.category.toLowerCase().includes(q) ||
      art.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleOpenContactWithCategory = (type: SupportTicketType) => {
    setContactType(type);
    setContactModalOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in font-body">
      {/* Hero Banner with Search */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0B6B3A] via-[#064D2A] to-black text-white p-6 sm:p-10 shadow-lg text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center mx-auto shadow-inner">
          <LifeBuoy className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-heading font-extrabold tracking-tight">
            NaijaPins Help & Support
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Search our guides or connect directly with our support team to get answers, report issues, and resolve requests.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative">
          <Search className="w-5 h-5 text-charcoal-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guides, topics (e.g. privacy, audio pins, premium)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white text-black text-xs sm:text-sm focus:outline-none focus:ring-4 focus:ring-emerald-400/30 shadow-md font-medium"
          />
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleOpenContactWithCategory('bug')}
          className="p-4 rounded-2xl bg-white border border-border/80 hover:border-[#0B6B3A] hover:bg-emerald-50/30 transition-all text-left shadow-2xs group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-black">Report a Problem</h3>
            <p className="text-[11px] text-charcoal-muted mt-0.5">Bug, upload glitch, or map issue</p>
          </div>
        </button>

        <button
          onClick={() => handleOpenContactWithCategory('membership')}
          className="p-4 rounded-2xl bg-white border border-border/80 hover:border-[#0B6B3A] hover:bg-emerald-50/30 transition-all text-left shadow-2xs group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-black">Membership & Billing</h3>
            <p className="text-[11px] text-charcoal-muted mt-0.5">Premium perks, limits & receipts</p>
          </div>
        </button>

        <button
          onClick={() => handleOpenContactWithCategory('account')}
          className="p-4 rounded-2xl bg-white border border-border/80 hover:border-[#0B6B3A] hover:bg-emerald-50/30 transition-all text-left shadow-2xs group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-black">Account & Privacy</h3>
            <p className="text-[11px] text-charcoal-muted mt-0.5">Login, settings, or credentials</p>
          </div>
        </button>

        <button
          onClick={() => handleOpenContactWithCategory('feature_request')}
          className="p-4 rounded-2xl bg-white border border-border/80 hover:border-[#0B6B3A] hover:bg-emerald-50/30 transition-all text-left shadow-2xs group flex flex-col justify-between space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-black">Suggest a Feature</h3>
            <p className="text-[11px] text-charcoal-muted mt-0.5">Share ideas to improve NaijaPins</p>
          </div>
        </button>
      </div>

      {/* Main Support Center Split: Articles vs My Requests Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Knowledge Base Articles */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base sm:text-lg font-heading font-extrabold text-black flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#0B6B3A]" />
              <span>Help Articles & Guides</span>
            </h2>
            <span className="text-xs text-charcoal-muted font-semibold">
              {filteredArticles.length} articles
            </span>
          </div>

          <div className="space-y-3">
            {filteredArticles.map((art) => (
              <Card
                key={art.id}
                onClick={() => setSelectedArticle(selectedArticle?.id === art.id ? null : art)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  selectedArticle?.id === art.id
                    ? 'border-[#0B6B3A] bg-emerald-50/20 ring-2 ring-[#0B6B3A]/20'
                    : 'border-border bg-white hover:border-[#0B6B3A]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-charcoal-dark text-[10px] font-bold uppercase tracking-wider">
                      {art.category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-black pt-1">
                      {art.title}
                    </h3>
                    <p className="text-xs text-charcoal-muted leading-relaxed">
                      {art.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-charcoal-muted shrink-0 transition-transform ${
                      selectedArticle?.id === art.id ? 'rotate-90 text-[#0B6B3A]' : ''
                    }`}
                  />
                </div>

                {/* Expanded Article Body */}
                {selectedArticle?.id === art.id && (
                  <div className="mt-4 pt-4 border-t border-border/80 text-xs sm:text-sm text-charcoal-dark whitespace-pre-line leading-relaxed bg-white p-4 rounded-xl border border-border/50 animate-fade-in font-body">
                    {art.content}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Contributor Support Hub */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 rounded-3xl border border-border bg-white space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center font-bold">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-black">Contributor Helpdesk</h3>
                <p className="text-xs text-charcoal-muted">Need human assistance?</p>
              </div>
            </div>

            <p className="text-xs text-charcoal-dark leading-relaxed">
              Our support and moderation team is dedicated to preserving Nigeria's history and ensuring a safe, authentic community.
            </p>

            <div className="space-y-2 pt-2 border-t border-border">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setContactType('general');
                  setContactModalOpen(true);
                }}
                className="w-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold text-xs justify-center"
              >
                Contact Support
              </Button>

              {user && (
                <Link to="/help/requests" className="block">
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full text-xs font-semibold justify-center text-charcoal-dark hover:text-[#0B6B3A]"
                  >
                    View My Support Requests
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Contact Support Modal */}
      <ContactSupportModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        initialType={contactType}
      />
    </div>
  );
};
