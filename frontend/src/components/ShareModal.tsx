import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, Check } from 'lucide-react';
import { shareResource, listResourcePermissions, revokeResourcePermission } from '../api/client.js';
import type { Permission } from '../types/index.js';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const list = await listResourcePermissions(resourceType, resourceId);
      setPermissions(list);
    } catch (err: any) {
      console.warn('Could not load permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setEmail('');
      loadPermissions();
    }
  }, [isOpen, resourceId, resourceType]);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await shareResource(resourceType, resourceId, email.trim(), role);
      setSuccessMsg(`Successfully granted ${role} access to ${email}`);
      setEmail('');
      await loadPermissions();
    } catch (err: any) {
      setError(err.message || 'Failed to share resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (permissionId: string, userEmail: string) => {
    if (!window.confirm(`Revoke access for ${userEmail}?`)) return;
    try {
      await revokeResourcePermission(permissionId);
      await loadPermissions();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke permission');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B0B0C] border border-[#27272A] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Share "{resourceName}"</h3>
              <p className="text-[11px] text-[#A1A1AA] uppercase tracking-wider">{resourceType} Sharing & ACL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#18181B] rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleShare} className="space-y-4">
            <label className="block text-xs font-semibold text-white">Add Collaborator</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-white placeholder-[#71717A] focus:border-[#C6F432] focus:outline-none transition"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                className="px-3 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs font-semibold text-white focus:border-[#C6F432] focus:outline-none transition cursor-pointer"
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="editor">Editor (Upload versions)</option>
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-[#C6F432] hover:bg-[#b2dc2b] text-[#0B0B0C] font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
              >
                {submitting ? 'Sharing...' : 'Share'}
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-[#C6F432] bg-[#C6F432]/10 border border-[#C6F432]/20 px-3 py-2 rounded-xl flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{successMsg}</span>
              </p>
            )}
          </form>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
              People with Access ({permissions.length})
            </h4>

            {loading ? (
              <div className="py-6 text-center text-xs text-[#71717A]">Loading collaborators...</div>
            ) : permissions.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#71717A] bg-[#18181B] border border-[#27272A] rounded-xl">
                Only you have access to this resource.
              </div>
            ) : (
              <div className="divide-y divide-[#27272A] border border-[#27272A] bg-[#18181B] rounded-xl max-h-48 overflow-y-auto">
                {permissions.map((p) => {
                  const userEmail = p.email || p.user?.email || 'User';
                  const userName = p.full_name || p.user?.full_name || userEmail;
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#27272A] text-white flex items-center justify-center font-bold text-xs">
                          {userName[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{userName}</p>
                          <p className="text-[10px] text-[#A1A1AA]">{userEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 uppercase">
                          <Shield className="w-2.5 h-2.5" />
                          <span>{p.role}</span>
                        </span>
                        <button
                          onClick={() => handleRevoke(p.id, userEmail)}
                          title="Revoke access"
                          className="p-1 text-[#71717A] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#121214] border-t border-[#27272A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#202024] text-white font-medium text-xs transition border border-[#27272A]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
