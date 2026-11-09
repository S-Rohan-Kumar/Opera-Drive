import React, { useState, useRef } from 'react';
import { X, UploadCloud, File as FileIcon, ShieldCheck, CheckCircle2, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { uploadResumableFile } from '../api/client.js';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
  onUploadSuccess: () => Promise<void>;
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  parentId,
  onUploadSuccess,
}) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const addFilesToQueue = (fileList: FileList | File[]) => {
    const newItems: QueuedFile[] = [];
    Array.from(fileList).forEach((file) => {
      const isDuplicate = queue.some(
        (q) => q.file.name === file.name && q.file.size === file.size
      );
      if (!isDuplicate) {
        newItems.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          status: 'pending',
          progress: 0,
        });
      }
    });
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    if (isUploading) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isUploading) return;
    setQueue([]);
  };

  const handleUploadAll = async () => {
    const pendingItems = queue.filter((item) => item.status === 'pending' || item.status === 'error');
    if (pendingItems.length === 0 || isUploading) return;

    setIsUploading(true);
    let anySuccess = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'completed') continue;

      setActiveFileIndex(i);
      setQueue((prev) =>
        prev.map((q, idx) =>
          idx === i ? { ...q, status: 'uploading', progress: 0, error: undefined } : q
        )
      );

      try {
        await uploadResumableFile(
          item.file,
          parentId,
          (pct, currentChunk, totalChunks) => {
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === i
                  ? {
                      ...q,
                      progress: pct,
                      currentChunk,
                      totalChunks,
                    }
                  : q
              )
            );
          }
        );

        anySuccess = true;
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'completed', progress: 100 } : q
          )
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: 'error',
                  error: err.message || 'Upload failed',
                }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    setActiveFileIndex(null);

    if (anySuccess) {
      await onUploadSuccess();
    }
  };

  const totalFiles = queue.length;
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'error').length;
  const totalBytes = queue.reduce((acc, q) => acc + q.file.size, 0);
  const allCompleted = totalFiles > 0 && completedCount === totalFiles;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-[#0B0B0C] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#27272A] shadow-black/80 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Resumable File Upload</h3>
                {totalFiles > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30">
                    {completedCount}/{totalFiles}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Multi-File Queue & SHA-256 Slices</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isUploading) onClose();
            }}
            disabled={isUploading}
            className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#18181B] rounded-lg transition disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? 'border-[#C6F432] bg-[#C6F432]/5'
                : queue.length > 0
                ? 'border-[#27272A] hover:border-[#3F3F46] bg-[#121214]'
                : 'border-[#27272A] hover:border-[#3F3F46] bg-[#121214] py-8'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  addFilesToQueue(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] text-[#C6F432] flex items-center justify-center mb-2">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-white">Click or drag & drop files here</p>
            <p className="text-xs text-[#71717A] mt-0.5">Select multiple files for chunked resumable upload</p>
          </div>

          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA] px-1">
                <span>Queue ({queue.length} files • {formatBytes(totalBytes)})</span>
                {!isUploading && (
                  <button
                    onClick={clearQueue}
                    className="text-[#71717A] hover:text-rose-400 text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition ${
                      item.status === 'uploading'
                        ? 'bg-[#18181B] border-[#C6F432]/50 shadow-md shadow-[#C6F432]/5'
                        : item.status === 'completed'
                        ? 'bg-[#121214] border-[#27272A]/80 opacity-90'
                        : item.status === 'error'
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : 'bg-[#18181B] border-[#27272A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-1.5 rounded-lg bg-[#0B0B0C] text-[#C6F432] shrink-0">
                          <FileIcon className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-white truncate max-w-[220px]">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-[#71717A]">{formatBytes(item.file.size)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'pending' && (
                          <span className="text-[10px] font-medium text-[#71717A] px-2 py-0.5 rounded-full bg-[#27272A]">
                            Pending
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#C6F432] font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>{item.progress}%</span>
                          </div>
                        )}
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C6F432] px-2 py-0.5 rounded-full bg-[#C6F432]/10 border border-[#C6F432]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        )}

                        {!isUploading && item.status !== 'uploading' && (
                          <button
                            onClick={() => removeFile(item.id)}
                            className="p-1 text-[#71717A] hover:text-white hover:bg-[#27272A] rounded-md transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {item.status === 'uploading' && (
                      <div className="mt-2 space-y-1">
                        <div className="w-full bg-[#27272A] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#C6F432] h-1.5 rounded-full transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        {item.currentChunk && item.totalChunks && (
                          <p className="text-[9px] text-[#A1A1AA] text-right font-mono">
                            Chunk {item.currentChunk} of {item.totalChunks}
                          </p>
                        )}
                      </div>
                    )}

                    {item.status === 'error' && item.error && (
                      <p className="mt-1.5 text-[10px] text-rose-400 bg-rose-500/10 rounded px-2 py-1">
                        {item.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#27272A] mt-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C6F432]" />
            <span>5MB chunk verified hashing</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white hover:bg-[#18181B] transition border border-[#27272A] disabled:opacity-40"
            >
              {allCompleted ? 'Close' : 'Cancel'}
            </button>

            {allCompleted ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider transition shadow-md shadow-[#C6F432]/10"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={pendingCount === 0 || isUploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider transition disabled:opacity-40 shadow-md shadow-[#C6F432]/10"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading ({activeFileIndex !== null ? activeFileIndex + 1 : 1}/{totalFiles})...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload {pendingCount > 0 ? `${pendingCount} Files` : 'Files'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
