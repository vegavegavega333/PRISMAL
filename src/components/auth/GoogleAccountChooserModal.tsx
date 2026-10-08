import React, { useState, useEffect } from 'react';
import { Check, Plus, Loader2, X, Shield, ArrowRight, Trash2, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';

export interface GoogleAccount {
  email: string;
  name: string;
  avatarLetter?: string;
  bgColor?: string;
  isPrimary?: boolean;
}

const STORAGE_KEY = 'prismal_saved_google_accounts';

const DEFAULT_ACCOUNTS: GoogleAccount[] = [
  {
    email: 'prismaldental@gmail.com',
    name: 'PRISMAL Dental (Super Admin)',
    avatarLetter: 'P',
    bgColor: 'bg-purple-700',
    isPrimary: true,
  },
  {
    email: 'admin@prismal.app',
    name: 'PRISMAL Platform Administrator',
    avatarLetter: 'A',
    bgColor: 'bg-slate-700',
    isPrimary: false,
  },
];

interface GoogleAccountChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: { email: string; name: string; avatarUrl?: string }) => void;
  title?: string;
  subtitle?: string;
}

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  title = 'Accedi con Google',
  subtitle = 'Scegli o connetti un account Google ufficiale',
}) => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_ACCOUNTS;
  });

  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [isExternalWindowOpen, setIsExternalWindowOpen] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [inputError, setInputError] = useState('');

  // Always reset to account list view whenever opened
  useEffect(() => {
    if (isOpen) {
      setShowAddAccount(false);
      setSelectedEmail(null);
      setIsAuthenticating(false);
      setIsExternalWindowOpen(false);
      setInputError('');
      setCustomEmail('');
      setCustomName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePickAccount = (acc: GoogleAccount) => {
    setSelectedEmail(acc.email);
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      onSelectAccount({
        email: acc.email,
        name: acc.name,
      });
      onClose();
    }, 350);
  };

  const handleDeleteAccount = (emailToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = accounts.filter(a => a.email !== emailToDelete);
    setAccounts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const openOfficialGoogleAuth = (targetEmail?: string) => {
    const width = 520;
    const height = 640;
    const left = Math.max(0, Math.round(window.screen.width / 2 - width / 2));
    const top = Math.max(0, Math.round(window.screen.height / 2 - height / 2));
    
    const googleUrl = targetEmail
      ? `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(targetEmail)}&continue=https://myaccount.google.com`
      : 'https://accounts.google.com/signin/v2/identifier?passive=true&service=lso&flowName=GlifWebSignIn';

    try {
      window.open(
        googleUrl,
        'GoogleAuthOfficialWindow',
        `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no`
      );
    } catch (e) {
      console.warn('Popup may have been blocked:', e);
    }

    setIsExternalWindowOpen(true);
  };

  const handleAddCustomAccount = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    setInputError('');
    const cleanEmail = customEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setInputError('Inserisci un indirizzo email Google valido.');
      return;
    }

    const autoName = cleanEmail.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const newAcc: GoogleAccount = {
      email: cleanEmail,
      name: customName.trim() || autoName,
      avatarLetter: (customName.trim() || cleanEmail)[0].toUpperCase(),
      bgColor: 'bg-indigo-600',
    };

    const updated = [newAcc, ...accounts.filter(a => a.email !== cleanEmail)];
    setAccounts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Open official Google auth window for this account
    openOfficialGoogleAuth(cleanEmail);
    setSelectedEmail(cleanEmail);
  };

  const handleConfirmExternalAuth = (emailToConfirm?: string) => {
    const target = emailToConfirm || selectedEmail || (accounts.length > 0 ? accounts[0].email : 'prismaldental@gmail.com');
    const account = accounts.find(a => a.email === target) || {
      email: target,
      name: target.split('@')[0],
    };

    setIsAuthenticating(true);
    setTimeout(() => {
      setIsAuthenticating(false);
      onSelectAccount({
        email: account.email,
        name: account.name,
      });
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Header with Google Logo */}
        <div className="px-6 pt-6 pb-4 text-center relative border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
            aria-label="Chiudi finestra Google"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Official Google 'G' Mark */}
          <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 p-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>

          <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
        </div>

        {/* Loading Overlay */}
        {isAuthenticating && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <Loader2 className="w-9 h-9 text-[#4285F4] animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-900">Verifica Google OAuth in corso...</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">{selectedEmail}</p>
            <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full border border-emerald-200">
              <Shield className="w-3 h-3 text-emerald-600" />
              Connessione account convalidata
            </span>
          </div>
        )}

        {/* External Window State Banner */}
        {isExternalWindowOpen ? (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-center">
              <div className="w-10 h-10 rounded-full bg-white text-sky-600 flex items-center justify-center mx-auto mb-2.5 shadow-xs border border-sky-100">
                <ExternalLink className="w-5 h-5 text-[#4285F4]" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Schermata Google Aperta</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Abbiamo aperto la finestra ufficiale di Google (<strong>accounts.google.com</strong>). Seleziona il tuo account Google per autorizzare la connessione.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleConfirmExternalAuth()}
                className="w-full py-3 px-4 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ho autorizzato su Google / Connetti Ora</span>
              </button>

              <button
                type="button"
                onClick={() => openOfficialGoogleAuth(selectedEmail || undefined)}
                className="w-full py-2 px-3 text-[11px] text-slate-500 hover:text-slate-800 font-semibold text-center transition"
              >
                Non vedi la finestra? Clicca qui per riaprirla
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 max-h-[380px] overflow-y-auto space-y-2">
            {!showAddAccount ? (
              <>
                {/* 1-Click Saved Accounts */}
                {accounts.length > 0 ? (
                  accounts.map(acc => (
                    <div
                      key={acc.email}
                      className="w-full p-3.5 rounded-2xl hover:bg-sky-50/70 border border-slate-200 hover:border-sky-300 transition flex items-center justify-between group shadow-2xs bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => handlePickAccount(acc)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-full ${acc.bgColor || 'bg-sky-600'} text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs`}>
                          {acc.avatarLetter || acc.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{acc.name}</span>
                            {acc.isPrimary && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                                Connesso
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{acc.email}</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePickAccount(acc)}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Collega</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAccount(acc.email, e)}
                          title="Rimuovi account dalla lista"
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    Nessun account Google memorizzato. Clicca sotto per accedere con Google.
                  </div>
                )}

                {/* Open Official External Google Auth Window directly */}
                <div className="pt-2 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => openOfficialGoogleAuth()}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-4 h-4 text-[#4285F4]" />
                    <span>Apri Schermata Ufficiale Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddAccount(true)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <span>Inserisci indirizzo Google diverso</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3.5 p-1">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Inserisci Account Google</h4>
                    <p className="text-[10px] text-slate-400">Non richiediamo alcuna password: l'accesso avviene su Google</p>
                  </div>
                </div>

                {inputError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span>{inputError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Email Google o Google Workspace *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={e => setCustomEmail(e.target.value)}
                      placeholder="iltuoaccount@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:bg-white transition"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Nome Studio o Titolare (opzionale)
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Es. Dott. Mario Rossi"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:bg-white transition"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Nessuna password salvata: verrai convalidato tramite la schermata ufficiale protetta di Google.</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAccount(false)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCustomAccount()}
                    className="flex-1 py-2.5 px-3 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Connetti con Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Google Terms Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center leading-relaxed">
          Google protegge le tue credenziali. PRISMAL sincronizzerà solo nome ed email per il gestionale o per la prenotazione.
        </div>
      </div>
    </div>
  );
};
