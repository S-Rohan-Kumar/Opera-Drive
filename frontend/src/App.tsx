import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext.js';
import { AuthView } from './components/AuthView.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { Breadcrumbs } from './components/Breadcrumbs.js';
import type { BreadcrumbItem } from './components/Breadcrumbs.js';
import { FolderGrid } from './components/FolderGrid.js';
import { FileList } from './components/FileList.js';
import { CreateFolderModal } from './components/CreateFolderModal.js';
import { UploadFileModal } from './components/UploadFileModal.js';
import type { Folder, FolderContents } from './types/index.js';
import { apiRequest } from './api/client.js';
import { HardDrive, RefreshCw } from 'lucide-react';

const DriveWorkspace: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [contents, setContents] = useState<FolderContents>({
    currentFolderId: null,
    folders: [],
    files: [],
  });
  const [loading, setLoading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);

  const fetchContents = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const endpoint = folderId ? `/folders/${folderId}/contents` : '/folders/root/contents';
      const data = await apiRequest<FolderContents>(endpoint);
      setContents(data);
    } catch (err: any) {
      console.error('Failed to load folder contents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchContents(currentFolderId);
    }
  }, [user, currentFolderId, fetchContents]);

  const handleOpenFolder = (folder: Folder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const handleNavigateBreadcrumb = (folderId: string | null) => {
    if (folderId === null) {
      setBreadcrumbs([]);
      setCurrentFolderId(null);
    } else {
      const index = breadcrumbs.findIndex((b) => b.id === folderId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        setCurrentFolderId(folderId);
      }
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await apiRequest('/folders', {
        method: 'POST',
        body: JSON.stringify({
          name,
          parentId: currentFolderId,
        }),
      });
      await fetchContents(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await apiRequest(`/folders/${folderId}`, {
        method: 'DELETE',
      });
      await fetchContents(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete folder');
    }
  };

  const handleUploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      if (currentFolderId) {
        formData.append('parentId', currentFolderId);
      }
      formData.append('file', file);

      await apiRequest('/files/upload', {
        method: 'POST',
        body: formData,
      });
      await fetchContents(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Failed to upload file');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await apiRequest(`/files/${fileId}`, {
        method: 'DELETE',
      });
      await fetchContents(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const isEmpty = contents.folders.length === 0 && contents.files.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onOpenCreateFolder={() => setCreateFolderOpen(true)}
          onOpenUploadFile={() => setUploadFileOpen(true)}
          onNavigateHome={() => handleNavigateBreadcrumb(null)}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigateBreadcrumb} />

            {loading ? (
              <div className="py-24 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : isEmpty ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <HardDrive className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-700">This folder is empty</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Use the "+ New" button to create subfolders or upload files into this space.
                </p>
              </div>
            ) : (
              <>
                <FolderGrid
                  folders={contents.folders}
                  onOpenFolder={handleOpenFolder}
                  onDeleteFolder={handleDeleteFolder}
                />
                <FileList files={contents.files} onDeleteFile={handleDeleteFile} />
              </>
            )}
          </div>
        </main>
      </div>

      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <UploadFileModal
        isOpen={uploadFileOpen}
        onClose={() => setUploadFileOpen(false)}
        onUpload={handleUploadFile}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DriveWorkspace />
    </AuthProvider>
  );
}
