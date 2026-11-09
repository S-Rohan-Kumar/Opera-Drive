import React, { useState, useEffect } from 'react';
import { Users, Folder, Download, Shield, RefreshCw, FileText, Image, FileCode, File as FileIcon, History } from 'lucide-react';
import { getSharedWithMe, downloadFile } from '../api/client.js';
import type { SharedFile, SharedFolder, DriveFile } from '../types/index.js';

interface SharedWithMeViewProps {
  onOpenFolder: (folder: SharedFolder) => void;
  onOpenVersions?: (file: DriveFile) => void;
}

function formatBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!num || isNaN(num) || num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-purple-400" />;
  if (mime.includes('pdf') || mime.includes('text')) return <FileText className="w-5 h-5 text-rose-400" />;
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript')) {
    return <FileCode className="w-5 h-5 text-[#C6F432]" />;
  }
  return <FileIcon className="w-5 h-5 text-sky-400" />;
}

export const SharedWithMeView: React.FC<SharedWithMeViewProps> = ({ onOpenFolder, onOpenVersions }) => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShared = async () => {
    setLoading(true);
    try {
      const data = await getSharedWithMe();
      setFiles(data.files);
      setFolders(data.folders);
    } catch (err: any) {
      console.error('Failed to load shared items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShared();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#A1A1AA]">
        <RefreshCw className="w-6 h-6 text-[#C6F432] animate-spin mb-3" />
        <p className="text-sm">Loading shared resources...</p>
      </div>
    );
  }

  const isEmpty = files.length === 0 && folders.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">No shared files or folders</h3>
        <p className="text-xs text-[#A1A1AA] max-w-sm">
          Files and folders that other users share with your email address will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {folders.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-3 flex items-center gap-2">
            <span>Shared Folders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#27272A] text-white">
              {folders.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => onOpenFolder(folder)}
                className="group p-4 bg-[#18181B] border border-[#27272A] hover:border-[#C6F432]/50 rounded-2xl cursor-pointer transition select-none shadow-md hover:shadow-lg hover:shadow-[#C6F432]/5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center shrink-0 group-hover:bg-[#C6F432] group-hover:text-[#0B0B0C] transition duration-200">
                    <Folder className="w-5 h-5 fill-current" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#C6F432] transition">
                      {folder.name}
                    </h4>
                    <p className="text-[10px] text-[#A1A1AA] truncate">By {folder.owner_name}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#27272A]/60">
                  <span className="text-[10px] text-[#71717A]">{new Date(folder.updated_at).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 uppercase">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{folder.role}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {files.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-3 flex items-center gap-2">
            <span>Shared Files</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#27272A] text-white">
              {files.length}
            </span>
          </h2>
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl shadow-black/40">
            <table className="w-full text-left text-sm text-[#A1A1AA]">
              <thead className="bg-[#121214] border-b border-[#27272A] text-xs font-semibold uppercase text-[#71717A]">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Version</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Owner</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Role</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-[#202024]/80 transition group">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="shrink-0 p-2 rounded-xl bg-[#0B0B0C] border border-[#27272A]">
                        {getFileIcon(file.mime_type)}
                      </div>
                      <span className="font-semibold text-white truncate max-w-xs md:max-w-md group-hover:text-[#C6F432] transition">
                        {file.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <button
                        onClick={() => onOpenVersions && onOpenVersions(file)}
                        title={file.role === 'editor' ? "View history or upload new version" : "View version"}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 hover:bg-[#C6F432] hover:text-[#0B0B0C] transition"
                      >
                        <span>v{file.version_number ?? 1}</span>
                        {file.role === 'editor' && <History className="w-3 h-3" />}
                      </button>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-xs text-white">
                      {file.owner_name}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 uppercase">
                        <Shield className="w-2.5 h-2.5" />
                        <span>{file.role}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] hidden sm:table-cell font-mono text-xs">
                      {formatBytes(file.size_bytes)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {file.role === 'editor' && onOpenVersions && (
                          <button
                            onClick={() => onOpenVersions(file)}
                            title="Upload new version / Version history"
                            className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => downloadFile(file.id, file.name)}
                          title="Download shared file"
                          className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
