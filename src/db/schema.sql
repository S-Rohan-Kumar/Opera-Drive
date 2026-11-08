CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Folders Table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID NULL REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for active folders
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_folder
ON folders (owner_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), name)
WHERE deleted_at IS NULL;

-- 3. Files Table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID NULL REFERENCES folders(id) ON DELETE CASCADE,
    current_version_id UUID NULL,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: uniqueness of active file names within same parent
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_file
ON files (owner_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), name)
WHERE deleted_at IS NULL;
-- 4. File Versions Table (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum_sha256 CHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_file_version UNIQUE(file_id, version_number)
);
-- Circular FK resolution: link files.current_version_id to file_versions.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_files_current_version'
  ) THEN
    ALTER TABLE files 
    ADD CONSTRAINT fk_files_current_version 
    FOREIGN KEY (current_version_id) REFERENCES file_versions(id) ON DELETE SET NULL;
  END IF;
END $$;


-- 5. Permissions Table (Sharing ACL)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('file', 'folder')),
    resource_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permission UNIQUE(resource_type, resource_id, user_id)
);

-- 6. Upload Sessions Table (Resumable Uploads)
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID NULL REFERENCES folders(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    expected_size_bytes BIGINT NOT NULL,
    expected_sha256 CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'INITIATED' 
        CHECK (status IN ('INITIATED', 'UPLOADING', 'COMPLETED', 'ABORTED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires_at 
ON upload_sessions (status, expires_at);

-- 7. Upload Parts Table (Track each chunk received)
CREATE TABLE IF NOT EXISTS upload_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    part_number INT NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    size_bytes BIGINT NOT NULL,
    etag VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_session_part UNIQUE(session_id, part_number)
);