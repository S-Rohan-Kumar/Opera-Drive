import React from 'react';
import type { DriveFile } from '../types/index.js';
import { Download, Trash2, FileText, Image, FileCode, File as FileIcon } from 'lucide-react';
import { downloadFile } from '../api/client.js';

interface FileListProps {
  files: DriveFile[];
  onDeleteFile: (fileId: string) => void;
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
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-purple-500" />;
  if (mime.includes('pdf') || mime.includes('text')) return <FileText className="w-5 h-5 text-red-500" />;
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript')) {
    return <FileCode className="w-5 h-5 text-emerald-500" />;
  }
  return <FileIcon className="w-5 h-5 text-blue-500" />;
}

export const FileList: React.FC<FileListProps> = ({ files, onDeleteFile }) => {
  if (files.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Files
      </h2>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4 hidden sm:table-cell">Size</th>
              <th className="py-3 px-4 hidden md:table-cell">Last Modified</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50/75 transition group">
                <td className="py-3 px-4 flex items-center gap-3">
                  <div className="shrink-0">{getFileIcon(file.mime_type)}</div>
                  <span className="font-medium text-slate-700 truncate max-w-xs md:max-w-md">
                    {file.name}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                  {formatBytes(file.size_bytes)}
                </td>
                <td className="py-3 px-4 text-slate-400 hidden md:table-cell">
                  {new Date(file.updated_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => downloadFile(file.id, file.name)}
                      title="Download file"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
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
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
