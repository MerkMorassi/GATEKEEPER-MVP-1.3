import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Shield, 
  Calendar, 
  Clock, 
  Video, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  QrCode, 
  DollarSign, 
  Star, 
  Award, 
  Users, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  Smartphone,
  Ticket,
  FileText,
  Globe,
  MapPin,
  ShieldCheck,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  Gift,
  Zap,
  Radio,
  Tv,
  Cast,
  Activity
} from 'lucide-react';
import { ProviderConfig, ServiceDefinition, Order, Entitlement, Settlement } from '../types';
import { ReceiptGenerator, ReceiptData } from './ReceiptGenerator';

interface MarketingGateItem {
  id: string;
  name: string;
  token: string;
  targetServiceId?: string;
  customGreeting?: string;
  serviceDescription?: string;
  expiryDate?: string;
  promotionType?: string;
  isExpired?: boolean;
}

interface ClientSalesPageProps {
  onNavigateToCheckout?: (gateToken?: string, serviceId?: string) => void;
}

export const ClientSalesPage: React.FC<ClientSalesPageProps> = ({ onNavigateToCheckout }) => {
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [marketingGates, setMarketingGates] = useState<MarketingGateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Booking State
  const [selectedGate, setSelectedGate] = useState<MarketingGateItem | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null);
  const [clientName, setClientName] = useState('Client Guest');
  const [clientEmail, setClientEmail] = useState('client@example.com');

  // Appointment Scheduling & Mode State
  const [bookingMode, setBookingMode] = useState<'instant_paypal' | 'scheduled'>('instant_paypal');
  const [clientTimezone, setClientTimezone] = useState<string>('UTC');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('02:00 PM');
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(15);

  // Payment Execution State
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'creating_order' | 'ready_to_pay' | 'processing_payment' | 'completed'>('idle');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [issuedEntitlement, setIssuedEntitlement] = useState<Entitlement | null>(null);
  const [issuedSettlement, setIssuedSettlement] = useState<Settlement | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<{
    redeemed: boolean;
    facetimeHandle?: string;
    error?: string;
  } | null>(null);

  // FAQ Toggle State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  const bookingSectionRef = useRef<HTMLDivElement | null>(null);

  // Identify Active Free Consultation Service
  const freeService = useMemo(() => {
    return providerConfig?.services?.find((s) => s.isTrial || s.feeCents === 0);
  }, [providerConfig?.services]);

  // Priority sorted services: Free Tier in priority position #1, followed by remaining tiers
  const sortedServices = useMemo(() => {
    if (!providerConfig?.services) return [];
    return [...providerConfig.services].sort((a, b) => {
      const aFree = a.isTrial || a.feeCents === 0;
      const bFree = b.isTrial || b.feeCents === 0;
      if (aFree && !bFree) return -1;
      if (!aFree && bFree) return 1;
      return a.feeCents - b.feeCents;
    });
  }, [providerConfig?.services]);

  // Detect Client Timezone and default date on mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
      setClientTimezone(tz);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
    } catch {
      setClientTimezone('America/New_York');
      setSelectedDate('2026-08-18');
    }
  }, []);

  // Fetch Marketing Gates and Provider Configuration
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/marketing/gates');
        const data = await res.json();

        if (data.success) {
          setProviderConfig(data.provider);
          setMarketingGates(data.gates || []);

          const services = data.provider?.services || [];
          const freeSvc = services.find((s: ServiceDefinition) => s.isTrial || s.feeCents === 0);

          // Priority default selection: Free tier if available, otherwise first tier
          if (freeSvc) {
            setSelectedService(freeSvc);
            setSelectedDurationMinutes(freeSvc.defaultDurationMinutes || 15);
          } else if (services.length > 0) {
            setSelectedService(services[0]);
            setSelectedDurationMinutes(services[0].defaultDurationMinutes || 15);
          }

          if (data.gates && data.gates.length > 0) {
            const activeGate = data.gates.find((g: MarketingGateItem) => !g.isExpired) || data.gates[0];
            setSelectedGate(activeGate);

            if (activeGate.targetServiceId && services.length > 0) {
              const matchedSvc = services.find((s: ServiceDefinition) => s.id === activeGate.targetServiceId);
              if (matchedSvc) {
                setSelectedService(matchedSvc);
                setSelectedDurationMinutes(matchedSvc.defaultDurationMinutes || 15);
              }
            }
          }
        } else {
          setError(data.error || 'Failed to load consultation metadata.');
        }
      } catch (err: any) {
        setError('Network error connecting to GateKeeper servers.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check URL hash for direct service or gate routing
  useEffect(() => {
    if (!providerConfig?.services) return;
    const hash = window.location.hash;
    if (hash.includes('service=')) {
      const svcId = hash.split('service=')[1]?.split('&')[0];
      const match = providerConfig.services.find((s) => s.id === svcId);
      if (match) {
        setSelectedService(match);
        setSelectedDurationMinutes(match.defaultDurationMinutes || 15);
      }
    } else if (hash.includes('free') && freeService) {
      setSelectedService(freeService);
      setSelectedDurationMinutes(freeService.defaultDurationMinutes || 15);
    }
  }, [providerConfig, freeService]);

  // Scroll to booking section
  const handleScrollToBooking = (gate?: MarketingGateItem, service?: ServiceDefinition) => {
    if (gate) setSelectedGate(gate);
    if (service) setSelectedService(service);

    if (bookingSectionRef.current) {
      bookingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Create Order & Prepare PayPal Checkout / Bypass for Free Trial
  const handleInitiateBooking = async () => {
    if (!selectedService) {
      setError('Please select a consultation service tier.');
      return;
    }

    const isTrial = Boolean(selectedService.isTrial || selectedService.feeCents === 0);

    setCheckoutStep('creating_order');
    setError(null);

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateToken: selectedGate?.token,
          serviceId: selectedService.id,
          isTrial,
          durationMinutes: selectedDurationMinutes,
          scheduledTimeSlot: `${selectedDate} @ ${selectedTimeSlot} (${clientTimezone})`,
          payerName: clientName,
          payerEmail: clientEmail,
        })
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCurrentOrder(data.order);
        if (data.isTrial || data.order.status === 'confirmed' || data.order.amountCents === 0) {
          if (data.entitlement) {
            setIssuedEntitlement(data.entitlement);
            if (data.settlement) setIssuedSettlement(data.settlement);
            setCheckoutStep('completed');
          } else {
            // verify immediately with zero fee
            await handleExecutePaymentWithOrder(data.order.id, 'FREE_TRIAL_PASS');
          }
        } else {
          setCheckoutStep('ready_to_pay');
        }
      } else {
        setError(data.error || 'Failed to generate order reservation.');
        setCheckoutStep('idle');
      }
    } catch (err: any) {
      setError('Connection error initiating booking order.');
      setCheckoutStep('idle');
    }
  };

  const handleExecutePaymentWithOrder = async (orderId: string, paypalId?: string) => {
    setCheckoutStep('processing_payment');
    setError(null);

    const mockPaypalOrderId = paypalId || `PAYPAL_ORD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paypalOrderId: mockPaypalOrderId
        })
      });

      const data = await res.json();
      if (data.success) {
        setIssuedEntitlement(data.entitlement);
        setIssuedSettlement(data.settlement);
        setCheckoutStep('completed');
      } else {
        setError(data.error || 'Payment verification failed.');
        setCheckoutStep('ready_to_pay');
      }
    } catch (err: any) {
      setError('Error verifying payment capture with GateKeeper escrow.');
      setCheckoutStep('ready_to_pay');
    }
  };

  // Simulate PayPal Payment Capture & Finalize Session Access
  const handleExecutePayment = async () => {
    if (!currentOrder) return;
    await handleExecutePaymentWithOrder(currentOrder.id);
  };

  // Redeem FaceTime Access Token
  const handleRedeemFaceTime = async () => {
    if (!issuedEntitlement) return;

    try {
      const res = await fetch('/api/entitlements/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: issuedEntitlement.token })
      });

      const data = await res.json();
      setRedemptionResult(data);
    } catch (err: any) {
      setRedemptionResult({ redeemed: false, error: 'Failed to establish Video Call connection.' });
    }
  };

  const faqItems = [
    {
      q: 'How does the 1-on-1 Video Call appointment work?',
      a: 'After purchasing your ticket, GateKeeper instantly issues a single-use opaque access token and scannable QR credential. You will receive direct access to launch your 1-on-1 Video Call consultation session at your scheduled time.'
    },
    {
      q: 'Is my consultation payment safe and guaranteed?',
      a: 'Yes. All client transactions are securely processed via encrypted PayPal authorization. Your ticket credential guarantees direct, private access to your provider.'
    },
    {
      q: 'Can I scan my QR code credential using an iPhone camera?',
      a: 'Yes! Your single-use ticket contains a high-density QR code. Point any iPhone camera lens at the QR code, tap the floating link banner, and you will be automatically verified and connected.'
    },
    {
      q: 'What if I need to reschedule my consultation?',
      a: 'Your access ticket remains valid for your selected time slot. If you need assistance, your consultant can adjust session availability directly in their Provider Terminal.'
    }
  ];

  return (
    <div className="min-h-screen bg-primary-a10 text-theme-light">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER SECTION */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-tonal-a0/90 via-primary-a10 to-primary-a10 border-b border-surface-a10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-info-a0/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          {/* Status Badge */}
          <div className="inline-flex items-center space-x-2 bg-info-a0/10 border border-info-a0/30 px-4 py-1.5 rounded-full text-xs font-mono text-info-a0 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-success-a0 animate-ping" />
            <span className="font-bold uppercase tracking-wider">
              {providerConfig?.active ? 'Provider Active • Accepting 1-on-1 Bookings' : 'Exclusive Advisory Portal'}
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-theme-light leading-tight">
            Direct <span className="text-transparent bg-clip-text bg-gradient-to-r from-info-a0 via-theme-light to-info-a10">1-on-1 Video Call</span> Advisory & Executive Sessions
          </h1>

          <p className="text-base sm:text-lg text-surface-a40 max-w-3xl mx-auto leading-relaxed">
            Reserve your confidential consultation with <strong className="text-theme-light">{providerConfig?.name || 'Merk Morassi'}</strong>. Scan or tap to purchase single-use ticket credentials with instant Video Call session handoff.
          </p>

          {/* Call to Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => handleScrollToBooking()}
              className="w-full sm:w-auto px-8 py-4 bg-info-a0 hover:bg-info-a10 text-primary-a0 font-extrabold text-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center space-x-3 font-mono tracking-wider group"
            >
              <Ticket className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>BOOK 1-ON-1 APPOINTMENT NOW</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {onNavigateToCheckout && (
              <button
                type="button"
                onClick={() => onNavigateToCheckout()}
                className="w-full sm:w-auto px-6 py-4 bg-tonal-a0 hover:bg-surface-a10 border border-surface-a10 text-theme-light text-xs font-mono font-bold rounded-2xl transition-all flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4 text-info-a0" />
                <span>Direct Checkout Mode</span>
              </button>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 border-t border-surface-a10/60 max-w-4xl mx-auto text-center font-mono">
            <div className="bg-tonal-a0/60 border border-surface-a10 p-4 rounded-2xl">
              <span className="text-xl sm:text-2xl font-black text-info-a0 block">100%</span>
              <span className="text-[10px] text-surface-a40 uppercase tracking-wider">Confidential 1-on-1</span>
            </div>
            <div className="bg-tonal-a0/60 border border-surface-a10 p-4 rounded-2xl">
              <span className="text-xl sm:text-2xl font-black text-success-a0 block">Instant</span>
              <span className="text-[10px] text-surface-a40 uppercase tracking-wider">QR Ticket Handoff</span>
            </div>
            <div className="bg-tonal-a0/60 border border-surface-a10 p-4 rounded-2xl">
              <span className="text-xl sm:text-2xl font-black text-amber-400 block">Encrypted</span>
              <span className="text-[10px] text-surface-a40 uppercase tracking-wider">Passcode Protection</span>
            </div>
            <div className="bg-tonal-a0/60 border border-surface-a10 p-4 rounded-2xl">
              <span className="text-xl sm:text-2xl font-black text-info-a10 block">Video Call</span>
              <span className="text-[10px] text-surface-a40 uppercase tracking-wider">Native Video Session</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 1.5 HOW IT WORKS (DOUBLE-BLIND PRIVACY & VERIFICATION) */}
      {/* ========================================================================= */}
      <section className="bg-tonal-a0/60 border-y border-surface-a10/80 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 bg-info-a0/10 border border-info-a0/30 px-3 py-1 rounded-full text-xs font-mono text-info-a0">
              <Shield className="w-3.5 h-3.5" />
              <span>Double-Blind Security Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-light tracking-tight">
              How Your Video Call Consultation Works
            </h2>
            <p className="text-xs sm:text-sm text-surface-a40 max-w-2xl mx-auto font-mono">
              Three simple steps to secure, confidential 1-on-1 advisor access without exposing private credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-4 relative group hover:border-info-a0/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-info-a0/20 text-info-a0 border border-info-a0/30 flex items-center justify-center font-mono font-bold text-sm">
                  01
                </div>
                <Lock className="w-5 h-5 text-surface-a40 group-hover:text-info-a0 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-theme-light">Select Service Tier</h3>
                <p className="text-xs text-surface-a40 leading-relaxed font-sans">
                  Choose your consultation duration or specialized advisory tier. No account creation or recurring subscription required.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-4 relative group hover:border-info-a0/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-info-a0/20 text-info-a0 border border-info-a0/30 flex items-center justify-center font-mono font-bold text-sm">
                  02
                </div>
                <Ticket className="w-5 h-5 text-surface-a40 group-hover:text-info-a0 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-theme-light">Instant QR Token Issued</h3>
                <p className="text-xs text-surface-a40 leading-relaxed font-sans">
                  Upon payment, GateKeeper instantly generates a cryptographically signed, single-use ticket credential and scannable QR code.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-6 space-y-4 relative group hover:border-info-a0/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-info-a0/20 text-info-a0 border border-info-a0/30 flex items-center justify-center font-mono font-bold text-sm">
                  03
                </div>
                <Video className="w-5 h-5 text-surface-a40 group-hover:text-info-a0 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-theme-light">Double-Blind Video Call</h3>
                <p className="text-xs text-surface-a40 leading-relaxed font-sans">
                  Tap or scan your ticket to trigger direct Video Call connection. Your identity and session access remain 100% confidential.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 1.8 ABOUT YOUR ADVISOR / PROVIDER CARD */}
      {/* ========================================================================= */}
      {providerConfig && (
        <section className="max-w-4xl mx-auto px-4 pt-16 space-y-6">
          <div className="bg-gradient-to-b from-surface-a0 via-surface-a0 to-tonal-a0 border border-surface-a10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-info-a0 via-info-a10 to-success-a0" />
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-info-a0/40 bg-tonal-a0 shadow-md">
                  {providerConfig.photoUrl || providerConfig.avatarUrl ? (
                    <img
                      src={providerConfig.photoUrl || providerConfig.avatarUrl}
                      alt={providerConfig.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-tonal-a0 text-surface-a40 font-mono text-2xl font-bold">
                      {providerConfig.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-info-a0 text-primary-a0 flex items-center justify-center shadow-md border-2 border-surface-a0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-theme-light">
                      {providerConfig.name}
                    </h3>
                    <p className="text-xs font-semibold text-info-a0 font-mono">
                      {providerConfig.title || 'Principal Strategic Advisor'}
                    </p>
                  </div>

                  {providerConfig.website && (
                    <a
                      href={providerConfig.website.startsWith('http') ? providerConfig.website : `https://${providerConfig.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-info-a0/10 hover:bg-info-a0/20 border border-info-a0/30 rounded-xl text-xs font-mono text-info-a0 font-bold self-center sm:self-auto transition-all"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{providerConfig.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {providerConfig.location && (
                  <div className="flex items-center justify-center sm:justify-start space-x-1 text-xs font-mono text-surface-a40">
                    <MapPin className="w-3.5 h-3.5 text-info-a0" />
                    <span>{providerConfig.location}</span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-surface-a40 leading-relaxed pt-1">
                  {providerConfig.bio || 'Direct executive consultation, confidential 1-on-1 strategy sessions, and venture advisory.'}
                </p>

                {/* Social media links */}
                {providerConfig.socials && Object.values(providerConfig.socials).some(Boolean) && (
                  <div className="pt-3 border-t border-surface-a10/60 flex items-center justify-center sm:justify-start space-x-2">
                    {providerConfig.socials.instagram && (
                      <a
                        href={providerConfig.socials.instagram.startsWith('http') ? providerConfig.socials.instagram : `https://instagram.com/${providerConfig.socials.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-pink-500/20 text-surface-a40 hover:text-pink-400 border border-surface-a10 flex items-center justify-center transition-all"
                        title="Instagram"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {providerConfig.socials.twitter && (
                      <a
                        href={providerConfig.socials.twitter.startsWith('http') ? providerConfig.socials.twitter : `https://x.com/${providerConfig.socials.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-sky-500/20 text-surface-a40 hover:text-sky-400 border border-surface-a10 flex items-center justify-center transition-all"
                        title="X / Twitter"
                      >
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {providerConfig.socials.linkedin && (
                      <a
                        href={providerConfig.socials.linkedin.startsWith('http') ? providerConfig.socials.linkedin : `https://linkedin.com/in/${providerConfig.socials.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-blue-500/20 text-surface-a40 hover:text-blue-400 border border-surface-a10 flex items-center justify-center transition-all"
                        title="LinkedIn"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {providerConfig.socials.youtube && (
                      <a
                        href={providerConfig.socials.youtube.startsWith('http') ? providerConfig.socials.youtube : `https://youtube.com/@${providerConfig.socials.youtube.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-red-500/20 text-surface-a40 hover:text-red-400 border border-surface-a10 flex items-center justify-center transition-all"
                        title="YouTube"
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                    {providerConfig.socials.github && (
                      <a
                        href={providerConfig.socials.github.startsWith('http') ? providerConfig.socials.github : `https://github.com/${providerConfig.socials.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-xl bg-tonal-a0 hover:bg-surface-a20 text-surface-a40 hover:text-white border border-surface-a10 flex items-center justify-center transition-all"
                        title="GitHub"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. MARKETING GATES & SERVICE OFFERINGS SECTION */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 py-16 space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-tonal-a0 border border-surface-a10 px-3 py-1 rounded-full text-xs font-mono text-info-a0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Consultation Tiers & Marketing Campaigns</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-theme-light tracking-tight">
            Select Your Preferred Service Tier
          </h2>
          <p className="text-xs sm:text-sm text-surface-a40 max-w-2xl mx-auto">
            Choose from custom strategy sessions tailored to your goals. Marketing gate offers include exclusive custom greetings and target pricing.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* PRIORITY FREE OFFER PANEL (WHEN ACTIVE) */}
        {/* ========================================================================= */}
        {freeService && (
          <div className="bg-gradient-to-br from-emerald-500/15 via-surface-a0 to-surface-a0 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden ring-1 ring-emerald-500/20 animate-fadeIn">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Priority Spotlight Offer</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                    $0.00 • Complimentary Pass
                  </span>
                  <span className="text-[11px] font-mono text-surface-a40">
                    No Credit Card Required
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-theme-light flex items-center gap-3">
                  <span>{freeService.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                    {freeService.defaultDurationMinutes || 15} MIN SESSION
                  </span>
                </h3>

                <p className="text-xs sm:text-sm text-surface-a40 leading-relaxed font-mono">
                  {freeService.description || 'Complimentary 1-on-1 Discovery & Alignment Consultation Session. Direct Video Call Access with instant single-use pass.'}
                </p>

                {/* Benefit Callouts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-mono">
                  <div className="bg-surface-a0/80 border border-surface-a10 rounded-xl p-2.5 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-theme-light">Zero Cost / No Card</span>
                  </div>
                  <div className="bg-surface-a0/80 border border-surface-a10 rounded-xl p-2.5 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-theme-light">Direct Video Call Room</span>
                  </div>
                  <div className="bg-surface-a0/80 border border-surface-a10 rounded-xl p-2.5 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-theme-light">Instant Verified Pass</span>
                  </div>
                </div>
              </div>

              {/* Action Box */}
              <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-72 bg-surface-a0/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-surface-a10">
                  <span className="text-surface-a40">Standard Fee:</span>
                  <span className="line-through text-surface-a40">$75.00</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-surface-a40">Your Priority Price:</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">$0.00 USD</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedService(freeService);
                    setSelectedDurationMinutes(freeService.defaultDurationMinutes || 15);
                    handleScrollToBooking(undefined, freeService);
                  }}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-primary-a0 font-mono text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>Claim Free Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[10px] text-center text-surface-a40 font-mono">
                  Instant Single-Use Ticket Token Generated
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Marketing Gate Campaigns (if present) */}
        {marketingGates.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-surface-a40 font-bold flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Active Marketing Gate Campaigns</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketingGates.map((gate) => {
                const isSelected = selectedGate?.id === gate.id;
                const matchedService = providerConfig?.services.find(s => s.id === gate.targetServiceId);

                return (
                  <div
                    key={gate.id}
                    onClick={() => {
                      setSelectedGate(gate);
                      if (matchedService) {
                        setSelectedService(matchedService);
                        setSelectedDurationMinutes(matchedService.defaultDurationMinutes || 15);
                      }
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3 relative overflow-hidden ${
                      isSelected
                        ? 'bg-info-a0/10 border-info-a0 shadow-lg'
                        : 'bg-tonal-a0 border-surface-a10 hover:border-surface-a20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-info-a0 bg-info-a0/20 px-2.5 py-0.5 rounded-md border border-info-a0/30 uppercase">
                          {gate.promotionType || 'Special Gate Offer'}
                        </span>
                        {gate.expiryDate && (
                          <span className="text-[10px] font-mono text-surface-a40">
                            Expires: {gate.expiryDate}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-info-a0" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-theme-light">{gate.name}</h4>
                      {gate.customGreeting && (
                        <p className="text-xs text-info-a0/90 font-mono italic mt-1 bg-surface-a0/60 p-2 rounded-lg border border-surface-a10">
                          "{gate.customGreeting}"
                        </p>
                      )}
                      <p className="text-xs text-surface-a40 mt-2 leading-relaxed">
                        {gate.serviceDescription || 'Exclusive marketing pass unlocking 1-on-1 Video Call consultation credentials.'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-surface-a10/60 font-mono text-xs">
                      <span className="text-surface-a40">Target Tier:</span>
                      <span className="font-bold text-theme-light">
                        {matchedService ? `${matchedService.name} ($${(matchedService.feeCents / 100).toFixed(2)})` : 'General Advisory'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standard Service Definitions Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-surface-a40 font-bold flex items-center space-x-2">
            <Ticket className="w-4 h-4 text-info-a0" />
            <span>Consultation Service Tiers</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedServices.map((svc) => {
              const isSelected = selectedService?.id === svc.id;
              const isFree = Boolean(svc.isTrial || svc.feeCents === 0);
              const priceFormatted = (svc.feeCents / 100).toFixed(2);

              return (
                <div
                  key={svc.id}
                  onClick={() => {
                    setSelectedService(svc);
                    setSelectedDurationMinutes(svc.defaultDurationMinutes || 15);
                  }}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-6 relative ${
                    isSelected
                      ? isFree
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-xl scale-[1.02] ring-1 ring-emerald-500/30'
                        : 'bg-info-a0/10 border-info-a0 shadow-xl scale-[1.02]'
                      : isFree
                        ? 'bg-tonal-a0 border-emerald-500/30 hover:border-emerald-500/60'
                        : 'bg-tonal-a0 border-surface-a10 hover:border-surface-a20'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isFree 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : svc.serviceType === 'PPV_BROADCAST'
                            ? 'bg-warning-a0/20 text-warning-a0'
                            : 'bg-surface-a10/60 text-info-a0'
                      }`}>
                        {isFree ? (
                          <Gift className="w-5 h-5" />
                        ) : svc.serviceType === 'PPV_BROADCAST' ? (
                          <Radio className="w-5 h-5 text-warning-a0 animate-pulse" />
                        ) : (
                          <Video className="w-5 h-5" />
                        )}
                      </div>
                      {isFree ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-mono font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full uppercase">
                            ⭐ Priority Tier
                          </span>
                          <span className="text-xs font-mono font-bold bg-success-a0/20 text-success-a0 border border-success-a0/30 px-3 py-1 rounded-full uppercase">
                            Free ($0)
                          </span>
                        </div>
                      ) : svc.serviceType === 'PPV_BROADCAST' ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-mono font-bold bg-warning-a0/20 text-warning-a0 border border-warning-a0/30 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <Radio className="w-3 h-3 text-warning-a0" />
                            <span>PPV Live Stream</span>
                          </span>
                          <span className="text-2xl font-black text-theme-light font-mono">
                            ${priceFormatted} <span className="text-xs font-normal text-surface-a40">USD</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-black text-theme-light font-mono">
                          ${priceFormatted} <span className="text-xs font-normal text-surface-a40">USD</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-theme-light flex items-center gap-2">
                        <span>{svc.name}</span>
                        {isFree && <Sparkles className="w-4 h-4 text-emerald-400" />}
                      </h4>
                      <p className="text-xs text-surface-a40 mt-1.5 leading-relaxed">{svc.description}</p>
                    </div>

                    <ul className="space-y-2 pt-2 border-t border-surface-a10/60 text-xs text-surface-a40 font-mono">
                      {svc.serviceType === 'PPV_BROADCAST' ? (
                        <>
                          <li className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-warning-a0 flex-shrink-0" />
                            <span>Switcher Studio Pro Multi-Camera Feed</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-warning-a0 flex-shrink-0" />
                            <span>nanoCosmos Sub-Second Live WebRTC Delivery</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-warning-a0 flex-shrink-0" />
                            <span>Cryptographically Verified Pass & Token</span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-success-a0 flex-shrink-0" />
                            <span>Direct 1-on-1 Video Call Session</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-success-a0 flex-shrink-0" />
                            <span>Instant Opaque QR Ticket Credential</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-success-a0 flex-shrink-0" />
                            <span>{isFree ? 'Zero Payment Required' : 'Encrypted & Verified Payment Security'}</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedService(svc);
                      setSelectedDurationMinutes(svc.defaultDurationMinutes || 15);
                      handleScrollToBooking(selectedGate || undefined, svc);
                    }}
                    className={`w-full py-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      isSelected
                        ? isFree
                          ? 'bg-emerald-500 text-primary-a0 shadow-md hover:bg-emerald-400'
                          : 'bg-info-a0 text-primary-a0 shadow-md'
                        : isFree
                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
                          : 'bg-surface-a10 hover:bg-surface-a20 text-theme-light'
                    }`}
                  >
                    <span>{isSelected ? 'Selected • Book Now' : (isFree ? 'Claim Free Tier' : 'Select Tier')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. VIDEO CALL APPOINTMENT SCHEDULER & SECURE CHECKOUT SECTION */}
      {/* ========================================================================= */}
      <section ref={bookingSectionRef} className="max-w-4xl mx-auto px-4 py-16 space-y-8">
        <div className="bg-tonal-a0 border-2 border-surface-a10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
          {/* Section Header */}
          <div className="border-b border-surface-a10 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-info-a0/20 text-info-a0 border border-info-a0/30 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-theme-light">
                  Book 1-on-1 Video Call Session
                </h3>
                <p className="text-xs text-surface-a40 font-mono mt-0.5">
                  Select appointment date, time slot, and finalize ticket purchase
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-surface-a40 block text-[10px] uppercase">Selected Service:</span>
              <span className="font-bold text-info-a0 text-sm">
                {selectedService ? `${selectedService.name} ($${(selectedService.feeCents / 100).toFixed(2)})` : 'None Selected'}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-danger-a0/10 border border-danger-a0/30 rounded-2xl p-4 flex items-start space-x-3 text-danger-a0 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Booking Error Notice</p>
                <p className="mt-0.5 text-danger-a10">{error}</p>
              </div>
            </div>
          )}

          {/* STEP A: SCHEDULER & PAYPAL PROCESSOR CONTROLS */}
          {checkoutStep !== 'completed' && (
            <div className="space-y-6">
              {/* Booking Mode Selector Pills */}
              <div className="bg-surface-a0 p-1.5 rounded-2xl border border-surface-a10 flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setBookingMode('instant_paypal')}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                    bookingMode === 'instant_paypal'
                      ? 'bg-info-a0 text-primary-a0 shadow-md'
                      : 'text-surface-a40 hover:text-theme-light'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Direct PayPal Test (Instant Checkout)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('scheduled')}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                    bookingMode === 'scheduled'
                      ? 'bg-info-a0 text-primary-a0 shadow-md'
                      : 'text-surface-a40 hover:text-theme-light'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Schedule Time Slot First</span>
                </button>
              </div>

              {/* Optional Time Slot Scheduler Controls (if scheduled mode selected) */}
              {bookingMode === 'scheduled' && (
                <div className="space-y-6 bg-surface-a0/60 p-4 rounded-2xl border border-surface-a10/60">
                  {/* Date Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase text-surface-a40 font-bold block">
                        1. Select Appointment Date
                      </label>
                      <span className="text-[10px] font-mono text-surface-a50">
                        Client Timezone: {clientTimezone}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[0, 1, 2, 3, 4].map((offset) => {
                        const d = new Date();
                        d.setDate(d.getDate() + offset);
                        const isoDate = d.toISOString().split('T')[0];
                        const labelDay = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                        const labelFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const isSelected = selectedDate === isoDate;

                        return (
                          <button
                            type="button"
                            key={isoDate}
                            onClick={() => setSelectedDate(isoDate)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'bg-info-a0 text-primary-a0 font-bold border-info-a0 shadow-md'
                                : 'bg-surface-a0 border-surface-a10 text-theme-light hover:border-surface-a30'
                            }`}
                          >
                            <div className="text-[10px] uppercase font-mono opacity-80">{labelDay}</div>
                            <div className="text-xs font-bold font-mono mt-0.5">{labelFormatted}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slot Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-surface-a40 font-bold block">
                      2. Select Video Call Time Slot
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {['09:30 AM', '11:00 AM', '02:00 PM', '04:30 PM', '07:00 PM'].map((slot) => {
                        const isSelected = selectedTimeSlot === slot;
                        return (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => setSelectedTimeSlot(slot)}
                            className={`p-2.5 rounded-xl border text-center font-mono text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-info-a0 text-primary-a0 border-info-a0 shadow'
                                : 'bg-surface-a0 border-surface-a10 text-theme-light hover:border-surface-a30'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Consultation Duration Selector */}
                  <div className="space-y-2 pt-2 border-t border-surface-a10/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase text-surface-a40 font-bold block flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-info-a0" />
                        <span>3. Consultation Duration</span>
                      </label>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {selectedService?.isTrial || selectedService?.feeCents === 0 ? 'Single-Use Free Pass' : 'Verified Pass'}
                      </span>
                    </div>
                    {selectedService?.allowClientDurationAdjustment !== false ? (
                      <div className="flex flex-wrap gap-2">
                        {(selectedService?.allowedDurations || [10, 15, 20, 30]).map((dur: number) => {
                          const isSel = selectedDurationMinutes === dur;
                          return (
                            <button
                              type="button"
                              key={dur}
                              onClick={() => setSelectedDurationMinutes(dur)}
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                                isSel
                                  ? (selectedService?.isTrial || selectedService?.feeCents === 0)
                                    ? 'bg-emerald-500 text-primary-a0 border-emerald-500 shadow'
                                    : 'bg-info-a0 text-primary-a0 border-info-a0 shadow'
                                  : 'bg-surface-a0 border-surface-a10 text-theme-light hover:border-surface-a30'
                              }`}
                            >
                              {dur} Minutes {dur === (selectedService?.defaultDurationMinutes || 15) ? '(Default)' : ''}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="font-mono text-xs font-bold text-theme-light bg-surface-a0 p-2.5 rounded-xl border border-surface-a10">
                        {selectedService?.defaultDurationMinutes || 15} Minutes (Fixed Duration)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client Info Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-surface-a40 block">Client Name / Alias</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-surface-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs text-theme-light font-mono focus:border-info-a0 outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-surface-a40 block">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-surface-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-xs text-theme-light font-mono focus:border-info-a0 outline-none"
                    placeholder="client@example.com"
                  />
                </div>
              </div>

              {/* Booking Summary Box */}
              <div className="bg-surface-a0 p-4 rounded-2xl border border-surface-a10 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-surface-a40">
                  <span>Reserved Slot:</span>
                  <span className="font-bold text-theme-light">{selectedDate} @ {selectedTimeSlot} ({clientTimezone})</span>
                </div>
                <div className="flex items-center justify-between text-surface-a40">
                  <span>Consultation Duration:</span>
                  <span className="font-bold text-info-a0">{selectedDurationMinutes} Minutes</span>
                </div>
                <div className="flex items-center justify-between text-surface-a40">
                  <span>Consultation Fee:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {selectedService 
                      ? (selectedService.isTrial || selectedService.feeCents === 0 ? 'FREE TRIAL' : `$${((selectedService.feeCents || 0) / 100).toFixed(2)} USD`)
                      : 'FREE TRIAL'}
                  </span>
                </div>
                {selectedGate && (
                  <div className="flex items-center justify-between text-surface-a40 pt-1 border-t border-surface-a10/60">
                    <span>Applied Gate Pass:</span>
                    <span className="text-success-a0 font-bold">{selectedGate.name}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {checkoutStep === 'idle' && (() => {
                  const isTrial = selectedService ? Boolean(selectedService.isTrial || selectedService.feeCents === 0) : true;
                  return (
                    <button
                      type="button"
                      onClick={handleInitiateBooking}
                      disabled={!selectedService}
                      className={`w-full py-4 font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 font-mono disabled:opacity-50 disabled:cursor-not-allowed ${
                        isTrial
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-primary-a0'
                          : 'bg-info-a0 hover:bg-info-a10 text-primary-a0'
                      }`}
                    >
                      {isTrial ? (
                        <>
                          <Sparkles className="w-4 h-4 text-primary-a0" />
                          <span>CONFIRM FREE TRIAL (INSTANT ACCESS PASS)</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>CONFIRM & PROCEED TO PAYPAL PAYMENT</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  );
                })()}

                {checkoutStep === 'creating_order' && (
                  <div className="py-4 bg-surface-a10 text-theme-light rounded-2xl flex items-center justify-center space-x-2 font-mono text-xs font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin text-info-a0" />
                    <span>Generating GateKeeper Order Reservation...</span>
                  </div>
                )}

                {checkoutStep === 'ready_to_pay' && currentOrder && (
                  <div className="bg-surface-a0 border border-info-a0/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-surface-a40">Order ID: <strong className="text-info-a0">{currentOrder.id}</strong></span>
                      <span className="text-success-a0 font-bold">Status: Ready for Payment</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecutePayment}
                      className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 font-mono"
                    >
                      <DollarSign className="w-5 h-5 text-black" />
                      <span>PAY WITH PAYPAL (${(currentOrder.amountCents / 100).toFixed(2)})</span>
                    </button>
                    <p className="text-[10px] text-center text-surface-a40 font-mono">
                      Encrypted PayPal payment verification • Instant Single-Use Ticket Generation
                    </p>
                  </div>
                )}

                {checkoutStep === 'processing_payment' && (
                  <div className="py-4 bg-info-a0/20 text-info-a0 border border-info-a0/40 rounded-2xl flex items-center justify-center space-x-2 font-mono text-xs font-bold animate-pulse">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verifying Payment Security & Issuing Video Call Ticket...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP B: COMPLETED TICKET CREDENTIAL DISPLAY */}
          {checkoutStep === 'completed' && issuedEntitlement && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-success-a0/10 border-2 border-success-a0/40 rounded-2xl p-6 text-center space-y-3">
                <div className="w-16 h-16 bg-success-a0/20 text-success-a0 border-2 border-success-a0 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-theme-light">Consultation Booking Confirmed!</h3>
                  <p className="text-xs text-surface-a40 font-mono mt-1">
                    Single-use opaque Video Call ticket generated successfully.
                  </p>
                </div>
              </div>

              {/* Confirmed Appointment Details */}
              <div className="bg-surface-a0 border border-surface-a10 rounded-2xl p-5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-surface-a10">
                  <span className="text-surface-a40">Confirmed Date & Time:</span>
                  <span className="font-bold text-info-a0">{selectedDate} @ {selectedTimeSlot} ({clientTimezone})</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1">
                  <div className="bg-tonal-a0 p-2 rounded-lg border border-surface-a10">
                    <span className="text-surface-a50 block text-[9px] uppercase">DURATION</span>
                    <span className="text-info-a0 font-bold text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 inline" />
                      <span>{issuedEntitlement.durationMinutes || selectedDurationMinutes} min</span>
                    </span>
                  </div>
                  <div className="bg-tonal-a0 p-2 rounded-lg border border-surface-a10">
                    <span className="text-surface-a50 block text-[9px] uppercase">PASS TYPE</span>
                    <span className="text-emerald-400 font-bold text-xs block mt-0.5 truncate">
                      {issuedEntitlement.isTrial ? 'Single-Use Free Pass' : 'Single-Use Pass'}
                    </span>
                  </div>
                  <div className="bg-tonal-a0 p-2 rounded-lg border border-surface-a10">
                    <span className="text-surface-a50 block text-[9px] uppercase">EXPIRES</span>
                    <span className="text-theme-light text-xs block mt-0.5 truncate" title={new Date(issuedEntitlement.expiresAt).toLocaleString()}>
                      {new Date(issuedEntitlement.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-surface-a10 text-xs">
                  <span className="text-surface-a40">Ticket Token:</span>
                  <span className="font-bold text-theme-light truncate max-w-xs">{issuedEntitlement.token}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-surface-a40 pt-1">
                  <span>Session Access:</span>
                  <span className="text-success-a0 font-bold">Encrypted & Guaranteed (Direct Video Call Bridge)</span>
                </div>
              </div>

              {/* Video Call Action Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRedeemFaceTime}
                  className="w-full py-4 bg-info-a0 hover:bg-info-a10 text-primary-a0 font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 font-mono"
                >
                  <Video className="w-5 h-5" />
                  <span>LAUNCH VIDEO CALL SESSION NOW</span>
                </button>

                {redemptionResult?.redeemed && (
                  <div className="p-4 bg-success-a0/20 border border-success-a0/40 rounded-2xl text-center space-y-2">
                    <span className="text-xs font-mono text-success-a0 font-bold block">
                      Video Call Connection Authorized!
                    </span>
                    {redemptionResult.facetimeHandle && (
                      <a
                        href={redemptionResult.facetimeHandle.startsWith('http') ? redemptionResult.facetimeHandle : `facetime:${redemptionResult.facetimeHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-2 text-xs font-mono text-info-a0 underline font-bold"
                      >
                        <span>Open Video Call: {redemptionResult.facetimeHandle}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="w-full py-3 bg-surface-a0 hover:bg-surface-a10 border border-surface-a20 text-theme-light rounded-2xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-info-a0" />
                  <span>VIEW / DOWNLOAD PDF RECEIPT</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCheckoutStep('idle');
                    setCurrentOrder(null);
                    setIssuedEntitlement(null);
                  }}
                  className="w-full py-2.5 text-xs font-mono text-surface-a40 hover:text-theme-light underline"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FREQUENTLY ASKED QUESTIONS SECTION */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-theme-light">
            Frequently Asked Questions
          </h3>
          <p className="text-xs text-surface-a40 font-mono">
            Everything you need to know about GateKeeper 1-on-1 consultations
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-tonal-a0 border border-surface-a10 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-sm text-theme-light flex items-center justify-between space-x-2"
                >
                  <span className="flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 text-info-a0 flex-shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-surface-a40" /> : <ChevronDown className="w-4 h-4 text-surface-a40" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-surface-a40 leading-relaxed border-t border-surface-a10/60 font-mono">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* RECEIPT GENERATOR MODAL */}
      {showReceiptModal && currentOrder && (
        <ReceiptGenerator
          receipt={{
            orderId: currentOrder.id,
            serviceTitle: selectedService?.title || 'Video Call Advisory Consultation',
            amountCents: currentOrder.amountCents,
            clientName: clientName,
            clientEmail: clientEmail,
            bookingDate: selectedDate,
            bookingTimeSlot: selectedTimeSlot,
            clientTimezone: clientTimezone,
            createdAt: currentOrder.createdAt || new Date().toISOString(),
            token: issuedEntitlement?.token,
            passcode: issuedEntitlement?.passcode,
            paymentMethod: 'PayPal Express (Verified)',
          }}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
