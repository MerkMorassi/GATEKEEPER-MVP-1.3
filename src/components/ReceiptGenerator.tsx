import React, { useRef, useState, useEffect } from 'react';
import { Download, Printer, CheckCircle2, Shield, Copy, Check, X, FileText, Calendar, Clock, User, Mail, DollarSign, QrCode, Sparkles, Key } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface ReceiptData {
  orderId: string;
  serviceTitle: string;
  amountCents: number;
  clientName?: string;
  clientEmail?: string;
  bookingDate?: string;
  bookingTimeSlot?: string;
  clientTimezone?: string;
  createdAt: string;
  token?: string;
  passcode?: string;
  qrDataUrl?: string;
  paymentMethod?: string;
  transactionHash?: string;
}

export interface ReceiptGeneratorProps {
  receipt?: ReceiptData;
  order?: any;
  settlement?: any;
  onClose?: () => void;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({ receipt, order, settlement, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Normalize data from either receipt or order/settlement prop
  const activeReceipt: ReceiptData = React.useMemo(() => {
    if (receipt) {
      return receipt;
    }
    if (order) {
      return {
        orderId: order.id || 'N/A',
        serviceTitle: order.serviceTitle || order.serviceId || 'Video Call Advisory Consultation',
        amountCents: order.amountCents ?? (order.feeCents ?? (settlement?.grossAmountCents ?? 0)),
        clientName: order.clientName || order.customerName || 'Verified Client',
        clientEmail: order.clientEmail || order.customerEmail,
        bookingDate: order.bookingDate || order.scheduledDate,
        bookingTimeSlot: order.bookingTimeSlot || order.timeSlot,
        clientTimezone: order.clientTimezone || 'UTC',
        createdAt: order.createdAt || settlement?.timestamp || new Date().toISOString(),
        token: order.entitlementToken || order.token || `gk_pass_${order.id}`,
        passcode: order.passcode || order.accessCode,
        paymentMethod: order.paymentMethod || 'PayPal Express (Verified)',
        transactionHash: order.transactionHash || order.stripePaymentIntentId,
      };
    }
    return {
      orderId: 'GK-RECEIPT',
      serviceTitle: 'Video Call Advisory Consultation',
      amountCents: 0,
      createdAt: new Date().toISOString(),
      token: 'GK-TOKEN-TICKET',
    };
  }, [receipt, order, settlement]);

  const tokenValue = activeReceipt.token || `gk_pass_${activeReceipt.orderId}`;
  const formattedAmount = (activeReceipt.amountCents / 100).toFixed(2);
  const formattedDate = new Date(activeReceipt.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Generate QR Code data URL whenever active receipt or token changes
  useEffect(() => {
    let isMounted = true;
    const generateQR = async () => {
      try {
        if (activeReceipt.qrDataUrl) {
          if (isMounted) setQrCodeUrl(activeReceipt.qrDataUrl);
          return;
        }
        // Construct standard GateKeeper opaque single-use ticket payload
        const payload = tokenValue.startsWith('http')
          ? tokenValue
          : `https://gatekeeper.internal/#access=${tokenValue}`;
        
        const url = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 320,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });
        if (isMounted) {
          setQrCodeUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate receipt ticket QR code:', err);
      }
    };

    generateQR();
    return () => {
      isMounted = false;
    };
  }, [activeReceipt.qrDataUrl, tokenValue]);

  // Programmatic PDF Generation via jsPDF with embedded QR Code Ticket
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // Ensure we have the QR Code data URL
      let qrImgData = qrCodeUrl || activeReceipt.qrDataUrl;
      if (!qrImgData) {
        const payload = tokenValue.startsWith('http')
          ? tokenValue
          : `https://gatekeeper.internal/#access=${tokenValue}`;
        qrImgData = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 320,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Background accent header banner
      doc.setFillColor(15, 23, 42); // dark slate (#0f172a)
      doc.rect(0, 0, 210, 36, 'F');

      // Title & Branding
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('GATEKEEPER SECURITY ENGINE', 15, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('OFFICIAL PAYMENT RECEIPT & SINGLE-USE QR ACCESS TICKET', 15, 25);
      doc.text(`ISSUED: ${new Date(activeReceipt.createdAt).toISOString().replace('T', ' ').substring(0, 19)} UTC`, 15, 30);

      // Status Pill on top right
      doc.setFillColor(34, 197, 94); // success green (#22c55e)
      doc.roundedRect(148, 12, 47, 9, 2.5, 2.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PAID & VERIFIED', 155, 18);

      // Section: Transaction Details
      let y = 46;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. TRANSACTION & SERVICE DETAILS', 15, y);

      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.line(15, y + 2.5, 195, y + 2.5);

      y += 9;
      const addRow = (label: string, value: string, isHighlight = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label, 15, y);

        doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        if (isHighlight) {
          doc.setTextColor(2, 132, 199); // info blue
        } else {
          doc.setTextColor(15, 23, 42);
        }
        doc.text(value, 75, y);
        y += 6.5;
      };

      addRow('Booking / Order ID:', activeReceipt.orderId, true);
      addRow('Service Title:', activeReceipt.serviceTitle);
      addRow('Total Amount Paid:', `$${formattedAmount} USD`, true);
      addRow('Payment Status:', 'COMPLETED (Single-Use Entitlement Minted)');
      addRow('Payment Method:', activeReceipt.paymentMethod || 'PayPal Express (Encrypted & Verified)');
      addRow('Timestamp:', formattedDate);

      if (activeReceipt.clientName) addRow('Client Name:', activeReceipt.clientName);
      if (activeReceipt.clientEmail) addRow('Client Email:', activeReceipt.clientEmail);
      if (activeReceipt.bookingDate) addRow('Scheduled Date:', activeReceipt.bookingDate);
      if (activeReceipt.bookingTimeSlot) {
        addRow('Scheduled Time Slot:', `${activeReceipt.bookingTimeSlot} (${activeReceipt.clientTimezone || 'UTC'})`);
      }

      // Section: Single-Use QR Code Ticket / Token Pass
      y += 5;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('2. SINGLE-USE QR CODE TICKET & TOKEN PASS', 15, y);
      doc.line(15, y + 2.5, 195, y + 2.5);

      y += 7;

      // Outer Ticket Card container box
      const ticketBoxHeight = 62;
      doc.setFillColor(248, 250, 252); // light slate (#f8fafc)
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(15, y, 180, ticketBoxHeight, 3.5, 3.5, 'FD');

      // Decorative top accent border for ticket
      doc.setFillColor(2, 132, 199); // blue
      doc.roundedRect(15, y, 180, 2, 1, 1, 'F');

      // Embed QR Code inside ticket box
      const qrSize = 44;
      const qrX = 22;
      const qrY = y + 8;
      
      // QR Code white frame & shadow box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'FD');

      if (qrImgData) {
        doc.addImage(qrImgData, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Ticket Credentials & Token Details on the right of QR Code
      const credX = 76;
      let credY = y + 10;

      // Badge: Single Use Pass
      doc.setFillColor(220, 252, 231); // emerald-100
      doc.setDrawColor(134, 239, 172); // emerald-300
      doc.roundedRect(credX, credY, 44, 5.5, 1.5, 1.5, 'FD');
      doc.setTextColor(21, 128, 61); // emerald-700
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('SINGLE-USE ADMISSION PASS', credX + 3.5, credY + 3.8);

      credY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TICKET ACCESS TOKEN:', credX, credY);

      credY += 4.5;
      // Monospace Token Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(credX, credY, 112, 7.5, 1.5, 1.5, 'FD');
      doc.setTextColor(15, 23, 42);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      // Truncate cleanly if too long for PDF width
      const displayToken = tokenValue.length > 46 ? `${tokenValue.substring(0, 43)}...` : tokenValue;
      doc.text(displayToken, credX + 3, credY + 5);

      if (activeReceipt.passcode) {
        credY += 11;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('ENCRYPTED PASSCODE:', credX, credY);
        doc.setTextColor(2, 132, 199);
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        doc.text(activeReceipt.passcode, credX + 36, credY);
      }

      credY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('• Scan QR code or enter token string to initiate secure video call.', credX, credY);
      credY += 4;
      doc.text('• Valid for 1 admission at scheduled time. Cryptographically verified & voided.', credX, credY);

      // Section: Security & Disclaimer Box
      y += ticketBoxHeight + 8;
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 28, 2.5, 2.5, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('DOUBLE-BLIND VIDEO CALL CONSULTATION PROTOCOL', 20, y + 6.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('1. Both parties maintain full privacy without exposing private phone numbers or accounts prior to check-in.', 20, y + 12);
      doc.text('2. All transactions are securely routed through GateKeeper Escrow and Settlement verification engine.', 20, y + 17);
      doc.text('3. If you encounter any connection issues, present your Booking Order ID to GateKeeper Support.', 20, y + 22);

      // Footer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('GateKeeper © 2026 Merk Morassi, LLC • End-to-End Cryptographic Appointment & Access System', 105, 287, { align: 'center' });

      // Save PDF
      doc.save(`GateKeeper_Receipt_${activeReceipt.orderId}.pdf`);
    } catch (err) {
      console.error('Error generating PDF receipt:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDetails = () => {
    const text = `
========================================
GATEKEEPER OFFICIAL PAYMENT RECEIPT
========================================
Booking ID: ${activeReceipt.orderId}
Service: ${activeReceipt.serviceTitle}
Amount Paid: $${formattedAmount} USD
Status: COMPLETED & VERIFIED
Timestamp: ${formattedDate}
${activeReceipt.clientName ? `Client: ${activeReceipt.clientName}\n` : ''}${activeReceipt.clientEmail ? `Email: ${activeReceipt.clientEmail}\n` : ''}${activeReceipt.bookingDate ? `Scheduled Date: ${activeReceipt.bookingDate}\n` : ''}${activeReceipt.bookingTimeSlot ? `Time Slot: ${activeReceipt.bookingTimeSlot} (${activeReceipt.clientTimezone || 'UTC'})\n` : ''}
--- SINGLE-USE TICKET CREDENTIALS ---
Access Token: ${tokenValue}
${activeReceipt.passcode ? `Passcode: ${activeReceipt.passcode}\n` : ''}Pass Type: Single-Use Admission Pass
========================================
GateKeeper Security Engine © 2026 Merk Morassi, LLC
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface-a0 border border-surface-a10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Modal Header */}
        <div className="bg-tonal-a0 border-b border-surface-a10 p-6 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-success-a0/10 text-success-a0 rounded-xl border border-success-a0/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-theme-light">Official Payment Receipt & Ticket</h2>
              <p className="text-xs text-surface-a40 font-mono">Booking ID: #{activeReceipt.orderId}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-surface-a40 hover:text-theme-light rounded-xl bg-surface-a10 hover:bg-surface-a20 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Printable Area */}
        <div ref={printableRef} className="p-6 sm:p-8 space-y-6 print:p-8 print:bg-white print:text-black">
          {/* Receipt Header Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-surface-a10 gap-4">
            <div>
              <div className="flex items-center space-x-2 text-info-a0 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" />
                <span>GATEKEEPER SECURITY ENGINE</span>
              </div>
              <h1 className="text-2xl font-black text-theme-light">PAYMENT RECEIPT & PASS</h1>
              <p className="text-xs text-surface-a40 font-mono mt-0.5">{formattedDate}</p>
            </div>
            <div className="px-3 py-1.5 bg-success-a0/20 border border-success-a0/30 text-success-a0 rounded-full font-mono text-xs font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>PAID & VERIFIED</span>
            </div>
          </div>

          {/* Service & Price Summary Card */}
          <div className="bg-tonal-a0/60 border border-surface-a10 rounded-2xl p-5 space-y-3 print:border-gray-300 print:bg-gray-50">
            <div className="text-[10px] font-mono text-surface-a40 uppercase tracking-wider">Service Purchased</div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-theme-light">{activeReceipt.serviceTitle}</h3>
              <div className="text-2xl font-black text-info-a0 font-mono">
                ${formattedAmount} <span className="text-xs font-normal text-surface-a40">USD</span>
              </div>
            </div>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-xl space-y-1 print:border-gray-300">
              <div className="text-[10px] text-surface-a40 uppercase">Booking / Order ID</div>
              <div className="font-bold text-theme-light truncate">{activeReceipt.orderId}</div>
            </div>

            <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-xl space-y-1 print:border-gray-300">
              <div className="text-[10px] text-surface-a40 uppercase">Payment Method</div>
              <div className="font-bold text-theme-light">{activeReceipt.paymentMethod || 'PayPal Express (Encrypted)'}</div>
            </div>

            {activeReceipt.clientName && (
              <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-xl space-y-1 print:border-gray-300">
                <div className="text-[10px] text-surface-a40 uppercase">Client Name</div>
                <div className="font-bold text-theme-light truncate">{activeReceipt.clientName}</div>
              </div>
            )}

            {activeReceipt.clientEmail && (
              <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-xl space-y-1 print:border-gray-300">
                <div className="text-[10px] text-surface-a40 uppercase">Client Email</div>
                <div className="font-bold text-theme-light truncate">{activeReceipt.clientEmail}</div>
              </div>
            )}

            {activeReceipt.bookingDate && (
              <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-xl space-y-1 print:border-gray-300">
                <div className="text-[10px] text-surface-a40 uppercase">Scheduled Date</div>
                <div className="font-bold text-info-a0">{activeReceipt.bookingDate}</div>
              </div>
            )}

            {activeReceipt.bookingTimeSlot && (
              <div className="bg-surface-a0 border border-surface-a10 p-4 rounded-xl space-y-1 print:border-gray-300">
                <div className="text-[10px] text-surface-a40 uppercase">Video Call Time Slot</div>
                <div className="font-bold text-info-a0">{activeReceipt.bookingTimeSlot} ({activeReceipt.clientTimezone || 'UTC'})</div>
              </div>
            )}
          </div>

          {/* Single-Use QR Code Ticket / Token Pass Container */}
          <div className="bg-gradient-to-br from-tonal-a0 via-surface-a0 to-tonal-a0 border-2 border-info-a0/40 rounded-2xl p-5 space-y-4 shadow-lg print:border-gray-400 print:bg-white">
            <div className="flex items-center justify-between border-b border-surface-a10 pb-3">
              <div className="text-xs font-mono font-bold text-info-a0 uppercase tracking-wider flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-info-a0" />
                <span>Single-Use QR Code Ticket & Access Token</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Single-Use Pass</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
              {qrCodeUrl ? (
                <div className="bg-white p-2.5 rounded-2xl shadow-xl border border-surface-a10 flex-shrink-0">
                  <img src={qrCodeUrl} alt="Single-Use Ticket QR Code" className="w-28 h-28 sm:w-32 sm:h-32 object-contain" />
                </div>
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 bg-tonal-a0 border border-surface-a10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-8 h-8 text-surface-a40 animate-pulse" />
                </div>
              )}

              <div className="flex-1 space-y-2 font-mono text-xs w-full">
                <div>
                  <div className="text-[10px] text-surface-a40 uppercase flex items-center gap-1 font-bold">
                    <Key className="w-3 h-3 text-info-a0" />
                    <span>Single-Use Access Token</span>
                  </div>
                  <div className="font-bold text-theme-light bg-surface-a0 border border-surface-a10 px-3 py-2 rounded-xl truncate break-all select-all font-mono mt-1 text-xs text-info-a0">
                    {tokenValue}
                  </div>
                </div>

                {activeReceipt.passcode && (
                  <div>
                    <div className="text-[10px] text-surface-a40 uppercase font-bold">Encrypted Passcode</div>
                    <div className="font-bold text-theme-light bg-surface-a0 border border-surface-a10 px-3 py-1.5 rounded-lg font-mono mt-1">
                      {activeReceipt.passcode}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-surface-a40 leading-relaxed pt-1">
                  Present or scan this single-use QR ticket credential at the scheduled time to trigger direct connection. Cryptographically verified and voided upon admission.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center font-mono text-[10px] text-surface-a40 pt-2 border-t border-surface-a10">
            GateKeeper © 2026 Merk Morassi, LLC • Confidentially Encrypted Video Call Advisory System
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="bg-tonal-a0 border-t border-surface-a10 p-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            onClick={handleCopyDetails}
            className="py-2.5 px-4 bg-surface-a10 hover:bg-surface-a20 text-theme-light rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2"
          >
            {copied ? <Check className="w-4 h-4 text-success-a0" /> : <Copy className="w-4 h-4 text-surface-a40" />}
            <span>{copied ? 'Copied Receipt Text!' : 'Copy Receipt Text'}</span>
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none py-2.5 px-4 bg-surface-a10 hover:bg-surface-a20 text-theme-light rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none py-2.5 px-5 bg-info-a0 hover:bg-info-a10 text-primary-a0 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-info-a0/20 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Receipt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

