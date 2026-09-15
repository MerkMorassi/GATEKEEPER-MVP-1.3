import React, { useState, useEffect } from 'react';
import {
  User,
  Settings,
  Briefcase,
  Share2,
  DollarSign,
  RefreshCw,
  Power,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  X,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { ProviderConfig, Order, Gate } from '../types';
import { apiFetch } from '../lib/api';
import { ProviderProfileControl } from './ProviderProfileControl';
import { ProviderSettingsControl } from './ProviderSettingsControl';
import { ProviderServicesControl } from './ProviderServicesControl';
import { ProviderMarketingControl } from './ProviderMarketingControl';
import { ProviderTransactionsControl } from './ProviderTransactionsControl';

export type ProviderSubTab = 'profile' | 'settings' | 'services' | 'marketing' | 'transactions';

export const ProviderDashboard: React.FC = () => {
  const [provider, setProvider] = useState<ProviderConfig | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subtab navigation state
  const [providerSubTab, setProviderSubTab] = useState<ProviderSubTab>('profile');

  // QR Code Modal State
  const [qrModalData, setQrModalData] = useState<{
    title: string;
    subtitle: string;
    qrDataUrl: string;
    directUrl: string;
    feeText?: string;
    gateDetails?: Gate;
  } | null>(null);
  const [copiedModalUrl, setCopiedModalUrl] = useState(false);

  // Deep linking and browser URL hash sync
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#provider/')) {
        const sub = hash.replace('#provider/', '').trim();
        if (['profile', 'settings', 'services', 'marketing', 'transactions'].includes(sub)) {
          setProviderSubTab(sub as ProviderSubTab);
        }
      }
    };

    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  const handleSubTabChange = (tabId: ProviderSubTab) => {
    setProviderSubTab(tabId);
    window.location.hash = `#provider/${tabId}`;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/provider/overview');
      const data = await res.json();
      if (data.success && data.overview) {
        setProvider(data.overview.provider);
        setOrders(data.overview.orders || []);
        setGates(data.overview.gates || []);
      } else {
        setError(data.error || 'Failed to load Provider overview data.');
      }
    } catch (err: any) {
      console.error('Failed to load Provider overview:', err);
      setError('Network connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle provider online / offline directly from header
  const handleToggleGateOnline = async () => {
    if (!provider) return;
    const nextState = !provider.active;
    try {
      const res = await apiFetch('/api/provider/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState }),
      });
      const data = await res.json();
      if (data.success && data.provider) {
        setProvider(data.provider);
      }
    } catch (err) {
      console.error('Error toggling gate status:', err);
    }
  };

  const handleCopyModalUrl = () => {
    if (!qrModalData) return;
    navigator.clipboard.writeText(qrModalData.directUrl);
    setCopiedModalUrl(true);
    setTimeout(() => setCopiedModalUrl(false), 2000);
  };

  if (loading && !provider) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-info-a0 mx-auto" />
        <h3 className="text-sm font-mono text-surface-a40">Authenticating & Loading Provider Control Surface...</h3>
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-danger-a0/10 border border-danger-a0/30 rounded-2xl p-6 space-y-3">
          <AlertCircle className="w-8 h-8 text-danger-a0 mx-auto" />
          <h3 className="text-base font-bold text-theme-light">Error Loading Provider Console</h3>
          <p className="text-xs text-surface-a40 font-mono">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-2 bg-info-a0 text-primary-a0 font-mono text-xs font-bold rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-a10 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-info-a0 font-semibold bg-info-a0/10 px-2.5 py-1 rounded-md border border-info-a0/20">
              Provider Operations Console
            </span>
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
              provider?.active
                ? 'bg-success-a0/10 text-success-a0 border border-success-a0/30'
                : 'bg-danger-a0/10 text-danger-a0 border border-danger-a0/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${provider?.active ? 'bg-success-a0 animate-ping' : 'bg-danger-a0'}`} />
              <span>{provider?.active ? 'Gate Online' : 'Gate Offline'}</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-theme-light mt-2 flex items-center space-x-2">
            <span>{provider?.name || 'Merk Morassi'}</span>
            {provider?.title && (
              <span className="text-xs font-normal text-surface-a40 font-mono">
                • {provider.title}
              </span>
            )}
          </h1>
          <p className="text-xs text-surface-a40 mt-0.5 font-mono">
            Provider Card • Operational Settings • Service Offerings • Marketing Campaigns • Disbursement Ledger
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
          <a
            href="#sales"
            className="px-3.5 py-2 bg-info-a0/10 hover:bg-info-a0/20 text-info-a0 border border-info-a0/30 text-xs font-mono font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm"
            title="Open Provider Sovereign Sales & Landing Page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Sales Page</span>
          </a>

          <button
            type="button"
            onClick={handleToggleGateOnline}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-2 border shadow-sm ${
              provider?.active
                ? 'bg-tonal-a0 hover:bg-surface-a10 text-theme-light border-surface-a10'
                : 'bg-success-a0 text-primary-a0 hover:bg-success-a0/90 border-transparent shadow-success-a0/20'
            }`}
            title="Toggle Gate Online/Offline"
          >
            <Power className={`w-3.5 h-3.5 ${provider?.active ? 'text-success-a0' : 'text-primary-a0'}`} />
            <span>{provider?.active ? 'Gate Online' : 'Go Online'}</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all flex items-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Provider Sub-Navigation Tab Bar */}
      <div className="flex items-center space-x-2 border-b border-surface-a10 pb-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'Provider Card', icon: User },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'services', label: 'Services', icon: Briefcase, count: provider?.services?.length },
          { id: 'marketing', label: 'Marketing', icon: Share2, count: gates.length },
          { id: 'transactions', label: 'Transactions', icon: DollarSign, count: orders.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = providerSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id as ProviderSubTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${
                isActive
                  ? 'bg-info-a0/20 text-info-a0 border border-info-a0/40 font-bold shadow-sm'
                  : 'bg-tonal-a0 text-surface-a40 hover:text-theme-light border border-surface-a10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  isActive ? 'bg-info-a0 text-primary-a0' : 'bg-surface-a10 text-surface-a40'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View Rendering */}
      {provider && (
        <>
          {providerSubTab === 'profile' && (
            <ProviderProfileControl
              provider={provider}
              onUpdateProvider={(updated) => setProvider(updated)}
              onNavigateToServices={() => handleSubTabChange('services')}
            />
          )}

          {providerSubTab === 'settings' && (
            <ProviderSettingsControl
              provider={provider}
              onUpdateProvider={(updated) => setProvider(updated)}
            />
          )}

          {providerSubTab === 'services' && (
            <ProviderServicesControl
              provider={provider}
              onUpdateProvider={(updated) => setProvider(updated)}
              onOpenQrModal={(data) => setQrModalData(data)}
            />
          )}

          {providerSubTab === 'marketing' && (
            <ProviderMarketingControl
              provider={provider}
              gates={gates}
              onRefreshData={fetchData}
              onOpenQrModal={(data) => setQrModalData(data)}
            />
          )}

          {providerSubTab === 'transactions' && (
            <ProviderTransactionsControl
              provider={provider}
              orders={orders}
              onRefreshData={fetchData}
            />
          )}
        </>
      )}

      {/* Global QR Code Modal */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-a0 border border-surface-a10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-info-a0" />
                <h3 className="text-base font-bold text-theme-light">Scannable QR Entry Pass</h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="p-1.5 rounded-full hover:bg-tonal-a0 text-surface-a40 hover:text-theme-light"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign info */}
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-theme-light">{qrModalData.title}</h4>
              <p className="text-xs text-surface-a40 font-mono">{qrModalData.subtitle}</p>
              {qrModalData.feeText && (
                <div className="inline-block mt-1 px-3 py-1 bg-success-a0/10 text-success-a0 border border-success-a0/30 rounded-full text-xs font-mono font-bold">
                  {qrModalData.feeText}
                </div>
              )}
            </div>

            {/* QR Code Canvas / Image Box */}
            <div className="bg-white p-6 rounded-2xl flex items-center justify-center shadow-inner mx-auto max-w-xs">
              <img
                src={qrModalData.qrDataUrl}
                alt="Entry QR Code"
                className="w-56 h-56 object-contain"
              />
            </div>

            {/* Instructions */}
            <div className="bg-tonal-a0/80 border border-surface-a10 rounded-xl p-3.5 text-center text-xs font-mono text-surface-a40 space-y-1">
              <p className="text-theme-light font-bold">Point iPhone Camera at QR Code</p>
              <p className="text-[11px]">Clients are automatically directed to private checkout and token issuance.</p>
            </div>

            {/* Direct URL and Download */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={qrModalData.directUrl}
                  className="flex-1 bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-[11px] font-mono text-theme-light truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyModalUrl}
                  className="px-3 py-2 bg-info-a0 hover:bg-info-a10 text-primary-a0 text-xs font-mono font-bold rounded-xl transition-all flex items-center space-x-1"
                >
                  {copiedModalUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedModalUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <a
                href={qrModalData.qrDataUrl}
                download="gatekeeper-qr-pass.png"
                className="w-full py-2.5 bg-tonal-a0 hover:bg-surface-a10 border border-surface-a10 text-theme-light text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <Download className="w-3.5 h-3.5 text-info-a0" />
                <span>Download High-Resolution PNG</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
