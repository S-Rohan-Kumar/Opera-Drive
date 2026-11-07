import React, { useState, useRef, useEffect } from 'react';
import { HardDrive, Plus, FolderPlus, Upload, Trash2, Cloud } from 'lucide-react';

interface SidebarProps {
  onOpenCreateFolder: () => void;
  onOpenUploadFile: () => void;
  onNavigateHome: () => void;
  totalStorageUsage?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenCreateFolder,
  onOpenUploadFile,
  onNavigateHome,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition shadow-sm hover:shadow"
          >
            <Plus className="w-5 h-5 text-blue-600" />
            <span>New</span>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenCreateFolder();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                <FolderPlus className="w-4 h-4 text-slate-500" />
                <span>New folder</span>
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenUploadFile();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>File upload</span>
              </button>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium text-sm transition"
          >
            <HardDrive className="w-4 h-4" />
            <span>My Drive</span>
          </button>
          <button
            disabled
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 font-medium text-sm cursor-not-allowed opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            <span>Trash (Phase 4)</span>
          </button>
        </nav>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold mb-2">
          <Cloud className="w-4 h-4 text-blue-600" />
          <span>Storage</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
          <div className="bg-blue-600 h-1.5 rounded-full w-2/12" />
        </div>
        <p className="text-[11px] text-slate-500">MinIO Local Object Storage</p>
      </div>
    </aside>
  );
};
