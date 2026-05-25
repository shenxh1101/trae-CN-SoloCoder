import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, Clock, ChevronDown, Loader2, X } from 'lucide-react';
import { getHotComments } from '@/services/apiWithFallback';
import type { Comment, CommentResponse } from '@/services/api';
import { cn } from '@/lib/utils';

interface CommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number | null;
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-bg-tertiary" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-bg-tertiary rounded" />
        <div className="h-3 w-full bg-bg-tertiary rounded" />
        <div className="h-3 w-3/4 bg-bg-tertiary rounded" />
        <div className="flex items-center gap-4">
          <div className="h-3 w-16 bg-bg-tertiary rounded" />
          <div className="h-3 w-12 bg-bg-tertiary rounded" />
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN');
}

function formatCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return count.toString();
}

interface CommentItemProps {
  comment: Comment;
  index: number;
}

function CommentItem({ comment, index }: CommentItemProps) {
  const [liked, setLiked] = useState(comment.liked || false);
  const [likeCount, setLikeCount] = useState(comment.likedCount);

  const handleLike = () => {
    if (liked) {
      setLikeCount((prev) => prev - 1);
    } else {
      setLikeCount((prev) => prev + 1);
    }
    setLiked(!liked);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex gap-3 p-4 hover:bg-white/5 transition-colors',
        index > 0 && 'border-t border-border-subtle'
      )}
    >
      <img
        src={comment.user.avatarUrl}
        alt={comment.user.nickname}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-text-primary truncate">
            {comment.user.nickname}
          </span>
          <div className="flex items-center gap-1 text-text-muted text-xs">
            <Clock className="w-3 h-3" />
            {formatTime(comment.time)}
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-2 whitespace-pre-wrap">
          {comment.content}
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              liked
                ? 'text-accent-pink'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <Heart className={cn('w-3.5 h-3.5', liked && 'fill-current')} />
            {formatCount(likeCount)}
          </button>

          <button className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
            回复
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function CommentsPanel({ isOpen, onClose, songId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (isOpen && songId) {
      loadComments(true);
    }
  }, [isOpen, songId]);

  const loadComments = async (reset: boolean = false) => {
    if (!songId) return;

    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data: CommentResponse = await getHotComments(songId, limit, currentOffset);

      if (reset) {
        setComments(data.hotComments);
      } else {
        setComments((prev) => [...prev, ...data.hotComments]);
      }

      setHasMore(data.hasMore);
      setTotal(data.total);
      setOffset(currentOffset + limit);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    loadComments(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 right-0 bottom-0 h-[70vh] bg-bg-secondary border-t border-border-subtle z-50 flex flex-col rounded-t-3xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent-purple" />
                <h2 className="text-lg font-semibold text-text-primary">热门评论</h2>
                <span className="text-sm text-text-muted">({total})</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-12 h-1 bg-bg-tertiary rounded-full mx-auto mt-2 mb-2" />

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-1">
                  {[...Array(5)].map((_, i) => (
                    <CommentSkeleton key={i} />
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center p-12"
                >
                  <div className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                    <MessageSquare className="w-10 h-10 text-text-muted" />
                  </div>
                  <p className="text-text-secondary mb-2">暂无热门评论</p>
                  <p className="text-text-muted text-sm">快来抢沙发吧</p>
                </motion.div>
              ) : (
                <div>
                  {comments.map((comment, index) => (
                    <CommentItem key={comment.commentId} comment={comment} index={index} />
                  ))}

                  {hasMore && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 flex justify-center"
                    >
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-2 rounded-full bg-bg-tertiary text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            加载中...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            加载更多
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
