import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Download,
  X
} from 'lucide-react';
import { ProviderConfig, Order, Settlement } from '../types';
import { ReceiptGenerator } from './ReceiptGenerator';

interface ProviderTransactionsControlProps {
  provider: ProviderConfig;
  orders: Order[];
  onRefreshData: () => void;
}

export const ProviderTransactionsControl: React.FC<ProviderTransactionsControlProps> = ({
  provider,
  orders,
  onRefreshData,
}) => {
  // Pagination, Search, Filter & Sort State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'paid' | 'created' | 'manual_review' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Receipt Modal State
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    let grossTotalCents = 0;
    let providerShareCents = 0;
    let settledCount = 0;

    for (const ord of orders) {
      if (ord.status === 'settled' || ord.status === 'paid' || ord.financialState === 'captured' || ord.settlementState === 'payout_completed') {
        grossTotalCents += ord.amountCents || ord.grossTotalCents || 0;
        providerShareCents += ord.providerTotalShareCents || ord.providerServiceShareCents || Math.floor((ord.amountCents || 0) * 0.85);
        settledCount += 1;
      }
    }

    return {
      grossTotalDollars: (grossTotalCents / 100).toFixed(2),
      providerShareDollars: (providerShareCents / 100).toFixed(2),
      settledCount,
      totalOrders: orders.length,
    };
  }, [orders]);

  // Filtered and Sorted Orders
  const processedOrders = useMemo(() => {
    return orders
      .filter((ord) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'settled') return ord.status === 'settled' || ord.settlementState === 'payout_completed';
        if (statusFilter === 'paid') return ord.status === 'paid' || ord.financialState === 'captured';
        if (statusFilter === 'created') return ord.status === 'created' || ord.financialState === 'created';
        if (statusFilter === 'manual_review') return ord.status === 'manual_review';
        if (statusFilter === 'cancelled') return ord.status === 'cancelled' || ord.financialState === 'refunded';
        return true;
      })
      .filter((ord) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          ord.id.toLowerCase().includes(q) ||
          ord.serviceName?.toLowerCase().includes(q) ||
          ord.serviceId?.toLowerCase().includes(q) ||
          ord.currency?.toLowerCase().includes(q) ||
          (ord.amountCents && (ord.amountCents / 100).toString().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'amount_desc') {
          return (b.amountCents || 0) - (a.amountCents || 0);
        }
        if (sortBy === 'amount_asc') {
          return (a.amountCents || 0) - (b.amountCents || 0);
        }
        return 0;
      });
  }, [orders, statusFilter, searchQuery, sortBy]);

  // Pagination Slicing
  const totalItems = processedOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = processedOrders.slice(startIndex, startIndex + pageSize);

  // Status Badge Helper
  const renderStatusBadge = (order: Order) => {
    const isSettled = order.status === 'settled' || order.settlementState === 'payout_completed';
    const isPaid = order.status === 'paid' || order.financialState === 'captured';
    const isPending = order.status === 'created' || order.financialState === 'created';
    const isManual = order.status === 'manual_review';
    const isRefunded = order.status === 'cancelled' || order.financialState === 'refunded';

    if (isSettled) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success-a0/10 text-success-a0 border border-success-a0/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>SETTLED (85% PAID)</span>
        </span>
      );
    }
    if (isPaid) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-info-a0/10 text-info-a0 border border-info-a0/20">
          <Clock className="w-3 h-3" />
          <span>PAID • ESCROW HOLD</span>
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
          <Clock className="w-3 h-3" />
          <span>AWAITING PAYMENT</span>
        </span>
      );
    }
    if (isManual) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-400/10 text-purple-400 border border-purple-400/20">
          <AlertCircle className="w-3 h-3" />
          <span>MANUAL REVIEW</span>
        </span>
      );
    }
    if (isRefunded) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-danger-a0/10 text-danger-a0 border border-danger-a0/20">
          <X className="w-3 h-3" />
          <span>REFUNDED</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-surface-a40 bg-tonal-a0 border border-surface-a10">
        {order.status}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-tonal-a0 border border-surface-a10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-info-a0 bg-info-a0/10 px-2.5 py-0.5 rounded-full border border-info-a0/20">
              Disbursement & Revenue Ledger
            </span>
            <span className="text-[10px] font-mono text-surface-a40">
              85% Automated Payout Split
            </span>
          </div>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <span>Recent Transactions & Settlements</span>
          </h2>
          <p className="text-xs text-surface-a40 font-mono mt-0.5">
            Real-time breakdown of client bookings, gross fees, provider 85% payouts, and settlement receipts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onRefreshData}
            className="px-4 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all flex items-center space-x-2"
          >
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center justify-between text-surface-a40 text-xs font-mono uppercase">
            <span>85% Net Provider Earnings</span>
            <DollarSign className="w-4 h-4 text-success-a0" />
          </div>
          <div className="text-2xl font-black font-mono text-success-a0">
            ${metrics.providerShareDollars}
          </div>
          <p className="text-[11px] text-surface-a40 font-mono">
            Automated PayPal disbursements
          </p>
        </div>

        <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center justify-between text-surface-a40 text-xs font-mono uppercase">
            <span>Gross Volume Processed</span>
            <TrendingUp className="w-4 h-4 text-info-a0" />
          </div>
          <div className="text-2xl font-black font-mono text-theme-light">
            ${metrics.grossTotalDollars}
          </div>
          <p className="text-[11px] text-surface-a40 font-mono">
            Total consultation bookings
          </p>
        </div>

        <div className="bg-surface-a0 border border-surface-a10 p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center justify-between text-surface-a40 text-xs font-mono uppercase">
            <span>Settled Appointments</span>
            <CheckCircle2 className="w-4 h-4 text-info-a0" />
          </div>
          <div className="text-2xl font-black font-mono text-info-a0">
            {metrics.settledCount} <span className="text-xs font-normal text-surface-a40">/ {metrics.totalOrders}</span>
          </div>
          <p className="text-[11px] text-surface-a40 font-mono">
            Verified double-blind consultations
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Status Filter, Sort, Page Size */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-surface-a40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search transactions by Order ID, service name, or amount..."
            className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-theme-light placeholder:text-surface-a40 focus:outline-none focus:border-info-a0"
          />
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-mono text-surface-a40">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-1.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
            >
              <option value="all">All Transactions</option>
              <option value="settled">Settled (85% Paid)</option>
              <option value="paid">Paid (Escrow Hold)</option>
              <option value="created">Awaiting Payment</option>
              <option value="manual_review">Manual Review</option>
              <option value="cancelled">Refunded</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-mono text-surface-a40">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
              className="bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-1.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="amount_asc">Amount (Low to High)</option>
            </select>
          </div>

          {/* Page Size */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-mono text-surface-a40">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-tonal-a0 border border-surface-a10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl overflow-hidden shadow-lg">
        {paginatedOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-surface-a40 mx-auto" />
            <h4 className="text-sm font-bold text-theme-light">No Transactions Found</h4>
            <p className="text-xs text-surface-a40 font-mono max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No transactions matched your active search or status filter.'
                : 'Transactions will appear here automatically when clients book consultations.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-surface-a10 bg-tonal-a0/80 text-surface-a40 uppercase text-[10px]">
                  <th className="py-3 px-4 font-bold">Order ID</th>
                  <th className="py-3 px-4 font-bold">Service & Details</th>
                  <th className="py-3 px-4 font-bold">Gross Total</th>
                  <th className="py-3 px-4 font-bold text-success-a0">Provider 85%</th>
                  <th className="py-3 px-4 font-bold">Date & Time</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-a10/60">
                {paginatedOrders.map((ord) => {
                  const grossDollars = ((ord.amountCents || ord.grossTotalCents || 0) / 100).toFixed(2);
                  const providerShareDollars = (
                    (ord.providerTotalShareCents || ord.providerServiceShareCents || Math.floor((ord.amountCents || 0) * 0.85)) / 100
                  ).toFixed(2);

                  return (
                    <tr key={ord.id} className="hover:bg-tonal-a0/40 transition-colors">
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-bold text-info-a0">
                        {ord.id}
                      </td>

                      {/* Service & Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-theme-light truncate max-w-xs">
                          {ord.serviceName || ord.serviceId || 'Confidential Consultation'}
                        </div>
                        {ord.gateId && (
                          <span className="text-[10px] text-surface-a40 block">
                            Gate: {ord.gateId}
                          </span>
                        )}
                      </td>

                      {/* Gross Amount */}
                      <td className="py-3.5 px-4 font-bold text-theme-light">
                        ${grossDollars} {ord.currency || 'USD'}
                      </td>

                      {/* 85% Provider Net */}
                      <td className="py-3.5 px-4 font-black text-success-a0">
                        ${providerShareDollars}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-surface-a40 text-[11px]">
                        {new Date(ord.createdAt).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(ord)}
                      </td>

                      {/* Receipt Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptOrder(ord)}
                          className="px-2.5 py-1 bg-tonal-a0 hover:bg-surface-a10 text-theme-light rounded-lg border border-surface-a10 text-[11px] transition-all inline-flex items-center space-x-1"
                          title="View PDF Receipt"
                        >
                          <FileText className="w-3 h-3 text-info-a0" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="bg-tonal-a0/80 border-t border-surface-a10 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="text-surface-a40">
              Showing <strong className="text-theme-light">{startIndex + 1}</strong> to{' '}
              <strong className="text-theme-light">{Math.min(startIndex + pageSize, totalItems)}</strong> of{' '}
              <strong className="text-theme-light">{totalItems}</strong> transactions
            </div>

            <div className="flex items-center space-x-1 self-center sm:self-auto">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-surface-a0 hover:bg-surface-a10 disabled:opacity-40 disabled:hover:bg-surface-a0 text-theme-light border border-surface-a10 transition-all"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-surface-a0 hover:bg-surface-a10 disabled:opacity-40 disabled:hover:bg-surface-a0 text-theme-light border border-surface-a10 transition-all"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Indicator */}
              <span className="px-3 py-1 bg-surface-a0 border border-surface-a10 rounded-lg text-theme-light font-bold">
                Page {currentPage} of {totalPages}
              </span>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-surface-a0 hover:bg-surface-a10 disabled:opacity-40 disabled:hover:bg-surface-a0 text-theme-light border border-surface-a10 transition-all"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-surface-a0 hover:bg-surface-a10 disabled:opacity-40 disabled:hover:bg-surface-a0 text-theme-light border border-surface-a10 transition-all"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-a0 border border-surface-a10 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-info-a0" />
                <h3 className="text-base font-bold text-theme-light">Consultation Settlement Receipt</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptOrder(null)}
                className="p-1.5 rounded-full hover:bg-tonal-a0 text-surface-a40 hover:text-theme-light"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ReceiptGenerator
              order={selectedReceiptOrder}
              settlement={{
                orderId: selectedReceiptOrder.id,
                settlementId: `stl_${selectedReceiptOrder.id}`,
                payoutId: `pay_${selectedReceiptOrder.id}`,
                providerId: provider.id,
                grossAmountCents: selectedReceiptOrder.amountCents,
                providerShareCents: selectedReceiptOrder.providerTotalShareCents || Math.floor(selectedReceiptOrder.amountCents * 0.85),
                platformFeeCents: selectedReceiptOrder.platformTotalShareCents || Math.ceil(selectedReceiptOrder.amountCents * 0.15),
                status: 'completed',
                timestamp: selectedReceiptOrder.createdAt,
              }}
              onClose={() => setSelectedReceiptOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
