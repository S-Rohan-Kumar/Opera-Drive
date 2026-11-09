import React from 'react';
import type { DriveFile } from '../types/index.js';
import { Download, Trash2, FileText, Image, FileCode, File as FileIcon, History, UserPlus } from 'lucide-react';
import { downloadFile } from '../api/client.js';

interface FileListProps {
  files: DriveFile[];
  onDeleteFile: (fileId: string) => void;
  onOpenVersions: (file: DriveFile) => void;
  onShareFile: (file: DriveFile) => void;
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

export const FileList: React.FC<FileListProps> = ({
  files,
  onDeleteFile,
  onOpenVersions,
  onShareFile,
}) => {
  if (files.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-3 flex items-center gap-2">
        <span>Files</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#27272A] text-white">
          {files.length}
        </span>
      </h2>
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-x-auto shadow-xl shadow-black/40">
        <table className="w-full text-left text-sm text-[#A1A1AA]">
          <thead className="bg-[#121214] border-b border-[#27272A] text-xs font-semibold uppercase text-[#71717A]">
            <tr>
              <th className="py-3 px-3 sm:px-4">Name</th>
              <th className="py-3 px-4 hidden sm:table-cell">Version</th>
              <th className="py-3 px-4 hidden sm:table-cell">Size</th>
              <th className="py-3 px-4 hidden md:table-cell">Last Modified</th>
              <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]/60">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-[#202024]/80 transition group">
                <td className="py-3 px-3 sm:px-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="shrink-0 p-2 rounded-xl bg-[#0B0B0C] border border-[#27272A]">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-white truncate max-w-[130px] sm:max-w-xs md:max-w-md group-hover:text-[#C6F432] transition">
                      {file.name}
                    </span>
                    <span className="sm:hidden text-[10px] text-[#71717A] flex items-center gap-1.5 mt-0.5">
                      <span className="text-[#C6F432] font-semibold">v{file.version_number ?? 1}</span>
                      <span>•</span>
                      <span>{formatBytes(file.size_bytes)}</span>
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <button
                    onClick={() => onOpenVersions(file)}
                    title="View version history"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 hover:bg-[#C6F432] hover:text-[#0B0B0C] transition"
                  >
                    <span>v{file.version_number ?? 1}</span>
                    <History className="w-3 h-3" />
                  </button>
                </td>
                <td className="py-3 px-4 text-[#A1A1AA] hidden sm:table-cell font-mono text-xs">
                  {formatBytes(file.size_bytes)}
                </td>
                <td className="py-3 px-4 text-[#71717A] hidden md:table-cell text-xs">
                  {new Date(file.updated_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onShareFile(file)}
                      title="Share file"
                      className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenVersions(file)}
                      title="Version history"
                      className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadFile(file.id, file.name)}
                      title="Download file"
                      className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete file "${file.name}"?`)) {
                          onDeleteFile(file.id);
                        }
                      }}
                      title="Delete file"
                      className="p-1.5 text-[#A1A1AA] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
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
    </section>
  );
};
