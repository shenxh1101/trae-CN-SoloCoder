import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    try {
      const response = await api.post('/documents', {
        title: newDocTitle || 'Untitled Document',
        content: ''
      });
      setShowNewDocModal(false);
      setNewDocTitle('');
      window.location.href = `/document/${response.data.id}`;
    } catch (err) {
      console.error('Error creating document:', err);
    }
  };

  const getPermissionClass = (permission) => {
    switch (permission) {
      case 'owner': return 'permission-owner';
      case 'write': return 'permission-write';
      case 'read': return 'permission-read';
      default: return '';
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

  if (loading) {
    return <div className="loading">Loading documents...</div>;
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Documents</h1>
        <button className="btn btn-primary" onClick={() => setShowNewDocModal(true)}>
          + New Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-title">No documents yet</div>
          <p>Create your first document to start collaborating!</p>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              to={`/document/${doc.id}`}
              className="document-card"
            >
              <div className="document-card-title">{doc.title}</div>
              <div className="document-card-meta">
                Updated: {formatDate(doc.updated_at)}
              </div>
              <span className={`document-card-permission ${getPermissionClass(doc.user_permission)}`}>
                {doc.user_permission.charAt(0).toUpperCase() + doc.user_permission.slice(1)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {showNewDocModal && (
        <div className="modal-overlay" onClick={() => setShowNewDocModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Document</h2>
              <button className="modal-close" onClick={() => setShowNewDocModal(false)}>
                &times;
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Document Title</label>
              <input
                type="text"
                className="form-input"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Untitled Document"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNewDocModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={createDocument}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
