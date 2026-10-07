import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DayAvailability } from '../../types';
import { Clock, Check, Calendar, AlertCircle } from 'lucide-react';

export const StudioAvailability: React.FC = () => {
  const { activeStudio, updateWeeklyAvailability, updateStudioProfile } = useApp();

  if (!activeStudio) {
    return <div className="p-8 text-center text-slate-500">Nessuno studio attivo selezionato.</div>;
  }

  const [availability, setAvailability] = useState<DayAvailability[]>(
    activeStudio.weeklyAvailability
  );
  const [slotDuration, setSlotDuration] = useState<number>(
    activeStudio.slotDurationMinutes || 30
  );
  const [isSaved, setIsSaved] = useState(false);

  const toggleDay = (dayOfWeek: number) => {
    setAvailability(prev =>
      prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, isOpen: !d.isOpen } : d))
    );
    setIsSaved(false);
  };

  const updateHours = (
    dayOfWeek: number,
    field: 'morningStart' | 'morningEnd' | 'afternoonStart' | 'afternoonEnd',
    val: string
  ) => {
    setAvailability(prev =>
      prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: val } : d))
    );
    setIsSaved(false);
  };

  const handleSave = () => {
    updateWeeklyAvailability(activeStudio.id, availability);
    updateStudioProfile(activeStudio.id, { slotDurationMinutes: slotDuration });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Gestione Disponibilità & Orari di Apertura
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configura i giorni e le fasce orarie in cui il minisito paziente renderà disponibili gli slot di visita.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-white" />
              Modifiche Salvate!
            </>
          ) : (
            <>Salva Disponibilità</>
          )}
        </button>
      </div>

      {/* Slot duration selector */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sky-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Durata Predefinita per Singolo Slot</h4>
            <p className="text-[11px] text-slate-500">
              Intervallo di tempo generato tra un appuntamento e il successivo nel minisito.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[30, 45, 60].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => {
                setSlotDuration(mins);
                setIsSaved(false);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                slotDuration === mins
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {mins} min
            </button>
          ))}
        </div>
      </div>

      {/* Days Table / Grid */}
      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
        {availability.map(day => (
          <div
            key={day.dayOfWeek}
            className={`p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              day.isOpen ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
            }`}
          >
            {/* Day name & toggle switch */}
            <div className="flex items-center gap-3 min-w-[160px]">
              <button
                type="button"
                onClick={() => toggleDay(day.dayOfWeek)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  day.isOpen ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    day.isOpen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <span className="font-bold text-sm text-slate-900 block">{day.dayName}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  {day.isOpen ? 'Riceve su prenotazione' : 'Chiuso'}
                </span>
              </div>
            </div>

            {/* Hours configuration */}
            {day.isOpen ? (
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {/* Mattina */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-500 uppercase text-[10px]">Mattina:</span>
                  <input
                    type="time"
                    value={day.morningStart}
                    onChange={e => updateHours(day.dayOfWeek, 'morningStart', e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="time"
                    value={day.morningEnd}
                    onChange={e => updateHours(day.dayOfWeek, 'morningEnd', e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Pomeriggio */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-500 uppercase text-[10px]">Pomeriggio:</span>
                  <input
                    type="time"
                    value={day.afternoonStart}
                    onChange={e => updateHours(day.dayOfWeek, 'afternoonStart', e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="time"
                    value={day.afternoonEnd}
                    onChange={e => updateHours(day.dayOfWeek, 'afternoonEnd', e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Nessun orario di prenotazione disponibile per questo giorno
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl flex items-start gap-2 text-xs text-sky-800">
        <AlertCircle className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
        <span>
          Le modifiche hanno effetto immediato sul calendario del minisito paziente. Gli appuntamenti già confermati non subiranno variazioni.
        </span>
      </div>
    </div>
  );
};
