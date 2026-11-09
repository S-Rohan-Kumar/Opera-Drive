import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Cloud, Lock, Mail, User as UserIcon } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-[#121214] rounded-2xl shadow-2xl p-8 border border-[#27272A] shadow-black/80">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#C6F432] rounded-2xl flex items-center justify-center text-[#0B0B0C] mb-3 shadow-xl shadow-[#C6F432]/10">
            <Cloud className="w-9 h-9 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Opera</h1>
            <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30">
              Drive
            </span>
          </div>
          <p className="text-[#A1A1AA] text-xs mt-1.5">
            {isRegister ? 'Create an account to start storing files' : 'Sign in to access your cloud files'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-white placeholder-[#71717A] focus:border-[#C6F432] focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-11 pr-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-white placeholder-[#71717A] focus:border-[#C6F432] focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-white placeholder-[#71717A] focus:border-[#C6F432] focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] font-extrabold text-sm uppercase tracking-wider transition duration-150 disabled:opacity-50 shadow-lg shadow-[#C6F432]/10 mt-2"
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-[#A1A1AA] hover:text-[#C6F432] transition font-medium"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
