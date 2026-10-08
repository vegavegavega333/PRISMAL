import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Plus,
  ExternalLink,
  Search,
  Sparkles,
  Zap,
  Trash2,
  Lock,
  Unlock,
  Eye,
  Sliders,
  Mail,
  Send,
  Radio,
  CreditCard,
} from 'lucide-react';
import { PlanType, Studio } from '../../types';
import { PRISMAL_PRIME_PRICE_MONTHLY } from '../../data/planTierDefinitions';
import { CommunicationLogView } from './CommunicationLogView';
import { SuperAdminPaymentGatewayView } from './SuperAdminPaymentGatewayView';
import { SuperAdminSponsorshipManagement } from './SuperAdminSponsorshipManagement';
import { SuperAdminSupabaseTwilioView } from './SuperAdminSupabaseTwilioView';

export const SuperAdminDashboard: React.FC = () => {
  const {
    studios,
    appointments,
    approveStudioDemo,
    upgradeStudioPro,
    setStudioPlan,
    addDemoSlots,
    toggleStudioSuspension,
    deleteStudio,
    setCurrentRole,
    setCurrentStudioId,
    setPatientViewingSlug,
    completeOnboarding,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'studios' | 'communication_log' | 'payments' | 'sponsorship' | 'supabase_twilio'>('studios');
  const [filter, setFilter] = useState<'all' | 'pending' | 'demo' | 'pro' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStudioModal, setShowAddStudioModal] = useState(false);

  // Form for manual studio onboarding by Super Admin
  const [newStudioName, setNewStudioName] = useState('');
  const [newStudioCity, setNewStudioCity] = useState('');
  const [newStudioAddress, setNewStudioAddress] = useState('');
  const [newStudioPhone, setNewStudioPhone] = useState('');
  const [newStudioEmail, setNewStudioEmail] = useState('');
  const [newStudioPlan, setNewStudioPlan] = useState<PlanType>('prismal_prime');
  const [studioToDelete, setStudioToDelete] = useState<Studio | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Metrics
  const totalStudios = studios.length;
  const pendingStudios = studios.filter(s => s.status === 'pending');
  const demoStudios = studios.filter(s => (s.plan === 'trial_30d' || s.plan === 'demo_free' || s.subscription?.status === 'trialing') && s.status !== 'pending');
  const paidStudios = studios.filter(s => s.subscription?.status === 'active' || (s.plan !== 'trial_30d' && s.plan !== 'demo_free'));
  const totalBookings = appointments.length;

  const filteredStudios = studios.filter(studio => {
    const matchesSearch =
      studio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studio.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studio.city.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'pending') return studio.status === 'pending';
    if (filter === 'demo') return (studio.plan === 'trial_30d' || studio.plan === 'demo_free' || studio.subscription?.status === 'trialing') && studio.status !== 'pending';
    if (filter === 'pro') return studio.subscription?.status === 'active' || (studio.plan !== 'trial_30d' && studio.plan !== 'demo_free');
    if (filter === 'suspended') return studio.status === 'suspended';
    return true;
  });

  const handleCreateManualStudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudioName || !newStudioEmail) return;

    completeOnboarding({
      name: newStudioName.trim(),
      email: newStudioEmail.trim(),
      phone: newStudioPhone.trim(),
      city: newStudioCity.trim(),
      address: newStudioAddress.trim(),
      description: 'Studio odontoiatrico accreditato PRISMAL.',
      plan: newStudioPlan,
    });

    setShowAddStudioModal(false);
    setNewStudioName('');
    setNewStudioCity('');
    setNewStudioAddress('');
    setNewStudioPhone('');
    setNewStudioEmail('');
    setNewStudioPlan('pro_monthly');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full overflow-x-hidden">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Piattaforma PRISMAL • Console Super Admin</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeTab === 'studios' ? 'Gestione & Attivazione Studi Odontoiatrici' : 'Registro Comunicazioni & Delivery Status'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {activeTab === 'studios'
              ? 'Gestisci tutti gli studi registrati, attiva il mese di prova gratuita con carta collegata o assegna direttamente il piano PRISMAL Prime.'
              : 'Traccia e monitora in tempo reale lo stato di recapito di tutte le email di autenticazione OTP, conferme prenotazione e lead inviate.'}
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {activeTab === 'studios' && (
            <button
              onClick={() => setShowAddStudioModal(true)}
              className="w-full sm:w-auto px-3.5 sm:px-4 py-2 sm:py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Studio Manuale</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Module Tabs Switcher - Horizontal scroll on mobile */}
      <div className="flex items-center gap-2 border-b border-slate-200 mt-4 sm:mt-6 pb-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x">
        <button
          id="tab-studios"
          onClick={() => setActiveTab('studios')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'studios'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Studi Odontoiatrici ({totalStudios})</span>
        </button>

        <button
          id="tab-communication-log"
          onClick={() => setActiveTab('communication_log')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition relative ${
            activeTab === 'communication_log'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Communication Log</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        <button
          id="tab-payments"
          onClick={() => setActiveTab('payments')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'payments'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm'
              : 'text-purple-700 hover:text-purple-900 bg-purple-50/70'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Incassi & Gateway Pagamenti</span>
        </button>

        <button
          id="tab-sponsorship"
          onClick={() => setActiveTab('sponsorship')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'sponsorship'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm'
              : 'text-amber-800 hover:text-amber-950 bg-amber-50/80 border border-amber-200/70'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Sponsorizzazioni & Top Rank</span>
        </button>

        <button
          id="tab-supabase-twilio"
          onClick={() => setActiveTab('supabase_twilio')}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'supabase_twilio'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm'
              : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 border border-emerald-200/70'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-500" />
          <span>Supabase & Twilio Cloud</span>
        </button>
      </div>

      {activeTab === 'payments' ? (
        <div className="mt-6">
          <SuperAdminPaymentGatewayView />
        </div>
      ) : activeTab === 'supabase_twilio' ? (
        <div className="mt-6">
          <SuperAdminSupabaseTwilioView />
        </div>
      ) : activeTab === 'sponsorship' ? (
        <div className="mt-6">
          <SuperAdminSponsorshipManagement />
        </div>
      ) : activeTab === 'communication_log' ? (
        <div className="mt-6">
          <CommunicationLogView />
        </div>
      ) : (
        <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Studi Registrati
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalStudios}</span>
            <span className="text-xs text-slate-500">totali</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              In Attesa di Attivazione
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-800">{pendingStudios.length}</span>
            <span className="text-xs text-amber-600">da verificare</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
              Trial 30 Giorni (Carta Collegata)
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-800">{demoStudios.length}</span>
            <span className="text-xs text-sky-600">30 giorni gratuiti</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Abbonamenti Attivi PRISMAL Prime
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-800">{paidStudios.length}</span>
            <span className="text-xs text-emerald-600">PRISMAL Prime (€149/m)</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tutti gli Studi ({totalStudios})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            In Attesa ({pendingStudios.length})
          </button>
          <button
            onClick={() => setFilter('demo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'demo'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Demo Free ({demoStudios.length})
          </button>
          <button
            onClick={() => setFilter('pro')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'pro'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Abbonati ({paidStudios.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cerca studio, email, città..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Studios List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Elenco Studi Odontoiatrici ({filteredStudios.length})
          </h2>
          <span className="text-xs text-slate-500">
            Regola: I minisiti sono bloccati finché non approvati
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredStudios.length === 0 ? (
            <div className="text-center py-14 px-4 text-slate-500 text-sm">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nessuno studio presente nel database</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Quando uno studio si registra attraverso la landing page, comparirà qui con la richiesta di abilitazione.
              </p>
            </div>
          ) : (
            filteredStudios.map(studio => {
              const studioAppointments = appointments.filter(a => a.studioId === studio.id);
              const isDemo = studio.plan === 'demo_free';
              const isBlocked = isDemo && studio.demoSlotsRemaining <= 0;

              return (
                <div
                  key={studio.id}
                  className="p-5 hover:bg-slate-50/80 transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Studio Info */}
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1 w-full">
                    <img
                      src={studio.logoUrl}
                      alt={studio.name}
                      className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl object-cover border border-slate-200 shadow-sm flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words">{studio.name}</h3>

                        {/* Status badge */}
                        {studio.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            In Attesa di Approvazione
                          </span>
                        )}
                        {(studio.plan === 'trial_30d' || studio.plan === 'demo_free' || studio.subscription?.status === 'trialing') && studio.status !== 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            Prova 30 Giorni (0,00€)
                          </span>
                        )}
                        {(studio.plan === 'prismal_prime' || studio.plan === 'clinical_suite' || studio.plan === 'pro_monthly' || studio.subscription?.status === 'active') && studio.subscription?.status !== 'trialing' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Sparkles className="w-3 h-3" />
                            PRISMAL Prime (€{PRISMAL_PRIME_PRICE_MONTHLY}/m)
                          </span>
                        )}
                        {studio.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <Lock className="w-3 h-3" />
                            Sospeso
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2 sm:gap-3 break-all">
                        <span>{studio.email}</span>
                        <span>•</span>
                        <span>{studio.city}</span>
                        <span>•</span>
                        <span>{studio.phone}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-400 break-all">
                          prismal.app/punti/{studio.slug}
                        </span>
                        <button
                          onClick={() => {
                            setPatientViewingSlug(studio.slug);
                            setCurrentRole('patient');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 font-semibold underline"
                        >
                          <Eye className="w-3 h-3" />
                          Apri Minisito Paziente
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Slot Tracker for Demo accounts */}
                  <div className="flex flex-col justify-center w-full lg:w-auto min-w-0 lg:min-w-[180px]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-600">
                        {isDemo ? 'Slot Demo Rimanenti' : 'Abbonamento'}
                      </span>
                      <span className="font-bold font-mono">
                        {isDemo ? (
                          <span
                            className={
                              studio.demoSlotsRemaining > 0
                                ? 'text-amber-600'
                                : 'text-rose-600 font-extrabold'
                            }
                          >
                            {studio.demoSlotsRemaining} / {studio.demoSlotsTotal}
                          </span>
                        ) : (
                          <span className="text-emerald-600">Illimitati</span>
                        )}
                      </span>
                    </div>

                    {isDemo && (
                      <div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              studio.demoSlotsRemaining > 2
                                ? 'bg-sky-500'
                                : studio.demoSlotsRemaining > 0
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (studio.demoSlotsRemaining / studio.demoSlotsTotal) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        {isBlocked && (
                          <span className="text-[11px] text-rose-600 font-bold mt-1 block">
                            ⚠️ Slot esauriti (0/5) — Minisito disattivato!
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 mt-1">
                      Prenotazioni effettuate: {studioAppointments.length}
                    </div>
                  </div>

                  {/* Admin Actions & Plan Switcher */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto pt-3 lg:pt-0 border-t border-slate-100 lg:border-0">
                    {/* If pending, highlight approve button or reject/delete */}
                    {studio.status === 'pending' ? (
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <button
                          id={`approve-demo-${studio.id}`}
                          onClick={() => approveStudioDemo(studio.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Attiva 1 Mese Trial (0,00€)
                        </button>
                        <button
                          onClick={() => upgradeStudioPro(studio.id)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                        >
                          Attiva PRISMAL Prime Subito
                        </button>
                        <button
                          onClick={() => setStudioToDelete(studio)}
                          title="Nega approvazione e cestina richiesta"
                          className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Nega e Cestina</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Plan Selector Dropdown */}
                        <div className="flex items-center gap-1 w-full sm:w-auto min-w-0">
                          <select
                            value={studio.plan}
                            onChange={e => setStudioPlan(studio.id, e.target.value as PlanType)}
                            className="w-full sm:w-auto px-2.5 py-1.5 text-xs font-semibold bg-slate-100 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 max-w-full truncate"
                            title="Cambia piano assegnato a questo studio"
                          >
                            <option value="prismal_prime">PRISMAL Prime (€{PRISMAL_PRIME_PRICE_MONTHLY}/m)</option>
                            <option value="trial_30d">30 Giorni Prova (0€)</option>
                          </select>
                        </div>

                        {isDemo && (
                          <span
                            title="Studio in periodo di prova di 30 giorni con carta collegata"
                            className="px-2.5 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold"
                          >
                            Trial 30gg Attivo
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setCurrentStudioId(studio.id);
                            setCurrentRole('studio_admin');
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Apri Studio
                        </button>

                        <button
                          onClick={() => toggleStudioSuspension(studio.id)}
                          title={studio.status === 'suspended' ? 'Riattiva Studio' : 'Sospendi Studio'}
                          className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                            studio.status === 'suspended'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {studio.status === 'suspended' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => setStudioToDelete(studio)}
                          title="Elimina studio definitivamente"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </>
      )}

      {/* Manual Studio Creation Modal */}
      {showAddStudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Registra Nuovo Studio Dentistico</h3>
                <p className="text-xs text-slate-500 mt-0.5">Creazione guidata da Super Admin</p>
              </div>
              <button
                onClick={() => setShowAddStudioModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualStudio} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Studio Odontoiatrico *</label>
                <input
                  type="text"
                  required
                  value={newStudioName}
                  onChange={e => setNewStudioName(e.target.value)}
                  placeholder="Es. Studio Dentistico Dott. Verdi"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Città (Opzionale)</label>
                  <input
                    type="text"
                    value={newStudioCity}
                    onChange={e => setNewStudioCity(e.target.value)}
                    placeholder="Es. Milano"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefono (Opzionale)</label>
                  <input
                    type="tel"
                    value={newStudioPhone}
                    onChange={e => setNewStudioPhone(e.target.value)}
                    placeholder="Es. 340 1234567"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email dello Studio *</label>
                <input
                  type="email"
                  required
                  value={newStudioEmail}
                  onChange={e => setNewStudioEmail(e.target.value)}
                  placeholder="info@studioverdi.it"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Piano Iniziale da Assegnare</label>
                <select
                  value={newStudioPlan}
                  onChange={e => setNewStudioPlan(e.target.value as PlanType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  <option value="prismal_prime">PRISMAL Prime (€{PRISMAL_PRIME_PRICE_MONTHLY}/mese - All-Inclusive)</option>
                  <option value="trial_30d">30 Giorni di Prova Gratuita (0,00€)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudioModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  Crea & Attiva Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation In-App Modal (Safe & Cross-browser compatible) */}
      {studioToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              {studioToDelete.status === 'pending'
                ? 'Nega Approvazione e Cestina Studio'
                : 'Elimina Studio Definitivamente'}
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {studioToDelete.status === 'pending'
                ? `Sei sicuro di voler rifiutare la richiesta di registrazione per lo studio "${studioToDelete.name}"? L'account non autorizzato verrà eliminato e non potrà accedere al sistema.`
                : `Sei sicuro di voler eliminare definitivamente lo studio "${studioToDelete.name}"? Verranno rimossi anche il minisito, tutti gli slot orari e le prenotazioni collegate.`}
            </p>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <img
                src={studioToDelete.logoUrl}
                alt={studioToDelete.name}
                className="w-10 h-10 rounded-lg object-cover border border-slate-200"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{studioToDelete.name}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{studioToDelete.email}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStudioToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetName = studioToDelete.name;
                  deleteStudio(studioToDelete.id);
                  setStudioToDelete(null);
                  setDeleteToast(`Studio "${targetName}" eliminato con successo dal database.`);
                  setTimeout(() => setDeleteToast(null), 4000);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Conferma Eliminazione</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {deleteToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{deleteToast}</span>
        </div>
      )}
    </div>
  );
};
