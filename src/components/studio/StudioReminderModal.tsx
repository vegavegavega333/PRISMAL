import React, { useState, useEffect } from 'react';
import { Appointment } from '../../types';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export interface StudioReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  patientEmail?: string;
  patientPhone?: string;
  patientName?: string;
  studioName?: string;
}

// Clean duplicate words often produced by voice typing or prepositions
function cleanMessageDeduplication(text: string): string {
  return text
    .replace(/\bdello\s+dello\b/gi, 'dello')
    .replace(/\bdi\s+di\b/gi, 'di')
    .replace(/\blo\s+lo\b/gi, 'lo')
    .replace(/\bdel\s+del\b/gi, 'del')
    .replace(/\bin\s+in\b/gi, 'in');
}

export const StudioReminderModal: React.FC<StudioReminderModalProps> = ({
  isOpen,
  onClose,
  appointment,
  patientEmail: propEmail,
  patientPhone: propPhone,
  patientName: propName,
  studioName = 'Studio Dentistico',
}) => {
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'sms'>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const targetName =
    propName ||
    (appointment ? `${appointment.patientFirstName} ${appointment.patientLastName}`.trim() : 'Paziente');
  const targetEmail = propEmail || appointment?.patientEmail || '';
  const targetPhone = propPhone || appointment?.patientPhone || '';

  useEffect(() => {
    if (isOpen) {
      setRecipientEmail(targetEmail);
      setRecipientPhone(targetPhone);
      setSendSuccess(null);
      setSendError(null);
      setCopied(false);

      const dateStr = appointment?.date || 'prossima data';
      const timeStr = appointment?.timeSlot || 'orario concordato';
      const chairStr = appointment?.chairName || 'Poltrona Clinica';
      const deptStr = appointment?.department || 'Reparto Odontoiatrico';
      const durationStr = appointment?.durationMinutes ? `${appointment.durationMinutes} min` : '90 min';
      const reasonStr = appointment?.visitReasonName || 'Visita Odontoiatrica';

      setEmailSubject(cleanMessageDeduplication(`Promemoria Appuntamento: ${studioName} - ${dateStr}`));

      const baseText = cleanMessageDeduplication(
        `Gentile ${targetName}, Le ricordiamo la Sua visita presso ${studioName}.\n\n` +
        `📅 Data: ${dateStr}\n` +
        `⏰ Orario: ${timeStr} (Durata prevista: ${durationStr})\n` +
        `💺 Poltrona: ${chairStr} • Reparto: ${deptStr}\n` +
        `🏥 Trattamento: ${reasonStr}\n\n` +
        `Si raccomanda di arrivare con 5 minuti di anticipo. Per qualsiasi esigenza o necessità di spostamento può contattare la segreteria.\n\n` +
        `Cordiali saluti,\n${studioName}`
      );

      setMessageBody(baseText);
    }
  }, [isOpen, appointment, targetName, targetEmail, targetPhone, studioName]);

  if (!isOpen) return null;

  // Clean phone number for WhatsApp
  const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('39')
    ? cleanPhone
    : cleanPhone.startsWith('0')
    ? `39${cleanPhone.slice(1)}`
    : `39${cleanPhone}`;

  const whatsappDirectUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(messageBody)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      if (channel === 'email') {
        if (!recipientEmail.trim()) {
          setSendError('Inserisci l\'indirizzo email del paziente per recapitare il promemoria.');
          setIsSending(false);
          return;
        }

        const res = await fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: recipientEmail.trim(),
            subject: emailSubject,
            messageText: messageBody,
            patientName: targetName,
            appointmentId: appointment?.id,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setSendSuccess(`Promemoria inviato con successo via Email a ${recipientEmail}!`);
        } else {
          setSendError(data.error || 'Errore durante l\'invio dell\'email');
        }
      } else if (channel === 'whatsapp') {
        // Log to backend WhatsApp webhook
        await fetch('/api/notifications/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: finalPhone,
            messageText: messageBody,
            patientName: targetName,
            appointmentId: appointment?.id,
            studioName,
          }),
        }).catch(() => null);

        // Open WhatsApp web or app
        window.open(whatsappDirectUrl, '_blank', 'noopener,noreferrer');
        setSendSuccess(`Promemoria aperto in WhatsApp per il numero +${finalPhone}!`);
      } else if (channel === 'sms') {
        const res = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientPhone.trim(),
            message: messageBody,
            senderId: 'PRISMAL',
            patientName: targetName,
            appointmentId: appointment?.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSendSuccess(`SMS inviato con successo al numero ${recipientPhone}!`);
        } else {
          setSendError(data.error || 'Errore durante l\'invio SMS via Twilio');
        }
      }
    } catch (err: any) {
      setSendError(err.message || 'Si è verificato un errore di comunicazione');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Invia Reminder al Paziente
              </h3>
              <p className="text-xs text-slate-400">
                Promemoria automatico via Email, WhatsApp o SMS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Segmented Control */}
        <div className="p-4 pb-0 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setChannel('email');
                setSendSuccess(null);
                setSendError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                channel === 'email'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span>Email</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-md font-semibold">
                Consigliata
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setChannel('whatsapp');
                setSendSuccess(null);
                setSendError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                channel === 'whatsapp'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setChannel('sms');
                setSendSuccess(null);
                setSendError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                channel === 'sms'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-rose-600" />
              <span>SMS</span>
            </button>
          </div>
        </div>

        {/* Success or Error Banners */}
        {sendSuccess && (
          <div className="m-4 mb-0 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{sendSuccess}</span>
          </div>
        )}

        {sendError && (
          <div className="m-4 mb-0 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSendReminder} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Channel Recipient Field */}
          {channel === 'email' ? (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>Email Destinatario Paziente *</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Paziente: <strong className="text-slate-800">{targetName}</strong>
                </span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="es. paziente@email.it"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>Numero di Cellulare Destinatario *</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Paziente: <strong className="text-slate-800">{targetName}</strong>
                </span>
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  placeholder="es. 347 123 4567"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Email Subject if Email channel */}
          {channel === 'email' && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Oggetto Email
              </label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Testo del Promemoria
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiato!' : 'Copia Testo'}</span>
              </button>
            </div>
            <textarea
              rows={6}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-sans leading-relaxed"
            />
          </div>

          {/* Context Banner */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span>Riepilogo Visita:</span>
              <span className="font-mono text-purple-700">
                {appointment?.date} alle {appointment?.timeSlot}
              </span>
            </div>
            <p>
              Poltrona: <strong>{appointment?.chairName || 'Standard'}</strong> • Reparto: <strong>{appointment?.department || 'Conservativa'}</strong>
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Annulla
            </button>

            {channel === 'whatsapp' ? (
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Apri WhatsApp con Messaggio</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Invio in corso...' : channel === 'email' ? 'Invia Email di Promemoria' : 'Invia SMS Twilio'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
