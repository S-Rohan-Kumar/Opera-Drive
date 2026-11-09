import React from 'react';
import type { Folder as FolderType } from '../types/index.js';
import { Folder, Trash2, UserPlus } from 'lucide-react';

interface FolderGridProps {
  folders: FolderType[];
  onOpenFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
  onShareFolder?: (folder: FolderType) => void;
}

export const FolderGrid: React.FC<FolderGridProps> = ({
  folders,
  onOpenFolder,
  onDeleteFolder,
  onShareFolder,
}) => {
  if (folders.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-3 flex items-center gap-2">
        <span>Folders</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#27272A] text-white">
          {folders.length}
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="group flex items-center justify-between p-3.5 bg-[#18181B] border border-[#27272A] hover:border-[#C6F432]/50 rounded-2xl hover:shadow-lg hover:shadow-[#C6F432]/5 cursor-pointer transition select-none"
          >
            <div
              onClick={() => onOpenFolder(folder)}
              className="flex items-center gap-3 overflow-hidden flex-1"
            >
              <div className="w-10 h-10 rounded-xl bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center shrink-0 group-hover:bg-[#C6F432] group-hover:text-[#0B0B0C] transition duration-200">
                <Folder className="w-5 h-5 fill-current" />
              </div>
              <span className="text-sm font-semibold text-white truncate group-hover:text-[#C6F432] transition">
                {folder.name}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
              {onShareFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareFolder(folder);
                  }}
                  title="Share folder"
                  className="p-1.5 text-[#A1A1AA] hover:text-[#C6F432] hover:bg-[#202024] rounded-lg transition"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete folder "${folder.name}"?`)) {
                    onDeleteFolder(folder.id);
                  }
                }}
                title="Delete folder"
                className="p-1.5 text-[#A1A1AA] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
