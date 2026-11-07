import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Cloud, LogOut, Search, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Cloud className="w-6 h-6" />
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">Opera Drive</span>
      </div>

      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search in Drive"
            className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white rounded-xl border border-transparent focus:border-slate-300 focus:outline-none text-sm transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
            {user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
