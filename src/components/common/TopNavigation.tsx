import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PrismalLogo } from '../PrismalLogo';
import { ThemeToggle } from './ThemeToggle';
import { getStudioTrialStatus } from '../../data/planTierDefinitions';
import {
  ShieldCheck,
  Building2,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  Home,
  User,
  Sparkles,
} from 'lucide-react';

export const TopNavigation: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    activeStudio,
    authSession,
    onboardingStep,
    logout,
    openPatientBooking,
    studios,
  } = useApp();

  const [copiedLink, setCopiedLink] = useState(false);

  // If in landing mode, LandingGate handles its own header
  if (currentRole === 'landing') {
    return null;
  }

  // Never show studio management navigation if user is not authenticated as studio admin
  // or if currently undergoing onboarding / login flow
  if (currentRole === 'studio_admin' && (!authSession || authSession.role !== 'studio_admin' || !activeStudio || onboardingStep !== 'completed')) {
    return null;
  }

  // Handle Copy Patient Link
  const handleCopyPatientLink = () => {
    if (!activeStudio) return;
    const patientUrl = `${window.location.origin}/punti/${encodeURIComponent(activeStudio.slug)}`;
    navigator.clipboard.writeText(patientUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 1. SUPER ADMIN HEADER
  if (currentRole === 'super_admin') {
    return (
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-purple-900/50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PrismalLogo size="sm" variant="dark" showText={true} showSubtitle={false} />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-800/80 text-purple-200 border border-purple-600/80 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-purple-300" />
                <span>Super Admin Console</span>
              </span>
              <span className="text-[11px] text-purple-300 font-mono hidden sm:inline">
                ({authSession?.email || 'prismaldental@gmail.com'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-700/60 transition text-xs font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Esci dalla Console</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // 2. STUDIO ADMIN HEADER
  if (currentRole === 'studio_admin' && activeStudio) {
    const trialStatus = getStudioTrialStatus(activeStudio);
    const patientUrl = `${window.location.origin}/punti/${encodeURIComponent(activeStudio.slug)}`;

    return (
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Studio Info */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={activeStudio.logoUrl}
              alt={activeStudio.name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  {activeStudio.name}
                </h2>
                {trialStatus.isPaidActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex-shrink-0">
                    PRISMAL Prime (Attivo)
                  </span>
                ) : trialStatus.isTrialing ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex-shrink-0">
                    Prova Prime: {trialStatus.daysRemaining}gg
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 flex-shrink-0">
                    PRISMAL Prime
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                {activeStudio.city} • Gestionale Studio
              </p>
            </div>
          </div>

          {/* Right: Actions & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick theme mode toggle */}
            <ThemeToggle compact />

            {/* Share link to patients */}
            <button
              onClick={handleCopyPatientLink}
              title="Copia link da inviare ai tuoi pazienti (es. WhatsApp)"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">Link Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia Link Pazienti</span>
                </>
              )}
            </button>

            {/* Test patient view button (opens independent window) */}
            <button
              onClick={() => openPatientBooking(activeStudio.slug, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition"
              title="Apri il minisito paziente in una nuova finestra autonoma"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Testa Minisito Paziente</span>
              <span className="md:hidden">Minisito</span>
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Esci dal gestionale studio"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Esci</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // 3. PATIENT HEADER (100% clean medical header, NO admin switchers)
  if (currentRole === 'patient') {
    return (
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PrismalLogo size="sm" showText={true} showSubtitle={false} />
            <span className="text-slate-400 font-mono text-xs hidden sm:inline">|</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold text-xs hidden sm:inline">Prenotazione Sanitaria</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              onClick={() => {
                setCurrentRole('landing');
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', window.location.pathname);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Torna alla Ricerca Studi</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return null;
};
