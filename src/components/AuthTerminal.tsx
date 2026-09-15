import React, { useState } from 'react';
import { Shield, KeyRound, AlertTriangle } from 'lucide-react';
import { apiFetch, setAuthToken } from '../lib/api';

interface AuthTerminalProps {
  onAuthenticated: (role: 'admin' | 'provider') => void;
}

export const AuthTerminal: React.FC<AuthTerminalProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

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
        onAuthenticated(data.role);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-a0 border border-surface-a10 rounded-2xl shadow-2xl overflow-hidden font-mono">
        
        <div className="bg-surface-a10 p-4 flex items-center justify-between border-b border-surface-a20">
          <div className="flex items-center space-x-2 text-info-a0">
            <Shield className="w-5 h-5" />
            <span className="font-bold tracking-widest text-sm uppercase">Secure Access</span>
          </div>
          <span className="text-[10px] text-surface-a40 bg-surface-a0 px-2 py-0.5 rounded border border-surface-a10">v1.1</span>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center space-x-2 text-danger-a0 bg-danger-a0/10 p-3 rounded-lg border border-danger-a0/20 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>AUTHENTICATION FAILED.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-surface-a40 tracking-wider">Identification</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-lg px-3 py-2.5 text-theme-light text-sm focus:outline-none focus:border-info-a0"
              placeholder="Username..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-surface-a40 tracking-wider">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-lg px-3 py-2.5 text-theme-light text-sm focus:outline-none focus:border-info-a0"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-info-a0 hover:bg-info-a10 text-primary-a0 font-bold uppercase tracking-widest rounded-lg transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? 'Verifying...' : 'Authenticate'}</span>
          </button>
        </form>
        
        <div className="bg-tonal-a0 border-t border-surface-a10 p-3 flex justify-between text-[10px] text-surface-a40 tracking-widest">
          <span>CHANNEL ........ SECURE</span>
          <span className="text-info-a0">SYSTEM ......... OPERATIONAL</span>
        </div>

      </div>
    </div>
  );
};
