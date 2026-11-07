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
  updated_at: string;
  size_bytes: string | number;
  mime_type: string;
}

export interface FolderContents {
  currentFolderId: string | null;
  folders: Folder[];
  files: DriveFile[];
}
