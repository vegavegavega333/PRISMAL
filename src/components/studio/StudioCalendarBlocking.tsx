import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BlockedSlot } from '../../types';
import {
  CalendarOff,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const StudioCalendarBlocking: React.FC = () => {
  const { activeStudio, blockedSlots, addBlockedSlot, removeBlockedSlot } = useApp();

  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [isAllDay, setIsAllDay] = useState(true);
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [reasonType, setReasonType] = useState<BlockedSlot['reasonType']>('ferie');
  const [customNote, setCustomNote] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  if (!activeStudio) return null;

  const studioBlockedSlots = blockedSlots.filter(b => b.studioId === activeStudio.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    let defaultLabel = '';
    switch (reasonType) {
      case 'ferie':
        defaultLabel = 'Chiusura per ferie studio';
        break;
      case 'festivita':
        defaultLabel = 'Festività o chiusura programmata';
        break;
      case 'manutenzione':
        defaultLabel = 'Manutenzione attrezzature / riunito';
        break;
      case 'pausa_personale':
        defaultLabel = 'Pausa medica / impegno personale';
        break;
      case 'chiusura_straordinaria':
        defaultLabel = 'Chiusura straordinaria';
        break;
      default:
        defaultLabel = 'Disponibilità non prenotabile';
    }

    const finalLabel = customNote.trim() ? `${defaultLabel}: ${customNote.trim()}` : defaultLabel;

    addBlockedSlot({
      studioId: activeStudio.id,
      date,
      timeSlot: isAllDay ? undefined : timeSlot,
      isAllDay,
      reasonType,
      reasonLabel: finalLabel,
    });

    setCustomNote('');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);
  };

  const getReasonBadge = (type: BlockedSlot['reasonType']) => {
    switch (type) {
      case 'ferie':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">🏖️ Ferie</span>;
      case 'festivita':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">🎉 Festività</span>;
      case 'manutenzione':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">🔧 Manutenzione</span>;
      case 'pausa_personale':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">☕ Pausa Personale</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">⛔ Blocco</span>;
    }
  };

  // Generate selectable time slots
  const commonTimeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs uppercase tracking-wider mb-1">
              <CalendarOff className="w-4 h-4" />
              Gestione Blocchi Calendario & Chiusure
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Blocco Manuale Slot Orari e Intere Giornate
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Blocca la prenotazione online per ferie, corsi di formazione, festività o manutenzione poltrona. 
              Gli orari o i giorni bloccati <strong>non saranno visibili né prenotabili dai pazienti</strong> sul minisito pubblico.
            </p>
          </div>
        </div>

        {/* Form to add a new block */}
        <form onSubmit={handleSubmit} className="mt-6 bg-slate-50/80 p-5 rounded-xl border border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-rose-600" />
            Nuovo Blocco Disponibilità
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Bloccare
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Scope: Full day or single slot */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estensione Blocco
              </label>
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setIsAllDay(true)}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition ${
                    isAllDay ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Intero Giorno
                </button>
                <button
                  type="button"
                  onClick={() => setIsAllDay(false)}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition ${
                    !isAllDay ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Singolo Slot
                </button>
              </div>
            </div>

            {/* Slot time if single slot */}
            {!isAllDay && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Orario Slot
                </label>
                <select
                  value={timeSlot}
                  onChange={e => setTimeSlot(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {commonTimeSlots.map(slot => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reason Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo Chiusura
              </label>
              <select
                value={reasonType}
                onChange={e => setReasonType(e.target.value as BlockedSlot['reasonType'])}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="ferie">Ferie Staff / Chiusura Estiva/Invernale</option>
                <option value="festivita">Festività Nazionale / Santo Patrono</option>
                <option value="manutenzione">Manutenzione Riunito / Igienizzazione</option>
                <option value="pausa_personale">Pausa Personale / Corso Aggiornamento</option>
                <option value="chiusura_straordinaria">Chiusura Straordinaria</option>
                <option value="altro">Altra Indisponibilità</option>
              </select>
            </div>
          </div>

          {/* Optional Note */}
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dettagli Aggiuntivi / Note Interne (Opzionale)
            </label>
            <input
              type="text"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="es. Sostituzione tubi riunito 3, o Chiusura ponte festivo"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Lo slot o giorno bloccato scompare istantaneamente dalla vista del paziente sul minisito.</span>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <CalendarOff className="w-4 h-4" />
              Applica Blocco
            </button>
          </div>
        </form>

        {showSuccessToast && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Blocco calendario registrato con successo! Minisito aggiornato in tempo reale.</span>
          </div>
        )}
      </div>

      {/* List of active blocks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Blocchi Attivi per questo Studio ({studioBlockedSlots.length})
          </h3>
          <span className="text-xs text-slate-500">
            Filtro automatico applicato sul minisito
          </span>
        </div>

        {studioBlockedSlots.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Nessun blocco orario o festività configurata</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Il calendario seguirà la disponibilità settimanale standard configurata nel tab Orari.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {studioBlockedSlots.map(block => (
              <div
                key={block.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
                    <CalendarOff className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {new Date(block.date).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      {block.isAllDay ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                          Intera Giornata
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ore {block.timeSlot}
                        </span>
                      )}
                      {getReasonBadge(block.reasonType)}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{block.reasonLabel}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeBlockedSlot(block.id)}
                  className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition"
                  title="Sblocca e rendi nuovamente prenotabile sul minisito"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sblocca Disponibilità
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
