import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ShareModal = ({ documentId, onClose }) => {
  const [isPublic, setIsPublic] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [permission, setPermission] = useState('read');
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShareSettings();
  }, [documentId]);

  const loadShareSettings = async () => {
    try {
      const response = await api.get(`/shares/document/${documentId}`);
      setIsPublic(response.data.isPublic);
      setShares(response.data.shares);
    } catch (err) {
      console.error('Error loading share settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePublic = async () => {
    try {
      const newPublic = !isPublic;
      setIsPublic(newPublic);
      await api.post(`/shares/document/${documentId}`, { isPublic: newPublic });
    } catch (err) {
      console.error('Error toggling public access:', err);
      setIsPublic(!isPublic);
    }
  };

  const generateShareLink = async () => {
    try {
      const response = await api.post(`/shares/document/${documentId}`, {
        createToken: { permission }
      });
      const link = `${window.location.origin}/share/${response.data.shareToken}`;
      setShareLink(link);
      loadShareSettings();
    } catch (err) {
      console.error('Error generating share link:', err);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const revokeShare = async (token) => {
    try {
      await api.delete(`/shares/token/${token}`);
      loadShareSettings();
      if (shareLink.includes(token)) {
        setShareLink('');
      }
    } catch (err) {
      console.error('Error revoking share:', err);
    }
  };

  const revokeUserShare = async (userId) => {
    try {
      await api.delete(`/shares/document/${documentId}/user/${userId}`);
      loadShareSettings();
    } catch (err) {
      console.error('Error revoking user share:', err);
    }
  };

  const tokenShares = shares.filter(s => s.share_token);
  const userShares = shares.filter(s => s.user_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Share Document</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="share-section">
              <div className="share-toggle">
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Public Access</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    Anyone with the link can {isPublic ? 'view' : 'not access'} this document
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={togglePublic}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="share-section">
                <div className="share-section-title">Generate Share Link</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <select
                    className="form-input"
                    value={permission}
                    onChange={(e) => setPermission(e.target.value)}
                    style={{ width: 'auto' }}
                  >
                    <option value="read">Can view</option>
                    <option value="write">Can edit</option>
                  </select>
                  <button className="btn btn-primary" onClick={generateShareLink}>
                    Generate Link
                  </button>
                </div>
                {shareLink && (
                  <div className="share-link">
                    <input
                      type="text"
                      className="share-link-input"
                      value={shareLink}
                      readOnly
                    />
                    <button className="btn btn-secondary" onClick={copyShareLink}>
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {tokenShares.length > 0 && (
              <div className="share-section">
                <div className="share-section-title">Share Links</div>
                {tokenShares.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>
                        {share.permission === 'write' ? '✏️ Edit' : '👁 View'} link
                      </span>
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        Created: {new Date(share.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => revokeShare(share.share_token)}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}

            {userShares.length > 0 && (
              <div className="share-section">
                <div className="share-section-title">Shared With</div>
                {userShares.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>{share.username}</span>
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        ({share.email})
                      </span>
                      <span
                        style={{
                          marginLeft: '8px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          background: share.permission === 'write' ? '#e6f4ea' : '#fce8e6',
                          color: share.permission === 'write' ? '#137333' : '#d93025'
                        }}
                      >
                        {share.permission}
                      </span>
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => revokeUserShare(share.user_id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
