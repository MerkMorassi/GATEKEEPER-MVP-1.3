import React from 'react';
import { Shield, Lock, LayoutDashboard, KeyRound, QrCode, LogOut, Sliders, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentTab: 'portal' | 'sales' | 'client' | 'provider' | 'agent' | 'scanner';
  onTabChange: (tab: 'portal' | 'sales' | 'client' | 'provider' | 'agent' | 'scanner') => void;
  providerActive: boolean;
  role?: 'admin' | 'provider' | 'client' | 'guest' | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, role, onLogout }) => {
  const tabs = [
    { id: 'portal', label: 'Portal', icon: KeyRound },
    { id: 'sales', label: 'Sales Page', icon: Sparkles },
    { id: 'client', label: 'Client', icon: Lock },
    { id: 'provider', label: 'Provider', icon: Sliders },
    { id: 'agent', label: 'Admin', icon: LayoutDashboard },
    { id: 'scanner', label: 'Gate', icon: QrCode },
  ] as const;

  const renderRoleBadge = () => {
    if (role === 'admin') {
      return (
        <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-danger-a0/20 text-danger-a0 border border-danger-a0/30 font-semibold">
          ADMIN
        </span>
      );
    }
    if (role === 'provider') {
      return (
        <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-success-a0/20 text-success-a0 border border-success-a0/30 font-semibold">
          PROVIDER
        </span>
      );
    }
    if (role === 'client') {
      return (
        <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-info-a0/20 text-info-a0 border border-info-a0/30 font-semibold">
          CLIENT ACCOUNT
        </span>
      );
    }
    if (role === 'guest') {
      return (
        <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-warning-a0/20 text-warning-a0 border border-warning-a0/30 font-semibold">
          GUEST TOKEN
        </span>
      );
    }
    return (
      <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-info-a0/20 text-info-a0 border border-info-a0/30 font-semibold">
        MVP 1.2
      </span>
    );
  };

  return (
    <header className="bg-surface-a0 border-b border-surface-a10 text-theme-light sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0" onClick={() => onTabChange('portal')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-info-a0/10 border border-info-a0/30 flex items-center justify-center text-info-a0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-wider text-theme-light uppercase">GATEKEEPER</span>
                {renderRoleBadge()}
              </div>
              <p className="text-[10px] sm:text-[11px] text-surface-a40 font-mono tracking-wide hidden sm:block">
                ALL SIGNAL. NO NOISE.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (md breakpoint and above) */}
          <nav className="hidden md:flex items-center space-x-1.5 sm:space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-tonal-a10 text-info-a0 border border-info-a0/40 shadow-sm font-bold'
                      : 'text-surface-a40 hover:text-theme-light hover:bg-surface-a10/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {role && onLogout && (
              <button
                onClick={onLogout}
                title="End Secure Session"
                className="ml-1 px-2.5 py-1.5 rounded-lg text-danger-a0 hover:bg-danger-a0/10 transition-colors flex items-center space-x-1 text-xs font-mono"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit</span>
              </button>
            )}
          </nav>

          {/* Mobile Top Right Quick Action Buttons */}
          <div className="flex md:hidden items-center space-x-2">
            {role && onLogout && (
              <button
                onClick={onLogout}
                title="End Secure Session"
                className="p-1 rounded-lg text-danger-a0 hover:bg-danger-a0/10 border border-danger-a0/20 transition-colors flex items-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar (Scrollable horizontally, strictly contained inside header) */}
        <div className="flex md:hidden items-center space-x-1.5 overflow-x-auto no-scrollbar py-2 border-t border-surface-a10/60 -mx-3 px-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-info-a0/20 text-info-a0 border border-info-a0/40 shadow-sm font-bold'
                    : 'bg-tonal-a0/90 text-surface-a40 hover:text-theme-light border border-surface-a10/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
