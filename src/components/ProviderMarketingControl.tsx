import React, { useState, useMemo } from 'react';
import {
  Share2,
  Plus,
  QrCode,
  Copy,
  Trash2,
  Edit3,
  Filter,
  ArrowUpDown,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Check,
  Power,
  X,
  Sparkles,
  RefreshCw,
  Gift,
  Megaphone,
  Zap,
  ArrowRight,
  Ticket,
  MessageSquare
} from 'lucide-react';
import QRCode from 'qrcode';
import { ProviderConfig, Gate, ServiceDefinition } from '../types';
import { apiFetch } from '../lib/api';

interface ProviderMarketingControlProps {
  provider: ProviderConfig;
  gates: Gate[];
  onRefreshData: () => void;
  onOpenQrModal: (data: {
    title: string;
    subtitle: string;
    qrDataUrl: string;
    directUrl: string;
    feeText?: string;
    gateDetails?: Gate;
  }) => void;
}

export const ProviderMarketingControl: React.FC<ProviderMarketingControlProps> = ({
  provider,
  gates,
  onRefreshData,
  onOpenQrModal,
}) => {
  // New Gate Creation State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGateCustomName, setNewGateCustomName] = useState('');
  const [newGatePromotionType, setNewGatePromotionType] = useState('Free Consultation');
  const [newGateTargetServiceId, setNewGateTargetServiceId] = useState(provider.services?.[0]?.id || '');
  const [newGateServiceDescription, setNewGateServiceDescription] = useState('');
  const [newGateExpiryDate, setNewGateExpiryDate] = useState('');
  const [newGateCustomGreeting, setNewGateCustomGreeting] = useState('');
  const [creatingGate, setCreatingGate] = useState(false);

  // Filtering & Sorting State
  const [gateFilter, setGateFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [gateSortBy, setGateSortBy] = useState<'created_desc' | 'created_asc' | 'expiry_asc' | 'expiry_desc' | 'name_asc'>('created_desc');
  const [gateSearchQuery, setGateSearchQuery] = useState('');

  // Editing Gate State
  const [editingGateId, setEditingGateId] = useState<string | null>(null);
  const [editingGateName, setEditingGateName] = useState('');
  const [editingGatePromotionType, setEditingGatePromotionType] = useState('');
  const [editingGateTargetServiceId, setEditingGateTargetServiceId] = useState('');
  const [editingGateServiceDescription, setEditingGateServiceDescription] = useState('');
  const [editingGateExpiryDate, setEditingGateExpiryDate] = useState('');
  const [editingGateCustomGreeting, setEditingGateCustomGreeting] = useState('');
  const [updatingGate, setUpdatingGate] = useState(false);

  // Action status / feedback
  const [copiedGateId, setCopiedGateId] = useState<string | null>(null);
  const [copiedFreeAsset, setCopiedFreeAsset] = useState<string | null>(null);
  const [generatingFreeGate, setGeneratingFreeGate] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Identify active Free Consultation Service
  const freeService = useMemo(() => {
    return provider.services?.find((s) => s.isTrial || s.feeCents === 0);
  }, [provider.services]);

  // Filtered & Sorted Gates
  const processedGates = useMemo(() => {
    return gates
      .filter((gate) => {
        if (gateFilter === 'active') {
          if (!gate.active) return false;
          if (gate.expiryDate && new Date(gate.expiryDate).getTime() < Date.now()) return false;
          return true;
        }
        if (gateFilter === 'expired') {
          if (!gate.active) return true;
          if (gate.expiryDate && new Date(gate.expiryDate).getTime() < Date.now()) return true;
          return false;
        }
        return true;
      })
      .filter((gate) => {
        if (!gateSearchQuery.trim()) return true;
        const q = gateSearchQuery.toLowerCase();
        return (
          gate.customName?.toLowerCase().includes(q) ||
          gate.promotionType?.toLowerCase().includes(q) ||
          gate.customGreeting?.toLowerCase().includes(q) ||
          gate.id.toLowerCase().includes(q) ||
          gate.targetServiceId?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (gateSortBy === 'created_desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (gateSortBy === 'created_asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (gateSortBy === 'expiry_asc') {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }
        if (gateSortBy === 'expiry_desc') {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
        }
        if (gateSortBy === 'name_asc') {
          return (a.customName || a.id).localeCompare(b.customName || b.id);
        }
        return 0;
      });
  }, [gates, gateFilter, gateSearchQuery, gateSortBy]);

  // Create Marketing Gate Handler
  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingGate(true);
    setStatusNotice(null);

    try {
      const res = await apiFetch('/api/gates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: newGateCustomName.trim() || undefined,
          promotionType: newGatePromotionType || undefined,
          targetServiceId: newGateTargetServiceId || undefined,
          serviceDescription: newGateServiceDescription.trim() || undefined,
          expiryDate: newGateExpiryDate || undefined,
          customGreeting: newGateCustomGreeting.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusNotice({ text: 'Marketing gate campaign generated successfully.', type: 'success' });
        setNewGateCustomName('');
        setNewGateServiceDescription('');
        setNewGateExpiryDate('');
        setNewGateCustomGreeting('');
        setShowCreateForm(false);
        onRefreshData();
      } else {
        setStatusNotice({ text: data.error || 'Failed to generate gate.', type: 'error' });
      }
    } catch (err: any) {
      setStatusNotice({ text: 'Network error: ' + err.message, type: 'error' });
    } finally {
      setCreatingGate(false);
    }
  };

  // Toggle Gate Active State
  const handleToggleGateActive = async (gate: Gate) => {
    try {
      const res = await apiFetch(`/api/gates/${gate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !gate.active }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to toggle gate status:', err);
    }
  };

  // Start editing a gate
  const handleStartEditGate = (gate: Gate) => {
    setEditingGateId(gate.id);
    setEditingGateName(gate.customName || '');
    setEditingGatePromotionType(gate.promotionType || 'Free Consultation');
    setEditingGateTargetServiceId(gate.targetServiceId || '');
    setEditingGateServiceDescription(gate.serviceDescription || '');
    setEditingGateExpiryDate(gate.expiryDate || '');
    setEditingGateCustomGreeting(gate.customGreeting || '');
  };

  // Save edited gate
  const handleSaveEditGate = async (gateId: string) => {
    setUpdatingGate(true);
    try {
      const res = await apiFetch(`/api/gates/${gateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: editingGateName.trim() || undefined,
          promotionType: editingGatePromotionType || undefined,
          targetServiceId: editingGateTargetServiceId || undefined,
          serviceDescription: editingGateServiceDescription.trim() || undefined,
          expiryDate: editingGateExpiryDate || undefined,
          customGreeting: editingGateCustomGreeting.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingGateId(null);
        setStatusNotice({ text: 'Marketing gate metadata updated.', type: 'success' });
        onRefreshData();
      } else {
        setStatusNotice({ text: data.error || 'Failed to update gate.', type: 'error' });
      }
    } catch (err: any) {
      setStatusNotice({ text: 'Error: ' + err.message, type: 'error' });
    } finally {
      setUpdatingGate(false);
    }
  };

  // Delete gate
  const handleDeleteGate = async (gateId: string) => {
    if (!confirm('Are you sure you want to permanently delete this marketing gate?')) return;

    try {
      const res = await apiFetch(`/api/gates/${gateId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setStatusNotice({ text: 'Marketing gate deleted.', type: 'success' });
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to delete gate:', err);
    }
  };

  // Open QR modal for gate
  const handleOpenGateQr = async (gate: Gate) => {
    const origin = window.location.origin;
    const directUrl = `${origin}/#gate=${gate.id}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(directUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      onOpenQrModal({
        title: gate.customName || 'Marketing Gate Entry',
        subtitle: `Campaign Entry Point (${gate.promotionType || 'Special Offer'})`,
        qrDataUrl,
        directUrl,
        gateDetails: gate,
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  const handleCopyGateLink = (gateId: string) => {
    const directUrl = `${window.location.origin}/#gate=${gateId}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedGateId(gateId);
    setTimeout(() => setCopiedGateId(null), 2000);
  };

  // Free Tier QR modal generator
  const handleOpenFreeTierQr = async () => {
    if (!freeService) return;
    const origin = window.location.origin;
    const directUrl = `${origin}/#service=${freeService.id}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(directUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      onOpenQrModal({
        title: freeService.name,
        subtitle: `Marketing Asset • Instant Complimentary Pass (${freeService.defaultDurationMinutes || 15} Min)`,
        qrDataUrl,
        directUrl,
        feeText: 'FREE TRIAL ($0.00 USD) • Single-Use Direct Video Bridge',
      });
    } catch (err) {
      console.error('Error generating Free Tier QR code:', err);
    }
  };

  // Copy Free Tier Direct Link
  const handleCopyFreeTierLink = () => {
    if (!freeService) return;
    const directUrl = `${window.location.origin}/#service=${freeService.id}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedFreeAsset('link');
    setTimeout(() => setCopiedFreeAsset(null), 2500);
  };

  // Copy Pre-written Free Promo Social Post
  const handleCopyFreePromoText = () => {
    if (!freeService) return;
    const directUrl = `${window.location.origin}/#service=${freeService.id}`;
    const text = `🎯 Book a complimentary 15-Minute Strategy & Alignment Consultation with ${provider.name || 'our team'}. Claim your direct video access pass here: ${directUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedFreeAsset('social');
    setTimeout(() => setCopiedFreeAsset(null), 2500);
  };

  // One-click Auto-Generate Free Consultation Marketing Gate Campaign
  const handleQuickCreateFreeGate = async () => {
    if (!freeService) return;
    setGeneratingFreeGate(true);
    setStatusNotice(null);

    try {
      const res = await apiFetch('/api/gates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: 'The 15 Minute Free Consultation Campaign',
          promotionType: 'Free Consultation',
          targetServiceId: freeService.id,
          serviceDescription: 'Special discovery campaign granting instant zero-friction 15-minute consultation passes.',
          customGreeting: `Welcome! Claim your complimentary 15-minute discovery consultation session with ${provider.name}.`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusNotice({
          text: 'Dedicated Free Consultation marketing gate campaign generated with custom QR ticket access!',
          type: 'success',
        });
        onRefreshData();
      } else {
        setStatusNotice({ text: data.error || 'Failed to generate free gate.', type: 'error' });
      }
    } catch (err: any) {
      setStatusNotice({ text: 'Error: ' + err.message, type: 'error' });
    } finally {
      setGeneratingFreeGate(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-tonal-a0 border border-surface-a10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-info-a0 bg-info-a0/10 px-2.5 py-0.5 rounded-full border border-info-a0/20">
              Client Acquisition & Entry Gates
            </span>
            <span className="text-[10px] font-mono text-surface-a40">
              {gates.length} Total Campaigns
            </span>
          </div>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <span>Marketing Gates & Custom QR Entry Points</span>
          </h2>
          <p className="text-xs text-surface-a40 font-mono mt-0.5">
            Create branded marketing campaign gates with custom greetings, target service tiers, and scannable QR ticket entry points.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-5 py-2.5 bg-info-a0 hover:bg-info-a10 text-primary-a0 text-xs font-mono font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2"
          >
            {showCreateForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showCreateForm ? 'Cancel New Gate' : 'Create Marketing Gate'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURED MARKETING ASSET: THE 15 MINUTE FREE CONSULTATION */}
      {/* ========================================================================= */}
      {freeService ? (
        <div className="bg-gradient-to-br from-emerald-500/10 via-surface-a0 to-surface-a0 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          {/* Background Glow Badge */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Gift className="w-3.5 h-3.5" />
                  <span>Featured Marketing Asset</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400/80 font-bold">
                  Zero-Payment Discovery Bridge
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-theme-light flex items-center gap-2">
                <span>{freeService.name}</span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                  {freeService.defaultDurationMinutes || 15} MIN
                </span>
              </h3>

              <p className="text-xs text-surface-a40 leading-relaxed font-mono">
                {freeService.description || 'Complimentary 1-on-1 Discovery & Alignment Consultation Session. Direct Video Call Access with instant single-use pass.'}
              </p>

              {/* Badges / Asset Highlights */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-tonal-a0 text-surface-a40 border border-surface-a10 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>Instant Pass Generation</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-tonal-a0 text-surface-a40 border border-surface-a10 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-info-a0" />
                  <span>Configurable {freeService.defaultDurationMinutes || 15}m Durations</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-tonal-a0 text-surface-a40 border border-surface-a10 flex items-center gap-1">
                  <Ticket className="w-3 h-3 text-amber-400" />
                  <span>Single-Use Verified Token</span>
                </span>
              </div>
            </div>

            {/* Asset Actions Grid */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 flex-shrink-0 w-full lg:w-72">
              <button
                type="button"
                onClick={handleOpenFreeTierQr}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-primary-a0 text-xs font-mono font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Issue Asset QR Code</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFreeTierLink}
                className="w-full py-2.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono font-bold rounded-xl border border-surface-a10 transition-all flex items-center justify-center space-x-2"
              >
                {copiedFreeAsset === 'link' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success-a0" />
                    <span className="text-success-a0">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-info-a0" />
                    <span>Copy Asset Direct Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyFreePromoText}
                className="w-full py-2.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono font-bold rounded-xl border border-surface-a10 transition-all flex items-center justify-center space-x-2"
              >
                {copiedFreeAsset === 'social' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success-a0" />
                    <span className="text-success-a0">Social Text Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copy Social Promo Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleQuickCreateFreeGate}
                disabled={generatingFreeGate}
                className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold rounded-xl border border-emerald-500/30 transition-all flex items-center justify-center space-x-2"
              >
                {generatingFreeGate ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>+ Launch Dedicated Gate</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-a0 border border-dashed border-surface-a10 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-theme-light flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>Free Consultation Marketing Asset Available</span>
            </h4>
            <p className="text-xs text-surface-a40 font-mono">
              Add "The 15 Minute Free Consultation" to your services to unlock automated marketing assets, QR codes, and client acquisition funnels.
            </p>
          </div>
        </div>
      )}

      {statusNotice && (
        <div
          className={`p-4 rounded-xl text-xs font-mono flex items-center space-x-2 ${
            statusNotice.type === 'error'
              ? 'bg-danger-a0/10 text-danger-a0 border border-danger-a0/30'
              : 'bg-success-a0/10 text-success-a0 border border-success-a0/30'
          }`}
        >
          {statusNotice.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Creation Modal / Inline Drawer */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateGate}
          className="bg-surface-a0 border border-info-a0/40 rounded-2xl p-6 space-y-5 shadow-2xl animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-info-a0" />
              <h3 className="text-sm font-bold text-theme-light">Generate New Marketing Gate Campaign</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-surface-a40 hover:text-theme-light"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-surface-a40">Campaign / Gate Name</label>
              <input
                type="text"
                value={newGateCustomName}
                onChange={(e) => setNewGateCustomName(e.target.value)}
                placeholder="e.g. VIP Strategic Session Q3"
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
              />
            </div>

            {/* Promotion Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-surface-a40">Promotion / Offer Type</label>
              <select
                value={newGatePromotionType}
                onChange={(e) => setNewGatePromotionType(e.target.value)}
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
              >
                <option value="Free Consultation">Free Consultation</option>
                <option value="Executive Advisory">Executive Advisory</option>
                <option value="Confidential Strategy">Confidential Strategy</option>
                <option value="Early Access Special">Early Access Special</option>
                <option value="Partner Referral">Partner Referral</option>
              </select>
            </div>

            {/* Target Service Tier */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-surface-a40">Target Service Tier</label>
              <select
                value={newGateTargetServiceId}
                onChange={(e) => setNewGateTargetServiceId(e.target.value)}
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
              >
                {provider.services?.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} (${(svc.feeCents / 100).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-surface-a40">Expiration Date (Optional)</label>
              <input
                type="date"
                value={newGateExpiryDate}
                onChange={(e) => setNewGateExpiryDate(e.target.value)}
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
              />
            </div>

            {/* Custom Greeting Banner */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-mono text-surface-a40">Custom Landing Greeting for Client</label>
              <input
                type="text"
                value={newGateCustomGreeting}
                onChange={(e) => setNewGateCustomGreeting(e.target.value)}
                placeholder="e.g. Welcome to your exclusive 1-on-1 consultation portal."
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
              />
            </div>

            {/* Service Scope override */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-mono text-surface-a40">Custom Scope Notes (Optional)</label>
              <textarea
                rows={2}
                value={newGateServiceDescription}
                onChange={(e) => setNewGateServiceDescription(e.target.value)}
                placeholder="Add specialized instructions or promo notes..."
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl p-3 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-tonal-a0 hover:bg-surface-a10 text-surface-a40 text-xs font-mono rounded-xl border border-surface-a10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingGate}
              className="px-6 py-2 bg-info-a0 hover:bg-info-a10 disabled:opacity-50 text-primary-a0 text-xs font-mono font-bold rounded-xl shadow-lg flex items-center space-x-2"
            >
              {creatingGate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Generate Marketing Gate</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter, Search & Sort Control Bar */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-surface-a40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={gateSearchQuery}
            onChange={(e) => setGateSearchQuery(e.target.value)}
            placeholder="Search campaigns by name, promotion type, or ID..."
            className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-theme-light placeholder:text-surface-a40 focus:outline-none focus:border-info-a0"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-tonal-a0 border border-surface-a10 p-1 rounded-xl">
            {(['all', 'active', 'expired'] as const).map((filterOpt) => (
              <button
                key={filterOpt}
                type="button"
                onClick={() => setGateFilter(filterOpt)}
                className={`px-3 py-1 text-xs font-mono rounded-lg capitalize transition-all ${
                  gateFilter === filterOpt
                    ? 'bg-info-a0/20 text-info-a0 font-bold border border-info-a0/30'
                    : 'text-surface-a40 hover:text-theme-light'
                }`}
              >
                {filterOpt}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <select
            value={gateSortBy}
            onChange={(e) => setGateSortBy(e.target.value as any)}
            className="bg-tonal-a0 border border-surface-a10 rounded-xl px-3 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
          >
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="expiry_asc">Expiry Soonest</option>
            <option value="expiry_desc">Expiry Furthest</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Gates Grid */}
      {processedGates.length === 0 ? (
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-12 text-center space-y-3">
          <Share2 className="w-10 h-10 text-surface-a40 mx-auto" />
          <h4 className="text-sm font-bold text-theme-light">No Marketing Gates Found</h4>
          <p className="text-xs text-surface-a40 font-mono max-w-sm mx-auto">
            {gateSearchQuery || gateFilter !== 'all'
              ? 'No campaigns match your active search or filter criteria.'
              : 'Create your first marketing gate to issue customized client entry links and QR codes.'}
          </p>
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-2 px-4 py-2 bg-info-a0 text-primary-a0 text-xs font-mono font-bold rounded-xl"
            >
              Create First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {processedGates.map((gate) => {
            const isEditing = editingGateId === gate.id;
            const isExpired = gate.expiryDate && new Date(gate.expiryDate).getTime() < Date.now();
            const matchedService = provider.services?.find(s => s.id === gate.targetServiceId);

            return (
              <div
                key={gate.id}
                className={`bg-surface-a0 border rounded-2xl p-6 space-y-4 relative transition-all shadow-md ${
                  gate.active && !isExpired
                    ? 'border-surface-a10 hover:border-info-a0/50'
                    : 'border-danger-a0/30 opacity-80'
                }`}
              >
                {/* Header with Title & Badges */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-surface-a10">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-info-a0 bg-info-a0/10 px-2.5 py-0.5 rounded-md border border-info-a0/20 uppercase">
                        {gate.promotionType || 'Special Offer'}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                        gate.active && !isExpired
                          ? 'bg-success-a0/10 text-success-a0 border-success-a0/30'
                          : 'bg-danger-a0/10 text-danger-a0 border-danger-a0/30'
                      }`}>
                        {isExpired ? 'Expired' : gate.active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-theme-light">
                      {gate.customName || 'Consultation Gate Entry'}
                    </h4>
                    <span className="text-[10px] font-mono text-surface-a40 block">
                      Gate ID: {gate.id}
                    </span>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleGateActive(gate)}
                      className={`p-2 rounded-xl text-xs font-mono border transition-all ${
                        gate.active
                          ? 'bg-tonal-a0 text-success-a0 hover:bg-surface-a10 border-surface-a10'
                          : 'bg-danger-a0/10 text-danger-a0 border-danger-a0/30'
                      }`}
                      title={gate.active ? 'Pause Gate' : 'Activate Gate'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => isEditing ? setEditingGateId(null) : handleStartEditGate(gate)}
                      className="p-2 bg-tonal-a0 hover:bg-surface-a10 text-surface-a40 hover:text-theme-light rounded-xl border border-surface-a10 transition-all"
                      title="Edit Gate Metadata"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGate(gate.id)}
                      className="p-2 bg-danger-a0/10 hover:bg-danger-a0/20 text-danger-a0 rounded-xl border border-danger-a0/20 transition-all"
                      title="Delete Gate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit Form or Gate Details Display */}
                {isEditing ? (
                  <div className="space-y-3 bg-tonal-a0/80 p-4 rounded-xl border border-surface-a10 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[10px] text-surface-a40">Campaign Name</label>
                      <input
                        type="text"
                        value={editingGateName}
                        onChange={(e) => setEditingGateName(e.target.value)}
                        className="w-full bg-surface-a0 border border-surface-a10 rounded-lg p-2 text-theme-light"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-surface-a40">Target Service</label>
                        <select
                          value={editingGateTargetServiceId}
                          onChange={(e) => setEditingGateTargetServiceId(e.target.value)}
                          className="w-full bg-surface-a0 border border-surface-a10 rounded-lg p-2 text-theme-light"
                        >
                          {provider.services?.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-surface-a40">Expiry Date</label>
                        <input
                          type="date"
                          value={editingGateExpiryDate}
                          onChange={(e) => setEditingGateExpiryDate(e.target.value)}
                          className="w-full bg-surface-a0 border border-surface-a10 rounded-lg p-2 text-theme-light"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingGateId(null)}
                        className="px-3 py-1 bg-surface-a0 text-surface-a40 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditGate(gate.id)}
                        disabled={updatingGate}
                        className="px-3 py-1 bg-info-a0 text-primary-a0 font-bold rounded-lg"
                      >
                        {updatingGate ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {gate.customGreeting && (
                      <p className="text-theme-light/90 italic bg-tonal-a0/60 p-3 rounded-xl border border-surface-a10/60">
                        "{gate.customGreeting}"
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-surface-a40">
                      <div>
                        <span>Target Service:</span>{' '}
                        <strong className="text-theme-light">{matchedService?.name || gate.targetServiceId || 'General Entry'}</strong>
                      </div>
                      <div>
                        <span>Expiry:</span>{' '}
                        <strong className={isExpired ? 'text-danger-a0' : 'text-theme-light'}>
                          {gate.expiryDate || 'No expiration'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom QR & Copy URL Actions */}
                <div className="pt-3 border-t border-surface-a10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenGateQr(gate)}
                    className="flex-1 py-2.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono font-bold rounded-xl border border-surface-a10 transition-all flex items-center justify-center space-x-2"
                  >
                    <QrCode className="w-3.5 h-3.5 text-info-a0" />
                    <span>Issue QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyGateLink(gate.id)}
                    className="flex-1 py-2.5 bg-info-a0/10 hover:bg-info-a0/20 text-info-a0 text-xs font-mono font-bold rounded-xl border border-info-a0/30 transition-all flex items-center justify-center space-x-2"
                  >
                    {copiedGateId === gate.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success-a0" />
                        <span className="text-success-a0">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
