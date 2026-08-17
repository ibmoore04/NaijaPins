import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Memory } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { LayoutDashboard, Bookmark, Activity, Settings, User, MapPin, Check, Loader2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'memories' | 'saved' | 'activity' | 'settings'>('memories');
  
  const [userMemories, setUserMemories] = useState<Memory[]>([]);
  const [savedMemories, setSavedMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Fetch User Pinned Memories
      const { data: mems } = await supabase
        .from('memories')
        .select('*, location:locations(*), category:categories(*)')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (mems) {
        setUserMemories(mems as Memory[]);
      }

      // Fetch Saved Memories (or fallback to top published memories for demo)
      const { data: saved } = await supabase
        .from('memories')
        .select('*, location:locations(*), category:categories(*)')
        .eq('is_deleted', false)
        .limit(4);

      if (saved) {
        setSavedMemories(saved as Memory[]);
      }

      setLoading(false);
    };

    loadDashboardData();
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingSettings(true);
    setSaveSuccess(false);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, bio })
      .eq('user_id', user.id);

    if (!error) {
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert('Failed to update settings: ' + error.message);
    }
    setSavingSettings(false);
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-black">Sign In Required</h2>
        <p className="text-sm text-charcoal-dark">Please log in to access your personal dashboard.</p>
        <Link to="/explore">
          <Button variant="primary">Return to Explore</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-charcoal-dark">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      
      {/* Dashboard Top Banner */}
      <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#0B6B3A] text-white text-2xl font-extrabold flex items-center justify-center shadow-md">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-black tracking-tight">{profile?.full_name || 'Contributor'}</h1>
              <Badge variant="primary" size="sm" className="capitalize">
                {profile?.role?.replace('_', ' ') || 'Contributor'}
              </Badge>
            </div>
            <p className="text-xs text-charcoal-muted font-normal mt-0.5">
              {profile?.bio || 'Preserving Nigerian digital heritage stories.'}
            </p>
          </div>
        </div>

        <Link to="/add-memory">
          <Button variant="primary" size="sm" className="font-semibold">
            + Pin New Memory
          </Button>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('memories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
            activeTab === 'memories' ? 'bg-[#0B6B3A] text-white' : 'text-charcoal-dark hover:bg-gray-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>My Memories ({userMemories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
            activeTab === 'saved' ? 'bg-[#0B6B3A] text-white' : 'text-charcoal-dark hover:bg-gray-100'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Pins ({savedMemories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
            activeTab === 'activity' ? 'bg-[#0B6B3A] text-white' : 'text-charcoal-dark hover:bg-gray-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Recent Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
            activeTab === 'settings' ? 'bg-[#0B6B3A] text-white' : 'text-charcoal-dark hover:bg-gray-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Account Settings</span>
        </button>
      </div>

      {/* Tab 1: My Memories */}
      {activeTab === 'memories' && (
        <div className="space-y-4">
          {userMemories.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border border-border rounded-xl space-y-2">
              <p className="text-sm font-semibold text-charcoal-dark">No memories pinned yet.</p>
              <Link to="/add-memory">
                <Button variant="primary" size="sm" className="mt-2 font-semibold">
                  Pin Your First Memory
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userMemories.map((mem) => (
                <Card key={mem.id} className="p-5 border border-border bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="primary" size="sm">{mem.category?.name || 'Heritage'}</Badge>
                      <span className="text-xs font-semibold text-black">{mem.year} Era</span>
                    </div>

                    <h3 className="text-base font-semibold text-black line-clamp-1">
                      <Link to={`/memory/${mem.slug}`} className="hover:text-primary transition-colors">
                        {mem.title}
                      </Link>
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>{mem.location?.city}, {mem.location?.state}</span>
                    </div>

                    <p className="text-xs text-charcoal-dark line-clamp-2 leading-relaxed">
                      {mem.story}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Saved Pins */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedMemories.map((mem) => (
            <Card key={mem.id} className="p-5 border border-border bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" size="sm">{mem.category?.name || 'Heritage'}</Badge>
                  <span className="text-xs font-semibold text-black">{mem.year} Era</span>
                </div>
                <h3 className="text-base font-semibold text-black line-clamp-1">
                  <Link to={`/memory/${mem.slug}`} className="hover:text-primary transition-colors">
                    {mem.title}
                  </Link>
                </h3>
                <p className="text-xs text-charcoal-dark line-clamp-2 leading-relaxed">{mem.story}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 3: Activity */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-black">Community Activity Log</h3>
          <div className="space-y-3 text-xs text-charcoal-dark">
            <div className="p-3 bg-gray-50 rounded-lg border border-border flex items-center justify-between">
              <span>Pinned story: "The Old CMS Grammar School"</span>
              <span className="text-charcoal-muted">Recently</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-border flex items-center justify-between">
              <span>Account created & profile activated</span>
              <span className="text-charcoal-muted">Member since 2026</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Account Settings */}
      {activeTab === 'settings' && (
        <Card className="p-6 border border-border bg-white max-w-2xl">
          <CardContent className="p-0 space-y-5">
            <h3 className="text-lg font-bold text-black flex items-center gap-2">
              <User className="w-5 h-5 text-[#0B6B3A]" />
              <span>Profile & Account Settings</span>
            </h3>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Your profile settings have been saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-dark mb-1">Bio</label>
                <textarea
                  rows={4}
                  placeholder="Share a short bio about your personal history or roots in Nigeria..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" size="md" isLoading={savingSettings}>
                  Save Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
