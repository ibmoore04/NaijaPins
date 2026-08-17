import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CommentItem } from '@/components/social/CommentItem';
import { ReportModal } from '@/components/memory/ReportModal';
import { SignInPromptModal } from '@/components/social/SignInPromptModal';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { MemoryComment } from '@/types/social';
import { commentService } from '@/services/comment.service';
import { useAuth } from '@/hooks/useAuth';

interface CommentSectionProps {
  memoryId: string;
  memoryAuthorId?: string;
  memoryTitle?: string;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  memoryId,
  memoryAuthorId,
  memoryTitle,
  className = '',
}) => {
  const { user, profile } = useAuth();

  const [comments, setComments] = useState<MemoryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);

  useEffect(() => {
    const loadComments = async () => {
      setLoading(true);
      const data = await commentService.getMemoryComments(memoryId, user?.id);
      setComments(data);
      setLoading(false);
    };

    loadComments();
  }, [memoryId, user?.id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setSignInPromptOpen(true);
      return;
    }

    if (!newCommentText.trim()) return;

    setSubmitting(true);
    const result = await commentService.addComment({
      memoryId,
      userId: user.id,
      content: newCommentText.trim(),
      memoryAuthorId,
      memoryTitle,
    });

    if (result.success && result.comment) {
      setComments((prev) => [...prev, result.comment!]);
      setNewCommentText('');
    } else {
      alert(result.error || 'Failed to post comment.');
    }
    setSubmitting(false);
  };

  const handleReplyAdded = (newReply: MemoryComment) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === newReply.parent_comment_id) {
          return {
            ...c,
            replies: [...(c.replies || []), newReply],
          };
        }
        return c;
      })
    );
  };

  const handleCommentDeleted = (deletedId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === deletedId) {
          return { ...c, is_deleted: true, content: '[This comment has been removed]' };
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === deletedId
                ? { ...r, is_deleted: true, content: '[This comment has been removed]' }
                : r
            ),
          };
        }
        return c;
      })
    );
  };

  const handleReport = (commentId: string) => {
    setReportingCommentId(commentId);
    setReportModalOpen(true);
  };

  const totalCount = comments.reduce(
    (acc, curr) => acc + 1 + (curr.replies?.length || 0),
    0
  );

  return (
    <section id="comments" className={`space-y-6 pt-6 border-t border-border ${className}`}>
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-heading font-extrabold text-black flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#0B6B3A]" />
          <span>Community Discussion ({totalCount})</span>
        </h3>
      </div>

      {/* Main Comment Input Box */}
      <form onSubmit={handlePostComment} className="flex gap-3 items-start">
        <UserAvatar
          src={profile?.avatar_url}
          name={profile?.full_name || 'Guest'}
          size="md"
          className="mt-1"
        />

        <div className="flex-1 space-y-2">
          <div className="relative">
            <textarea
              rows={3}
              placeholder={
                user
                  ? 'Add your memory perspective, historical note, or question...'
                  : 'Log in to join the conversation and share your story...'
              }
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onFocus={() => {
                if (!user) setSignInPromptOpen(true);
              }}
              className="w-full p-3 rounded-2xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 resize-none bg-gray-50/50"
              maxLength={2000}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !newCommentText.trim()}
              leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-xl px-4 text-xs"
            >
              Post Comment
            </Button>
          </div>
        </div>
      </form>

      {/* Threaded Comments List */}
      <div className="space-y-6 pt-2 divide-y divide-border/60">
        {loading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-3 bg-gray-200 rounded" />
                  <div className="w-full h-10 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/60 border border-dashed border-border rounded-2xl space-y-1.5">
            <p className="text-sm font-semibold text-black">No comments yet</p>
            <p className="text-xs text-charcoal-muted">
              Be the first to share your memory reflections or questions!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              memoryId={memoryId}
              memoryAuthorId={memoryAuthorId}
              memoryTitle={memoryTitle}
              onReplyAdded={handleReplyAdded}
              onCommentDeleted={handleCommentDeleted}
              onReportClick={handleReport}
              onRequireAuth={() => setSignInPromptOpen(true)}
            />
          ))
        )}
      </div>

      {/* Report Modal */}
      {reportingCommentId && (
        <ReportModal
          isOpen={reportModalOpen}
          memoryId={memoryId}
          memoryTitle={`Comment #${reportingCommentId.slice(0, 8)}`}
          onClose={() => {
            setReportModalOpen(false);
            setReportingCommentId(null);
          }}
        />
      )}

      {/* Auth Prompt Modal */}
      <SignInPromptModal
        isOpen={signInPromptOpen}
        onClose={() => setSignInPromptOpen(false)}
        onOpenAuth={() => {
          setSignInPromptOpen(false);
        }}
        actionText="join the conversation"
      />
    </section>
  );
};
