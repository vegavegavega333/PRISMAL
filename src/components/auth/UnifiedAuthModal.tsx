import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PrismalLogo } from '../PrismalLogo';
import { GoogleAccountChooserModal } from './GoogleAccountChooserModal';
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  X,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Image as ImageIcon,
  Fingerprint,
  Users,
} from 'lucide-react';
import {
  authenticateWithPasskey,
  registerPasskey,
  getStoredPasskeys,
  isPasskeySupported,
} from '../../services/passkeyAuth';
import { findDuplicateStudio } from '../../utils/studioDeduplication';
import { signInWithGoogleSupabase } from '../../services/supabase';

interface UnifiedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
  initialLoginRole?: 'studio' | 'super_admin' | 'patient';
}

const LOGO_PRESETS = [
  {
    name: 'Modern Smile',
    url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dental Care White',
    url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Minimal Tooth',
    url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Clinical Excellence',
    url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&auto=format&fit=crop&q=80',
  },
];

export const UnifiedAuthModal: React.FC<UnifiedAuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  initialLoginRole = 'studio',
}) => {
  const {
    studios,
    loginStudioCredentials,
    loginStudioWithGoogle,
    loginSuperAdmin,
    sendVerificationCodeAsync,
    verifyEmailCodeAsync,
    completeOnboarding,
    startStudioRegistrationWithGoogle,
    registrationDraftEmail,
    onboardingStep,
    setOnboardingStep,
    setCurrentRole,
    setCurrentStudioId,
    setAuthSession,
  } = useApp();

  // Active top tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // When opening or prop changing, set initial tab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // LOGIN STATE
  const [loginRole, setLoginRole] = useState<'studio' | 'super_admin' | 'patient'>(initialLoginRole || 'studio');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPendingNotice, setLoginPendingNotice] = useState<string | null>(null);
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
  const [googleTarget, setGoogleTarget] = useState<'studio_login' | 'studio_register' | 'superadmin_login' | 'patient_login'>('studio_login');

  // REGISTRATION STATE
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regStudioName, setRegStudioName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regLogoUrl, setRegLogoUrl] = useState(LOGO_PRESETS[0].url);
  const [regError, setRegError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [createdStudio, setCreatedStudio] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // HANDLE LOGIN SUBMIT
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginPendingNotice(null);

    const email = loginEmail.trim();
    if (!email) {
      setLoginError('Inserisci un indirizzo email.');
      return;
    }

    if (loginRole === 'patient') {
      setCurrentRole('patient');
      setAuthSession({
        role: 'patient',
        email,
        patientName: email.split('@')[0],
      });
      onClose();
      return;
    }

    if (loginRole === 'studio') {
      const res = loginStudioCredentials(email, loginPassword);
      if (res.success) {
        onClose();
      } else if (res.isPending) {
        setLoginPendingNotice(res.error || 'Lo studio è in attesa di approvazione da parte del Super Admin.');
      } else {
        setLoginError(res.error || 'Credenziali studio non corrette.');
      }
    } else {
      const res = loginSuperAdmin(email, loginPassword);
      if (res.success) {
        onClose();
      } else {
        setLoginError(res.error || 'Credenziali non valide per il ruolo di Super Amministratore.');
      }
    }
  };

  // HANDLE REGISTRATION STEP 1: SEND CODE
  const handleRegSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const email = regEmail.trim();
    if (!email || !email.includes('@')) {
      setRegError('Inserisci un indirizzo email aziendale valido.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('La password deve contenere almeno 6 caratteri.');
      return;
    }

    // Check duplicate studio email
    const isDuplicate = studios.some(s => (s.email || '').toLowerCase().trim() === email.toLowerCase());
    if (isDuplicate) {
      setRegError('Esiste già uno studio registrato con questa email. Clicca sulla scheda "Accedi" per entrare nel tuo gestionale.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendVerificationCodeAsync(email, regPassword);
      if (res.success) {
        setRegStep(2);
      } else {
        setRegError(res.error || 'Impossibile inviare il codice. Verifica la configurazione email.');
      }
    } catch {
      setRegError('Errore di connessione durante l\'invio del codice.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // HANDLE REGISTRATION STEP 2: VERIFY OTP
  const handleRegVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const code = regOtp.trim();
    if (code.length !== 6) {
      setRegError('Inserisci il codice completo a 6 cifre ricevuto via email.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await verifyEmailCodeAsync(code);
      if (res.success) {
        setRegStep(3);
      } else {
        setRegError(res.error || 'Codice errato o scaduto. Riprova o richiedine uno nuovo.');
      }
    } catch {
      setRegError('Errore di comunicazione durante la verifica del codice.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // RESEND OTP
  const handleResendOtp = async () => {
    setRegError(null);
    setResendStatus(null);
    try {
      const email = regEmail.trim() || registrationDraftEmail;
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus('Nuovo codice inviato alla tua casella email!');
        setTimeout(() => setResendStatus(null), 5000);
      } else {
        setRegError('Impossibile rinviare il codice in questo momento.');
      }
    } catch {
      setRegError('Errore durante il reinvio del codice.');
    }
  };

  // HANDLE REGISTRATION STEP 3: CREATE PROFILE
  const handleRegCompleteProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const name = regStudioName.trim();
    const city = regCity.trim();
    const phone = regPhone.trim();
    const address = regAddress.trim();

    if (!name || !city || !phone) {
      setRegError('Compila tutti i campi obbligatori (Nome studio, Città, Telefono).');
      return;
    }

    const duplicateCheck = findDuplicateStudio(studios, { email: regEmail, phone });
    if (duplicateCheck.isDuplicate) {
      if (duplicateCheck.field === 'email') {
        setRegError(`Uno studio con l'email ${regEmail} è già registrato. Accedi invece di registrarti.`);
      } else {
        setRegError(`Uno studio con il numero di telefono ${phone} è già registrato sulla piattaforma. Non sono ammessi numeri duplicati.`);
      }
      return;
    }

    try {
      const created = completeOnboarding({
        name,
        city,
        phone,
        address: address || `${city}, Centro`,
        logoUrl: regLogoUrl,
        password: regPassword,
      });
      setCreatedStudio(created);
      setRegStep(4);
    } catch (err: any) {
      setRegError(err?.message || 'Errore durante la creazione del profilo studio.');
    }
  };

  // SUPABASE AUTH: GOOGLE SIGN-IN
  const handleSupabaseGoogleLogin = async () => {
    setLoginError(null);
    setIsSupabaseLoading(true);
    try {
      const res = await signInWithGoogleSupabase(loginRole);
      if (!res.success) {
        // Fallback to internal chooser modal if OAuth redirection was intercepted
        setGoogleTarget(
          loginRole === 'studio'
            ? 'studio_login'
            : loginRole === 'patient'
            ? 'patient_login'
            : 'superadmin_login'
        );
        setIsGoogleChooserOpen(true);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Errore di connessione a Supabase Auth');
    } finally {
      setIsSupabaseLoading(false);
    }
  };

  // GOOGLE LOGIN / REGISTRATION HANDLER
  const handleGoogleAccountSelected = (account: { email: string; name: string }) => {
    setLoginError(null);
    setRegError(null);

    if (googleTarget === 'patient_login') {
      setCurrentRole('patient');
      setAuthSession({
        role: 'patient',
        email: account.email,
        patientName: account.name,
      });
      onClose();
    } else if (googleTarget === 'superadmin_login') {
      const res = loginSuperAdmin(account.email);
      if (res.success) {
        onClose();
      } else {
        setLoginError(res.error || 'Questo account Google non è abilitato come Super Amministratore.');
      }
    } else if (googleTarget === 'studio_login') {
      const res = loginStudioWithGoogle(account);
      if (res.success) {
        onClose();
      } else {
        setLoginError(res.error || `Nessuno studio associato a ${account.email}. Clicca su "Registrati" per crearlo.`);
      }
    } else if (googleTarget === 'studio_register') {
      const res = startStudioRegistrationWithGoogle(account);
      if (res.success) {
        setRegEmail(account.email);
        setRegStudioName(account.name.toLowerCase().includes('studio') ? account.name : `Studio Odontoiatrico ${account.name}`);
        setRegStep(3); // Skip OTP since Google email is verified!
      } else {
        setRegError(res.error || 'Impossibile avviare la registrazione con questo account Google.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col relative text-slate-900">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/70 relative flex-shrink-0">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer z-10"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Centered Brand */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-2">
              <PrismalLogo size="md" showText={true} layout="stacked" showSubtitle={false} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {activeTab === 'login' ? 'Accedi alla Piattaforma' : 'Registra il tuo Studio Dentistico'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
              {activeTab === 'login'
                ? 'Seleziona il tipo di accesso per gestire appuntamenti e orari'
                : 'Crea il tuo profilo in meno di 2 minuti e ricevi prenotazioni 24/7'}
            </p>
          </div>

          {/* Symmetrical Segmented Tab Control: [ Accedi ] [ Registrati ] */}
          <div className="flex bg-slate-200/70 p-1 rounded-2xl mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
                setLoginPendingNotice(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Registrati</span>
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* ========================================================= */}
          {/* TAB 1: ACCEDI                                             */}
          {/* ========================================================= */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {/* Role Selector: Studio vs Paziente vs Super Admin */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Identificati per accedere:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('studio');
                      setLoginError(null);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      loginRole === 'studio'
                        ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    <span className="truncate">Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('patient');
                      setLoginError(null);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      loginRole === 'patient'
                        ? 'bg-white text-emerald-950 shadow-xs border border-emerald-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">Paziente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('super_admin');
                      setLoginError(null);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      loginRole === 'super_admin'
                        ? 'bg-white text-purple-950 shadow-xs border border-purple-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span className="truncate">Super Admin</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 px-1">
                  {loginRole === 'studio' && 'Accesso gestionale per dentisti: agenda, poltrone, referti e fatturazione.'}
                  {loginRole === 'patient' && 'Accesso per pazienti: visualizza i tuoi appuntamenti prenotati e promemoria.'}
                  {loginRole === 'super_admin' && 'Accesso alla console centrale di controllo per Diego Raimondi.'}
                </p>
              </div>

              {/* Login Error / Pending Alerts */}
              {loginError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginPendingNotice && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Richiesta in Approvazione</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {loginPendingNotice}
                  </p>
                </div>
              )}

              {/* Google 1-Click Button with Supabase Client Library */}
              <button
                type="button"
                onClick={handleSupabaseGoogleLogin}
                disabled={isSupabaseLoading}
                className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-300 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:border-slate-400 group disabled:opacity-50"
              >
                {isSupabaseLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span>Connessione Supabase Auth in corso...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>
                      {loginRole === 'studio'
                        ? 'Accedi allo Studio con Google (Supabase Auth)'
                        : loginRole === 'patient'
                        ? 'Accedi come Paziente con Google (Supabase Auth)'
                        : 'Accedi come Super Admin con Google (Supabase Auth)'}
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-200">
                      Supabase
                    </span>
                  </>
                )}
              </button>

              <div className="relative flex items-center my-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">oppure con credenziali</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email {loginRole === 'studio' ? 'dello Studio' : 'Amministratore'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder={loginRole === 'studio' ? 'es. segreteria@studiodentistico.it' : 'diegoraimondi7@gmail.com'}
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                    />
                  </div>
                </div>

                {/* Biometric Passkey for Super Admin Diego */}
                {loginRole === 'super_admin' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setLoginError(null);
                      try {
                        const targetEmail = 'diegoraimondi7@gmail.com';
                        const enrolled = getStoredPasskeys(targetEmail);
                        if (enrolled.length === 0) {
                          const enrollRes = await registerPasskey(targetEmail);
                          if (!enrollRes.success) {
                            setLoginError(enrollRes.error || 'Impossibile configurare l\'impronta digitale.');
                            return;
                          }
                        } else {
                          const authRes = await authenticateWithPasskey(targetEmail);
                          if (!authRes.success) {
                            setLoginError(authRes.error || 'Autenticazione biometrica non riuscita.');
                            return;
                          }
                        }
                        const res = loginSuperAdmin(targetEmail, 'Ssaazz124!');
                        if (res.success) {
                          onClose();
                        } else {
                          setLoginError(res.error || 'Accesso non autorizzato.');
                        }
                      } catch (err: any) {
                        setLoginError(err?.message || 'Errore durante la scansione biometrica');
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 shadow-sm cursor-pointer"
                  >
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span>Accedi con Impronta Digitale / Passkey Biometrica</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Accedi a PRISMAL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Bottom switch to register */}
              <div className="pt-2 text-center border-t border-slate-100">
                <span className="text-xs text-slate-500">Non hai ancora registrato il tuo studio? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegError(null);
                  }}
                  className="text-xs font-bold text-purple-700 hover:text-purple-800 underline cursor-pointer"
                >
                  Registrati adesso
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: REGISTRATI                                         */}
          {/* ========================================================= */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              {/* Stepper indicator */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  {regStep === 1 && 'Passo 1 di 3: Credenziali Studio'}
                  {regStep === 2 && 'Passo 2 di 3: Verifica Codice Email'}
                  {regStep === 3 && 'Passo 3 di 3: Informazioni Studio'}
                  {regStep === 4 && 'Registrazione Completata!'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${regStep >= 1 ? 'bg-purple-600' : 'bg-slate-200'}`} />
                  <span className={`w-2 h-2 rounded-full ${regStep >= 2 ? 'bg-purple-600' : 'bg-slate-200'}`} />
                  <span className={`w-2 h-2 rounded-full ${regStep >= 3 ? 'bg-purple-600' : 'bg-slate-200'}`} />
                  <span className={`w-2 h-2 rounded-full ${regStep === 4 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                </div>
              </div>

              {/* Reg Error */}
              {regError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {/* STEP 1: Email & Password or Google */}
              {regStep === 1 && (
                <div className="space-y-3.5">
                  {/* Google 1-Click Register */}
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleTarget('studio_register');
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
                    <span>Registrati con Google (Salta codice OTP)</span>
                  </button>

                  <div className="relative flex items-center my-2">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">oppure con email</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <form onSubmit={handleRegSendCode} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Email Aziendale dello Studio *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="es. segreteria@dentisticadello.it"
                        className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Crea una Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="Almeno 6 caratteri"
                        className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full py-3 rounded-xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Invio codice in corso...</span>
                        </>
                      ) : (
                        <>
                          <span>Continua con Verifica Email</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2: Verify OTP code */}
              {regStep === 2 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                    <p className="font-bold">Codice di verifica inviato!</p>
                    <p className="text-[11px] text-purple-800">
                      Abbiamo inviato un codice a 6 cifre a <strong>{regEmail}</strong>. Inseriscilo qui sotto per confermare la proprietà dell'indirizzo.
                    </p>
                  </div>

                  {resendStatus && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                      {resendStatus}
                    </div>
                  )}

                  <form onSubmit={handleRegVerifyOtp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 text-center">
                        Codice OTP a 6 cifre
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={regOtp}
                        onChange={e => setRegOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="block w-48 mx-auto text-center tracking-widest text-xl font-mono py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        ← Modifica email
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="font-bold text-purple-700 hover:text-purple-800 underline cursor-pointer"
                      >
                        Rinvia codice
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingOtp}
                      className="w-full py-3 rounded-xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifica in corso...</span>
                        </>
                      ) : (
                        <>
                          <span>Conferma e Configura Studio</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 3: Studio Details */}
              {regStep === 3 && (
                <form onSubmit={handleRegCompleteProfile} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nome della Clinica o Studio Dentistico *
                    </label>
                    <input
                      type="text"
                      required
                      value={regStudioName}
                      onChange={e => setRegStudioName(e.target.value)}
                      placeholder="es. Studio Dentistico Dello"
                      className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Città *
                      </label>
                      <input
                        type="text"
                        required
                        value={regCity}
                        onChange={e => setRegCity(e.target.value)}
                        placeholder="es. Dello (BS)"
                        className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Telefono Segreteria *
                      </label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="es. 030 971 8100"
                        className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Indirizzo (Via e Civico)
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={e => setRegAddress(e.target.value)}
                      placeholder="es. Via Roma 14"
                      className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                    />
                  </div>

                  {/* Logo preset selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Logo Studio
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {LOGO_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setRegLogoUrl(p.url)}
                          className={`p-1 rounded-xl border-2 transition overflow-hidden cursor-pointer ${
                            regLogoUrl === p.url ? 'border-purple-600 ring-2 ring-purple-200' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img src={p.url} alt={p.name} className="w-full h-10 object-cover rounded-lg" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Completa e Attiva Studio</span>
                  </button>
                </form>
              )}

              {/* STEP 4: Success confirmation */}
              {regStep === 4 && createdStudio && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Studio Registrato con Successo!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Il profilo per <strong>{createdStudio.name}</strong> è pronto all'uso.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setCurrentStudioId(createdStudio.id);
                        setCurrentRole('studio_admin');
                        setOnboardingStep('completed');
                      }}
                      className="w-full py-3 rounded-xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>Entra Subito nel Gestionale Studio</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Torna al Motore di Ricerca
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom switch to login */}
              {regStep !== 4 && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <span className="text-xs text-slate-500">Hai già uno studio registrato? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setLoginError(null);
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-800 underline cursor-pointer"
                  >
                    Accedi qui
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Google Account Chooser Modal */}
      <GoogleAccountChooserModal
        isOpen={isGoogleChooserOpen}
        onClose={() => setIsGoogleChooserOpen(false)}
        title={
          googleTarget === 'superadmin_login'
            ? 'Accesso Super Admin con Google'
            : googleTarget === 'studio_register'
            ? 'Registra Studio con Google'
            : 'Accedi allo Studio con Google'
        }
        subtitle="Seleziona l'account Google per procedere istantaneamente"
        onSelectAccount={handleGoogleAccountSelected}
      />
    </div>
  );
};
