import React, { useState, useRef, useEffect } from 'react';
import { HardDrive, Plus, FolderPlus, Upload, Users, Cloud, Trash2 } from 'lucide-react';

export type SidebarTab = 'my-drive' | 'shared-with-me' | 'trash';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  onOpenCreateFolder: () => void;
  onOpenUploadFile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenCreateFolder,
  onOpenUploadFile,
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
    <aside className="w-64 bg-[#0B0B0C] border-r border-[#27272A] p-4 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] font-bold text-sm transition shadow-lg shadow-[#C6F432]/10 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>New Upload / Folder</span>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-[#18181B] rounded-xl shadow-2xl border border-[#27272A] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenCreateFolder();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#202024] hover:text-[#C6F432] transition"
              >
                <FolderPlus className="w-4 h-4 text-[#A1A1AA]" />
                <span>New folder</span>
              </button>
              <div className="h-px bg-[#27272A] my-1" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenUploadFile();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#202024] hover:text-[#C6F432] transition"
              >
                <Upload className="w-4 h-4 text-[#A1A1AA]" />
                <span>Chunked file upload</span>
              </button>
            </div>
          )}
        </div>

        <nav className="space-y-1.5">
          <button
            onClick={() => onSelectTab('my-drive')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'my-drive'
                ? 'bg-[#18181B] text-[#C6F432] border border-[#C6F432]/30 shadow-sm'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
            }`}
          >
            <HardDrive className={`w-4 h-4 ${activeTab === 'my-drive' ? 'text-[#C6F432]' : ''}`} />
            <span>My Drive</span>
          </button>

          <button
            onClick={() => onSelectTab('shared-with-me')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'shared-with-me'
                ? 'bg-[#18181B] text-[#C6F432] border border-[#C6F432]/30 shadow-sm'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'shared-with-me' ? 'text-[#C6F432]' : ''}`} />
            <span>Shared with me</span>
          </button>

          <button
            onClick={() => onSelectTab('trash')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'trash'
                ? 'bg-[#18181B] text-[#C6F432] border border-[#C6F432]/30 shadow-sm'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
            }`}
          >
            <Trash2 className={`w-4 h-4 ${activeTab === 'trash' ? 'text-[#C6F432]' : ''}`} />
            <span>Trash</span>
          </button>
        </nav>
      </div>

      <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
        <div className="flex items-center gap-2 text-white text-xs font-semibold mb-2">
          <Cloud className="w-4 h-4 text-[#C6F432]" />
          <span>Local Storage</span>
        </div>
        <div className="w-full bg-[#27272A] rounded-full h-1.5 mb-2 overflow-hidden">
          <div className="bg-[#C6F432] h-1.5 rounded-full w-1/4 shadow-sm shadow-[#C6F432]/50" />
        </div>
        <p className="text-[11px] text-[#A1A1AA]">MinIO Blob Storage (S3 API)</p>
      </div>
    </aside>
  );
};
