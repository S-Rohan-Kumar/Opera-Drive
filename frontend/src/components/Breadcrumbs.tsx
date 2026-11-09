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
    <nav className="flex items-center gap-1.5 text-sm text-[#A1A1AA] mb-6 flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 font-medium text-white hover:text-[#C6F432] transition px-2 py-1 rounded-lg hover:bg-[#18181B]"
      >
        <HardDrive className="w-4 h-4 text-[#C6F432]" />
        <span>My Drive</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id ?? index}>
            <ChevronRight className="w-4 h-4 text-[#71717A] shrink-0" />
            <button
              onClick={() => onNavigate(item.id)}
              disabled={isLast}
              className={`px-2 py-1 rounded-lg transition font-medium truncate max-w-[200px] ${
                isLast
                  ? 'text-[#C6F432] font-semibold cursor-default bg-[#18181B] border border-[#27272A]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
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
