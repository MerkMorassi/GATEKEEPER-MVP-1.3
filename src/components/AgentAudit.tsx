import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  ExternalLink,
  CreditCard,
  Webhook,
  LayoutDashboard,
  Sliders,
} from 'lucide-react';
import { SystemOverview, Order, Settlement, Payout, AuditEvent, EscrowSession } from '../types';
import { apiFetch } from '../lib/api';
import { EscrowModal } from './EscrowModal';
import { AdminStripeControl } from './AdminStripeControl';
import { AdminCapabilitiesControl } from './AdminCapabilitiesControl';
import { AdminProvidersControl } from './AdminProvidersControl';
import { AdminOrdersControl } from './AdminOrdersControl';
import { AdminLedgerControl } from './AdminLedgerControl';
import { AdminWebhooksControl } from './AdminWebhooksControl';
import { AdminUsersControl } from './AdminUsersControl';
import { AdminApiControl } from './AdminApiControl';

export const AgentAudit: React.FC = () => {
  const [data, setData] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escrow modal state
  const [selectedOrderIdForEscrow, setSelectedOrderIdForEscrow] = useState<string | null>(null);
  const [activeEscrowSessions, setActiveEscrowSessions] = useState<EscrowSession[]>([]);

  // Async action feedback states
  const [resolvingOrderId, setResolvingOrderId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filter for audit events
  const [auditFilter, setAuditFilter] = useState<string>('ALL');

  // Pagination states for Dashboard collections
  const [manualReviewPage, setManualReviewPage] = useState<number>(1);
  const [settlementsPage, setSettlementsPage] = useState<number>(1);
  const [payoutsPage, setPayoutsPage] = useState<number>(1);
  const [auditEventsPage, setAuditEventsPage] = useState<number>(1);

  // Admin Sub-Navigation tab selection
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'users' | 'providers' | 'orders' | 'ledger' | 'webhooks' | 'stripe' | 'capabilities' | 'api'>('dashboard');

  // Deep linking and browser refresh hash sync
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#admin/')) {
        const sub = hash.replace('#admin/', '').trim();
        if (['dashboard', 'users', 'providers', 'orders', 'ledger', 'webhooks', 'stripe', 'capabilities', 'api'].includes(sub)) {
          setAdminSubTab(sub as any);
        }
      }
    };

    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  const handleSubTabChange = (tabId: 'dashboard' | 'users' | 'providers' | 'orders' | 'ledger' | 'webhooks' | 'stripe' | 'capabilities' | 'api') => {
    setAdminSubTab(tabId);
    window.location.hash = `#admin/${tabId}`;
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async (overrideParams?: {
    manualReviewPage?: number;
    settlementsPage?: number;
    payoutsPage?: number;
    auditEventsPage?: number;
    auditFilter?: string;
  }) => {
    const mrPage = overrideParams?.manualReviewPage ?? manualReviewPage;
    const sPage = overrideParams?.settlementsPage ?? settlementsPage;
    const pPage = overrideParams?.payoutsPage ?? payoutsPage;
    const aPage = overrideParams?.auditEventsPage ?? auditEventsPage;
    const aFilter = overrideParams?.auditFilter ?? auditFilter;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        manualReviewPage: String(mrPage),
        settlementsPage: String(sPage),
        payoutsPage: String(pPage),
        auditEventsPage: String(aPage),
        auditFilter: aFilter,
        limit: '10',
      });
      const res = await apiFetch(`/api/admin/overview?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.overview) {
        setData(json.overview);
        if (json.overview.manualReviewPagination) {
          setManualReviewPage(json.overview.manualReviewPagination.page);
        }
        if (json.overview.settlementsPagination) {
          setSettlementsPage(json.overview.settlementsPagination.page);
        }
        if (json.overview.payoutsPagination) {
          setPayoutsPage(json.overview.payoutsPagination.page);
        }
        if (json.overview.auditEventsPagination) {
          setAuditEventsPage(json.overview.auditEventsPagination.page);
        }
      } else {
        setError(json.error || 'Failed to load system audit data');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualReviewPageChange = (newPage: number) => {
    setManualReviewPage(newPage);
    fetchOverview({ manualReviewPage: newPage });
  };

  const handleSettlementsPageChange = (newPage: number) => {
    setSettlementsPage(newPage);
    fetchOverview({ settlementsPage: newPage });
  };

  const handlePayoutsPageChange = (newPage: number) => {
    setPayoutsPage(newPage);
    fetchOverview({ payoutsPage: newPage });
  };

  const handleAuditEventsPageChange = (newPage: number) => {
    setAuditEventsPage(newPage);
    fetchOverview({ auditEventsPage: newPage });
  };

  const handleAuditFilterChange = (newFilter: string) => {
    setAuditFilter(newFilter);
    setAuditEventsPage(1);
    fetchOverview({ auditFilter: newFilter, auditEventsPage: 1 });
  };

  const handleManualResolve = async (orderId: string, resolution: 'settle' | 'void') => {
    setResolvingOrderId(orderId);
    try {
      const res = await apiFetch('/api/admin/manual-review/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          resolution,
          operator: 'agent_admin',
          reason: `Agent resolved order as ${resolution}`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setActionNotice(`Order ${orderId} successfully ${resolution === 'settle' ? 'settled' : 'voided'} ✓`);
        setTimeout(() => setActionNotice(null), 3500);
        fetchOverview();
      }
    } catch (err) {
      console.error('Error resolving manual review order:', err);
    } finally {
      setResolvingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-surface-a40">
        <RefreshCw className="w-6 h-6 animate-spin text-info-a0 mb-2" />
        <p className="text-xs font-mono">Loading GateKeeper Financial Audit Console...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-surface-a40">
        <p className="text-sm font-mono text-danger-a0 mb-2">Access Denied</p>
        <p className="text-xs font-mono max-w-md text-center">{error || 'You do not have permission to view this console. Ensure you are logged in as the Agent Admin.'}</p>
      </div>
    );
  }

  const filteredAuditEvents = auditFilter === 'ALL'
    ? data.auditEvents
    : data.auditEvents.filter((e) => e.eventType === auditFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-a10 gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-info-a0 font-semibold bg-info-a0/10 px-2.5 py-1 rounded-md border border-info-a0/20">
            Merk Morassi and LLC • Agency Operator
          </span>
          <h1 className="text-2xl font-bold text-theme-light mt-2">Financial & Audit Control Surface</h1>
          <p className="text-xs text-surface-a40 mt-0.5 font-mono">
            Authoritative 85/15 Settlement • PayPal Payout Ledger • Stripe Integration • Break-Glass Escrow
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Admin Sub-Navigation Menu */}
      <div className="flex items-center space-x-2 border-b border-surface-a10 pb-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'providers', label: 'Providers', icon: User },
          { id: 'orders', label: 'Orders', icon: FileText },
          { id: 'ledger', label: 'Ledger', icon: DollarSign },
          { id: 'webhooks', label: 'Webhooks', icon: Webhook },
          { id: 'api', label: 'API Keys & SDK', icon: KeyRound },
          { id: 'stripe', label: 'Stripe', icon: CreditCard },
          { id: 'capabilities', label: 'Capabilities', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${
                isActive
                  ? 'bg-info-a0/20 text-info-a0 border border-info-a0/40 font-bold shadow-sm'
                  : 'bg-tonal-a0 text-surface-a40 hover:text-theme-light border border-surface-a10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab View Rendering */}
      {adminSubTab === 'users' ? (
        <AdminUsersControl />
      ) : adminSubTab === 'stripe' ? (
        <AdminStripeControl />
      ) : adminSubTab === 'capabilities' ? (
        <AdminCapabilitiesControl />
      ) : adminSubTab === 'providers' ? (
        <AdminProvidersControl />
      ) : adminSubTab === 'orders' ? (
        <AdminOrdersControl />
      ) : adminSubTab === 'ledger' ? (
        <AdminLedgerControl />
      ) : adminSubTab === 'webhooks' ? (
        <AdminWebhooksControl />
      ) : adminSubTab === 'api' ? (
        <AdminApiControl />
      ) : (
        <>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-surface-a40 text-xs font-mono uppercase">
            <span>Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-info-a0" />
          </div>
          <div className="text-2xl font-bold text-theme-light mt-2">
            ${(data.totalGrossCents / 100).toFixed(2)}
          </div>
          <p className="text-[10px] text-surface-a50 font-mono mt-1">Total Client Purchases</p>
        </div>

        <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-surface-a40 text-xs font-mono uppercase">
            <span>Provider Share (85%)</span>
            <TrendingUp className="w-4 h-4 text-success-a0" />
          </div>
          <div className="text-2xl font-bold text-success-a0 mt-2">
            ${(data.totalProviderCents / 100).toFixed(2)}
          </div>
          <p className="text-[10px] text-surface-a50 font-mono mt-1">Disbursed via PayPal Payouts</p>
        </div>

        <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-surface-a40 text-xs font-mono uppercase">
            <span>Admin Agent Share (15%)</span>
            <ShieldCheck className="w-4 h-4 text-info-a0" />
          </div>
          <div className="text-2xl font-bold text-info-a0 mt-2">
            ${(data.totalAgentCents / 100).toFixed(2)}
          </div>
          <p className="text-[10px] text-surface-a50 font-mono mt-1">Admin Agent Platform Revenue</p>
        </div>

        <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-surface-a40 text-xs font-mono uppercase">
            <span>Total Orders</span>
            <FileText className="w-4 h-4 text-surface-a40" />
          </div>
          <div className="text-2xl font-bold text-theme-light mt-2">
            {data.ordersCount !== undefined ? data.ordersCount : data.orders.length}
          </div>
          <p className="text-[10px] text-surface-a50 font-mono mt-1">
            Manual Review: <span className="text-warning-a0 font-bold">{data.manualReviewPagination?.total ?? data.manualReviewQueue.length}</span>
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-success-a0/10 border border-success-a0/30 p-3.5 rounded-xl text-xs font-mono text-success-a0 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Manual Review Alert Bar if active */}
      {data.manualReviewQueue.length > 0 && (
        <div className="bg-warning-a0/10 border border-warning-a0/30 p-4 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 text-warning-a0 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5 text-warning-a0" />
            <span>Manual Review Queue ({data.manualReviewPagination?.total ?? data.manualReviewQueue.length} Orders Need Attention)</span>
          </div>

          <div className="space-y-2">
            {data.manualReviewQueue.map((o) => (
              <div key={o.id} className="bg-tonal-a0 p-3 rounded-xl border border-surface-a10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-info-a0 font-bold">{o.id}</span>
                  <span className="text-surface-a40 ml-2">Amount: ${(o.amountCents / 100).toFixed(2)}</span>
                  <span className="text-surface-a50 ml-2">({new Date(o.createdAt).toLocaleString()})</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleManualResolve(o.id, 'settle')}
                    disabled={resolvingOrderId === o.id}
                    className="px-3 py-1 bg-success-a0 hover:bg-success-a10 text-primary-a0 rounded-lg text-[11px] font-semibold flex items-center space-x-1 disabled:opacity-50"
                  >
                    {resolvingOrderId === o.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>Force Settle</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleManualResolve(o.id, 'void')}
                    disabled={resolvingOrderId === o.id}
                    className="px-3 py-1 bg-danger-a0 hover:bg-danger-a10 text-primary-a0 rounded-lg text-[11px] font-semibold flex items-center space-x-1 disabled:opacity-50"
                  >
                    {resolvingOrderId === o.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>Void Order</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Manual Review Pagination Bar */}
          {data.manualReviewPagination && data.manualReviewPagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-warning-a0/20 text-xs font-mono">
              <span className="text-surface-a40">
                Page <span className="text-theme-light font-bold">{data.manualReviewPagination.page}</span> of{' '}
                <span className="text-theme-light font-bold">{data.manualReviewPagination.totalPages}</span> ({data.manualReviewPagination.total} records)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleManualReviewPageChange(data.manualReviewPagination!.page - 1)}
                  disabled={data.manualReviewPagination.page <= 1 || loading}
                  className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleManualReviewPageChange(data.manualReviewPagination!.page + 1)}
                  disabled={data.manualReviewPagination.page >= data.manualReviewPagination.totalPages || loading}
                  className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Escrow Sessions */}
      {activeEscrowSessions.length > 0 && (
        <div className="bg-surface-a0 border border-warning-a0/30 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-warning-a0 text-sm font-semibold">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-warning-a0" />
              <span>Active Break-Glass Identity Escrow Sessions</span>
            </div>
            <span className="text-xs text-surface-a40 font-mono">Temporary Unmasked Access</span>
          </div>

          <div className="space-y-3">
            {activeEscrowSessions.map((s) => (
              <div key={s.ticketCode} className="bg-tonal-a0 p-4 rounded-xl border border-surface-a10 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-theme-light">
                  <span>Ticket Code: <span className="text-warning-a0">{s.ticketCode}</span></span>
                  <span>Operator: {s.operator}</span>
                </div>
                <div className="text-surface-a40">Reason: {s.reason}</div>
                <div className="p-2 bg-surface-a0 rounded border border-surface-a10 text-theme-light">
                  Client Unmasked Email: <span className="text-success-a0 font-bold select-all">{s.unmaskedClientEmail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 85/15 Settlements Table */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-theme-light">Immutable 85/15 Settlements Ledger</h2>
          <span className="text-[10px] font-mono text-surface-a40 uppercase bg-tonal-a0 px-2.5 py-1 rounded border border-surface-a10">
            Zero Rounding Drift
          </span>
        </div>

        {data.settlements.length === 0 ? (
          <p className="text-xs text-surface-a40 font-mono py-4 text-center">No settlements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-surface-a10 text-surface-a40 uppercase text-[10px]">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Gross</th>
                  <th className="pb-3">Provider Share (85%)</th>
                  <th className="pb-3">Admin Agent Share (15%)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3 text-right">Escrow Break-Glass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-a10 text-theme-light">
                {data.settlements.map((s) => (
                  <tr key={s.orderId}>
                    <td className="py-3 font-mono text-info-a0">{s.orderId}</td>
                    <td className="py-3 font-bold">${(s.grossCents / 100).toFixed(2)}</td>
                    <td className="py-3 text-success-a0 font-semibold">${(s.providerCents / 100).toFixed(2)}</td>
                    <td className="py-3 text-info-a0 font-semibold">${(s.agentCents / 100).toFixed(2)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-success-a0/10 text-success-a0 border border-success-a0/20">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-surface-a40 text-[11px]">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedOrderIdForEscrow(s.orderId)}
                        className="px-2.5 py-1 bg-warning-a0/10 hover:bg-warning-a0/20 text-warning-a0 border border-warning-a0/30 rounded text-[11px] transition-all flex items-center space-x-1 ml-auto"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Break-Glass</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Bar for Settlements */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-a10 text-xs font-mono">
          <span className="text-surface-a40">
            Page <span className="text-theme-light font-bold">{data.settlementsPagination?.page || 1}</span> of{' '}
            <span className="text-theme-light font-bold">{data.settlementsPagination?.totalPages || 1}</span> ({data.settlementsPagination?.total || 0} records)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSettlementsPageChange((data.settlementsPagination?.page || 1) - 1)}
              disabled={(data.settlementsPagination?.page || 1) <= 1 || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Previous
            </button>
            <button
              onClick={() => handleSettlementsPageChange((data.settlementsPagination?.page || 1) + 1)}
              disabled={(data.settlementsPagination?.page || 1) >= (data.settlementsPagination?.totalPages || 1) || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* PayPal Payout Logs */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-semibold text-theme-light">PayPal Payout Execution Ledger</h2>

        {data.payouts.length === 0 ? (
          <p className="text-xs text-surface-a40 font-mono py-4 text-center">No payouts issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-surface-a10 text-surface-a40 uppercase text-[10px]">
                  <th className="pb-3">Payout ID</th>
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Recipient Payout Email</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">PayPal Batch ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-a10 text-theme-light">
                {data.payouts.map((p) => (
                  <tr key={p.payoutId}>
                    <td className="py-3 font-mono text-info-a0">{p.payoutId}</td>
                    <td className="py-3 text-surface-a40">{p.orderId}</td>
                    <td className="py-3 text-theme-light">{p.recipientEmail}</td>
                    <td className="py-3 font-bold text-success-a0">${(p.amountCents / 100).toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        p.status === 'completed' || p.status === 'submitted'
                          ? 'bg-success-a0/10 text-success-a0 border border-success-a0/20'
                          : 'bg-danger-a0/10 text-danger-a0 border border-danger-a0/20'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-surface-a40 text-[11px]">{p.paypalBatchId || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Bar for Payouts */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-a10 text-xs font-mono">
          <span className="text-surface-a40">
            Page <span className="text-theme-light font-bold">{data.payoutsPagination?.page || 1}</span> of{' '}
            <span className="text-theme-light font-bold">{data.payoutsPagination?.totalPages || 1}</span> ({data.payoutsPagination?.total || 0} records)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePayoutsPageChange((data.payoutsPagination?.page || 1) - 1)}
              disabled={(data.payoutsPagination?.page || 1) <= 1 || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Previous
            </button>
            <button
              onClick={() => handlePayoutsPageChange((data.payoutsPagination?.page || 1) + 1)}
              disabled={(data.payoutsPagination?.page || 1) >= (data.payoutsPagination?.totalPages || 1) || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Security Audit Event Trail */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-theme-light">Security & Audit Event Stream</h2>

          <div className="flex items-center space-x-2">
            <label className="text-xs text-surface-a40 font-mono">Filter Event:</label>
            <select
              value={auditFilter}
              onChange={(e) => handleAuditFilterChange(e.target.value)}
              className="bg-tonal-a0 border border-surface-a10 text-xs text-theme-light font-mono px-3 py-1.5 rounded-xl focus:outline-none focus:border-info-a0"
            >
              <option value="ALL">ALL EVENTS</option>
              <option value="ORDER_CREATED">ORDER_CREATED</option>
              <option value="PAYMENT_VERIFIED">PAYMENT_VERIFIED</option>
              <option value="SETTLEMENT_CREATED">SETTLEMENT_CREATED</option>
              <option value="PAYOUT_SUCCEEDED">PAYOUT_SUCCEEDED</option>
              <option value="ENTITLEMENT_REDEEMED">ENTITLEMENT_REDEEMED</option>
              <option value="ESCROW_ACCESSED">ESCROW_ACCESSED</option>
              <option value="MANUAL_REVIEW_OPENED">MANUAL_REVIEW_OPENED</option>
            </select>
          </div>
        </div>

        {data.auditEvents.length === 0 ? (
          <p className="text-xs text-surface-a40 font-mono py-4 text-center">No matching audit events.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {data.auditEvents.map((evt) => (
              <div key={evt.id} className="bg-tonal-a0 p-3 rounded-xl border border-surface-a10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    evt.eventType.includes('SUCCESS') || evt.eventType.includes('VERIFIED') || evt.eventType.includes('REDEEMED')
                      ? 'bg-success-a0/10 text-success-a0 border border-success-a0/20'
                      : evt.eventType.includes('ESCROW') || evt.eventType.includes('MANUAL')
                      ? 'bg-warning-a0/10 text-warning-a0 border border-warning-a0/20'
                      : 'bg-info-a0/10 text-info-a0 border border-info-a0/20'
                  }`}>
                    {evt.eventType}
                  </span>
                  <span className="text-surface-a40">by {evt.operator}</span>
                </div>

                <div className="text-surface-a50 text-[11px] truncate max-w-md">
                  {JSON.stringify(evt.details)}
                </div>

                <div className="text-[10px] text-surface-a50">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Server Pagination Bar for Audit Events */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-a10 text-xs font-mono">
          <span className="text-surface-a40">
            Page <span className="text-theme-light font-bold">{data.auditEventsPagination?.page || 1}</span> of{' '}
            <span className="text-theme-light font-bold">{data.auditEventsPagination?.totalPages || 1}</span> ({data.auditEventsPagination?.total || 0} records)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleAuditEventsPageChange((data.auditEventsPagination?.page || 1) - 1)}
              disabled={(data.auditEventsPagination?.page || 1) <= 1 || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Previous
            </button>
            <button
              onClick={() => handleAuditEventsPageChange((data.auditEventsPagination?.page || 1) + 1)}
              disabled={(data.auditEventsPagination?.page || 1) >= (data.auditEventsPagination?.totalPages || 1) || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Escrow Modal rendering */}
      {selectedOrderIdForEscrow && (
        <EscrowModal
          orderId={selectedOrderIdForEscrow}
          onClose={() => setSelectedOrderIdForEscrow(null)}
          onSessionCreated={(session) => {
            setActiveEscrowSessions((prev) => [session, ...prev]);
            setSelectedOrderIdForEscrow(null);
          }}
        />
      )}
    </div>
  );
};
