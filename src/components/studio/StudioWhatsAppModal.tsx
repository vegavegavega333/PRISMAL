import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  ExternalLink,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { Appointment } from '../../types';

interface StudioWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  patientPhone?: string;
  patientEmail?: string;
  patientName?: string;
  studioName?: string;
  onSent?: (result: { channel: 'whatsapp' | 'email'; recipient: string; text: string }) => void;
}

function cleanMessageDeduplication(text: string): string {
  return text
    .replace(/\bdello\s+dello\b/gi, 'dello')
    .replace(/\bdi\s+di\b/gi, 'di')
    .replace(/\blo\s+lo\b/gi, 'lo')
    .replace(/\bdel\s+del\b/gi, 'del')
    .replace(/\bin\s+in\b/gi, 'in');
}

export const StudioWhatsAppModal: React.FC<StudioWhatsAppModalProps> = ({
  isOpen,
  onClose,
  appointment,
  patientPhone,
  patientEmail,
  patientName,
  studioName = 'Studio Odontoiatrico',
  onSent,
}) => {
  const targetPhone = appointment?.patientPhone || patientPhone || '';
  const targetEmail = appointment?.patientEmail || patientEmail || '';
  const targetPatientName = appointment
    ? `${appointment.patientFirstName} ${appointment.patientLastName}`
    : patientName || 'Paziente';

  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [recipientPhone, setRecipientPhone] = useState(targetPhone);
  const [recipientEmailState, setRecipientEmailState] = useState(targetEmail);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('chair_reminder');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-compose clinical message based on appointment and template
  useEffect(() => {
    setRecipientPhone(targetPhone);
    setRecipientEmailState(targetEmail);
    setSendSuccess(null);
    setSendError(null);

    const dateStr = appointment?.date || 'prossima data';
    const timeStr = appointment?.timeSlot || 'orario concordato';
    const chairStr = appointment?.chairName || 'Poltrona Assegnata';
    const deptStr = appointment?.department || 'Reparto Clinico';
    const durationStr = appointment?.durationMinutes ? `${appointment.durationMinutes} min` : '90 min';
    const reasonStr = appointment?.visitReasonName || 'Visita Odontoiatrica';

    switch (selectedTemplate) {
      case 'chair_reminder':
        setMessageText(
          cleanMessageDeduplication(
            `Gentile ${targetPatientName}, Le ricordiamo il Suo appuntamento presso ${studioName} per ${reasonStr}.\n\n📅 Data: ${dateStr}\n⏰ Orario: ${timeStr} (Durata prevista: ${durationStr})\n💺 ${chairStr} • ${deptStr}\n\nSi prega di arrivare con 5 minuti di anticipo. Per qualsiasi esigenza o necessità di spostamento può rispondere direttamente a questo messaggio WhatsApp.\n\nCordiali saluti,\nLa Segreteria • ${studioName}`
          )
        );
        break;

      case 'confirmation':
        setMessageText(
          cleanMessageDeduplication(
            `Gentile ${targetPatientName}, confermiamo con piacere la prenotazione della Sua seduta presso ${studioName}.\n\n📅 Data: ${dateStr}\n⏰ Ore: ${timeStr}\n🏥 Prestazione: ${reasonStr}\n\nRestiamo a Sua completa disposizione per qualsiasi informazione clinica.\n\n${studioName}`
          )
        );
        break;

      case 'post_op':
        setMessageText(
          cleanMessageDeduplication(
            `Gentile ${targetPatientName}, lo staff clinico di ${studioName} desidera accertarsi del Suo decorso dopo la seduta odierna.\n\nConsigli post-trattamento:\n- Evitare cibi o bevande eccessivamente calde per le prossime ore\n- Assumere la terapia prescritta dal medico curante secondo posologia\n- Per qualsiasi dolore persistente o dubbio, ci contatti immediatamente a questo numero.\n\nBuona guarigione,\n${studioName}`
          )
        );
        break;

      case 'reschedule_request':
        setMessageText(
          cleanMessageDeduplication(
            `Gentile ${targetPatientName}, La contattiamo da ${studioName} in merito al Suo appuntamento del ${dateStr} ore ${timeStr}. Ci scusiamo per l'inconveniente, avremmo necessità di rimodulare l'orario della poltrona. Può comunicarci le Sue prossime disponibilità rispondendo qui? Grazie per la collaborazione.`
          )
        );
        break;

      default:
        setMessageText(
          cleanMessageDeduplication(
            `Gentile ${targetPatientName}, Le ricordiamo la Sua visita presso ${studioName} prevista per ${dateStr} alle ${timeStr}.`
          )
        );
    }
  }, [isOpen, appointment, targetPhone, targetEmail, targetPatientName, studioName, selectedTemplate]);

  if (!isOpen) return null;

  // Clean international phone number for WhatsApp
  const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('39')
    ? cleanPhone
    : cleanPhone.startsWith('0')
    ? `39${cleanPhone.slice(1)}`
    : `39${cleanPhone}`;

  const whatsappDirectUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(messageText)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendDispatch = async () => {
    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      if (activeChannel === 'whatsapp') {
        // Log/Send via backend WhatsApp webhook or Cloud API
        const res = await fetch('/api/notifications/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: finalPhone,
            messageText,
            patientName: targetPatientName,
            appointmentId: appointment?.id,
            studioName,
          }),
        }).catch(() => null);

        // Open WhatsApp web or app directly for the user
        window.open(whatsappDirectUrl, '_blank', 'noopener,noreferrer');

        setSendSuccess('Messaggio WhatsApp aperto e pronto all\'invio!');
        if (onSent) {
          onSent({ channel: 'whatsapp', recipient: finalPhone, text: messageText });
        }
      } else {
        // Send email reminder
        if (!recipientEmailState.includes('@')) {
          throw new Error('Inserisci un indirizzo email valido');
        }

        await fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: recipientEmailState,
            subject: `Promemoria Appuntamento • ${studioName}`,
            messageText,
            patientName: targetPatientName,
            appointmentId: appointment?.id,
          }),
        }).catch(() => null);

        setSendSuccess(`Email di promemoria inviata con successo a ${recipientEmailState}!`);
        if (onSent) {
          onSent({ channel: 'email', recipient: recipientEmailState, text: messageText });
        }
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setSendError(err?.message || 'Errore durante l\'invio');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              {/* WhatsApp SVG Icon */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-white">Promemoria Paziente</h3>
              <p className="text-xs text-slate-400">
                Invia notifica WhatsApp o Email per la seduta clinica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Selector Tab */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveChannel('whatsapp')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeChannel === 'whatsapp'
                ? 'border-emerald-500 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>WhatsApp (Cloud API / Link Diretto)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('email')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeChannel === 'email'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Reminder</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {sendSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{sendSuccess}</span>
            </div>
          )}

          {sendError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Paziente Destinatario
              </label>
              <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-900 border border-slate-200">
                {targetPatientName}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {activeChannel === 'whatsapp' ? 'Numero WhatsApp *' : 'Indirizzo Email *'}
              </label>
              {activeChannel === 'whatsapp' ? (
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  placeholder="+39 347 ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              ) : (
                <input
                  type="email"
                  value={recipientEmailState}
                  onChange={e => setRecipientEmailState(e.target.value)}
                  placeholder="paziente@email.it"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Modello di Messaggio Clinico Preimpostato
            </label>
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="chair_reminder">💺 Promemoria Seduta in Poltrona (Data, Ora, Reparto & Durata)</option>
              <option value="confirmation">✅ Conferma Prenotazione Visita</option>
              <option value="post_op">🩺 Istruzioni e Monitoraggio Post-Intervento</option>
              <option value="reschedule_request">🔄 Richiesta Rimodulazione Orario Poltrona</option>
            </select>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Testo del Messaggio
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiato!' : 'Copia Testo'}</span>
              </button>
            </div>
            <textarea
              rows={6}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            Annulla
          </button>

          <div className="flex items-center gap-2">
            {activeChannel === 'whatsapp' && (
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 border border-slate-300 cursor-pointer"
              >
                <span>Apri WhatsApp Web</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}

            <button
              type="button"
              onClick={handleSendDispatch}
              disabled={isSending || (activeChannel === 'whatsapp' && !recipientPhone)}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 ${
                activeChannel === 'whatsapp'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-purple-600 hover:bg-purple-500'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSending
                  ? 'Invio in corso...'
                  : activeChannel === 'whatsapp'
                  ? 'Invia su WhatsApp'
                  : 'Invia Email Reminder'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
