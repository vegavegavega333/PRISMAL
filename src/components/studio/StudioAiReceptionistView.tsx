import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Bell,
  Settings,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Zap,
  ArrowRight,
  Info,
  Layers,
  ChevronRight,
  Smartphone,
  Globe,
  Radio,
  FileCode,
  AlertCircle,
  Copy,
  Check,
  Server,
  Key,
  QrCode,
  Save,
  Terminal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Appointment } from '../../types';

interface StudioAiReceptionistViewProps {
  onNavigateToCalendar?: () => void;
}

export const StudioAiReceptionistView: React.FC<StudioAiReceptionistViewProps> = ({
  onNavigateToCalendar,
}) => {
  const { activeStudio, appointments, bookAppointment } = useApp();

  // Active view tab inside AI Receptionist
  const [activeSubTab, setActiveSubTab] = useState<'voice' | 'whatsapp' | 'reminders' | 'setup' | 'guide'>('voice');

  // -------------------------------------------------------------
  // VOICE RECEPTIONIST STATE
  // -------------------------------------------------------------
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [isMicListening, setIsMicListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceVolumeEnabled, setVoiceVolumeEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'ai' | 'user'; text: string; time: string }>>([]);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [lastBookedAppointment, setLastBookedAppointment] = useState<Appointment | null>(null);
  const [voiceVoiceType, setVoiceVoiceType] = useState<'sofia' | 'luca'>('sofia');

  // Web Speech Recognition & Synthesis references
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // WHATSAPP CHAT SIMULATOR STATE
  // -------------------------------------------------------------
  const [waMessages, setWaMessages] = useState<Array<{ id: string; sender: 'patient' | 'bot'; text: string; time: string }>>([
    {
      id: 'wa-1',
      sender: 'bot',
      text: `Buongiorno! 🦷 Benvenuto alla Segreteria Digitale di *${activeStudio?.name || 'Studio Odontoiatrico PRISMAL'}*.\n\nSono l'assistente virtuale H24 dello studio. Come posso aiutarti oggi?\n\n👉 Puoi chiedermi disponibilità per una *pulizia dentale*, una *visita di controllo*, oppure segnalare un'*urgenza*.`,
      time: '09:00',
    },
  ]);
  const [waInputText, setWaInputText] = useState('');
  const [isWaTyping, setIsWaTyping] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('3331234567');
  const [waDispatchStatus, setWaDispatchStatus] = useState<string | null>(null);

  // -------------------------------------------------------------
  // DEDICATED NUMBER & 100% AUTOMATED GATEWAY STATE
  // -------------------------------------------------------------
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [activeProvider, setActiveProvider] = useState<'meta_cloud' | 'evolution_api' | 'twilio' | 'simulation'>('meta_cloud');
  const [senderDisplayName, setSenderDisplayName] = useState(activeStudio?.name ? `${activeStudio.name} - Segreteria` : 'PRISMAL - Studio Odontoiatrico');
  const [senderDedicatedNumber, setSenderDedicatedNumber] = useState('+39 02 8900 1234');
  
  // Meta Cloud API
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('prismal_webhook_secret_2026');

  // Evolution API (GitHub)
  const [evoUrl, setEvoUrl] = useState('http://localhost:8080');
  const [evoKey, setEvoKey] = useState('');
  const [evoInstance, setEvoInstance] = useState('prismal-bot');

  // Twilio
  const [twAccountSid, setTwAccountSid] = useState('');
  const [twAuthToken, setTwAuthToken] = useState('');
  const [twFromNumber, setTwFromNumber] = useState('+14155238886');

  const [isSavingGateway, setIsSavingGateway] = useState(false);
  const [saveGatewayStatus, setSaveGatewayStatus] = useState<string | null>(null);
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState<any | null>(null);

  // -------------------------------------------------------------
  // REMINDERS AUTOMATION TOGGLES & TEMPLATES
  // -------------------------------------------------------------
  const [enableImmediateConfirm, setEnableImmediateConfirm] = useState(true);
  const [enable24hReminder, setEnable24hReminder] = useState(true);
  const [enable2hReminder, setEnable2hReminder] = useState(true);
  const [enable6mRecall, setEnable6mRecall] = useState(true);
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  // Load gateway config on mount
  useEffect(() => {
    fetch('/api/whatsapp/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setGatewayConfig(data.config);
          if (data.config.provider) setActiveProvider(data.config.provider);
          if (data.config.senderName) setSenderDisplayName(data.config.senderName);
          if (data.config.senderNumber) setSenderDedicatedNumber(data.config.senderNumber);
          if (data.config.metaCloud?.phoneNumberId) setMetaPhoneId(data.config.metaCloud.phoneNumberId);
          if (data.config.metaCloud?.verifyToken) setMetaVerifyToken(data.config.metaCloud.verifyToken);
          if (data.config.evolutionApi?.apiUrl) setEvoUrl(data.config.evolutionApi.apiUrl);
          if (data.config.evolutionApi?.instanceName) setEvoInstance(data.config.evolutionApi.instanceName);
          if (data.config.twilio?.fromNumber) setTwFromNumber(data.config.twilio.fromNumber);
        }
      })
      .catch(err => console.warn('Error fetching whatsapp config:', err));
  }, []);

  // Auto-scroll chat boxes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversationHistory, waMessages, isWaTyping]);

  // Call duration counter
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === 'idle') setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsMicListening(true);
        };

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setSpeechTranscript(current);
        };

        recognition.onerror = (event: any) => {
          console.warn('[SpeechRecognition Error]:', event.error);
          setIsMicListening(false);
        };

        recognition.onend = () => {
          setIsMicListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format call timer (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Speak aloud using natural SpeechSynthesis in Italian
  const speakTextAloud = (text: string, onEnd?: () => void) => {
    if (!voiceVolumeEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 1.02; // natural conversational tempo
    utterance.pitch = voiceVoiceType === 'sofia' ? 1.08 : 0.92;

    // Pick Italian voice if installed
    const voices = window.speechSynthesis.getVoices();
    const italianVoices = voices.filter(v => v.lang.startsWith('it') || v.lang.includes('IT'));
    if (italianVoices.length > 0) {
      // Find female or male based on selection
      if (voiceVoiceType === 'sofia') {
        const femaleVoice = italianVoices.find(v => v.name.toLowerCase().includes('alice') || v.name.toLowerCase().includes('elsa') || v.name.toLowerCase().includes('federica') || v.name.toLowerCase().includes('google'));
        utterance.voice = femaleVoice || italianVoices[0];
      } else {
        const maleVoice = italianVoices.find(v => v.name.toLowerCase().includes('luca') || v.name.toLowerCase().includes('cosimo') || v.name.toLowerCase().includes('diego'));
        utterance.voice = maleVoice || italianVoices[italianVoices.length - 1];
      }
    }

    utterance.onstart = () => {
      setIsAiSpeaking(true);
    };

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start phone call simulation
  const handleStartCall = () => {
    setCallState('calling');
    setCallDuration(0);
    setConversationHistory([]);
    setLastBookedAppointment(null);

    // Call ring simulation
    setTimeout(() => {
      setCallState('connected');
      const greeting = `Buongiorno, Studio Odontoiatrico ${activeStudio?.name || 'PRISMAL'}. Sono ${voiceVoiceType === 'sofia' ? 'Sofia' : 'Luca'}, l'assistente virtuale della segreteria. Come posso aiutarla oggi? Desidera prenotare un appuntamento o chiedere informazioni?`;
      
      setConversationHistory([
        {
          role: 'ai',
          text: greeting,
          time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      speakTextAloud(greeting, () => {
        // Start listening after greeting if not muted
        if (!isMuted && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
      });
    }, 1200);
  };

  // End phone call
  const handleEndCall = () => {
    setCallState('ended');
    setIsMicListening(false);
    setIsAiSpeaking(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTimeout(() => {
      setCallState('idle');
    }, 2500);
  };

  // Toggle microphone recording
  const handleToggleMic = () => {
    if (isMicListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsMicListening(false);
      if (speechTranscript.trim()) {
        processCallerSpeech(speechTranscript.trim());
      }
    } else {
      setSpeechTranscript('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsMicListening(true);
        } catch (e) {
          console.warn('Mic start failed:', e);
        }
      }
    }
  };

  // Process user speech (either from real mic or from preset voice buttons)
  const processCallerSpeech = async (spokenText: string) => {
    if (!spokenText.trim() || isProcessingVoice) return;

    const userTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    setConversationHistory(prev => [...prev, { role: 'user', text: spokenText, time: userTime }]);
    setSpeechTranscript('');
    setIsProcessingVoice(true);

    try {
      const res = await fetch('/api/ai/receptionist/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerSpeech: spokenText,
          studioName: activeStudio?.name,
          studioCity: activeStudio?.city,
          studioAddress: activeStudio?.address,
          chairs: activeStudio?.chairs || [],
          history: conversationHistory.slice(-4),
        }),
      });

      const data = await res.json();
      const aiReply = data.speechResponse || `Ho compreso la sua richiesta. Controllo immediatamente la disponibilità delle poltrone in studio.`;

      const aiTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setConversationHistory(prev => [...prev, { role: 'ai', text: aiReply, time: aiTime }]);

      // Check if AI completed a booking
      if (data.readyToBook && data.bookingDetails && activeStudio) {
        const details = data.bookingDetails;
        const targetDateObj = new Date();
        targetDateObj.setDate(targetDateObj.getDate() + (details.dateOffsetDays || 1));
        const dateStr = targetDateObj.toISOString().split('T')[0];

        const availableChair = activeStudio.chairs?.[0]?.id || 'chair-1';

        const newApt = bookAppointment({
          studioId: activeStudio.id,
          date: dateStr,
          timeSlot: details.requestedTime || '10:30',
          durationMinutes: 45,
          patientFirstName: details.patientFirstName || 'Paziente',
          patientLastName: details.patientLastName || '',
          patientPhone: '3331234567',
          visitReasonName: details.visitReasonName || 'Igiene e Pulizia Dentale',
          status: 'confirmed',
          chairId: availableChair,
          notes: 'Prenotazione automatica confermata da Segreteria Vocale AI Sofia',
        });

        if (newApt) {
          setLastBookedAppointment(newApt);
        }
      }

      speakTextAloud(aiReply);
    } catch (err) {
      console.error('Error handling voice speech:', err);
      const errorMsg = 'Mi scusi, si è verificata una momentanea interferenza. Può ripetere cortesemente la sua richiesta?';
      setConversationHistory(prev => [...prev, { role: 'ai', text: errorMsg, time: userTime }]);
      speakTextAloud(errorMsg);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // WhatsApp Chat Simulation Send
  const handleSendWaMessage = async (textToSend?: string) => {
    const text = (textToSend || waInputText).trim();
    if (!text || isWaTyping) return;

    const patientTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `wa-${Date.now()}`, sender: 'patient' as const, text, time: patientTime };
    setWaMessages(prev => [...prev, userMsg]);
    setWaInputText('');
    setIsWaTyping(true);

    try {
      const res = await fetch('/api/ai/receptionist/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: text,
          senderPhone: waTestPhone,
          senderName: 'Mario Rossi',
          studioName: activeStudio?.name,
          conversationHistory: waMessages.slice(-4),
        }),
      });

      const data = await res.json();
      const botReply = data.replyText || 'Grazie per il messaggio! La nostra segreteria ti risponderà al più presto.';

      const botTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setWaMessages(prev => [
        ...prev,
        { id: `wa-${Date.now() + 1}`, sender: 'bot', text: botReply, time: botTime },
      ]);
    } catch (err) {
      console.error('WA AI error:', err);
      setWaMessages(prev => [
        ...prev,
        { id: `wa-${Date.now() + 1}`, sender: 'bot', text: 'Grazie per averci contattato! Abbiamo ricevuto la tua richiesta e ti ricontatteremo a breve.', time: patientTime },
      ]);
    } finally {
      setIsWaTyping(false);
    }
  };

  // Save WhatsApp Gateway configuration to server
  const handleSaveGatewayConfig = async () => {
    setIsSavingGateway(true);
    setSaveGatewayStatus(null);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          senderName: senderDisplayName,
          senderNumber: senderDedicatedNumber,
          metaCloud: {
            phoneNumberId: metaPhoneId,
            accessToken: metaToken,
            verifyToken: metaVerifyToken,
          },
          evolutionApi: {
            apiUrl: evoUrl,
            apiKey: evoKey,
            instanceName: evoInstance,
          },
          twilio: {
            accountSid: twAccountSid,
            authToken: twAuthToken,
            fromNumber: twFromNumber,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveGatewayStatus('✅ Configurazione salvata con successo! Il gateway è operativo per l\'invio 100% automatico.');
      } else {
        setSaveGatewayStatus('❌ Errore durante il salvataggio: ' + (data.error || 'Riprova'));
      }
    } catch (err: any) {
      setSaveGatewayStatus('❌ Errore di rete: ' + (err?.message || 'Verifica connessione'));
    } finally {
      setIsSavingGateway(false);
      setTimeout(() => setSaveGatewayStatus(null), 6000);
    }
  };

  // Send real test WhatsApp via server dispatch (100% in background, ZERO manual clicks)
  const handleTestWhatsAppDispatch = async () => {
    setWaDispatchStatus('Invio automatico in background in corso...');
    try {
      const sampleText = `Gentile Mario Rossi, Le confermiamo l'appuntamento presso ${activeStudio?.name || 'Studio Odontoiatrico PRISMAL'} per Igiene e Pulizia Dentale.\n\n📅 Data: Domani\n⏰ Orario: 10:30\n💺 Poltrona Igiene • Dott. Studio\n\nPer disdire o modificare la visita può rispondere direttamente a questo messaggio.\n\nCordiali saluti,\nLa Segreteria Automatica • ${senderDisplayName || 'PRISMAL'}`;

      const res = await fetch('/api/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: waTestPhone,
          messageText: sampleText,
          provider: activeProvider,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.provider === 'simulation') {
          setWaDispatchStatus('✅ Notifica automatica elaborata con successo e registrata nell\'audit log! Per inviarla sul vero numero cellulare dal nome PRISMAL, inserisci le credenziali nel tab "Numero PRISMAL & Setup".');
        } else {
          setWaDispatchStatus(`🚀 Inviato al 100% in background tramite ${data.provider?.toUpperCase()}! Il paziente ha ricevuto il messaggio sul suo cellulare senza aprire alcuna finestra.`);
        }
      } else {
        setWaDispatchStatus(`⚠️ Gateway ${data.provider}: ${data.result?.error || 'Verifica credenziali'}`);
      }
      setTimeout(() => setWaDispatchStatus(null), 8000);
    } catch (err: any) {
      setWaDispatchStatus('Errore invio automatico: ' + (err?.message || 'Verifica connessione'));
      setTimeout(() => setWaDispatchStatus(null), 6000);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeSnippet(id);
    setTimeout(() => setCopiedCodeSnippet(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* HERO HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Segreteria H24 • Omnicanale 360°
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                Voce Umana & Agente WhatsApp
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Centralino Vocale & Segreteria WhatsApp Autonoma
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Risponde al telefono al posto tuo con voce umana naturale, comprende cosa chiede il paziente, verifica gli slot liberi delle poltrone e <strong className="text-emerald-400 font-bold">prenota direttamente in agenda</strong>. Invia promemoria e gestisce richiami automatici su WhatsApp con zero sforzo per lo staff.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => {
                setActiveSubTab('voice');
                if (callState === 'idle') handleStartCall();
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <PhoneCall className="w-4 h-4 text-slate-950" />
              <span>Simula Chiamata Vocale AI</span>
            </button>

            <button
              onClick={() => setActiveSubTab('whatsapp')}
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Prova Chat WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('voice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'voice'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Centralino Vocale AI (Live Simulator)</span>
          {callState === 'connected' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'whatsapp'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          <span>Agente WhatsApp & Chatbot</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'reminders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500" />
          <span>Promemoria Automatici (Reminder 24h/1h)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('setup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'setup'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Numero Dedicato "PRISMAL" & Setup Automatico</span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
            Zero Click
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'guide'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Globe className="w-4 h-4 text-sky-500" />
          <span>Guida Strumenti Gratuiti & GitHub</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: VOICE AI RECEPTIONIST (LIVE TELEPHONE CALL SIMULATOR) */}
      {/* ============================================================= */}
      {activeSubTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: INTERACTIVE CALL INTERFACE (PHONE DIALER) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 flex flex-col justify-between min-h-[580px] relative overflow-hidden">
            <div className="space-y-4">
              {/* Call Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-base shadow-sm">
                      {voiceVoiceType === 'sofia' ? 'S' : 'L'}
                    </div>
                    {callState === 'connected' && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {voiceVoiceType === 'sofia' ? 'Sofia' : 'Luca'} • Segretaria Vocale AI
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Studio Odontoiatrico {activeStudio?.name || 'PRISMAL'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Voice Selector */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      onClick={() => setVoiceVoiceType('sofia')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        voiceVoiceType === 'sofia' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Sofia (Voce Donna)
                    </button>
                    <button
                      onClick={() => setVoiceVoiceType('luca')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        voiceVoiceType === 'luca' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Luca (Voce Uomo)
                    </button>
                  </div>

                  {/* Volume Toggle */}
                  <button
                    onClick={() => {
                      setVoiceVolumeEnabled(!voiceVolumeEnabled);
                      if (typeof window !== 'undefined' && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`p-2 rounded-xl border transition ${
                      voiceVolumeEnabled
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}
                    title={voiceVolumeEnabled ? 'Disattiva voce parlante' : 'Attiva voce parlante'}
                  >
                    {voiceVolumeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Call Status & Timer Badge */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      callState === 'connected'
                        ? 'bg-emerald-500 animate-ping'
                        : callState === 'calling'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-slate-300'
                    }`}
                  />
                  <span className="font-bold text-slate-700">
                    {callState === 'connected'
                      ? `In Chiamata: ${formatTimer(callDuration)}`
                      : callState === 'calling'
                      ? 'Squillo in corso...'
                      : 'Linea Libera (Pronta alla Chiamata)'}
                  </span>
                </div>

                {isAiSpeaking && (
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Sofia sta parlando...</span>
                  </span>
                )}
              </div>

              {/* LIVE SOUNDWAVE VISUALIZER */}
              <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />

                {callState === 'connected' ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="flex items-center justify-center gap-1.5 h-12 w-full">
                      {[40, 75, 25, 90, 60, 100, 45, 80, 30, 95, 50, 70, 85, 35, 65, 90, 40].map((height, i) => (
                        <div
                          key={i}
                          style={{
                            height: isAiSpeaking || isMicListening ? `${Math.max(15, height * (0.6 + Math.random() * 0.4))}%` : '15%',
                            transition: 'height 150ms ease-in-out',
                          }}
                          className={`w-1.5 rounded-full ${
                            isAiSpeaking
                              ? 'bg-gradient-to-t from-purple-500 to-indigo-400'
                              : isMicListening
                              ? 'bg-gradient-to-t from-emerald-500 to-teal-300'
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-xs font-semibold text-slate-300 text-center">
                      {isAiSpeaking
                        ? '🔊 Voce sintetica in riproduzione audio...'
                        : isMicListening
                        ? '🎙️ Sofia ti ascolta: parla pure al microfono!'
                        : 'In attesa di voce (clicca il microfono o usa le risposte rapide sotto)'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <PhoneCall className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">
                      Premi "Avvia Chiamata Vocale" per testare la voce umana dell'AI
                    </p>
                  </div>
                )}
              </div>

              {/* CONVERSATION TRANSCRIPT LIVE CHAT */}
              <div
                ref={chatScrollRef}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 max-h-[220px] overflow-y-auto space-y-3 font-sans text-xs"
              >
                {conversationHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Bot className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    <span>Nessuna trascrizione attiva. La trascrizione della chiamata apparirà qui.</span>
                  </div>
                ) : (
                  conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                        <span className="font-bold">{msg.role === 'user' ? 'Tu (Paziente)' : voiceVoiceType === 'sofia' ? 'Sofia (AI)' : 'Luca (AI)'}</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-slate-900 text-white rounded-br-xs'
                            : 'bg-white text-slate-900 border border-slate-200/90 shadow-2xs rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}

                {/* Speech Recognition Interim Bubble */}
                {speechTranscript && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-emerald-600 font-bold mb-1">In ascolto...</span>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-950 border border-emerald-200 max-w-[85%] italic">
                      "{speechTranscript}"
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CALL ACTION CONTROLS */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              {callState === 'idle' ? (
                <button
                  type="button"
                  onClick={handleStartCall}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-md hover:shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Avvia Chiamata Vocale con Sofia</span>
                </button>
              ) : (
                <div className="flex items-center justify-between w-full gap-3">
                  {/* Microphone speech toggle */}
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                      isMicListening
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                    }`}
                  >
                    {isMicListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600" />}
                    <span>{isMicListening ? 'Termina Parlato' : 'Parla al Microfono'}</span>
                  </button>

                  {/* End call button */}
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="py-3 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Chiudi Chiamata</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: PRESET VOICE SCENARIOS & REAL-TIME BOOKING CARD */}
          <div className="lg:col-span-5 space-y-5">
            {/* REAL-TIME APPOINTMENT CONFIRMATION CELEBRATION */}
            {lastBookedAppointment && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-5 shadow-xs space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5 text-emerald-900 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Nuova Prenotazione Inserita in Agenda!</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 space-y-1.5 text-xs text-slate-800">
                  <p className="font-bold text-slate-900">
                    {lastBookedAppointment.patientFirstName} {lastBookedAppointment.patientLastName}
                  </p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Data: {lastBookedAppointment.date} alle {lastBookedAppointment.timeSlot}</span>
                  </p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Trattamento: {lastBookedAppointment.visitReasonName}</span>
                  </p>
                </div>
                {onNavigateToCalendar && (
                  <button
                    onClick={onNavigateToCalendar}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Visualizza nel Calendario Poltrone</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* PRESET SPEECH BUTTONS FOR ZERO-MICROPHONE TESTING */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Risposte Rapide Test (1-Click Simula Voce)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Non hai un microfono a portata di mano? Clicca una di queste frasi per simulare istantaneamente il paziente che parla al telefono:
              </p>

              <div className="space-y-2 pt-1">
                {[
                  {
                    title: 'Pulizia Dentale Domani',
                    phrase: 'Buongiorno, vorrei prenotare una pulizia dentale per domani alle 10:30, mi chiamo Mario Rossi.',
                    tag: 'Prenotazione',
                    color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200',
                  },
                  {
                    title: 'Urgenza Forte Mal di Dente',
                    phrase: 'Ho un fortissimo mal di denti da ieri sera, avete un posto libero d\'urgenza per oggi?',
                    tag: 'Pronto Soccorso',
                    color: 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200',
                  },
                  {
                    title: 'Prima Visita di Controllo',
                    phrase: 'Vorrei fissare una prima visita di controllo generale per giovedì pomeriggio, sono Laura Bianchi.',
                    tag: 'Controllo',
                    color: 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200',
                  },
                  {
                    title: 'Conferma Slot Proposto',
                    phrase: 'Sì perfetto, confermo questo orario grazie!',
                    tag: 'Conferma',
                    color: 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200',
                  },
                  {
                    title: 'Orari e Posizione Studio',
                    phrase: 'Quali sono i vostri orari di apertura e dove si trova esattamente la clinica?',
                    tag: 'Info Studio',
                    color: 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (callState === 'idle') handleStartCall();
                      setTimeout(() => {
                        processCallerSpeech(item.phrase);
                      }, callState === 'idle' ? 1600 : 200);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition flex flex-col gap-1 cursor-pointer ${item.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{item.title}</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-white/80 border border-slate-200">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 line-clamp-2">
                      "{item.phrase}"
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* HOW THE VOICE ENGINE WORKS */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-2.5 text-xs text-slate-600">
              <h5 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Come funziona il Centralino Vocale AI Prismal</span>
              </h5>
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-600">
                <li>• <strong>Riconoscimento vocale continuo:</strong> Cattura la voce in tempo reale tramite Web Speech API o telefonia SIP/Twilio.</li>
                <li>• <strong>Comprensione NLP Gemini:</strong> Estrae nome, patologia/servizio e fascia oraria preferita.</li>
                <li>• <strong>Verifica poltrone:</strong> Controlla in tempo reale gli slot liberi su Poltrona 1, Poltrona Igiene e Poltrona Chirurgia.</li>
                <li>• <strong>Scrittura in Agenda:</strong> Inserisce direttamente l'appuntamento in Firestore e nel Calendario Visivo.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: WHATSAPP BOT & CHAT SIMULATOR */}
      {/* ============================================================= */}
      {activeSubTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: WHATSAPP REALISTIC INTERFACE MOCKUP */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[580px]">
            {/* WhatsApp Top Green Bar */}
            <div className="bg-[#075E54] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white text-[#075E54] flex items-center justify-center font-bold text-sm shadow-xs">
                  🦷
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm leading-tight">
                      {activeStudio?.name || 'Studio Odontoiatrico PRISMAL'}
                    </h3>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span>Segreteria Automatica Attiva (Online)</span>
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full text-white">
                Simulatore Chat
              </span>
            </div>

            {/* WhatsApp Messages Scrollable Body (WhatsApp Wallpaper Texture look) */}
            <div
              ref={chatScrollRef}
              className="flex-1 bg-[#efeae2] p-4 sm:p-5 overflow-y-auto space-y-3 font-sans"
              style={{
                backgroundImage: 'radial-gradient(#0000000a 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              {waMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'patient' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'patient'
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-br-xs'
                        : 'bg-white text-slate-900 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                    <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}

              {isWaTyping && (
                <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-2xl max-w-[120px] shadow-2xs text-[11px] text-slate-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1">scrive...</span>
                </div>
              )}
            </div>

            {/* Quick Chips for Patient Chat */}
            <div className="bg-[#f0f2f5] p-2 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              {[
                '📅 Vorrei prenotare una visita',
                '⏰ Orari di apertura',
                '🚨 Ho un dente spezzato (urgenza)',
                '1️⃣ Confermo opzione 1',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendWaMessage(chip)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap font-medium transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* WhatsApp Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendWaMessage();
              }}
              className="bg-[#f0f2f5] p-3 border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={waInputText}
                onChange={e => setWaInputText(e.target.value)}
                placeholder="Scrivi un messaggio come paziente..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              <button
                type="submit"
                disabled={!waInputText.trim() || isWaTyping}
                className="p-2.5 rounded-2xl bg-[#00a884] hover:bg-[#008f6f] text-white disabled:opacity-50 transition cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* RIGHT: REAL WHATSAPP TEST DISPATCH & AUTOMATION SETTINGS */}
          <div className="lg:col-span-5 space-y-5">
            {/* REAL WHATSAPP DIRECT TEST */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Test Invio 100% Automatico (No Click Manuali)
                  </h4>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Background API
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Mittente Visualizzato:</span>
                  <span className="font-mono text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {senderDisplayName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Numero Dedicato:</span>
                  <span className="font-mono text-slate-600">
                    {senderDedicatedNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-700">Gateway Attivo:</span>
                  <span className="font-bold uppercase text-[10px] text-purple-700">
                    {activeProvider}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Inserisci il tuo numero per ricevere una vera notifica inviata dal server in background, esattamente come la riceverà il paziente:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Numero di Cellulare Destinatario:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-2 rounded-xl border border-slate-200">
                      +39
                    </span>
                    <input
                      type="tel"
                      value={waTestPhone}
                      onChange={e => setWaTestPhone(e.target.value)}
                      placeholder="3331234567"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestWhatsAppDispatch}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:scale-[1.01]"
                >
                  <Zap className="w-4 h-4" />
                  <span>Invia Notifica Automatica (Zero Click Manuali)</span>
                </button>

                <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPhone = waTestPhone.replace(/[^0-9]/g, '');
                      const finalPhone = cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`;
                      const sampleText = `Gentile Mario Rossi, Le confermiamo l'appuntamento presso ${senderDisplayName || 'PRISMAL'}.`;
                      window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(sampleText)}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-slate-500 hover:text-slate-800 underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Oppure apri anteprima su WhatsApp Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab('setup')}
                    className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                  >
                    Configura Numero & API ➔
                  </button>
                </div>

                {waDispatchStatus && (
                  <p className="text-xs font-bold text-center text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200 animate-in fade-in leading-relaxed">
                    {waDispatchStatus}
                  </p>
                )}
              </div>
            </div>

            {/* BOT FEATURES RECAP */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-3 text-xs text-slate-700">
              <h5 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Capacità dell'Agente WhatsApp PRISMAL</span>
              </h5>
              <div className="space-y-2 text-[11px] leading-relaxed">
                <p>• <strong>Accoglienza H24:</strong> Risponde istantaneamente anche di notte o nei weekend quando lo studio è chiuso.</p>
                <p>• <strong>Proposta Slot Intelligente:</strong> Non crea doppie prenotazioni, ma legge la saturazione reale delle poltrone.</p>
                <p>• <strong>Modifica & Disdetta:</strong> I pazienti possono liberare lo slot con un messaggio, permettendo al sistema di riempire il buco con lista d'attesa.</p>
                <p>• <strong>Zero Costi Nascosti:</strong> Funziona con link diretti gratuiti o con API Open Source / Cloud API.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: AUTOMATED REMINDERS ENGINE (24H, 1H, RECALL) */}
      {/* ============================================================= */}
      {activeSubTab === 'reminders' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Regole e Trigger di Notifica Automatica WhatsApp
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configura i promemoria automatici inviati ai pazienti per abbattere i no-show a meno del 2%.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reminder 1: Conferma Istantanea */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      ⚡
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Conferma Immediata</h4>
                      <p className="text-[10px] text-slate-500">Inviata subito dopo la prenotazione</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableImmediateConfirm}
                    onChange={e => setEnableImmediateConfirm(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                  "Gentile {'{paziente}'}, Le confermiamo la visita del {'{data}'} alle {'{ora}'} presso {activeStudio?.name || 'lo Studio'}. A presto!"
                </p>
              </div>

              {/* Reminder 2: 24h prima */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                      ⏰
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Promemoria 24 Ore Prima</h4>
                      <p className="text-[10px] text-slate-500">Inviato alle 09:00 del giorno precedente</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enable24hReminder}
                    onChange={e => setEnable24hReminder(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                  "Gentile {'{paziente}'}, Le ricordiamo il Suo appuntamento di domani alle {'{ora}'}. Risponda a questo messaggio per confermare o spostare la seduta."
                </p>
              </div>

              {/* Reminder 3: 2h prima */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
                      🚗
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Promemoria 2 Ore Prima</h4>
                      <p className="text-[10px] text-slate-500">Con link a Google Maps e parcheggio</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enable2hReminder}
                    onChange={e => setEnable2hReminder(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                  "La aspettiamo tra 2 ore presso la sede di {activeStudio?.city || 'Milano'}. Indicazioni stradali: https://maps.google.com/?q={encodeURIComponent(activeStudio?.address || '')}"
                </p>
              </div>

              {/* Reminder 4: Recall Igiene 6 mesi */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                      🦷
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Recall Igiene Semestrale</h4>
                      <p className="text-[10px] text-slate-500">Per pazienti con ultima igiene a 6 mesi fa</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enable6mRecall}
                    onChange={e => setEnable6mRecall(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                  "Gentile {'{paziente}'}, sono trascorsi 6 mesi dalla Sua ultima seduta di igiene. Clicchi qui per prenotare il controllo periodico di prevenzione!"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: SETUP NUMERO DEDICATO "PRISMAL" & GATEWAY 100% AUTOMATICO */}
      {/* ============================================================= */}
      {activeSubTab === 'setup' && (
        <div className="space-y-6">
          {/* HEADER EXPLANATION */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Architettura 100% Automatica • Zero Click Manuali
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Come Avere il Numero Dedicato di "PRISMAL" e Invio 100% Automatico
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                  Per inviare promemoria automatici e far rispondere l'AI H24 <strong>senza toccare WhatsApp Web</strong> e <strong>senza usare il tuo numero personale</strong>, PRISMAL si interfaccia direttamente con i gateway cloud ufficiali o con gli agenti open-source da GitHub.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
                  activeProvider === 'meta_cloud'
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : activeProvider === 'evolution_api'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : activeProvider === 'twilio'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gateway: {activeProvider.toUpperCase()}</span>
                </span>
              </div>
            </div>

            {/* STEP-BY-STEP EXPLANATION OF NON-PERSONAL NUMBER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                  1
                </div>
                <h4 className="font-bold text-xs text-slate-900">
                  Come avere il Numero Non Personale
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Non usare la tua SIM privata:</strong> puoi attivare un numero virtuale VOIP (es. su Twilio a 1$/mese) oppure comprare una eSIM secondaria a basso costo (es. Spusu, Very Mobile, Iliad da 2-4€/mese). Non serve neanche un secondo cellulare con il numero cloud!
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs">
                  2
                </div>
                <h4 className="font-bold text-xs text-slate-900">
                  Nome Mittente: "PRISMAL"
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Quando registri il numero su <strong>Meta WhatsApp Cloud API</strong> o sull'app <strong>WhatsApp Business</strong>, inserisci come nome profilo: <em>"PRISMAL - Studio Odontoiatrico"</em>. Il paziente vedrà il logo dello studio e il nome aziendale, non un numero privato.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs">
                  3
                </div>
                <h4 className="font-bold text-xs text-slate-900">
                  Automazione Totale (No-Click)
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  I reminder partono dal server PRISMAL in background 24h prima. Quando il paziente risponde, il <strong>Webhook</strong> riceve il messaggio, l'AI verifica le poltrone e risponde all'istante confermando o modificando l'appuntamento.
                </p>
              </div>
            </div>
          </div>

          {/* INTERACTIVE GATEWAY CONFIGURATOR CARD */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <Server className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Pannello Credenziali Gateway & Invio Automatico
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Scegli quale provider utilizzare e salva le credenziali per attivare l'invio in background
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveGatewayConfig}
                disabled={isSavingGateway}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{isSavingGateway ? 'Salvataggio...' : 'Salva Impostazioni'}</span>
              </button>
            </div>

            {saveGatewayStatus && (
              <div className="p-3 rounded-2xl bg-slate-100 text-slate-800 text-xs font-bold animate-in fade-in flex items-center gap-2">
                <span>{saveGatewayStatus}</span>
              </div>
            )}

            {/* PROVIDER SELECTOR BUTTONS */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Seleziona Motore Gateway Attivo:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* OPTION 1: META CLOUD API */}
                <button
                  type="button"
                  onClick={() => setActiveProvider('meta_cloud')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeProvider === 'meta_cloud'
                      ? 'bg-sky-50/70 border-sky-400 shadow-xs ring-2 ring-sky-400/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-sky-950">Meta Cloud API</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                      1.000 Gratis/Mese
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Ufficiale di Meta / WhatsApp Business Platform. Stabilità 100%, zero rischio ban.
                  </p>
                </button>

                {/* OPTION 2: EVOLUTION API (GITHUB) */}
                <button
                  type="button"
                  onClick={() => setActiveProvider('evolution_api')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeProvider === 'evolution_api'
                      ? 'bg-purple-50/70 border-purple-400 shadow-xs ring-2 ring-purple-400/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-purple-950">Evolution API (GitHub)</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                      100% Free Open-Source
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Basato su Baileys. Colleghi qualsiasi SIM/eSIM inquadrando il QR Code una volta sola.
                  </p>
                </button>

                {/* OPTION 3: TWILIO WHATSAPP */}
                <button
                  type="button"
                  onClick={() => setActiveProvider('twilio')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeProvider === 'twilio'
                      ? 'bg-amber-50/70 border-amber-400 shadow-xs ring-2 ring-amber-400/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-950">Twilio WhatsApp</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      15$ Crediti Gratis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Integrazione API istantanea già inclusa con numero dedicato e sandbox attiva.
                  </p>
                </button>
              </div>
            </div>

            {/* SENDER IDENTITY SETTINGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nome Mittente Aziendale Visualizzato:
                </label>
                <input
                  type="text"
                  value={senderDisplayName}
                  onChange={e => setSenderDisplayName(e.target.value)}
                  placeholder="PRISMAL - Studio Odontoiatrico"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Questo è il nome che comparirà nella firma automatica dei messaggi e nel profilo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Numero Telefonico Dedicato non personale:
                </label>
                <input
                  type="text"
                  value={senderDedicatedNumber}
                  onChange={e => setSenderDedicatedNumber(e.target.value)}
                  placeholder="+39 02 8900 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Numero dello studio o della SIM dedicata associata all'API (mai il tuo numero personale).
                </p>
              </div>
            </div>

            {/* DYNAMIC CREDENTIALS ACCORDING TO SELECTED PROVIDER */}
            {activeProvider === 'meta_cloud' && (
              <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-sky-700" />
                    <h5 className="font-bold text-xs text-sky-950">Credenziali Meta WhatsApp Cloud API</h5>
                  </div>
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:underline text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>Ottieni Token su Meta Developers</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phone Number ID:
                    </label>
                    <input
                      type="text"
                      value={metaPhoneId}
                      onChange={e => setMetaPhoneId(e.target.value)}
                      placeholder="es. 1098472918234"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Access Token Permanente (System User Bearer Token):
                    </label>
                    <input
                      type="password"
                      value={metaToken}
                      onChange={e => setMetaToken(e.target.value)}
                      placeholder="EAAB..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* WEBHOOK URL TO PASTE IN META */}
                <div className="pt-2 border-t border-sky-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-600">
                    <strong>URL Webhook per ricezione automatica H24:</strong> Incolla nel pannello Meta:
                    <code className="ml-1.5 px-2 py-0.5 rounded bg-white font-mono text-slate-900 border border-slate-200">
                      {typeof window !== 'undefined' ? `${window.location.origin}/webhook/whatsapp` : '/webhook/whatsapp'}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/webhook/whatsapp` : '/webhook/whatsapp', 'meta-webhook')}
                    className="px-2.5 py-1 rounded-lg bg-sky-200 hover:bg-sky-300 text-sky-950 font-bold text-[10px] flex items-center gap-1 transition self-start sm:self-auto cursor-pointer"
                  >
                    {copiedCodeSnippet === 'meta-webhook' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCodeSnippet === 'meta-webhook' ? 'Copiato!' : 'Copia Webhook URL'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeProvider === 'evolution_api' && (
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-purple-700" />
                    <h5 className="font-bold text-xs text-purple-950">Credenziali Evolution API (Agente GitHub)</h5>
                  </div>
                  <a
                    href="https://github.com/EvolutionAPI/evolution-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:underline text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>GitHub Evolution API</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      URL Server Evolution API:
                    </label>
                    <input
                      type="text"
                      value={evoUrl}
                      onChange={e => setEvoUrl(e.target.value)}
                      placeholder="https://mio-evolution.railway.app"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      API Key Globale:
                    </label>
                    <input
                      type="password"
                      value={evoKey}
                      onChange={e => setEvoKey(e.target.value)}
                      placeholder="B6D711FCDE4D4FD5936544120E713976"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome Istanza (Instance Name):
                    </label>
                    <input
                      type="text"
                      value={evoInstance}
                      onChange={e => setEvoInstance(e.target.value)}
                      placeholder="prismal-bot"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeProvider === 'twilio' && (
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-700" />
                    <h5 className="font-bold text-xs text-amber-950">Credenziali Twilio WhatsApp</h5>
                  </div>
                  <a
                    href="https://console.twilio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-800 hover:underline text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>Console Twilio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Account SID:
                    </label>
                    <input
                      type="text"
                      value={twAccountSid}
                      onChange={e => setTwAccountSid(e.target.value)}
                      placeholder="AC..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Auth Token:
                    </label>
                    <input
                      type="password"
                      value={twAuthToken}
                      onChange={e => setTwAuthToken(e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      From WhatsApp Number:
                    </label>
                    <input
                      type="text"
                      value={twFromNumber}
                      onChange={e => setTwFromNumber(e.target.value)}
                      placeholder="+14155238886"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LIVE TEST BUTTON IN SETUP TAB */}
            <div className="p-5 rounded-2xl bg-slate-950 text-white border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Verifica Connessione Gateway & Invio Reale di Test</span>
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Invia un messaggio di test in tempo reale al tuo cellulare per verificare che il server spedisca in automatico senza aprire browser.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={waTestPhone}
                    onChange={e => setWaTestPhone(e.target.value)}
                    placeholder="3331234567"
                    className="w-36 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestWhatsAppDispatch}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Invia Test</span>
                  </button>
                </div>
              </div>

              {waDispatchStatus && (
                <div className="p-3 rounded-xl bg-slate-900 text-emerald-300 border border-slate-800 text-xs font-bold leading-relaxed">
                  {waDispatchStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: GUIDA STRUMENTI GRATUITI & PROGETTI GITHUB */}
      {/* ============================================================= */}
      {activeSubTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                100% Trasparenza & Software Gratis
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                Come collegare WhatsApp e la Voce: Le 4 Strade Consigliate
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Ecco tutte le opzioni per collegare i tuoi numeri telefonici reali a PRISMAL, privilegiando le soluzioni gratuite e open-source con la massima resa visiva e tecnica:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* OPZIONE 1: WHATSAPP WEB DIRETTO (100% GRATIS - GIÀ ATTIVO!) */}
              <div className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                      Metodo 1 • Già Attivo
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      Gratis 100%
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    WhatsApp Web & App Link Diretto (wa.me)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nessuna registrazione, nessuna API key, nessun canone. PRISMAL genera automaticamente link con messaggi precompilati che aprono WhatsApp Web o l'app sul cellulare con un singolo click.
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Zero setup richiesto</span>
                  <span>Operativo subito ✓</span>
                </div>
              </div>

              {/* OPZIONE 2: AGENTI GITHUB OPEN SOURCE (EVOLUTION API / BAILEYS) */}
              <div className="p-5 rounded-3xl border border-purple-200 bg-purple-50/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-800 uppercase tracking-wider">
                      Metodo 2 • GitHub Open-Source
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                      Gratuito Self-Hosted
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Evolution API & Baileys (QR Code Multi-Device)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    I famosi progetti open-source creati dalla community di sviluppatori su GitHub. Avvii un container gratuito (es. su Railway o VPS) e inquadri il QR Code con il numero del tuo studio esattamente come WhatsApp Web.
                  </p>
                </div>
                <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs font-bold">
                  <a
                    href="https://github.com/EvolutionAPI/evolution-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <span>Vedi GitHub Evolution API</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-500 font-mono text-[10px]">Webhook: /webhook/whatsapp</span>
                </div>
              </div>

              {/* OPZIONE 3: META CLOUD API WHATSAPP UFFICIALE */}
              <div className="p-5 rounded-3xl border border-sky-200 bg-sky-50/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-800 uppercase tracking-wider">
                      Metodo 3 • Ufficiale Meta
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                      1.000 chat/mese Gratis
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Meta Cloud API (WhatsApp Business Ufficiale)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    L'API ufficiale di Mark Zuckerberg per aziende. Registrandoti su <em>developers.facebook.com</em> hai 1.000 sessioni di conversazione gratuite ogni mese al 100%. Ideale per chi vuole la massima stabilità senza rischiare ban.
                  </p>
                </div>
                <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between text-xs font-bold">
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:underline flex items-center gap-1"
                  >
                    <span>Registrati su Meta Developers</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* OPZIONE 4: TWILIO TELEFONIA VOCALE & SANDBOX */}
              <div className="p-5 rounded-3xl border border-amber-200 bg-amber-50/30 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                      Metodo 4 • Telefonia Reale Twilio
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      $15 Crediti Omaggio
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Twilio Voice & WhatsApp Sandbox
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Le credenziali sono già integrate nel codice di PRISMAL. Twilio regala un numero di prova e 15$ di credito. Un numero geografico italiano costa circa 1€/mese per ricevere telefonate reali sull'endpoint <em>/api/voice/incoming</em>.
                  </p>
                </div>
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold">
                  <a
                    href="https://www.twilio.com/try-twilio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-800 hover:underline flex items-center gap-1"
                  >
                    <span>Crea Account Gratuito Twilio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* WEBHOOK DOCKER SNIPPET FOR GITHUB EVOLUTION API */}
            <div className="bg-slate-950 text-white p-5 rounded-3xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black">Comando 1-Click Docker per Agente WhatsApp GitHub</span>
                </div>
                <button
                  onClick={() => copyToClipboard('docker run -d -p 8080:8080 --name evolution-api atendai/evolution-api:latest', 'docker')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  {copiedCodeSnippet === 'docker' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCodeSnippet === 'docker' ? 'Copiato!' : 'Copia'}</span>
                </button>
              </div>

              <pre className="text-[11px] font-mono text-emerald-300 bg-slate-900/90 p-3 rounded-xl overflow-x-auto border border-slate-800">
                docker run -d -p 8080:8080 --name evolution-api atendai/evolution-api:latest
              </pre>

              <p className="text-[11px] text-slate-400">
                Una volta avviato, apri l'interfaccia su <code className="text-white">localhost:8080</code>, inquadra il QR Code con il tuo smartphone e imposta come Webhook URL l'indirizzo di questo gestionale: <code className="text-emerald-400">/webhook/whatsapp</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
