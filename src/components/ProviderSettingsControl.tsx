import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Mail,
  Video,
  Power,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Radio,
  Tv,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Server,
  Activity,
  Layers,
  Calendar,
  Clock,
  Cast,
  Sparkles,
  Users
} from 'lucide-react';
import { ProviderConfig, PpvBroadcastConfig } from '../types';
import { apiFetch } from '../lib/api';

interface ProviderSettingsControlProps {
  provider: ProviderConfig;
  onUpdateProvider: (updated: ProviderConfig) => void;
}

export const ProviderSettingsControl: React.FC<ProviderSettingsControlProps> = ({
  provider,
  onUpdateProvider,
}) => {
  const [payoutEmail, setPayoutEmail] = useState(provider.payoutEmail || '');
  const [facetimeHandle, setFacetimeHandle] = useState(provider.facetimeHandle || '');
  const [active, setActive] = useState(provider.active);

  // PPV Broadcast Stream Container State
  const defaultPpv: PpvBroadcastConfig = {
    enabled: true,
    eventTitle: 'Exclusive Executive Live Multi-Camera Broadcast & Q&A',
    eventDescription: 'Special Live Member-Only PPV Multi-Participant Broadcast. Main source production fed via Switcher Studio Pro, delivered with sub-second ultra-low latency through nanoCosmos / nanoStream Cloud WebRTC.',
    scheduledStartTime: '2026-09-15T19:00:00.000Z',
    scheduledEndTime: '2026-09-15T20:30:00.000Z',
    status: 'scheduled',
    ingestSource: {
      provider: 'SWITCHER_STUDIO_PRO',
      serverUrl: 'rtmp://live.nanocosmos.de/live',
      streamKey: 'gk_live_prov_merk_stream_001',
      streamId: 'str_switcher_merk_001',
      backupIngestUrl: 'rtmp://backup.nanocosmos.de/live',
      resolution: '1080p60 Multi-Camera Studio Master',
      audioCodec: 'AAC 320kbps Studio',
    },
    deliveryEngine: {
      provider: 'NANOCOSMOS_NANOSTREAM',
      playbackUrl: 'https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=str_switcher_merk_001',
      embedPlayerUrl: 'https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=str_switcher_merk_001',
      bintuStreamId: 'bintu_stream_merk_live_001',
      h5liveServer: 'https://bintu-s2.nanocosmos.de/h5live/http/stream.mp4',
      h5liveToken: 'h5live_sec_token_merk_demo',
      latencyTargetMs: 800,
      drmEnabled: true,
    },
    maxAttendees: 500,
    tokenGateRequired: true,
    updatedAt: new Date().toISOString(),
  };

  const [ppvConfig, setPpvConfig] = useState<PpvBroadcastConfig>(provider.ppvBroadcast || defaultPpv);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [showH5Token, setShowH5Token] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeStreamTab, setActiveStreamTab] = useState<'switcher_studio' | 'nanocosmos' | 'event_schedule' | 'preview_monitor'>('switcher_studio');

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, 'idle' | 'dirty' | 'saving' | 'saved' | 'error'>>({});

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setPayoutEmail(provider.payoutEmail || '');
    setFacetimeHandle(provider.facetimeHandle || '');
    setActive(provider.active);
    if (provider.ppvBroadcast) {
      setPpvConfig(provider.ppvBroadcast);
    }
  }, [provider]);

  // Centralized Save Function
  const saveSettingsAsync = async (
    payload: { payoutEmail?: string; facetimeHandle?: string; active?: boolean; ppvBroadcast?: PpvBroadcastConfig },
    fieldKey?: string
  ) => {
    if (fieldKey) {
      setFieldStatuses(prev => ({ ...prev, [fieldKey]: 'saving' }));
    }
    setSaving(true);
    setSaveStatus('saving');
    setStatusMessage(null);

    try {
      const res = await apiFetch('/api/provider/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.provider) {
        onUpdateProvider(data.provider);
        setSaveStatus('saved');
        setStatusMessage('Provider settings and PPV Stream Container saved successfully.');

        if (fieldKey) {
          setFieldStatuses(prev => ({ ...prev, [fieldKey]: 'saved' }));
          setTimeout(() => {
            setFieldStatuses(prev => ({ ...prev, [fieldKey]: 'idle' }));
          }, 2500);
        }

        setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage(null);
        }, 3000);
      } else {
        setSaveStatus('error');
        if (fieldKey) {
          setFieldStatuses(prev => ({ ...prev, [fieldKey]: 'error' }));
        }
        setStatusMessage(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      setSaveStatus('error');
      if (fieldKey) {
        setFieldStatuses(prev => ({ ...prev, [fieldKey]: 'error' }));
      }
      setStatusMessage('Network connection error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Debounce helper
  const triggerDebouncedSave = (fieldKey: string, payload: any) => {
    setFieldStatuses(prev => ({ ...prev, [fieldKey]: 'dirty' }));
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveSettingsAsync(payload, fieldKey);
    }, 900);
  };

  const handlePayoutEmailChange = (val: string) => {
    setPayoutEmail(val);
    triggerDebouncedSave('payoutEmail', { payoutEmail: val, facetimeHandle, active, ppvBroadcast: ppvConfig });
  };

  const handleFacetimeHandleChange = (val: string) => {
    setFacetimeHandle(val);
    triggerDebouncedSave('facetimeHandle', { payoutEmail, facetimeHandle: val, active, ppvBroadcast: ppvConfig });
  };

  const handleToggleActive = () => {
    const nextState = !active;
    setActive(nextState);
    saveSettingsAsync({ payoutEmail, facetimeHandle, active: nextState, ppvBroadcast: ppvConfig }, 'active');
  };

  // PPV Config Update Handlers
  const handleUpdatePpvField = (section: 'root' | 'ingest' | 'delivery', field: string, val: any) => {
    let updated: PpvBroadcastConfig;
    if (section === 'root') {
      updated = { ...ppvConfig, [field]: val, updatedAt: new Date().toISOString() };
    } else if (section === 'ingest') {
      updated = {
        ...ppvConfig,
        ingestSource: { ...ppvConfig.ingestSource, [field]: val },
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = {
        ...ppvConfig,
        deliveryEngine: { ...ppvConfig.deliveryEngine, [field]: val },
        updatedAt: new Date().toISOString(),
      };
    }
    setPpvConfig(updated);
    triggerDebouncedSave('ppvBroadcast', { payoutEmail, facetimeHandle, active, ppvBroadcast: updated });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-tonal-a0 border border-surface-a10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-info-a0 bg-info-a0/10 px-2.5 py-0.5 rounded-full border border-info-a0/20">
              Operations & Stream Infrastructure
            </span>
            {saveStatus === 'saved' && (
              <span className="text-[10px] font-mono text-success-a0 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Saved to Ledger</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <span>Provider Operational & Live Event Settings</span>
          </h2>
          <p className="text-xs text-surface-a40 font-mono mt-0.5">
            Configure 1-on-1 direct video delivery, PayPal settlements, and the PPV Multi-Participant Live Broadcast Container (Switcher Studio Pro + nanoCosmos).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => saveSettingsAsync({ payoutEmail, facetimeHandle, active, ppvBroadcast: ppvConfig })}
            disabled={saving}
            className="px-5 py-2.5 bg-info-a0 hover:bg-info-a10 disabled:opacity-50 text-primary-a0 text-xs font-mono font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

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

      {/* SECTION A: PPV Multi-Participant Live Event Broadcast Container */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-a10 gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-info-a0/10 border border-info-a0/30 rounded-xl text-info-a0 mt-0.5">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-warning-a0 bg-warning-a0/10 px-2 py-0.5 rounded border border-warning-a0/20">
                  PPV Event Container
                </span>
                <span className="text-[10px] font-mono text-surface-a40">
                  Feed: Switcher Studio Pro • Delivery: nanoCosmos WebRTC
                </span>
              </div>
              <h3 className="text-base font-bold text-theme-light mt-1 flex items-center space-x-2">
                <span>Live Event & PPV Broadcast Stream Container</span>
              </h3>
              <p className="text-xs text-surface-a40 font-mono mt-0.5">
                Per-provider stream location and security container for multi-participant ticketed events.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
              ppvConfig.status === 'live'
                ? 'bg-danger-a0/10 text-danger-a0 border-danger-a0/40 animate-pulse'
                : ppvConfig.status === 'standby'
                ? 'bg-warning-a0/10 text-warning-a0 border-warning-a0/30'
                : 'bg-info-a0/10 text-info-a0 border-info-a0/30'
            }`}>
              Status: {ppvConfig.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* PPV Container Subtabs */}
        <div className="flex items-center space-x-2 border-b border-surface-a10 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'switcher_studio', label: '1. Switcher Studio Pro Ingest', icon: Cast },
            { id: 'nanocosmos', label: '2. nanoCosmos Delivery Engine', icon: Activity },
            { id: 'event_schedule', label: '3. Event Schedule & Policy', icon: Calendar },
            { id: 'preview_monitor', label: '4. Stream Viewport & Monitor', icon: Tv },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeStreamTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStreamTab(tab.id as any)}
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

        {/* Tab 1: Switcher Studio Pro RTMP Ingest Feed */}
        {activeStreamTab === 'switcher_studio' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-tonal-a0/60 border border-surface-a10 rounded-xl p-4 flex items-start space-x-3 text-xs font-mono">
              <Cast className="w-4 h-4 text-info-a0 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-theme-light">Primary Broadcast Source: Switcher Studio Pro</span>
                <p className="text-[11px] text-surface-a40 font-sans">
                  Configure your Switcher Studio iOS app or remote multi-camera live production console with these custom RTMP broadcast ingest credentials.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Server URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center justify-between">
                  <span>RTMP Ingest Server URL</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(ppvConfig.ingestSource.serverUrl, 'rtmp_server')}
                    className="text-[10px] text-info-a0 hover:underline flex items-center space-x-1"
                  >
                    {copiedKey === 'rtmp_server' ? <Check className="w-3 h-3 text-success-a0" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'rtmp_server' ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </label>
                <input
                  type="text"
                  value={ppvConfig.ingestSource.serverUrl}
                  onChange={(e) => handleUpdatePpvField('ingest', 'serverUrl', e.target.value)}
                  placeholder="rtmp://live.nanocosmos.de/live"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Stream Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center justify-between">
                  <span>Switcher Studio Stream Key</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      className="text-[10px] text-surface-a40 hover:text-theme-light flex items-center space-x-1"
                    >
                      {showStreamKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showStreamKey ? 'Hide' : 'Reveal'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(ppvConfig.ingestSource.streamKey, 'stream_key')}
                      className="text-[10px] text-info-a0 hover:underline flex items-center space-x-1"
                    >
                      {copiedKey === 'stream_key' ? <Check className="w-3 h-3 text-success-a0" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'stream_key' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type={showStreamKey ? 'text' : 'password'}
                    value={ppvConfig.ingestSource.streamKey}
                    onChange={(e) => handleUpdatePpvField('ingest', 'streamKey', e.target.value)}
                    placeholder="gk_live_prov_merk_stream_001"
                    className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                  />
                </div>
              </div>

              {/* Stream ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40">Stream ID / Broadcast Channel</label>
                <input
                  type="text"
                  value={ppvConfig.ingestSource.streamId || ''}
                  onChange={(e) => handleUpdatePpvField('ingest', 'streamId', e.target.value)}
                  placeholder="str_switcher_merk_001"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Resolution & Codec Profile */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40">Production Quality Profile</label>
                <input
                  type="text"
                  value={ppvConfig.ingestSource.resolution || ''}
                  onChange={(e) => handleUpdatePpvField('ingest', 'resolution', e.target.value)}
                  placeholder="1080p60 Multi-Camera Studio Master"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: nanoCosmos / nanoStream Re-Broadcast & Delivery */}
        {activeStreamTab === 'nanocosmos' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-tonal-a0/60 border border-surface-a10 rounded-xl p-4 flex items-start space-x-3 text-xs font-mono">
              <Activity className="w-4 h-4 text-warning-a0 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-theme-light">Re-Broadcast & Delivery Engine: nanoCosmos / nanoStream Cloud</span>
                <p className="text-[11px] text-surface-a40 font-sans">
                  Delivers ultra-low latency sub-second (&lt;1s) WebRTC / H5Live interactive playback across global edge nodes for ticketed attendees.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Playback URL */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-mono text-surface-a40 flex items-center justify-between">
                  <span>nanoStream WebRTC / H5Live Player URL</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(ppvConfig.deliveryEngine.playbackUrl, 'playback_url')}
                    className="text-[10px] text-info-a0 hover:underline flex items-center space-x-1"
                  >
                    {copiedKey === 'playback_url' ? <Check className="w-3 h-3 text-success-a0" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'playback_url' ? 'Copied' : 'Copy Player Link'}</span>
                  </button>
                </label>
                <input
                  type="text"
                  value={ppvConfig.deliveryEngine.playbackUrl}
                  onChange={(e) => handleUpdatePpvField('delivery', 'playbackUrl', e.target.value)}
                  placeholder="https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=..."
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Bintu Stream ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40">nanoStream Bintu Stream ID</label>
                <input
                  type="text"
                  value={ppvConfig.deliveryEngine.bintuStreamId || ''}
                  onChange={(e) => handleUpdatePpvField('delivery', 'bintuStreamId', e.target.value)}
                  placeholder="bintu_stream_merk_live_001"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* H5Live Token */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center justify-between">
                  <span>H5Live Security Token (DRM)</span>
                  <button
                    type="button"
                    onClick={() => setShowH5Token(!showH5Token)}
                    className="text-[10px] text-surface-a40 hover:text-theme-light flex items-center space-x-1"
                  >
                    {showH5Token ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showH5Token ? 'Hide' : 'Reveal'}</span>
                  </button>
                </label>
                <input
                  type={showH5Token ? 'text' : 'password'}
                  value={ppvConfig.deliveryEngine.h5liveToken || ''}
                  onChange={(e) => handleUpdatePpvField('delivery', 'h5liveToken', e.target.value)}
                  placeholder="h5live_sec_token_..."
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Event Schedule & Gate Controls */}
        {activeStreamTab === 'event_schedule' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Event Title */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-mono text-surface-a40">Live Event / PPV Broadcast Title</label>
                <input
                  type="text"
                  value={ppvConfig.eventTitle}
                  onChange={(e) => handleUpdatePpvField('root', 'eventTitle', e.target.value)}
                  placeholder="Exclusive Executive Live Multi-Camera Broadcast & Q&A"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Event Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-mono text-surface-a40">Event Description & Attendee Briefing</label>
                <textarea
                  rows={2}
                  value={ppvConfig.eventDescription}
                  onChange={(e) => handleUpdatePpvField('root', 'eventDescription', e.target.value)}
                  placeholder="Special Live Member-Only PPV Multi-Participant Broadcast..."
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Scheduled Start Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40">Scheduled Broadcast Start Time (ISO / Date)</label>
                <input
                  type="text"
                  value={ppvConfig.scheduledStartTime || ''}
                  onChange={(e) => handleUpdatePpvField('root', 'scheduledStartTime', e.target.value)}
                  placeholder="2026-09-15T19:00:00.000Z"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Max Attendees */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40">Max Ticket Capacity (Multi-Participant)</label>
                <input
                  type="number"
                  value={ppvConfig.maxAttendees || 500}
                  onChange={(e) => handleUpdatePpvField('root', 'maxAttendees', parseInt(e.target.value) || 100)}
                  placeholder="500"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-mono text-surface-a40">Broadcast Transmission Status</label>
                <div className="flex flex-wrap gap-2">
                  {(['draft', 'scheduled', 'standby', 'live', 'ended'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdatePpvField('root', 'status', st)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono uppercase font-bold transition-all border ${
                        ppvConfig.status === st
                          ? st === 'live'
                            ? 'bg-danger-a0 text-primary-a0 border-danger-a0 shadow-lg'
                            : 'bg-info-a0 text-primary-a0 border-info-a0 shadow-lg'
                          : 'bg-tonal-a0 text-surface-a40 hover:text-theme-light border-surface-a10'
                      }`}
                    >
                      {st === 'live' ? '🔴 LIVE ON-AIR' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Stream Viewport & Health Monitor Preview */}
        {activeStreamTab === 'preview_monitor' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Interactive Stream Health Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-tonal-a0 border border-surface-a10 rounded-xl p-3 text-center space-y-1">
                <span className="text-[10px] font-mono text-surface-a40 uppercase">Feed Ingest</span>
                <p className="text-xs font-mono font-bold text-success-a0 flex items-center justify-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-success-a0 animate-pulse" />
                  <span>Switcher Studio Pro</span>
                </p>
              </div>

              <div className="bg-tonal-a0 border border-surface-a10 rounded-xl p-3 text-center space-y-1">
                <span className="text-[10px] font-mono text-surface-a40 uppercase">Edge Delivery</span>
                <p className="text-xs font-mono font-bold text-info-a0">nanoCosmos WebRTC</p>
              </div>

              <div className="bg-tonal-a0 border border-surface-a10 rounded-xl p-3 text-center space-y-1">
                <span className="text-[10px] font-mono text-surface-a40 uppercase">Target Latency</span>
                <p className="text-xs font-mono font-bold text-warning-a0">&lt; 800ms (Sub-Second)</p>
              </div>

              <div className="bg-tonal-a0 border border-surface-a10 rounded-xl p-3 text-center space-y-1">
                <span className="text-[10px] font-mono text-surface-a40 uppercase">Security Gate</span>
                <p className="text-xs font-mono font-bold text-theme-light">Tokenized Pass Only</p>
              </div>
            </div>

            {/* Simulated Live Viewport Container */}
            <div className="relative aspect-video bg-black/90 rounded-2xl border border-surface-a10 overflow-hidden flex flex-col items-center justify-center text-center p-6 shadow-2xl">
              <div className="absolute top-4 left-4 flex items-center space-x-2">
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center space-x-1.5 ${
                  ppvConfig.status === 'live'
                    ? 'bg-danger-a0 text-primary-a0 animate-pulse'
                    : 'bg-surface-a20/80 text-theme-light backdrop-blur'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>{ppvConfig.status === 'live' ? 'ON AIR' : ppvConfig.status.toUpperCase()}</span>
                </span>
                <span className="text-[10px] font-mono text-surface-a40 bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                  1080p60 Multi-Cam
                </span>
              </div>

              <div className="absolute top-4 right-4 flex items-center space-x-2 text-[10px] font-mono text-surface-a40 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur">
                <Users className="w-3 h-3 text-info-a0" />
                <span>Max Capacity: {ppvConfig.maxAttendees || 500}</span>
              </div>

              <div className="space-y-3 max-w-md">
                <div className="w-12 h-12 rounded-full bg-info-a0/10 border border-info-a0/30 flex items-center justify-center mx-auto text-info-a0">
                  <Tv className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white font-mono">{ppvConfig.eventTitle}</h4>
                <p className="text-xs text-surface-a40 font-sans leading-relaxed">
                  Placeholder viewport for live nanoStream Cloud H5Live player instance. Ticket holders receive single-use cryptographic passes to access the live stream.
                </p>
                <div className="pt-2 flex items-center justify-center space-x-3">
                  <a
                    href={ppvConfig.deliveryEngine.playbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-info-a0/20 hover:bg-info-a0/30 text-info-a0 border border-info-a0/40 text-xs font-mono font-bold rounded-xl transition-all flex items-center space-x-1.5"
                  >
                    <span>Test External Player</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: 1-on-1 Consultation Delivery & Operational Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: PayPal Settlement Account */}
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-info-a0" />
              <h3 className="text-sm font-bold text-theme-light">PayPal Settlement Payout Account</h3>
            </div>
            {fieldStatuses['payoutEmail'] === 'saving' && (
              <span className="text-[10px] font-mono text-info-a0 flex items-center space-x-1 animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {fieldStatuses['payoutEmail'] === 'saved' && (
              <span className="text-[10px] font-mono text-success-a0 flex items-center space-x-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Saved</span>
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-surface-a40">
              Provider PayPal Payout Email (Receives 85% Net Disbursements)
            </label>
            <div className="relative">
              <input
                type="email"
                value={payoutEmail}
                onChange={(e) => handlePayoutEmailChange(e.target.value)}
                placeholder="merk.payouts@merkmorassi.com"
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
              />
            </div>
            <p className="text-[11px] text-surface-a40 leading-relaxed font-sans pt-1">
              All client order captures are automatically split 85% to this PayPal account upon successful session verification or manual settlement.
            </p>
          </div>

          <div className="bg-tonal-a0/60 border border-surface-a10 rounded-xl p-4 flex items-start space-x-3 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-success-a0 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-theme-light">Immutable Split Architecture</span>
              <p className="text-[11px] text-surface-a40 font-sans">
                85% provider net payout rate is mathematically guaranteed and non-negotiable at the smart escrow layer.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Video Call / FaceTime Delivery Handle */}
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4 text-info-a0" />
              <h3 className="text-sm font-bold text-theme-light">1-on-1 Video Call Delivery Endpoint</h3>
            </div>
            {fieldStatuses['facetimeHandle'] === 'saving' && (
              <span className="text-[10px] font-mono text-info-a0 flex items-center space-x-1 animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {fieldStatuses['facetimeHandle'] === 'saved' && (
              <span className="text-[10px] font-mono text-success-a0 flex items-center space-x-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Saved</span>
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-surface-a40">
              FaceTime / Video Meeting Link or Direct Handle
            </label>
            <div className="relative">
              <input
                type="text"
                value={facetimeHandle}
                onChange={(e) => handleFacetimeHandleChange(e.target.value)}
                placeholder="https://facetime.apple.com/join#v=1&p=..."
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
              />
            </div>
            <p className="text-[11px] text-surface-a40 leading-relaxed font-sans pt-1">
              Delivered via single-use encrypted token to clients only after confirmed ticket capture and verification scan.
            </p>
          </div>

          {facetimeHandle && (
            <div className="bg-info-a0/10 border border-info-a0/20 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-info-a0">
              <span className="truncate pr-2">{facetimeHandle}</span>
              <a
                href={facetimeHandle.startsWith('http') ? facetimeHandle : `facetime:${facetimeHandle}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 font-bold underline flex-shrink-0"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Card 3: Gate Status (Online / Offline Toggle) */}
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-5 md:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
            <div className="flex items-center space-x-2">
              <Power className={`w-4 h-4 ${active ? 'text-success-a0' : 'text-danger-a0'}`} />
              <h3 className="text-sm font-bold text-theme-light">Consultation Gate Availability Status</h3>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
              active 
                ? 'bg-success-a0/10 text-success-a0 border-success-a0/30' 
                : 'bg-danger-a0/10 text-danger-a0 border-danger-a0/30'
            }`}>
              {active ? 'Gate Online • Accepting Bookings' : 'Gate Offline • Bookings Paused'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tonal-a0/60 border border-surface-a10 rounded-xl p-5">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-theme-light font-mono">
                {active ? 'Gate is ONLINE & ACCEPTING CLIENTS' : 'Gate is OFFLINE / PAUSED'}
              </h4>
              <p className="text-xs text-surface-a40 font-sans leading-relaxed max-w-xl">
                When online, clients can select service tiers, book appointments, and execute checkout. When offline, checkout is securely paused and shows an exclusive advisor holding screen.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleActive}
              className={`px-6 py-3 rounded-xl text-xs font-mono font-extrabold transition-all flex items-center space-x-2 flex-shrink-0 shadow-lg ${
                active
                  ? 'bg-danger-a0/20 text-danger-a0 hover:bg-danger-a0/30 border border-danger-a0/40'
                  : 'bg-success-a0 text-primary-a0 hover:bg-success-a0/90 shadow-success-a0/20'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{active ? 'PAUSE GATE (GO OFFLINE)' : 'ACTIVATE GATE (GO ONLINE)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
