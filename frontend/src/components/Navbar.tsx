import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Cloud, LogOut, Search, User as UserIcon, X, Folder, FileText, Image, FileCode, File as FileIcon, History, Download, RefreshCw } from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client.js';

interface SearchResultFolder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_name: string;
}

interface SearchResultFile {
  id: string;
  name: string;
  parent_id: string | null;
  version_number?: number;
  size_bytes: string | number;
  mime_type: string;
  owner_name: string;
}

interface SearchResponse {
  folders: SearchResultFolder[];
  files: SearchResultFile[];
  totalMatches: number;
}

interface NavbarProps {
  onOpenFolder?: (folder: { id: string; name: string }) => void;
  onOpenVersions?: (file: any) => void;
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
  if (mime.startsWith('image/')) return <Image className="w-4 h-4 text-purple-400" />;
  if (mime.includes('pdf') || mime.includes('text') || mime.includes('word')) return <FileText className="w-4 h-4 text-rose-400" />;
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript')) {
    return <FileCode className="w-4 h-4 text-[#C6F432]" />;
  }
  return <FileIcon className="w-4 h-4 text-sky-400" />;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenFolder, onOpenVersions }) => {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders' | 'images' | 'documents'>('all');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({
          q: searchTerm.trim(),
          type: filterType,
          limit: '15',
        });
        const res = await apiRequest<SearchResponse>(`/search?${queryParams.toString()}`);
        setResults(res);
        setIsOpen(true);
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchTerm, filterType]);

  const handleClear = () => {
    setSearchTerm('');
    setResults(null);
    setIsOpen(false);
  };

  return (
    <header className="h-16 bg-[#0B0B0C] border-b border-[#27272A] px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-[#C6F432] rounded-xl flex items-center justify-center text-[#0B0B0C] shadow-lg shadow-[#C6F432]/10">
          <Cloud className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white tracking-tight">Opera</span>
          <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30">
            Drive
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-8 relative hidden md:block" ref={searchContainerRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
            {loading ? (
              <RefreshCw className="w-4 h-4 text-[#C6F432] animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen && e.target.value.trim()) setIsOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim()) setIsOpen(true);
            }}
            placeholder="Search across files, folders, documents..."
            className="w-full pl-10 pr-9 py-2 bg-[#18181B] hover:bg-[#202024] focus:bg-[#18181B] rounded-xl border border-[#27272A] focus:border-[#C6F432] focus:outline-none text-sm text-white placeholder-[#71717A] transition"
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isOpen && searchTerm.trim() && (
          <div className="absolute left-0 right-0 mt-2 bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-3 border-b border-[#27272A]/80 flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
              {(['all', 'files', 'folders', 'images', 'documents'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition ${
                    filterType === t
                      ? 'bg-[#C6F432] text-[#0B0B0C] font-bold shadow-sm shadow-[#C6F432]/20'
                      : 'text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-[#27272A]/60">
              {loading && !results ? (
                <div className="py-8 text-center text-xs text-[#A1A1AA] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#C6F432] animate-spin" />
                  <span>Searching with Trigram GIN index...</span>
                </div>
              ) : results && results.totalMatches === 0 ? (
                <div className="py-8 text-center text-xs text-[#A1A1AA]">
                  No matching files or folders found for "{searchTerm}"
                </div>
              ) : (
                <>
                  {results && results.folders.length > 0 && (
                    <div className="p-2">
                      <p className="px-2 py-1 text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                        Folders ({results.folders.length})
                      </p>
                      {results.folders.map((folder) => (
                        <div
                          key={folder.id}
                          onClick={() => {
                            if (onOpenFolder) onOpenFolder(folder);
                            setIsOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#202024] cursor-pointer transition group"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="p-1.5 rounded-lg bg-[#0B0B0C] text-[#C6F432] border border-[#27272A]">
                              <Folder className="w-4 h-4 fill-current" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-semibold text-white truncate group-hover:text-[#C6F432] transition">
                                {folder.name}
                              </p>
                              <p className="text-[10px] text-[#71717A]">By {folder.owner_name}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-[#71717A]">Open</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {results && results.files.length > 0 && (
                    <div className="p-2">
                      <p className="px-2 py-1 text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                        Files ({results.files.length})
                      </p>
                      {results.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#202024] transition group"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="p-1.5 rounded-lg bg-[#0B0B0C] border border-[#27272A] shrink-0">
                              {getFileIcon(file.mime_type)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-semibold text-white truncate max-w-[200px] group-hover:text-[#C6F432] transition">
                                {file.name}
                              </p>
                              <p className="text-[10px] text-[#71717A]">
                                {formatBytes(file.size_bytes)} • By {file.owner_name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30">
                              v{file.version_number ?? 1}
                            </span>
                            {onOpenVersions && (
                              <button
                                onClick={() => {
                                  onOpenVersions(file);
                                  setIsOpen(false);
                                }}
                                title="Version history"
                                className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => downloadFile(file.id, file.name)}
                              title="Download file"
                              className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#27272A] rounded-lg transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#18181B] border border-[#27272A]">
          <div className="w-7 h-7 rounded-lg bg-[#C6F432] text-[#0B0B0C] flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-white leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-[#A1A1AA] leading-tight">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-[#71717A] hover:text-[#C6F432] hover:bg-[#18181B] rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
