import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, RefreshCw, Folder, FileText, Image, FileCode, File as FileIcon } from 'lucide-react';
import { apiRequest } from '../api/client.js';
import type { DriveFile, Folder as FolderType } from '../types/index.js';

interface TrashedItem extends DriveFile {
  deleted_at: string;
}

interface TrashedFolder extends FolderType {
  deleted_at: string;
}

function formatBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!num || isNaN(num) || num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mime?: string) {
  if (!mime) return <FileIcon className="w-5 h-5 text-sky-400" />;
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-purple-400" />;
  if (mime.includes('pdf') || mime.includes('text')) return <FileText className="w-5 h-5 text-rose-400" />;
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript')) {
    return <FileCode className="w-5 h-5 text-[#C6F432]" />;
  }
  return <FileIcon className="w-5 h-5 text-sky-400" />;
}

interface TrashViewProps {
  onStorageChanged?: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ onStorageChanged }) => {
  const [files, setFiles] = useState<TrashedItem[]>([]);
  const [folders, setFolders] = useState<TrashedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ files: TrashedItem[]; folders: TrashedFolder[] }>('/trash');
      setFiles(res.files);
      setFolders(res.folders);
    } catch (err: any) {
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (type: 'file' | 'folder', id: string) => {
    setActionLoadingId(id);
    try {
      await apiRequest('/trash/restore', {
        method: 'POST',
        body: JSON.stringify({ resourceType: type, id }),
      });
      await fetchTrash();
    } catch (err: any) {
      alert(err.message || 'Failed to restore item');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async (type: 'file' | 'folder', id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setActionLoadingId(id);
    try {
      await apiRequest(`/trash/${type}/${id}`, {
        method: 'DELETE',
      });
      await fetchTrash();
      onStorageChanged?.();
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete item');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty trash? All items will be permanently erased from storage.')) return;
    setLoading(true);
    try {
      await apiRequest('/trash', {
        method: 'DELETE',
      });
      await fetchTrash();
      onStorageChanged?.();
    } catch (err: any) {
      alert(err.message || 'Failed to empty trash');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A1A1AA]">
        <RefreshCw className="w-7 h-7 text-[#C6F432] animate-spin mb-3" />
        <p className="text-sm">Loading trash...</p>
      </div>
    );
  }

  const isEmpty = files.length === 0 && folders.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Trash is empty</h3>
        <p className="text-xs text-[#A1A1AA] max-w-sm">
          Items deleted from your drive will appear here before being permanently purged after 30 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-[#C6F432]" />
          <h2 className="text-sm font-bold text-white">Trash Bin</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#27272A] text-white">
            {files.length + folders.length} items
          </span>
        </div>

        <button
          onClick={handleEmptyTrash}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Empty Trash</span>
        </button>
      </div>

      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-[#A1A1AA]">
          <thead className="bg-[#121214] border-b border-[#27272A] text-xs font-semibold uppercase text-[#71717A]">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4 hidden sm:table-cell">Deleted At</th>
              <th className="py-3 px-4 hidden sm:table-cell">Size</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]/60">
            {folders.map((folder) => (
              <tr key={folder.id} className="hover:bg-[#202024]/80 transition group">
                <td className="py-3 px-4 flex items-center gap-3">
                  <div className="shrink-0 p-2 rounded-xl bg-[#0B0B0C] text-[#C6F432] border border-[#27272A]">
                    <Folder className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-semibold text-white truncate max-w-xs">{folder.name}</span>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell text-xs text-[#71717A]">
                  {new Date(folder.deleted_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 hidden sm:table-cell text-xs font-mono">—</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleRestore('folder', folder.id)}
                      disabled={actionLoadingId === folder.id}
                      title="Restore folder"
                      className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition disabled:opacity-40"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete('folder', folder.id, folder.name)}
                      disabled={actionLoadingId === folder.id}
                      title="Delete forever"
                      className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-[#27272A] rounded-lg transition disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {files.map((file) => (
              <tr key={file.id} className="hover:bg-[#202024]/80 transition group">
                <td className="py-3 px-4 flex items-center gap-3">
                  <div className="shrink-0 p-2 rounded-xl bg-[#0B0B0C] border border-[#27272A]">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <span className="font-semibold text-white truncate max-w-xs">{file.name}</span>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell text-xs text-[#71717A]">
                  {new Date(file.deleted_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 hidden sm:table-cell text-xs font-mono">
                  {formatBytes(file.size_bytes)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleRestore('file', file.id)}
                      disabled={actionLoadingId === file.id}
                      title="Restore file"
                      className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition disabled:opacity-40"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete('file', file.id, file.name)}
                      disabled={actionLoadingId === file.id}
                      title="Delete forever"
                      className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-[#27272A] rounded-lg transition disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
