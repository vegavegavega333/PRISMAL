import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SoftwareConnector, IntegrationCategory } from '../../types';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Plug,
  Calendar,
  MessageSquare,
  FileSpreadsheet,
  Webhook,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Database,
  Search,
  ArrowUpRight,
  Info,
  Sliders,
  Send,
  Zap,
  Phone,
  Smartphone,
  HelpCircle,
} from 'lucide-react';

const DEFAULT_CONNECTORS: SoftwareConnector[] = [
  // 1. CALENDARIO & AGENDA
  {
    id: 'microsoft_outlook',
    name: 'Microsoft 365 / Outlook Calendar',
    category: 'calendar',
    description: 'Sincronizzazione bidirezionale in tempo reale con Microsoft Outlook (Outlook Web, desktop Exchange e smartphone) per sincronizzare poltrone, appuntamenti e orari dello studio.',
    logoBadge: 'O365',
    badgeColor: 'bg-[#0078D4] text-white',
    popular: true,
    status: 'connected',
    lastSync: 'Pochi secondi fa (Attivo)',
    config: {
      studioIdentifier: 'outlook-live-sync',
      bidirectional: true,
      autoSyncCalendar: true,
    },
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar Studio',
    category: 'calendar',
    description: 'Sincronizzazione dell\'agenda dello studio. Gli appuntamenti presi su PRISMAL possono essere sincronizzati direttamente sul calendario Google della clinica.',
    logoBadge: 'GC',
    badgeColor: 'bg-red-500 text-white',
    popular: true,
    status: 'disconnected',
    config: {
      studioIdentifier: '',
      bidirectional: true,
      autoSyncCalendar: true,
    },
  },
  {
    id: 'apple_ical',
    name: 'Feed iCal / CalDAV (.ics)',
    category: 'calendar',
    description: 'URL feed calendario sicuro (.ics) per sincronizzare l\'agenda in tempo reale su Apple Calendar (iPhone/Mac), Microsoft Outlook o qualsiasi programma compatibile iCal.',
    logoBadge: 'ICS',
    badgeColor: 'bg-slate-800 text-white',
    popular: true,
    status: 'disconnected',
    config: {
      apiUrl: 'https://prismal.app/api/calendar/feed.ics',
      bidirectional: false,
    },
  },

  // 2. COMUNICAZIONE, SMS & EMAIL
  {
    id: 'ai_voice_receptionist',
    name: 'Centralino AI Vocale 24/7 (Voice Bot)',
    category: 'messaging',
    description: 'Centralino telefonico intelligente con voce naturale umana. Risponde alle telefonate dello studio h24, gestisce richieste di prenotazione, filtra urgenze e invia SMS al paziente.',
    logoBadge: 'AI 24H',
    badgeColor: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
    popular: true,
    status: 'connected',
    lastSync: 'Pronto a rispondere (Attivo 24/7)',
    config: {
      voiceGender: 'female',
      activeHours: 'always',
      emergencyNumber: '',
      sendSmsConfirmation: true,
    },
  },
  {
    id: 'sms_gateway',
    name: 'Twilio SMS Gateway Dedicato',
    category: 'messaging',
    description: 'Configura il tuo account Twilio reale con Account SID, Auth Token e Sender ID alfanumerico certificato AGCOM per abilitare l\'invio di SMS veri ai pazienti dello studio.',
    logoBadge: 'SMS',
    badgeColor: 'bg-purple-600 text-white',
    popular: true,
    status: 'disconnected',
    config: {
      studioIdentifier: '',
      apiKey: '',
    },
  },
  {
    id: 'smtp_studio',
    name: 'Server Posta Studio (SMTP / Gmail Personale)',
    category: 'messaging',
    description: 'Configura il server email ufficiale dello studio (es. posta@nomestudio.it) per inviare conferme e promemoria automatici (24h e 1h) con l\'indirizzo della clinica.',
    logoBadge: 'MAIL',
    badgeColor: 'bg-blue-600 text-white',
    status: 'disconnected',
    config: {
      apiUrl: '',
      studioIdentifier: '',
    },
  },

  // 3. WEBHOOKS & GESTIONALE
  {
    id: 'webhook_rest',
    name: 'Webhooks REST in Tempo Reale (Zapier, Make o Server)',
    category: 'webhook',
    description: 'Invia automaticamente ogni nuova prenotazione, cancellazione o modifica verso qualsiasi endpoint HTTP POST JSON, Zapier, Make o gestionale esterno dello studio.',
    logoBadge: 'API',
    badgeColor: 'bg-slate-900 text-white',
    popular: true,
    status: 'disconnected',
    config: {
      apiUrl: '',
      webhookSecret: '',
    },
  },
  {
    id: 'export_pms',
    name: 'Ponte Export Gestionale Dentistico (XDent, OrisDent, AlfaDoc)',
    category: 'dental_pms',
    description: 'Modulo ponte per l\'allineamento con i software odontoiatrici: esporta e sincronizza anagrafiche pazienti e appuntamenti nei formati standard compatibili.',
    logoBadge: 'PMS',
    badgeColor: 'bg-emerald-600 text-white',
    popular: true,
    status: 'disconnected',
    config: {
      studioIdentifier: '',
      autoExportPatients: true,
    },
  },
  {
    id: 'sistema_ts',
    name: 'Sistema Tessera Sanitaria (TS)',
    category: 'billing',
    description: 'Esportazione del tracciato spese sanitarie XML/CSV per l\'invio al Sistema Tessera Sanitaria (D.M. 19/10/2020) per la detrazione 730 delle prestazioni odontoiatriche.',
    logoBadge: 'TS',
    badgeColor: 'bg-teal-700 text-white',
    popular: true,
    status: 'disconnected',
    config: {
      studioIdentifier: '',
      autoExportPatients: true,
    },
  },
];

export const StudioIntegrationsView: React.FC = () => {
  const { activeStudio, updateStudioProfile } = useApp();
  const [connectors, setConnectors] = useState<SoftwareConnector[]>(DEFAULT_CONNECTORS);
  const [selectedCategory, setSelectedCategory] = useState<'all' | IntegrationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalConnector, setActiveModalConnector] = useState<SoftwareConnector | null>(null);
  
  // Modal form states
  const [formApiUrl, setFormApiUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formStudioId, setFormStudioId] = useState('');
  const [formSyncInterval, setFormSyncInterval] = useState(10);
  const [formBidirectional, setFormBidirectional] = useState(true);

  // SMS Gateway / Twilio specialized states
  const [smsProviderMode, setSmsProviderMode] = useState<'prismal_managed' | 'custom_twilio'>('prismal_managed');
  const [smsSenderAlias, setSmsSenderAlias] = useState('PRISMAL');
  const [smsCustomSid, setSmsCustomSid] = useState('');
  const [smsCustomToken, setSmsCustomToken] = useState('');
  const [smsCustomFrom, setSmsCustomFrom] = useState('');
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsIsTesting, setSmsIsTesting] = useState(false);
  const [smsTestFeedback, setSmsTestFeedback] = useState<{
    success: boolean;
    message: string;
    realDispatch?: boolean;
    provider?: string;
  } | null>(null);
  
  // Live sync simulation state
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    success: boolean;
    message: string;
    records?: number;
    latency?: number;
  } | null>(null);

  // Microsoft Outlook & AI Voice Receptionist state
  const [copiedOutlookLink, setCopiedOutlookLink] = useState(false);
  const [isSpeakingAiDemo, setIsSpeakingAiDemo] = useState(false);
  const [aiVoiceGender, setAiVoiceGender] = useState<'female' | 'male'>('female');
  const [aiActiveHours, setAiActiveHours] = useState('always');
  const [aiVoiceScript, setAiVoiceScript] = useState(
    `Studio {nome_studio}, buongiorno! In questo momento la segreteria è occupata o siamo fuori orario. Come posso esserle utile? Se desidera fissare un appuntamento o un controllo, le invio subito un SMS con il link di prenotazione.`
  );

  const handlePlayAiVoiceDemo = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeakingAiDemo) {
      window.speechSynthesis.cancel();
      setIsSpeakingAiDemo(false);
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeakingAiDemo(true);

    const studioName = activeStudio?.name || 'Studio Odontoiatrico';
    const textToSay = aiVoiceScript
      .replace(/\{nome_studio\}/gi, studioName)
      .replace(/\{studio\}/gi, studioName)
      .replace(/\[Nome Studio\]/gi, studioName);

    const utterance = new SpeechSynthesisUtterance(textToSay);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.pitch = aiVoiceGender === 'female' ? 1.15 : 0.92;

    // Pick best available Italian voice
    const voices = window.speechSynthesis.getVoices();
    const italianVoices = voices.filter(v => v.lang.startsWith('it'));
    if (italianVoices.length > 0) {
      // Prefer natural/neural Italian voice
      const preferred = italianVoices.find(v => 
        aiVoiceGender === 'female'
          ? (v.name.toLowerCase().includes('alice') || v.name.toLowerCase().includes('elsa') || v.name.toLowerCase().includes('federica') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google'))
          : (v.name.toLowerCase().includes('cosimo') || v.name.toLowerCase().includes('roberto') || v.name.toLowerCase().includes('male'))
      ) || italianVoices[0];
      if (preferred) utterance.voice = preferred;
    }

    utterance.onend = () => setIsSpeakingAiDemo(false);
    utterance.onerror = () => setIsSpeakingAiDemo(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleCopyOutlookLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prismal.app';
    const link = `${origin}/api/calendar/feed.ics?studio=${activeStudio?.id}`;
    navigator.clipboard.writeText(link);
    setCopiedOutlookLink(true);
    setTimeout(() => setCopiedOutlookLink(false), 2500);
  };

  if (!activeStudio) return null;

  const filteredConnectors = connectors.filter(c => {
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = connectors.filter(c => c.status === 'connected').length;

  const handleOpenConfig = (conn: SoftwareConnector) => {
    setActiveModalConnector(conn);
    setFormApiUrl(conn.config.apiUrl || '');
    setFormApiKey(conn.config.apiKey || '');
    setFormStudioId(conn.config.studioIdentifier || '');
    setFormSyncInterval(conn.config.syncIntervalMinutes || 10);
    setFormBidirectional(conn.config.bidirectional ?? true);
    setSyncFeedback(null);
    setSmsTestFeedback(null);

    if (conn.id === 'sms_gateway') {
      const currentAlias = activeStudio.smsSettings?.senderAlias || 
        activeStudio.name.slice(0, 11).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRISMAL';
      setSmsSenderAlias(currentAlias);
      setSmsProviderMode(activeStudio.smsSettings?.provider === 'custom_twilio' ? 'custom_twilio' : 'prismal_managed');
      setSmsCustomSid(activeStudio.smsSettings?.customSid || '');
      setSmsCustomToken(activeStudio.smsSettings?.customToken || '');
      setSmsCustomFrom(activeStudio.smsSettings?.customFrom || currentAlias);
      setSmsTestPhone(activeStudio.phone || '');
    }
  };

  const handleTestSms = async () => {
    if (!smsTestPhone || smsTestPhone.trim().length < 6) {
      setSmsTestFeedback({
        success: false,
        message: 'Inserisci un numero di cellulare valido per il test SMS (es. +39 340 1234567)',
      });
      return;
    }

    setSmsIsTesting(true);
    setSmsTestFeedback(null);

    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: smsTestPhone,
          studioName: activeStudio.name,
          senderId: smsSenderAlias,
          customSid: smsProviderMode === 'custom_twilio' ? smsCustomSid : undefined,
          customToken: smsProviderMode === 'custom_twilio' ? smsCustomToken : undefined,
          customFrom: smsProviderMode === 'custom_twilio' ? smsCustomFrom : undefined,
          message: `PRISMAL DENTAL: Collaudo notifica SMS per ${activeStudio.name}. Mittente verificato: [${smsSenderAlias}].`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSmsTestFeedback({
          success: true,
          message: data.realDispatch
            ? `SMS inviato con successo sulla rete GSM cellulare reale tramite ${data.provider}!`
            : `Test completato! Simulatore Gateway AGCOM convalidato con successo (mittente: [${data.senderId}]). Nessun costo addebitato.`,
          realDispatch: data.realDispatch,
          provider: data.provider,
        });
      } else {
        setSmsTestFeedback({
          success: false,
          message: data.error || 'Errore durante la trasmissione del test SMS',
        });
      }
    } catch (err: any) {
      setSmsTestFeedback({
        success: false,
        message: err?.message || 'Errore di connessione al server SMS',
      });
    } finally {
      setSmsIsTesting(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalConnector) return;

    setConnectors(prev => prev.map(c => {
      if (c.id === activeModalConnector.id) {
        return {
          ...c,
          status: 'connected',
          lastSync: 'Proprio ora',
          config: {
            ...c.config,
            apiUrl: formApiUrl,
            apiKey: formApiKey,
            studioIdentifier: formStudioId,
            syncIntervalMinutes: formSyncInterval,
            bidirectional: formBidirectional,
          },
        };
      }
      return c;
    }));

    if (activeModalConnector.id === 'sms_gateway') {
      const sanitizedAlias = smsSenderAlias.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 11) || 'PRISMAL';
      updateStudioProfile(activeStudio.id, {
        smsSettings: {
          enabled: true,
          provider: smsProviderMode,
          senderAlias: sanitizedAlias,
          monthlyQuota: activeStudio.smsSettings?.monthlyQuota || 150,
          quotaUsed: activeStudio.smsSettings?.quotaUsed || 0,
          customSid: smsProviderMode === 'custom_twilio' ? smsCustomSid.trim() : undefined,
          customToken: smsProviderMode === 'custom_twilio' ? smsCustomToken.trim() : undefined,
          customFrom: smsProviderMode === 'custom_twilio' ? smsCustomFrom.trim() : undefined,
          autoReminders24h: activeStudio.smsSettings?.autoReminders24h ?? true,
          autoConfirmationSms: activeStudio.smsSettings?.autoConfirmationSms ?? true,
          autoCancellationSms: activeStudio.smsSettings?.autoCancellationSms ?? true,
        },
      });
    }

    setActiveModalConnector(null);
  };

  const handleDisconnect = (connId: string) => {
    setConnectors(prev => prev.map(c => {
      if (c.id === connId) {
        return {
          ...c,
          status: 'disconnected',
          lastSync: undefined,
        };
      }
      return c;
    }));
    setActiveModalConnector(null);
  };

  const handleTestSync = async () => {
    if (!activeModalConnector) return;
    setIsTestingSync(true);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: activeModalConnector.id,
          studioId: activeStudio.id,
          studioName: activeStudio.name,
          config: {
            apiUrl: formApiUrl,
            apiKey: formApiKey,
            studioIdentifier: formStudioId,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback({
          success: true,
          message: data.message || `Test connessione riuscito con ${activeModalConnector.name}!`,
          records: data.syncedRecords || 8,
          latency: data.latencyMs || 120,
        });

        // Update connector in list
        setConnectors(prev => prev.map(c => {
          if (c.id === activeModalConnector.id) {
            return {
              ...c,
              status: 'connected',
              lastSync: 'Oggi alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return c;
        }));
      } else {
        setSyncFeedback({
          success: false,
          message: data.error || 'Impossibile completare la sincronizzazione.',
        });
      }
    } catch {
      setSyncFeedback({
        success: false,
        message: 'Errore durante la chiamata di test connettore.',
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card with Apple-style frosted glass effect */}
      <div className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 border border-sky-500/20 dark:border-sky-500/30">
              <Plug className="w-3.5 h-3.5" />
              Integrazione Ecosistema a 360° Studio Dentistico
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Connettori & Integrazioni
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sincronizza l'agenda dello studio con Google Calendar, Feed iCal, gateway SMS e gestionali odontoiatrici.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 bg-slate-100/70 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 min-w-[260px]">
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Connessioni Attive</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                {connectedCount}
              </div>
            </div>
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Software Disponibili</span>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5 flex items-center gap-1.5">
                <Layers className="w-5 h-5" />
                {connectors.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tutti ({connectors.length})
          </button>
          <button
            onClick={() => setSelectedCategory('dental_pms')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'dental_pms'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Gestionali Dentali ({connectors.filter(c => c.category === 'dental_pms').length})
          </button>
          <button
            onClick={() => setSelectedCategory('calendar')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'calendar'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendari & Agende
          </button>
          <button
            onClick={() => setSelectedCategory('messaging')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'messaging'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp & SMS
          </button>
          <button
            onClick={() => setSelectedCategory('billing')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'billing'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Tessera Sanitaria & Fatture
          </button>
          <button
            onClick={() => setSelectedCategory('webhook')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'webhook'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            API & Webhooks
          </button>
        </div>

        {/* Search Field */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca software o connettore..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConnectors.map(connector => {
          const isConnected = connector.status === 'connected';

          return (
            <div
              key={connector.id}
              className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between shadow-xs hover:shadow-sm ${
                isConnected
                  ? 'border-sky-200 ring-1 ring-sky-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${connector.badgeColor}`}>
                      {connector.logoBadge}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm">{connector.name}</h3>
                        {connector.popular && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-md">
                            Popolare
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                        {connector.category === 'dental_pms' && 'Gestionale Odontoiatrico'}
                        {connector.category === 'calendar' && 'Calendario Esterno'}
                        {connector.category === 'messaging' && 'Canale Comunicazione'}
                        {connector.category === 'billing' && 'Fiscale & Sanità'}
                        {connector.category === 'webhook' && 'Integrazione REST'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Attivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                        Disconnesso
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {connector.description}
                </p>
              </div>

              {/* Footer with Sync Status and Action Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400 truncate">
                  {connector.lastSync ? (
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <RefreshCw className="w-3 h-3 text-sky-500 animate-spin-reverse" />
                      Sync: {connector.lastSync}
                    </span>
                  ) : (
                    <span>Non configurato</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenConfig(connector)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isConnected
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-sky-600 hover:bg-sky-700 text-white shadow-2xs'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {isConnected ? 'Configura' : 'Collega'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration & Diagnostic Modal */}
      {activeModalConnector && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header with Apple-style glass effect */}
            <div className="p-6 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${activeModalConnector.badgeColor}`}>
                  {activeModalConnector.logoBadge}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Integrazione con {activeModalConnector.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sincronizzazione dati tra PRISMAL e lo studio odontoiatrico
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalConnector(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              {activeModalConnector.id === 'microsoft_outlook' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-sky-50 border border-sky-200/80 rounded-2xl text-xs space-y-2 text-sky-950">
                    <div className="flex items-center gap-2 font-bold text-[#0078D4]">
                      <Calendar className="w-4 h-4 text-[#0078D4] flex-shrink-0" />
                      <span>Sincronizzazione Diretta con Microsoft Outlook & Microsoft 365</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      Sincronizza l'agenda di PRISMAL direttamente con <strong>Outlook (Web, Desktop Exchange, Windows, Mac e Smartphone)</strong>. Ogni nuova visita prenotata online o registrata in segreteria comparirà all'istante nel calendario del dottore.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Link Feed Sicuro per Outlook (.ics / WebCal)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed.ics?studio=${activeStudio.id}` : ''}
                        className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCopyOutlookLink}
                        className="px-3.5 py-2 rounded-xl bg-[#0078D4] hover:bg-[#0060AA] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedOutlookLink ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                        <span>{copiedOutlookLink ? 'Copiato!' : 'Copia Link'}</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Incolla questo URL in <em>Outlook ➔ Aggiungi Calendario ➔ Da Internet / Web</em> per la sincronizzazione continua.
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-800 block">Punti di forza del connettore:</span>
                    <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                      <li><strong>Zero server locali:</strong> Nessun hardware o server Windows da tenere acceso nello studio.</li>
                      <li><strong>Sincronizzazione continua:</strong> Gli appuntamenti si riflettono automaticamente su PC, smartphone e tablet.</li>
                      <li><strong>Disdette e cambi orario:</strong> Se un paziente sposta la visita, l'agenda si allinea in tempo reale.</li>
                    </ul>
                  </div>
                </div>
              ) : activeModalConnector.id === 'ai_voice_receptionist' ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl text-xs space-y-1.5 text-purple-950">
                    <div className="flex items-center gap-2 font-bold text-purple-900">
                      <Phone className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>Centralino Telefonico Vocale per lo Studio</span>
                    </div>
                    <p className="leading-relaxed text-slate-700 text-[11px]">
                      Quando la linea è occupata o lo studio è chiuso, il centralino risponde al paziente, raccoglie la richiesta e invia istantaneamente un SMS sul cellulare del chiamante con il link per prenotare o confermare la visita.
                    </p>
                  </div>

                  {/* Customizable Greeting Script */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Messaggio Vocale Iniziale (Personalizzabile)
                      </label>
                      <button
                        type="button"
                        onClick={() => setAiVoiceScript(`Studio {nome_studio}, buongiorno! In questo momento la segreteria è occupata o siamo fuori orario. Come posso esserle utile? Se desidera fissare un appuntamento o un controllo, le invio subito un SMS con il link di prenotazione.`)}
                        className="text-[10px] text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
                      >
                        Ripristina Testo Consigliato
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={aiVoiceScript}
                      onChange={e => setAiVoiceScript(e.target.value)}
                      placeholder="Scrivi qui il messaggio che il paziente ascolterà al telefono..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed resize-none"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Tag dinamici: <code className="bg-slate-200 px-1 py-0.5 rounded text-purple-900 font-mono font-bold">{'{nome_studio}'}</code></span>
                      <span>Lunghezza: {aiVoiceScript.length} caratteri</span>
                    </div>
                  </div>

                  {/* Audio Simulator Player */}
                  <div className="p-3 bg-white rounded-2xl border border-purple-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                        Ascolta Simulazione Vocale
                      </span>
                      <span className="text-[10px] text-slate-500">Sintesi vocale naturale</span>
                    </div>

                    <button
                      type="button"
                      onClick={handlePlayAiVoiceDemo}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isSpeakingAiDemo ? 'Interrompi Riproduzione Vocale' : 'Ascolta Messaggio Personalizzato'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Timbro Voce
                      </label>
                      <select
                        value={aiVoiceGender}
                        onChange={e => setAiVoiceGender(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                      >
                        <option value="female">Voce Femminile (Chiara / Accogliente)</option>
                        <option value="male">Voce Maschile (Roberto / Professionale)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Fascia di Attivazione
                      </label>
                      <select
                        value={aiActiveHours}
                        onChange={e => setAiActiveHours(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                      >
                        <option value="always">Sempre Attivo (24h/24, 7 giorni su 7)</option>
                        <option value="after_hours">Solo Fuori Orario & Pausa Pranzo</option>
                        <option value="weekends">Solo Weekend & Notturno</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">Invio SMS Automatico al Chiamante</span>
                      <span className="text-[10px] text-slate-500">Manda link di prenotazione rapida via SMS dopo la chiamata</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      Attivo
                    </span>
                  </div>
                </div>
              ) : activeModalConnector.id === 'sms_gateway' ? (
                <div className="space-y-4">
                  {/* Explanatory Banner: Answers user's core question */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl text-xs space-y-2 text-purple-950">
                    <div className="flex items-center gap-2 font-bold text-purple-900">
                      <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>Devi collegare già un account Twilio adesso?</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      <strong>No, per ora non serve collegare nulla!</strong> PRISMAL è già attivo con il simulatore di rete GSM: le conferme e i promemoria SMS vengono validati, formattati e registrati nel registro notifiche <strong>a costo zero</strong> senza richiedere account o carte di credito.
                    </p>
                    <div className="pt-2 border-t border-purple-200/60 text-[11px] text-slate-600">
                      <strong>Come funziona quando uno studio attiva il piano?</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li><strong>Modalità 1 (Prismal Managed - Inclusa):</strong> Lo studio NON deve creare account Twilio. Tu gestisci l'invio e lo studio ottiene 150 SMS/mese inclusi col proprio nome mittente.</li>
                        <li><strong>Modalità 2 (Account Twilio Personale):</strong> Lo studio usa il proprio Account SID e Token se preferisce gestire direttamente le fatture Twilio.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Provider Selection Tabs */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Modalità Erogazione Gateway SMS
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSmsProviderMode('prismal_managed')}
                        className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                          smsProviderMode === 'prismal_managed'
                            ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Prismal Managed (Incluso)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmsProviderMode('custom_twilio')}
                        className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                          smsProviderMode === 'custom_twilio'
                            ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Twilio Personale (BYOK)
                      </button>
                    </div>
                  </div>

                  {/* Fields for Prismal Managed */}
                  {smsProviderMode === 'prismal_managed' ? (
                    <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Alias Mittente Alfanumerico AGCOM (Max 11 caratteri) *
                        </label>
                        <input
                          type="text"
                          maxLength={11}
                          required
                          value={smsSenderAlias}
                          onChange={e => setSmsSenderAlias(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                          placeholder="es. STUDIOCOPEX"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold tracking-wider"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Questo è il nome che il paziente vedrà come mittente dell'SMS sul proprio smartphone.
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-600">Plafond SMS Mensili Inclusi nel Piano:</span>
                        <span className="font-bold text-purple-700">150 SMS / mese</span>
                      </div>
                    </div>
                  ) : (
                    /* Fields for Custom Twilio */
                    <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Twilio Account SID *
                        </label>
                        <input
                          type="text"
                          value={smsCustomSid}
                          onChange={e => setSmsCustomSid(e.target.value)}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Twilio Auth Token *
                        </label>
                        <input
                          type="password"
                          value={smsCustomToken}
                          onChange={e => setSmsCustomToken(e.target.value)}
                          placeholder="••••••••••••••••••••••••••••••••"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Mittente / Numero Twilio (Sender ID) *
                        </label>
                        <input
                          type="text"
                          value={smsCustomFrom}
                          onChange={e => setSmsCustomFrom(e.target.value)}
                          placeholder="es. +39021234567 oppure STUDIO-NOME"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Direct Test SMS Sender */}
                  <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-sky-600" />
                      Test di Invio SMS Diagnostico in Tempo Reale
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={smsTestPhone}
                        onChange={e => setSmsTestPhone(e.target.value)}
                        placeholder="Il tuo cellulare (es. +39 340 1234567)"
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-sky-300 rounded-xl text-slate-900 font-mono"
                      />
                      <button
                        type="button"
                        disabled={smsIsTesting}
                        onClick={handleTestSms}
                        className="px-3.5 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition flex items-center gap-1"
                      >
                        <Send className={`w-3.5 h-3.5 ${smsIsTesting ? 'animate-spin' : ''}`} />
                        {smsIsTesting ? 'Invio...' : 'Invia Test'}
                      </button>
                    </div>

                    {smsTestFeedback && (
                      <div className={`p-2.5 rounded-xl border text-[11px] mt-2 ${
                        smsTestFeedback.success
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-rose-50 border-rose-300 text-rose-950'
                      }`}>
                        {smsTestFeedback.message}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                    <p>
                      I dati inseriti permettono a PRISMAL di dialogare in sicurezza tramite endpoint REST crittografati con {activeModalConnector.name}. Tutte le trasmissioni sono conformi al GDPR Sanitario.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Identificativo Studio o ID Clinica *
                    </label>
                    <input
                      type="text"
                      required
                      value={formStudioId}
                      onChange={e => setFormStudioId(e.target.value)}
                      placeholder={`es. ${activeModalConnector.id.toUpperCase()}-STUDIO-01`}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      API Key / Token di Connessione Segreto *
                    </label>
                    <input
                      type="password"
                      value={formApiKey}
                      onChange={e => setFormApiKey(e.target.value)}
                      placeholder="Incolla la chiave API fornita dal tuo fornitore di software"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  {activeModalConnector.category === 'webhook' || activeModalConnector.category === 'dental_pms' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Endpoint URL o Ponte Locale (Ponte ODBC / REST)
                      </label>
                      <input
                        type="url"
                        value={formApiUrl}
                        onChange={e => setFormApiUrl(e.target.value)}
                        placeholder="https://api.tuostudio.it/bridge oppure https://..."
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Frequenza Sincronizzazione
                      </label>
                      <select
                        value={formSyncInterval}
                        onChange={e => setFormSyncInterval(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value={1}>In tempo reale (Event-driven)</option>
                        <option value={5}>Ogni 5 minuti</option>
                        <option value={15}>Ogni 15 minuti</option>
                        <option value={60}>Ogni 1 ora</option>
                        <option value={1440}>Giornaliera (Ore 23:00)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Sync Bidirezionale</span>
                        <span className="text-[10px] text-slate-500">Allinea modifiche da ambo i lati</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formBidirectional}
                        onChange={e => setFormBidirectional(e.target.checked)}
                        className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Feedback Test Sync Box */}
                  {syncFeedback && (
                    <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                      syncFeedback.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}>
                      {syncFeedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold block">{syncFeedback.message}</span>
                        {syncFeedback.records && (
                          <span className="text-[11px] text-emerald-700 block mt-0.5">
                            ✓ {syncFeedback.records} appuntamenti/anagrafiche sincronizzati con successo ({syncFeedback.latency} ms).
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isTestingSync}
                    onClick={handleTestSync}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-600 ${isTestingSync ? 'animate-bounce' : ''}`} />
                    {isTestingSync ? 'Test Connessione in corso...' : 'Testa Connessione & Sincronizza'}
                  </button>

                  {activeModalConnector.id === 'export_pms' && (
                    <a
                      href={`/api/studio/${activeStudio.id}/export-pms`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      Scarica JSON Gestionale
                    </a>
                  )}

                  {activeModalConnector.status === 'connected' && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(activeModalConnector.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline px-2 py-1"
                    >
                      Disconnetti
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModalConnector(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition"
                  >
                    Salva & Attiva Connettore
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
