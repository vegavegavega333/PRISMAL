import React, { useState, useEffect } from 'react';
import { Appointment, DentalChair } from '../../types';
import {
  CLINICAL_DEPARTMENT_TEMPLATES,
  calculateEndTimeSlot,
} from '../../data/defaultChairs';
import {
  X,
  Sliders,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Stethoscope,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  chairs: DentalChair[];
  onSave: (appointmentId: string, updates: Partial<Appointment>) => void;
  onDelete?: (appointmentId: string) => void;
  onOpenClinicalRecord?: (appointment: Appointment) => void;
  onOpenReminder?: (appointment: Appointment) => void;
}

const DURATION_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m (1h)', minutes: 60 },
  { label: '90m (Standard 1h 30m)', minutes: 90 },
  { label: '120m (2h)', minutes: 120 },
  { label: '150m (2h 30m)', minutes: 150 },
  { label: '180m (3h)', minutes: 180 },
];

export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  chairs,
  onSave,
  onDelete,
  onOpenClinicalRecord,
  onOpenReminder,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [chairId, setChairId] = useState('');
  const [department, setDepartment] = useState('Conservativa');
  const [visitReason, setVisitReason] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [status, setStatus] = useState<Appointment['status']>('confirmed');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (appointment) {
      const rawFirst = appointment.patientFirstName || '';
      const rawLast = appointment.patientLastName || '';
      setFirstName(rawFirst);
      setLastName(rawLast.trim().toLowerCase() === rawFirst.trim().toLowerCase() ? '' : rawLast);
      setPhone(appointment.patientPhone || '');
      setEmail(appointment.patientEmail || '');
      setChairId(appointment.chairId || (chairs[0]?.id || ''));
      setDepartment(appointment.department || 'Conservativa');
      setVisitReason(appointment.visitReasonName || '');
      setDate(appointment.date || '');
      setTimeSlot(appointment.timeSlot || '09:00');
      setDurationMinutes(appointment.durationMinutes || 90);
      setStatus(appointment.status || 'confirmed');
      setNotes(appointment.notes || '');
      setFeedback(null);
      setConfirmDelete(false);
    }
  }, [appointment, chairs, isOpen]);

  if (!isOpen || !appointment) return null;

  const calculatedEndTime = calculateEndTimeSlot(timeSlot, durationMinutes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedChair = chairs.find(c => c.id === chairId);

    onSave(appointment.id, {
      patientFirstName: firstName.trim(),
      patientLastName: lastName.trim(),
      patientPhone: phone.trim(),
      patientEmail: email.trim(),
      chairId: chairId || undefined,
      chairName: selectedChair?.name || appointment.chairName,
      department: department || selectedChair?.department,
      operatorName: selectedChair?.defaultOperator || appointment.operatorName,
      visitReasonName: visitReason.trim(),
      date,
      timeSlot,
      durationMinutes,
      endTimeSlot: calculatedEndTime,
      status,
      notes: notes.trim(),
    });

    setFeedback('Seduta in poltrona aggiornata con successo!');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 700);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDelete) {
      onDelete(appointment.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[94vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Modifica Seduta Clinica
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  #{appointment.code}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pianificazione poltrona, orario, durata e cartella clinica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="m-4 mb-0 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Patient Details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>Dati Paziente</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cognome *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Cellulare (WhatsApp) *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="es. 347 123 4567"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>Email Paziente (per Promemoria)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="es. paziente@email.it"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Chair & Clinical Department Template */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
                <span>Poltrona Assegnata</span>
              </label>
              <select
                value={chairId}
                onChange={e => {
                  const target = chairs.find(c => c.id === e.target.value);
                  setChairId(e.target.value);
                  if (target?.department) setDepartment(target.department);
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {chairs.length > 0 ? (
                  chairs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.department ? `(${c.department})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">Poltrona Principale (Studio)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Template Reparto Clinico
              </label>
              <select
                value={department}
                onChange={e => {
                  setDepartment(e.target.value);
                  const tmpl = CLINICAL_DEPARTMENT_TEMPLATES.find(t => t.category === e.target.value);
                  if (tmpl) {
                    setDurationMinutes(tmpl.defaultDurationMinutes); // 90 min standard
                    if (!visitReason) setVisitReason(tmpl.suggestedProcedures[0] || tmpl.name);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {CLINICAL_DEPARTMENT_TEMPLATES.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.category}>
                    {tmpl.name} (90 min)
                  </option>
                ))}
                <option value="Generale">Reparto Generale Odontoiatrico</option>
              </select>
            </div>
          </div>

          {/* Procedure & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Prestazione Clinica / Motivo
              </label>
              <input
                type="text"
                required
                value={visitReason}
                onChange={e => setVisitReason(e.target.value)}
                placeholder="es. Terapia Endodontica / Ricostruzione"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Stato Seduta
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Appointment['status'])}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="confirmed">Confermato</option>
                <option value="in_progress">In Poltrona (In Corso)</option>
                <option value="completed">Completato</option>
                <option value="pending">In Attesa</option>
                <option value="cancelled">Disdetto</option>
              </select>
            </div>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Data Visita</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Orario di Inizio</span>
              </label>
              <input
                type="time"
                required
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* SELETTORE SCORREVOLE DURATA SEDUTA (SLIDER DISCIPLINE) */}
          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-700" />
                <label className="text-xs font-black text-purple-950">
                  Selettore Scorrevole Durata
                </label>
              </div>
              <div className="px-3 py-1 rounded-xl bg-purple-600 text-white font-mono font-bold text-xs shadow-2xs">
                {durationMinutes} min ({Math.floor(durationMinutes / 60)}h{' '}
                {durationMinutes % 60 ? `${durationMinutes % 60}m` : ''})
              </div>
            </div>

            {/* Range Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={15}
                max={240}
                step={15}
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full h-2.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
              />
              <div className="flex justify-between text-[10px] font-mono text-purple-800">
                <span>15m</span>
                <span>60m (1h)</span>
                <span className="font-bold text-purple-950">90m (Standard 1h 30m)</span>
                <span>180m (3h)</span>
                <span>240m (4h)</span>
              </div>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DURATION_PRESETS.map(preset => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => setDurationMinutes(preset.minutes)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                    durationMinutes === preset.minutes
                      ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                      : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Time slot calculation */}
            <div className="pt-2 border-t border-purple-200/80 flex items-center justify-between text-xs text-purple-900 font-semibold">
              <span>Occupazione Poltrona:</span>
              <span className="font-mono font-bold bg-white/90 px-2 py-0.5 rounded-lg border border-purple-200">
                Dalle {timeSlot} alle {calculatedEndTime}
              </span>
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Note Operative Cliniche (opzionale)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Elementi dentali, anestetico, indicazioni per l'assistente alla poltrona..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Quick clinical actions */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {onOpenClinicalRecord && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenClinicalRecord(appointment);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                  <span>Cartella Clinica</span>
                </button>
              )}

              {onOpenReminder && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenReminder(appointment);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Invia Reminder</span>
                </button>
              )}
            </div>

            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  confirmDelete
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? 'Conferma Eliminazione' : 'Elimina Seduta'}</span>
              </button>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Salva Modifiche</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
