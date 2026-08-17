import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { storageService } from '@/services/storage.service';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Camera, Trash2, Check, AlertTriangle, Loader2 } from 'lucide-react';

export const DashboardProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await storageService.uploadAvatar(user.id, file);
    if (result.success) {
      await refreshProfile();
      setSuccessMsg('Profile photo updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(result.error || 'Failed to upload image.');
    }
    setUploadingAvatar(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    setUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await storageService.removeAvatar(user.id);
    if (result.success) {
      await refreshProfile();
      setSuccessMsg('Profile photo removed.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(result.error || 'Failed to remove photo.');
    }
    setUploadingAvatar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (bio && bio.length > 500) {
      setErrorMsg('Bio must not exceed 500 characters.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim(),
      })
      .eq('user_id', user.id);

    if (!error) {
      await refreshProfile();
      setSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg('Failed to update profile: ' + error.message);
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Contributor Profile</h1>
        <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
          Update your public profile display photo, name, and heritage bio.
        </p>
      </div>

      <Card className="border border-border bg-white p-6 shadow-sm">
        <CardContent className="p-0 space-y-6">
          {/* Avatar Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-border pb-6">
            <div className="relative group">
              <UserAvatar
                src={profile?.avatar_url}
                name={profile?.full_name}
                size="xl"
                className="border-2 border-[#0B6B3A]/30 shadow-md"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-black">{profile?.full_name || 'Contributor'}</h3>
                <Badge variant="primary" size="sm" className="capitalize">
                  {profile?.role?.replace('_', ' ') || 'Contributor'}
                </Badge>
              </div>

              <p className="text-xs text-charcoal-muted font-medium">
                Upload a JPG, PNG, or WebP photo smaller than 5 MB.
              </p>

              {/* Upload Controls */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={uploadingAvatar}
                  leftIcon={<Camera className="w-4 h-4 text-[#0B6B3A]" />}
                >
                  Change photo
                </Button>

                {profile?.avatar_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    leftIcon={<Trash2 className="w-4 h-4 text-red-600" />}
                    className="text-red-700 border-red-200 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Profile Name & Bio Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-dark mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-charcoal-dark">Bio</label>
                <span className="text-[11px] text-charcoal-muted">{bio.length}/500</span>
              </div>
              <textarea
                rows={4}
                placeholder="Share a short bio about your personal history or roots in Nigeria..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="md" isLoading={saving} leftIcon={<Check className="w-4 h-4" />}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
