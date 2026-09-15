import React, { useEffect, useState } from 'react';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit,
  Mail,
  DollarSign,
  Video,
  CreditCard,
  Lock,
  Building2,
  Sliders,
  XCircle,
} from 'lucide-react';
import { ProviderConfig, PaymentCapabilitiesConfig, PaymentMethodCapability } from '../types';
import { apiFetch } from '../lib/api';

export const AdminProvidersControl: React.FC = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [capabilities, setCapabilities] = useState<PaymentCapabilitiesConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Server Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Edit Modal State
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPayoutEmail, setFormPayoutEmail] = useState<string>('');
  const [formPaypalHandle, setFormPaypalHandle] = useState<string>('');
  const [formFacetimeHandle, setFormFacetimeHandle] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formPayoutsEnabled, setFormPayoutsEnabled] = useState<boolean>(true);
  const [formAcceptedMethods, setFormAcceptedMethods] = useState<string[]>([]);

  const fetchProvidersAndCapabilities = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const [provRes, capsRes] = await Promise.all([
        apiFetch(`/api/admin/providers?page=${targetPage}&limit=10`),
        apiFetch('/api/admin/capabilities'),
      ]);

      const provData = await provRes.json();
      const capsData = await capsRes.json();

      if (provData.success && provData.providers) {
        setProviders(provData.providers);
        if (provData.pagination) {
          setPage(provData.pagination.page);
          setTotalPages(provData.pagination.totalPages);
          setTotalRecords(provData.pagination.total);
        }
      } else {
        setError(provData.error || 'Failed to fetch registered providers.');
      }

      if (capsData.success && capsData.capabilities) {
        setCapabilities(capsData.capabilities);
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching providers and capabilities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvidersAndCapabilities(1);
  }, []);

  const openEditModal = (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setFormName(provider.name || '');
    setFormEmail(provider.email || '');
    setFormPayoutEmail(provider.payoutEmail || '');
    setFormPaypalHandle(provider.paypalMeHandle || '');
    setFormFacetimeHandle(provider.facetimeHandle || '');
    setFormActive(provider.active ?? true);
    setFormPayoutsEnabled(provider.payoutsEnabled ?? true);

    // Default accepted methods if not set
    if (provider.acceptedPaymentMethods && Array.isArray(provider.acceptedPaymentMethods)) {
      setFormAcceptedMethods([...provider.acceptedPaymentMethods]);
    } else {
      setFormAcceptedMethods(['card', 'apple_pay', 'google_pay', 'link', 'cash_app', 'paypal']);
    }

    setIsEditing(true);
  };

  const toggleAcceptedMethod = (methodId: string) => {
    if (formAcceptedMethods.includes(methodId)) {
      setFormAcceptedMethods(formAcceptedMethods.filter((m) => m !== methodId));
    } else {
      setFormAcceptedMethods([...formAcceptedMethods, methodId]);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await apiFetch(`/api/admin/providers/${selectedProvider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          payoutEmail: formPayoutEmail,
          paypalMeHandle: formPaypalHandle,
          facetimeHandle: formFacetimeHandle,
          active: formActive,
          payoutsEnabled: formPayoutsEnabled,
          acceptedPaymentMethods: formAcceptedMethods,
        }),
      });

      const data = await res.json();
      if (data.success && data.provider) {
        setSuccessMessage(`Provider "${data.provider.name}" configuration updated successfully.`);
        setIsEditing(false);
        fetchProvidersAndCapabilities();
      } else {
        setError(data.error || 'Failed to update provider configuration.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving provider settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-surface-a40 font-mono flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-info-a0" />
        <span>Loading Provider Registry & Capabilities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-a10 pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-info-a0 font-semibold bg-info-a0/10 px-2.5 py-1 rounded-md border border-info-a0/20">
            Tenant Isolation & Provider Management
          </span>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <User className="w-5 h-5 text-info-a0" />
            <span>Registered Provider Registry</span>
          </h2>
          <p className="text-xs text-surface-a40 mt-0.5">
            Configure provider identities, payment preferences, and tenant isolation boundaries.
          </p>
        </div>

        <button
          onClick={fetchProvidersAndCapabilities}
          className="px-3.5 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs rounded-xl border border-surface-a10 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Registry</span>
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="bg-danger-a0/10 border border-danger-a0/30 p-4 rounded-xl text-xs text-danger-a0 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-success-a0/10 border border-success-a0/30 p-4 rounded-xl text-xs text-success-a0 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* PROVIDERS GRID / LIST */}
      <div className="space-y-6">
        {providers.map((p) => (
          <div
            key={p.id}
            className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-a10/60">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-tonal-a0 border border-surface-a10 rounded-xl text-info-a0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-theme-light">{p.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-info-a0/10 text-info-a0 border border-info-a0/20">
                      ID: {p.id}
                    </span>
                  </div>
                  <p className="text-xs text-surface-a40 mt-0.5">{p.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-start md:self-auto">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                    p.active
                      ? 'bg-success-a0/10 text-success-a0 border-success-a0/30'
                      : 'bg-danger-a0/10 text-danger-a0 border-danger-a0/30'
                  }`}
                >
                  {p.active ? 'Active Tenant' : 'Inactive Tenant'}
                </span>

                <button
                  onClick={() => openEditModal(p)}
                  className="px-3.5 py-2 bg-info-a0 hover:bg-info-a10 text-primary-a0 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-md"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Configure Provider</span>
                </button>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-tonal-a0/50 p-3.5 rounded-xl border border-surface-a10">
                <span className="text-surface-a40 block text-[10px] uppercase tracking-wider mb-1">Payout Email</span>
                <span className="text-theme-light font-bold flex items-center space-x-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-info-a0 flex-shrink-0" />
                  <span className="truncate">{p.payoutEmail || 'Not Configured'}</span>
                </span>
              </div>

              <div className="bg-tonal-a0/50 p-3.5 rounded-xl border border-surface-a10">
                <span className="text-surface-a40 block text-[10px] uppercase tracking-wider mb-1">PayPal.me Handle</span>
                <span className="text-theme-light font-bold flex items-center space-x-1.5 truncate">
                  <DollarSign className="w-3.5 h-3.5 text-warning-a0 flex-shrink-0" />
                  <span className="truncate">{p.paypalMeHandle || 'Not Configured'}</span>
                </span>
              </div>

              <div className="bg-tonal-a0/50 p-3.5 rounded-xl border border-surface-a10">
                <span className="text-surface-a40 block text-[10px] uppercase tracking-wider mb-1">Stripe Connected Account</span>
                <span className="text-theme-light font-bold flex items-center space-x-1.5 truncate">
                  <CreditCard className="w-3.5 h-3.5 text-info-a0 flex-shrink-0" />
                  <span className="truncate">{p.stripeAccountId || 'Platform Default'}</span>
                </span>
              </div>

              <div className="bg-tonal-a0/50 p-3.5 rounded-xl border border-surface-a10">
                <span className="text-surface-a40 block text-[10px] uppercase tracking-wider mb-1">FaceTime Access Handle</span>
                <span className="text-theme-light font-bold flex items-center space-x-1.5 truncate">
                  <Video className="w-3.5 h-3.5 text-success-a0 flex-shrink-0" />
                  <span className="truncate">{p.facetimeHandle ? 'Configured (Escrow Encrypted)' : 'Not Set'}</span>
                </span>
              </div>
            </div>

            {/* ACCEPTED PAYMENT CAPABILITIES INTERSECTION */}
            <div className="space-y-2 pt-2 border-t border-surface-a10/50">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-a40 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-info-a0" />
                  <span>Accepted Payment Capabilities (Platform Intersection)</span>
                </h4>
                <span className="text-[10px] text-surface-a40 bg-tonal-a0 px-2 py-0.5 rounded border border-surface-a10">
                  Platform Limits Apply
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {capabilities &&
                  (Object.values(capabilities.paymentMethods) as PaymentMethodCapability[]).map((m) => {
                    const platformEnabled = m.enabled && m.operational;
                    const providerAccepts = p.acceptedPaymentMethods
                      ? p.acceptedPaymentMethods.includes(m.id)
                      : true;
                    const isEffective = platformEnabled && providerAccepts;

                    return (
                      <div
                        key={m.id}
                        className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-bold ${
                          isEffective
                            ? 'bg-success-a0/10 text-success-a0 border-success-a0/30'
                            : !platformEnabled
                            ? 'bg-surface-a10/30 text-surface-a40 border-surface-a10 opacity-60'
                            : 'bg-warning-a0/10 text-warning-a0 border-warning-a0/30'
                        }`}
                      >
                        {isEffective ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : !platformEnabled ? (
                          <Lock className="w-3.5 h-3.5 text-surface-a40" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{m.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface-a0 border border-surface-a10">
                          {!platformEnabled
                            ? 'Platform Disabled'
                            : providerAccepts
                            ? 'Active'
                            : 'Provider Opted-Out'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* SERVICES OFFERED */}
            <div className="space-y-2 pt-2 border-t border-surface-a10/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-surface-a40">
                Configured Services ({p.services?.length || 0})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {p.services?.map((s) => (
                  <div
                    key={s.id}
                    className="bg-tonal-a0 p-3.5 rounded-xl border border-surface-a10 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-theme-light block">{s.name}</span>
                      <span className="text-[10px] text-surface-a40 block mt-0.5 line-clamp-1">
                        {s.description}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-success-a0 bg-success-a0/10 px-2.5 py-1 rounded border border-success-a0/20">
                      ${(s.feeCents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Server Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-a10 text-xs font-mono">
          <span className="text-surface-a40">
            Page <span className="text-theme-light font-bold">{page}</span> of <span className="text-theme-light font-bold">{totalPages}</span> ({totalRecords} providers)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchProvidersAndCapabilities(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Previous
            </button>
            <button
              onClick={() => fetchProvidersAndCapabilities(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 disabled:opacity-40 text-theme-light rounded-xl border border-surface-a10 transition-all text-xs font-mono"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* EDIT PROVIDER MODAL */}
      {isEditing && selectedProvider && (
        <div className="fixed inset-0 z-50 bg-primary-a0/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-6 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-info-a0" />
                <h3 className="text-sm font-bold text-theme-light">Edit Provider: {selectedProvider.name}</h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-surface-a40 hover:text-theme-light font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-5">
              <div>
                <label className="block text-surface-a40 text-[10px] uppercase tracking-wider mb-1">
                  Provider / Entity Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
                  required
                />
              </div>

              <div>
                <label className="block text-surface-a40 text-[10px] uppercase tracking-wider mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
                  required
                />
              </div>

              <div>
                <label className="block text-surface-a40 text-[10px] uppercase tracking-wider mb-1">
                  PayPal Payout Email (For 85% Disbursal)
                </label>
                <input
                  type="email"
                  value={formPayoutEmail}
                  onChange={(e) => setFormPayoutEmail(e.target.value)}
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-a40 text-[10px] uppercase tracking-wider mb-1">
                    PayPal.me Handle
                  </label>
                  <input
                    type="text"
                    value={formPaypalHandle}
                    onChange={(e) => setFormPaypalHandle(e.target.value)}
                    className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
                    placeholder="e.g. merkmorassi"
                  />
                </div>

                <div>
                  <label className="block text-surface-a40 text-[10px] uppercase tracking-wider mb-1">
                    FaceTime Handle / Link
                  </label>
                  <input
                    type="text"
                    value={formFacetimeHandle}
                    onChange={(e) => setFormFacetimeHandle(e.target.value)}
                    className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-theme-light focus:outline-none focus:border-info-a0"
                  />
                </div>
              </div>

              {/* PAYMENT CAPABILITIES PREFERENCES (INTERSECTION WITH PLATFORM) */}
              <div className="space-y-3 p-4 bg-tonal-a0/60 rounded-xl border border-surface-a10">
                <div className="flex items-center justify-between">
                  <span className="text-theme-light font-bold text-xs flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-info-a0" />
                    <span>Accepted Payment Methods Preferences</span>
                  </span>
                  <span className="text-[10px] text-surface-a40 uppercase">
                    Platform Intersection Rules Apply
                  </span>
                </div>

                <p className="text-[11px] text-surface-a40">
                  Providers can choose which payment methods to accept from among those permitted at the platform level. Platform-disabled capabilities cannot be enabled.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {capabilities &&
                    (Object.values(capabilities.paymentMethods) as PaymentMethodCapability[]).map((m) => {
                      const platformPermitted = m.enabled && m.operational;
                      const isChecked = formAcceptedMethods.includes(m.id);

                      return (
                        <label
                          key={m.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            !platformPermitted
                              ? 'bg-surface-a10/20 border-surface-a10 opacity-50 cursor-not-allowed'
                              : isChecked
                              ? 'bg-info-a0/10 border-info-a0/40 text-theme-light'
                              : 'bg-surface-a0 border-surface-a10 text-surface-a40'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isChecked && platformPermitted}
                              disabled={!platformPermitted}
                              onChange={() => toggleAcceptedMethod(m.id)}
                              className="w-4 h-4 accent-info-a0 rounded cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="font-bold text-xs">{m.name}</span>
                          </div>

                          {!platformPermitted && (
                            <span className="text-[9px] uppercase font-bold text-surface-a40 bg-surface-a10 px-1.5 py-0.5 rounded flex items-center space-x-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Platform Disabled</span>
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* PAYOUT CAPABILITY PREFERENCES */}
              <div className="p-4 bg-tonal-a0/60 rounded-xl border border-surface-a10 space-y-2">
                <span className="text-theme-light font-bold text-xs block">Payout Provider Preference</span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2 bg-surface-a0 rounded-lg border border-surface-a10">
                    <span className="text-theme-light font-bold">Stripe Connect Destination Charges</span>
                    <span className="text-success-a0 text-[10px] font-bold uppercase">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-surface-a0 rounded-lg border border-surface-a10">
                    <span className="text-theme-light font-bold">PayPal Payouts Email Disbursal</span>
                    <span className="text-info-a0 text-[10px] font-bold uppercase">Available</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-surface-a10/30 rounded-lg border border-surface-a10 opacity-60">
                    <span className="text-surface-a40 font-bold flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-warning-a0" />
                      <span>Talentir Creator Share Engine</span>
                    </span>
                    <span className="text-warning-a0 text-[10px] font-bold uppercase">COMING SOON / LOCKED</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-tonal-a0 rounded-xl border border-surface-a10">
                <span className="text-theme-light font-bold">Active Tenant Status</span>
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 accent-info-a0 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-surface-a10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-tonal-a0 text-surface-a40 hover:text-theme-light rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-info-a0 hover:bg-info-a10 text-primary-a0 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Configuration</span>
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
