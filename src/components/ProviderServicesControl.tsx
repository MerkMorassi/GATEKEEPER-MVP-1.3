import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  Plus,
  Trash2,
  QrCode,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Download,
  X,
  Clock,
  Calendar,
  Radio,
  Tv,
  Cast,
  Activity,
  Users,
  Layers
} from 'lucide-react';
import QRCode from 'qrcode';
import { ProviderConfig, ServiceDefinition } from '../types';
import { apiFetch } from '../lib/api';

interface ProviderServicesControlProps {
  provider: ProviderConfig;
  onUpdateProvider: (updated: ProviderConfig) => void;
  onOpenQrModal: (data: {
    title: string;
    subtitle: string;
    qrDataUrl: string;
    directUrl: string;
    feeText?: string;
  }) => void;
}

export const ProviderServicesControl: React.FC<ProviderServicesControlProps> = ({
  provider,
  onUpdateProvider,
  onOpenQrModal,
}) => {
  const [services, setServices] = useState<ServiceDefinition[]>(provider.services || []);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedServiceId, setCopiedServiceId] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setServices(provider.services || []);
  }, [provider]);

  // Centralized Save Function
  const saveServicesAsync = async (updatedServices: ServiceDefinition[]) => {
    setSaving(true);
    setSaveStatus('saving');
    setStatusMessage(null);

    // Validation
    if (updatedServices.length < 1 || updatedServices.length > 10) {
      setSaveStatus('error');
      setStatusMessage('You can configure between 1 and 10 active service offerings.');
      setSaving(false);
      return;
    }

    try {
      const res = await apiFetch('/api/provider/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: updatedServices }),
      });

      const data = await res.json();
      if (data.success && data.provider) {
        onUpdateProvider(data.provider);
        setSaveStatus('saved');
        setStatusMessage('Services updated and deployed successfully.');
        setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage(null);
        }, 3000);
      } else {
        setSaveStatus('error');
        setStatusMessage(data.error || 'Failed to save services.');
      }
    } catch (err: any) {
      setSaveStatus('error');
      setStatusMessage('Network error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Add a new service tier or preset
  const handleAddService = (type: 'trial_15' | 'advisory_30' | 'strategy_45' | 'ppv_event' | 'custom') => {
    if (services.length >= 10) {
      setStatusMessage('Maximum of 10 service offerings allowed.');
      return;
    }

    let newService: ServiceDefinition;

    if (type === 'trial_15') {
      newService = {
        id: `srv_trial_${Date.now()}`,
        name: 'The 15 Minute Free Consultation',
        description: 'Complimentary 15-Minute 1-on-1 Discovery & Alignment Consultation Session. Direct Video Call Access with instant single-use pass.',
        feeCents: 0,
        currency: 'USD',
        isTrial: true,
        serviceType: 'ONE_ON_ONE',
        defaultDurationMinutes: 15,
        allowClientDurationAdjustment: true,
        allowedDurations: [10, 15, 20, 30],
        expirationDays: 7,
        passType: 'single_use',
      };
    } else if (type === 'ppv_event') {
      newService = {
        id: `srv_ppv_${Date.now()}`,
        name: 'Live Multi-Participant PPV Broadcast Pass',
        description: 'Special Live Member-Only Event Ticket. Switcher Studio Pro multi-camera production feed with sub-second ultra-low latency nanoCosmos WebRTC stream delivery.',
        feeCents: 9900,
        currency: 'USD',
        isTrial: false,
        serviceType: 'PPV_BROADCAST',
        defaultDurationMinutes: 90,
        allowClientDurationAdjustment: false,
        allowedDurations: [60, 90, 120],
        expirationDays: 3,
        passType: 'single_use',
        ppvEventDetails: {
          eventTitle: 'Executive Live Multi-Cam Briefing & Q&A',
          scheduledStartTime: '2026-09-15T19:00:00.000Z',
          streamSource: 'SWITCHER_STUDIO_PRO',
          deliveryEngine: 'NANOCOSMOS_NANOSTREAM',
          playerUrl: provider.ppvBroadcast?.deliveryEngine?.playbackUrl || 'https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=str_switcher_merk_001',
          maxCapacity: 500,
        },
      };
    } else if (type === 'advisory_30') {
      newService = {
        id: `srv_adv_${Date.now()}`,
        name: '30-Minute Confidential Advisory',
        description: '30-Minute Focused Advisory & Problem-Solving Session with Direct Video Access.',
        feeCents: 15000,
        currency: 'USD',
        isTrial: false,
        serviceType: 'ONE_ON_ONE',
        defaultDurationMinutes: 30,
        allowClientDurationAdjustment: true,
        allowedDurations: [20, 30, 45],
        expirationDays: 14,
        passType: 'single_use',
      };
    } else if (type === 'strategy_45') {
      newService = {
        id: `srv_strat_${Date.now()}`,
        name: '45-Minute Executive Strategy',
        description: '45-Minute In-Depth Executive Strategy & Architectural Roadmap Consultation.',
        feeCents: 25000,
        currency: 'USD',
        isTrial: false,
        serviceType: 'ONE_ON_ONE',
        defaultDurationMinutes: 45,
        allowClientDurationAdjustment: true,
        allowedDurations: [30, 45, 60],
        expirationDays: 14,
        passType: 'single_use',
      };
    } else {
      newService = {
        id: `srv_${Date.now()}`,
        name: 'Custom Consultation Offering',
        description: 'Direct 1-on-1 consultation session with verified gate pass and video access.',
        feeCents: 10000,
        currency: 'USD',
        isTrial: false,
        serviceType: 'ONE_ON_ONE',
        defaultDurationMinutes: 30,
        allowClientDurationAdjustment: true,
        allowedDurations: [15, 30, 45, 60],
        expirationDays: 14,
        passType: 'single_use',
      };
    }

    const nextServices = [...services, newService];
    setServices(nextServices);
    saveServicesAsync(nextServices);
  };

  // Remove a service tier
  const handleRemoveService = (serviceId: string) => {
    if (services.length <= 1) {
      setStatusMessage('At least 1 active service tier must be maintained.');
      return;
    }

    const nextServices = services.filter(s => s.id !== serviceId);
    setServices(nextServices);
    saveServicesAsync(nextServices);
  };

  // Update a specific service field
  const handleServiceChange = (index: number, field: keyof ServiceDefinition, value: any) => {
    const updated = [...services];
    updated[index] = {
      ...updated[index],
      [field]: field === 'feeCents' ? Math.max(0, Math.round(Number(value) || 0)) : value,
    };
    setServices(updated);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveServicesAsync(updated);
    }, 1000);
  };

  // Generate and open QR Code for a service tier
  const handleGenerateServiceQr = async (service: ServiceDefinition) => {
    try {
      const origin = window.location.origin;
      const directUrl = `${origin}/#service=${service.id}`;
      
      const qrDataUrl = await QRCode.toDataURL(directUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      onOpenQrModal({
        title: `Service: ${service.name}`,
        subtitle: `Direct client checkout link for ${service.name}`,
        qrDataUrl,
        directUrl,
        feeText: `$${(service.feeCents / 100).toFixed(2)} USD (85% Provider Share: $${((service.feeCents * 0.85) / 100).toFixed(2)})`,
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  const handleCopyDirectLink = (serviceId: string) => {
    const directUrl = `${window.location.origin}/#service=${serviceId}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedServiceId(serviceId);
    setTimeout(() => setCopiedServiceId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-tonal-a0 border border-surface-a10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-info-a0 bg-info-a0/10 px-2.5 py-0.5 rounded-full border border-info-a0/20">
              Service Catalog Management
            </span>
            {saveStatus === 'saved' && (
              <span className="text-[10px] font-mono text-success-a0 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Services Deployed</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <span>Active Service Offerings ({services.length}/10)</span>
          </h2>
          <p className="text-xs text-surface-a40 font-mono mt-0.5">
            Configure pricing, service descriptions, and generate scannable QR ticket entry points for each service offering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {services.length < 10 && (
            <>
              <button
                type="button"
                onClick={() => handleAddService('trial_15')}
                className="px-3.5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-mono font-bold rounded-xl border border-emerald-500/40 transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ The 15 Minute Free Consultation</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleAddService('custom')}
                className="px-3.5 py-2.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono font-bold rounded-xl border border-surface-a10 transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-info-a0" />
                <span>+ Add Service Tier</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => saveServicesAsync(services)}
            disabled={saving}
            className="px-5 py-2.5 bg-info-a0 hover:bg-info-a10 disabled:opacity-50 text-primary-a0 text-xs font-mono font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Services...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Services</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Add Presets Bar */}
      {services.length < 10 && (
        <div className="bg-surface-a0/60 border border-surface-a10 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <span className="text-surface-a40 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-info-a0" />
            <span>Quick-Add Service Templates:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddService('trial_15')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>15m Free Consultation ($0)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddService('ppv_event')}
              className="px-2.5 py-1 rounded-lg bg-warning-a0/10 hover:bg-warning-a0/20 text-warning-a0 border border-warning-a0/30 text-[11px] font-bold transition-all flex items-center gap-1"
            >
              <Radio className="w-3 h-3 text-warning-a0" />
              <span>PPV Live Event Pass ($99)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddService('advisory_30')}
              className="px-2.5 py-1 rounded-lg bg-tonal-a0 hover:bg-surface-a10 text-theme-light border border-surface-a10 text-[11px] font-bold transition-all flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-info-a0" />
              <span>30m Confidential Advisory ($150)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddService('strategy_45')}
              className="px-2.5 py-1 rounded-lg bg-tonal-a0 hover:bg-surface-a10 text-theme-light border border-surface-a10 text-[11px] font-bold transition-all flex items-center gap-1"
            >
              <Briefcase className="w-3 h-3 text-info-a0" />
              <span>45m Executive Strategy ($250)</span>
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-mono flex items-center space-x-2 ${
            saveStatus === 'error'
              ? 'bg-danger-a0/10 text-danger-a0 border border-danger-a0/30'
              : 'bg-success-a0/10 text-success-a0 border border-success-a0/30'
          }`}
        >
          {saveStatus === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-6">
        {services.map((service, index) => {
          const providerPayoutDollars = ((service.feeCents * 0.85) / 100).toFixed(2);
          const platformFeeDollars = ((service.feeCents * 0.15) / 100).toFixed(2);
          const isFree = service.feeCents === 0;

          return (
            <div
              key={service.id}
              className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-5 relative group hover:border-info-a0/40 transition-all shadow-md"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-a10">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-info-a0/10 text-info-a0 border border-info-a0/30 flex items-center justify-center font-mono font-bold text-xs">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-theme-light flex items-center space-x-2">
                      <span>{service.name || `Service Tier ${index + 1}`}</span>
                      {Boolean(service.serviceType === 'PPV_BROADCAST') && (
                        <span className="text-[10px] font-mono bg-warning-a0/15 text-warning-a0 px-2 py-0.5 rounded-md border border-warning-a0/30 uppercase font-bold flex items-center gap-1">
                          <Radio className="w-3 h-3 text-warning-a0 animate-pulse" />
                          <span>PPV Live Broadcast</span>
                        </span>
                      )}
                      {Boolean(service.isTrial || isFree) && (
                        <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 uppercase font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{service.isTrial ? 'Free Trial Tier' : 'Complimentary'}</span>
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] font-mono text-surface-a40">ID: {service.id} • {service.serviceType === 'PPV_BROADCAST' ? 'Multi-Participant PPV Ticket' : '1-on-1 Direct Pass'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleGenerateServiceQr(service)}
                    className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all flex items-center space-x-1.5"
                    title="Generate QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-info-a0" />
                    <span>Issue QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyDirectLink(service.id)}
                    className="px-3 py-1.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all flex items-center space-x-1.5"
                    title="Copy direct checkout link"
                  >
                    {copiedServiceId === service.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success-a0" />
                        <span className="text-success-a0">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-surface-a40" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveService(service.id)}
                      className="px-2.5 py-1.5 bg-danger-a0/10 hover:bg-danger-a0/20 text-danger-a0 text-xs font-mono rounded-xl border border-danger-a0/20 transition-all flex items-center"
                      title="Remove Service Tier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Service Name (6 cols) */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-xs font-mono text-surface-a40">Service Title</label>
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                    placeholder="e.g. 1-on-1 Confidential Consultation"
                    className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                  />
                </div>

                {/* Price in USD (3 cols) */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-mono text-surface-a40">Consultation Fee (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-a40 font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      disabled={Boolean(service.isTrial)}
                      value={service.feeCents / 100}
                      onChange={(e) => handleServiceChange(index, 'feeCents', Math.round(Number(e.target.value) * 100))}
                      placeholder="150"
                      className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Real-Time Split Breakdown Badge (3 cols) */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-mono text-surface-a40">85% Provider Net Payout</label>
                  <div className="bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 flex items-center justify-between font-mono text-xs">
                    <span className="text-success-a0 font-bold">${providerPayoutDollars}</span>
                    <span className="text-[10px] text-surface-a40">(15%: ${platformFeeDollars})</span>
                  </div>
                </div>

                {/* Free Trial Tier Switch (12 cols) */}
                <div className="md:col-span-12 bg-tonal-a0/60 border border-surface-a10/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-start sm:items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(service.isTrial)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const updated = [...services];
                        updated[index] = {
                          ...updated[index],
                          isTrial: checked,
                          feeCents: checked ? 0 : (updated[index].feeCents || 15000),
                          defaultDurationMinutes: checked ? 15 : (updated[index].defaultDurationMinutes || 30),
                          allowClientDurationAdjustment: true,
                          expirationDays: checked ? (updated[index].expirationDays || 7) : (updated[index].expirationDays || 14),
                          passType: 'single_use',
                        };
                        setServices(updated);
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                      }}
                      className="mt-0.5 sm:mt-0 w-4 h-4 rounded border-surface-a30 bg-surface-a0 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-theme-light flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Free Consultation Trial Offering (Bypasses Checkout)</span>
                      </span>
                      <p className="text-[11px] text-surface-a40 mt-0.5">
                        Zero-fee tier. Clients bypass payment gateway and immediately receive a cryptographically verified, single-use access pass with custom expiration.
                      </p>
                    </div>
                  </label>
                  {service.isTrial && (
                    <span className="self-start sm:self-center text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                      Zero-Fee Auto-Confirm
                    </span>
                  )}
                </div>

                {/* Time Slot Duration & Client Modifiability (6 cols) */}
                <div className="md:col-span-6 space-y-2 bg-tonal-a0/40 p-3.5 rounded-xl border border-surface-a10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-surface-a40 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-info-a0" />
                      <span>Default Consultation Duration</span>
                    </label>
                    <span className="text-[10px] font-mono text-info-a0 font-bold">
                      {service.defaultDurationMinutes || (service.isTrial ? 15 : 30)} Minutes
                    </span>
                  </div>

                  {/* Duration Selector Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[10, 15, 20, 30, 45, 60].map((dur) => {
                      const isDurSelected = (service.defaultDurationMinutes || (service.isTrial ? 15 : 30)) === dur;
                      return (
                        <button
                          type="button"
                          key={dur}
                          onClick={() => handleServiceChange(index, 'defaultDurationMinutes', dur)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                            isDurSelected
                              ? service.isTrial
                                ? 'bg-emerald-500 text-primary-a0 border-emerald-500 shadow-sm'
                                : 'bg-info-a0 text-primary-a0 border-info-a0 shadow-sm'
                              : 'bg-surface-a0 border-surface-a10 text-theme-light hover:border-surface-a30'
                          }`}
                        >
                          {dur}m
                        </button>
                      );
                    })}
                  </div>

                  <label className="flex items-center space-x-2 pt-2 cursor-pointer border-t border-surface-a10/60">
                    <input
                      type="checkbox"
                      checked={service.allowClientDurationAdjustment !== false}
                      onChange={(e) => handleServiceChange(index, 'allowClientDurationAdjustment', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-surface-a30 bg-surface-a0 text-info-a0"
                    />
                    <span className="text-[11px] text-surface-a40 font-mono">
                      Allow client to adjust time slot duration during booking
                    </span>
                  </label>
                </div>

                {/* Single-Use Pass Expiration Date / Validity Window (6 cols) */}
                <div className="md:col-span-6 space-y-2 bg-tonal-a0/40 p-3.5 rounded-xl border border-surface-a10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-surface-a40 font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-info-a0" />
                      <span>Pass Expiration Window</span>
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {service.expirationDate 
                        ? `Fixed: ${service.expirationDate}` 
                        : `${service.expirationDays || (service.isTrial ? 7 : 14)} Days Validity`}
                    </span>
                  </div>

                  {/* Expiration Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: '24h', days: 1 },
                      { label: '3 Days', days: 3 },
                      { label: '7 Days', days: 7 },
                      { label: '14 Days', days: 14 },
                      { label: '30 Days', days: 30 },
                    ].map((preset) => {
                      const isSelected = !service.expirationDate && (service.expirationDays || (service.isTrial ? 7 : 14)) === preset.days;
                      return (
                        <button
                          type="button"
                          key={preset.days}
                          onClick={() => {
                            const updated = [...services];
                            updated[index] = {
                              ...updated[index],
                              expirationDays: preset.days,
                              expirationDate: undefined,
                            };
                            setServices(updated);
                            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                            debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                            isSelected
                              ? 'bg-info-a0 text-primary-a0 border-info-a0 shadow-sm'
                              : 'bg-surface-a0 border-surface-a10 text-theme-light hover:border-surface-a30'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Specific Expiration Date Input */}
                  <div className="pt-2 border-t border-surface-a10/60 flex items-center gap-2">
                    <span className="text-[11px] text-surface-a40 font-mono whitespace-nowrap">Specific Expiration Date:</span>
                    <input
                      type="date"
                      value={service.expirationDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = [...services];
                        updated[index] = {
                          ...updated[index],
                          expirationDate: val || undefined,
                        };
                        setServices(updated);
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                      }}
                      className="w-full bg-surface-a0 border border-surface-a10 rounded-lg px-2.5 py-1 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                    />
                  </div>
                </div>

                {/* Description (12 cols) */}
                <div className="md:col-span-12 space-y-1.5">
                  <label className="text-xs font-mono text-surface-a40">Consultation Description & Scope</label>
                  <textarea
                    rows={2}
                    value={service.description}
                    onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                    placeholder="Describe what the client receives during this confidential 1-on-1 session..."
                    className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl p-3 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0 leading-relaxed"
                  />
                </div>

                {/* Service Type Selection & PPV Live Broadcast Parameters */}
                <div className="md:col-span-12 bg-tonal-a0/60 border border-surface-a10 rounded-xl p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-a10/60">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold font-mono text-theme-light flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-info-a0" />
                        <span>Delivery Architecture & Service Type</span>
                      </span>
                      <p className="text-[11px] text-surface-a40">
                        Choose whether this ticket issues a 1-on-1 direct consultation pass or a multi-participant live PPV stream access pass.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-surface-a0 p-1 rounded-xl border border-surface-a10">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...services];
                          updated[index] = {
                            ...updated[index],
                            serviceType: 'ONE_ON_ONE',
                          };
                          setServices(updated);
                          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                          debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          service.serviceType !== 'PPV_BROADCAST'
                            ? 'bg-info-a0 text-primary-a0 shadow-sm'
                            : 'text-surface-a40 hover:text-theme-light'
                        }`}
                      >
                        1-on-1 Private Consultation
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...services];
                          updated[index] = {
                            ...updated[index],
                            serviceType: 'PPV_BROADCAST',
                            ppvEventDetails: updated[index].ppvEventDetails || {
                              eventTitle: updated[index].name || 'Executive Live Multi-Cam Briefing',
                              scheduledStartTime: '2026-09-15T19:00:00.000Z',
                              streamSource: 'SWITCHER_STUDIO_PRO',
                              deliveryEngine: 'NANOCOSMOS_NANOSTREAM',
                              playerUrl: provider.ppvBroadcast?.deliveryEngine?.playbackUrl || 'https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=str_switcher_merk_001',
                              maxCapacity: 500,
                            },
                          };
                          setServices(updated);
                          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                          debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                          service.serviceType === 'PPV_BROADCAST'
                            ? 'bg-warning-a0 text-primary-a0 shadow-sm'
                            : 'text-surface-a40 hover:text-theme-light'
                        }`}
                      >
                        <Radio className="w-3 h-3" />
                        <span>Live PPV Broadcast</span>
                      </button>
                    </div>
                  </div>

                  {service.serviceType === 'PPV_BROADCAST' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-surface-a40">PPV Event Transmission Title</label>
                        <input
                          type="text"
                          value={service.ppvEventDetails?.eventTitle || ''}
                          onChange={(e) => {
                            const updated = [...services];
                            updated[index] = {
                              ...updated[index],
                              ppvEventDetails: {
                                ...(updated[index].ppvEventDetails || {}),
                                eventTitle: e.target.value,
                              },
                            };
                            setServices(updated);
                            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                            debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                          }}
                          placeholder="e.g. Executive Live Multi-Camera Production"
                          className="w-full bg-surface-a0 border border-surface-a10 rounded-lg px-3 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-warning-a0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-surface-a40">Event Scheduled Start Time (ISO)</label>
                        <input
                          type="text"
                          value={service.ppvEventDetails?.scheduledStartTime || ''}
                          onChange={(e) => {
                            const updated = [...services];
                            updated[index] = {
                              ...updated[index],
                              ppvEventDetails: {
                                ...(updated[index].ppvEventDetails || {}),
                                scheduledStartTime: e.target.value,
                              },
                            };
                            setServices(updated);
                            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                            debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                          }}
                          placeholder="2026-09-15T19:00:00.000Z"
                          className="w-full bg-surface-a0 border border-surface-a10 rounded-lg px-3 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-warning-a0"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[11px] font-mono text-surface-a40 flex items-center justify-between">
                          <span>nanoStream H5Live Playback URL (Ticket Holder Destination)</span>
                          <span className="text-[10px] text-warning-a0">Switcher Studio Pro &gt; nanoCosmos Cloud</span>
                        </label>
                        <input
                          type="text"
                          value={service.ppvEventDetails?.playerUrl || ''}
                          onChange={(e) => {
                            const updated = [...services];
                            updated[index] = {
                              ...updated[index],
                              ppvEventDetails: {
                                ...(updated[index].ppvEventDetails || {}),
                                playerUrl: e.target.value,
                              },
                            };
                            setServices(updated);
                            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                            debounceTimerRef.current = setTimeout(() => saveServicesAsync(updated), 500);
                          }}
                          placeholder="https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=..."
                          className="w-full bg-surface-a0 border border-surface-a10 rounded-lg px-3 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-warning-a0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
