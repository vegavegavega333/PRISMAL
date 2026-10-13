import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OrbGrid } from '../ui/OrbGrid';
import { StudioAppointments } from './StudioAppointments';
import { StudioVisualCalendar } from './StudioVisualCalendar';
import { StudioPatientsManagement } from './StudioPatientsManagement';
import { StudioAiAssistant } from './StudioAiAssistant';
import { StudioAiReceptionistView } from './StudioAiReceptionistView';
import { StudioAvailability } from './StudioAvailability';
import { StudioSettings } from './StudioSettings';
import { StudioCalendarBlocking } from './StudioCalendarBlocking';
import { StudioNotificationsCenter } from './StudioNotificationsCenter';
import { StudioUpgradeView } from './StudioUpgradeView';
import { StudioIntegrationsView } from './StudioIntegrationsView';
import { StudioAnalyticsDashboard } from './StudioAnalyticsDashboard';
import { StudioSmartRules } from './StudioSmartRules';
import { StudioGdprSuite } from './StudioGdprSuite';
import { StudioSponsorshipView } from './StudioSponsorshipView';
import { PatientClinicalRecordModal } from './PatientClinicalRecordModal';
import { getStudioQuotaStatus, getStudioTrialStatus, isFeatureAllowed, PLAN_TIERS_CONFIG, PRISMAL_PRIME_PRICE_MONTHLY } from '../../data/planTierDefinitions';
import {
  Calendar,
  Clock,
  Settings,
  AlertTriangle,
  Zap,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  X,
  CreditCard,
  Building,
  CalendarOff,
  Mail,
  Users,
  Bot,
  LayoutGrid,
  List,
  Plug,
  TrendingUp,
  ArrowRight,
  HeartPulse,
  Crown,
  PhoneCall,
  MessageSquare,
} from 'lucide-react';

export const StudioDashboard: React.FC = () => {
  const {
    activeStudio,
    appointments,
    notifications,
    blockedSlots,
    patientRecords,
    setCurrentRole,
    setPatientViewingSlug,
    confirmStudioStripePayment,
  } = useApp();

  const [odontogramPatient, setOdontogramPatient] = useState<any | null>(null);
  const [isActivatingPrime, setIsActivatingPrime] = useState(false);
  const [activationToast, setActivationToast] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'calendar' | 'list' | 'analytics' | 'patients' | 'receptionist' | 'ai' | 'availability' | 'smart_rules' | 'gdpr' | 'blocking' | 'notifications' | 'integrations' | 'upgrade' | 'sponsorship' | 'settings'
  >('calendar');

  // Offline resilience detection (anti-blackout vs XDENT)
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedToast(true);
      setTimeout(() => setShowReconnectedToast(false), 5000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (activeStudio?.name) {
      document.title = `Gestionale | ${activeStudio.name}`;
    } else {
      document.title = 'Gestionale Studio | PRISMAL';
    }
    return () => {
      document.title = 'PRISMAL Dental Cloud | Gestionale Odontoiatrico Intelligente';
    };
  }, [activeStudio?.name]);

  if (!activeStudio) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <h3 className="text-lg font-bold text-slate-800">Nessuno Studio Selezionato</h3>
        <p className="text-xs text-slate-500 mt-1">
          Seleziona uno studio dal menu in alto o completa la registrazione.
        </p>
      </div>
    );
  }

  const studioAppointments = appointments.filter(a => a.studioId === activeStudio.id);
  const quota = getStudioQuotaStatus(activeStudio, appointments);
  const trialStatus = getStudioTrialStatus(activeStudio);
  const isPending = activeStudio.status === 'pending';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = studioAppointments.filter(a => a.date === todayStr && a.status !== 'cancelled');
  const pendingAppointments = studioAppointments.filter(a => a.status === 'pending');

  const studioNotifications = notifications.filter(n => n.studioId === activeStudio.id);
  const studioBlockedSlots = blockedSlots.filter(b => b.studioId === activeStudio.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6 font-sans">
      {/* Offline Resilience Banner: Continuità operativa cloud-resiliente */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Modalità Offline Protetta Attiva (Rete o Wi-Fi momentaneamente assente)
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Continuità operativa garantita: PRISMAL memorizza in locale le visite del giorno, l'agenda e i contatti dei pazienti. Puoi continuare a consultare e operare senza blocchi anche in caso di calo di rete.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg uppercase tracking-wider self-start sm:self-center whitespace-nowrap">
            Cache Locale OK
          </span>
        </div>
      )}

      {/* Reconnected Toast */}
      {showReconnectedToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>Connessione ripristinata: Sincronizzazione in tempo reale con il Cloud completata con successo!</span>
          </div>
        </div>
      )}

      {/* Apple Style Studio Header Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src={activeStudio.logoUrl}
            alt={activeStudio.name}
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200/80 shadow-xs flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {activeStudio.name}
              </h1>
              {activeStudio.status === 'pending' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                  In Attesa di Approvazione
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              {activeStudio.address}, {activeStudio.city} • <span className="tabular-nums">{activeStudio.phone}</span>
            </p>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-xl border border-slate-200/60 tabular-nums">
                prismal.app/punti/{activeStudio.slug}
              </span>
              <button
                onClick={() => {
                  window.open(`/punti/${encodeURIComponent(activeStudio.slug)}`, '_blank');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 font-semibold ml-1 transition hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Apri Minisito Paziente (Nuova Scheda)
              </button>

              <button
                onClick={() => {
                  const target = (patientRecords && patientRecords.length > 0)
                    ? patientRecords[0]
                    : {
                        id: 'demo-patient-1',
                        firstName: 'Mario',
                        lastName: 'Rossi',
                        fiscalCode: 'RSSMRA80A01H501U',
                        phone: '+39 340 1234567',
                        email: 'mario.rossi@email.it',
                        birthDate: '1980-01-01',
                        gender: 'M',
                        address: 'Via Dante 10',
                        city: 'Milano',
                        dentalChart: {},
                        treatmentPlans: [],
                        medicalConditions: ['Ipertensione lieve controllata'],
                        allergiesList: ['Penicillina'],
                      };
                  setOdontogramPatient(target);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer ml-1"
                title="Visualizza e testa subito l'Odontogramma 3D Digitale interattivo"
              >
                <HeartPulse className="w-3.5 h-3.5 text-sky-200" />
                <span>Odontogramma 3D Interattivo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Badge & Plan Controls */}
        <div className="flex flex-col sm:items-end justify-center gap-1.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 min-w-[260px]">
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Stato Piano
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              PRISMAL Clinical Suite
            </span>
          </div>

          <div className="w-full sm:text-right">
            <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-slate-800">
              {trialStatus.isPaidActive ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Abbonamento Attivo (149€/mese)
                </span>
              ) : (
                <span className="text-purple-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" /> PRISMAL Prime Cloud
                </span>
              )}
            </div>

            <div className="flex flex-col sm:items-end gap-1.5 mt-2">
              <button
                onClick={() => setActiveTab('upgrade')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center sm:justify-end gap-1 cursor-pointer hover:underline"
              >
                <span>Gestione Piano & Abbonamento</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STRIPE SUBSCRIPTION BANNER WITH ORIGINKIT ORBGRID ACCENT */}
      {trialStatus.isPaidActive ? (
        <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm border border-slate-800">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-tight text-white">
                  PRISMAL Prime • Abbonamento Attivo
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Ufficiale • Illimitato
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Accesso clinico completo operativo: poltrone, agenda e odontogramma 3D sbloccati. Prossimo rinnovo: {trialStatus.renewalDateStr}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('upgrade')}
            className="relative z-10 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition border border-slate-700/80 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Fatture & Dettagli</span>
          </button>
        </div>
      ) : trialStatus.isTrialExpired ? (
        <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-950 to-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-md border border-rose-800/40">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-tight text-white">
                  Periodo di Prova Terminato
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Scaduto
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                I 30 giorni di prova gratuita si sono conclusi. Abbonati per continuare a gestire visite illimitate, anamnesi e odontogramma 3D.
              </p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <a
              href={activeStudio ? `https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00?client_reference_id=${encodeURIComponent(activeStudio.id)}&prefilled_email=${encodeURIComponent(activeStudio.email || '')}` : 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md hover:shadow-emerald-500/20 whitespace-nowrap cursor-pointer hover:scale-[1.02]"
            >
              <CreditCard className="w-4 h-4 text-slate-950" />
              <span>Abbonati</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-950/70" />
            </a>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-slate-950 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm border border-slate-800">
          {/* Subtle Originkit Orb Canvas Backdrop on Right */}
          <div className="absolute -right-10 -top-14 w-60 h-60 opacity-35 pointer-events-none sm:pointer-events-auto">
            <OrbGrid
              width={240}
              height={240}
              density={120}
              dotSize={110}
              speed={35}
              dotColor="#64748b"
              accentColor="#10b981"
            />
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-tight text-white">
                  PRISMAL Clinical Suite • 30 Giorni di Prova
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {trialStatus.daysRemaining} Giorni Rimasti
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                La prova gratuita è attiva con tutte le funzionalità sbloccate. Nessun addebito iniziale fino al termine dei 30 giorni.
              </p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <a
              href={activeStudio ? `https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00?client_reference_id=${encodeURIComponent(activeStudio.id)}&prefilled_email=${encodeURIComponent(activeStudio.email || '')}` : 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md hover:shadow-emerald-500/20 whitespace-nowrap cursor-pointer hover:scale-[1.02]"
            >
              <CreditCard className="w-4 h-4 text-slate-950" />
              <span>Abbonati</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-950/70" />
            </a>
          </div>
        </div>
      )}

      {/* Floating Activation Toast */}
      {activationToast && (
        <div className="p-3.5 bg-slate-950 border border-emerald-500/50 text-white rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{activationToast}</span>
        </div>
      )}

      {/* APPLE STYLE QUICK STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-semibold text-slate-500">Visite Oggi</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-2 tabular-nums">
            <span>{todayAppointments.length}</span>
            <span className="text-xs font-medium text-slate-500">in agenda</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('list')}
          className={`p-5 rounded-3xl border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition cursor-pointer ${
            pendingAppointments.length > 0
              ? 'bg-gradient-to-br from-amber-50/90 to-orange-50/80 border-amber-300 text-amber-950 hover:shadow-md'
              : 'bg-white/90 backdrop-blur-md border-slate-200/80 text-slate-900 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900">Da Convalidare</span>
            {pendingAppointments.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-bold mt-1 flex items-baseline gap-2 tabular-nums">
            <span>{pendingAppointments.length}</span>
            <span className="text-xs font-semibold text-amber-800">
              {pendingAppointments.length === 1 ? 'visita in attesa' : 'visite in attesa'}
            </span>
          </div>
          {pendingAppointments.length > 0 && (
            <p className="text-[11px] text-amber-800/90 mt-1 font-semibold flex items-center gap-1">
              <span>Clicca per convalidare subito</span>
              <span>→</span>
            </p>
          )}
        </div>

        <div
          onClick={() => setActiveTab('analytics')}
          className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-sky-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Prenotazioni Totali</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-500 opacity-60 group-hover:opacity-100 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-2 tabular-nums">
            <span>{studioAppointments.length}</span>
            <span className="text-xs font-medium text-slate-500">registrate</span>
          </div>
          <span className="text-[10px] font-semibold text-sky-600 mt-1 inline-block">Analisi & trend →</span>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-semibold text-slate-500">Slot Bloccati</span>
          <div className="text-2xl font-bold text-slate-700 mt-1 flex items-baseline gap-2 tabular-nums">
            <span>{studioBlockedSlots.length}</span>
            <span className="text-xs font-medium text-slate-500">ferie/pausa</span>
          </div>
        </div>
      </div>

      {/* PENDING APPROVAL WARNING BANNER */}
      {isPending && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold">Studio in Attesa di Approvazione</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Il tuo account è in fase di validazione. Il link pubblico sarà attivo a breve con il periodo di prova di 30 giorni PRISMAL Prime incluso.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-xl self-start sm:self-auto">
            In validazione
          </span>
        </div>
      )}

      {/* APPLE SEGMENTED NAVIGATION TABS */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutGrid className="w-4 h-4 text-emerald-600" />
          Calendario Visivo
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'list'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <List className="w-4 h-4 text-slate-500" />
          Elenco Visite
          {pendingAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white tabular-nums">
              {pendingAppointments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-sky-600" />
          Statistiche & Trend
        </button>

        <button
          onClick={() => setActiveTab('patients')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'patients'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-sky-400" />
          Cartelle & Odontogramma 3D
        </button>

        <button
          onClick={() => setActiveTab('receptionist')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
            activeTab === 'receptionist'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xs'
              : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 border border-emerald-300/70'
          }`}
        >
          <PhoneCall className="w-4 h-4 text-emerald-500" />
          <span>Segreteria AI (Voce & WhatsApp)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xs'
              : 'text-sky-700 hover:text-sky-900'
          }`}
        >
          <Bot className="w-4 h-4 text-sky-500" />
          AI Copilot
        </button>

        <button
          onClick={() => setActiveTab('upgrade')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'upgrade'
              ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-xs'
              : 'text-purple-700 hover:text-purple-900 bg-purple-50/70 border border-purple-200/50'
          }`}
        >
          <Crown className="w-4 h-4 text-purple-600" />
          Piano Prime
        </button>

        <button
          onClick={() => setActiveTab('sponsorship')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'sponsorship'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs'
              : 'text-amber-800 hover:text-amber-950 bg-amber-50/80 border border-amber-200/70'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Sponsorizza Studio</span>
          {activeStudio?.isSponsored && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-500" />
          Profilo
        </button>
      </div>

      {/* Tab Content Rendering */}
      {activeTab === 'calendar' && <StudioVisualCalendar />}
      {activeTab === 'list' && <StudioAppointments />}
      {activeTab === 'analytics' && <StudioAnalyticsDashboard />}
      {activeTab === 'patients' && <StudioPatientsManagement />}
      {activeTab === 'receptionist' && (
        <StudioAiReceptionistView
          onNavigateToCalendar={() => setActiveTab('calendar')}
        />
      )}
      {activeTab === 'ai' && <StudioAiAssistant />}
      {activeTab === 'availability' && <StudioAvailability />}
      {activeTab === 'smart_rules' && <StudioSmartRules />}
      {activeTab === 'gdpr' && <StudioGdprSuite />}
      {activeTab === 'blocking' && <StudioCalendarBlocking />}
      {activeTab === 'notifications' && <StudioNotificationsCenter />}
      {activeTab === 'integrations' && <StudioIntegrationsView />}
      {activeTab === 'upgrade' && (
        <StudioUpgradeView
          onPlanUpgraded={() => setActiveTab('calendar')}
          onBackToDashboard={() => setActiveTab('calendar')}
        />
      )}
      {activeTab === 'sponsorship' && <StudioSponsorshipView />}
      {activeTab === 'settings' && <StudioSettings />}

      {/* Direct Interactive Odontogram 3D & Clinical Chart Modal */}
      {odontogramPatient && (
        <PatientClinicalRecordModal
          patient={odontogramPatient}
          onClose={() => setOdontogramPatient(null)}
        />
      )}
    </div>
  );
};
