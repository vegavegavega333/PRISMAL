import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Appointment } from '../../types';

interface StudioSendSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  patientPhone?: string;
  patientName?: string;
  studioName?: string;
  onSmsSent?: (result: { messageId?: string; recipient: string; text: string }) => void;
}

export const StudioSendSmsModal: React.FC<StudioSendSmsModalProps> = ({
  isOpen,
  onClose,
  appointment,
  patientPhone,
  patientName,
  studioName = 'Studio Odontoiatrico',
  onSmsSent,
}) => {
  const targetPhone = appointment?.patientPhone || patientPhone || '';
  const targetPatientName = appointment
    ? `${appointment.patientFirstName} ${appointment.patientLastName}`
    : patientName || 'Paziente';

  const [recipient, setRecipient] = useState(targetPhone);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('reminder');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<any>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Auto-generate template text when appointment or template changes
  useEffect(() => {
    setRecipient(targetPhone);
    setSendSuccess(null);
    setSendError(null);

    const dateStr = appointment?.date || 'prossima data';
    const timeStr = appointment?.timeSlot || 'orario concordato';
    const reasonStr = appointment?.visitReasonName || 'Visita';

    switch (selectedTemplate) {
      case 'reminder':
        setMessageText(
          `PRISMAL: Gentile ${targetPatientName}, le ricordiamo la visita (${reasonStr}) presso ${studioName} il ${dateStr} alle ore ${timeStr}. Per info o variazioni contatti lo studio.`
        );
        break;
      case 'confirmation_request':
        setMessageText(
          `PRISMAL: Gentile ${targetPatientName}, la preghiamo di confermare la sua presenza alla visita del ${dateStr} ore ${timeStr} presso ${studioName}. Risponda a questo SMS per confermare.`
        );
        break;
      case 'emergency':
        setMessageText(
          `PRISMAL: Gentile ${targetPatientName}, la sua richiesta di urgenza è stata registrata presso ${studioName}. La aspettiamo il ${dateStr} alle ore ${timeStr}.`
        );
        break;
      case 'post_visit':
        setMessageText(
          `PRISMAL: Gentile ${targetPatientName}, grazie per la visita presso ${studioName}. Per qualsiasi necessità post-trattamento o dubbio rimaniamo a sua completa disposizione.`
        );
        break;
      case 'custom':
        if (!messageText) {
          setMessageText(`PRISMAL: Gentile ${targetPatientName}, `);
        }
        break;
      default:
        break;
    }
  }, [isOpen, selectedTemplate, appointment, targetPhone, targetPatientName, studioName]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !messageText.trim()) return;

    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.trim(),
          message: messageText.trim(),
          senderId: 'PRISMAL',
          patientName: targetPatientName,
          appointmentId: appointment?.id,
          studioId: appointment?.studioId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccess(data);
        if (onSmsSent) {
          onSmsSent({
            messageId: data.messageId,
            recipient: recipient.trim(),
            text: messageText.trim(),
          });
        }
      } else {
        setSendError(data.error || 'Impossibile inviare SMS tramite Twilio');
      }
    } catch (err: any) {
      setSendError(err?.message || 'Errore di connessione al server SMS');
    } finally {
      setIsSending(false);
    }
  };

  const charCount = messageText.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Invia SMS Diretto al Paziente</h2>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Twilio SMS Gateway • Consegna Immediata su Rete GSM</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {sendSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">SMS Inviato con Successo!</h3>
              <p className="text-xs text-slate-600">
                Il messaggio è stato preso in carico dall'operatore Twilio per la consegna sul numero{' '}
                <strong className="text-slate-900">{recipient}</strong>.
              </p>
              {sendSuccess.messageId && (
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] font-mono text-emerald-800">
                  ID Twilio: {sendSuccess.messageId}
                </div>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSendSuccess(null);
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Chiudi Schermata
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Recipient Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Numero di Telefono Destinatario
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="es. 3471234567 o +393471234567"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Paziente: <strong className="text-slate-800">{targetPatientName}</strong> (prefisso +39 aggiunto automaticamente se omesso)
                </span>
              </div>

              {/* Template selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Seleziona Modello di Messaggio Rapido
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('reminder')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex flex-col justify-between ${
                      selectedTemplate === 'reminder'
                        ? 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-300'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span>📅 Promemoria</span>
                    <span className="text-[10px] font-normal text-slate-500 mt-1">Giorno prima</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('confirmation_request')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex flex-col justify-between ${
                      selectedTemplate === 'confirmation_request'
                        ? 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-300'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span>⏳ Conferma</span>
                    <span className="text-[10px] font-normal text-slate-500 mt-1">Richiesta presenza</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('emergency')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex flex-col justify-between ${
                      selectedTemplate === 'emergency'
                        ? 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-300'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span>🚨 Urgenza</span>
                    <span className="text-[10px] font-normal text-slate-500 mt-1">Presa in carico</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('custom')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex flex-col justify-between ${
                      selectedTemplate === 'custom'
                        ? 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-300'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <span>✍️ Libero</span>
                    <span className="text-[10px] font-normal text-slate-500 mt-1">Personalizzato</span>
                  </button>
                </div>
              </div>

              {/* Message text area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Testo del Messaggio SMS
                  </label>
                  <span className={`text-[11px] font-mono ${charCount > 160 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {charCount}/160 char • {smsSegments} {smsSegments === 1 ? 'SMS' : 'SMS'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    if (selectedTemplate !== 'custom') setSelectedTemplate('custom');
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Smartphone preview */}
              <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  <span>Anteprima Visiva sullo Schermo del Paziente:</span>
                </span>
                <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed shadow-sm">
                  {messageText || 'Scrivi il messaggio...'}
                </div>
              </div>

              {sendError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSending || !messageText.trim() || !recipient.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Invio in corso...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Invia SMS Subito via Twilio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
