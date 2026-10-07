import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmailNotification } from '../../types';
import { StudioSendSmsModal } from './StudioSendSmsModal';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Calendar,
  MapPin,
  AlertTriangle,
  ExternalLink,
  Trash2,
  X,
  FileText,
  ShieldCheck,
  Check,
  Smartphone,
  Info,
  HelpCircle,
  Radio,
  Zap,
  Sparkles,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

export const StudioNotificationsCenter: React.FC = () => {
  const {
    activeStudio,
    notifications,
    markNotificationRead,
    clearNotifications,
    setActivePatientToken,
    setCurrentRole,
  } = useApp();

  const [selectedNotification, setSelectedNotification] = useState<EmailNotification | null>(null);
  const [filterChannel, setFilterChannel] = useState<'all' | 'email' | 'sms'>('all');

  // Live Test states
  const [testEmailAddress, setTestEmailAddress] = useState('diegoraimondi7@gmail.com');
  const [isSendingEmailTest, setIsSendingEmailTest] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);

  const [testPhoneNumber, setTestPhoneNumber] = useState(activeStudio?.phone || '');
  const [selectedSenderId, setSelectedSenderId] = useState<'PRISMAL' | 'STUDIO' | 'VIRTUAL'>('PRISMAL');
  const [isSendingSmsTest, setIsSendingSmsTest] = useState(false);
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);
  const [remindersFeedback, setRemindersFeedback] = useState<string | null>(null);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);

  const handleTriggerReminders = async () => {
    setIsTriggeringReminders(true);
    setRemindersFeedback(null);
    try {
      const res = await fetch('/api/reminders/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setRemindersFeedback(`✓ Controllo completato: ${data.totalAppointments} appuntamenti analizzati. Notifiche 24h e 1h elaborate.`);
      } else {
        setRemindersFeedback('Impossibile eseguire il controllo promemoria.');
      }
    } catch {
      setRemindersFeedback('Errore di rete durante la verifica dei promemoria.');
    } finally {
      setIsTriggeringReminders(false);
    }
  };
  const [smsTestResult, setSmsTestResult] = useState<{
    success: boolean;
    senderId: string;
    phone: string;
    message: string;
    timestamp?: string;
    realDispatch?: boolean;
    provider?: string;
  } | null>(null);

  if (!activeStudio) return null;

  const studioNotifications = notifications.filter(n => n.studioId === activeStudio.id);

  const openPreview = (notif: EmailNotification) => {
    markNotificationRead(notif.id);
    setSelectedNotification(notif);
  };

  const openPatientManagementPortal = (token?: string) => {
    if (!token) return;
    setActivePatientToken(token);
    setCurrentRole('patient');
  };

  // Run live email test via SMTP server
  const handleSendLiveEmailTest = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setEmailTestResult({
        success: false,
        message: 'Inserisci un indirizzo email valido per eseguire il test.',
      });
      return;
    }
    setIsSendingEmailTest(true);
    setEmailTestResult(null);

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmailAddress }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailTestResult({
          success: true,
          message: `Email di test spedita con successo a ${testEmailAddress} dal server SMTP. Controlla la casella di posta (e la cartella Spam)!`,
          timestamp: new Date().toLocaleTimeString('it-IT'),
        });
      } else {
        setEmailTestResult({
          success: false,
          message: data.error || 'Invio fallito dal server di posta.',
        });
      }
    } catch {
      setEmailTestResult({
        success: false,
        message: 'Errore di connessione con il servizio email.',
      });
    } finally {
      setIsSendingEmailTest(false);
    }
  };

  // Run live SMS test via AGCOM SMS gateway
  const handleSendLiveSmsTest = async () => {
    if (!testPhoneNumber) {
      setSmsTestResult({
        success: false,
        senderId: 'PRISMAL',
        phone: '',
        message: 'Inserisci un numero di cellulare per eseguire il test SMS.',
      });
      return;
    }
    setIsSendingSmsTest(true);
    setSmsTestResult(null);

    const effectiveSender = selectedSenderId === 'PRISMAL'
      ? 'PRISMAL'
      : (selectedSenderId === 'STUDIO' ? (activeStudio.name.substring(0, 11).toUpperCase()) : '+39 342 8901234');

    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhoneNumber,
          senderId: effectiveSender,
          studioName: activeStudio.name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmsTestResult({
          success: true,
          senderId: data.senderId,
          phone: data.recipient,
          message: data.message,
          timestamp: new Date().toLocaleTimeString('it-IT'),
          realDispatch: data.realDispatch,
          provider: data.provider,
        });
      } else {
        setSmsTestResult({
          success: false,
          senderId: effectiveSender,
          phone: testPhoneNumber,
          message: data.error || 'Errore durante l\'invio del test SMS',
        });
      }
    } catch {
      setSmsTestResult({
        success: false,
        senderId: effectiveSender,
        phone: testPhoneNumber,
        message: 'Errore di connessione con il gateway SMS.',
      });
    } finally {
      setIsSendingSmsTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. SEZIONE CANALI ATTIVI: EMAIL & SMS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Canali di Notifica dello Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Conferme automatiche e promemoria pre-visita inviati ai pazienti dello studio.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 min-w-[190px]">
              <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Mittente SMS
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                PRISMAL
              </div>
              <span className="text-[11px] text-slate-400 block">
                Alias Alfanumerico Certificato
              </span>
            </div>

            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 min-w-[190px]">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Server Email
              </span>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[180px]">
                prismaldental@gmail.com
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                SMTP Operativo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATED PRE-VISIT REMINDERS ENGINE (24h & 1h) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Promemoria Pre-Visita Automatici (24h e 1h)
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Scheduler Attivo" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inviati automaticamente via email per azzerare i no-show dei pazienti.
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerReminders}
            disabled={isTriggeringReminders}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringReminders ? 'animate-spin' : ''}`} />
            <span>{isTriggeringReminders ? 'Verifica...' : 'Verifica Ora'}</span>
          </button>
        </div>

        {remindersFeedback && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 rounded-xl text-xs font-medium">
            {remindersFeedback}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <span>⏰ 24 Ore Prima</span>
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Email con orario preciso, mappa stradale e link per confermare o disdire in tempo utile.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>🔔 1 Ora Prima</span>
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Avviso immediato con orario d'arrivo per garantire la massima puntualità in poltrona.
            </p>
          </div>
        </div>
      </div>

      {/* 2. STRUMENTI DI DIAGNOSTICA LIVE: TEST INVIO SMS ED EMAIL IN TEMPO REALE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Test Email Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Invia Email di Test Reale (SMTP)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifica immediata del recapito sulla tua casella di posta</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Indirizzo Email di Destinazione
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={e => setTestEmailAddress(e.target.value)}
                  placeholder="es. diegoraimondi7@gmail.com"
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  disabled={isSendingEmailTest}
                  onClick={handleSendLiveEmailTest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingEmailTest ? 'animate-spin' : ''}`} />
                  {isSendingEmailTest ? 'Invio...' : 'Invia Test'}
                </button>
              </div>
            </div>

            {emailTestResult && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                emailTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
              }`}>
                {emailTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">{emailTestResult.message}</span>
                  {emailTestResult.timestamp && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block mt-0.5">
                      Orario spedizione: {emailTestResult.timestamp} • Controlla anche la cartella SPAM.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Test SMS Card & Phone Mockup */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Invia SMS di Test sul Tuo Cellulare</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Visualizza il mittente esatto e il corpo dell'SMS</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Numero di Telefono
                </label>
                <input
                  type="text"
                  value={testPhoneNumber}
                  onChange={e => setTestPhoneNumber(e.target.value)}
                  placeholder="+39 340 1234567"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mittente Desiderato (Sender ID)
                </label>
                <select
                  value={selectedSenderId}
                  onChange={e => setSelectedSenderId(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="PRISMAL">Alias AGCOM: PRISMAL (Predefinito)</option>
                  <option value="STUDIO">Nome Studio: {activeStudio.name.substring(0, 11).toUpperCase()}</option>
                  <option value="VIRTUAL">Numero Virtuale con risposta (+39 342...)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isSendingSmsTest}
              onClick={handleSendLiveSmsTest}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingSmsTest ? 'animate-spin' : ''}`} />
              {isSendingSmsTest ? 'Spedizione SMS in corso...' : 'Invia Test SMS Diagnostico'}
            </button>

            {smsTestResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 animate-in fade-in ${
                smsTestResult.success
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className={`flex items-center gap-1 ${
                    smsTestResult.success ? 'text-purple-800 dark:text-purple-300' : 'text-rose-800 dark:text-rose-300'
                  }`}>
                    {smsTestResult.success ? (
                      smsTestResult.realDispatch ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>SMS Spedito su Rete GSM Reale ({smsTestResult.provider || 'Twilio'})</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>Simulazione Gateway AGCOM Conclusa (Pronto per Twilio / Skebby)</span>
                        </>
                      )
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Invio Fallito</span>
                      </>
                    )}
                  </span>
                  {smsTestResult.timestamp && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">{smsTestResult.timestamp}</span>
                  )}
                </div>

                {/* Smartphone message bubble preview */}
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-200 dark:border-purple-800 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 border-b border-slate-100 dark:border-slate-700 pb-1">
                    <span>Da: <strong className="text-slate-800 dark:text-white font-mono font-bold">{smsTestResult.senderId}</strong></span>
                    <span>A: <strong className="text-slate-800 dark:text-white font-mono">{smsTestResult.phone}</strong></span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
                    {smsTestResult.message}
                  </p>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal pt-1">
                  {smsTestResult.realDispatch ? (
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      ✓ Il messaggio è stato inoltrato alla rete telefonica tramite il gateway configurato. Controlla la ricezione sulla tua SIM.
                    </span>
                  ) : (
                    <>ℹ️ <strong>Gateway in modalità collaudo:</strong> Convalida della lunghezza dei caratteri, instradamento verso il registro comunicazioni e mittente autorizzato. Per la ricezione materiale su SIM fisica reale (es. {smsTestResult.phone}), è sufficiente impostare le credenziali API Twilio o Skebby nelle variabili d'ambiente.</>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. REGISTRO COMUNICAZIONI RECENTI (Email & SMS) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4" />
              Storico Trasmissioni
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Registro Comunicazioni Automatiche Inviate
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ogni prenotazione invia in automatico la conferma con link di gestione al paziente e l'alert alla segreteria dello studio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSmsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Nuovo SMS a Paziente</span>
            </button>
            {studioNotifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Svuota Registro
              </button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <div className="mt-6">
          {studioNotifications.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Mail className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nessuna notifica registrata finora</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Le notifiche compariranno qui in tempo reale quando i pazienti prenotano sul minisito.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {studioNotifications.map(notif => {
                const isPatientEmail = notif.recipientType === 'patient';
                const isUrgent = notif.appointmentDetails?.isUrgent;

                return (
                  <div
                    key={notif.id}
                    onClick={() => openPreview(notif)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isUrgent
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : isPatientEmail
                            ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        {isUrgent ? <AlertTriangle className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPatientEmail
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            }`}
                          >
                            {isPatientEmail ? '✉️ Email a Paziente' : '🔔 Alert a Studio'}
                          </span>

                          {isUrgent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                              URGENZA CLINICA
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {new Date(notif.sentAt).toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{notif.subject}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Destinatario: <strong className="text-slate-700 dark:text-slate-200">{notif.recipientEmail}</strong> ({notif.recipientName})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Inviata
                      </span>
                      <button
                        type="button"
                        className="text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-200 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800 transition"
                      >
                        Apri Dettaglio
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Email Preview Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up text-slate-900 dark:text-white">
            {/* Modal header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Anteprima Email di Sistema PRISMAL
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Inviata da <strong>prismaldental@gmail.com</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Meta Card */}
            <div className="p-5 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Da:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">PRISMAL Dental Platform &lt;prismaldental@gmail.com&gt;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">A:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedNotification.recipientName} &lt;{selectedNotification.recipientEmail}&gt;
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Oggetto:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedNotification.subject}</span>
              </div>
            </div>

            {/* Rendered Email Body Simulation */}
            <div className="p-6">
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-slate-850 shadow-xs max-w-lg mx-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-4 mb-4">
                  <span className="font-black text-sky-600 dark:text-sky-400 text-base">PRISMAL</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Notifica di Servizio</span>
                </div>

                <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                  <p>Gentile <strong>{selectedNotification.appointmentDetails.patientName}</strong>,</p>
                  <p>
                    la tua richiesta di prenotazione presso <strong>{selectedNotification.appointmentDetails.studioName}</strong> è stata registrata con successo.
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Codice Visita:</span>
                      <strong className="text-sky-700 dark:text-sky-400 font-mono">#{selectedNotification.appointmentDetails.code}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Data e Ora:</span>
                      <strong>{selectedNotification.appointmentDetails.date} alle ore {selectedNotification.appointmentDetails.timeSlot}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Motivo:</span>
                      <strong>{selectedNotification.appointmentDetails.visitReasonName}</strong>
                    </div>
                    {selectedNotification.appointmentDetails.studioAddress && selectedNotification.appointmentDetails.studioAddress.trim() && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-slate-400">Indirizzo:</span>
                        <div className="text-right">
                          <span className="text-slate-800 dark:text-slate-200 font-medium block">{selectedNotification.appointmentDetails.studioAddress}</span>
                          <a
                            href={selectedNotification.appointmentDetails.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([selectedNotification.appointmentDetails.studioName, selectedNotification.appointmentDetails.studioAddress].join(', '))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline mt-0.5"
                          >
                            <MapPin className="w-3 h-3" />
                            Apri su Google Maps
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedNotification.managementToken && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNotification(null);
                          openPatientManagementPortal(selectedNotification.managementToken);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Apri Link Gestione Paziente
                      </button>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                        Questo link permette al paziente di verificare lo stato, richiedere spostamenti o disdire in autonomia.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                Chiudi Anteprima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct SMS Modal */}
      {isSmsModalOpen && (
        <StudioSendSmsModal
          isOpen={isSmsModalOpen}
          onClose={() => setIsSmsModalOpen(false)}
          studioName={activeStudio?.name}
        />
      )}
    </div>
  );
};
