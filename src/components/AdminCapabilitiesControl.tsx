import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Wallet,
  Smartphone,
  Zap,
  Lock,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PaymentCapabilitiesConfig, PaymentMethodCapability, PayoutProviderCapability } from '../types';
import { apiFetch } from '../lib/api';

export const AdminCapabilitiesControl: React.FC = () => {
  const [capabilities, setCapabilities] = useState<PaymentCapabilitiesConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchCapabilities();
  }, []);

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/admin/capabilities');
      const json = await res.json();
      if (json.success && json.capabilities) {
        setCapabilities(json.capabilities);
      } else {
        setError(json.error || 'Failed to fetch payment capabilities configuration.');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMethod = async (methodId: string, currentEnabled: boolean) => {
    try {
      setUpdatingId(methodId);
      setNotice(null);
      setError(null);
      const res = await apiFetch(`/api/admin/capabilities/method/${methodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const json = await res.json();
      if (json.success && json.capabilities) {
        setCapabilities(json.capabilities);
        setNotice(`Payment method "${methodId}" status updated to ${!currentEnabled ? 'ENABLED' : 'DISABLED'}.`);
      } else {
        setError(json.error || `Failed to update payment method ${methodId}.`);
      }
    } catch (err: any) {
      setError(`Failed to toggle method: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTogglePayout = async (payoutId: string, currentEnabled: boolean) => {
    if (payoutId === 'talentir') {
      setError('TALENTIR_FEATURE_BOUNDARY: Talentir creator share engine is COMING SOON and cannot be enabled in this release.');
      return;
    }

    try {
      setUpdatingId(payoutId);
      setNotice(null);
      setError(null);
      const res = await apiFetch(`/api/admin/capabilities/payout/${payoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const json = await res.json();
      if (json.success && json.capabilities) {
        setCapabilities(json.capabilities);
        setNotice(`Payout provider "${payoutId}" status updated to ${!currentEnabled ? 'ENABLED' : 'DISABLED'}.`);
      } else {
        setError(json.error || `Failed to update payout provider ${payoutId}.`);
      }
    } catch (err: any) {
      setError(`Failed to toggle payout provider: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'card':
        return <CreditCard className="w-4 h-4 text-info-a0" />;
      case 'digital_wallet':
        return <Smartphone className="w-4 h-4 text-theme-light" />;
      case 'instant_transfer':
        return <Zap className="w-4 h-4 text-warning-a0" />;
      default:
        return <Wallet className="w-4 h-4 text-surface-a40" />;
    }
  };

  const getStatusBadge = (m: PaymentMethodCapability) => {
    if (!m.enabled) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-surface-a20 text-surface-a40 border border-surface-a30 text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center space-x-1">
          <XCircle className="w-3 h-3 text-surface-a40" />
          <span>Disabled (Admin)</span>
        </span>
      );
    }
    if (m.operational) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-success-a0/10 text-success-a0 border border-success-a0/30 text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Operational</span>
        </span>
      );
    }
    if (m.configured) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-warning-a0/10 text-warning-a0 border border-warning-a0/30 text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center space-x-1">
          <Info className="w-3 h-3" />
          <span>Configured</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md bg-info-a0/10 text-info-a0 border border-info-a0/30 text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center space-x-1">
        <span>Available</span>
      </span>
    );
  };

  const getPayoutStatusBadge = (p: PayoutProviderCapability) => {
    if (p.id === 'talentir' || p.status === 'coming_soon') {
      return (
        <span className="px-2.5 py-1 rounded-md bg-warning-a0/20 text-warning-a0 border border-warning-a0/40 text-[10px] font-mono uppercase tracking-wider font-bold flex items-center space-x-1">
          <Lock className="w-3 h-3 text-warning-a0" />
          <span>Coming Soon / Disabled</span>
        </span>
      );
    }
    if (p.enabled && p.status === 'operational') {
      return (
        <span className="px-2.5 py-1 rounded-md bg-success-a0/10 text-success-a0 border border-success-a0/30 text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Operational</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md bg-surface-a20 text-surface-a40 border border-surface-a30 text-[10px] font-mono uppercase tracking-wider font-semibold">
        <span>Disabled</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-surface-a40 font-mono flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-info-a0" />
        <span>Loading Payment Capabilities Registry...</span>
      </div>
    );
  }

  const methodsList: PaymentMethodCapability[] = capabilities ? Object.values(capabilities.paymentMethods) : [];
  const payoutList: PayoutProviderCapability[] = capabilities ? Object.values(capabilities.payoutProviders) : [];

  return (
    <div className="space-y-8">
      {/* Title & Architecture Overview */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md bg-info-a0/10 text-info-a0 border border-info-a0/20 text-[10px] font-mono uppercase font-bold tracking-widest">
                Platform Architecture
              </span>
              <span className="text-surface-a40 text-xs font-mono">• Root Capability Registry</span>
            </div>
            <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-info-a0" />
              <span>Payment Capabilities & Payout Registry</span>
            </h2>
            <p className="text-xs text-surface-a40 font-mono mt-1">
              Configure platform-wide payment acceptance methods and provider payout architectures.
            </p>
          </div>

          <button
            onClick={fetchCapabilities}
            className="px-3.5 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all flex items-center space-x-2 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Registry</span>
          </button>
        </div>

        {/* 4-Layer Routing Visual Legend */}
        <div className="bg-tonal-a0 border border-surface-a10 rounded-xl p-4 space-y-2">
          <div className="text-xs font-mono font-bold text-theme-light flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-info-a0" />
            <span>4-Layer Payment Routing Model</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono text-surface-a40 pt-1">
            <div className="bg-surface-a0/80 p-2.5 rounded-lg border border-surface-a10">
              <span className="text-info-a0 font-bold block mb-0.5">1. Platform / Admin</span>
              <span>Determines allowed root capabilities</span>
            </div>
            <div className="bg-surface-a0/80 p-2.5 rounded-lg border border-surface-a10">
              <span className="text-theme-light font-bold block mb-0.5">2. Provider Config</span>
              <span>Selects accepted methods from allowed subset</span>
            </div>
            <div className="bg-surface-a0/80 p-2.5 rounded-lg border border-surface-a10">
              <span className="text-warning-a0 font-bold block mb-0.5">3. Client Checkout</span>
              <span>Selects method at transaction time</span>
            </div>
            <div className="bg-surface-a0/80 p-2.5 rounded-lg border border-surface-a10">
              <span className="text-success-a0 font-bold block mb-0.5">4. Payment Engine</span>
              <span>Routs via Stripe or PayPal API</span>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3.5 rounded-xl bg-danger-a0/10 border border-danger-a0/30 text-danger-a0 text-xs font-mono flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="p-3.5 rounded-xl bg-success-a0/10 border border-success-a0/30 text-success-a0 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: Payment Method Capabilities */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
          <div>
            <h3 className="text-base font-bold text-theme-light flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-info-a0" />
              <span>Payment Method Capabilities</span>
            </h3>
            <p className="text-xs text-surface-a40 font-mono mt-0.5">
              Control client-facing payment acceptance options at the platform root level.
            </p>
          </div>
          <span className="text-xs font-mono text-surface-a40 bg-tonal-a0 px-2.5 py-1 rounded-md border border-surface-a10">
            {methodsList.filter((m) => m.enabled).length} / {methodsList.length} Enabled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-surface-a10 text-surface-a40 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Provider</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Domain Verification</th>
                <th className="py-3 px-3 text-right">Admin Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-a10/50">
              {methodsList.map((method) => {
                const isBusy = updatingId === method.id;
                return (
                  <tr key={method.id} className="hover:bg-tonal-a0/50 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-tonal-a0 border border-surface-a10">
                          {getCategoryIcon(method.category)}
                        </div>
                        <div>
                          <span className="font-bold text-theme-light text-sm block">{method.name}</span>
                          <span className="text-[10px] text-surface-a40 block uppercase tracking-wider mt-0.5">
                            {method.notes || method.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        method.provider === 'STRIPE'
                          ? 'bg-info-a0/10 text-info-a0 border-info-a0/20'
                          : 'bg-warning-a0/10 text-warning-a0 border-warning-a0/20'
                      }`}>
                        {method.provider}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      {getStatusBadge(method)}
                    </td>

                    <td className="py-3.5 px-3">
                      {method.requiresDomainVerification ? (
                        <span className="text-[10px] text-warning-a0 font-semibold bg-warning-a0/10 px-2 py-0.5 rounded border border-warning-a0/20">
                          Domain Registration Required
                        </span>
                      ) : (
                        <span className="text-[10px] text-surface-a40">Standard</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleMethod(method.id, method.enabled)}
                        disabled={isBusy}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                          method.enabled
                            ? 'bg-danger-a0/10 hover:bg-danger-a0/20 text-danger-a0 border-danger-a0/30'
                            : 'bg-success-a0/10 hover:bg-success-a0/20 text-success-a0 border-success-a0/30'
                        } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isBusy ? 'Updating...' : method.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Payout Provider Capability Registry */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
          <div>
            <h3 className="text-base font-bold text-theme-light flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-success-a0" />
              <span>Payout Provider Capability Registry</span>
            </h3>
            <p className="text-xs text-surface-a40 font-mono mt-0.5">
              Provider settlement and payout architectures available on GateKeeper.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-surface-a10 text-surface-a40 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Payout Provider</th>
                <th className="py-3 px-3">Architecture Type</th>
                <th className="py-3 px-3">Capability Status</th>
                <th className="py-3 px-3 text-right">Admin Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-a10/50">
              {payoutList.map((payout) => {
                const isTalentir = payout.id === 'talentir';
                const isBusy = updatingId === payout.id;

                return (
                  <tr key={payout.id} className={`hover:bg-tonal-a0/50 transition-colors ${isTalentir ? 'opacity-90' : ''}`}>
                    <td className="py-3.5 px-3">
                      <div>
                        <span className="font-bold text-theme-light text-sm block flex items-center space-x-1.5">
                          <span>{payout.name}</span>
                          {isTalentir && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-warning-a0/20 text-warning-a0 font-bold">
                              FEATURE BOUNDARY
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-surface-a40 block font-mono mt-0.5">
                          {payout.notes}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-tonal-a0 text-surface-a40 border border-surface-a10">
                        {payout.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      {getPayoutStatusBadge(payout)}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {isTalentir ? (
                        <div className="inline-flex items-center space-x-1 bg-surface-a20 border border-surface-a30 text-surface-a40 text-[11px] px-3 py-1.5 rounded-lg cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5 text-warning-a0" />
                          <span>Locked (Coming Soon)</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTogglePayout(payout.id, payout.enabled)}
                          disabled={isBusy}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                            payout.enabled
                              ? 'bg-danger-a0/10 hover:bg-danger-a0/20 text-danger-a0 border-danger-a0/30'
                              : 'bg-success-a0/10 hover:bg-success-a0/20 text-success-a0 border-success-a0/30'
                          } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isBusy ? 'Updating...' : payout.enabled ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Talentir Explicit Boundary Note */}
        <div className="p-3.5 rounded-xl bg-warning-a0/10 border border-warning-a0/20 text-warning-a0 text-xs font-mono flex items-start space-x-2 mt-4">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Talentir Creator Share Engine Boundary</strong>
            <span>
              Talentir is represented as COMING SOON / DISABLED in the capability registry. API execution, payout delivery, credentials, and settlement code are intentionally deferred to maintain zero-loss architectural stability.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
