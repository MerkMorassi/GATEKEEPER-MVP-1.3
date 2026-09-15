import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Clock, X, AlertTriangle, Eye, Lock } from 'lucide-react';
import { EscrowSession } from '../types';
import { apiFetch } from '../lib/api';

interface EscrowModalProps {
  orderId: string;
  onClose: () => void;
  onSessionCreated: (session: EscrowSession) => void;
}

export const EscrowModal: React.FC<EscrowModalProps> = ({ orderId, onClose, onSessionCreated }) => {
  const [ticketCode, setTicketCode] = useState('');
  const [operator, setOperator] = useState('agent_merk_operator');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/api/admin/escrow/break-glass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketCode,
          operator,
          reason,
          orderId,
        }),
      });

      const data = await res.json();
      if (data.success && data.escrowSession) {
        onSessionCreated(data.escrowSession);
      } else {
        setError(data.error || 'Identity Escrow Break-Glass failed.');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-primary-a0/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-a0 border border-surface-a10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-surface-a40 hover:text-theme-light transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 pb-4 border-b border-surface-a10">
          <div className="w-10 h-10 bg-warning-a0/10 border border-warning-a0/20 rounded-xl flex items-center justify-center text-warning-a0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-theme-light">Break-Glass Identity Escrow</h2>
            <p className="text-xs text-surface-a40 font-mono">Order ID: {orderId}</p>
          </div>
        </div>

        <div className="my-4 p-3.5 bg-warning-a0/10 border border-warning-a0/20 rounded-xl text-xs text-warning-a10 leading-relaxed flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-warning-a0 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-warning-a0">Strict Audit Protocol</span>
            Accessing identity escrow breaks double-blind isolation for dispute resolution. Every access is recorded in the permanent audit trail with operator ID and ticket code. Session auto-expires in 15 minutes.
          </div>
        </div>

        {error && (
          <div className="bg-danger-a0/10 border border-danger-a0/20 p-3 rounded-xl text-xs text-danger-a0 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="text-theme-light block mb-1">Support Ticket Code *</label>
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              required
              placeholder="e.g. TICKET-DISPUTE-9902"
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-theme-light focus:outline-none focus:border-warning-a0"
            />
          </div>

          <div>
            <label className="text-theme-light block mb-1">Authorized Operator ID *</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              required
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-theme-light focus:outline-none focus:border-warning-a0"
            />
          </div>

          <div>
            <label className="text-theme-light block mb-1">Dispute / Reason Summary *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Provide explicit justification for breaking identity escrow..."
              className="w-full bg-tonal-a0 border border-surface-a10 rounded-xl px-3.5 py-2.5 text-theme-light focus:outline-none focus:border-warning-a0"
            />
          </div>

          <div className="pt-3 border-t border-surface-a10 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-surface-a40 hover:text-theme-light font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-warning-a0 hover:bg-warning-a10 text-primary-a0 font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Authorize Break-Glass Escrow</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
