import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Code2,
  Play,
  Globe,
  Lock,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ApiKeyRecord } from '../types';
import { apiFetch } from '../lib/api';

export const AdminApiControl: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create Key Modal / Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'test'>('live');
  const [newKeyRole, setNewKeyRole] = useState<'TENANT_ADMIN' | 'READ_WRITE' | 'SCANNER_ONLY' | 'READ_ONLY'>('TENANT_ADMIN');
  const [newKeyDomains, setNewKeyDomains] = useState('*');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(120);
  const [createdKeySecret, setCreatedKeySecret] = useState<ApiKeyRecord | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Playground State
  const [selectedEndpoint, setSelectedEndpoint] = useState<'create_session' | 'verify_pass' | 'inspect_pass' | 'release_escrow'>('create_session');
  const [playgroundApiKey, setPlaygroundApiKey] = useState('');
  const [playgroundPayload, setPlaygroundPayload] = useState(
    JSON.stringify(
      {
        serviceId: 'srv_1',
        clientEmail: 'vip.client@example.com',
        clientName: 'VIP Client',
        clientNotes: 'Executive Strategy Session',
        customDurationMinutes: 30,
      },
      null,
      2
    )
  );
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundStatus, setPlaygroundStatus] = useState<number | null>(null);

  // Active Code Snippet Tab
  const [snippetTab, setSnippetTab] = useState<'widget' | 'curl' | 'node' | 'python'>('widget');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/admin/keys');
      const data = await res.json();
      if (data.success && data.keys) {
        setKeys(data.keys);
        if (data.keys.length > 0 && !playgroundApiKey) {
          setPlaygroundApiKey(data.keys[0].key);
        }
      } else {
        setError(data.error || 'Failed to load API keys.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading API keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setNotice(null);
      const allowedDomains = newKeyDomains
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await apiFetch('/api/admin/keys', {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment: newKeyEnv,
          role: newKeyRole,
          allowedDomains: allowedDomains.length > 0 ? allowedDomains : ['*'],
          rateLimitPerMinute: Number(newKeyRateLimit) || 120,
        }),
      });

      const data = await res.json();
      if (data.success && data.key) {
        setCreatedKeySecret(data.key);
        setKeys((prev) => [data.key, ...prev]);
        setNewKeyName('');
        setNewKeyDomains('*');
        setNotice('API Key created successfully!');
      } else {
        setError(data.error || 'Failed to create API key.');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating key.');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? External clients using it will be blocked immediately.')) {
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/keys/${keyId}/revoke`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, status: 'revoked' } : k)));
        setNotice(`Key ${keyId} revoked.`);
      } else {
        setError(data.error || 'Failed to revoke key.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Permanently delete this API key record?')) return;

    try {
      const res = await apiFetch(`/api/admin/keys/${keyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
        setNotice(`Key ${keyId} removed.`);
      } else {
        setError(data.error || 'Failed to delete key.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleEndpointSelect = (ep: 'create_session' | 'verify_pass' | 'inspect_pass' | 'release_escrow') => {
    setSelectedEndpoint(ep);
    setPlaygroundResponse(null);
    setPlaygroundStatus(null);

    if (ep === 'create_session') {
      setPlaygroundPayload(
        JSON.stringify(
          {
            serviceId: 'srv_1',
            clientEmail: 'vip.client@example.com',
            clientName: 'VIP Client',
            clientNotes: 'Executive Consultation',
            customDurationMinutes: 30,
          },
          null,
          2
        )
      );
    } else if (ep === 'verify_pass') {
      setPlaygroundPayload(
        JSON.stringify(
          {
            passToken: 'TKT-DEMO-001',
            serviceId: 'srv_1',
            operator: 'pos_scanner_station_1',
          },
          null,
          2
        )
      );
    } else if (ep === 'inspect_pass') {
      setPlaygroundPayload(
        JSON.stringify(
          {
            passToken: 'TKT-DEMO-001',
          },
          null,
          2
        )
      );
    } else if (ep === 'release_escrow') {
      setPlaygroundPayload(
        JSON.stringify(
          {
            orderId: 'ord_v1_demo',
            reason: 'Delivered VIP Session via FaceTime / Stream',
          },
          null,
          2
        )
      );
    }
  };

  const handleRunPlayground = async () => {
    if (!playgroundApiKey) {
      setError('Please select or enter an active API key to test.');
      return;
    }

    setPlaygroundLoading(true);
    setPlaygroundResponse(null);
    setPlaygroundStatus(null);
    setError(null);

    try {
      let url = '/api/v1/checkout/sessions';
      let method = 'POST';
      let parsedBody: any = null;

      try {
        parsedBody = playgroundPayload.trim() ? JSON.parse(playgroundPayload) : {};
      } catch {
        setError('Invalid JSON payload syntax.');
        setPlaygroundLoading(false);
        return;
      }

      if (selectedEndpoint === 'create_session') {
        url = '/api/v1/checkout/sessions';
        method = 'POST';
      } else if (selectedEndpoint === 'verify_pass') {
        url = '/api/v1/passes/verify';
        method = 'POST';
      } else if (selectedEndpoint === 'inspect_pass') {
        const token = parsedBody.passToken || 'TKT-DEMO-001';
        url = `/api/v1/passes/${encodeURIComponent(token)}`;
        method = 'GET';
      } else if (selectedEndpoint === 'release_escrow') {
        url = '/api/v1/escrow/release';
        method = 'POST';
      }

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': playgroundApiKey.trim(),
        },
      };

      if (method !== 'GET' && method !== 'HEAD') {
        options.body = JSON.stringify(parsedBody);
      }

      const res = await fetch(url, options);
      setPlaygroundStatus(res.status);
      const data = await res.json();
      setPlaygroundResponse(data);
    } catch (err: any) {
      setPlaygroundStatus(500);
      setPlaygroundResponse({ success: false, error: err.message });
    } finally {
      setPlaygroundLoading(false);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gatekeeper.local';
  const activeKeySample = keys.find((k) => k.status === 'active')?.key || 'gk_live_your_api_key_here';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-primary-a20 border border-primary-a30 rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-primary-a00" />
              <h2 className="text-xl font-bold text-theme-light">API Keys & External Developer Protocol</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-success-a20 text-success-a00 border border-success-a30">
                Phase 1 Active
              </span>
            </div>
            <p className="text-sm text-theme-muted max-w-2xl">
              Manage developer authentication keys, monitor v1 endpoint verification traffic, test live payloads in the interactive API sandbox, and embed the zero-dependency checkout widget.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchKeys}
              className="px-3 py-2 text-xs font-medium text-theme-muted hover:text-theme-light bg-primary-a30 hover:bg-primary-a40 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setCreatedKeySecret(null);
              }}
              className="px-4 py-2 text-xs font-semibold bg-primary-a00 text-primary-a50 hover:bg-primary-a00/90 rounded-lg shadow-sm flex items-center gap-2 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Generate New API Key
            </button>
          </div>
        </div>

        {/* Notices */}
        {notice && (
          <div className="mt-4 p-3 bg-success-a20/60 border border-success-a30 text-success-a00 text-xs rounded-lg flex items-center justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-success-a00 hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-danger-a20/60 border border-danger-a30 text-danger-a00 text-xs rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-danger-a00 hover:underline">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Created Key Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-primary-a10 border border-primary-a30 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-primary-a30 pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary-a00" />
                <h3 className="font-bold text-theme-light">Generate Developer API Key</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-theme-muted hover:text-theme-light text-lg"
              >
                &times;
              </button>
            </div>

            {!createdKeySecret ? (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-theme-light mb-1.5">Key Name / Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Website Checkout Widget, Scanner POS Station 1"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-primary-a20 border border-primary-a30 rounded-lg px-3.5 py-2 text-sm text-theme-light focus:outline-none focus:border-primary-a00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-theme-light mb-1.5">Environment</label>
                    <select
                      value={newKeyEnv}
                      onChange={(e) => setNewKeyEnv(e.target.value as any)}
                      className="w-full bg-primary-a20 border border-primary-a30 rounded-lg px-3 py-2 text-xs text-theme-light focus:outline-none"
                    >
                      <option value="live">Live (gk_live_...)</option>
                      <option value="test">Sandbox / Test (gk_test_...)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-theme-light mb-1.5">Role Permission</label>
                    <select
                      value={newKeyRole}
                      onChange={(e) => setNewKeyRole(e.target.value as any)}
                      className="w-full bg-primary-a20 border border-primary-a30 rounded-lg px-3 py-2 text-xs text-theme-light focus:outline-none"
                    >
                      <option value="TENANT_ADMIN">TENANT_ADMIN (Full Access)</option>
                      <option value="READ_WRITE">READ_WRITE (Checkout & Verify)</option>
                      <option value="SCANNER_ONLY">SCANNER_ONLY (Pass Verification)</option>
                      <option value="READ_ONLY">READ_ONLY (Inspect Passes)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-light mb-1.5">Allowed Origin Domains (CORS / Embed)</label>
                  <input
                    type="text"
                    value={newKeyDomains}
                    onChange={(e) => setNewKeyDomains(e.target.value)}
                    placeholder="* or https://mywebsite.com, https://app.example.com"
                    className="w-full bg-primary-a20 border border-primary-a30 rounded-lg px-3.5 py-2 text-xs text-theme-light focus:outline-none focus:border-primary-a00"
                  />
                  <span className="text-[11px] text-theme-muted mt-1 block">
                    Use * to allow all origins, or comma-separated origins for strict domain lock.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-light mb-1.5">Rate Limit (Requests / Min)</label>
                  <input
                    type="number"
                    min="10"
                    max="3600"
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
                    className="w-full bg-primary-a20 border border-primary-a30 rounded-lg px-3.5 py-2 text-xs text-theme-light focus:outline-none focus:border-primary-a00"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs text-theme-muted hover:text-theme-light bg-primary-a20 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-primary-a00 text-primary-a50 rounded-lg shadow"
                  >
                    Create Key
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Important:</strong> Copy your secret API key now. For your security, this full token cannot be viewed again once you close this window.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-theme-light">Secret API Key</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdKeySecret.key}
                      className="w-full font-mono text-xs bg-primary-a20 border border-primary-a30 rounded-lg px-3 py-2.5 text-success-a00 select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(createdKeySecret.key, 'modal-key')}
                      className="px-3 py-2.5 bg-primary-a30 hover:bg-primary-a40 text-theme-light rounded-lg flex items-center gap-1 text-xs shrink-0"
                    >
                      {copiedKeyId === 'modal-key' ? <Check className="w-4 h-4 text-success-a00" /> : <Copy className="w-4 h-4" />}
                      {copiedKeyId === 'modal-key' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2 text-xs font-semibold bg-primary-a00 text-primary-a50 rounded-lg"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Keys Table */}
      <div className="bg-primary-a20 border border-primary-a30 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-primary-a30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary-a00" />
            <h3 className="text-sm font-bold text-theme-light">Provisioned API Keys</h3>
          </div>
          <span className="text-xs text-theme-muted">{keys.length} Keys Configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-primary-a30/50 text-theme-muted uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Key Name / ID</th>
                <th className="py-3 px-4">Token Token & Prefix</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Rate Limit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-a30">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-theme-muted">
                    No API keys created yet. Generate one to enable external integrations.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-primary-a30/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-theme-light">{k.name}</div>
                      <div className="text-[11px] font-mono text-theme-muted">{k.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-primary-a00 bg-primary-a30 px-2 py-0.5 rounded">
                          {k.key ? `${k.key.substring(0, 16)}...` : k.prefix}
                        </span>
                        {k.key && (
                          <button
                            onClick={() => copyToClipboard(k.key, k.id)}
                            className="p-1 text-theme-muted hover:text-theme-light rounded"
                            title="Copy full key"
                          >
                            {copiedKeyId === k.id ? (
                              <Check className="w-3.5 h-3.5 text-success-a00" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          k.environment === 'live'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {k.environment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-theme-light font-mono text-[11px]">{k.role}</td>
                    <td className="py-3.5 px-4 text-theme-muted">{k.rateLimitPerMinute} req/min</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          k.status === 'active'
                            ? 'bg-success-a20 text-success-a00 border border-success-a30'
                            : 'bg-danger-a20 text-danger-a00 border border-danger-a30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${k.status === 'active' ? 'bg-success-a00' : 'bg-danger-a00'}`} />
                        {k.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {k.status === 'active' && (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/20 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteKey(k.id)}
                        className="p-1 text-theme-muted hover:text-danger-a00 rounded"
                        title="Delete key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive API Explorer & Drop-In Code Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive API Tester */}
        <div className="lg:col-span-7 bg-primary-a20 border border-primary-a30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-primary-a30 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary-a00" />
              <h3 className="text-sm font-bold text-theme-light">Interactive v1 API Sandbox</h3>
            </div>
            <span className="text-xs text-theme-muted">Live execution against local database</span>
          </div>

          <div className="space-y-3">
            {/* Endpoint Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleEndpointSelect('create_session')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                  selectedEndpoint === 'create_session'
                    ? 'bg-primary-a00 text-primary-a50 shadow-sm'
                    : 'bg-primary-a30 text-theme-muted hover:text-theme-light'
                }`}
              >
                POST /checkout/sessions
              </button>
              <button
                onClick={() => handleEndpointSelect('verify_pass')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                  selectedEndpoint === 'verify_pass'
                    ? 'bg-primary-a00 text-primary-a50 shadow-sm'
                    : 'bg-primary-a30 text-theme-muted hover:text-theme-light'
                }`}
              >
                POST /passes/verify
              </button>
              <button
                onClick={() => handleEndpointSelect('inspect_pass')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                  selectedEndpoint === 'inspect_pass'
                    ? 'bg-primary-a00 text-primary-a50 shadow-sm'
                    : 'bg-primary-a30 text-theme-muted hover:text-theme-light'
                }`}
              >
                GET /passes/:token
              </button>
              <button
                onClick={() => handleEndpointSelect('release_escrow')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                  selectedEndpoint === 'release_escrow'
                    ? 'bg-primary-a00 text-primary-a50 shadow-sm'
                    : 'bg-primary-a30 text-theme-muted hover:text-theme-light'
                }`}
              >
                POST /escrow/release
              </button>
            </div>

            {/* Test API Key Input */}
            <div>
              <label className="block text-[11px] font-semibold text-theme-muted mb-1">X-API-Key Header</label>
              <input
                type="text"
                value={playgroundApiKey}
                onChange={(e) => setPlaygroundApiKey(e.target.value)}
                placeholder="gk_live_..."
                className="w-full bg-primary-a30 border border-primary-a40 rounded-lg px-3 py-1.5 font-mono text-xs text-theme-light focus:outline-none focus:border-primary-a00"
              />
            </div>

            {/* JSON Request Payload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-theme-muted">Request Body (JSON)</label>
                <button
                  onClick={handleRunPlayground}
                  disabled={playgroundLoading}
                  className="px-3 py-1 text-xs font-bold bg-primary-a00 text-primary-a50 hover:bg-primary-a00/90 rounded-md flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Play className={`w-3 h-3 ${playgroundLoading ? 'animate-spin' : ''}`} />
                  Execute Request
                </button>
              </div>
              <textarea
                rows={selectedEndpoint === 'inspect_pass' ? 3 : 6}
                value={playgroundPayload}
                onChange={(e) => setPlaygroundPayload(e.target.value)}
                className="w-full bg-primary-a30 border border-primary-a40 rounded-lg p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-primary-a00 resize-none leading-relaxed"
              />
            </div>

            {/* Response Console */}
            {playgroundResponse && (
              <div className="space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-theme-muted">Live Response Payload</span>
                  {playgroundStatus && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        playgroundStatus >= 200 && playgroundStatus < 300
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      HTTP {playgroundStatus}
                    </span>
                  )}
                </div>
                <pre className="bg-primary-a30 border border-primary-a40 rounded-lg p-3 font-mono text-xs text-theme-light max-h-56 overflow-auto whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(playgroundResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Snippets & Drop-in SDK */}
        <div className="lg:col-span-5 bg-primary-a20 border border-primary-a30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-primary-a30 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary-a00" />
              <h3 className="text-sm font-bold text-theme-light">Drop-In Integration Code</h3>
            </div>
            <span className="text-xs text-theme-muted">Zero-dependency</span>
          </div>

          {/* Snippet Language Tabs */}
          <div className="flex items-center gap-1.5 border-b border-primary-a30 pb-2">
            {(['widget', 'curl', 'node', 'python'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSnippetTab(tab)}
                className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors ${
                  snippetTab === tab
                    ? 'bg-primary-a30 text-primary-a00 border border-primary-a40'
                    : 'text-theme-muted hover:text-theme-light'
                }`}
              >
                {tab === 'widget' ? 'HTML / Widget' : tab}
              </button>
            ))}
          </div>

          {/* Code Block Content */}
          <div className="relative">
            <pre className="bg-primary-a30 border border-primary-a40 rounded-lg p-3 font-mono text-[11px] text-theme-light overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
              {snippetTab === 'widget' && (
`<!-- 1. Include GateKeeper Drop-In Client -->
<script src="${currentOrigin}/v1/gatekeeper.js"></script>

<!-- 2. Embed Standard Checkout Trigger -->
<button
  data-gatekeeper-checkout="srv_1"
  data-gatekeeper-key="${activeKeySample}"
  class="btn-primary"
>
  Book VIP Consultation ($150)
</button>

<!-- 3. Or Open Programmatically in JavaScript -->
<script>
  GateKeeper.openCheckout({
    serviceId: 'srv_1',
    apiKey: '${activeKeySample}',
    clientEmail: 'buyer@example.com',
    onSuccess: function(order) {
      console.log('Access pass issued:', order);
    }
  });
</script>`
              )}

              {snippetTab === 'curl' && (
`# 1. Create a Paywalled Booking Session
curl -X POST "${currentOrigin}/api/v1/checkout/sessions" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeKeySample}" \\
  -d '{
    "serviceId": "srv_1",
    "clientEmail": "client@example.com",
    "clientName": "Alex Rivera",
    "customDurationMinutes": 30
  }'

# 2. Verify and Consume Pass at Door / Call
curl -X POST "${currentOrigin}/api/v1/passes/verify" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeKeySample}" \\
  -d '{
    "passToken": "TKT-YOUR-TOKEN-HERE"
  }'`
              )}

              {snippetTab === 'node' && (
`import axios from 'axios';

const gatekeeper = axios.create({
  baseURL: '${currentOrigin}/api/v1',
  headers: { 'X-API-Key': '${activeKeySample}' }
});

// Create Paywalled Checkout Session
const { data } = await gatekeeper.post('/checkout/sessions', {
  serviceId: 'srv_1',
  clientEmail: 'client@example.com',
  customDurationMinutes: 30
});

console.log('Checkout URL:', data.checkoutUrl);`
              )}

              {snippetTab === 'python' && (
`import requests

url = "${currentOrigin}/api/v1/checkout/sessions"
headers = {
    "X-API-Key": "${activeKeySample}",
    "Content-Type": "application/json"
}
payload = {
    "serviceId": "srv_1",
    "clientEmail": "client@example.com",
    "customDurationMinutes": 30
}

response = requests.post(url, json=payload, headers=headers)
print("Session:", response.json())`
              )}
            </pre>

            <button
              onClick={() => {
                let code = '';
                if (snippetTab === 'widget') {
                  code = `<script src="${currentOrigin}/v1/gatekeeper.js"></script>\n<button data-gatekeeper-checkout="srv_1" data-gatekeeper-key="${activeKeySample}">Book VIP Consultation</button>`;
                } else if (snippetTab === 'curl') {
                  code = `curl -X POST "${currentOrigin}/api/v1/checkout/sessions" -H "X-API-Key: ${activeKeySample}" -d '{"serviceId":"srv_1","clientEmail":"client@example.com"}'`;
                } else if (snippetTab === 'node') {
                  code = `const res = await axios.post('${currentOrigin}/api/v1/checkout/sessions', { serviceId: 'srv_1', clientEmail: 'client@example.com' }, { headers: { 'X-API-Key': '${activeKeySample}' } });`;
                } else {
                  code = `requests.post("${currentOrigin}/api/v1/checkout/sessions", json={"serviceId":"srv_1","clientEmail":"client@example.com"}, headers={"X-API-Key":"${activeKeySample}"})`;
                }
                copyToClipboard(code, 'snippet-btn');
              }}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-primary-a20 hover:bg-primary-a10 text-theme-muted hover:text-theme-light rounded border border-primary-a40 flex items-center gap-1 text-[10px]"
            >
              {copiedKeyId === 'snippet-btn' ? <Check className="w-3 h-3 text-success-a00" /> : <Copy className="w-3 h-3" />}
              {copiedKeyId === 'snippet-btn' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
