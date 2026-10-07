import React from 'react';
import { Building2, ShieldCheck, X, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { PrismalLogo } from '../PrismalLogo';

interface AuthSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudioLogin: () => void;
  onSelectSuperAdminLogin: () => void;
  onStartRegistration: () => void;
}

export const AuthSelectorModal: React.FC<AuthSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectStudioLogin,
  onSelectSuperAdminLogin,
  onStartRegistration,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 sm:p-8 pb-4 text-center border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-center mb-3">
            <PrismalLogo size="md" showText={true} layout="stacked" showSubtitle={false} />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Accedi a PRISMAL
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Seleziona la tua tipologia di accesso per entrare nella piattaforma.
          </p>
        </div>

        {/* Options */}
        <div className="p-6 sm:p-8 space-y-4">
          {/* Option 1: Studio Odontoiatrico */}
          <button
            onClick={() => {
              onClose();
              onSelectStudioLogin();
            }}
            className="w-full text-left p-5 rounded-2xl border-2 border-slate-200 hover:border-sky-500 bg-white hover:bg-sky-50/40 transition group relative shadow-xs"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition">
                    Accesso Studio Odontoiatrico
                  </h4>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Entra nel gestionale del tuo studio con email e password per consultare il calendario, gestire le visite e l'assistente AI.
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Super Admin */}
          <button
            onClick={() => {
              onClose();
              onSelectSuperAdminLogin();
            }}
            className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:border-purple-500 bg-slate-50/70 hover:bg-purple-50/40 transition group shadow-xs"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition">
                      Accesso Super Admin
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-200/70 text-purple-800 rounded-full">
                      Direzione
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Console riservata all'amministratore (Diego Raimondi) per abilitare gli studi, assegnare piani e gestire la piattaforma.
                </p>
              </div>
            </div>
          </button>

          {/* Patient Clarification note */}
          <div className="p-3.5 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center justify-between">
            <span className="text-[11px]">
              <strong>Sei un Paziente?</strong> Non occorre creare un account. Usa il link fornito dal tuo dentista o l'email di promemoria.
            </span>
          </div>

          {/* Register Callout */}
          <div className="pt-2 text-center">
            <span className="text-xs text-slate-500">Non hai ancora registrato il tuo studio? </span>
            <button
              onClick={() => {
                onClose();
                onStartRegistration();
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 underline"
            >
              Registrati ora (1 mese di prova gratuito PRISMAL Prime)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
