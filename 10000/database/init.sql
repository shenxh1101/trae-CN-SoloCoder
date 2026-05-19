-- ========================================
-- Collaborative Docs Database Schema
-- ========================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_shares CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Document',
    content TEXT NOT NULL DEFAULT '',
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document versions table for history
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    version_number INTEGER NOT NULL,
    change_description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document shares table for permissions
CREATE TABLE document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write')),
    share_token VARCHAR(64) UNIQUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, user_id)
);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    selection_start INTEGER,
    selection_end INTEGER,
    selected_text TEXT,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_version ON document_versions(document_id, version_number);
CREATE INDEX idx_document_shares_document ON document_shares(document_id);
CREATE INDEX idx_document_shares_token ON document_shares(share_token);
CREATE INDEX idx_comments_document ON comments(document_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-increment version number
CREATE OR REPLACE FUNCTION increment_version_number()
RETURNS TRIGGER AS $$
DECLARE
    max_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) INTO max_version
    FROM document_versions
    WHERE document_id = NEW.document_id;
    
    NEW.version_number = max_version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_version_number
    BEFORE INSERT ON document_versions
    FOR EACH ROW
    EXECUTE FUNCTION increment_version_number();

-- Insert test data
INSERT INTO users (username, email, password_hash) VALUES
    ('alice', 'alice@example.com', '$2b$10$LQqh.4J3kM6xX7Y8Z9W0V1U2S3R4Q5P6O7N8M9L0K1J2H3G2F1E0D'),
    ('bob', 'bob@example.com', '$2b$10$LQqh.4J3kM6xX7Y8Z9W0V1U2S3R4Q5P6O7N8M9L0K1J2H3G2F1E0D'),
    ('charlie', 'charlie@example.com', '$2b$10$LQqh.4J3kM6xX7Y8Z9W0V1U2S3R4Q5P6O7N8M9L0K1J2H3G2F1E0D');

INSERT INTO documents (title, content, owner_id, is_public) VALUES
    ('Welcome Document', '# Welcome to Collaborative Docs\n\nThis is a sample document. You can edit it in real-time with other users!', 1, true),
    ('Project Plan', '## Project Plan\n\n1. Phase 1: Research\n2. Phase 2: Development\n3. Phase 3: Testing', 1, false),
    ('Meeting Notes', '# Meeting Notes\n\nDate: 2024-01-01\nAttendees: Alice, Bob', 2, false);

INSERT INTO document_versions (document_id, content, created_by, change_description) VALUES
    (1, '# Welcome to Collaborative Docs\n\nThis is a sample document.', 1, 'Initial version'),
    (1, '# Welcome to Collaborative Docs\n\nThis is a sample document. You can edit it in real-time with other users!', 1, 'Added real-time collaboration note');

INSERT INTO document_shares (document_id, user_id, permission) VALUES
    (2, 2, 'write'),
    (3, 1, 'read');

INSERT INTO comments (document_id, author_id, content, selection_start, selection_end, selected_text) VALUES
    (1, 2, 'This is a great introduction!', 2, 9, 'Welcome'),
    (1, 1, 'Thanks! I worked hard on it.', NULL, NULL, NULL);

UPDATE comments SET parent_id = 1 WHERE id = 2;
