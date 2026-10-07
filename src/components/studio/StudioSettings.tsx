import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ThemeToggle } from '../common/ThemeToggle';
import {
  Share2,
  Copy,
  ExternalLink,
  Check,
  Building2,
  Phone,
  MapPin,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Globe,
  Mail,
  KeyRound,
  LogOut,
  Sliders,
  CheckCircle2,
  UploadCloud,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';

export const StudioSettings: React.FC = () => {
  const {
    activeStudio,
    updateStudioProfile,
    openPatientBooking,
    logout,
  } = useApp();

  if (!activeStudio) {
    return <div className="p-8 text-center text-slate-500">Nessuno studio attivo selezionato.</div>;
  }

  const [name, setName] = useState(activeStudio.name);
  const [slug, setSlug] = useState(activeStudio.slug);
  const [email, setEmail] = useState(activeStudio.email);
  const [websiteUrl, setWebsiteUrl] = useState(activeStudio.websiteUrl || '');
  const [phone, setPhone] = useState(activeStudio.phone || '');
  const [address, setAddress] = useState(activeStudio.address || '');
  const [city, setCity] = useState(activeStudio.city || '');
  const [logoUrl, setLogoUrl] = useState(activeStudio.logoUrl);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(activeStudio.twoFactorEnabled ?? false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleImageFile = (file: File) => {
    setUploadError('');
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const hasValidExt = file.name.match(/\.(jpg|jpeg|png|webp|svg)$/i);
    
    if (!validTypes.includes(file.type.toLowerCase()) && !hasValidExt) {
      setUploadError('Formato non supportato. Carica un file JPG, PNG, WEBP o SVG.');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setUploadError('Il file supera la dimensione massima di 6 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prismal.app';
  const fullBookingUrl = `${origin}/punti/${slug || activeStudio.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullBookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean and validate slug
    const cleanedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || activeStudio.slug;

    updateStudioProfile(activeStudio.id, {
      name: name.trim(),
      slug: cleanedSlug,
      email: email.trim(),
      websiteUrl: websiteUrl.trim(),
      phone: phone.trim() === '+39' ? '' : phone.trim(),
      address: address.trim(),
      city: city.trim(),
      logoUrl: logoUrl.trim(),
      twoFactorEnabled,
    });

    setSlug(cleanedSlug);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isPending = activeStudio.status === 'pending';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Selezione Aspetto / Tema Applicativo (Chiaro, Scuro, Sistema) - Apple Glass Style */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Sun className="w-4 h-4" />
              Aspetto Visivo e Tema Grafico
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Modalità Chiaro / Scuro</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Scegli come visualizzare l'interfaccia di gestione dello studio. Il tema scelto si applica all'intera area amministrativa e a tutte le schermate.
            </p>
          </div>

          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* 2. Minisito Paziente & URL Condivisibile - Apple Glass Style */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Share2 className="w-4 h-4" />
              Minisito di Prenotazione Paziente Indipendente
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-1 text-slate-900 dark:text-white">Link Diretto Minisito</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
              Questo è il portale pubblico autonomo dedicato esclusivamente ai pazienti. Incollalo su Google Maps, nella bio di Instagram o invialo via WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openPatientBooking(activeStudio.slug, true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold text-white transition shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Apri in Nuova Finestra
            </button>
          </div>
        </div>

        {/* Link Box with Apple-style frosted glass */}
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md border border-slate-200/90 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-2 overflow-hidden shadow-xs">
            <span className="font-mono text-xs sm:text-sm text-sky-700 dark:text-sky-300 font-medium truncate">
              {fullBookingUrl}
            </span>
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia</span>
                </>
              )}
            </button>
          </div>

          <a
            href={`https://wa.me/?text=Prenota%20la%20tua%20visita%20presso%20${encodeURIComponent(
              activeStudio.name
            )}%20direttamente%20online:%20${encodeURIComponent(fullBookingUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition shadow-sm whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4" />
            Condividi WhatsApp
          </a>
        </div>

        {isPending && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Studio in attesa di approvazione centrale:</strong>{' '}
              Il link è pronto e visibile in anteprima, ma sarà attivato ufficialmente non appena il Super Admin approverà lo studio.
            </div>
          </div>
        )}
      </div>

      {/* 3. Modulo Impostazioni Complete dello Studio - Apple Glass Style */}
      <form onSubmit={handleSave} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8 space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Parametri e Profilo dello Studio</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalizza nome, indirizzo web personalizzato, recapiti e credenziali.
            </p>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Modifiche Salvate!</span>
              </>
            ) : (
              <span>Salva Impostazioni</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Studio Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nome dello Studio Odontoiatrico *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="es. Studio Dentistico Dott. Rossi"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>

          {/* Minisite Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nome / Slug Minisito Paziente *
            </label>
            <div className="relative">
              <span className="text-xs text-slate-400 font-mono absolute left-3.5 top-1/2 -translate-y-1/2">
                /punti/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="mio-studio-dentistico"
                className="w-full pl-18 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Determina il link pubblico con cui i pazienti aprono la pagina di prenotazione.
            </span>
          </div>

          {/* Official Website URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Sito Web Ufficiale dello Studio (Opzionale)
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="es. https://www.studiorossi.it"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Se inserito, un link diretto al tuo sito web comparirà nella testata del minisito paziente.
            </span>
          </div>

          {/* Studio Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email di Contatto / Notifiche Studio *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="studio@dentista.it"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Studio Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Numero di Telefono Pazienti (Opzionale)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="es. 02 1234567 oppure 340 1234567"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Lascia vuoto se non desideri mostrare il telefono nel minisito. Non viene aggiunto nessun prefisso automatico.
            </span>
          </div>

          {/* Studio Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Indirizzo (Opzionale)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="es. Via Alessandro Manzoni 14"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Studio City */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Città (Opzionale)
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="es. Milano (MI)"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Logo / Cover Image */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Foto Profilo o Logo dello Studio
              </label>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">JPG, PNG, WEBP, SVG supportati</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="w-16 h-16 rounded-2xl object-cover border border-slate-300 dark:border-slate-600 shadow-sm flex-shrink-0 bg-white dark:bg-slate-700"
              />
              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-xl transition shadow-2xs"
                  >
                    <UploadCloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Carica Immagine dal Computer
                  </button>
                  <span className="text-[11px] text-slate-400">oppure inserisci un URL web sotto</span>
                </div>

                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">⚠️ {uploadError}</p>
            )}
          </div>

          {/* Two-Factor Authentication Toggle */}
          <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Autenticazione a Due Fattori (2FA)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Richiede un codice OTP inviato via email a ogni nuovo accesso per proteggere i dati sanitari.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={e => setTwoFactorEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* 4. Zona Sicurezza & Logout dello Studio */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm p-6 sm:p-8 space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-rose-100 dark:border-rose-900/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Disconnessione e Chiusura Sessione
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              La disconnessione è posizionata qui per evitare uscite accidentali durante la navigazione del gestionale.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-600 dark:text-slate-300 max-w-md">
            Per garantire la conformità GDPR e la protezione dei dati dei pazienti, disconnetti sempre la sessione quando lasci la postazione di segreteria o sala operatoria.
          </div>

          {confirmLogout ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Conferma Disconnessione
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 hover:border-rose-200 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Disconnetti Studio</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
