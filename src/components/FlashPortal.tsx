import React, { useState } from 'react';
import { Shield, KeyRound, Lock, LayoutDashboard, AlertTriangle, ArrowRight, UserCheck, Sliders, CheckCircle2 } from 'lucide-react';
import { apiFetch, setAuthToken } from '../lib/api';

interface FlashPortalProps {
  currentRole: 'admin' | 'provider' | 'client' | 'guest' | null;
  onNavigate: (tab: 'client' | 'provider' | 'agent' | 'sales', role?: 'admin' | 'provider' | 'client' | 'guest' | null) => void;
}

export const FlashPortal: React.FC<FlashPortalProps> = ({ currentRole, onNavigate }) => {
  const [username, setUsername] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!username.trim() && !passphrase.trim()) {
      setError('Please enter your credentials.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, passphrase }),
      });
      const data = await res.json();

      if (data.success && data.role) {
        if (data.token) {
          setAuthToken(data.token);
        }
        if (data.role === 'provider') {
          onNavigate('provider', 'provider');
        } else if (data.role === 'admin') {
          onNavigate('agent', 'admin');
        } else if (data.role === 'client') {
          onNavigate('client', null);
        }
      } else {
        setError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError('Connection error during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-10">
      {/* Flash Hero Header */}
      <div className="text-center space-y-3 max-w-2xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-info-a0/10 border border-info-a0/30 text-info-a0 text-xs font-mono mb-2">
          <Shield className="w-4 h-4 animate-pulse" />
          <span className="font-semibold tracking-wider uppercase">GATEKEEPER SECURITY ENGINE • v1.1</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-theme-light">
          Access Control & Gate Routing
        </h1>
        <p className="text-surface-a40 font-mono text-xs sm:text-sm">
          Select a system portal or enter your credentials to route automatically.
        </p>
      </div>

      {/* Main Grid Layout: Interactive Auth Terminal & Portal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
        {/* Left: Credential Login Terminal */}
        <div className="lg:col-span-5 bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between font-mono relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-info-a0/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-surface-a10">
              <div className="flex items-center space-x-2 text-info-a0 font-bold text-sm tracking-wider uppercase">
                <KeyRound className="w-4 h-4" />
                <span>Credential Terminal</span>
              </div>
              <span className="text-[10px] text-surface-a40 bg-tonal-a0 px-2 py-0.5 rounded border border-surface-a10">
                AUTO-ROUTE
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-start space-x-2 text-danger-a0 bg-danger-a0/10 p-3 rounded-lg border border-danger-a0/20 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-surface-a40 tracking-wider">Username / ID</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. client, provider, or admin"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-lg px-3 py-2.5 text-theme-light text-xs focus:outline-none focus:border-info-a0 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-surface-a40 tracking-wider">Passphrase / Secret Key</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-tonal-a0 border border-surface-a10 rounded-lg px-3 py-2.5 text-theme-light text-xs focus:outline-none focus:border-info-a0 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-info-a0 hover:bg-info-a10 text-primary-a0 font-bold uppercase tracking-widest rounded-xl transition-all text-xs flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-info-a0/10 mt-2"
              >
                {loading ? (
                  <span>AUTHENTICATING...</span>
                ) : (
                  <>
                    <span>Authenticate & Route</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Direct Portal Option Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 gap-4 font-sans">
          {/* Card 0: Provider Sovereign Sales & Booking Page */}
          <div 
            onClick={() => onNavigate('sales', null)}
            className="group cursor-pointer bg-surface-a0 hover:bg-tonal-a0 border-2 border-info-a0/40 hover:border-info-a0 rounded-2xl p-5 shadow-xl transition-all duration-200 flex items-start space-x-4 relative overflow-hidden"
          >
            <div className="p-3 bg-info-a0/20 text-info-a0 rounded-xl group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-theme-light group-hover:text-info-a0 transition-colors">
                  Provider Sovereign Sales Page
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-info-a0/20 text-info-a0 border border-info-a0/30 font-bold">
                  SOVEREIGN SALES PAGE
                </span>
              </div>
              <p className="text-xs text-surface-a40 leading-relaxed">
                Dedicated 1-on-1 Video Call consultation and advisory landing page for the active provider. Includes service tiers, appointment scheduler, and instant digital pass issuance.
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-info-a0 group-hover:translate-x-1 transition-transform">
                <span>View Sovereign Sales Page</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>

          {/* Card 1: Client Portal */}
          <div 
            onClick={() => onNavigate('client', null)}
            className="group cursor-pointer bg-surface-a0 hover:bg-tonal-a0 border border-surface-a10 hover:border-info-a0/50 rounded-2xl p-5 shadow-lg transition-all duration-200 flex items-start space-x-4 relative overflow-hidden"
          >
            <div className="p-3 bg-info-a0/10 text-info-a0 rounded-xl group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-theme-light group-hover:text-info-a0 transition-colors">
                  Client Checkout Portal
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-a10 text-surface-a40 border border-surface-a20">
                  PUBLIC / GUEST
                </span>
              </div>
              <p className="text-xs text-surface-a40 leading-relaxed">
                Direct double-blind paywalled consultation checkout, PayPal sandbox payment, and QR entitlement redemption.
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-info-a0 group-hover:translate-x-1 transition-transform">
                <span>Enter Client Checkout</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>

          {/* Card 2: Provider Dashboard */}
          <div 
            onClick={() => {
              if (currentRole === 'provider') {
                onNavigate('provider', 'provider');
              } else {
                onNavigate('provider', null);
              }
            }}
            className="group cursor-pointer bg-surface-a0 hover:bg-tonal-a0 border border-surface-a10 hover:border-success-a0/50 rounded-2xl p-5 shadow-lg transition-all duration-200 flex items-start space-x-4 relative overflow-hidden"
          >
            <div className="p-3 bg-success-a0/10 text-success-a0 rounded-xl group-hover:scale-110 transition-transform">
              <Sliders className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-theme-light group-hover:text-success-a0 transition-colors">
                  Provider Terminal
                </h3>
                {currentRole === 'provider' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success-a0/20 text-success-a0 border border-success-a0/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SESSION ACTIVE</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-a10 text-surface-a40 border border-surface-a20">
                    AUTH REQUIRED
                  </span>
                )}
              </div>
              <p className="text-xs text-surface-a40 leading-relaxed">
                Configure consultation fees, Video Call links/handles, payout email addresses, and generate active marketing gates.
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-success-a0 group-hover:translate-x-1 transition-transform">
                <span>Route to Provider Terminal</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>

          {/* Card 3: Admin Console */}
          <div 
            onClick={() => {
              if (currentRole === 'admin') {
                onNavigate('agent', 'admin');
              } else {
                onNavigate('agent', null);
              }
            }}
            className="group cursor-pointer bg-surface-a0 hover:bg-tonal-a0 border border-surface-a10 hover:border-warning-a0/50 rounded-2xl p-5 shadow-lg transition-all duration-200 flex items-start space-x-4 relative overflow-hidden"
          >
            <div className="p-3 bg-warning-a0/10 text-warning-a0 rounded-xl group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-theme-light group-hover:text-warning-a0 transition-colors">
                  Admin Console
                </h3>
                {currentRole === 'admin' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-warning-a0/20 text-warning-a0 border border-warning-a0/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SESSION ACTIVE</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-a10 text-surface-a40 border border-surface-a20">
                    AUTH REQUIRED
                  </span>
                )}
              </div>
              <p className="text-xs text-surface-a40 leading-relaxed">
                Full ledger oversight, settlement splits (85/15), dispute escrow unmasking, and immutable audit logs.
              </p>
              <div className="pt-2 flex items-center text-xs font-semibold text-warning-a0 group-hover:translate-x-1 transition-transform">
                <span>Route to Admin Console</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
