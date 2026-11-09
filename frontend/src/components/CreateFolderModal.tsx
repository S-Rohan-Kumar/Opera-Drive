import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await onCreate(name.trim());
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-[#0B0B0C] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#27272A] shadow-black/80">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#27272A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">New Folder</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#18181B] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-white placeholder-[#71717A] focus:border-[#C6F432] focus:outline-none transition"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white hover:bg-[#18181B] transition border border-[#27272A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider transition disabled:opacity-40 shadow-md shadow-[#C6F432]/10"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
