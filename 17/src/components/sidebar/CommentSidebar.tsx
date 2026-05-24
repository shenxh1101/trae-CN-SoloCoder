import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send, User, Clock, Reply, Code, MoreHorizontal, Trash2, Edit2, Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Comment, User as UserType } from '@/shared/types';

interface CommentSidebarProps {
  comments: Comment[];
  currentUser?: UserType | null;
  onClose: () => void;
  onAddComment: (content: string, lineNumber?: number, lineContent?: string, parentId?: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onLineClick?: (lineNumber: number) => void;
  highlightedLineNumber?: number;
  className?: string;
}

interface CommentItemProps {
  comment: Comment;
  currentUser?: UserType | null;
  onReply: (parentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onLineClick?: (lineNumber: number) => void;
  highlightedLineNumber?: number;
  replies?: Comment[];
}

function CommentItem({
  comment,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onLineClick,
  highlightedLineNumber,
  replies = [],
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const isHighlighted = highlightedLineNumber === comment.lineNumber;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'rounded-lg border p-3 transition-all duration-200',
          isHighlighted
          ? 'border-neon-cyan-500 bg-neon-cyan-50 dark:bg-neon-cyan-900/20 shadow-[0_0_0_3px_rgba(6,182,212,0.1)'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {comment.author.avatar ? (
              <img
                src={comment.author.avatar}
                alt={comment.author.username}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <User className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {comment.author.username}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                {formatDate(comment.createdAt)}
              </div>
            </div>
          </div>
          {currentUser?.id === comment.authorId && (onEdit || onDelete) && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-28 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-10">
                  {onEdit && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Edit2 className="h-3 w-3" />
                      编辑
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(comment.id);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      删除
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {comment.lineNumber !== undefined && (
          <button
            onClick={() => onLineClick?.(comment.lineNumber!)}
            className={cn(
            'mb-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono cursor-pointer transition-colors',
            isHighlighted
              ? 'bg-neon-cyan-100 text-neon-cyan-700 dark:bg-neon-cyan-800 dark:text-neon-cyan-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          )}
          >
            <Code className="h-3 w-3" />
            第 {comment.lineNumber} 行
          </button>
        )}

        {comment.lineContent && (
          <div className="mb-2 rounded bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">
            <code>{comment.lineContent}</code>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input-field text-sm resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
              onClick={handleSaveEdit}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              <Check className="h-3 w-3" />
              保存
            </button>
              <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              <XCircle className="h-3 w-3" />
              取消
            </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {comment.content}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => onReply(comment.id)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-deep-blue-600 dark:text-gray-400 dark:hover:text-deep-blue-400"
              >
                <Reply className="h-3 w-3" />
                回复
              </button>
            </div>
          </>
        )}
      </div>

      {replies.length > 0 && (
        <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-3 dark:border-gray-700">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLineClick={onLineClick}
              highlightedLineNumber={highlightedLineNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSidebar({
  comments,
  currentUser,
  onClose,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onLineClick,
  highlightedLineNumber,
  className,
}: CommentSidebarProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined);
  const [selectedLineContent, setSelectedLineContent] = useState<string | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim(), selectedLine, selectedLineContent, replyingTo || undefined);
      setNewComment('');
      setReplyingTo(null);
      setSelectedLine(undefined);
      setSelectedLineContent(undefined);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setSelectedLine(undefined);
    setSelectedLineContent(undefined);
    textareaRef.current?.focus();
  };

  const handleClearLineReference = () => {
    setSelectedLine(undefined);
    setSelectedLineContent(undefined);
  };

  return (
    <aside className={cn('sidebar-panel animate-slide-in-right', className)}>
      <div className="sidebar-header">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-electric-purple-600 dark:text-electric-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">评论讨论</h3>
          <span className="badge badge-purple">{comments.length}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="space-y-2">
          {replyingTo && (
          <div className="flex items-center justify-between rounded bg-electric-purple-50 dark:bg-electric-purple-900/20 px-3 py-1.5 text-xs text-electric-purple-700 dark:text-electric-purple-300">
            <span>正在回复评论...</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="hover:text-electric-purple-900 dark:hover:text-electric-purple-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

          {selectedLine !== undefined && (
          <div className="flex items-center justify-between rounded bg-neon-cyan-50 dark:bg-neon-cyan-900/20 px-3 py-1.5 text-xs text-neon-cyan-700 dark:text-neon-cyan-300">
            <span className="inline-flex items-center gap-1">
              <Code className="h-3 w-3" />
              引用第 {selectedLine} 行
            </span>
            <button
              type="button"
              onClick={handleClearLineReference}
              className="hover:text-neon-cyan-900 dark:hover:text-neon-cyan-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUser ? "添加评论..." : "请先登录后再评论"}
            className="input-field text-sm resize-none"
            rows={3}
            disabled={!currentUser}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentUser ? "选中代码行可引用" : ""}
            </span>
            <button
              type="submit"
              disabled={!newComment.trim() || !currentUser}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              发送
            </button>
          </div>
        </form>
      </div>

      <div className="sidebar-content space-y-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无评论</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              成为第一个评论的人吧
            </p>
          </div>
        ) : rootComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">所有评论均为回复</p>
          </div>
        ) : (
          rootComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onReply={handleReply}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
              onLineClick={onLineClick}
              highlightedLineNumber={highlightedLineNumber}
              replies={getReplies(comment.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
