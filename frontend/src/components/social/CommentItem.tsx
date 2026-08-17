import React, { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Heart, Reply, MoreVertical, Edit2, Trash2, Flag, Check, X, Loader2 } from 'lucide-react';
import { MemoryComment } from '@/types/social';
import { commentService } from '@/services/comment.service';
import { useAuth } from '@/hooks/useAuth';

interface CommentItemProps {
  comment: MemoryComment;
  memoryId: string;
  memoryAuthorId?: string;
  memoryTitle?: string;
  onReplyAdded: (newComment: MemoryComment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReportClick: (commentId: string) => void;
  onRequireAuth: () => void;
  isNested?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  memoryId,
  memoryAuthorId,
  memoryTitle,
  onReplyAdded,
  onCommentDeleted,
  onReportClick,
  onRequireAuth,
  isNested = false,
}) => {
  const { user } = useAuth();

  const [hasLiked, setHasLiked] = useState(comment.has_liked || false);
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [savingEdit, setSavingEdit] = useState(false);

  // Menu Dropdown State
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthor = user?.id === comment.user_id;

  const handleLike = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    const result = await commentService.toggleCommentLike(comment.id, user.id);
    setHasLiked(result.liked);
    setLikesCount(result.count);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }

    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    const result = await commentService.addComment({
      memoryId,
      userId: user.id,
      content: replyContent.trim(),
      parentCommentId: comment.id,
      parentCommentAuthorId: comment.user_id,
      memoryTitle,
    });

    if (result.success && result.comment) {
      onReplyAdded(result.comment);
      setReplyContent('');
      setReplyOpen(false);
    } else {
      alert(result.error || 'Failed to post reply.');
    }
    setSubmittingReply(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editContent.trim()) return;

    setSavingEdit(true);
    const success = await commentService.editComment(comment.id, user.id, editContent);
    if (success) {
      comment.content = editContent;
      setIsEditing(false);
    } else {
      alert('Failed to save changes.');
    }
    setSavingEdit(false);
  };

  const handleDelete = async () => {
    if (!user || !window.confirm('Are you sure you want to remove this comment?')) return;
    const success = await commentService.deleteComment(comment.id, user.id);
    if (success) {
      onCommentDeleted(comment.id);
    }
  };

  const formattedTime = new Date(comment.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className={`space-y-3 ${isNested ? 'ml-6 sm:ml-10 border-l-2 border-border pl-3 pt-2' : 'pt-2'}`}>
      <div className="flex items-start justify-between gap-3 group">
        {/* Commenter Info & Body */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <UserAvatar
            src={comment.author?.avatar_url}
            name={comment.author?.full_name}
            size="sm"
            className="mt-0.5"
          />

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-black truncate">
                {comment.author?.full_name || 'Contributor'}
              </span>
              <span className="text-xs text-charcoal-muted font-normal">{formattedTime}</span>
              {comment.updated_at !== comment.created_at && !comment.is_deleted && (
                <span className="text-[11px] text-charcoal-muted italic">(edited)</span>
              )}
            </div>

            {/* Comment Body or Edit Input */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-2 pt-1">
                <textarea
                  rows={2}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 resize-none"
                  required
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={savingEdit}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    className="bg-[#0B6B3A] text-xs h-7 px-2.5 font-semibold"
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    leftIcon={<X className="w-3.5 h-3.5" />}
                    className="text-xs h-7 px-2.5 font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p
                className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                  comment.is_deleted ? 'text-charcoal-muted italic' : 'text-charcoal-dark'
                }`}
              >
                {comment.content}
              </p>
            )}

            {/* Action buttons (Like, Reply) */}
            {!comment.is_deleted && !isEditing && (
              <div className="flex items-center gap-4 pt-1 text-xs font-medium text-charcoal-muted">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1 hover:text-red-600 transition-colors ${
                    hasLiked ? 'text-red-600 font-semibold' : ''
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-red-600' : ''}`} />
                  <span>{likesCount > 0 ? likesCount : 'Like'}</span>
                </button>

                <button
                  onClick={() => {
                    if (!user) {
                      onRequireAuth();
                      return;
                    }
                    setReplyOpen(!replyOpen);
                  }}
                  className="flex items-center gap-1 hover:text-[#0B6B3A] transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comment Options Dropdown */}
        {!comment.is_deleted && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md text-charcoal-muted opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
              aria-label="Comment options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-6 w-32 bg-white border border-border rounded-xl shadow-lg p-1 z-20 space-y-0.5 text-xs animate-fade-in">
                {isAuthor ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-charcoal-dark hover:bg-gray-50"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onReportClick(comment.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-charcoal-dark hover:bg-gray-50"
                  >
                    <Flag className="w-3 h-3 text-charcoal-muted" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply Input Box */}
      {replyOpen && (
        <form onSubmit={handleSendReply} className="ml-8 space-y-2 pt-1 animate-fade-in">
          <div className="relative">
            <textarea
              rows={2}
              placeholder={`Replying to @${comment.author?.full_name || 'Contributor'}...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full p-2.5 pr-20 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]/30 resize-none bg-gray-50/70"
              required
            />
            <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReplyOpen(false)}
                className="h-6 px-2 text-[10px] rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submittingReply || !replyContent.trim()}
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white h-6 px-2.5 text-[10px] rounded-lg font-bold"
              >
                {submittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Nested Replies Rendering */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 pt-1">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              memoryId={memoryId}
              memoryAuthorId={memoryAuthorId}
              memoryTitle={memoryTitle}
              onReplyAdded={onReplyAdded}
              onCommentDeleted={onCommentDeleted}
              onReportClick={onReportClick}
              onRequireAuth={onRequireAuth}
              isNested={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
