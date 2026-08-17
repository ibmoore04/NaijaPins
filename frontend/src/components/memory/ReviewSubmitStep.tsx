import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LocationData } from './LocationPickerStep';
import { StoryFormData } from './StoryFormStep';
import { MediaFileItem } from './MediaUploadStep';
import { Category } from '@/types/database';
import { memoriesService } from '@/services/memories.service';
import { PublishConfirmationModal } from './PublishConfirmationModal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  MapPin,
  BookOpen,
  Image as ImageIcon,
  Volume2,
  ArrowLeft,
  Send,
  CheckCircle2,
  Sparkles,
  Lock,
  Compass,
  Loader2,
} from 'lucide-react';

interface ReviewSubmitStepProps {
  location: LocationData;
  story: StoryFormData;
  media: MediaFileItem[];
  categories: Category[];
  onBack: () => void;
}

export const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({
  location,
  story,
  media,
  categories,
  onBack,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Final view state
  const [submissionResult, setSubmissionResult] = useState<{
    slug: string;
    communityPosted: boolean;
  } | null>(null);

  const categoryName = categories.find((c) => c.id === story.category_id)?.name || 'General';

  // Handle open confirmation dialog
  const handleOpenConfirm = () => {
    if (!user) {
      setErrorMsg('You must be signed in to save a memory.');
      return;
    }
    setErrorMsg(null);
    setConfirmModalOpen(true);
  };

  // Perform memory creation with chosen community_posted status
  const handleSaveMemory = async (communityPosted: boolean) => {
    if (!user) return;

    setSubmitting(true);
    setErrorMsg(null);

    const result = await memoriesService.createMemory({
      userId: user.id,
      location,
      story,
      media,
      community_posted: communityPosted,
      status: 'pending_review',
    });

    if (result.success && result.slug) {
      setConfirmModalOpen(false);
      setSubmissionResult({
        slug: result.slug,
        communityPosted,
      });
    } else {
      setErrorMsg(result.error || 'Failed to save memory.');
      setConfirmModalOpen(false);
    }

    setSubmitting(false);
  };

  // Final Success View
  if (submissionResult) {
    const isPosted = submissionResult.communityPosted;

    return (
      <div className="text-center py-12 space-y-6 animate-fade-in">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${
            isPosted ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {isPosted ? <CheckCircle2 className="w-10 h-10" /> : <Lock className="w-9 h-9" />}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-extrabold text-black">
            {isPosted ? 'Submitted to Community!' : 'Memory Saved to My Memories!'}
          </h2>
          <p className="text-base text-charcoal-dark max-w-lg mx-auto leading-relaxed">
            {isPosted
              ? `Your memory "${story.title}" has been submitted and marked for community posting. Once approved by moderators, it will automatically appear in the Community Feed and Interactive Map.`
              : `Your memory "${story.title}" has been saved to your memories archive. It will remain private and will not appear in the Community feed.`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/dashboard/memories')}
            leftIcon={<BookOpen className="w-5 h-5" />}
            className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-2xl"
          >
            Go to My Memories
          </Button>

          {isPosted && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/community')}
              leftIcon={<Compass className="w-5 h-5 text-[#0B6B3A]" />}
              className="rounded-2xl"
            >
              View Community Feed
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            leftIcon={<Sparkles className="w-5 h-5" />}
            className="rounded-2xl"
          >
            Pin Another Story
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-heading font-bold text-black flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span>Step 4: Final Review</span>
        </h2>
        <p className="text-sm text-charcoal-dark">
          Review your story details before choosing how to save your memory pin.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      {/* Summary Card */}
      <Card className="shadow-xs border-2 border-primary/20 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Badge variant="primary">{categoryName}</Badge>
              <Badge variant="default" className="bg-black text-white border-0">
                {story.year} Era
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {location.city}, {location.state}
              </span>
            </div>
          </div>

          {/* Title & Story */}
          <div className="space-y-3">
            <h3 className="text-xl font-heading font-bold text-black">{story.title}</h3>
            <p className="text-sm text-charcoal-dark whitespace-pre-line leading-relaxed">
              {story.story}
            </p>
          </div>

          {/* Attached Media Summary */}
          {media.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-xs font-bold text-charcoal-dark uppercase tracking-wider">
                Attached Media ({media.length} items)
              </p>
              <div className="flex flex-wrap gap-2">
                {media.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-medium text-charcoal-dark"
                  >
                    {item.type === 'image' ? (
                      <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{item.file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Details */}
          <div className="pt-4 border-t border-border text-xs text-charcoal-muted space-y-1">
            <p>
              <strong>Address:</strong> {location.formatted_address}
            </p>
            <p>
              <strong>Coordinates:</strong> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={submitting}
          leftIcon={<ArrowLeft className="w-5 h-5" />}
          className="rounded-2xl"
        >
          Back
        </Button>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleOpenConfirm}
          disabled={submitting}
          rightIcon={
            submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )
          }
          className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-2xl"
        >
          {submitting ? 'Saving...' : 'Continue'}
        </Button>
      </div>

      {/* Confirmation Modal */}
      <PublishConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onPostToCommunity={() => handleSaveMemory(true)}
        onSaveToMyMemories={() => handleSaveMemory(false)}
        isSubmitting={submitting}
        memoryTitle={story.title}
      />
    </div>
  );
};
