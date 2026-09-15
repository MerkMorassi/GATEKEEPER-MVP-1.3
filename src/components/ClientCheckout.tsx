import React, { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle2, QrCode, Video, ExternalLink, RefreshCw, AlertCircle, ArrowRight, DollarSign, Clock, Calendar, Ticket, Sparkles } from 'lucide-react';
import { ProviderConfig, Order, Settlement, Entitlement } from '../types';

export type HandoffStatus = 'HandoffPrepared' | 'HandoffExecuted' | 'HandoffCompleted' | 'HandoffFailed';

const HANDOFF_MESSAGES: Record<
  HandoffStatus,
  {
    title: string;
    description: string;
    architectureNote: string;
    badgeStyle: string;
  }
> = {
  HandoffPrepared: {
    title: 'Handoff Prepared',
    description: 'Payment authorized and single-use entitlement issued. Ready to initiate session handoff.',
    architectureNote: 'GateKeeper has secured 85/15 fee settlement and generated your opaque access token. Click below to execute handoff.',
    badgeStyle: 'bg-info-a0/10 border-info-a0/30 text-info-a0',
  },
  HandoffExecuted: {
    title: 'Executing Handoff',
    description: 'Verifying single-use credential and transferring session parameters server-side...',
    architectureNote: 'Transitioning from GateKeeper authorization boundary to external provider session.',
    badgeStyle: 'bg-warning-a0/10 border-warning-a0/30 text-warning-a0 animate-pulse',
  },
  HandoffCompleted: {
    title: 'Controlled Handoff Completed',
    description: 'Access credential redeemed and external session link unlocked.',
    architectureNote: 'GateKeeper delivers access authorization and fee settlement. Media content is conducted directly over external provider channels without observation, telemetry logging, or recording.',
    badgeStyle: 'bg-success-a0/10 border-success-a0/30 text-success-a0',
  },
  HandoffFailed: {
    title: 'Handoff Rejected',
    description: 'Single-use credential redemption failed or has already been consumed.',
    architectureNote: 'Single-use boundary enforced. Check support context or request a fresh credential.',
    badgeStyle: 'bg-danger-a0/10 border-danger-a0/30 text-danger-a0',
  },
};

interface ClientCheckoutProps {
  onOrderCreated?: (order: Order) => void;
  activeTokenFromHash?: string;
  activeGateFromHash?: string;
  activeServiceFromHash?: string;
}

export const ClientCheckout: React.FC<ClientCheckoutProps> = ({
  onOrderCreated,
  activeTokenFromHash,
  activeGateFromHash,
  activeServiceFromHash
}) => {
  const [providerConfig, setProviderConfig] = useState<any | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [gateMeta, setGateMeta] = useState<{
    promotionType?: string;
    serviceDescription?: string;
    expiryDate?: string;
    isExpired?: boolean;
    customGreeting?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flow State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [agreedToIndemnity, setAgreedToIndemnity] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'paypal_modal' | 'verifying' | 'success'>('details');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<'HandoffPrepared' | 'HandoffExecuted' | 'HandoffCompleted' | 'HandoffFailed' | null>(null);

  // Appointment Scheduling State
  const [clientTimezone, setClientTimezone] = useState<string>('UTC');
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('02:00 PM');
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(15);

  const [redemptionResult, setRedemptionResult] = useState<{
    redeemed: boolean;
    facetimeHandle?: string;
    facetimeUrl?: string;
    instruction?: string;
    error?: string;
  } | null>(null);

  // Detect Client Timezone and default appointment date
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
      setClientTimezone(tz);

      // Default to tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      setSelectedAppointmentDate(dateStr);
    } catch {
      setClientTimezone('America/New_York');
      setSelectedAppointmentDate('2026-08-18');
    }
  }, []);

  // Fetch provider config
  useEffect(() => {
    fetchConfig();
  }, [activeGateFromHash, activeServiceFromHash]);

  // Handle access token hash from URL if present
  useEffect(() => {
    if (activeTokenFromHash) {
      verifyTokenFromHash(activeTokenFromHash);
    }
  }, [activeTokenFromHash]);

  // Embed Widget postMessage on successful checkout / pass issuance
  useEffect(() => {
    if (checkoutStep === 'success' && entitlement) {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'GATEKEEPER_PAYMENT_SUCCESS',
            payload: {
              orderId: entitlement.orderId,
              token: entitlement.token,
              ticketCode: entitlement.ticketCode,
              expiresAt: entitlement.expiresAt,
            },
          },
          '*'
        );
      }
    }
  }, [checkoutStep, entitlement]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeGateFromHash) {
        const res = await fetch(`/api/gates/${activeGateFromHash}`);
        const data = await res.json();
        if (data.success && data.gate) {
          setGateMeta({
            promotionType: data.gate.promotionType,
            serviceDescription: data.gate.serviceDescription,
            expiryDate: data.gate.expiryDate,
            isExpired: data.gate.isExpired,
            customGreeting: data.gate.customGreeting,
          });
          setProviderConfig({
            name: data.gate.providerName,
            services: data.gate.services,
            active: true,
            customGreeting: data.gate.customGreeting,
          });
          if (data.gate.isExpired) {
            setError(`This promotional offer expired on ${data.gate.expiryDate}. Please contact the provider for an updated link.`);
          }
          if (data.gate.services && data.gate.services.length > 0) {
            const targetSvcId = activeServiceFromHash || data.gate.targetServiceId;
            const matchedSvc = targetSvcId
              ? data.gate.services.find((s: any) => s.id === targetSvcId)
              : null;
            setSelectedServiceId(matchedSvc ? matchedSvc.id : data.gate.services[0].id);
          }
        } else {
          setError(data.error || 'Gate is invalid, inactive, or not found.');
        }
      } else {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.success) {
          const loadedServices = (data.provider.services && data.provider.services.length > 0)
            ? data.provider.services
            : [
                {
                  id: 'fallback',
                  name: data.provider.serviceName,
                  description: data.provider.serviceDescription,
                  feeCents: data.provider.feeCents,
                  currency: data.provider.currency
                }
              ];
          setProviderConfig({
            ...data.provider,
            services: loadedServices
          });
          if (loadedServices.length > 0) {
            const matchedSvc = activeServiceFromHash
              ? loadedServices.find((s: any) => s.id === activeServiceFromHash)
              : null;
            setSelectedServiceId(matchedSvc ? matchedSvc.id : loadedServices[0].id);
          }
        } else {
          setError(data.error || 'Failed to load provider configuration');
        }
      }
    } catch (err: any) {
      setError('Unable to connect to GateKeeper server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyTokenFromHash = async (token: string) => {
    try {
      const res = await fetch(`/api/access/${token}`);
      const data = await res.json();
      if (data.success && data.entitlement) {
        setEntitlement(data.entitlement);
        if (data.entitlement.status === 'redeemed') {
          setHandoffStatus('HandoffCompleted');
        } else if (data.entitlement.status === 'expired') {
          setHandoffStatus('HandoffFailed');
        } else {
          setHandoffStatus('HandoffPrepared');
        }
        setCheckoutStep('success');
      }
    } catch (err) {
      console.error('Error verifying token hash:', err);
    }
  };

  // Initiate Order
  const handleStartCheckout = async () => {
    setError(null);
    setIsProcessingPayment(true);
    try {
      const selectedSvc = providerConfig?.services?.find((s: any) => s.id === selectedServiceId);
      const isTrial = Boolean(selectedSvc?.isTrial || selectedSvc?.feeCents === 0);

      const res = await fetch('/api/orders/create', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gateToken: activeGateFromHash,
          serviceId: selectedServiceId,
          isTrial,
          durationMinutes: selectedDurationMinutes,
          scheduledTimeSlot: `${selectedAppointmentDate} @ ${selectedTimeSlot}`,
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setCurrentOrder(data.order);
        if (onOrderCreated) onOrderCreated(data.order);

        // If trial tier or $0, payment is completely bypassed and order is confirmed automatically
        if (data.isTrial || data.order.status === 'confirmed' || data.order.amountCents === 0) {
          if (data.entitlement) {
            setSettlement(data.settlement);
            setEntitlement(data.entitlement);
            setHandoffStatus('HandoffPrepared');
            setCheckoutStep('success');
          } else {
            await executePaymentVerification(data.order.id, 'FREE_TRIAL_PASS');
          }
        } else {
          setCheckoutStep('paypal_modal');
        }
      } else {
        setError(data.error || 'Failed to initiate transaction');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const executePaymentVerification = async (orderId: string, simulatedPaypalId?: string) => {
    setCheckoutStep('verifying');
    setError(null);

    const paypalOrderId = simulatedPaypalId || `PAYID-MOCK-${Date.now()}`;

    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paypalOrderId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentOrder(data.order);
        setSettlement(data.settlement);
        setEntitlement(data.entitlement);
        setHandoffStatus('HandoffPrepared');
        setCheckoutStep('success');
      } else {
        setError(data.error || 'Payment verification failed server-side.');
        setCheckoutStep('details');
      }
    } catch (err: any) {
      setError('Server payment verification error: ' + err.message);
      setCheckoutStep('details');
    }
  };

  // Confirm PayPal Payment & Verify Server-Side
  const handleConfirmPayPalPayment = async (simulatedPaypalId?: string) => {
    if (!currentOrder) return;
    await executePaymentVerification(currentOrder.id, simulatedPaypalId);
  };

  // Server-Authoritative Single-Use Redemption
  const handleRedeemCredential = async () => {
    if (!entitlement) return;
    setError(null);
    setHandoffStatus('HandoffExecuted');

    try {
      const res = await fetch(`/api/access/${entitlement.token}/redeem`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setHandoffStatus('HandoffCompleted');
        setRedemptionResult({
          redeemed: true,
          facetimeHandle: data.facetimeHandle,
          facetimeUrl: data.facetimeUrl,
          instruction: data.facetimeDeliveryInstruction,
        });
        setEntitlement((prev) => prev ? { ...prev, status: 'redeemed', redeemedAt: data.redeemedAt } : null);
      } else {
        setHandoffStatus('HandoffFailed');
        setRedemptionResult({
          redeemed: false,
          error: data.error || 'Redemption rejected.',
        });
      }
    } catch (err: any) {
      setHandoffStatus('HandoffFailed');
      setRedemptionResult({
        redeemed: false,
        error: 'Network error during redemption: ' + err.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-surface-a40">
        <RefreshCw className="w-8 h-8 animate-spin text-info-a0 mb-3" />
        <p className="text-sm font-mono">Initializing GateKeeper Authorization Boundary...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {error && (
        <div className="bg-danger-a0/10 border border-danger-a0/30 rounded-xl p-4 mb-6 flex items-start space-x-3 text-danger-a0">
          <AlertCircle className="w-5 h-5 text-danger-a0 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Authorization Error</p>
            <p className="text-danger-a10 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      {checkoutStep === 'details' && providerConfig && (
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Provider Header */}
          <div className="pb-6 border-b border-surface-a10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-info-a0 font-semibold bg-info-a0/10 px-2.5 py-1 rounded-md border border-info-a0/20">
                Official Provider
              </span>
              {gateMeta?.promotionType && (
                <span className="text-[11px] font-mono uppercase tracking-widest text-success-a0 font-bold bg-success-a0/10 px-2.5 py-1 rounded-md border border-success-a0/30">
                  {gateMeta.promotionType}
                </span>
              )}
              {gateMeta?.expiryDate && (
                <span className={`text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                  gateMeta.isExpired 
                    ? 'text-danger-a0 bg-danger-a0/10 border-danger-a0/30' 
                    : 'text-surface-a40 bg-tonal-a0 border-surface-a20'
                }`}>
                  Expires: {gateMeta.expiryDate}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-light mt-2">{providerConfig.name}</h1>
          </div>

          {/* Custom Campaign Greeting Banner & Service Description */}
          {(providerConfig.customGreeting || gateMeta?.serviceDescription) && (
            <div className="mt-4 p-4 bg-info-a0/10 border border-info-a0/30 rounded-xl flex items-start space-x-3 text-theme-light">
              <QrCode className="w-5 h-5 text-info-a0 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                {gateMeta?.promotionType && (
                  <p className="font-bold text-info-a0 uppercase tracking-wider text-[10px]">{gateMeta.promotionType} Offer</p>
                )}
                {providerConfig.customGreeting && (
                  <p className="text-theme-light font-medium text-sm">{providerConfig.customGreeting}</p>
                )}
                {gateMeta?.serviceDescription && (
                  <p className="text-surface-a40 text-xs pt-1 italic">{gateMeta.serviceDescription}</p>
                )}
              </div>
            </div>
          )}

          {/* Workflow Explanation Banner (QR Code Sales Page vs Direct PayPal) */}
          <div className="mt-4 p-4 bg-tonal-a0 border border-surface-a10 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-info-a0 font-mono text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-info-a0" />
              <span>Video Call Ticket Sales & Booking Portal</span>
            </div>
            <p className="text-xs text-surface-a40 leading-relaxed">
              Unlike a raw PayPal transfer link, scanning this QR code connects you directly to our official sales page. Here you can select your preferred <strong className="text-theme-light">1-on-1 Video Call session tier</strong>, pick your <strong className="text-theme-light">appointment date & time</strong>, purchase your ticket via PayPal, and instantly receive your single-use verified access credential.
            </p>
          </div>

          <div className="py-6 border-b border-surface-a10 space-y-6">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-surface-a40 mb-3 flex items-center space-x-2">
                <Ticket className="w-4 h-4 text-info-a0" />
                <span>1. Select Offer / Service Tier</span>
              </h2>
              
              <div className="space-y-3">
                {providerConfig.services && providerConfig.services.map((svc: any) => {
                  const isTrial = Boolean(svc.isTrial || svc.feeCents === 0);
                  const isSelected = selectedServiceId === svc.id;

                  return (
                    <div 
                      key={svc.id}
                      onClick={() => {
                        setSelectedServiceId(svc.id);
                        if (svc.defaultDurationMinutes) {
                          setSelectedDurationMinutes(svc.defaultDurationMinutes);
                        } else if (isTrial) {
                          setSelectedDurationMinutes(15);
                        }
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                        isSelected 
                          ? isTrial
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-sm'
                            : 'bg-info-a0/10 border-info-a0 shadow-sm' 
                          : 'bg-tonal-a0 border-surface-a10 hover:border-surface-a20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? (isTrial ? 'border-emerald-500' : 'border-info-a0') : 'border-surface-a40'}`}>
                              {isSelected && <div className={`w-2 h-2 rounded-full ${isTrial ? 'bg-emerald-500' : 'bg-info-a0'}`} />}
                            </div>
                            <h3 className={`font-bold ${isSelected ? (isTrial ? 'text-emerald-400' : 'text-info-a0') : 'text-theme-light'}`}>{svc.name}</h3>
                            {isTrial && (
                              <span className="text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Free Consultation Trial</span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-surface-a40 mt-1.5 ml-6">{svc.description}</p>
                        </div>
                        <div className="text-left sm:text-right ml-6 sm:ml-0">
                          {isTrial ? (
                            <>
                              <div className="text-lg font-extrabold text-emerald-400 font-mono">FREE TRIAL</div>
                              <div className="text-[10px] text-surface-a50 font-mono">Single-Use Pass • No Checkout</div>
                            </>
                          ) : (
                            <>
                              <div className="text-xl font-extrabold text-theme-light">${(svc.feeCents / 100).toFixed(2)}</div>
                              <div className="text-[10px] text-surface-a50 font-mono">USD • Instant Pass</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Configurable Duration & Pass Terms for Selected Tier */}
                      {isSelected && (
                        <div className="mt-2 pt-3 border-t border-surface-a10/60 ml-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3.5 h-3.5 text-info-a0" />
                            <span className="font-mono text-surface-a40 font-bold">Consultation Duration:</span>
                            {svc.allowClientDurationAdjustment !== false ? (
                              <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                {(svc.allowedDurations || [10, 15, 20, 30]).map((dur: number) => (
                                  <button
                                    type="button"
                                    key={dur}
                                    onClick={() => setSelectedDurationMinutes(dur)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-all ${
                                      selectedDurationMinutes === dur
                                        ? isTrial 
                                          ? 'bg-emerald-500 text-primary-a0 border-emerald-500'
                                          : 'bg-info-a0 text-primary-a0 border-info-a0'
                                        : 'bg-surface-a0 border-surface-a20 text-theme-light hover:border-surface-a30'
                                    }`}
                                  >
                                    {dur}m {dur === (svc.defaultDurationMinutes || 15) ? '(Default)' : ''}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-theme-light">
                                {svc.defaultDurationMinutes || 15} Minutes
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 text-[11px] font-mono text-emerald-400">
                            <span>Pass Validity:</span>
                            <span className="font-bold">
                              {svc.expirationDate 
                                ? `Until ${svc.expirationDate}` 
                                : `${svc.expirationDays || (isTrial ? 7 : 14)} Days`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Video Call Appointment Scheduler */}
            <div className="pt-4 border-t border-surface-a10/60 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono uppercase tracking-wider text-surface-a40 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-info-a0" />
                  <span>2. Schedule 1-on-1 Video Call Appointment</span>
                </h2>
                <span className="text-[10px] font-mono text-surface-a50 bg-tonal-a0 px-2 py-0.5 rounded border border-surface-a10">
                  TZ: {clientTimezone}
                </span>
              </div>

              {/* Date Selection Chips */}
              <div className="space-y-1.5">
                <label className="text-xs text-surface-a40 font-mono block">Select Date:</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map((offset) => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const isoDate = d.toISOString().split('T')[0];
                    const labelDay = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                    const labelFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isSelected = selectedAppointmentDate === isoDate;

                    return (
                      <button
                        type="button"
                        key={isoDate}
                        onClick={() => setSelectedAppointmentDate(isoDate)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-info-a0 text-primary-a0 font-bold border-info-a0 shadow-md'
                            : 'bg-tonal-a0 border-surface-a10 text-theme-light hover:border-surface-a30'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-mono tracking-wider opacity-80">{labelDay}</div>
                        <div className="text-xs font-bold font-mono mt-0.5">{labelFormatted}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs text-surface-a40 font-mono block">Select Time Slot:</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {['09:30 AM', '11:00 AM', '02:00 PM', '04:30 PM', '07:00 PM'].map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`p-2 rounded-lg border text-center font-mono text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-info-a0 text-primary-a0 border-info-a0 shadow'
                            : 'bg-tonal-a0 border-surface-a10 text-theme-light hover:border-surface-a30'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Appointment Confirmation Badge */}
              <div className="bg-info-a0/10 border border-info-a0/20 p-3 rounded-xl flex items-center justify-between font-mono text-xs">
                <div className="flex items-center space-x-2 text-info-a0">
                  <Video className="w-4 h-4 text-info-a0" />
                  <span className="font-bold">Reserved Appointment Slot:</span>
                </div>
                <div className="text-theme-light font-bold">
                  {selectedAppointmentDate} @ {selectedTimeSlot}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
              <div className="bg-tonal-a0/80 border border-surface-a10 p-3.5 rounded-xl">
                <Lock className="w-4 h-4 text-info-a0 mb-2" />
                <h3 className="text-xs font-semibold text-theme-light">Double-Blind Privacy</h3>
                <p className="text-[11px] text-surface-a40 mt-1">No personal identity data passed to media layer.</p>
              </div>

              <div className="bg-tonal-a0/80 border border-surface-a10 p-3.5 rounded-xl">
                <QrCode className="w-4 h-4 text-info-a0 mb-2" />
                <h3 className="text-xs font-semibold text-theme-light">Opaque Single-Use QR</h3>
                <p className="text-[11px] text-surface-a40 mt-1">Disposable ticket generated upon payment.</p>
              </div>

              <div className="bg-tonal-a0/80 border border-surface-a10 p-3.5 rounded-xl">
                <Shield className="w-4 h-4 text-info-a0 mb-2" />
                <h3 className="text-xs font-semibold text-theme-light">Guaranteed Onboarding</h3>
                <p className="text-[11px] text-surface-a40 mt-1">Direct Video Call session handoff unlocked upon payment.</p>
              </div>
            </div>
          </div>

          {/* Legal Guardrails & Provider Indemnification Agreement */}
          <div className="bg-tonal-a0 border border-surface-a10 p-4 rounded-xl text-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-info-a0 font-bold uppercase tracking-wider text-[10px]">
              <Shield className="w-3.5 h-3.5" />
              <span>Legal Guardrails & Policy Compliance</span>
            </div>
            <p className="text-surface-a40 text-[11px] leading-relaxed">
              By proceeding with this transaction, you explicitly agree to indemnify and hold harmless the service provider (<strong className="text-theme-light">Merk Morassi, LLC</strong>) from any and all liabilities. You certify that your utilization of this confidential gateway strictly complies with all governing laws, privileges, and terms of service established by Apple, Apple Pay, Video Call services, PayPal, and underlying media infrastructure.
            </p>
            <label className="flex items-start space-x-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedToIndemnity}
                onChange={(e) => setAgreedToIndemnity(e.target.checked)}
                className="mt-0.5 rounded border-surface-a30 bg-surface-a0 text-info-a0 focus:ring-info-a0"
              />
              <span className="text-[11px] text-theme-light font-medium select-none">
                I agree to the Legal Guardrails, Platform Policies, and Provider Indemnification terms.
              </span>
            </label>
          </div>

          {/* Action Section */}
          <div className="pt-4 border-t border-surface-a10">
            {(() => {
              const selectedSvc = providerConfig.services?.find((s: any) => s.id === selectedServiceId);
              const isTrial = Boolean(selectedSvc?.isTrial || selectedSvc?.feeCents === 0);

              return (
                <button
                  onClick={handleStartCheckout}
                  disabled={isProcessingPayment || !providerConfig.active || !selectedServiceId || !agreedToIndemnity}
                  className={`w-full py-4 text-primary-a0 font-bold text-sm sm:text-base rounded-xl shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isTrial 
                      ? 'bg-emerald-500 hover:bg-emerald-400' 
                      : 'bg-info-a0 hover:bg-info-a10'
                  }`}
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{isTrial ? 'Confirming Free Trial...' : 'Initiating Order...'}</span>
                    </>
                  ) : isTrial ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-primary-a0" />
                      <span>Book Free Consultation Trial (Instant Access Pass)</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5" />
                      <span>Pay ${(((selectedSvc?.feeCents ?? 0) / 100)).toFixed(2)} via PayPal</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Secure Transaction Banner */}
      {checkoutStep === 'details' && providerConfig && (
        <div className="bg-surface-a0 border border-surface-a10 rounded-xl p-4 mt-8 flex items-start space-x-3 text-theme-light">
          <Shield className="w-5 h-5 text-info-a0 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold text-theme-light flex items-center space-x-2">
              <span>Secure Encrypted Connection</span>
            </p>
            <p className="text-surface-a40 mt-1 leading-relaxed">
              Protected by Server-Authoritative PayPal Verification. Your payment is securely processed through GateKeeper. Your session access is generated after payment confirmation.
            </p>
            <p className="text-surface-a50 mt-2 text-[10px]">
              GateKeeper — a trusted service of Merk Morassi, LLC
            </p>
          </div>
        </div>
      )}

      {/* PayPal Modal Step */}
      {checkoutStep === 'paypal_modal' && currentOrder && (
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 sm:p-8 max-w-lg mx-auto shadow-2xl">
          <div className="text-center pb-6 border-b border-surface-a10">
            <div className="w-12 h-12 bg-warning-a0/10 border border-warning-a0/20 rounded-xl flex items-center justify-center text-warning-a0 mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-theme-light">PayPal Express Checkout</h2>
            <p className="text-xs text-surface-a40 font-mono mt-1">Order ID: {currentOrder.id}</p>
          </div>

          <div className="py-6 space-y-4">
            <div className="bg-tonal-a0 p-4 rounded-xl border border-surface-a10 space-y-2 text-xs">
              <div className="flex justify-between text-theme-light">
                <span>Service:</span>
                <span className="font-semibold text-theme-light">{currentOrder.serviceName}</span>
              </div>
              <div className="flex justify-between text-theme-light">
                <span>Total Amount:</span>
                <span className="font-semibold text-info-a0">${(currentOrder.amountCents / 100).toFixed(2)} USD</span>
              </div>
            </div>

            <div className="p-4 bg-info-a0/10 border border-info-a0/20 rounded-xl text-xs text-info-a10 leading-relaxed">
              <p className="font-medium text-info-a0 mb-1">Secure Payment Flow</p>
              Clicking below will securely authorize payment through the PayPal rail. Your funds are verified and your disposable access credential will be instantly generated for direct connection.
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => handleConfirmPayPalPayment()}
              className="w-full py-3.5 bg-warning-a0 hover:bg-warning-a10 text-primary-a0 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <span>Complete Payment with PayPal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCheckoutStep('details')}
              className="w-full py-2.5 text-xs text-surface-a40 hover:text-theme-light transition-colors"
            >
              Cancel Order
            </button>
          </div>
        </div>
      )}

      {/* Verification Spinner */}
      {checkoutStep === 'verifying' && (
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-2xl">
          <RefreshCw className="w-10 h-10 animate-spin text-info-a0 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-theme-light">Verifying Payment Security</h2>
          <p className="text-xs text-surface-a40 font-mono mt-2">
            Confirming authorization • Generating Disposable Access Credential...
          </p>
        </div>
      )}

      {/* Success & Entitlement QR View */}
      {checkoutStep === 'success' && entitlement && (
        <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-surface-a10 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-theme-light">
                  {currentOrder?.status === 'confirmed' || currentOrder?.amountCents === 0
                    ? 'Free Consultation Trial Confirmed'
                    : 'Payment Verified & Entitlement Issued'}
                </h2>
                <p className="text-xs text-surface-a40 font-mono mt-0.5">Order ID: {entitlement.orderId}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="uppercase">ORDER: {currentOrder?.status || 'CONFIRMED'}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-success-a0/10 border border-success-a0/20 text-success-a0 text-xs font-mono font-medium flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-success-a0" />
                <span className="uppercase">STATUS: {entitlement.status}</span>
              </div>
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center space-x-1.5 ${HANDOFF_MESSAGES[handoffStatus || 'HandoffPrepared'].badgeStyle}`}>
                <span className="uppercase">HANDOFF: {handoffStatus || 'HandoffPrepared'}</span>
              </div>
            </div>
          </div>

          {/* Handoff State Notice Banner */}
          {(() => {
            const msg = HANDOFF_MESSAGES[handoffStatus || 'HandoffPrepared'];
            return (
              <div className="bg-tonal-a0 p-4 rounded-xl border border-surface-a10 space-y-1">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-info-a0 flex-shrink-0" />
                  <span className="text-xs font-bold text-theme-light">{msg.title}</span>
                </div>
                <p className="text-xs text-surface-a40 pl-6">{msg.description}</p>
                <p className="text-[10px] text-surface-a50 font-mono pl-6 pt-0.5">{msg.architectureNote}</p>
              </div>
            );
          })()}

          {/* QR Code & Token Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* QR Card */}
            <div className="bg-tonal-a0 p-6 rounded-2xl border border-surface-a10 text-center flex flex-col items-center">
              {entitlement.qrDataUrl ? (
                <div className="p-3 bg-white rounded-xl shadow-inner mb-4">
                  <img src={entitlement.qrDataUrl} alt="Access QR Code" className="w-56 h-56 object-contain" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-surface-a0 border border-surface-a10 rounded-xl flex items-center justify-center text-surface-a40 mb-4">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
              <span className="text-[11px] font-mono text-surface-a40">Scan QR or use token below for single-use access</span>
            </div>

            {/* Credential Specs */}
            <div className="space-y-4">
              {/* Confirmed Appointment Card */}
              <div className="bg-info-a0/10 p-4 rounded-xl border border-info-a0/30 space-y-1 font-mono text-xs">
                <span className="text-[10px] text-info-a0 uppercase font-bold tracking-wider block flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 inline" />
                  <span>Confirmed 1-on-1 Video Call Appointment</span>
                </span>
                <div className="text-theme-light font-bold text-sm pt-0.5">
                  {selectedAppointmentDate} @ {selectedTimeSlot}
                </div>
                <span className="text-[10px] text-surface-a40 block">Timezone: {clientTimezone}</span>
              </div>

              <div className="bg-tonal-a0 p-4 rounded-xl border border-surface-a10 space-y-2">
                <label className="text-[10px] font-mono uppercase text-surface-a40 tracking-wider">Opaque Access Token</label>
                <div className="font-mono text-xs text-info-a0 bg-surface-a0 p-2.5 rounded-lg border border-surface-a10 break-all select-all">
                  {entitlement.token}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="bg-tonal-a0 p-2.5 rounded-xl border border-surface-a10">
                  <span className="text-surface-a50 block text-[9px] uppercase">DURATION</span>
                  <span className="text-info-a0 font-bold text-[11px] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-info-a0 inline" />
                    <span>{entitlement.durationMinutes || selectedDurationMinutes} min</span>
                  </span>
                </div>
                <div className="bg-tonal-a0 p-2.5 rounded-xl border border-surface-a10">
                  <span className="text-surface-a50 block text-[9px] uppercase">PASS TYPE</span>
                  <span className="text-emerald-400 font-bold text-[11px] mt-0.5 block truncate">
                    {entitlement.isTrial ? 'Single-Use Free Pass' : 'Single-Use Pass'}
                  </span>
                </div>
                <div className="bg-tonal-a0 p-2.5 rounded-xl border border-surface-a10">
                  <span className="text-surface-a50 block text-[9px] uppercase">EXPIRES</span>
                  <span className="text-theme-light text-[11px] block mt-0.5 truncate" title={new Date(entitlement.expiresAt).toLocaleString()}>
                    {new Date(entitlement.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Single-Use Redemption Section */}
          <div className="pt-6 border-t border-surface-a10">
            {redemptionResult?.redeemed ? (
              <div className="bg-success-a0/10 border border-success-a0/30 p-6 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 bg-success-a0/20 text-success-a0 rounded-full flex items-center justify-center mx-auto">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-theme-light">Controlled Handoff Completed</h3>
                  <p className="text-xs text-theme-light mt-1">{redemptionResult.instruction}</p>
                </div>

                <div className="pt-2">
                  <a
                    href={redemptionResult.facetimeUrl}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-success-a0 hover:bg-success-a10 text-primary-a0 font-bold rounded-xl shadow-lg transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Launch Video Call Session {redemptionResult.facetimeHandle?.startsWith('http') ? '(Meeting Room)' : `(${redemptionResult.facetimeHandle})`}</span>
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
                <div className="text-[10px] text-surface-a40 font-mono space-y-1">
                  <p>Handoff Status: HandoffCompleted • Credential status updated to REDEEMED.</p>
                  <p className="text-surface-a50">GateKeeper delivers access authorization and fee settlement. Media content is conducted directly over external provider channels without observation or recording.</p>
                </div>
              </div>
            ) : (
              <div className="bg-tonal-a0 p-6 rounded-2xl border border-surface-a10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-theme-light">Redeem Access Credential & Execute Handoff</h3>
                  <p className="text-xs text-surface-a40 mt-0.5">
                    Handoff Prepared: Click below to perform single-use server redemption and initiate transfer to your provider session.
                  </p>
                </div>

                <button
                  onClick={handleRedeemCredential}
                  disabled={entitlement.status !== 'active' || handoffStatus === 'HandoffExecuted'}
                  className="w-full sm:w-auto px-6 py-3 bg-info-a0 hover:bg-info-a10 text-primary-a0 font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Video className="w-4 h-4" />
                  <span>{handoffStatus === 'HandoffExecuted' ? 'Executing Handoff...' : 'Redeem Credential & Connect'}</span>
                </button>
              </div>
            )}

            {redemptionResult?.error && (
              <div className="bg-danger-a0/10 border border-danger-a0/30 p-4 rounded-xl text-xs text-danger-a0 mt-4 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{redemptionResult.error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
