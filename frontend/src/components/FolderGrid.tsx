import React from 'react';
import type { Folder as FolderType } from '../types/index.js';
import { Folder, Trash2 } from 'lucide-react';

interface FolderGridProps {
  folders: FolderType[];
  onOpenFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
}

export const FolderGrid: React.FC<FolderGridProps> = ({
  folders,
  onOpenFolder,
  onDeleteFolder,
}) => {
  if (folders.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Folders
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="group flex items-center justify-between p-3.5 bg-white border border-slate-200 hover:border-blue-400 rounded-2xl hover:shadow-sm cursor-pointer transition select-none"
          >
            <div
              onClick={() => onOpenFolder(folder)}
              className="flex items-center gap-3 overflow-hidden flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                <Folder className="w-5 h-5 fill-current" />
              </div>
              <span className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition">
                {folder.name}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete folder "${folder.name}"?`)) {
                  onDeleteFolder(folder.id);
                }
              }}
              title="Delete folder"
              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
