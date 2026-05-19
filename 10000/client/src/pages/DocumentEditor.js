import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket, { connectSocket, disconnectSocket } from '../services/socket';
import ShareModal from '../components/ShareModal';

const MAX_UNDO_STACK = 5;

const DocumentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [comments, setComments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedText, setSelectedText] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [toast, setToast] = useState(null);
  const textareaRef = useRef(null);
  const socketConnected = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadDocument();
    
    if (token && !socketConnected.current) {
      connectSocket(token);
      socketConnected.current = true;
    }

    return () => {
      if (socketConnected.current) {
        socket.emit('leave-document');
        disconnectSocket();
        socketConnected.current = false;
      }
    };
  }, [id, token]);

  useEffect(() => {
    if (!socketConnected.current) return;

    socket.on('connect', () => {
      socket.emit('join-document', { documentId: id });
    });

    socket.on('document-state', (data) => {
      setContent(data.content);
      setOnlineUsers(data.users);
    });

    socket.on('user-joined', (data) => {
      setOnlineUsers(data.users);
    });

    socket.on('user-left', (data) => {
      setOnlineUsers(data.users);
      setRemoteCursors(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(userId => {
          if (!data.users.find(u => u.id == userId)) {
            delete next[userId];
          }
        });
        return next;
      });
    });

    socket.on('edit', (data) => {
      setContent(data.content);
      if (data.cursor && data.userId !== user?.id) {
        setRemoteCursors(prev => ({
          ...prev,
          [data.userId]: {
            position: data.cursor,
            username: data.username,
            color: data.color
          }
        }));
      }
    });

    socket.on('cursor-move', (data) => {
      if (data.userId !== user?.id) {
        setRemoteCursors(prev => ({
          ...prev,
          [data.userId]: {
            position: data.cursor,
            username: data.username,
            color: data.color
          }
        }));
      }
    });

    socket.on('comment-added', (comment) => {
      setComments(prev => [comment, ...prev]);
    });

    socket.on('document-saved', (data) => {
      if (data.success) {
        showToast('Document saved!');
      } else {
        showToast('Failed to save document', 'error');
      }
    });

    socket.on('error', (error) => {
      showToast(error.message, 'error');
    });

    return () => {
      socket.off('connect');
      socket.off('document-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('edit');
      socket.off('cursor-move');
      socket.off('comment-added');
      socket.off('document-saved');
      socket.off('error');
    };
  }, [id, user?.id]);

  const loadDocument = async () => {
    try {
      const response = await api.get(`/documents/${id}`);
      setDocument(response.data);
      setContent(response.data.content);
      setTitle(response.data.title);
      setVersions(response.data.versions);
      setComments(response.data.comments);
    } catch (err) {
      console.error('Error loading document:', err);
      showToast('Failed to load document', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveToUndoStack = useCallback((currentContent) => {
    setUndoStack(prev => {
      const newStack = [...prev, currentContent];
      if (newStack.length > MAX_UNDO_STACK) {
        newStack.shift();
      }
      return newStack;
    });
    setRedoStack([]);
  }, []);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    
    if (document?.user_permission === 'read') {
      return;
    }

    saveToUndoStack(content);
    setContent(newContent);

    const cursor = e.target.selectionStart;
    socket.emit('edit', { content: newContent, cursor });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const prevContent = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, content]);
    setContent(prevContent);
    socket.emit('edit', { content: prevContent, cursor: prevContent.length });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const nextContent = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, content]);
    setContent(nextContent);
    socket.emit('edit', { content: nextContent, cursor: nextContent.length });
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveDocument();
    }
  };

  const handleCursorChange = (e) => {
    const cursor = e.target.selectionStart;
    socket.emit('cursor-move', { cursor });
  };

  const handleTextSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selected = content.substring(start, end);
      setSelectedText({ text: selected, start, end });
      setShowCommentInput(true);
    }
  };

  const saveDocument = () => {
    socket.emit('save-document');
  };

  const saveVersion = async () => {
    try {
      await api.post(`/documents/${id}/versions`, {
        description: prompt('Enter a description for this version:')
      });
      loadDocument();
      showToast('Version saved!');
    } catch (err) {
      showToast('Failed to save version', 'error');
    }
  };

  const restoreVersion = async (versionId) => {
    if (!confirm('Are you sure you want to restore this version? This will overwrite the current content.')) {
      return;
    }

    try {
      const response = await api.post(`/documents/${id}/restore/${versionId}`);
      setContent(response.data.content);
      socket.emit('edit', { content: response.data.content, cursor: 0 });
      loadDocument();
      showToast('Version restored!');
    } catch (err) {
      showToast('Failed to restore version', 'error');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await api.post(`/comments/document/${id}`, {
        content: newComment,
        selectionStart: selectedText?.start,
        selectionEnd: selectedText?.end,
        selectedText: selectedText?.text
      });
      
      socket.emit('comment-added', response.data);
      setComments(prev => [response.data, ...prev]);
      setNewComment('');
      setSelectedText(null);
      setShowCommentInput(false);
      showToast('Comment added!');
    } catch (err) {
      showToast('Failed to add comment', 'error');
    }
  };

  const addReply = async (parentId, replyContent) => {
    if (!replyContent.trim()) return;

    try {
      const response = await api.post(`/comments/document/${id}`, {
        content: replyContent,
        parentId
      });
      
      socket.emit('comment-added', response.data);
      loadDocument();
      showToast('Reply added!');
    } catch (err) {
      showToast('Failed to add reply', 'error');
    }
  };

  const deleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/comments/${commentId}`);
      loadDocument();
      showToast('Comment deleted!');
    } catch (err) {
      showToast('Failed to delete comment', 'error');
    }
  };

  const updateTitle = async (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    try {
      await api.put(`/documents/${id}`, { title: newTitle, content });
    } catch (err) {
      console.error('Error updating title:', err);
    }
  };

  const deleteDocument = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/documents/${id}`);
      navigate('/');
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEdit = document?.user_permission === 'owner' || document?.user_permission === 'write';
  const isOwner = document?.user_permission === 'owner';

  if (loading) {
    return <div className="loading">Loading document...</div>;
  }

  if (!document) {
    return <div className="container">Document not found</div>;
  }

  return (
    <div className="editor-container">
      <div className="editor-main">
        <div className="editor-header">
          <input
            type="text"
            className="editor-title-input"
            value={title}
            onChange={updateTitle}
            readOnly={!canEdit}
          />
          <div className="editor-toolbar">
            <button
              className="btn btn-secondary"
              onClick={handleUndo}
              disabled={undoStack.length === 0 || !canEdit}
              title="Undo (Ctrl+Z)"
            >
              ↩ Undo
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleRedo}
              disabled={redoStack.length === 0 || !canEdit}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↪ Redo
            </button>
            <button
              className="btn btn-primary"
              onClick={saveDocument}
              disabled={!canEdit}
            >
              💾 Save
            </button>
            {canEdit && (
              <button className="btn btn-secondary" onClick={saveVersion}>
                📌 Save Version
              </button>
            )}
            {isOwner && (
              <button className="btn btn-outline" onClick={() => setShowShareModal(true)}>
                🔗 Share
              </button>
            )}
            {isOwner && (
              <button className="btn btn-danger" onClick={deleteDocument}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>

        <div className="editor-content" onMouseUp={handleTextSelection}>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={content}
            onChange={handleContentChange}
            onKeyUp={handleCursorChange}
            onClick={handleCursorChange}
            onKeyDown={handleKeyDown}
            readOnly={!canEdit}
            placeholder={canEdit ? "Start typing..." : "This document is read-only"}
          />
          
          {Object.entries(remoteCursors).map(([userId, data]) => (
            <div
              key={userId}
              className="remote-cursor"
              style={{
                backgroundColor: data.color,
                left: `${(data.position % 80) * 8 + 48}px`,
                top: `${Math.floor(data.position / 80) * 22 + 72}px`
              }}
            >
              <div className="remote-cursor-label" style={{ backgroundColor: data.color }}>
                {data.username}
              </div>
            </div>
          ))}
        </div>

        {showCommentInput && selectedText && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: '500px',
            zIndex: 1000
          }}>
            <div className="comment-quote">"{selectedText.text}"</div>
            <textarea
              className="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              autoFocus
            />
            <div className="comment-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowCommentInput(false);
                  setSelectedText(null);
                  setNewComment('');
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={addComment}>
                Add Comment
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="editor-sidebar">
        <div className="sidebar-tabs">
          <div
            className={`sidebar-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users ({onlineUsers.length})
          </div>
          <div
            className={`sidebar-tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            💬 Comments ({comments.length})
          </div>
          <div
            className={`sidebar-tab ${activeTab === 'versions' ? 'active' : ''}`}
            onClick={() => setActiveTab('versions')}
          >
            📜 History
          </div>
        </div>

        <div className="sidebar-content">
          {activeTab === 'users' && (
            <div>
              <ul className="online-users-list">
                {onlineUsers.map((u) => (
                  <li key={u.id} className="online-user-item">
                    <div
                      className="user-avatar"
                      style={{ backgroundColor: u.color || '#1a73e8' }}
                    >
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="user-name">
                        {u.username} {u.id === user?.id && '(You)'}
                      </div>
                      <div className="user-status">
                        {u.id === user?.id ? 'Viewing' : 'Editing'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'comments' && (
            <div>
              {comments.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">💬</div>
                  <div className="empty-state-title">No comments yet</div>
                  <p>Select text in the document to add a comment</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    onAddReply={addReply}
                    onDelete={deleteComment}
                    currentUser={user}
                    formatDate={formatDate}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div>
              {versions.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">📜</div>
                  <div className="empty-state-title">No versions yet</div>
                  <p>Click "Save Version" to create a restore point</p>
                </div>
              ) : (
                versions.map((version) => (
                  <div key={version.id} className="version-item">
                    <div className="version-header">
                      <span className="version-number">Version {version.version_number}</span>
                      <span className="version-time">{formatDate(version.created_at)}</span>
                    </div>
                    <div className="version-description">
                      {version.change_description || 'No description'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      by {version.created_by_name || 'Unknown'}
                    </div>
                    {canEdit && (
                      <button
                        className="btn btn-outline"
                        style={{ marginTop: '8px', padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => restoreVersion(version.id)}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          documentId={id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

const CommentThread = ({ comment, onAddReply, onDelete, currentUser, formatDate }) => {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleAddReply = () => {
    onAddReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyInput(false);
  };

  return (
    <div className="comment-thread">
      <div className="comment-header">
        <span className="comment-author">{comment.author_name}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="comment-time">{formatDate(comment.created_at)}</span>
          {comment.author_id === currentUser?.id && (
            <button
              onClick={() => onDelete(comment.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#d93025',
                fontSize: '12px'
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {comment.selected_text && (
        <div className="comment-quote">"{comment.selected_text}"</div>
      )}
      <div className="comment-content">{comment.content}</div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="comment-reply">
              <div className="comment-header" style={{ marginBottom: '4px' }}>
                <span className="comment-author" style={{ fontSize: '13px' }}>
                  {reply.author_name}
                </span>
                <span className="comment-time">{formatDate(reply.created_at)}</span>
              </div>
              <div className="comment-content" style={{ fontSize: '13px' }}>
                {reply.content}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-link"
        onClick={() => setShowReplyInput(!showReplyInput)}
        style={{
          background: 'none',
          border: 'none',
          color: '#1a73e8',
          cursor: 'pointer',
          padding: '4px 0',
          fontSize: '13px'
        }}
      >
        {showReplyInput ? 'Cancel' : 'Reply'}
      </button>

      {showReplyInput && (
        <div style={{ marginTop: '8px' }}>
          <textarea
            className="comment-input"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            style={{ minHeight: '50px' }}
            autoFocus
          />
          <div className="comment-actions">
            <button className="btn btn-primary" onClick={handleAddReply}>
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
