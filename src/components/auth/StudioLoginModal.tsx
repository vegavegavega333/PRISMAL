import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, Mail, Lock, AlertCircle, Clock, CheckCircle, X, ArrowRight, Sparkles } from 'lucide-react';
import { GoogleAccountChooserModal } from './GoogleAccountChooserModal';

interface StudioLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToRegister: () => void;
}

export const StudioLoginModal: React.FC<StudioLoginModalProps> = ({
  isOpen,
  onClose,
  onGoToRegister,
}) => {
  const { loginStudioCredentials, loginStudioWithGoogle, studios } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingNotice(null);

    const res = loginStudioCredentials(email, password);

    if (res.success) {
      onClose();
    } else if (res.isPending) {
      setPendingNotice(res.error || 'Lo studio è in attesa di approvazione da parte del Super Admin.');
    } else {
      setError(res.error || 'Credenziali non valide.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header (Clean Light Theme) */}
        <div className="p-6 pb-5 text-center border-b border-slate-100 bg-slate-50/70">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-sky-700 uppercase font-bold bg-sky-100/70 px-2 py-0.5 rounded-full">
            Area Professionisti
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2">
            Gestionale Studio Odontoiatrico
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Accedi per gestire prenotazioni, orari di apertura e pazienti.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-2.5">
              <div className="flex items-start gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToRegister();
                }}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Registra il tuo Studio Adesso</span>
              </button>
            </div>
          )}

          {pendingNotice && (
            <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Richiesta in Verifica</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                {pendingNotice}
              </p>
              <div className="mt-2 text-[11px] text-amber-700 bg-amber-100/70 p-2 rounded-lg font-medium">
                Consiglio: Il Super Admin (prismaldental@gmail.com) può abilitare lo studio con 1 clic dalla console amministratore.
              </div>
            </div>
          )}

          {/* Google Access */}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsGoogleChooserOpen(true);
            }}
            className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Accedi con Google</span>
          </button>

          {/* Real Google Account Chooser Modal */}
          <GoogleAccountChooserModal
            isOpen={isGoogleChooserOpen}
            onClose={() => setIsGoogleChooserOpen(false)}
            title="Accedi a PRISMAL con Google"
            subtitle="Scegli l'account Google con cui hai registrato lo studio"
            onSelectAccount={(account) => {
              setError(null);
              setPendingNotice(null);
              const res = loginStudioWithGoogle({ email: account.email, name: account.name });
              if (res.success) {
                onClose();
              } else {
                setError(res.error || `Nessuno studio odontoiatrico trovato per l'account "${account.email}". Effettua prima la registrazione.`);
              }
            }}
          />

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold uppercase">oppure con email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email dello Studio
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="es. clinica@tuodentista.it"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
            >
              <span>Accedi al Gestionale</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Prompt to register */}
          <div className="pt-3 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500 mb-2">
              Non hai ancora registrato il tuo studio odontoiatrico?
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToRegister();
              }}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Registra il tuo Studio (1 Mese di Prova Gratuito - PRISMAL Prime)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
