import React, { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { ShieldCheck, Fingerprint, Lock, Key, AlertCircle, RefreshCw, Smartphone, Terminal, User } from 'lucide-react';
import { apiFetch, setAuthToken } from '../lib/api';

interface DeviceAuthModalProps {
  hasRegisteredDevices: boolean;
  onAuthenticated: () => void;
}

export const DeviceAuthModal: React.FC<DeviceAuthModalProps> = ({
  hasRegisteredDevices,
  onAuthenticated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [showEnrollInput, setShowEnrollInput] = useState(!hasRegisteredDevices);

  // Development Auth Bridge State
  const [devAuthEnabled, setDevAuthEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'device' | 'dev'>('device');
  const [devUsername, setDevUsername] = useState('admin');
  const [devPassword, setDevPassword] = useState('');

  useEffect(() => {
    setShowEnrollInput(!hasRegisteredDevices);
  }, [hasRegisteredDevices]);

  useEffect(() => {
    // Check server development status
    fetch('/api/auth/dev-status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.enabled) {
          setDevAuthEnabled(true);
        }
      })
      .catch(() => setDevAuthEnabled(false));
  }, []);

  // Handle Development Login Submit
  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: devUsername.trim(),
          password: devPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Development login failed. Please verify credentials.');
      }

      if (data.authToken) {
        setAuthToken(data.authToken);
      }

      onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during development login.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Authentication Challenge & Assertion
  const handleAuthenticate = async () => {
    setLoading(true);
    setError(null);
    try {
      const challengeRes = await fetch('/api/auth/webauthn/auth-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const challengeData = await challengeRes.json();

      if (!challengeRes.ok || !challengeData.success) {
        throw new Error(challengeData.error || 'Failed to initialize WebAuthn authentication challenge.');
      }

      // Trigger OS WebAuthn Prompt (Passkey / Device PIN / Security Key / Biometric)
      const asseResp = await startAuthentication({ optionsJSON: challengeData.options });

      // Verify Assertion on Server
      const verifyRes = await apiFetch('/api/auth/webauthn/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: asseResp }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Device authentication signature verification failed.');
      }

      if (verifyData.authToken) {
        setAuthToken(verifyData.authToken);
      }

      onAuthenticated();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Authentication was cancelled or timed out. Please try again.');
      } else {
        setError(err.message || 'An unexpected authentication error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Privileged First-Device Enrollment
  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const challengeRes = await fetch('/api/auth/webauthn/register-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Bootstrap-Token': bootstrapToken.trim(),
        },
        body: JSON.stringify({
          userId: 'gatekeeper_owner',
          userName: 'GateKeeper Owner',
        }),
      });
      const challengeData = await challengeRes.json();

      if (!challengeRes.ok || !challengeData.success) {
        throw new Error(challengeData.error || 'Enrollment Authorization Failed: Invalid admin bootstrap token.');
      }

      // Trigger OS WebAuthn Enrollment
      const attResp = await startRegistration({ optionsJSON: challengeData.options });

      // Verify Registration on Server
      const verifyRes = await apiFetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: attResp,
          userId: 'gatekeeper_owner',
          deviceName: 'Primary GateKeeper Device',
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Device credential registration verification failed.');
      }

      if (verifyData.authToken) {
        setAuthToken(verifyData.authToken);
      }

      onAuthenticated();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Device registration was cancelled or timed out.');
      } else {
        setError(err.message || 'An unexpected enrollment error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">GateKeeper Locked</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {showEnrollInput
                ? 'Privileged Device Enrollment Required'
                : activeTab === 'dev' && devAuthEnabled
                ? 'Development Authentication Bridge'
                : 'Device-Backed Authentication Required'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {devAuthEnabled && (
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('device');
                setError(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'device'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Passkey / Device</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('dev');
                setError(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'dev'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Dev Login</span>
            </button>
          </div>
        )}

        {activeTab === 'dev' && devAuthEnabled ? (
          <form onSubmit={handleDevLogin} className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
              <div className="flex items-center space-x-1.5 font-medium">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Development Authentication Active</span>
              </div>
              <p className="text-blue-300/80 leading-relaxed text-[11px]">
                Select a development persona or enter custom server development credentials.
              </p>
            </div>

            {/* Quick Persona Presets */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Dev Persona Quick Select</label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => { setDevUsername('admin'); setDevPassword('gk_admin_secret_dev_2026'); }}
                  className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold transition-all cursor-pointer text-center"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setDevUsername('provider'); setDevPassword('gk_provider_secret_dev_2026'); }}
                  className="px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold transition-all cursor-pointer text-center"
                >
                  Provider
                </button>
                <button
                  type="button"
                  onClick={() => { setDevUsername('client'); setDevPassword('client'); }}
                  className="px-2 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold transition-all cursor-pointer text-center"
                >
                  Client
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Username</span>
              </label>
              <input
                type="text"
                required
                value={devUsername}
                onChange={(e) => setDevUsername(e.target.value)}
                placeholder="Enter development username..."
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                <span>Password / Secret Key</span>
              </label>
              <input
                type="password"
                required
                value={devPassword}
                onChange={(e) => setDevPassword(e.target.value)}
                placeholder="Enter development password..."
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !devUsername.trim() || !devPassword.trim()}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating Dev Session...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Login with Development Credentials</span>
                </>
              )}
            </button>
          </form>
        ) : !showEnrollInput ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <div className="flex items-center space-x-2 text-zinc-200 font-medium">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Operating System Authentication</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Use your passkey, device PIN, security key, or device security method to unlock GateKeeper.
              </p>
            </div>

            <button
              onClick={handleAuthenticate}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Awaiting Device Verification...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Authenticate with Device / Passkey</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowEnrollInput(true)}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-2 text-center"
            >
              Need to register a new device?
            </button>
          </div>
        ) : (
          <form onSubmit={handleEnroll} className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <span className="font-semibold block">Privileged Operation</span>
              <p className="text-amber-400/80">
                Registering a new device credential requires an Admin Authorization Bootstrap Token.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Bootstrap Token</span>
              </label>
              <input
                type="password"
                required
                value={bootstrapToken}
                onChange={(e) => setBootstrapToken(e.target.value)}
                placeholder="Enter admin authorization secret..."
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !bootstrapToken.trim()}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authorizing Enrollment...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize & Register Passkey</span>
                </>
              )}
            </button>

            {hasRegisteredDevices && (
              <button
                type="button"
                onClick={() => setShowEnrollInput(false)}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-1 text-center"
              >
                Back to Device Authentication
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
