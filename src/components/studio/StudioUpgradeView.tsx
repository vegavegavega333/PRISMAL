import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PRISMAL_PRIME_CONFIG,
  PRISMAL_PRIME_PRICE_MONTHLY,
  PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY,
  getStudioTrialStatus,
} from '../../data/planTierDefinitions';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Clock,
  Check,
  AlertTriangle,
  FileText,
  Calendar,
  MessageSquare,
  Phone,
  Zap,
  RefreshCw,
  X,
  Stethoscope,
  Smile,
  ShieldAlert,
  ArrowRight,
  Wallet,
  Globe,
  Building,
  ExternalLink,
} from 'lucide-react';

interface StudioUpgradeViewProps {
  onPlanUpgraded?: () => void;
  onBackToDashboard?: () => void;
}

export const StudioUpgradeView: React.FC<StudioUpgradeViewProps> = ({
  onPlanUpgraded,
  onBackToDashboard,
}) => {
  const {
    activeStudio,
    platformTransactions,
    cancelStudioSubscription,
    processStudioPayment,
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isTrialCheckout, setIsTrialCheckout] = useState(true);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  if (!activeStudio) return null;

  const trialStatus = getStudioTrialStatus(activeStudio);
  const studioTransactions = platformTransactions.filter(t => t.studioId === activeStudio.id);

  const [selectedInitialMethod, setSelectedInitialMethod] = useState<'stripe' | 'paypal' | 'bank_transfer'>('stripe');

  const handleStartTrial = (method: 'stripe' | 'paypal' | 'bank_transfer' = 'stripe') => {
    setSelectedInitialMethod(method);
    setIsTrialCheckout(true);
    setCheckoutModalOpen(true);
  };

  const handleUpgradeImmediate = (method: 'stripe' | 'paypal' | 'bank_transfer' = 'stripe') => {
    setSelectedInitialMethod(method);
    setIsTrialCheckout(false);
    setCheckoutModalOpen(true);
  };

  const handleConfirmCancel = () => {
    cancelStudioSubscription(activeStudio.id);
    setShowCancelModal(false);
    setCancelFeedback(
      trialStatus.isTrialing
        ? 'Il rinnovo automatico è stato annullato con successo. La prova di 30 giorni rimarrà attiva fino alla naturale scadenza senza alcun addebito futuro.'
        : 'L\'abbonamento a PRISMAL Prime è stato disdetto. Il servizio resterà regolarmente attivo fino alla data di scadenza della mensilità già saldata.'
    );
    setTimeout(() => setCancelFeedback(null), 6000);
  };

  const displayPrice = billingCycle === 'annual' ? PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY : PRISMAL_PRIME_PRICE_MONTHLY;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans animate-fade-in">
      {/* 1. TOP HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{PRISMAL_PRIME_CONFIG.name}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {trialStatus.isPaidActive
              ? 'Gestione Piano & Abbonamento Studio'
              : trialStatus.isTrialing
              ? 'Gestione Prova & Abbonamento PRISMAL Prime'
              : 'Attiva PRISMAL Prime con 30 Giorni di Prova'}
          </h1>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Un unico piano all-inclusive per il tuo studio: zero limiti di appuntamenti o poltrone, triage per pazienti, odontogramma 3D e sincronizzazione cloud.
          </p>

          <div className="pt-1.5">
            <a
              href="https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition hover:scale-[1.02] cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-100" />
              <span>Abbonati / Attiva Piano Ufficiale Stripe (€149/m)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>

        {/* Current status pill */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex-shrink-0 text-left md:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Stato Attuale Studio:
          </span>
          {trialStatus.isPaidActive ? (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>PRISMAL Prime Attivo (€{PRISMAL_PRIME_PRICE_MONTHLY}/m)</span>
              </span>
              <p className="text-[11px] font-semibold text-slate-600">
                Prossimo rinnovo: <strong>{trialStatus.renewalDateStr}</strong>
              </p>
            </div>
          ) : trialStatus.isTrialing ? (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>30 Giorni di Prova Attivi</span>
              </span>
              <p className="text-[11px] font-semibold text-slate-600">
                Mancano <strong>{trialStatus.daysRemaining} giorni</strong> gratuiti ({trialStatus.renewalDateStr})
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                <span>Nessuna Carta Connessa</span>
              </span>
              <p className="text-[11px] text-slate-500">
                Attiva i 30 giorni di prova con verifica a 0,00€
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {cancelFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-950 font-medium flex items-start gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{cancelFeedback}</span>
        </div>
      )}

      {/* 2. CASE A: TRIAL ATTIVO (Gestione Prova in corso) */}
      {trialStatus.isTrialing && (
        <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/50 rounded-3xl p-6 sm:p-7 border border-amber-200/90 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                  Giorno {Math.max(1, 30 - trialStatus.daysRemaining)} di 30
                </span>
                <span className="text-xs font-bold text-amber-900">
                  Ti rimangono {trialStatus.daysRemaining} giorni di prova a costo zero
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                La tua prova di 30 giorni è regolarmente in corso
              </h2>
              <p className="text-xs text-slate-600">
                Hai collegato la carta <strong>•••• {trialStatus.cardLast4 || '4242'}</strong> con verifica antifrode a 0,00€ (nessuna spesa effettuata).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleUpgradeImmediate}
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Attiva Subito PRISMAL Prime (€{PRISMAL_PRIME_PRICE_MONTHLY})</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-amber-200/80 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, ((30 - trialStatus.daysRemaining) / 30) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Inizio Prova (Verifica 0,00€)</span>
              <span>
                {trialStatus.cancelAtPeriodEnd
                  ? 'Rinnovo automatico disattivato (Scadenza senza addebito)'
                  : `Rinnovo automatico a soli €${PRISMAL_PRIME_PRICE_MONTHLY}/mese il ${trialStatus.renewalDateStr}`}
              </span>
            </div>
          </div>

          {/* Breakdown: cosa è già attivo ora a costo zero vs cosa si attiva al rinnovo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Attivo Ora nei 30 Giorni di Prova (Costo zero per lo studio e per noi)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Agenda cloud e prenotazioni pazienti illimitate</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Minisito e triage odontoiatrico guidato</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Odontogramma 3D e piani di trattamento con preventivi</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Sincronizzazione Outlook, Microsoft 365 e Google Calendar</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Regole Smart (sanificazione, slot urgenze, smart waitlist)</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>In Attivazione al Rinnovo (Servizi Twilio Telecomunicazioni & Carrier)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Conferme e promemoria con WhatsApp Business Ufficiale (Twilio Cloud)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Pacchetto 250 SMS AGCOM/mese con mittente alfanumerico certificato (o Twilio BYOK)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Centralino telefonico vocale con intelligenza artificiale H24 (Twilio Voice)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Assistenza prioritaria dedicata diretta con operatore</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-amber-200/80">
            <span className="text-[11px] text-slate-500">
              {trialStatus.cancelAtPeriodEnd
                ? 'Hai già disattivato il rinnovo automatico. La prova terminerà senza alcuna spesa.'
                : 'Puoi annullare il rinnovo in qualsiasi momento prima della scadenza con 1 click a zero spese.'}
            </span>
            {!trialStatus.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
              >
                Annulla Rinnovo Automatico della Prova
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. CASE B: ABBONAMENTO A PAGAMENTO ATTIVO (Gestione Piano) */}
      {trialStatus.isPaidActive && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>PRISMAL Prime Attivo</span>
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Tutte le funzionalità cliniche e di rete sono attive al 100%
              </h2>
              <p className="text-xs text-slate-500">
                Abbonamento ricorrente: <strong>€{displayPrice}/mese</strong> • Prossimo addebito automatico il <strong>{trialStatus.renewalDateStr}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-left sm:text-right flex-shrink-0">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Metodo di Pagamento:</span>
              <span className="text-xs font-mono font-bold text-slate-800 block mt-0.5">
                Carta •••• {trialStatus.cardLast4 || '4242'}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 sm:justify-end mt-1">
                <ShieldCheck className="w-3 h-3" />
                Rinnovo Protetto SSL
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Tutti i servizi sono sbloccati:</strong> numero WhatsApp Business verificato, 250 SMS AGCOM/mese inclusi e centralino AI H24 attivo.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              Disdici Abbonamento
            </button>
          </div>
        </div>
      )}

      {/* 4. CASE C: NON HA ANCORA IL METODO DI PAGAMENTO CONNESSO (Presentazione e attivazione 30gg gratis) */}
      {!trialStatus.isPaidActive && !trialStatus.isTrialing && (
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>30 Giorni di Prova Gratuita • Verifica a 0,00€</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Prova PRISMAL Prime gratis per 30 giorni nel tuo studio
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Collega il tuo account tramite <strong>Stripe Checkout</strong> (Carte di Credito, Apple Pay e Google Pay gestiti a norma bancaria da Stripe) o <strong>PayPal</strong> al conto aziendale PRISMAL Cloud per attivare la prova con un'autorizzazione temporanea di <strong>0,00€ (nessun addebito oggi)</strong>. Prova per un mese intero tutte le funzioni cliniche e cloud senza alcuna limitazione. Se decidi di proseguire, il canone è di soli <strong>€{PRISMAL_PRIME_PRICE_MONTHLY}/mese</strong> (o <strong>€{PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY}/mese</strong> con fatturazione annuale), disattivabile in qualsiasi momento in 1 click senza penali.
            </p>

            {/* Price pill */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-baseline gap-2 w-fit">
              <span className="text-3xl font-black text-amber-300 font-sans">€{PRISMAL_PRIME_PRICE_MONTHLY}</span>
              <span className="text-xs text-slate-300 font-medium">/mese dopo i 30 giorni di prova gratuita (€{PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY}/m annuale)</span>
            </div>

            {/* 3 Quick Connect Options: Stripe, PayPal, Bonifico */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Scegli come collegare la prova gratuita a 0,00€:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: Stripe Checkout */}
                <button
                  type="button"
                  onClick={() => handleStartTrial('stripe')}
                  className="p-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold transition shadow-lg flex flex-col justify-between cursor-pointer border border-white/20 group text-left"
                >
                  <div className="flex items-center justify-between w-full h-7">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="font-black text-sm tracking-tight text-slate-900">Stripe Checkout</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      PCI-DSS
                    </span>
                  </div>
                  <div className="mt-3">
                    <strong className="text-xs block font-bold text-slate-900 leading-tight">Carte, GPay & Apple Pay</strong>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Gateway bancario Stripe • 0,00€ oggi</span>
                  </div>
                </button>

                {/* Option 2: PayPal */}
                <button
                  type="button"
                  onClick={() => handleStartTrial('paypal')}
                  className="p-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-950 font-bold transition shadow-lg flex flex-col justify-between cursor-pointer border border-sky-300 group text-left"
                >
                  <div className="flex items-center justify-between w-full h-7">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#003087] text-white flex items-center justify-center">
                        <Globe className="w-4 h-4 text-sky-300" />
                      </div>
                      <span className="font-black text-sm tracking-tight text-[#003087]">PayPal</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-900">
                      Link Diretto
                    </span>
                  </div>
                  <div className="mt-3">
                    <strong className="text-xs block font-bold text-slate-900 leading-tight">Collega con PayPal</strong>
                    <span className="text-[11px] text-slate-500 block mt-0.5">prismaldental • 0,00€ oggi</span>
                  </div>
                </button>

                {/* Option 3: Bonifico Bancario */}
                <button
                  type="button"
                  onClick={() => handleStartTrial('bank_transfer')}
                  className="p-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-950 font-bold transition shadow-lg flex flex-col justify-between cursor-pointer border border-indigo-200 group text-left"
                >
                  <div className="flex items-center justify-between w-full h-7">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-800 text-white flex items-center justify-center">
                        <Building className="w-4 h-4 text-indigo-200" />
                      </div>
                      <span className="font-black text-sm tracking-tight text-indigo-950">Bonifico</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                      SEPA
                    </span>
                  </div>
                  <div className="mt-3">
                    <strong className="text-xs block font-bold text-slate-900 leading-tight">Bonifico Bancario</strong>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Accredito IBAN • Ricevuta immediata</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PANORAMICA COMPLETA DELLE FUNZIONALITÀ DI PRISMAL PRIME */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Tutte le Funzionalità Incluse in PRISMAL Prime
            </h3>
            <p className="text-xs text-slate-500">
              Un unico sistema integrato che copre l'intero flusso operativo, clinico e di comunicazione dello studio.
            </p>
          </div>

          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
            <span>€{PRISMAL_PRIME_PRICE_MONTHLY}/mese all-inclusive</span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Cloud & Clinica (A costo zero per noi nei 30gg) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Funzionalità Cloud & Gestionali (Subito Attive nei 30gg di Prova)</span>
            </div>

            <ul className="space-y-2 text-xs text-slate-600">
              {PRISMAL_PRIME_CONFIG.trialZeroCostFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2: Telecomunicazioni & Carrier (Piano a pagamento o rinnovo) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Integrazione Twilio & Canali Ufficiali (Attivati con PRISMAL Prime)</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Questi servizi comportano costi carrier e si attivano automaticamente con il piano a pagamento (€{PRISMAL_PRIME_PRICE_MONTHLY}/mese) o con attivazione immediata:
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 pt-1">
              {PRISMAL_PRIME_CONFIG.paidExclusiveFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2.5 bg-purple-50/70 rounded-xl border border-purple-100">
                  <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-slate-800">{feat}</span>
                </li>
              ))}
            </ul>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <strong>Flessibilità totale senza vincoli:</strong>
              <p>Nessun contratto pluriennale obbligatorio. Puoi disdire in qualsiasi istante con 1 click direttamente da questa schermata.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. STORICO TRANSAZIONI E RICEVUTE DELLO STUDIO */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          <span>Fatture & Ricevute Fiscali dello Studio</span>
        </h4>

        {studioTransactions.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            Nessuna transazione precedente registrata per questo studio.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {studioTransactions.map(tx => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">
                    {tx.type === 'trial_verification'
                      ? 'Verifica Carta 30 Giorni di Prova (0,00€)'
                      : tx.type === 'subscription_monthly'
                      ? `Abbonamento Mensile PRISMAL Prime (€${PRISMAL_PRIME_PRICE_MONTHLY})`
                      : tx.type === 'subscription_annual'
                      ? `Abbonamento Annuale PRISMAL Prime (€${PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY * 12})`
                      : tx.type === 'sponsorship'
                      ? 'Sponsorizzazione PRISMAL Search'
                      : 'Pacchetto SMS Extra'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {tx.invoiceNumber} • {new Date(tx.createdAt).toLocaleDateString('it-IT')} • {tx.paymentMethod}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900 font-mono">
                    €{tx.amountTotal.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {tx.status === 'completed' ? 'Confermato' : tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CHECKOUT (0€ VERIFICA O PRISMAL PRIME) */}
      {checkoutModalOpen && (
        <PaymentCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          targetPlanId="prismal_prime"
          isTrialVerification={isTrialCheckout}
          billingCycle={billingCycle}
          initialPaymentMethod={selectedInitialMethod}
          onPaymentSuccess={() => {
            setCheckoutModalOpen(false);
            if (onPlanUpgraded) onPlanUpgraded();
          }}
        />
      )}

      {/* MODAL CONFERMA DISDETTA */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {trialStatus.isTrialing ? 'Annullare il rinnovo della prova?' : 'Disdire l\'abbonamento a PRISMAL Prime?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {trialStatus.isTrialing
                  ? `Il rinnovo a €${PRISMAL_PRIME_PRICE_MONTHLY}/mese verrà bloccato. La tua carta non subirà alcun addebito. Potrai continuare a usufruire della prova a costo zero per i giorni restanti.`
                  : 'Il servizio rimarrà regolarmente attivo fino alla data di scadenza della mensilità in corso e non verrà rinnovato.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                Mantieni Attivo
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Conferma Disdetta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
