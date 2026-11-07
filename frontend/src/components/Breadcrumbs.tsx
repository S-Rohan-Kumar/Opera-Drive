import React from 'react';
import { ChevronRight, HardDrive } from 'lucide-react';

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-6 flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 transition p-1 rounded-lg hover:bg-slate-100"
      >
        <HardDrive className="w-4 h-4 text-blue-600" />
        <span>My Drive</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id ?? index}>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            <button
              onClick={() => onNavigate(item.id)}
              disabled={isLast}
              className={`p-1 rounded-lg transition font-medium truncate max-w-[200px] ${
                isLast
                  ? 'text-slate-800 font-semibold cursor-default'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
            >
              {item.name}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
