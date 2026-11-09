import React, { useState, useEffect, useRef } from 'react';
import { X, History, Download, RotateCcw, Check, Sparkles, Upload } from 'lucide-react';
import { listFileVersions, rollbackFileVersion, downloadFileVersion, uploadResumableFile } from '../api/client.js';
import type { DriveFile, FileVersion } from '../types/index.js';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: DriveFile | null;
  onVersionRolledBack: () => void;
}

function formatBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!num || isNaN(num) || num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  file,
  onVersionRolledBack,
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);

  const loadVersions = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listFileVersions(file.id);
      setVersions(data.versions);
    } catch (err: any) {
      setError(err.message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && file) {
      loadVersions();
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleRollback = async (version: FileVersion) => {
    if (version.is_current) return;
    if (!window.confirm(`Rollback "${file.name}" to Version ${version.version_number}?`)) return;

    setRollingBackId(version.id);
    setError(null);
    try {
      await rollbackFileVersion(file.id, version.id);
      await loadVersions();
      onVersionRolledBack();
    } catch (err: any) {
      setError(err.message || 'Failed to rollback version');
    } finally {
      setRollingBackId(null);
    }
  };

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !file) return;
    const selectedFile = e.target.files[0];
    const renamedFile = new File([selectedFile], file.name, { type: selectedFile.type });

    setUploadingVersion(true);
    setUploadProgress(0);
    setError(null);
    try {
      await uploadResumableFile(
        renamedFile,
        file.parent_id,
        (pct) => setUploadProgress(pct),
        file.id
      );
      await loadVersions();
      onVersionRolledBack();
    } catch (err: any) {
      setError(err.message || 'Failed to upload new version');
    } finally {
      setUploadingVersion(false);
      if (versionInputRef.current) versionInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B0B0C] border border-[#27272A] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Version History</h3>
              <p className="text-[11px] text-[#A1A1AA] truncate max-w-sm">{file.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={versionInputRef}
              onChange={handleUploadNewVersion}
              className="hidden"
            />
            <button
              onClick={() => versionInputRef.current?.click()}
              disabled={uploadingVersion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{uploadingVersion ? `${uploadProgress}%` : 'Upload New Version'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#18181B] rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {uploadingVersion && (
            <div className="p-3 rounded-xl bg-[#18181B] border border-[#C6F432]/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">Uploading new version...</span>
                <span className="text-[#C6F432] font-mono font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-[#27272A] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#C6F432] h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          {loading ? (
            <div className="py-8 text-center text-xs text-[#71717A]">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71717A]">No versions found.</div>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between ${
                    v.is_current
                      ? 'bg-[#18181B] border-[#C6F432]/40 shadow-sm shadow-[#C6F432]/5'
                      : 'bg-[#121214] border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Version {v.version_number}</span>
                      {v.is_current && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C6F432] text-[#0B0B0C] uppercase tracking-wider">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Current</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#A1A1AA]">
                      {formatBytes(v.size_bytes)} • {new Date(v.created_at).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#71717A] font-mono truncate max-w-xs md:max-w-md">
                      SHA-256: {v.checksum_sha256}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadFileVersion(file.id, v.id, `${file.name}-v${v.version_number}`)}
                      title="Download this snapshot"
                      className="p-2 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#202024] rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {!v.is_current && (
                      <button
                        onClick={() => handleRollback(v)}
                        disabled={rollingBackId === v.id || uploadingVersion}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#C6F432] hover:text-[#0B0B0C] text-xs font-semibold text-white transition disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{rollingBackId === v.id ? 'Reverting...' : 'Rollback'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 bg-[#121214] border-t border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
            <Sparkles className="w-3.5 h-3.5 text-[#C6F432]" />
            <span>Rollbacks are instant $O(1)$ metadata pointer updates.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#202024] text-white font-medium text-xs transition border border-[#27272A]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
