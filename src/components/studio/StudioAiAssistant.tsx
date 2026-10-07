import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { askStudioAi } from '../../services/aiService';
import {
  Bot,
  Sparkles,
  Send,
  Copy,
  Check,
  Calendar,
  MessageSquare,
  Zap,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const StudioAiAssistant: React.FC = () => {
  const { activeStudio, appointments } = useApp();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; timestamp: string }>>([
    {
      sender: 'ai',
      text: `Ciao! Sono il tuo Copilot PRISMAL basato su Gemini. Posso analizzare l'agenda di oggi, redigere messaggi personalizzati per i tuoi pazienti o suggerirti come ottimizzare gli slot della clinica. Come posso aiutarti?`,
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!activeStudio) return null;

  // Prepare context data for AI
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(
    a => a.studioId === activeStudio.id && a.date === todayStr && a.status !== 'cancelled'
  );

  const contextSummary = `Studio: ${activeStudio.name}, Città: ${activeStudio.city}.
Appuntamenti oggi (${todayStr}): ${todayAppointments.length}.
Lista appuntamenti oggi:
${todayAppointments.map(a => `- Ore ${a.timeSlot}: ${a.patientFirstName} ${a.patientLastName} (${a.visitReasonName}, Stato: ${a.status})`).join('\n') || 'Nessun appuntamento per oggi.'}`;

  const handleSendMessage = async (customPrompt?: string, taskType?: any) => {
    const query = customPrompt || prompt;
    if (!query.trim() || loading) return;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setPrompt('');
    setLoading(true);

    try {
      const res = await askStudioAi({
        prompt: query,
        context: contextSummary,
        studioName: activeStudio.name,
        taskType: taskType || 'general',
      });

      const aiMsg = {
        sender: 'ai' as const,
        text: res.text,
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Si è verificato un errore durante la generazione. Riprova tra poco.',
          timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[640px]">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-900 to-indigo-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shadow-inner">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">PRISMAL Copilot</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-400 text-slate-950 uppercase tracking-wider">
                Gemini AI
              </span>
            </div>
            <p className="text-xs text-sky-200/80">
              Assistente intelligente per la gestione clinica e segreteria di {activeStudio.name}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() =>
            handleSendMessage(
              'Genera un briefing operativo dettagliato della giornata odierna: analizza i pazienti in arrivo, consiglia le priorità di preparazione e le azioni di segreteria.',
              'daily_briefing'
            )
          }
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 font-semibold transition flex items-center gap-1.5 shadow-xs"
        >
          <Calendar className="w-3.5 h-3.5 text-sky-600" />
          <span>Briefing Agenda di Oggi</span>
        </button>

        <button
          onClick={() =>
            handleSendMessage(
              'Scrivi una bozza di promemoria WhatsApp professionale ed empatico per ricordare ai pazienti la visita di domani, raccomandando di arrivare con 5 minuti di anticipo.',
              'patient_message'
            )
          }
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 font-semibold transition flex items-center gap-1.5 shadow-xs"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bozza Messaggio WhatsApp</span>
        </button>

        <button
          onClick={() =>
            handleSendMessage(
              'Come posso ottimizzare l\'agenda della settimana per ridurre i buchi tra un appuntamento e l\'altro e incentivare i controlli periodici di igiene?',
              'slot_optimization'
            )
          }
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 font-semibold transition flex items-center gap-1.5 shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-purple-600" />
          <span>Ottimizzazione Slot Liberi</span>
        </button>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((m, idx) => {
          const isAi = m.sender === 'ai';
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
            >
              {isAi && (
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 mt-1 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                  isAi
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'bg-sky-600 text-white rounded-br-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                <div
                  className={`mt-2 flex items-center justify-between text-[10px] ${
                    isAi ? 'text-slate-400' : 'text-sky-200'
                  }`}
                >
                  <span>{m.timestamp}</span>

                  {isAi && (
                    <button
                      onClick={() => handleCopy(m.text, idx)}
                      className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-sky-600 hover:text-sky-800"
                      title="Copia testo negli appunti"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copiato</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copia</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 italic">
              PRISMAL Copilot sta elaborando con Gemini...
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Chiedi al Copilot (es. 'Scrivi un promemoria per il paziente Mario', 'Come gestire un'urgenza tra due visite')..."
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Invia</span>
          </button>
        </form>
      </div>
    </div>
  );
};
