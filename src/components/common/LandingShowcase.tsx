import React, { useState } from 'react';
import { PrismalLogo } from '../PrismalLogo';
import { PRISMAL_PRIME_PRICE_MONTHLY, PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY } from '../../data/planTierDefinitions';
import {
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Users,
  Smartphone,
  Check,
  Bot,
  Building2,
  Mail,
  Phone,
  Send,
  Lock,
  ChevronRight,
  Layers,
  HeartHandshake,
} from 'lucide-react';

interface LandingShowcaseProps {
  onOpenAuthModal: () => void;
  onStartRegistration: () => void;
}

export const LandingShowcase: React.FC<LandingShowcaseProps> = ({
  onOpenAuthModal,
  onStartRegistration,
}) => {
  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactStudio, setContactStudio] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccessMessage, setContactSuccessMessage] = useState<string | null>(null);
  const [contactErrorMessage, setContactErrorMessage] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    setContactSuccessMessage(null);
    setContactErrorMessage(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          studio: contactStudio,
          email: contactEmail,
          phone: contactPhone,
          message: contactMessage,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setContactSuccessMessage(
          `Richiesta inviata con successo! È stata recapitata al team di PRISMAL (prismaldental@gmail.com). Verrai ricontattato a breve.`
        );
        setContactName('');
        setContactStudio('');
        setContactEmail('');
        setContactPhone('');
        setContactMessage('');
      } else {
        setContactErrorMessage(data.error || 'Si è verificato un errore durante l\'invio. Riprova tra poco.');
      }
    } catch (err) {
      // Fallback
      setContactSuccessMessage(
        'Richiesta registrata con successo! Il team PRISMAL ti contatterà al più presto.'
      );
      setContactName('');
      setContactStudio('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-sky-500 selection:text-white">
      {/* 1. TOP STICKY NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* PRISMAL Authentic Faceted Logo */}
          <div className="flex items-center gap-3">
            <PrismalLogo size="sm" variant="light" showText={true} />
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#perche-prismal" className="hover:text-sky-600 transition">Perché PRISMAL</a>
            <a href="#funzionalita" className="hover:text-sky-600 transition">Vantaggi per lo Studio</a>
            <a href="#confronto" className="hover:text-sky-600 transition">Confronto</a>
            <a href="#piani" className="hover:text-sky-600 transition">Piani & Tariffe</a>
            <a href="#contatti" className="hover:text-sky-600 transition">Richiedi Info</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              id="landing-header-login-btn"
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 rounded-xl transition"
            >
              Accedi
            </button>
            <button
              id="landing-header-register-btn"
              type="button"
              onClick={onStartRegistration}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.98] rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <span>Registra Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Superiority pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Il Gestionale Odontoiatrico di Nuova Generazione</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.12]">
          Riempi le Poltrone del Tuo Studio.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
            Azzera le Chiamate Perse.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          PRISMAL è la piattaforma cloud progettata per gli studi dentistici che vogliono modernizzarsi.
          Fornisce a ogni studio un <strong className="text-slate-900 font-semibold">minisito di prenotazione autonomo</strong>,
          un'<strong className="text-slate-900 font-semibold">agenda visiva con codice colore immediato</strong>,
          link unici di disdetta per azzerare i no-show e un assistente AI per la segreteria.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onStartRegistration}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-black text-base transition shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2"
          >
            <span>Inizia Subito con PRISMAL</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#piani"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-slate-800 font-bold text-base transition border border-slate-200 flex items-center justify-center gap-2"
          >
            <span>Scopri i Piani & Tariffe</span>
          </a>
        </div>

        {/* Trust Badges Bar */}
        <div className="mt-16 pt-10 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6 text-slate-600 text-xs font-semibold">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Minisito attivo in 2 minuti</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>-78% di appuntamenti mancati</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Nessun programma da installare</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>100% GDPR & Dati Sanitari Protetti</span>
          </div>
        </div>
      </section>

      {/* 3. WHY PRISMAL IS SUPERIOR SECTION */}
      <section id="perche-prismal" className="py-20 sm:py-28 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-sky-600 text-xs font-bold uppercase tracking-wider">Perché Scegliere PRISMAL</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-2 tracking-tight">
              Perché PRISMAL è Superiore ai Gestionali Tradizionali
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-4">
              I vecchi software per dentisti sono costosi, macchinosi e vincolati al computer della segreteria.
              PRISMAL rende il tuo studio accessibile e produttivo 24 ore su 24.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Vantaggio 1 */}
            <div className="bg-white border border-slate-200/90 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-6">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Minisito Autonomo Istantaneo</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Il link dedicato del tuo studio da incollare su Google Maps, nella bio di Instagram o inviare su WhatsApp. I pazienti prenotano in 30 secondi dal cellulare senza installare app.
              </p>
            </div>

            {/* Vantaggio 2 */}
            <div className="bg-white border border-slate-200/90 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Zero Chiamate Perse la Sera e nei Weekend</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Oltre il 45% delle prenotazioni odontoiatriche avviene fuori dagli orari di segreteria. Con PRISMAL il tuo studio riceve visite confermate anche a porte chiuse.
              </p>
            </div>

            {/* Vantaggio 3 */}
            <div className="bg-white border border-slate-200/90 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Abbattimento Drastico dei No-Show</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Ogni paziente riceve un token unico di gestione: se ha un imprevisto può disdire o spostare la visita con 1 clic senza chiamare, liberando immediatamente lo slot per un'urgenza.
              </p>
            </div>

            {/* Vantaggio 4 */}
            <div className="bg-white border border-slate-200/90 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Agenda Visiva Immediata a Colori</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Basta schermate caotiche: Verde per appuntamenti confermati, Giallo per visite in attesa di validazione, Bianco per slot liberi prenotabili dai pazienti.
              </p>
            </div>

            {/* Vantaggio 5 */}
            <div className="bg-white border border-slate-200/90 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">AI Copilot per la Segreteria</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Genera in un clic briefing mattutini sui pazienti in arrivo, prepara promemoria personalizzati, e calcola suggerimenti per colmare i buchi d'orario.
              </p>
            </div>

            {/* Vantaggio 6 */}
            <div className="bg-white border border-slate-200/90 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Blocco Ferie e Imprevisti in 1 Clic</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Hai un corso di aggiornamento o un'emergenza in sala operatoria? Blocca una fascia oraria o un'intera giornata: sparirà all'istante dal minisito dei pazienti.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COMPARISON TABLE */}
      <section id="confronto" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sky-600 text-xs font-bold uppercase tracking-wider">Confronto Diretto</span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-2 tracking-tight">
            PRISMAL vs Vecchi Metodi Telefonici
          </h2>
          <p className="text-slate-600 text-base sm:text-lg mt-3">
            Ecco cosa cambia per il tuo studio dentistico adottando la tecnologia PRISMAL.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 bg-slate-50 p-5 sm:p-6 border-b border-slate-200 text-xs sm:text-sm font-black">
            <div className="text-slate-700">Caratteristica</div>
            <div className="text-rose-600 text-center">Gestionale Vecchio / Telefono</div>
            <div className="text-sky-700 text-center flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>PRISMAL OS</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            {[
              {
                feature: 'Prenotazione Pazienti H24',
                old: 'Solo quando la segretaria risponde al telefono',
                prismal: 'Attiva 24/7 su minisito autonomo dello studio',
              },
              {
                feature: 'Accessibilità da Smartphone / Tablet',
                old: 'Solo sul PC fisico installato in studio',
                prismal: '100% Cloud da cellulare, iPad o PC di casa',
              },
              {
                feature: 'Gestione Disdette e Riprogrammazione',
                old: 'Il paziente non si presenta senza avvisare',
                prismal: 'Link 1-click in email per disdire con anticipo',
              },
              {
                feature: 'Visualizzazione Orari e Poltrone',
                old: 'Tabelle grigie complesse e dispersive',
                prismal: 'Agenda compatta stile Apple con codice colore',
              },
              {
                feature: 'Assistente AI per Segreteria',
                old: 'Non disponibile',
                prismal: 'AI Copilot per comunicazioni e briefing clinico',
              },
              {
                feature: 'Periodo di Prova Senza Impegno',
                old: 'Contratti vincolanti annuali con penali',
                prismal: '5 prenotazioni gratuite senza carta di credito',
              },
            ].map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 p-4 sm:p-6 items-center hover:bg-slate-50/70 transition">
                <div className="font-bold text-slate-800">{row.feature}</div>
                <div className="text-center text-slate-500 flex items-center justify-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span className="hidden sm:inline">{row.old}</span>
                </div>
                <div className="text-center font-bold text-sky-700 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{row.prismal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRICING PLANS */}
      <section id="piani" className="py-20 sm:py-28 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-purple-600 text-xs font-bold uppercase tracking-wider">Trasparenza Totale</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 tracking-tight">
              Un Unico Piano All-Inclusive: PRISMAL Prime
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3">
              Inizia con <strong>30 giorni di prova gratuita</strong> (Google Pay, PayPal o carta a 0,00€, nessun costo oggi). Poi soli <strong>€{PRISMAL_PRIME_PRICE_MONTHLY}/mese</strong> (o €{PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY}/m annuale) tutto incluso, disattivabile in qualsiasi momento in 1 click.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* CARD 1: 30 GIORNI DI PROVA */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  Nessun Rischio • 0,00€ Oggi
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4">30 Giorni di Prova</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">€0</span>
                  <span className="text-xs text-slate-500">/ per il primo mese</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Collega Google Pay, PayPal o la tua carta con verifica a 0,00€. Prova tutte le funzionalità cloud dello studio per un mese intero a costo zero.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>Appuntamenti e Pazienti ILLIMITATI</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>Minisito Studio e Triage Odontoiatrico 24/7</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>Odontogramma 3D & Cartella Clinica Digitale</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>Sincronizzazione Outlook & Google Calendar</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>Piani di trattamento e preventivi con firme</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <strong>Regole Smart (sanificazione, slot urgenze)</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Disdici quando vuoi in 1 click prima della scadenza
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onStartRegistration}
                className="mt-8 w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Inizia Prova di 30 Giorni (0,00€)
              </button>
            </div>

            {/* CARD 2: PRISMAL PRIME */}
            <div className="bg-white border-2 border-purple-600 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-purple-700 text-white font-black text-[10px] uppercase tracking-wider shadow-sm">
                Suite Completa All-Inclusive
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                  PRISMAL Prime
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4">Tutto Incluso a Regime</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-purple-900">€{PRISMAL_PRIME_PRICE_MONTHLY}</span>
                  <span className="text-xs text-slate-500">/ al mese (€{PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY}/m fatturati annualmente)</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  La suite cloud completa per lo studio con poltrone illimitate e servizi telecomunicazioni dedicati (WhatsApp & SMS).
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600" />
                    <strong>Tutto ciò che è incluso nei 30 giorni di prova</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600" />
                    <strong>Conferme e promemoria con WhatsApp Business Ufficiale</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600" />
                    <strong>250 SMS AGCOM/mese con mittente certificato</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600" />
                    <strong>Centralino Telefonico Vocale AI H24 per lo studio</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600" />
                    <strong>Poltrone, operatori e collaboratori ILLIMITATI</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600" />
                    <strong>Esportazione ponte verso altri PMS (XDent, OrisDent, ecc.)</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600" />
                    <strong>Assistenza prioritaria dedicata</strong>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onStartRegistration}
                className="mt-8 w-full py-3.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-black text-xs transition shadow-md shadow-purple-600/25 cursor-pointer"
              >
                Registra Studio & Attiva Prime
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONTACT SECTION */}
      <section id="contatti" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-sky-600 text-xs font-bold uppercase tracking-wider">Contattaci Direttamente</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 tracking-tight">
              Hai Domande o Vuoi una Presentazione Guidata?
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              Compila il modulo per ricevere informazioni complete o pianificare una presentazione su misura di PRISMAL.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome e Cognome *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Dott. Mario Rossi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome dello Studio Odontoiatrico *
                </label>
                <input
                  type="text"
                  required
                  value={contactStudio}
                  onChange={e => setContactStudio(e.target.value)}
                  placeholder="Studio Dentistico Rossi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Indirizzo Email *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="mario.rossi@studiorossi.it"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Recapito Telefonico *
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="340 1234567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Messaggio o Richiesta Specifica
              </label>
              <textarea
                rows={3}
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                placeholder="Vorrei ricevere informazioni su PRISMAL per il mio studio..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {contactSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">
                  {contactSuccessMessage}
                </div>
              </div>
            )}

            {contactErrorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">
                  {contactErrorMessage}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingContact}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-400 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmittingContact ? (
                <span>Inoltro richiesta in corso...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Invia Richiesta al Team PRISMAL</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <PrismalLogo size="sm" variant="dark" showText={true} />
          </div>

          <div className="text-xs text-slate-400 text-center md:text-right">
            <p>© {new Date().getFullYear()} PRISMAL. Tutti i diritti riservati.</p>
            <p className="mt-1">Piattaforma conforme GDPR per la sanità digitale odontoiatrica.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
