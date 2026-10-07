import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PrismalLogo } from '../PrismalLogo';
import { GoogleAccountChooserModal } from './GoogleAccountChooserModal';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';
import { PlanType } from '../../types';
import { PRISMAL_PRIME_PRICE_MONTHLY } from '../../data/planTierDefinitions';
import {
  Mail,
  Lock,
  KeyRound,
  Building2,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  Loader2,
  UploadCloud,
  Trash2,
  FileCheck,
  Camera,
  CreditCard,
  Zap,
} from 'lucide-react';

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

export const StudioOnboarding: React.FC<{ onFinish?: () => void }> = ({ onFinish }) => {
  const {
    onboardingStep,
    setOnboardingStep,
    registrationDraftEmail,
    generatedVerificationCode,
    registerDraft,
    sendVerificationCodeAsync,
    verifyEmailCodeAsync,
    completeOnboarding,
    loginStudio,
    loginStudioCredentials,
    loginStudioWithGoogle,
    startStudioRegistrationWithGoogle,
    setCurrentStudioId,
    currentStudioId,
    studios,
    setAuthSession,
    setCurrentRole,
    setPatientViewingSlug,
  } = useApp();

  // Form states
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);

  // Step 2 verification code
  const [inputCode, setInputCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Step 3 Profile completion
  const [studioName, setStudioName] = useState('');
  const [selectedLogo, setSelectedLogo] = useState(LOGO_PRESETS[0].url);
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('prismal_prime');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [justCreatedStudio, setJustCreatedStudio] = useState<any>(null);

  // Step 4 Completed Studio info
  const [createdStudioSlug, setCreatedStudioSlug] = useState<string | null>(null);
  const [createdStudioId, setCreatedStudioId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Handle Step 1 Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Inserisci un indirizzo email valido.');
      return;
    }

    if (authMode === 'login') {
      if (!password) {
        setAuthError('Inserisci la password dello studio.');
        return;
      }
      const res = loginStudioCredentials(cleanEmail, password);
      if (res.success) {
        if (onFinish) onFinish();
      } else {
        setAuthError(res.error || 'Nessuno studio trovato con questa email. Clicca sulla scheda "Registrati" per creare il tuo studio.');
      }
    } else {
      // Step 1: Prevent duplicate registration with same email
      const isDuplicate = studios.some(s => (s.email || '').toLowerCase().trim() === cleanEmail.toLowerCase());
      if (isDuplicate) {
        setAuthError('Esiste già uno studio registrato con questa email. Clicca su "Accedi" per entrare nel gestionale.');
        return;
      }

      // Input email, generate secure OTP and dispatch via SMTP
      setIsSendingCode(true);
      try {
        const res = await sendVerificationCodeAsync(cleanEmail, password);
        if (!res.success) {
          setAuthError(res.error || 'Impossibile inviare il codice di verifica. Verifica la configurazione email.');
        }
      } catch (err: any) {
        setAuthError('Errore durante la connessione al servizio di invio codice.');
      } finally {
        setIsSendingCode(false);
      }
    }
  };

  // Handle Step 2 Verification Submit via Backend
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');

    const cleanCode = inputCode.trim();
    if (cleanCode.length !== 6) {
      setVerificationError('Inserisci il codice completo a 6 cifre.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyEmailCodeAsync(cleanCode);
      if (!res.success) {
        setVerificationError(res.error || 'Codice non valido o scaduto. Verifica la tua email.');
      }
    } catch {
      setVerificationError('Errore di comunicazione durante la verifica del codice.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    if (isResending || !registrationDraftEmail) return;
    setIsResending(true);
    setResendStatus(null);
    setVerificationError('');
    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationDraftEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus('Nuovo codice inviato via email! Controlla la tua casella di posta.');
        setTimeout(() => setResendStatus(null), 6000);
      } else {
        setResendStatus('Impossibile rinviare il codice. Riprova tra poco.');
      }
    } catch {
      setResendStatus('Errore durante il reinvio del codice.');
    } finally {
      setIsResending(false);
    }
  };

  // Process uploaded image file (JPG, PNG, WEBP, SVG)
  const processImageFile = (file: File) => {
    setUploadError('');
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const hasValidExt = file.name.match(/\.(jpg|jpeg|png|webp|svg)$/i);
    
    if (!validTypes.includes(file.type.toLowerCase()) && !hasValidExt) {
      setUploadError('Formato non supportato. Carica un file immagine in formato JPG, PNG, WEBP o SVG.');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setUploadError('Il file supera la dimensione massima consentita di 6 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImagePreview(reader.result);
        setUploadedFileName(file.name);
        setCustomLogoUrl('');
      }
    };
    reader.onerror = () => {
      setUploadError('Errore durante il caricamento del file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Step 3 Profile Submit
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim()) {
      setUploadError('Inserisci il nome dello studio dentistico per procedere.');
      return;
    }

    const finalLogo = uploadedImagePreview || customLogoUrl.trim() || selectedLogo;
    const cleanPhone = phone.trim() === '+39' ? '' : phone.trim();
    const newStudio = completeOnboarding({
      name: studioName.trim(),
      logoUrl: finalLogo,
      phone: cleanPhone,
      address: address.trim(),
      city: city.trim(),
      plan: selectedPlan,
    });

    setCreatedStudioSlug(newStudio.slug);
    setCreatedStudioId(newStudio.id);
    setJustCreatedStudio(newStudio);
    setPatientViewingSlug(newStudio.slug);
    setCurrentStudioId(newStudio.id);

    if (selectedPlan !== 'demo_free') {
      setShowCheckoutModal(true);
    }
  };

  const copyPatientLink = () => {
    const slug = createdStudioSlug || 'studio-dentistico';
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/punti/${encodeURIComponent(slug)}`
      : `https://prismal.app/punti/${encodeURIComponent(slug)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-purple-600 selection:text-white">
      {/* Return to portal button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={() => {
            setCurrentRole('landing');
            if (onFinish) onFinish();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold transition shadow-xs"
        >
          <span>← Torna alla Home</span>
        </button>
      </div>

      {/* Header with authentic PRISMAL branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="flex justify-center mb-4">
          <PrismalLogo size="md" variant="light" showText={true} layout="stacked" showSubtitle={false} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {onboardingStep === 'login' && (authMode === 'register' ? 'Registra il tuo Studio Dentistico' : 'Accedi al Gestionale')}
          {onboardingStep === 'verify_email' && 'Verifica la tua Email'}
          {onboardingStep === 'profile_setup' && 'Configura il tuo Studio'}
          {onboardingStep === 'completed' && 'Studio Registrato con Successo!'}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          {onboardingStep === 'login' && 'La piattaforma cloud per automatizzare le visite odontoiatriche 24/7'}
          {onboardingStep === 'verify_email' && `Inserisci il codice a 6 cifre inviato a ${registrationDraftEmail}`}
          {onboardingStep === 'profile_setup' && 'Pochi secondi per personalizzare il tuo minisito e iniziare a ricevere visite'}
          {onboardingStep === 'completed' && 'Il tuo profilo è pronto ed è in attesa di abilitazione dal Super Admin'}
        </p>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className={`w-2.5 h-2.5 rounded-full transition-all ${onboardingStep === 'login' ? 'bg-sky-600 w-7' : 'bg-slate-300'}`} />
          <span className={`w-2.5 h-2.5 rounded-full transition-all ${onboardingStep === 'verify_email' ? 'bg-sky-600 w-7' : 'bg-slate-300'}`} />
          <span className={`w-2.5 h-2.5 rounded-full transition-all ${onboardingStep === 'profile_setup' ? 'bg-sky-600 w-7' : 'bg-slate-300'}`} />
          <span className={`w-2.5 h-2.5 rounded-full transition-all ${onboardingStep === 'completed' ? 'bg-emerald-600 w-7' : 'bg-slate-300'}`} />
        </div>
      </div>

      {/* Main Form Card in Pure Light Theme */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="bg-white border border-slate-200/90 py-8 px-6 shadow-xl rounded-3xl sm:px-10 text-slate-800">
          
          {/* STEP 1: REGISTRAZIONE / ACCESSO (CHIARO) */}
          {onboardingStep === 'login' && (
            <div>
              {/* Tabs Registrati / Accedi */}
              <div className="flex border-b border-slate-200 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                    authMode === 'register'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Registrati (Nuovo Studio)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                    authMode === 'login'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Accedi a Studio Esistente
                </button>
              </div>

              {authError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {authError}
                </div>
              )}

              {/* Google Access / Registration for Studio */}
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setIsGoogleChooserOpen(true);
                }}
                className="w-full mb-4 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{authMode === 'register' ? 'Registrati con Google (Salta verifica OTP)' : 'Accedi al Gestionale con Google'}</span>
              </button>

              {/* Real Google Account Chooser Modal */}
              <GoogleAccountChooserModal
                isOpen={isGoogleChooserOpen}
                onClose={() => setIsGoogleChooserOpen(false)}
                title={authMode === 'register' ? 'Registra Studio con Google' : 'Accedi a PRISMAL con Google'}
                subtitle={authMode === 'register' ? 'Scegli un account Google per convalidare l\'email aziendale' : 'Scegli l\'account Google con cui hai registrato lo studio'}
                onSelectAccount={(account) => {
                  setAuthError('');
                  if (authMode === 'login') {
                    const res = loginStudioWithGoogle({ email: account.email, name: account.name });
                    if (res.success) {
                      if (onFinish) onFinish();
                    } else {
                      setAuthError(res.error || `Nessuno studio odontoiatrico registrato con l'account Google "${account.email}". Clicca sulla scheda "Registrati" per creare il tuo studio.`);
                    }
                  } else {
                    const res = startStudioRegistrationWithGoogle({ email: account.email, name: account.name });
                    if (res.success) {
                      const cleanName = account.name.toLowerCase().includes('studio')
                        ? account.name
                        : `Studio Odontoiatrico ${account.name}`;
                      setStudioName(cleanName);
                    } else {
                      setAuthError(res.error || 'Impossibile avviare la registrazione con questo account Google.');
                    }
                  }
                }}
              />

              <div className="relative flex mb-4 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">oppure con email aziendale</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Aziendale dello Studio *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="studio-auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="es. segreteria@studiodentistico.it"
                      className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-transparent text-xs sm:text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="studio-auth-password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-transparent text-xs sm:text-sm transition"
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl text-xs text-sky-800">
                    <span className="font-bold">Attivazione Gratuita:</span> Include 5 prenotazioni di prova e configurazione guidata del tuo minisito.
                  </div>
                )}

                <button
                  id="studio-auth-submit-btn"
                  type="submit"
                  disabled={isSendingCode}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:bg-sky-400 transition"
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generazione e Invio Codice via SMTP...</span>
                    </>
                  ) : authMode === 'register' ? (
                    <>
                      <span>Ricevi Codice di Verifica Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    'Accedi al Gestionale'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: VERIFICA EMAIL CON CODICE (CHIARO) */}
          {onboardingStep === 'verify_email' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-sky-200">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Inserisci il Codice di Verifica</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Abbiamo inviato un codice a 6 cifre all'indirizzo{' '}
                  <span className="text-sky-700 font-bold">{registrationDraftEmail}</span>
                </p>
              </div>

              {/* Informative real email dispatch notice */}
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-left mb-5">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-xs mb-1">
                  <Mail className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span>Codice di autorizzazione inviato alla tua casella</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Abbiamo inviato un codice OTP a 6 cifre a <strong className="text-slate-900 font-bold">{registrationDraftEmail}</strong>.
                  Inserisci il codice ricevuto per completare la verifica del tuo studio.
                </p>
                <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Importante per la ricezione:</strong>
                    I filtri automatici di Gmail potrebbero recapitare l'email nella cartella <strong>SPAM / Posta Indesiderata</strong> o nella scheda <strong>Promozioni</strong>.
                    {generatedVerificationCode && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span>Se l'email tarda ad arrivare, inserisci direttamente:</span>
                        <button
                          type="button"
                          onClick={() => setInputCode(generatedVerificationCode)}
                          className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-mono font-bold transition cursor-pointer"
                        >
                          {generatedVerificationCode} (Clicca per inserire)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {resendStatus && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{resendStatus}</span>
                </div>
              )}

              {verificationError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {verificationError}
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    Codice di Verifica a 6 Cifre
                  </label>
                  <input
                    id="verification-code-input"
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="block w-full text-center tracking-widest font-mono text-3xl py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-300 focus:bg-white focus:border-sky-600 focus:outline-none transition"
                  />
                </div>

                <button
                  id="verify-code-btn"
                  type="submit"
                  disabled={isVerifying}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:bg-sky-400 transition"
                >
                  {isVerifying ? (
                    <span>Verifica in corso...</span>
                  ) : (
                    <>
                      <span>Verifica Codice e Continua</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-sky-700 hover:text-sky-900 font-bold transition disabled:text-slate-400"
                >
                  {isResending ? 'Invio in corso...' : 'Non hai ricevuto il codice? Invia di nuovo'}
                </button>

                <button
                  type="button"
                  onClick={() => setOnboardingStep('login')}
                  className="text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  ← Cambia email
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETAMENTO PROFILO STUDIO (CHIARO) */}
          {onboardingStep === 'profile_setup' && (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {/* Verified Badge */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 block">Email Validata con Successo</span>
                    <span className="text-emerald-700 font-mono text-[11px]">{registrationDraftEmail}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 text-[10px] font-bold">
                  ✓ Verificato
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome dello Studio Odontoiatrico *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    id="setup-studio-name"
                    type="text"
                    required
                    value={studioName}
                    onChange={e => setStudioName(e.target.value)}
                    placeholder="es. Studio Dentistico San Lorenzo"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Selezione e Caricamento Logo / Immagine Profilo Studio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Foto Profilo o Logo dello Studio *</span>
                  <span className="text-[10px] text-sky-600 font-semibold normal-case">Formati: JPG, PNG, WEBP, SVG</span>
                </label>

                {/* Hidden Native File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                />

                {/* UPLOAD CARD / PREVIEW */}
                {uploadedImagePreview ? (
                  <div className="bg-sky-50/70 border-2 border-sky-300 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={uploadedImagePreview}
                        alt="Anteprima Logo Caricato"
                        className="w-16 h-16 rounded-xl object-cover border border-sky-200 shadow-sm flex-shrink-0 bg-white"
                      />
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Foto Profilo Studio Caricata
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                          {uploadedFileName || 'immagine-profilo-studio.jpg'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Pronta per il minisito e la scheda dello studio
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition shadow-2xs"
                      >
                        Cambia
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedImagePreview('');
                          setUploadedFileName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Rimuovi immagine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-sky-500 bg-sky-50/80 scale-[1.01]'
                        : 'border-slate-300 hover:border-sky-500 bg-slate-50/70 hover:bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 shadow-2xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        Carica l'immagine o il logo del tuo studio
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Trascina qui il file oppure <span className="text-sky-600 font-semibold underline">sfoglia dal tuo computer</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Formati supportati: JPG, PNG, WEBP, SVG (fino a 6 MB)
                    </span>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>⚠️ {uploadError}</span>
                  </p>
                )}

                {/* Presets di backup o URL se non ha ancora il file */}
                <div className="mt-3">
                  <details className="group">
                    <summary className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer list-none flex items-center gap-1">
                      <span>▸ Oppure scegli un'immagine predefinita o inserisci un URL web</span>
                    </summary>
                    <div className="pt-3 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {LOGO_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedLogo(preset.url);
                              setCustomLogoUrl('');
                              setUploadedImagePreview('');
                              setUploadedFileName('');
                            }}
                            className={`relative rounded-xl p-2 border-2 transition text-center flex flex-col items-center gap-1.5 ${
                              selectedLogo === preset.url && !uploadedImagePreview && !customLogoUrl
                                ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-500/20'
                                : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <span className="text-[10px] text-slate-700 truncate w-full font-medium">
                              {preset.name}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <ImageIcon className="h-3.5 w-3.5" />
                        </div>
                        <input
                          type="url"
                          value={customLogoUrl}
                          onChange={e => {
                            setCustomLogoUrl(e.target.value);
                            setUploadedImagePreview('');
                          }}
                          placeholder="Incolla l'URL web del logo (https://...)"
                          className="block w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {/* Informazioni Contatto Studio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefono Studio (Opzionale)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="es. 02 1234567"
                      className="block w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Città (Opzionale)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="es. Milano (MI)"
                      className="block w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Indirizzo Studio (Opzionale)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="es. Via Alessandro Manzoni 24"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              {/* Selezione Piano di Attivazione: PRISMAL Prime */}
              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl border-2 border-purple-600 bg-purple-50/70 shadow-xs relative">
                  <div className="absolute -top-2.5 right-3 bg-purple-700 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    30 Giorni di Prova Gratis
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-black text-slate-900">PRISMAL Prime</strong>
                      <span className="font-sans text-sm font-black text-purple-900">€{PRISMAL_PRIME_PRICE_MONTHLY}/mese</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                      Accesso completo a tutte le funzioni cloud: appuntamenti illimitati, triage pazienti, odontogramma 3D, sincronizzazione Outlook e Google Calendar.
                    </p>
                    <div className="mt-2.5 pt-2.5 border-t border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-purple-900 font-medium">
                      <span>✓ Google Pay, PayPal o Carta a <strong>0,00€</strong> (nessun addebito oggi)</span>
                      <span>✓ Disdetta con 1 click senza penali</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="complete-profile-btn"
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-xs sm:text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 transition cursor-pointer"
              >
                <span>Collega Metodo di Pagamento e Inizia 30gg Gratis (0,00€)</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </button>
            </form>
          )}

          {/* STEP 4: REGISTRAZIONE COMPLETATA (CHIARO) */}
          {onboardingStep === 'completed' && (
            <div className="text-center py-2">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-900">Profilo Studio Creato!</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Il tuo gestionale è stato generato ed è pronto con il link dedicato per le prenotazioni dei tuoi pazienti.
              </p>

              {/* Generated link preview */}
              <div className="mt-5 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Link Dedicato Pazienti (da incollare su Google Maps o Instagram):
                </span>
                <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
                  <span className="font-mono text-xs text-sky-700 truncate font-semibold">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/punti/${encodeURIComponent(createdStudioSlug || 'studio')}`
                      : `prismal.app/punti/${createdStudioSlug || 'studio'}`}
                  </span>
                  <button
                    onClick={copyPatientLink}
                    className="flex items-center gap-1 text-xs text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold transition"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (createdStudioSlug) {
                        const targetUrl = `/punti/${encodeURIComponent(createdStudioSlug)}`;
                        window.open(targetUrl, '_blank');
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-white hover:bg-sky-50 text-sky-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-sky-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Testa Minisito Paziente in una Nuova Scheda</span>
                  </button>
                </div>

                {/* Security and 30-day trial notice */}
                <div className="mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-purple-900 leading-relaxed">
                    <strong>30 Giorni di Prova Gratuita Configurato:</strong> La tua prova è attiva con accesso illimitato alle funzionalità cloud. La verifica carta a 0,00€ è stata registrata. Tra 30 giorni potrai proseguire a €149/mese oppure disdire con un click dal pannello di gestione.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  id="go-to-studio-dashboard-btn"
                  type="button"
                  onClick={() => {
                    const studio = studios.find(s => s.slug === createdStudioSlug) ||
                                  studios.find(s => s.id === createdStudioId) ||
                                  studios.find(s => s.id === currentStudioId) ||
                                  (studios.length > 0 ? studios[0] : null);
                    if (studio) {
                      setCurrentStudioId(studio.id);
                      setAuthSession({
                        role: 'studio_admin',
                        email: studio.email,
                        studioId: studio.id,
                        studioName: studio.name,
                      });
                    }
                    setOnboardingStep('completed');
                    setCurrentRole('studio_admin');
                    if (onFinish) onFinish();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 transition shadow-sm cursor-pointer"
                >
                  Entra nel Gestionale Studio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingStep('login');
                    setCurrentRole('landing');
                    if (onFinish) onFinish();
                  }}
                  className="py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition shadow-xs cursor-pointer"
                >
                  Torna alla Home
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Payment Checkout Modal during onboarding */}
      {showCheckoutModal && (
        <PaymentCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          targetPlanId="prismal_prime"
          isTrialVerification={true}
          overrideStudio={
            justCreatedStudio ||
            studios.find(s => s.id === createdStudioId) ||
            studios.find(s => s.slug === createdStudioSlug)
          }
          onPaymentSuccess={() => {
            setShowCheckoutModal(false);
          }}
        />
      )}
    </div>
  );
};
