import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Camera,
  Upload,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  MapPin,
  Phone,
  Mail,
  Link,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Eye,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  Clock,
  Plus
} from 'lucide-react';
import { ProviderConfig, ProviderSocials, ServiceDefinition } from '../types';
import { apiFetch } from '../lib/api';

interface ProviderProfileControlProps {
  provider: ProviderConfig;
  onUpdateProvider: (updated: ProviderConfig) => void;
  onNavigateToServices?: () => void;
}

export const ProviderProfileControl: React.FC<ProviderProfileControlProps> = ({
  provider,
  onUpdateProvider,
  onNavigateToServices,
}) => {
  // Profile form state
  const [name, setName] = useState(provider.name || '');
  const [title, setTitle] = useState(provider.title || 'Principal Strategic Advisor');
  const [bio, setBio] = useState(provider.bio || '');
  const [website, setWebsite] = useState(provider.website || '');
  const [location, setLocation] = useState(provider.location || '');
  const [phone, setPhone] = useState(provider.phone || '');
  const [photoUrl, setPhotoUrl] = useState(provider.photoUrl || provider.avatarUrl || '');
  
  // Socials state
  const [instagram, setInstagram] = useState(provider.socials?.instagram || '');
  const [twitter, setTwitter] = useState(provider.socials?.twitter || '');
  const [linkedin, setLinkedin] = useState(provider.socials?.linkedin || '');
  const [youtube, setYoutube] = useState(provider.socials?.youtube || '');
  const [tiktok, setTiktok] = useState(provider.socials?.tiktok || '');
  const [github, setGithub] = useState(provider.socials?.github || '');

  // UI & status feedback
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if provider prop updates from parent
  useEffect(() => {
    setName(provider.name || '');
    setTitle(provider.title || 'Principal Strategic Advisor');
    setBio(provider.bio || '');
    setWebsite(provider.website || '');
    setLocation(provider.location || '');
    setPhone(provider.phone || '');
    setPhotoUrl(provider.photoUrl || provider.avatarUrl || '');
    setInstagram(provider.socials?.instagram || '');
    setTwitter(provider.socials?.twitter || '');
    setLinkedin(provider.socials?.linkedin || '');
    setYoutube(provider.socials?.youtube || '');
    setTiktok(provider.socials?.tiktok || '');
    setGithub(provider.socials?.github || '');
  }, [provider]);

  // Handle direct service addition from profile page
  const handleAddServiceDirect = async (type: 'trial_15' | 'custom') => {
    const currentServices = provider.services || [];
    if (currentServices.length >= 10) {
      setSaveStatus('error');
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
        defaultDurationMinutes: 15,
        allowClientDurationAdjustment: true,
        allowedDurations: [10, 15, 20, 30],
        expirationDays: 7,
        passType: 'single_use',
      };
    } else {
      newService = {
        id: `srv_${Date.now()}`,
        name: 'Executive Consultation Session',
        description: '45-Minute In-Depth Executive Strategy & Advisory Session.',
        feeCents: 25000,
        currency: 'USD',
        isTrial: false,
        defaultDurationMinutes: 45,
        allowClientDurationAdjustment: true,
        allowedDurations: [30, 45, 60],
        expirationDays: 14,
        passType: 'single_use',
      };
    }

    const updatedServices = [...currentServices, newService];
    setSaving(true);
    setSaveStatus('saving');
    setStatusMessage(null);

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
        setStatusMessage(`Added "${newService.name}" to your service catalog.`);
        setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage(null);
        }, 3000);
      } else {
        setSaveStatus('error');
        setStatusMessage(data.error || 'Failed to add service.');
      }
    } catch (err: any) {
      setSaveStatus('error');
      setStatusMessage('Network error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle image upload from computer (converts to base64 Data URL)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPhotoUrl(dataUrl);
        // Direct save with new photo
        saveProfileData({
          photoUrl: dataUrl,
          avatarUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setPhotoUrl('');
    saveProfileData({
      photoUrl: '',
      avatarUrl: '',
    });
  };

  // Save profile data to backend
  const saveProfileData = async (overrides?: Partial<ProviderConfig>) => {
    setSaving(true);
    setSaveStatus('saving');
    setStatusMessage(null);

    const socialsPayload: ProviderSocials = {
      instagram: instagram.trim() || undefined,
      twitter: twitter.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
      youtube: youtube.trim() || undefined,
      tiktok: tiktok.trim() || undefined,
      github: github.trim() || undefined,
    };

    const payload = {
      name: overrides?.name !== undefined ? overrides.name : name,
      title: overrides?.title !== undefined ? overrides.title : title,
      bio: overrides?.bio !== undefined ? overrides.bio : bio,
      website: overrides?.website !== undefined ? overrides.website : website,
      location: overrides?.location !== undefined ? overrides.location : location,
      phone: overrides?.phone !== undefined ? overrides.phone : phone,
      photoUrl: overrides?.photoUrl !== undefined ? overrides.photoUrl : photoUrl,
      avatarUrl: overrides?.avatarUrl !== undefined ? overrides.avatarUrl : (overrides?.photoUrl || photoUrl),
      socials: overrides?.socials !== undefined ? overrides.socials : socialsPayload,
    };

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
        setStatusMessage('Provider profile card updated successfully.');
        setTimeout(() => {
          setSaveStatus('idle');
          setStatusMessage(null);
        }, 3000);
      } else {
        setSaveStatus('error');
        setStatusMessage(data.error || 'Failed to save profile changes.');
      }
    } catch (err: any) {
      setSaveStatus('error');
      setStatusMessage('Network error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Copy website link
  const handleCopyWebsite = () => {
    if (website) {
      navigator.clipboard.writeText(website);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Helper to format social URL for display / link
  const formatSocialLink = (network: string, val: string) => {
    if (!val) return '';
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    const cleanHandle = val.replace(/^@/, '');
    switch (network) {
      case 'instagram': return `https://instagram.com/${cleanHandle}`;
      case 'twitter': return `https://x.com/${cleanHandle}`;
      case 'linkedin': return `https://linkedin.com/in/${cleanHandle}`;
      case 'youtube': return `https://youtube.com/@${cleanHandle}`;
      case 'tiktok': return `https://tiktok.com/@${cleanHandle}`;
      case 'github': return `https://github.com/${cleanHandle}`;
      default: return `https://${val}`;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-tonal-a0 border border-surface-a10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-info-a0 bg-info-a0/10 px-2.5 py-0.5 rounded-full border border-info-a0/20">
              Provider Brand Identity
            </span>
            {saveStatus === 'saved' && (
              <span className="text-[10px] font-mono text-success-a0 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Changes Saved</span>
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-[10px] font-mono text-info-a0 flex items-center space-x-1 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-theme-light mt-1.5 flex items-center space-x-2">
            <span>Provider Profile Card</span>
          </h2>
          <p className="text-xs text-surface-a40 font-mono mt-0.5">
            Manage your public photo, professional credentials, website link, and verified social media channels.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => saveProfileData()}
            disabled={saving}
            className="px-5 py-2.5 bg-info-a0 hover:bg-info-a10 disabled:opacity-50 text-primary-a0 text-xs font-mono font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Profile Card</span>
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

      {/* Grid: Left Column (Form Controls) & Right Column (Live Interactive Preview Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: EDITING CONTROLS (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Photo / Avatar Upload */}
          <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-info-a0" />
                <h3 className="text-sm font-bold text-theme-light">Profile Photo & Avatar</h3>
              </div>
              <span className="text-[11px] font-mono text-surface-a40">PNG, JPG, WEBP or SVG</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar Preview circle */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-info-a0/40 bg-tonal-a0 flex items-center justify-center shadow-lg relative">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={name || 'Provider Avatar'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-10 h-10 text-surface-a40" />
                  )}
                </div>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    title="Remove Photo"
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-danger-a0 text-white flex items-center justify-center shadow-md hover:bg-danger-a0/80 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Upload Action Buttons */}
              <div className="flex-1 space-y-3 w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono font-bold rounded-xl border border-surface-a10 transition-all flex items-center space-x-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-info-a0" />
                    <span>Upload Image File</span>
                  </button>

                  {photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2.5 bg-danger-a0/10 hover:bg-danger-a0/20 text-danger-a0 text-xs font-mono rounded-xl border border-danger-a0/20 transition-all flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Direct Image URL input fallback */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-surface-a40">Or paste public image URL:</label>
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 text-surface-a40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-theme-light placeholder:text-surface-a40/50 focus:outline-none focus:border-info-a0"
                    />
                  </div>
                </div>

                {uploadError && (
                  <p className="text-[11px] font-mono text-danger-a0">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: General Profile Info */}
          <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-surface-a10">
              <User className="w-4 h-4 text-info-a0" />
              <h3 className="text-sm font-bold text-theme-light">Professional Profile Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40">Provider / Consultant Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Merk Morassi"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Title / Specialty */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40">Professional Title / Headline</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Principal Strategic Advisor & Founder"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-info-a0" />
                  <span>Location / Base</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Los Angeles, CA"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Contact Phone (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-info-a0" />
                  <span>Direct Contact Phone (Optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (310) 555-0199"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>
            </div>

            {/* Website URL */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1">
                <Globe className="w-3 h-3 text-info-a0" />
                <span>Official Website / Portfolio URL</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://merkmorassi.com"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl pl-3.5 pr-20 py-2.5 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
                {website && (
                  <button
                    type="button"
                    onClick={handleCopyWebsite}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface-a10 hover:bg-surface-a20 text-surface-a40 hover:text-theme-light text-[10px] font-mono rounded-lg transition-all flex items-center space-x-1"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-success-a0" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bio / Summary */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-mono text-surface-a40">Professional Bio & Executive Summary</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Executive advisory, confidential 1-on-1 strategy sessions, and venture architecture. Direct, uncompromised access."
                className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl p-3 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0 leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Social Media Channels */}
          <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-a10">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-info-a0" />
                <h3 className="text-sm font-bold text-theme-light">Social Media & Public Channels</h3>
              </div>
              <span className="text-[11px] font-mono text-surface-a40">Handles or full URLs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Instagram */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  <span>Instagram</span>
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@merkmorassi"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* Twitter / X */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1.5">
                  <Twitter className="w-3.5 h-3.5 text-sky-400" />
                  <span>X / Twitter</span>
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@merkmorassi"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1.5">
                  <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                  <span>LinkedIn</span>
                </label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="merkmorassi or full URL"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* YouTube */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1.5">
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span>YouTube</span>
                </label>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="@merkmorassi or channel URL"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* TikTok */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-surface-a40">TT</span>
                  <span>TikTok</span>
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@merkmorassi"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>

              {/* GitHub */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-surface-a40 flex items-center space-x-1.5">
                  <Github className="w-3.5 h-3.5 text-gray-300" />
                  <span>GitHub</span>
                </label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="merkmorassi"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2 text-xs font-mono text-theme-light focus:outline-none focus:border-info-a0"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Active Services & Offerings */}
          <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-a10 gap-2">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-info-a0" />
                <h3 className="text-sm font-bold text-theme-light">Active Service Offerings ({provider.services?.length || 0})</h3>
              </div>
              <div className="flex items-center space-x-2">
                {onNavigateToServices && (
                  <button
                    type="button"
                    onClick={onNavigateToServices}
                    className="px-2.5 py-1 text-[11px] font-mono text-info-a0 hover:text-info-a10 bg-info-a0/10 hover:bg-info-a0/20 border border-info-a0/30 rounded-lg transition-all flex items-center gap-1"
                  >
                    <span>Full Editor</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Services List Preview in Profile */}
            <div className="space-y-2.5">
              {(provider.services || []).map((svc, idx) => {
                const isFree = svc.isTrial || svc.feeCents === 0;
                return (
                  <div
                    key={svc.id || idx}
                    className="bg-tonal-a0 border border-surface-a10 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-surface-a30 transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] ${
                        isFree 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-info-a0/10 text-info-a0 border border-info-a0/20'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-theme-light truncate">{svc.name}</h4>
                          {isFree && (
                            <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold">
                              Free Trial
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-surface-a40 truncate max-w-md mt-0.5">{svc.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0 font-mono text-xs">
                      <div className="flex items-center space-x-1 text-surface-a40 text-[11px]">
                        <Clock className="w-3 h-3 text-info-a0" />
                        <span>{svc.defaultDurationMinutes || 15}m</span>
                      </div>
                      <span className={`font-bold ${isFree ? 'text-emerald-400' : 'text-theme-light'}`}>
                        {isFree ? '$0.00' : `$${((svc.feeCents || 0) / 100).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Buttons on Profile Page */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddServiceDirect('trial_15')}
                disabled={saving}
                className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-mono font-bold rounded-xl border border-emerald-500/40 transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ The 15 Minute Free Consultation</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddServiceDirect('custom')}
                disabled={saving}
                className="px-3 py-2 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono font-bold rounded-xl border border-surface-a10 transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-info-a0" />
                <span>+ Add Service Tier</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW CARD (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-1.5 text-xs font-mono text-surface-a40">
              <Eye className="w-3.5 h-3.5 text-info-a0" />
              <span className="font-bold uppercase tracking-wider">Client View Live Preview</span>
            </div>
            <span className="text-[10px] font-mono bg-success-a0/10 text-success-a0 px-2 py-0.5 rounded-full border border-success-a0/20">
              Real-Time Rendering
            </span>
          </div>

          {/* Branded Card Box */}
          <div className="bg-gradient-to-b from-surface-a0 via-surface-a0 to-tonal-a0 border border-surface-a10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden group">
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-info-a0 via-info-a10 to-success-a0" />

            {/* Provider Header with Photo, Name, Badge */}
            <div className="flex items-start space-x-4">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-info-a0/40 bg-tonal-a0 shadow-md">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={name || 'Consultant'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-tonal-a0 text-surface-a40 font-mono text-xl font-bold">
                      {name ? name.charAt(0).toUpperCase() : 'M'}
                    </div>
                  )}
                </div>
                {/* Verified Shield Badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-info-a0 text-primary-a0 flex items-center justify-center shadow-md border-2 border-surface-a0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-extrabold text-theme-light truncate">
                    {name || 'Merk Morassi'}
                  </h3>
                </div>

                <p className="text-xs font-medium text-info-a0 truncate">
                  {title || 'Principal Strategic Advisor & Founder'}
                </p>

                {location && (
                  <div className="flex items-center space-x-1 text-[11px] font-mono text-surface-a40">
                    <MapPin className="w-3 h-3 text-surface-a40 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio text */}
            <div className="bg-tonal-a0/70 border border-surface-a10/80 rounded-2xl p-4">
              <p className="text-xs text-surface-a40 font-sans leading-relaxed">
                {bio || 'Executive advisory, confidential 1-on-1 strategy sessions, and venture architecture. Direct, uncompromised access.'}
              </p>
            </div>

            {/* Website Link Banner */}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-4 py-3 bg-info-a0/10 hover:bg-info-a0/20 border border-info-a0/30 rounded-2xl text-xs font-mono text-info-a0 font-bold transition-all group/link"
              >
                <div className="flex items-center space-x-2 truncate">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 group-hover/link:translate-x-0.5 transition-transform" />
              </a>
            )}

            {/* Social Media Channels Row */}
            <div className="pt-2 border-t border-surface-a10/60 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-surface-a40">Connect</span>
              
              <div className="flex items-center space-x-2">
                {instagram && (
                  <a
                    href={formatSocialLink('instagram', instagram)}
                    target="_blank"
                    rel="noreferrer"
                    title={`Instagram: ${instagram}`}
                    className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-pink-500/20 text-surface-a40 hover:text-pink-400 border border-surface-a10 flex items-center justify-center transition-all"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}

                {twitter && (
                  <a
                    href={formatSocialLink('twitter', twitter)}
                    target="_blank"
                    rel="noreferrer"
                    title={`X / Twitter: ${twitter}`}
                    className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-sky-500/20 text-surface-a40 hover:text-sky-400 border border-surface-a10 flex items-center justify-center transition-all"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}

                {linkedin && (
                  <a
                    href={formatSocialLink('linkedin', linkedin)}
                    target="_blank"
                    rel="noreferrer"
                    title={`LinkedIn: ${linkedin}`}
                    className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-blue-500/20 text-surface-a40 hover:text-blue-400 border border-surface-a10 flex items-center justify-center transition-all"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}

                {youtube && (
                  <a
                    href={formatSocialLink('youtube', youtube)}
                    target="_blank"
                    rel="noreferrer"
                    title={`YouTube: ${youtube}`}
                    className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-red-500/20 text-surface-a40 hover:text-red-400 border border-surface-a10 flex items-center justify-center transition-all"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                )}

                {github && (
                  <a
                    href={formatSocialLink('github', github)}
                    target="_blank"
                    rel="noreferrer"
                    title={`GitHub: ${github}`}
                    className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-surface-a20 text-surface-a40 hover:text-white border border-surface-a10 flex items-center justify-center transition-all"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}

                {!instagram && !twitter && !linkedin && !youtube && !github && (
                  <span className="text-[11px] font-mono text-surface-a40/60 italic">
                    Add social handles to display
                  </span>
                )}
              </div>
            </div>

            {/* Service Offerings Live Preview */}
            <div className="space-y-2 pt-2 border-t border-surface-a10/60">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-surface-a40">
                <span>Available Offerings</span>
                <span>{provider.services?.length || 0} Active</span>
              </div>
              <div className="space-y-1.5">
                {(provider.services || []).slice(0, 4).map((svc, i) => {
                  const isFree = svc.isTrial || svc.feeCents === 0;
                  return (
                    <div
                      key={svc.id || i}
                      className="bg-tonal-a0/80 border border-surface-a10/60 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-theme-light truncate flex items-center gap-1.5">
                          <span>{svc.name}</span>
                          {isFree && (
                            <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-surface-a40 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-info-a0" />
                          <span>{svc.defaultDurationMinutes || 15} Min Session</span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-xs flex-shrink-0 ${isFree ? 'text-emerald-400' : 'text-theme-light'}`}>
                        {isFree ? '$0.00' : `$${((svc.feeCents || 0) / 100).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consultation Delivery Guarantee */}
            <div className="bg-surface-a0/90 border border-surface-a10/60 rounded-xl p-3 flex items-center justify-between text-[11px] font-mono">
              <span className="text-surface-a40">Consultation Access:</span>
              <span className="text-success-a0 font-bold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success-a0" />
                <span>1-on-1 Video Call</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
