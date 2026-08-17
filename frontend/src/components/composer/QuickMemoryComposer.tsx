import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/context/MembershipContext';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';
import { LocationData } from '@/components/memory/LocationPickerStep';
import { MediaFileItem } from '@/components/memory/MediaUploadStep';
import { memoriesService } from '@/services/memories.service';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { LocationPickerModal } from './LocationPickerModal';
import { VoiceRecorderModal } from './VoiceRecorderModal';
import {
  MapPin,
  Image as ImageIcon,
  Mic,
  Calendar,
  Tag,
  Globe,
  Lock,
  X,
  Loader2,
  Check,
  Volume2,
  Trash2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

const DRAFT_STORAGE_KEY = 'naijapins_quick_composer_draft';

// Nigerian eras / years range
const AVAILABLE_YEARS = Array.from({ length: 77 }, (_, i) => 2026 - i); // 2026 down to 1950

interface QuickMemoryComposerProps {
  onPostSuccess?: (slug: string) => void;
  className?: string;
  placeholder?: string;
  defaultVisibility?: 'community' | 'private';
  initialLocation?: LocationData | null;
  autoFocus?: boolean;
}

export const QuickMemoryComposer: React.FC<QuickMemoryComposerProps> = ({
  onPostSuccess,
  className = '',
  placeholder = 'Share a Nigerian memory, oral story, historical moment, or landmark...',
  defaultVisibility = 'community',
  initialLocation = null,
  autoFocus = false,
}) => {
  const { user, profile } = useAuth();
  const { maxPhotosPerMemory = 3 } = useMembership();
  const navigate = useNavigate();

  // Core Composer Form State
  const [story, setStory] = useState('');
  const [visibility, setVisibility] = useState<'community' | 'private'>(defaultVisibility);
  const [selectedYear, setSelectedYear] = useState<number>(1985);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Attachments State
  const [locationData, setLocationData] = useState<LocationData | null>(
    initialLocation || {
      state: 'Lagos',
      lga: 'Ikeja',
      city: 'Lagos',
      neighborhood: '',
      formatted_address: 'Lagos, Nigeria',
      latitude: 6.5244,
      longitude: 3.3792,
    }
  );
  const [mediaFiles, setMediaFiles] = useState<MediaFileItem[]>([]);
  const [audioFileItem, setAudioFileItem] = useState<MediaFileItem | null>(null);

  // Modals & Popovers State
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // 1. Fetch real active categories from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        setCategoriesLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        if (data && data.length > 0 && isMounted) {
          const activeCats = data as Category[];
          setCategories(activeCats);
          setSelectedCategoryId((prevId) => {
            // Check if existing ID is valid and in active list (and not a mock c0000000 UUID)
            const exists = activeCats.some((c) => c.id === prevId && !c.id.startsWith('c0000000'));
            return exists ? prevId : activeCats[0].id;
          });
        }
      } catch (err) {
        console.error('Error loading Supabase categories:', err);
      } finally {
        if (isMounted) setCategoriesLoading(false);
      }
    };
    fetchCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.story && parsed.story.trim().length > 0) {
          setStory(parsed.story);
          if (parsed.year) setSelectedYear(parsed.year);
          // Only restore categoryId if not a hardcoded mock ID
          if (parsed.categoryId && !parsed.categoryId.startsWith('c0000000')) {
            setSelectedCategoryId(parsed.categoryId);
          }
          if (parsed.visibility) setVisibility(parsed.visibility);
          if (parsed.location) setLocationData(parsed.location);
          setHasRestoredDraft(true);
        }
      }
    } catch {}
  }, []);

  // 3. Save draft to localStorage as user types
  useEffect(() => {
    if (story.trim().length > 0) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            story,
            year: selectedYear,
            categoryId: selectedCategoryId,
            visibility,
            location: locationData,
          })
        );
      } catch {}
    }
  }, [story, selectedYear, selectedCategoryId, visibility, locationData]);

  // Handle outside clicks to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDiscardDraft = () => {
    setStory('');
    setMediaFiles([]);
    setAudioFileItem(null);
    setHasRestoredDraft(false);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
  };

  // Handle Photo & Video Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSubmitError(null);

    const currentCount = mediaFiles.length;
    if (currentCount + files.length > maxPhotosPerMemory) {
      setSubmitError(`You can attach up to ${maxPhotosPerMemory} media files per memory.`);
      return;
    }

    const newItems: MediaFileItem[] = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        setSubmitError(`File "${file.name}" exceeds maximum 20MB limit.`);
        continue;
      }
      newItems.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: 'image',
      });
    }

    setMediaFiles((prev) => [...prev, ...newItems]);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    const item = mediaFiles[index];
    if (item && item.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {}
    }
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveVoiceAudio = (file: File, previewUrl: string) => {
    setAudioFileItem({
      file,
      previewUrl,
      type: 'audio',
    });
  };

  const handleRemoveAudio = () => {
    if (audioFileItem?.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(audioFileItem.previewUrl);
      } catch {}
    }
    setAudioFileItem(null);
  };

  // Helper to generate a meaningful title if none provided
  const generateTitleFromStory = (text: string): string => {
    const clean = text.replace(/[\n\r]+/g, ' ').trim();
    if (clean.length >= 5) {
      if (clean.length <= 60) return clean;
      const substr = clean.substring(0, 60);
      const lastSpace = substr.lastIndexOf(' ');
      if (lastSpace > 20) {
        return substr.substring(0, lastSpace) + '...';
      }
      return substr + '...';
    }
    const city = locationData?.city || 'Nigeria';
    const state = locationData?.state || 'Heritage';
    return `Memory from ${city}, ${state} (${selectedYear})`;
  };

  const trimmedStory = story.trim();

  // Submit and Post Memory
  const handlePostMemory = async () => {
    if (!user) {
      setSubmitError('Please sign in to publish your memory story.');
      return;
    }

    if (trimmedStory.length === 0) {
      setSubmitError('Please write your memory story before posting.');
      return;
    }

    if (trimmedStory.length < 30) {
      setSubmitError(
        `Your memory is too short (${trimmedStory.length}/30 characters). Please add a little more detail about what happened.`
      );
      return;
    }

    if (!locationData || !locationData.state || !locationData.city) {
      setSubmitError('Please add or confirm the location where this memory occurred.');
      return;
    }

    if (!selectedCategoryId) {
      setSubmitError('Please select a category for this memory.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const generatedTitle = generateTitleFromStory(trimmedStory);
    const isCommunity = visibility === 'community';

    // Combine media items (photos + audio)
    const combinedMedia: MediaFileItem[] = [...mediaFiles];
    if (audioFileItem) {
      combinedMedia.push(audioFileItem);
    }

    const res = await memoriesService.createMemory({
      userId: user.id,
      location: locationData,
      story: {
        title: generatedTitle,
        category_id: selectedCategoryId,
        date_type: 'EXACT_YEAR',
        year: selectedYear,
        story: trimmedStory,
      },
      media: combinedMedia,
      community_posted: isCommunity,
      status: 'published',
    });

    if (res.success && res.slug) {
      // Clear draft & reset form
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      setStory('');
      setMediaFiles([]);
      setAudioFileItem(null);
      setSuccessToast(true);
      setIsSubmitting(false);

      setTimeout(() => {
        setSuccessToast(false);
        if (onPostSuccess) {
          onPostSuccess(res.slug!);
        } else {
          navigate(`/memory/${res.slug}`);
        }
      }, 1200);
    } else {
      setIsSubmitting(false);
      setSubmitError(res.error || 'Failed to post memory. Please try again.');
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];
  const canSubmit = trimmedStory.length >= 30 && locationData !== null && !isSubmitting;

  return (
    <div className={`bg-white border border-border/90 rounded-3xl shadow-xs relative transition-all ${className}`}>
      {/* Draft Restored Banner */}
      {hasRestoredDraft && (
        <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 rounded-t-3xl flex items-center justify-between text-xs text-emerald-800 font-semibold animate-fade-in">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0B6B3A]" />
            <span>Unsaved draft restored</span>
          </div>
          <button
            onClick={handleDiscardDraft}
            className="text-emerald-700 hover:text-red-600 hover:underline transition-colors"
          >
            Discard
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successToast && (
        <div className="px-4 py-3 bg-[#E8F5EE] border-b border-[#A3D9BC] rounded-t-3xl flex items-center gap-2 text-xs font-bold text-[#0B6B3A] animate-fade-in">
          <Check className="w-4 h-4 text-[#0B6B3A]" />
          <span>Memory posted successfully! Redirecting... 📍</span>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Top Bar: User Avatar, Contributor Name & Visibility Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.full_name || 'Contributor'}
              size="md"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-black truncate block">
                {profile?.full_name || 'Contributor'}
              </span>
              <span className="text-[11px] text-charcoal-muted capitalize">
                {profile?.role?.replace('_', ' ') || 'Contributor'}
              </span>
            </div>
          </div>

          {/* Privacy / Visibility Toggle */}
          <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-full border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => setVisibility('community')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                visibility === 'community'
                  ? 'bg-white text-[#0B6B3A] shadow-xs'
                  : 'text-charcoal-muted hover:text-black'
              }`}
              title="Post to public Community Feed and interactive Map"
            >
              <Globe className="w-3 h-3" />
              <span>Community</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                visibility === 'private'
                  ? 'bg-white text-charcoal-dark shadow-xs'
                  : 'text-charcoal-muted hover:text-black'
              }`}
              title="Private memory saved to your personal dashboard only"
            >
              <Lock className="w-3 h-3" />
              <span>Only Me</span>
            </button>
          </div>
        </div>

        {/* Story Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={4}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full p-2 bg-transparent text-charcoal-dark text-sm sm:text-base leading-relaxed placeholder:text-charcoal-muted focus:outline-none resize-none border-0 font-body"
          />
        </div>

        {/* Selected Attachments Chips (Location, Year, Category, Voice) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
          {/* Location Chip */}
          {locationData ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8F5EE] border border-[#A3D9BC]/60 text-xs font-semibold text-[#0B6B3A]">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0B6B3A]" />
              <span className="truncate max-w-[180px]">
                {locationData.city}, {locationData.state}
              </span>
              <button
                type="button"
                onClick={() => setLocationData(null)}
                className="p-0.5 hover:bg-[#d0ebd9] rounded-full transition-colors ml-0.5"
                title="Remove location"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>+ Tag Location</span>
            </button>
          )}

          {/* Year Badge Chip */}
          <div className="relative" ref={yearRef}>
            <button
              type="button"
              onClick={() => {
                setYearDropdownOpen(!yearDropdownOpen);
                setCategoryDropdownOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 border border-border/80 text-xs font-semibold text-charcoal-dark transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-charcoal-muted" />
              <span>{selectedYear} Era</span>
              <ChevronDown className="w-3 h-3 text-charcoal-muted" />
            </button>

            {yearDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-40 max-h-56 overflow-y-auto bg-white border border-border/90 rounded-2xl shadow-2xl p-1.5 z-50 animate-scale-up no-scrollbar">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-charcoal-muted border-b border-border/40 mb-1">
                  Select Era / Year
                </div>
                {AVAILABLE_YEARS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setSelectedYear(y);
                      setYearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl font-semibold transition-colors flex items-center justify-between ${
                      selectedYear === y ? 'bg-[#0B6B3A] text-white' : 'hover:bg-gray-100 text-charcoal-dark'
                    }`}
                  >
                    <span>{y} Era</span>
                    {selectedYear === y && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Badge Chip */}
          <div className="relative" ref={categoryRef}>
            <button
              type="button"
              onClick={() => {
                setCategoryDropdownOpen(!categoryDropdownOpen);
                setYearDropdownOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 border border-border/80 text-xs font-semibold text-charcoal-dark transition-colors"
            >
              <Tag className="w-3.5 h-3.5 text-charcoal-muted" />
              <span>{selectedCategory?.name || (categoriesLoading ? 'Category...' : 'Select Category')}</span>
              <ChevronDown className="w-3 h-3 text-charcoal-muted" />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-52 max-h-60 overflow-y-auto bg-white border border-border/90 rounded-2xl shadow-2xl p-1.5 z-50 animate-scale-up no-scrollbar">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-charcoal-muted border-b border-border/40 mb-1">
                  Select Category
                </div>
                {categories.length === 0 ? (
                  <div className="p-3 text-center text-xs text-charcoal-muted">
                    {categoriesLoading ? 'Loading categories...' : 'No categories found'}
                  </div>
                ) : (
                  categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(c.id);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl font-semibold transition-colors flex items-center justify-between ${
                        selectedCategoryId === c.id ? 'bg-[#0B6B3A] text-white' : 'hover:bg-gray-100 text-charcoal-dark'
                      }`}
                    >
                      <span>{c.name}</span>
                      {selectedCategoryId === c.id && <Check className="w-3 h-3" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Attached Voice Note Chip */}
          {audioFileItem && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Voice Note</span>
              <button
                type="button"
                onClick={handleRemoveAudio}
                className="p-0.5 hover:bg-amber-100 rounded-full transition-colors ml-0.5"
                title="Remove audio"
              >
                <X className="w-3 h-3 text-amber-700" />
              </button>
            </div>
          )}
        </div>

        {/* Media Thumbnail Previews */}
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
            {mediaFiles.map((m, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl overflow-hidden border border-border bg-gray-100 aspect-video group shadow-2xs"
              >
                <img src={m.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-90"
                  title="Remove photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
            {submitError}
          </p>
        )}

        {/* Bottom Toolbar & Post Button */}
        <div className="flex items-center justify-between pt-3 border-t border-border/80 gap-3">
          {/* Quick Action Icon Buttons */}
          <div className="flex items-center gap-1">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {/* Photos Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-[#0B6B3A] hover:bg-[#E8F5EE] transition-colors"
              title="Add Photos"
              aria-label="Add Photos"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Voice Recorder Button */}
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              className="p-2 rounded-full text-amber-600 hover:bg-amber-50 transition-colors"
              title="Record Voice Note"
              aria-label="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Location Tag Button */}
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="p-2 rounded-full text-blue-600 hover:bg-blue-50 transition-colors"
              title="Change or Tag Location"
              aria-label="Change or Tag Location"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          {/* Right Action: Character Count & Post Memory Button */}
          <div className="flex items-center gap-3">
            <span
              className={`text-[11px] font-medium transition-colors ${
                trimmedStory.length === 0
                  ? 'text-charcoal-muted'
                  : trimmedStory.length < 30
                  ? 'text-amber-600 font-semibold'
                  : 'text-[#0B6B3A] font-semibold'
              }`}
            >
              {trimmedStory.length === 0
                ? 'Min 30 chars'
                : trimmedStory.length < 30
                ? `${trimmedStory.length}/30 chars`
                : `${trimmedStory.length} chars`}
            </span>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!canSubmit}
              onClick={handlePostMemory}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-full px-5 h-9 text-xs shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting...</span>
                </span>
              ) : (
                <span>Post Memory</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={locationData}
        onSelectLocation={(loc) => setLocationData(loc)}
      />

      {/* Voice Note Recorder Modal */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSaveAudio={handleSaveVoiceAudio}
      />
    </div>
  );
};
