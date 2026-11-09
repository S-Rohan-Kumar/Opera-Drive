import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Cloud, LogOut, Search, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, onSearchChange }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#0B0B0C] border-b border-[#27272A] px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
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

      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files and folders..."
            className="w-full pl-10 pr-4 py-2 bg-[#18181B] hover:bg-[#202024] focus:bg-[#18181B] rounded-xl border border-[#27272A] focus:border-[#C6F432] focus:outline-none text-sm text-white placeholder-[#71717A] transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
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
