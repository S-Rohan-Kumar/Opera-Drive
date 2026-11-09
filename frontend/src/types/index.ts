export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  updated_at: string;
}

export interface DriveFile {
  id: string;
  name: string;
  parent_id: string | null;
  current_version_id?: string | null;
  version_number?: number;
  updated_at: string;
  size_bytes: string | number;
  mime_type: string;
}

export interface FolderContents {
  currentFolderId: string | null;
  folders: Folder[];
  files: DriveFile[];
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  size_bytes: string | number;
  mime_type: string;
  checksum_sha256: string;
  created_at: string;
  is_current: boolean;
}

export interface Permission {
  id: string;
  resource_type: 'file' | 'folder';
  resource_id: string;
  role: 'viewer' | 'editor';
  created_at: string;
  user_id?: string;
  email?: string;
  full_name?: string;
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface SharedFile extends DriveFile {
  owner_id: string;
  owner_name: string;
  owner_email: string;
  role: 'viewer' | 'editor';
}

export interface SharedFolder extends Folder {
  owner_id: string;
  owner_name: string;
  owner_email: string;
  role: 'viewer' | 'editor';
}

export interface SharedWithMeData {
  files: SharedFile[];
  folders: SharedFolder[];
}

export interface UploadSession {
  id: string;
  file_name: string;
  mime_type: string;
  expected_size_bytes: number;
  expected_sha256: string;
  status: 'INITIATED' | 'UPLOADING' | 'COMPLETED' | 'ABORTED' | 'EXPIRED';
  expires_at: string;
}
