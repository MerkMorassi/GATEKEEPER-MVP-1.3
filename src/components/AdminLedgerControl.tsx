import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertOctagon,
  Lock,
  FileCheck,
} from 'lucide-react';
import { FinancialLedgerEntry } from '../types';
import { apiFetch } from '../lib/api';

export const AdminLedgerControl: React.FC = () => {
  const [entries, setEntries] = useState<FinancialLedgerEntry[]>([]);
  const [totals, setTotals] = useState<{ totalDebitsCents: number; totalCreditsCents: number; isBalanced: boolean }>({
    totalDebitsCents: 0,
    totalCreditsCents: 0,
    isBalanced: true,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');

  // Server Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const fetchLedger = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '10',
        search: searchQuery,
        account: accountFilter,
      });
      const res = await apiFetch(`/api/admin/ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.ledgerEntries) {
        setEntries(data.ledgerEntries);
        if (data.totals) setTotals(data.totals);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
          setTotalRecords(data.pagination.total);
        }
      } else {
        setError(data.error || 'Failed to load financial ledger entries.');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(1);
  }, [searchQuery, accountFilter]);

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.accountCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAccount = accountFilter === 'ALL' || e.accountCode === accountFilter;

    return matchesSearch && matchesAccount;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-surface-a40 font-mono flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-info-a0" />
        <span>Loading Double-Entry Financial Ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-a10 pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-info-a0 font-semibold bg-info-a0/10 px-2.5 py-1 rounded-md border border-info-a0/20">
            Immutable Double-Entry Ledger
          </span>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-info-a0" />
            <span>Financial General Ledger Audit</span>
          </h2>
          <p className="text-xs text-surface-a40 mt-0.5">
            Cryptographically anchored double-entry accounting entries for platform charges, splits, and payouts.
          </p>
        </div>

        <button
          onClick={fetchLedger}
          className="px-3.5 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs rounded-xl border border-surface-a10 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* DOUBLE-ENTRY INTEGRITY BADGE */}
      <div
        className={`p-5 rounded-2xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          totals.isBalanced
            ? 'bg-success-a0/10 border-success-a0/30 text-success-a0'
            : 'bg-danger-a0/10 border-danger-a0/30 text-danger-a0'
        }`}
      >
        <div className="flex items-center space-x-3">
          {totals.isBalanced ? (
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          ) : (
            <AlertOctagon className="w-6 h-6 flex-shrink-0" />
          )}
          <div>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <span>
                {totals.isBalanced
                  ? 'Double-Entry Invariant Satisfied: Ledger Perfectly Balanced'
                  : 'WARNING: Double-Entry Imbalance Detected!'}
              </span>
            </h3>
            <p className="text-xs text-surface-a40 mt-0.5">
              Total Debits (${(totals.totalDebitsCents / 100).toFixed(2)}) === Total Credits ($
              {(totals.totalCreditsCents / 100).toFixed(2)})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-surface-a0/80 px-3 py-1.5 rounded-xl border border-surface-a10 text-xs text-theme-light font-bold self-start sm:self-auto">
          <Lock className="w-3.5 h-3.5 text-info-a0" />
          <span>Read-Only Audit Record</span>
        </div>
      </div>

      {error && (
        <div className="bg-danger-a0/10 border border-danger-a0/30 p-4 rounded-xl text-xs text-danger-a0">
          {error}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-surface-a40" />
          <input
            type="text"
            placeholder="Search Journal ID or Order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-9 pr-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
          >
            <option value="ALL">Account Filter: ALL</option>
            <option value="1010_STRIPE_CLEARING">1010_STRIPE_CLEARING</option>
            <option value="2010_PROVIDER_PAYABLE_SERVICE">2010_PROVIDER_PAYABLE_SERVICE</option>
            <option value="2015_PROVIDER_PAYABLE_TIP">2015_PROVIDER_PAYABLE_TIP</option>
            <option value="4010_PLATFORM_SERVICE_REVENUE">4010_PLATFORM_SERVICE_REVENUE</option>
            <option value="5010_PROCESSOR_FEE_EXPENSE">5010_PROCESSOR_FEE_EXPENSE</option>
            <option value="9010_DISPUTE_ESCROW_CONTRA">9010_DISPUTE_ESCROW_CONTRA</option>
          </select>
        </div>
      </div>

      {/* GENERAL LEDGER TABLE */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-theme-light">
            Journal Entries Page ({entries.length} shown of {totalRecords} total)
          </h3>
          <span className="text-[10px] text-surface-a40 bg-tonal-a0 px-2.5 py-1 rounded border border-surface-a10">
            Manual Edits Prohibited
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-surface-a40 py-8 text-center">No ledger entries match the criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-a10 text-surface-a40 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3">Entry ID</th>
                  <th className="py-3 px-3">Order Ref</th>
                  <th className="py-3 px-3">Account Name & Code</th>
                  <th className="py-3 px-3">Debit ($)</th>
                  <th className="py-3 px-3">Credit ($)</th>
                  <th className="py-3 px-3">Transaction Event</th>
                  <th className="py-3 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-a10/50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-tonal-a0/50 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-info-a0 font-bold">{e.id}</td>

                    <td className="py-3.5 px-3 font-mono text-surface-a40">{e.orderId || 'N/A'}</td>

                    <td className="py-3.5 px-3">
                      <span className="font-bold text-theme-light block">{e.accountName || e.accountCode}</span>
                      <span className="text-[10px] text-surface-a40 block mt-0.5">{e.accountCode}</span>
                    </td>

                    <td className="py-3.5 px-3">
                      {e.debitCents > 0 ? (
                        <span className="font-bold text-success-a0 bg-success-a0/10 px-2 py-0.5 rounded border border-success-a0/20">
                          +${(e.debitCents / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-surface-a50">$0.00</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {e.creditCents > 0 ? (
                        <span className="font-bold text-info-a0 bg-info-a0/10 px-2 py-0.5 rounded border border-info-a0/20">
                          +${(e.creditCents / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-surface-a50">$0.00</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-tonal-a0 text-theme-light border border-surface-a10">
                        {e.transactionType || 'SYSTEM_RECORD'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right text-surface-a40 text-[11px]">
                      {new Date(e.createdAt).toLocaleString()}
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
            Page <span className="text-theme-light font-bold">{page}</span> of <span className="text-theme-light font-bold">{totalPages}</span> ({totalRecords} entries)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchLedger(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLedger(page + 1)}
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
