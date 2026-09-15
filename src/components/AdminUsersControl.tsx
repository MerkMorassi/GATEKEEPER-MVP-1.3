import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Key,
  Mail,
  Calendar,
  Lock,
  Sparkles,
} from 'lucide-react';
import { UserRecord, UserRole } from '../types';
import { apiFetch } from '../lib/api';

export const AdminUsersControl: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Create Modal
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formRole, setFormRole] = useState<UserRole>('CLIENT');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formDisplayName, setFormDisplayName] = useState<string>('');
  const [formPasscode, setFormPasscode] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  const fetchUsers = async (targetPage = page, targetRole = roleFilter, targetSearch = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '10',
      });
      if (targetRole !== 'ALL') params.append('role', targetRole);
      if (targetSearch.trim()) params.append('search', targetSearch.trim());

      const res = await apiFetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.users) {
        setUsers(data.users);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
          setTotalRecords(data.pagination.total);
        }
      } else {
        setError(data.error || 'Failed to fetch user directory.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, roleFilter, searchQuery);
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, roleFilter, searchQuery);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: formRole,
          email: formEmail.trim().toLowerCase(),
          displayName: formDisplayName.trim(),
          passcode: formPasscode.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setSuccessMessage(`User record [${data.user.role}] created: ${data.user.id} (${data.user.email})`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setIsCreating(false);
        setFormEmail('');
        setFormDisplayName('');
        setFormPasscode('');
        fetchUsers(1, roleFilter, searchQuery);
      } else {
        setError(data.error || 'Failed to create user record.');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating user record.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove user ${email} (ID: ${id})?`)) return;

    try {
      const res = await apiFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`User ${id} removed.`);
        setTimeout(() => setSuccessMessage(null), 3500);
        fetchUsers(page, roleFilter, searchQuery);
      } else {
        setError(data.error || 'Failed to remove user.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting user.');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-danger-a0/15 text-danger-a0 border border-danger-a0/30 flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>ADMIN</span>
          </span>
        );
      case 'PROVIDER':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-info-a0/15 text-info-a0 border border-info-a0/30 flex items-center space-x-1">
            <UserCheck className="w-3 h-3" />
            <span>PROVIDER</span>
          </span>
        );
      case 'CLIENT':
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-success-a0/15 text-success-a0 border border-success-a0/30 flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>CLIENT</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-a10">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-theme-light flex items-center space-x-2">
              <Users className="w-5 h-5 text-info-a0" />
              <span>User ID & Role Classification Directory</span>
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-info-a0/10 text-info-a0 border border-info-a0/20">
              Lightweight JSON DB
            </span>
          </div>
          <p className="text-xs text-surface-a40 mt-1 font-mono">
            Classify and store User IDs across ADMIN, CLIENT, and PROVIDER personas with auto-provisioning.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchUsers(page, roleFilter, searchQuery)}
            disabled={loading}
            className="p-2.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono flex items-center space-x-2"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-info-a0' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2.5 bg-info-a0 hover:bg-info-a10 text-primary-a0 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-danger-a0/10 border border-danger-a0/30 rounded-xl flex items-center space-x-3 text-xs text-danger-a0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-success-a0/10 border border-success-a0/30 rounded-xl flex items-center space-x-3 text-xs text-success-a0">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface-a0 border border-surface-a10 p-4 rounded-2xl">
        {/* Role Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {(['ALL', 'ADMIN', 'CLIENT', 'PROVIDER'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                roleFilter === r
                  ? 'bg-info-a0 text-primary-a0 font-bold shadow-sm'
                  : 'bg-tonal-a0 text-surface-a40 hover:text-theme-light border border-surface-a10'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-surface-a40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search User ID, Email, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-tonal-a0 border border-surface-a10 rounded-xl text-xs text-theme-light placeholder-surface-a40 focus:outline-none focus:border-info-a0 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table / List */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-a10/60 bg-tonal-a0/40 text-[11px] font-mono uppercase tracking-wider text-surface-a40">
                <th className="py-3.5 px-4">User ID</th>
                <th className="py-3.5 px-4">Role Classification</th>
                <th className="py-3.5 px-4">Identity / Email</th>
                <th className="py-3.5 px-4">Display Name</th>
                <th className="py-3.5 px-4">Created / Last Active</th>
                <th className="py-3.5 px-4">Metadata</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-a10/40 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-a40">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-info-a0" />
                    <span>Loading User Directory...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-a40">
                    <span>No user records found matching criteria.</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-tonal-a0/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-theme-light">
                      <span className="bg-tonal-a0 px-2 py-1 rounded border border-surface-a10 text-[11px]">
                        {u.id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3 px-4 text-theme-light">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3 h-3 text-info-a0 flex-shrink-0" />
                        <span className="font-medium truncate max-w-[180px]">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-surface-a40">
                      <span className="text-theme-light font-medium">{u.displayName || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-surface-a40 space-y-0.5">
                      <div className="flex items-center space-x-1 text-surface-a40">
                        <Calendar className="w-3 h-3 text-surface-a40" />
                        <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                      {u.lastActiveAt && (
                        <div className="text-[10px] text-info-a0">
                          Active {new Date(u.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {u.metadata?.source === 'auto_provision_checkout' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-warning-a0/10 text-warning-a0 border border-warning-a0/20 text-[10px]">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Auto-Provisioned</span>
                        </span>
                      ) : u.metadata?.source === 'system_seed' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-info-a0/10 text-info-a0 border border-info-a0/20 text-[10px]">
                          <span>System Seed</span>
                        </span>
                      ) : (
                        <span className="text-surface-a40 text-[10px]">
                          {u.metadata ? Object.keys(u.metadata).length + ' fields' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== 'usr_adm_001' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 text-surface-a40 hover:text-danger-a0 hover:bg-danger-a0/10 rounded-lg transition-all"
                          title="Remove user record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-a10 flex items-center justify-between text-xs font-mono text-surface-a40">
            <span>
              Showing {users.length} of {totalRecords} users
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  fetchUsers(p, roleFilter, searchQuery);
                }}
                className="px-3 py-1 bg-tonal-a0 hover:bg-surface-a10 rounded-lg disabled:opacity-40 transition-all"
              >
                Prev
              </button>
              <span className="text-theme-light">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  fetchUsers(p, roleFilter, searchQuery);
                }}
                className="px-3 py-1 bg-tonal-a0 hover:bg-surface-a10 rounded-lg disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Provision User Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-primary-a0/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-a0 border border-surface-a10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-a10">
              <h3 className="text-base font-bold text-theme-light flex items-center space-x-2">
                <Plus className="w-4 h-4 text-info-a0" />
                <span>Provision User ID & Classification</span>
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-surface-a40 hover:text-theme-light"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-surface-a40 uppercase tracking-wider text-[10px] mb-1">
                  Classification Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CLIENT', 'PROVIDER', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRole(r)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        formRole === r
                          ? 'bg-info-a0 text-primary-a0 border-info-a0 shadow-sm'
                          : 'bg-tonal-a0 text-surface-a40 hover:text-theme-light border-surface-a10'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-surface-a40 uppercase tracking-wider text-[10px] mb-1">
                  Primary Email (Login Handle)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full p-3 bg-tonal-a0 border border-surface-a10 rounded-xl text-theme-light placeholder-surface-a40 focus:outline-none focus:border-info-a0"
                />
              </div>

              <div>
                <label className="block text-surface-a40 uppercase tracking-wider text-[10px] mb-1">
                  Display Name / Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full p-3 bg-tonal-a0 border border-surface-a10 rounded-xl text-theme-light placeholder-surface-a40 focus:outline-none focus:border-info-a0"
                />
              </div>

              <div>
                <label className="block text-surface-a40 uppercase tracking-wider text-[10px] mb-1">
                  Passcode / Secret (Optional Quick-Access)
                </label>
                <input
                  type="text"
                  placeholder={`Default: ${formRole.toLowerCase()}`}
                  value={formPasscode}
                  onChange={(e) => setFormPasscode(e.target.value)}
                  className="w-full p-3 bg-tonal-a0 border border-surface-a10 rounded-xl text-theme-light placeholder-surface-a40 focus:outline-none focus:border-info-a0"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-surface-a10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-tonal-a0 text-surface-a40 hover:text-theme-light rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-info-a0 hover:bg-info-a10 text-primary-a0 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save User Record</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
