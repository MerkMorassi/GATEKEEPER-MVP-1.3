import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  Webhook,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Clock,
  Lock,
} from 'lucide-react';

interface WebhookRecord {
  key: string;
  provider: string;
  eventId: string;
  eventType?: string;
  orderId?: string;
  status?: 'success' | 'replay_ignored' | 'failed' | 'invalid_signature';
  error?: string;
  processedAt: string;
}

export const AdminWebhooksControl: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Server Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const fetchWebhooks = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '10',
        search: searchQuery,
        status: statusFilter,
      });
      const res = await apiFetch(`/api/admin/webhooks?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.webhooks) {
        setWebhooks(data.webhooks);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
          setTotalRecords(data.pagination.total);
        }
      } else {
        setError(data.error || 'Failed to load processed webhooks.');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching webhook audit records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks(1);
  }, [searchQuery, statusFilter]);

  const filteredWebhooks = webhooks.filter((w) => {
    const matchesSearch =
      w.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.eventType && w.eventType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.orderId && w.orderId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || (w.status && w.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-surface-a40 font-mono flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-info-a0" />
        <span>Loading Webhook Operations Stream...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono text-xs">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-a10 pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-info-a0 font-semibold bg-info-a0/10 px-2.5 py-1 rounded-md border border-info-a0/20">
            HMAC Verified & Idempotency Locked
          </span>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <Webhook className="w-5 h-5 text-info-a0" />
            <span>Webhook Event Operations Log</span>
          </h2>
          <p className="text-xs text-surface-a40 mt-0.5">
            Real-time audit log of inbound provider webhooks, replay defenses, and signature validations.
          </p>
        </div>

        <button
          onClick={fetchWebhooks}
          className="px-3.5 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs rounded-xl border border-surface-a10 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Webhooks</span>
        </button>
      </div>

      {/* SECURITY NOTICE */}
      <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-success-a0 flex-shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-theme-light">
              Automated Replay Protection & Signature Validation
            </h3>
            <p className="text-[11px] text-surface-a40 mt-0.5">
              All webhooks undergo mandatory HMAC-SHA256 signature verification and atomic concurrency locks before processing.
            </p>
          </div>
        </div>

        <span className="text-[10px] bg-tonal-a0 text-surface-a40 px-2.5 py-1 rounded-md border border-surface-a10">
          Fail-Closed Security
        </span>
      </div>

      {error && (
        <div className="bg-danger-a0/10 border border-danger-a0/30 p-4 rounded-xl text-danger-a0">
          {error}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-surface-a40" />
          <input
            type="text"
            placeholder="Search Event ID, Type, or Order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-9 pr-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
          >
            <option value="ALL">Status Filter: ALL</option>
            <option value="success">Success</option>
            <option value="replay_ignored">Replay Ignored (Idempotent)</option>
            <option value="failed">Failed</option>
            <option value="invalid_signature">Invalid Signature</option>
          </select>
        </div>
      </div>

      {/* WEBHOOK EVENT LOG TABLE */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-theme-light">
            Processed Events Page ({webhooks.length} shown of {totalRecords} total)
          </h3>
          <span className="text-[10px] text-surface-a40 bg-tonal-a0 px-2.5 py-1 rounded border border-surface-a10">
            Persistent Store
          </span>
        </div>

        {webhooks.length === 0 ? (
          <p className="text-xs text-surface-a40 py-8 text-center">No webhook records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-a10 text-surface-a40 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3">Event ID & Provider</th>
                  <th className="py-3 px-3">Event Type</th>
                  <th className="py-3 px-3">Associated Order</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Processed Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-a10/50">
                {webhooks.map((w) => (
                  <tr key={w.key} className="hover:bg-tonal-a0/50 transition-colors">
                    <td className="py-3.5 px-3">
                      <div>
                        <span className="font-bold text-info-a0 block">{w.eventId}</span>
                        <span className="text-[10px] text-surface-a40 block uppercase tracking-wider mt-0.5">
                          Provider: {w.provider}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-bold text-theme-light">
                      {w.eventType || 'checkout.session.completed'}
                    </td>

                    <td className="py-3.5 px-3">
                      {w.orderId ? (
                        <span className="text-success-a0 font-bold">{w.orderId}</span>
                      ) : (
                        <span className="text-surface-a50">Non-order event</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          w.status === 'replay_ignored'
                            ? 'bg-warning-a0/10 text-warning-a0 border-warning-a0/20'
                            : w.status === 'failed' || w.status === 'invalid_signature'
                            ? 'bg-danger-a0/10 text-danger-a0 border-danger-a0/20'
                            : 'bg-success-a0/10 text-success-a0 border-success-a0/20'
                        }`}
                      >
                        {w.status || 'success'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right text-surface-a40 text-[11px]">
                      {new Date(w.processedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-a10 text-xs font-mono">
          <span className="text-surface-a40">
            Page <span className="text-theme-light font-bold">{page}</span> of <span className="text-theme-light font-bold">{totalPages}</span> ({totalRecords} records)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchWebhooks(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Previous
            </button>
            <button
              onClick={() => fetchWebhooks(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
