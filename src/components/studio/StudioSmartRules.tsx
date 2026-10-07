import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SmartBookingRules } from '../../types';
import { DEFAULT_SMART_BOOKING_RULES } from '../../data/mockData';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  Flame,
  UserCheck,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';

export const StudioSmartRules: React.FC = () => {
  const { activeStudio, updateStudioSmartRules } = useApp();

  if (!activeStudio) {
    return (
      <div className="p-8 text-center text-slate-500">
        Nessuno studio attivo selezionato.
      </div>
    );
  }

  const initialRules: SmartBookingRules =
    activeStudio.smartBookingRules || DEFAULT_SMART_BOOKING_RULES;

  const [rules, setRules] = useState<SmartBookingRules>(initialRules);
  const [isSaved, setIsSaved] = useState(false);

  const handleToggle = (field: keyof SmartBookingRules) => {
    setRules(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
    setIsSaved(false);
  };

  const handleNumberChange = (field: keyof SmartBookingRules, val: number) => {
    setRules(prev => ({
      ...prev,
      [field]: val,
    }));
    setIsSaved(false);
  };

  const handleSave = () => {
    updateStudioSmartRules(activeStudio.id, rules);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    setRules(DEFAULT_SMART_BOOKING_RULES);
    setIsSaved(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Regole Intelligenti di Prenotazione
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Protezione clinica dell'agenda: tempi di sterilizzazione, gestione urgenze e prevenzione no-show.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Ripristina
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                Salvate!
              </>
            ) : (
              <>Salva Modifiche</>
            )}
          </button>
        </div>
      </div>

      {/* Main Switch Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        rules.enabled
          ? 'bg-emerald-50/70 border-emerald-300'
          : 'bg-slate-100/80 border-slate-200'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              rules.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Filtri di Protezione Agenda: {rules.enabled ? 'Attivi' : 'Disattivati'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {rules.enabled
                  ? 'Il sistema applica automaticamente i buffer di sterilizzazione e le regole sotto indicate.'
                  : 'Nessun vincolo applicato: le prenotazioni avvengono liberamente.'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rules.enabled}
              onChange={() => handleToggle('enabled')}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Rules Grid (Solo regole cliniche ed organizzative reali) */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${rules.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        
        {/* 1. Anticipo Minimo di Prenotazione */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Anticipo Minimo Prenotazione</h4>
                <p className="text-[11px] text-slate-500">Tempo minimo prima della visita</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800">
              {rules.minNoticeHours} {rules.minNoticeHours === 1 ? 'ora' : 'ore'}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Evita visite improvvisate a ridosso dell'orario, dando al personale ASO il tempo di preparare vassoi e DPI.
          </p>

          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={rules.minNoticeHours}
            onChange={e => handleNumberChange('minNoticeHours', Number(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>1 ora</span>
            <span>6 ore</span>
            <span>12 ore</span>
          </div>
        </div>

        {/* 2. Buffer Sanificazione Poltrona */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Buffer Sanificazione Poltrona</h4>
                <p className="text-[11px] text-slate-500">Pausa tecnica tra pazienti consecutivi</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
              {rules.bufferTimeMinutes} min
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Intervallo riservato alla disinfezione delle superfici, ricambio guaine e allestimento della postazione.
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            {[0, 5, 10, 15].map(min => (
              <button
                key={min}
                type="button"
                onClick={() => handleNumberChange('bufferTimeMinutes', min)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  rules.bufferTimeMinutes === min
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {min === 0 ? 'Zero' : `${min}m`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Riserva Slot Urgenze Quotidiane */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Slot Urgenze Protetti al Giorno</h4>
                <p className="text-[11px] text-slate-500">Per dolore acuto, ascessi e traumi</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900">
              {rules.emergencySlotsReservedPerDay} {rules.emergencySlotsReservedPerDay === 1 ? 'slot' : 'slot'}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Preserva spazi quotidiani per chi ha mal di denti, evitando che visite ordinarie blocchino le emergenze.
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            {[0, 1, 2, 3].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberChange('emergencySlotsReservedPerDay', num)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  rules.emergencySlotsReservedPerDay === num
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {num === 0 ? 'Nessuno' : `${num} Slot`}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Smart Waitlist (Recupero Immediato Disdette) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Smart Waitlist (Recupero Disdette)</h4>
                <p className="text-[11px] text-slate-500">Riassegnazione automatica slot liberi</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rules.smartWaitlistEnabled ?? true}
                onChange={() => handleToggle('smartWaitlistEnabled')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Se un paziente disdice dal proprio link personale, l'orario si rende subito disponibile per azzerare le poltrone vuote.
          </p>
        </div>

        {/* 5. Protezione Anti-Spam e No-Show */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Max Prenotazioni per Paziente</h4>
                <p className="text-[11px] text-slate-500">Protezione da doppie prenotazioni</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800">
              Max {rules.maxActiveBookingsPerPatient}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Impedisce allo stesso utente di occupare più date contemporaneamente per "tenersi il posto".
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            {[1, 2, 3].map(limit => (
              <button
                key={limit}
                type="button"
                onClick={() => handleNumberChange('maxActiveBookingsPerPatient', limit)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  rules.maxActiveBookingsPerPatient === limit
                    ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {limit === 1 ? '1 Visita' : `${limit} Visite`}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Protezione Pausa Pranzo / Sterilizzazione Mezzogiorno */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Pausa Pranzo & Autoclave (13:00 - 14:30)</h4>
                <p className="text-[11px] text-slate-500">Blocco automatico orari centrali</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rules.lunchBreakProtection ?? true}
                onChange={() => handleToggle('lunchBreakProtection')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Protegge la fascia oraria dedicata al ciclo di sterilizzazione in autoclave e al cambio turno del personale.
          </p>
        </div>

      </div>
    </div>
  );
};
