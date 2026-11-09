import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext.js';
import { SyncProvider, useSync } from './context/SyncContext.js';
import { AuthView } from './components/AuthView.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import type { SidebarTab } from './components/Sidebar.js';
import { Breadcrumbs } from './components/Breadcrumbs.js';
import type { BreadcrumbItem } from './components/Breadcrumbs.js';
import { FolderGrid } from './components/FolderGrid.js';
import { FileList } from './components/FileList.js';
import { CreateFolderModal } from './components/CreateFolderModal.js';
import { UploadFileModal } from './components/UploadFileModal.js';
import { ShareModal } from './components/ShareModal.js';
import { VersionHistoryModal } from './components/VersionHistoryModal.js';
import { SharedWithMeView } from './components/SharedWithMeView.js';
import { TrashView } from './components/TrashView.js';
import type { Folder, DriveFile, FolderContents, SharedFolder } from './types/index.js';
import { apiRequest } from './api/client.js';
import { HardDrive, RefreshCw } from 'lucide-react';

const DriveWorkspace: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SidebarTab>('my-drive');
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
  const [storageRefreshTrigger, setStorageRefreshTrigger] = useState(0);

  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    resourceType: 'file' | 'folder';
    resourceId: string;
    resourceName: string;
  }>({
    isOpen: false,
    resourceType: 'file',
    resourceId: '',
    resourceName: '',
  });

  const [versionModalState, setVersionModalState] = useState<{
    isOpen: boolean;
    file: DriveFile | null;
  }>({
    isOpen: false,
    file: null,
  });

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
    if (user && activeTab === 'my-drive') {
      fetchContents(currentFolderId);
    }
  }, [user, activeTab, currentFolderId, fetchContents]);

  const { lastEvent } = useSync();

  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'FILE_CREATED' ||
      lastEvent.type === 'VERSION_UPLOADED' ||
      lastEvent.type === 'RESOURCE_DELETED'
    ) {
      if (activeTab === 'my-drive') {
        fetchContents(currentFolderId);
      }
    }
  }, [lastEvent, activeTab, currentFolderId, fetchContents]);

  const handleOpenFolder = (folder: Folder) => {
    setActiveTab('my-drive');
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const handleOpenSharedFolder = (folder: SharedFolder) => {
    setActiveTab('my-drive');
    setBreadcrumbs([{ id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const handleOpenFolderFromSearch = (folder: { id: string; name: string }) => {
    setActiveTab('my-drive');
    setBreadcrumbs([{ id: folder.id, name: folder.name }]);
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

  const handleDeleteFile = async (fileId: string) => {
    try {
      await apiRequest(`/files/${fileId}`, {
        method: 'DELETE',
      });
      await fetchContents(currentFolderId);
      setStorageRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleOpenShare = (resourceType: 'file' | 'folder', id: string, name: string) => {
    setShareModalState({
      isOpen: true,
      resourceType,
      resourceId: id,
      resourceName: name,
    });
  };

  const handleOpenVersions = (file: DriveFile) => {
    setVersionModalState({
      isOpen: true,
      file,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#C6F432] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const isEmpty = contents.folders.length === 0 && contents.files.length === 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex flex-col">
      <Navbar
        onOpenFolder={handleOpenFolderFromSearch}
        onOpenVersions={handleOpenVersions}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'my-drive') {
              handleNavigateBreadcrumb(null);
            }
          }}
          onOpenCreateFolder={() => setCreateFolderOpen(true)}
          onOpenUploadFile={() => setUploadFileOpen(true)}
          refreshStorageTrigger={storageRefreshTrigger}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'my-drive' ? (
              <>
                <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigateBreadcrumb} />

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 text-[#A1A1AA]">
                    <RefreshCw className="w-7 h-7 text-[#C6F432] animate-spin mb-3" />
                    <p className="text-sm">Loading contents...</p>
                  </div>
                ) : isEmpty ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] mb-4 shadow-xl">
                      <HardDrive className="w-8 h-8 text-[#C6F432]" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      This folder is empty
                    </h3>
                    <p className="text-xs text-[#A1A1AA] max-w-sm mb-6">
                      Upload files with resumable streaming or create a new folder to organize.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCreateFolderOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#202024] text-white text-xs font-semibold border border-[#27272A] transition"
                      >
                        New Folder
                      </button>
                      <button
                        onClick={() => setUploadFileOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-[#C6F432]/10"
                      >
                        Upload File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <FolderGrid
                      folders={contents.folders}
                      onOpenFolder={handleOpenFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onShareFolder={(f) => handleOpenShare('folder', f.id, f.name)}
                    />
                    <FileList
                      files={contents.files}
                      onDeleteFile={handleDeleteFile}
                      onOpenVersions={handleOpenVersions}
                      onShareFile={(f) => handleOpenShare('file', f.id, f.name)}
                    />
                  </div>
                )}
              </>
            ) : activeTab === 'shared-with-me' ? (
              <SharedWithMeView
                onOpenFolder={handleOpenSharedFolder}
                onOpenVersions={handleOpenVersions}
              />
            ) : (
              <TrashView onStorageChanged={() => setStorageRefreshTrigger((prev) => prev + 1)} />
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
        parentId={currentFolderId}
        onUploadSuccess={async () => {
          await fetchContents(currentFolderId);
          setStorageRefreshTrigger((prev) => prev + 1);
        }}
      />

      <ShareModal
        isOpen={shareModalState.isOpen}
        onClose={() => setShareModalState((prev) => ({ ...prev, isOpen: false }))}
        resourceType={shareModalState.resourceType}
        resourceId={shareModalState.resourceId}
        resourceName={shareModalState.resourceName}
      />

      <VersionHistoryModal
        isOpen={versionModalState.isOpen}
        onClose={() => setVersionModalState((prev) => ({ ...prev, isOpen: false }))}
        file={versionModalState.file}
        onVersionRolledBack={async () => {
          await fetchContents(currentFolderId);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SyncProvider>
        <DriveWorkspace />
      </SyncProvider>
    </AuthProvider>
  );
};

export default App;
