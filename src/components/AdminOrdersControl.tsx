import React, { useEffect, useState } from 'react';
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldCheck,
  KeyRound,
  ChevronDown,
} from 'lucide-react';
import { Order } from '../types';
import { apiFetch } from '../lib/api';

export const AdminOrdersControl: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [financialFilter, setFinancialFilter] = useState<string>('ALL');
  const [entitlementFilter, setEntitlementFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination state (Server-authoritative, max 10 per page)
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Manual Review action handling
  const [resolvingOrderId, setResolvingOrderId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchOrders = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '10',
        search: searchQuery,
        financialState: financialFilter,
        entitlementState: entitlementFilter,
        status: statusFilter,
      });
      const res = await apiFetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
          setTotalRecords(data.pagination.total);
        }
      } else {
        setError(data.error || 'Failed to fetch operational orders.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [searchQuery, financialFilter, entitlementFilter, statusFilter]);

  const handleManualResolve = async (orderId: string, resolution: 'settle' | 'void') => {
    setResolvingOrderId(orderId);
    setActionNotice(null);
    try {
      const res = await apiFetch('/api/admin/manual-review/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          resolution,
          operator: 'admin',
          reason: `Manual resolution of order ${orderId} via Admin Surface.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Order ${orderId} successfully resolved (${resolution}).`);
        fetchOrders();
      } else {
        setError(data.error || 'Failed to resolve manual review queue item.');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing order resolution.');
    } finally {
      setResolvingOrderId(null);
    }
  };

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.providerId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFinancial = financialFilter === 'ALL' || o.financialState === financialFilter;
    const matchesEntitlement = entitlementFilter === 'ALL' || o.entitlementState === entitlementFilter;
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

    return matchesSearch && matchesFinancial && matchesEntitlement && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-surface-a40 font-mono flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-info-a0" />
        <span>Loading Operational Orders Ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-a10 pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-info-a0 font-semibold bg-info-a0/10 px-2.5 py-1 rounded-md border border-info-a0/20">
            Read-Only Operational View
          </span>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-info-a0" />
            <span>Orders & State Vector Audit</span>
          </h2>
          <p className="text-xs text-surface-a40 mt-0.5">
            Real-time inspection of 4-vector state machines across active platform orders.
          </p>
        </div>

        <button
          onClick={() => fetchOrders(page)}
          className="px-3.5 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs rounded-xl border border-surface-a10 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {actionNotice && (
        <div className="bg-success-a0/10 border border-success-a0/30 p-3.5 rounded-xl text-xs text-success-a0 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {error && (
        <div className="bg-danger-a0/10 border border-danger-a0/30 p-3.5 rounded-xl text-xs text-danger-a0 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-2xl shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-surface-a40" />
            <input
              type="text"
              placeholder="Search Order ID or Service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-9 pr-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
            />
          </div>

          {/* Financial State Filter */}
          <div>
            <select
              value={financialFilter}
              onChange={(e) => setFinancialFilter(e.target.value)}
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
            >
              <option value="ALL">Financial State: ALL</option>
              <option value="created">Created</option>
              <option value="captured">Captured</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Entitlement State Filter */}
          <div>
            <select
              value={entitlementFilter}
              onChange={(e) => setEntitlementFilter(e.target.value)}
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
            >
              <option value="ALL">Entitlement State: ALL</option>
              <option value="none">None</option>
              <option value="issued">Issued</option>
              <option value="redeemed">Redeemed</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
            >
              <option value="ALL">Order Status: ALL</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="manual_review">Manual Review</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-theme-light">
            Orders Page ({orders.length} shown of {totalRecords} total)
          </h3>
          <span className="text-[10px] text-surface-a40 bg-tonal-a0 px-2.5 py-1 rounded border border-surface-a10">
            Client IP Protected
          </span>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-surface-a40 py-8 text-center">No orders match the current filter criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-a10 text-surface-a40 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3">Order Reference</th>
                  <th className="py-3 px-3">Service & Breakdown</th>
                  <th className="py-3 px-3">Financial State</th>
                  <th className="py-3 px-3">Entitlement State</th>
                  <th className="py-3 px-3">Settlement State</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-a10/50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-tonal-a0/50 transition-colors">
                    <td className="py-3.5 px-3">
                      <div>
                        <span className="font-bold text-info-a0 block">{o.id}</span>
                        <span className="text-[10px] text-surface-a40 block mt-0.5">
                          Provider: {o.providerId}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-theme-light block">{o.serviceName}</span>
                        <div className="flex items-center space-x-2 text-[10px] font-mono">
                          <span className="text-success-a0 font-bold">
                            Gross: ${(o.grossTotalCents / 100).toFixed(2)}
                          </span>
                          {o.tipCents > 0 && (
                            <span className="text-info-a0">
                              Tip: ${(o.tipCents / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-surface-a40 flex items-center space-x-2">
                          <span>Prov (85%): ${((o.providerServiceShareCents || 0) / 100).toFixed(2)}</span>
                          <span>•</span>
                          <span>Plat (15%): ${((o.platformServiceShareCents || 0) / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          o.financialState === 'captured'
                            ? 'bg-success-a0/10 text-success-a0 border-success-a0/20'
                            : o.financialState === 'refunded'
                            ? 'bg-danger-a0/10 text-danger-a0 border-danger-a0/20'
                            : 'bg-warning-a0/10 text-warning-a0 border-warning-a0/20'
                        }`}
                      >
                        {o.financialState}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          o.entitlementState === 'redeemed'
                            ? 'bg-info-a0/10 text-info-a0 border-info-a0/20'
                            : o.entitlementState === 'issued'
                            ? 'bg-success-a0/10 text-success-a0 border-success-a0/20'
                            : 'bg-surface-a10 text-surface-a40 border-surface-a20'
                        }`}
                      >
                        {o.entitlementState}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="text-[10px] uppercase font-mono text-surface-a40">
                        {o.settlementState || 'unsettled'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            o.status === 'paid' || o.status === 'settled'
                              ? 'bg-success-a0/10 text-success-a0 border-success-a0/20'
                              : o.status === 'manual_review'
                              ? 'bg-warning-a0/10 text-warning-a0 border-warning-a0/20 animate-pulse'
                              : 'bg-surface-a10 text-surface-a40 border-surface-a20'
                          }`}
                        >
                          {o.status}
                        </span>

                        {o.status === 'manual_review' && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleManualResolve(o.id, 'settle')}
                              disabled={resolvingOrderId === o.id}
                              className="px-2 py-0.5 bg-success-a0 hover:bg-success-a10 text-primary-a0 rounded text-[10px] font-bold"
                            >
                              Settle
                            </button>
                            <button
                              onClick={() => handleManualResolve(o.id, 'void')}
                              disabled={resolvingOrderId === o.id}
                              className="px-2 py-0.5 bg-danger-a0 hover:bg-danger-a10 text-primary-a0 rounded text-[10px] font-bold"
                            >
                              Void
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right text-surface-a40 text-[11px]">
                      {new Date(o.createdAt).toLocaleString()}
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
              onClick={() => fetchOrders(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Previous
            </button>
            <button
              onClick={() => fetchOrders(page + 1)}
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
