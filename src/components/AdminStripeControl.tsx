import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Key,
  Webhook,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  Radio,
  Activity,
  Zap,
} from 'lucide-react';
import { StripeConfigResponse } from '../types';
import { apiFetch } from '../lib/api';

export const AdminStripeControl: React.FC = () => {
  const [config, setConfig] = useState<StripeConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form input states
  const [environment, setEnvironment] = useState<'test' | 'live'>('test');
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  // Secret replace mode toggles
  const [replacingSecretKey, setReplacingSecretKey] = useState(false);
  const [replacingWebhookSecret, setReplacingWebhookSecret] = useState(false);

  // Live Mode Confirmation Modal state
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveConfirmInput, setLiveConfirmInput] = useState('');

  // Async action states
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Test Execution Feedback Console
  const [testLog, setTestLog] = useState<{
    type: 'connection' | 'checkout' | 'webhook';
    timestamp: string;
    status: 'success' | 'error';
    title: string;
    details: any;
  } | null>(null);

  useEffect(() => {
    fetchStripeConfig();
  }, []);

  const fetchStripeConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/admin/stripe');
      const json = await res.json();
      if (json.success && json.stripeConfig) {
        const c = json.stripeConfig as StripeConfigResponse;
        setConfig(c);
        setEnvironment(c.environment);
        setPublishableKey(c.publishableKey);
      } else {
        setError(json.error || 'Failed to fetch Stripe configuration.');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (enableLiveConfirmed = false) => {
    try {
      setSavingConfig(true);
      setError(null);
      setActionNotice(null);

      const payload: any = {
        environment,
        enableLiveConfirmed,
      };

      if (publishableKey && !publishableKey.includes('••••')) {
        payload.publishableKey = publishableKey.trim();
      }
      if (secretKey && (replacingSecretKey || !config?.secretKeyConfigured)) {
        payload.secretKey = secretKey.trim();
      }
      if (webhookSecret && (replacingWebhookSecret || !config?.webhookSecretConfigured)) {
        payload.webhookSecret = webhookSecret.trim();
      }

      const res = await apiFetch('/api/admin/stripe', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.stripeConfig) {
        setConfig(json.stripeConfig);
        setReplacingSecretKey(false);
        setReplacingWebhookSecret(false);
        setSecretKey('');
        setWebhookSecret('');
        setShowLiveModal(false);
        setLiveConfirmInput('');
        setActionNotice('Stripe configuration updated and active ✓');
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        setError(json.error || 'Failed to save Stripe configuration.');
      }
    } catch (err: any) {
      setError('Error saving configuration: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setError(null);
      const res = await apiFetch('/api/admin/stripe/test-connection', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTestLog({
          type: 'connection',
          timestamp: new Date().toLocaleTimeString(),
          status: 'success',
          title: 'CONNECTED — Stripe API Reachable',
          details: {
            environment: json.environment,
            accountId: json.accountId,
            message: json.message,
          },
        });
        fetchStripeConfig();
      } else {
        setTestLog({
          type: 'connection',
          timestamp: new Date().toLocaleTimeString(),
          status: 'error',
          title: 'CONNECTION FAILED',
          details: { reason: json.reason || json.error },
        });
      }
    } catch (err: any) {
      setTestLog({
        type: 'connection',
        timestamp: new Date().toLocaleTimeString(),
        status: 'error',
        title: 'CONNECTION ERROR',
        details: { reason: err.message },
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCreateTestCheckout = async () => {
    try {
      setCreatingCheckout(true);
      setError(null);
      const res = await apiFetch('/api/admin/stripe/test-checkout', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTestLog({
          type: 'checkout',
          timestamp: new Date().toLocaleTimeString(),
          status: 'success',
          title: 'Test Checkout Created',
          details: {
            orderId: json.orderId,
            checkoutSessionId: json.checkoutSessionId,
            amount: `$${(json.amountCents / 100).toFixed(2)}`,
            environment: json.environment,
            checkoutUrl: json.checkoutUrl,
          },
        });
        fetchStripeConfig();
      } else {
        setTestLog({
          type: 'checkout',
          timestamp: new Date().toLocaleTimeString(),
          status: 'error',
          title: 'Test Checkout Failed',
          details: { reason: json.error },
        });
      }
    } catch (err: any) {
      setTestLog({
        type: 'checkout',
        timestamp: new Date().toLocaleTimeString(),
        status: 'error',
        title: 'Test Checkout Error',
        details: { reason: err.message },
      });
    } finally {
      setCreatingCheckout(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTestingWebhook(true);
      setError(null);
      const res = await apiFetch('/api/admin/stripe/test-webhook', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTestLog({
          type: 'webhook',
          timestamp: new Date().toLocaleTimeString(),
          status: 'success',
          title: 'Webhook Security Verification Passed',
          details: {
            validSignatureAccepted: json.validSignatureAccepted,
            invalidSignatureRejected: json.invalidSignatureRejected,
            missingSignatureRejected: json.missingSignatureRejected,
            message: json.message,
          },
        });
        fetchStripeConfig();
      } else {
        setTestLog({
          type: 'webhook',
          timestamp: new Date().toLocaleTimeString(),
          status: 'error',
          title: 'Webhook Verification Failed',
          details: {
            validSignatureAccepted: json.validSignatureAccepted,
            invalidSignatureRejected: json.invalidSignatureRejected,
            missingSignatureRejected: json.missingSignatureRejected,
            reason: json.error,
          },
        });
      }
    } catch (err: any) {
      setTestLog({
        type: 'webhook',
        timestamp: new Date().toLocaleTimeString(),
        status: 'error',
        title: 'Webhook Verification Error',
        details: { reason: err.message },
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-surface-a40">
        <RefreshCw className="w-6 h-6 animate-spin text-info-a0 mb-2" />
        <p className="text-xs font-mono">Loading Stripe Control Surface...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Environment Badge */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-info-a0" />
            <h2 className="text-xl font-bold text-theme-light">Stripe Control Panel</h2>
            {config?.environment === 'live' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-danger-a0/20 text-danger-a0 border border-danger-a0/40">
                LIVE MODE
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-success-a0/20 text-success-a0 border border-success-a0/40">
                TEST / SANDBOX MODE
              </span>
            )}
          </div>
          <p className="text-xs text-surface-a40 font-mono mt-1">
            Authoritative Credentials • Endpoint Verification • Controlled Sandbox Testing
          </p>
        </div>

        <button
          onClick={fetchStripeConfig}
          className="px-3.5 py-1.5 bg-tonal-a0 hover:bg-surface-a10 text-theme-light text-xs font-mono rounded-xl border border-surface-a10 transition-all flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Status</span>
        </button>
      </div>

      {actionNotice && (
        <div className="bg-success-a0/10 border border-success-a0/30 p-3.5 rounded-xl text-xs font-mono text-success-a0 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {error && (
        <div className="bg-danger-a0/10 border border-danger-a0/30 p-3.5 rounded-xl text-xs font-mono text-danger-a0 flex items-center space-x-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout: Configuration + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stripe Configuration Form (2 Columns) */}
        <div className="lg:col-span-2 bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-2 border-b border-surface-a10 pb-4">
            <Key className="w-4 h-4 text-info-a0" />
            <h3 className="text-base font-semibold text-theme-light">Stripe Integration Credentials</h3>
          </div>

          {/* Environment Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-surface-a40">Stripe Environment Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnvironment('test')}
                className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
                  environment === 'test'
                    ? 'bg-success-a0/10 border-success-a0 text-success-a0 font-bold'
                    : 'bg-tonal-a0 border-surface-a10 text-surface-a40 hover:text-theme-light'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4" />
                  <span>Sandbox / Test Mode</span>
                </div>
                <span className="text-[10px] uppercase opacity-75">Safe Testing</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (environment !== 'live') {
                    setShowLiveModal(true);
                  }
                }}
                className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
                  environment === 'live'
                    ? 'bg-danger-a0/10 border-danger-a0 text-danger-a0 font-bold'
                    : 'bg-tonal-a0 border-surface-a10 text-surface-a40 hover:text-theme-light'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-danger-a0" />
                  <span>Live Production Mode</span>
                </div>
                <span className="text-[10px] uppercase text-danger-a0 font-bold">Real Money</span>
              </button>
            </div>
          </div>

          {/* Publishable Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-surface-a40">Stripe Publishable Key</label>
            <input
              type="text"
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              placeholder="pk_test_..."
              className="w-full bg-tonal-a0 border border-surface-a10 text-theme-light text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-info-a0"
            />
          </div>

          {/* Secret Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-surface-a40">Stripe Secret Key</label>
            {config?.secretKeyConfigured && !replacingSecretKey ? (
              <div className="flex items-center justify-between bg-tonal-a0 border border-surface-a10 px-3.5 py-2.5 rounded-xl text-xs font-mono">
                <span className="text-success-a0 font-semibold">Secret Key: •••••••••••••••••••• Configured</span>
                <button
                  type="button"
                  onClick={() => setReplacingSecretKey(true)}
                  className="px-2.5 py-1 bg-surface-a10 hover:bg-surface-a20 text-theme-light rounded-lg text-[11px] transition-colors"
                >
                  Replace Secret Key
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="sk_test_..."
                className="w-full bg-tonal-a0 border border-surface-a10 text-theme-light text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-info-a0"
              />
            )}
          </div>

          {/* Webhook Secret */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-surface-a40">Stripe Webhook Signing Secret</label>
            {config?.webhookSecretConfigured && !replacingWebhookSecret ? (
              <div className="flex items-center justify-between bg-tonal-a0 border border-surface-a10 px-3.5 py-2.5 rounded-xl text-xs font-mono">
                <span className="text-success-a0 font-semibold">Webhook Secret: •••••••••••••••••••• Configured</span>
                <button
                  type="button"
                  onClick={() => setReplacingWebhookSecret(true)}
                  className="px-2.5 py-1 bg-surface-a10 hover:bg-surface-a20 text-theme-light rounded-lg text-[11px] transition-colors"
                >
                  Replace Webhook Secret
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="w-full bg-tonal-a0 border border-surface-a10 text-theme-light text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-info-a0"
              />
            )}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => handleSaveConfig(environment === 'live')}
            disabled={savingConfig}
            className="w-full py-3 bg-info-a0 hover:bg-info-a10 text-primary-a0 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {savingConfig ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save Stripe Configuration</span>
              </>
            )}
          </button>
        </div>

        {/* Stripe Status Panel Card (1 Column) */}
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-surface-a10 pb-4">
            <Activity className="w-4 h-4 text-info-a0" />
            <h3 className="text-base font-semibold text-theme-light">Stripe Connection Status</h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-surface-a10/50">
              <span className="text-surface-a40">Environment</span>
              <span className={`font-bold ${config?.environment === 'live' ? 'text-danger-a0' : 'text-success-a0'}`}>
                {config?.environment?.toUpperCase() || 'TEST'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-surface-a10/50">
              <span className="text-surface-a40">Connection Status</span>
              {config?.connected ? (
                <span className="px-2 py-0.5 bg-success-a0/10 text-success-a0 border border-success-a0/20 rounded font-bold">
                  CONNECTED
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-warning-a0/10 text-warning-a0 border border-warning-a0/20 rounded font-bold">
                  NOT CONFIGURED
                </span>
              )}
            </div>

            <div className="flex justify-between items-center py-2 border-b border-surface-a10/50">
              <span className="text-surface-a40">Account ID</span>
              <span className="text-theme-light font-bold">{config?.accountId || 'acct_********'}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-surface-a10/50">
              <span className="text-surface-a40">API Credentials</span>
              <span className={config?.secretKeyConfigured ? 'text-success-a0' : 'text-danger-a0'}>
                {config?.secretKeyConfigured ? 'CONFIGURED' : 'NOT SET'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-surface-a10/50">
              <span className="text-surface-a40">Webhook Secret</span>
              <span className={config?.webhookSecretConfigured ? 'text-success-a0' : 'text-danger-a0'}>
                {config?.webhookSecretConfigured ? 'CONFIGURED' : 'NOT SET'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-surface-a10/50">
              <span className="text-surface-a40">Last Connection Test</span>
              <span className="text-surface-a50 text-[11px]">
                {config?.lastConnectionTest ? new Date(config.lastConnectionTest).toLocaleString() : 'Never'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-surface-a40">Last Sandbox Test</span>
              <span className="text-surface-a50 text-[11px]">
                {config?.lastSandboxTest ? new Date(config.lastSandboxTest).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sandbox Test Workflow Section */}
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center space-x-2 border-b border-surface-a10 pb-4">
          <Zap className="w-4 h-4 text-warning-a0" />
          <h3 className="text-base font-semibold text-theme-light">Stripe Sandbox Verification Harness</h3>
          <span className="text-[10px] font-mono text-surface-a40 uppercase bg-tonal-a0 px-2 py-0.5 rounded border border-surface-a10">
            Controlled Non-Financial Execution
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="p-3.5 bg-tonal-a0 hover:bg-surface-a10 border border-surface-a10 text-theme-light text-xs font-mono rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {testingConnection ? (
              <RefreshCw className="w-4 h-4 animate-spin text-info-a0" />
            ) : (
              <>
                <Activity className="w-4 h-4 text-info-a0" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCreateTestCheckout}
            disabled={creatingCheckout || config?.environment === 'live'}
            className="p-3.5 bg-tonal-a0 hover:bg-surface-a10 border border-surface-a10 text-theme-light text-xs font-mono rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {creatingCheckout ? (
              <RefreshCw className="w-4 h-4 animate-spin text-success-a0" />
            ) : (
              <>
                <CreditCard className="w-4 h-4 text-success-a0" />
                <span>Create Test Checkout</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            className="p-3.5 bg-tonal-a0 hover:bg-surface-a10 border border-surface-a10 text-theme-light text-xs font-mono rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {testingWebhook ? (
              <RefreshCw className="w-4 h-4 animate-spin text-warning-a0" />
            ) : (
              <>
                <Webhook className="w-4 h-4 text-warning-a0" />
                <span>Test Webhook Verification</span>
              </>
            )}
          </button>
        </div>

        {/* Test Console Output */}
        {testLog && (
          <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
            testLog.status === 'success' ? 'bg-success-a0/10 border-success-a0/30 text-theme-light' : 'bg-danger-a0/10 border-danger-a0/30 text-theme-light'
          }`}>
            <div className="flex items-center justify-between border-b border-surface-a10/40 pb-2">
              <span className={`font-bold uppercase ${testLog.status === 'success' ? 'text-success-a0' : 'text-danger-a0'}`}>
                {testLog.title}
              </span>
              <span className="text-[10px] text-surface-a40">{testLog.timestamp}</span>
            </div>

            <div className="space-y-1 text-surface-a40">
              {testLog.type === 'connection' && testLog.status === 'success' && (
                <div className="space-y-1 text-success-a0">
                  <p>✓ Connected to Stripe API</p>
                  <p>Environment: {testLog.details.environment?.toUpperCase()}</p>
                  <p>Account ID: {testLog.details.accountId}</p>
                  <p>Status: {testLog.details.message}</p>
                </div>
              )}

              {testLog.type === 'checkout' && testLog.status === 'success' && (
                <div className="space-y-2">
                  <p className="text-success-a0 font-bold">✓ Test Checkout Session Created</p>
                  <p>Order ID: <span className="text-info-a0 font-bold">{testLog.details.orderId}</span></p>
                  <p>Session ID: <span className="text-surface-a50">{testLog.details.checkoutSessionId}</span></p>
                  <p>Amount: <span className="text-theme-light font-bold">{testLog.details.amount}</span></p>
                  {testLog.details.checkoutUrl && (
                    <a
                      href={testLog.details.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-success-a0 text-primary-a0 font-bold rounded-lg text-[11px] mt-1"
                    >
                      <span>Open Test Checkout</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {testLog.type === 'webhook' && (
                <div className="space-y-1">
                  <p className={testLog.details.validSignatureAccepted ? 'text-success-a0' : 'text-danger-a0'}>
                    {testLog.details.validSignatureAccepted ? '✓ Valid signature accepted' : '✗ Valid signature failed'}
                  </p>
                  <p className={testLog.details.invalidSignatureRejected ? 'text-success-a0' : 'text-danger-a0'}>
                    {testLog.details.invalidSignatureRejected ? '✓ Invalid signature rejected' : '✗ Invalid signature failed'}
                  </p>
                  <p className={testLog.details.missingSignatureRejected ? 'text-success-a0' : 'text-danger-a0'}>
                    {testLog.details.missingSignatureRejected ? '✓ Missing signature rejected' : '✗ Missing signature failed'}
                  </p>
                </div>
              )}

              {testLog.status === 'error' && (
                <p className="text-danger-a0 font-semibold">{testLog.details.reason || 'An unexpected error occurred during test execution.'}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Confirmation when switching to LIVE mode */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 bg-primary-a0/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-a0 border border-danger-a0/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-danger-a0 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-danger-a0" />
              <span>ENABLE LIVE STRIPE MODE</span>
            </div>

            <p className="text-xs text-surface-a40 font-mono leading-relaxed">
              You are switching GateKeeper from Stripe <strong className="text-success-a0">TEST</strong> mode to <strong className="text-danger-a0">LIVE</strong> mode. Live transactions will process real customer payments and transfer real money.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-surface-a40 uppercase">
                To confirm, type <span className="text-danger-a0 font-bold">ENABLE LIVE STRIPE</span> below:
              </label>
              <input
                type="text"
                value={liveConfirmInput}
                onChange={(e) => setLiveConfirmInput(e.target.value)}
                placeholder="ENABLE LIVE STRIPE"
                className="w-full bg-tonal-a0 border border-danger-a0/30 text-danger-a0 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-danger-a0"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLiveModal(false);
                  setLiveConfirmInput('');
                  setEnvironment('test');
                }}
                className="px-4 py-2 bg-tonal-a0 hover:bg-surface-a10 text-surface-a40 text-xs font-mono rounded-xl border border-surface-a10"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={liveConfirmInput !== 'ENABLE LIVE STRIPE'}
                onClick={() => {
                  setEnvironment('live');
                  handleSaveConfig(true);
                }}
                className="px-4 py-2 bg-danger-a0 hover:bg-danger-a10 disabled:opacity-40 text-primary-a0 font-mono text-xs font-bold rounded-xl transition-all"
              >
                Enable Live Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
