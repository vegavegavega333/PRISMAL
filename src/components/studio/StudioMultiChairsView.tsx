import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, DentalChair, PatientRecord } from '../../types';
import {
  DEFAULT_DENTAL_CHAIRS,
  getStudioChairs,
  saveStudioChairs,
  resolveAppointmentChair,
  calculateEndTimeSlot,
  CHAIR_COLOR_MAP,
  getEstimatedDuration,
} from '../../data/defaultChairs';
import {
  Clock,
  Plus,
  Settings2,
  Sparkles,
  Smartphone,
  HeartPulse,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  Filter,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Edit3,
  Phone,
  MessageSquare,
  Lock,
  Layers,
  Users,
} from 'lucide-react';
import { StudioSendSmsModal } from './StudioSendSmsModal';
import { PatientClinicalRecordModal } from './PatientClinicalRecordModal';

interface StudioMultiChairsViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const StudioMultiChairsView: React.FC<StudioMultiChairsViewProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const {
    activeStudio,
    appointments,
    updateAppointmentStatus,
    patientRecords,
    savePatientRecord,
    createDirectAppointment,
  } = useApp();

  // Chairs state for current studio
  const [chairs, setChairs] = useState<DentalChair[]>(() => {
    return getStudioChairs(activeStudio?.id || '');
  });

  // Filter state
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');

  // Modals state
  const [isManageChairsOpen, setIsManageChairsOpen] = useState(false);
  const [editingChair, setEditingChair] = useState<DentalChair | null>(null);

  // Quick Book modal state
  const [quickBookModal, setQuickBookModal] = useState<{
    isOpen: boolean;
    chairId: string;
    timeSlot: string;
  } | null>(null);
  const [qbPatientName, setQbPatientName] = useState('');
  const [qbPatientPhone, setQbPatientPhone] = useState('');
  const [qbVisitReason, setQbVisitReason] = useState('Prima Visita Odontoiatrica & Check-up');
  const [qbDuration, setQbDuration] = useState(45);
  const [qbNotes, setQbNotes] = useState('');
  const [qbError, setQbError] = useState<string | null>(null);
  const [qbIsSubmitting, setQbIsSubmitting] = useState(false);

  // Move Chair modal state
  const [moveModalAppointment, setMoveModalAppointment] = useState<Appointment | null>(null);
  const [targetChairId, setTargetChairId] = useState<string>('');

  // Patient Clinical Chart & SMS modal state
  const [selectedClinicalPatient, setSelectedClinicalPatient] = useState<PatientRecord | null>(null);
  const [smsModalAppointment, setSmsModalAppointment] = useState<Appointment | null>(null);

  // Time slots for clinic day: 08:30 to 19:30
  const TIME_SLOTS = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h <= 19; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots.filter(s => s >= '08:30' && s <= '19:30');
  }, []);

  // Filtered chairs
  const visibleChairs = useMemo(() => {
    return chairs.filter(c => {
      if (!c.isActive) return false;
      if (filterDepartment !== 'all' && !c.department.toLowerCase().includes(filterDepartment.toLowerCase())) {
        return false;
      }
      if (filterOperator !== 'all' && !c.defaultOperator.toLowerCase().includes(filterOperator.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [chairs, filterDepartment, filterOperator]);

  // Unique departments and operators for dropdown filters
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    chairs.forEach(c => set.add(c.department));
    return Array.from(set);
  }, [chairs]);

  const operatorsList = useMemo(() => {
    const set = new Set<string>();
    chairs.forEach(c => set.add(c.defaultOperator));
    return Array.from(set);
  }, [chairs]);

  // Appointments on selected date, mapped to their resolved chairs
  const dateAppointments = useMemo(() => {
    return appointments.filter(a => a.date === selectedDate && a.status !== 'cancelled');
  }, [appointments, selectedDate]);

  // Map of chairId -> appointments list
  const appointmentsByChair = useMemo(() => {
    const map: Record<string, { appointment: Appointment; chair: DentalChair; durationMinutes: number; endTime: string }[]> = {};
    chairs.forEach(c => {
      map[c.id] = [];
    });

    dateAppointments.forEach(a => {
      const resolved = resolveAppointmentChair(a, chairs);
      if (map[resolved.chair.id]) {
        map[resolved.chair.id].push({
          appointment: a,
          chair: resolved.chair,
          durationMinutes: resolved.durationMinutes,
          endTime: resolved.endTime,
        });
      }
    });

    // Sort by timeSlot
    Object.keys(map).forEach(key => {
      map[key].sort((x, y) => x.appointment.timeSlot.localeCompare(y.appointment.timeSlot));
    });

    return map;
  }, [chairs, dateAppointments]);

  // Quick stats for today
  const totalBookedMinutes = useMemo(() => {
    let sum = 0;
    const allLists: any[] = Object.values(appointmentsByChair);
    for (const list of allLists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          sum += (item.durationMinutes || 45);
        }
      }
    }
    return sum;
  }, [appointmentsByChair]);

  const totalBookedHours = (totalBookedMinutes / 60).toFixed(1);

  // Date navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onSelectDate(new Date().toISOString().split('T')[0]);
  };

  // Chair management handlers
  const handleSaveChairs = (updated: DentalChair[]) => {
    setChairs(updated);
    if (activeStudio?.id) {
      saveStudioChairs(activeStudio.id, updated);
    }
  };

  const handleOpenClinicalRecord = (apt: Appointment) => {
    if (!activeStudio) return;
    const pKey = (apt.patientEmail || apt.patientPhone).toLowerCase().trim();
    const existing = patientRecords.find(
      p =>
        p.studioId === activeStudio.id &&
        ((p.email && p.email.toLowerCase().trim() === pKey) ||
          (p.phone && p.phone.trim() === apt.patientPhone.trim()))
    );

    if (existing) {
      setSelectedClinicalPatient(existing);
    } else {
      const draft: PatientRecord = {
        id: `p-${apt.id}`,
        studioId: activeStudio.id,
        firstName: apt.patientFirstName,
        lastName: apt.patientLastName,
        phone: apt.patientPhone,
        email: apt.patientEmail,
        totalVisits: 1,
        firstVisitDate: apt.date,
        lastVisitDate: apt.date,
        pastTreatments: [
          {
            date: apt.date,
            treatment: apt.visitReasonName,
            notes: apt.notes || 'Registrato in poltrona',
          },
        ],
        createdAt: new Date().toISOString(),
      };
      savePatientRecord(draft);
      setSelectedClinicalPatient(draft);
    }
  };

  // Quick Book submission
  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBookModal || !activeStudio) return;
    setQbError(null);

    const parts = qbPatientName.trim().split(' ');
    const firstName = parts[0] || 'Paziente';
    const lastName = parts.slice(1).join(' ') || '';

    if (!qbPatientPhone.trim()) {
      setQbError('Inserisci un numero di cellulare per il paziente.');
      return;
    }

    setQbIsSubmitting(true);
    try {
      const targetChair = chairs.find(c => c.id === quickBookModal.chairId);
      const calculatedEnd = calculateEndTimeSlot(quickBookModal.timeSlot, qbDuration);

      const created = await createDirectAppointment({
        studioId: activeStudio.id,
        patientFirstName: firstName,
        patientLastName: lastName || firstName,
        patientPhone: qbPatientPhone.trim(),
        patientEmail: '',
        visitReasonId: 'vr-custom',
        visitReasonName: qbVisitReason,
        durationMinutes: qbDuration,
        date: selectedDate,
        timeSlot: quickBookModal.timeSlot,
        endTimeSlot: calculatedEnd,
        chairId: quickBookModal.chairId,
        chairName: targetChair?.name,
        operatorName: targetChair?.defaultOperator,
        department: targetChair?.department,
        notes: qbNotes.trim() || undefined,
        status: 'confirmed',
        gdprConsent: true,
        gdprConsentTimestamp: new Date().toISOString(),
      });

      if (created) {
        setQuickBookModal(null);
        setQbPatientName('');
        setQbPatientPhone('');
        setQbNotes('');
      } else {
        setQbError('Impossibile registrare la prenotazione in poltrona.');
      }
    } catch (err: any) {
      setQbError(err?.message || 'Errore di salvataggio');
    } finally {
      setQbIsSubmitting(false);
    }
  };

  // Move Chair submission
  const handleMoveChair = (apptId: string, newChairId: string) => {
    const chairObj = chairs.find(c => c.id === newChairId);
    if (!chairObj) return;

    // Mutate appointment locally
    const appt = appointments.find(a => a.id === apptId);
    if (appt) {
      appt.chairId = newChairId;
      appt.chairName = chairObj.name;
      appt.operatorName = chairObj.defaultOperator;
      appt.department = chairObj.department;
      // Persist state update
      updateAppointmentStatus(apptId, appt.status);
    }
    setMoveModalAppointment(null);
  };

  const selectedDateObj = new Date(selectedDate);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* 1. CLINICAL HEADER & TOOLBAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Day & Department info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
              Planning Clinico Multi-Poltrona
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              Parodontologia, CLID, CLOPD & Reparti
            </span>
          </div>

          <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 capitalize tracking-tight">
              {formattedSelectedDate}
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {visibleChairs.length} Poltrone Attive
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
            <span>
              Pazienti oggi: <strong>{dateAppointments.length}</strong>
            </span>
            <span>•</span>
            <span>
              Ore occupate: <strong>{totalBookedHours} h</strong>
            </span>
            <span>•</span>
            <span className="text-purple-700 font-semibold">
              {visibleChairs.map(c => c.name).join(', ')}
            </span>
          </p>
        </div>

        {/* Right: Quick Date Nav & Config button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
              title="Giorno precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 rounded-xl text-xs font-bold text-slate-800 hover:bg-white transition cursor-pointer"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
              title="Giorno successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={e => onSelectDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Manage Chairs Button */}
          <button
            type="button"
            onClick={() => setIsManageChairsOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Aggiungi o modifica poltrone, reparti e operatori"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Gestisci Poltrone ({chairs.length})</span>
          </button>
        </div>
      </div>

      {/* 2. FILTERS BAR (REPARTO & OPERATORE) */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtra:</span>
          </div>

          {/* Reparto Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Reparto:</span>
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Tutti i Reparti</option>
              {departmentsList.map(dep => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Operatore Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Operatore:</span>
            <select
              value={filterOperator}
              onChange={e => setFilterOperator(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Tutti gli Operatori</option>
              {operatorsList.map(op => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Parodontologia
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> CLID (Igiene)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> CLOPD (Protesi)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Conservativa
          </span>
        </div>
      </div>

      {/* 3. MULTI-CHAIR CLINICAL GRID */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {visibleChairs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Nessuna poltrona corrisponde ai filtri</h3>
            <p className="text-xs text-slate-500">
              Modifica i filtri per reparto o operatore, oppure ripristina tutte le poltrone.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterDepartment('all');
                setFilterOperator('all');
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-purple-700 transition"
            >
              Mostra Tutte le Poltrone
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Grid Container */}
            <div
              className="min-w-[900px] grid"
              style={{
                gridTemplateColumns: `80px repeat(${visibleChairs.length}, minmax(260px, 1fr))`,
              }}
            >
              {/* Header: Left corner (Time label) */}
              <div className="sticky top-0 z-20 bg-slate-900 text-white p-3.5 border-b border-r border-slate-800 flex items-center justify-center font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-purple-400" />
              </div>

              {/* Header: Chairs columns headers */}
              {visibleChairs.map(chair => {
                const colors = CHAIR_COLOR_MAP[chair.color] || CHAIR_COLOR_MAP.purple;
                const chairAppointments = appointmentsByChair[chair.id] || [];
                const occupiedMins = chairAppointments.reduce((acc, curr) => acc + curr.durationMinutes, 0);

                return (
                  <div
                    key={chair.id}
                    className={`sticky top-0 z-20 p-3.5 border-b border-r border-slate-200 bg-white flex flex-col justify-between ${colors.bg}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full ${colors.accent}`} />
                        <h4 className="text-sm font-black text-slate-900">{chair.name}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badgeBg} ${colors.badgeText}`}>
                        {chairAppointments.length} {chairAppointments.length === 1 ? 'paziente' : 'pazienti'}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[170px]" title={chair.department}>
                        {chair.department}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {Math.floor(occupiedMins / 60)}h {occupiedMins % 60}m
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1 truncate" title={chair.defaultOperator}>
                      <Stethoscope className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-medium">{chair.defaultOperator}</span>
                    </div>
                  </div>
                );
              })}

              {/* Body: Time slots rows */}
              {TIME_SLOTS.map((timeSlot, timeIdx) => {
                const isHour = timeSlot.endsWith(':00');

                return (
                  <React.Fragment key={timeSlot}>
                    {/* Time Label Cell on the left */}
                    <div
                      className={`p-2.5 text-center border-r border-b border-slate-200 text-xs font-mono font-bold flex items-center justify-center ${
                        isHour ? 'bg-slate-50 text-slate-800' : 'bg-white text-slate-400 text-[11px]'
                      }`}
                    >
                      {timeSlot}
                    </div>

                    {/* Columns for each chair at this timeSlot */}
                    {visibleChairs.map(chair => {
                      const colors = CHAIR_COLOR_MAP[chair.color] || CHAIR_COLOR_MAP.purple;
                      const chairAppts = appointmentsByChair[chair.id] || [];

                      // Check if an appointment starts at this exact timeSlot
                      const startingItem = chairAppts.find(item => item.appointment.timeSlot === timeSlot);

                      // Check if an appointment covers this timeSlot (running from earlier)
                      const runningItem = chairAppts.find(item => {
                        const start = item.appointment.timeSlot;
                        const end = item.endTime;
                        return timeSlot > start && timeSlot < end;
                      });

                      // If an appointment is running over this slot, we render a subtle continuation connector
                      if (runningItem) {
                        return (
                          <div
                            key={`${chair.id}-${timeSlot}`}
                            className={`p-2 border-r border-b border-slate-200/60 relative ${colors.bg}`}
                          >
                            <div className="h-full border-l-2 border-dashed border-purple-300/80 ml-3 pl-2 flex items-center">
                              <span className="text-[10px] text-slate-400 italic">
                                ↳ in corso ({runningItem.appointment.patientFirstName} {runningItem.appointment.patientLastName})
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // If an appointment starts here: render the complete clinical card!
                      if (startingItem) {
                        const appt = startingItem.appointment;
                        const duration = startingItem.durationMinutes;
                        const endTime = startingItem.endTime;
                        const isUrgent = appt.isUrgent || appt.visitReasonName.toLowerCase().includes('urgenza');

                        return (
                          <div
                            key={`${chair.id}-${timeSlot}`}
                            className="p-2 border-r border-b border-slate-200 align-top relative bg-slate-50/30"
                          >
                            <div
                              className={`rounded-2xl border p-3 shadow-xs transition ${colors.cardBg} ${colors.cardBorder} ${colors.cardHover}`}
                            >
                              {/* Card Header: Duration & Status Badge */}
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="tabular-nums font-mono text-[11px] font-bold text-slate-900 bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                  {timeSlot} - {endTime} ({duration}m)
                                </span>

                                <div className="flex items-center gap-1">
                                  {isUrgent && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white font-extrabold text-[9px] animate-pulse">
                                      URGENZA
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      appt.status === 'confirmed'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : appt.status === 'in_progress'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-300 animate-pulse'
                                        : appt.status === 'completed'
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {appt.status === 'confirmed'
                                      ? 'Confermato'
                                      : appt.status === 'in_progress'
                                      ? 'In Poltrona'
                                      : appt.status === 'completed'
                                      ? 'Completato'
                                      : 'In Attesa'}
                                  </span>
                                </div>
                              </div>

                              {/* Patient Name & Clinical Details */}
                              <div className="mt-2">
                                <h4 className="text-xs font-black text-slate-900 leading-tight">
                                  {appt.patientFirstName} {appt.patientLastName}
                                </h4>
                                <p className="text-[11px] font-medium text-slate-700 mt-0.5 leading-snug">
                                  {appt.visitReasonName}
                                </p>
                              </div>

                              {/* Operator in chair */}
                              <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-600">
                                <span className="flex items-center gap-1 font-semibold truncate max-w-[140px]">
                                  <Stethoscope className="w-3 h-3 text-slate-500" />
                                  <span className="truncate">{appt.operatorName || chair.defaultOperator}</span>
                                </span>
                                {appt.patientPhone && (
                                  <a
                                    href={`tel:${appt.patientPhone}`}
                                    className="font-mono text-slate-500 hover:text-sky-600 transition flex items-center gap-0.5"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{appt.patientPhone.slice(-4)}</span>
                                  </a>
                                )}
                              </div>

                              {/* Quick Actions Row */}
                              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1 flex-wrap">
                                {/* Open Cartella Clinica */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenClinicalRecord(appt)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/90 hover:bg-white text-slate-800 border border-slate-200 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Apri Cartella Clinica & Odontogramma digitale"
                                >
                                  <HeartPulse className="w-3 h-3 text-sky-600" />
                                  <span>Cartella</span>
                                </button>

                                {/* Direct Twilio SMS to Patient */}
                                <button
                                  type="button"
                                  onClick={() => setSmsModalAppointment(appt)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Invia SMS rapido con Twilio"
                                >
                                  <Smartphone className="w-3 h-3" />
                                  <span>SMS</span>
                                </button>

                                {/* Status Toggle: "In Poltrona" / "Completa" */}
                                {appt.status === 'confirmed' ? (
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(appt.id, 'in_progress')}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer"
                                    title="Segna il paziente come seduto in poltrona"
                                  >
                                    In Poltrona
                                  </button>
                                ) : appt.status === 'in_progress' ? (
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(appt.id, 'completed')}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                                    title="Segna come completato"
                                  >
                                    Completa
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setMoveModalAppointment(appt)}
                                    className="px-1.5 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition"
                                    title="Sposta su altra poltrona"
                                  >
                                    Sposta
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Empty free slot: Clean click-to-book box
                      return (
                        <div
                          key={`${chair.id}-${timeSlot}`}
                          className="p-1.5 border-r border-b border-slate-100 hover:bg-slate-50 transition group flex items-center justify-center min-h-[46px]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setQuickBookModal({
                                isOpen: true,
                                chairId: chair.id,
                                timeSlot,
                              });
                            }}
                            className="w-full h-full py-1.5 px-2 rounded-xl border border-dashed border-slate-200/90 text-[11px] font-semibold text-slate-400 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/60 transition flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 cursor-pointer"
                            title={`Assegna appuntamento su ${chair.name} alle ore ${timeSlot}`}
                          >
                            <Plus className="w-3 h-3 text-slate-400 group-hover:text-purple-600" />
                            <span className="text-[10px]">Slot Libero</span>
                          </button>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. MODAL: MANAGE CHAIRS & DEPARTMENTS (CONFIGURATORE POLTRONE) */}
      {isManageChairsOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[92vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Configurazione Poltrone & Reparti Clinici</h3>
                  <p className="text-xs text-slate-400">
                    Definisci le unità operative dello studio, reparti e operatori assegnati
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageChairsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Poltrone configurate ({chairs.length}):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `chair-${Date.now()}`;
                    const newChair: DentalChair = {
                      id: newId,
                      name: `Poltrona ${chairs.length + 1}`,
                      department: 'Reparto Odontoiatrico',
                      defaultOperator: 'Medico Dentista / Igienista',
                      color: 'sky',
                      isActive: true,
                    };
                    handleSaveChairs([...chairs, newChair]);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi Poltrona</span>
                </button>
              </div>

              {/* List of chairs */}
              <div className="space-y-3">
                {chairs.map((chair, index) => {
                  const colors = CHAIR_COLOR_MAP[chair.color] || CHAIR_COLOR_MAP.purple;

                  return (
                    <div
                      key={chair.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className={`w-3 h-3 rounded-full ${colors.accent}`} />
                          <input
                            type="text"
                            value={chair.name}
                            onChange={e => {
                              const updated = [...chairs];
                              updated[index].name = e.target.value;
                              handleSaveChairs(updated);
                            }}
                            className="font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-1 w-36 focus:ring-2 focus:ring-purple-500"
                            placeholder="es. Poltrona 1"
                          />
                          <input
                            type="text"
                            value={chair.department}
                            onChange={e => {
                              const updated = [...chairs];
                              updated[index].department = e.target.value;
                              handleSaveChairs(updated);
                            }}
                            className="text-xs text-slate-700 bg-white border border-slate-300 rounded-xl px-2.5 py-1 flex-1 focus:ring-2 focus:ring-purple-500"
                            placeholder="Reparto (es. Parodontologia, CLID, CLOPD)"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Color selector */}
                          <select
                            value={chair.color}
                            onChange={e => {
                              const updated = [...chairs];
                              updated[index].color = e.target.value as any;
                              handleSaveChairs(updated);
                            }}
                            className="text-xs font-semibold bg-white border border-slate-300 rounded-xl px-2 py-1 text-slate-700"
                          >
                            <option value="purple">Viola (Paro/Chirurgia)</option>
                            <option value="emerald">Smeraldo (CLID Igiene)</option>
                            <option value="amber">Ambra (CLOPD Protesi)</option>
                            <option value="sky">Blu (Conservativa)</option>
                            <option value="rose">Rosa (Ortodonzia)</option>
                            <option value="teal">Teal (Prevenzione)</option>
                            <option value="indigo">Indaco</option>
                          </select>

                          {/* Delete Chair */}
                          {chairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleSaveChairs(chairs.filter(c => c.id !== chair.id));
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Rimuovi poltrona"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Operator Assignment row */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Operatore Predefinito:</span>
                        <input
                          type="text"
                          value={chair.defaultOperator}
                          onChange={e => {
                            const updated = [...chairs];
                            updated[index].defaultOperator = e.target.value;
                            handleSaveChairs(updated);
                          }}
                          className="text-xs text-slate-800 bg-white border border-slate-300 rounded-xl px-2.5 py-1 flex-1 font-semibold focus:ring-2 focus:ring-purple-500"
                          placeholder="es. Dott. Diego Raimondi"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset to Hospital Defaults button */}
              <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
                <span>Le modifiche vengono salvate in automatico per questo studio.</span>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveChairs(DEFAULT_DENTAL_CHAIRS);
                  }}
                  className="text-purple-700 font-bold hover:underline"
                >
                  Ripristina Layout Universitario (6 Poltrone)
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageChairsOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Chiudi e Salva Configurazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: QUICK BOOK APPOINTMENT IN CHAIR */}
      {quickBookModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[92vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Nuova Visita in Poltrona</h3>
                  <p className="text-xs text-slate-400">
                    {chairs.find(c => c.id === quickBookModal.chairId)?.name} • Ore {quickBookModal.timeSlot} • {selectedDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickBookModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickBookSubmit} className="p-6 space-y-4">
              {qbError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{qbError}</span>
                </div>
              )}

              {/* Patient Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nome e Cognome Paziente *
                </label>
                <input
                  type="text"
                  required
                  value={qbPatientName}
                  onChange={e => setQbPatientName(e.target.value)}
                  placeholder="es. Marco Rossi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Patient Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Cellulare Paziente (per SMS promemoria Twilio) *
                </label>
                <input
                  type="tel"
                  required
                  value={qbPatientPhone}
                  onChange={e => setQbPatientPhone(e.target.value)}
                  placeholder="es. +39 347 1234567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Visit Reason / Treatment */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Prestazione / Trattamento Clinico
                </label>
                <input
                  type="text"
                  value={qbVisitReason}
                  onChange={e => setQbVisitReason(e.target.value)}
                  placeholder="es. Terapia Parodontale, Igiene CLID, Corona CLOPD"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Duration in chair */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Durata in Poltrona
                  </label>
                  <select
                    value={qbDuration}
                    onChange={e => setQbDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={30}>30 minuti (Controllo/Check-up)</option>
                    <option value={45}>45 minuti (Standard/Igiene)</option>
                    <option value={60}>60 minuti (1 Ora - Endodonzia)</option>
                    <option value={90}>90 minuti (1h 30m - Chirurgia/Protesi)</option>
                    <option value={120}>120 minuti (2 Ore - Riabilitazione)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Orario Fine Previsto
                  </label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono font-bold">
                    {calculateEndTimeSlot(quickBookModal.timeSlot, qbDuration)}
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Note Operative Cliniche (opzionale)
                </label>
                <textarea
                  rows={2}
                  value={qbNotes}
                  onChange={e => setQbNotes(e.target.value)}
                  placeholder="Denti interessati, anestetico, indicazioni per assistente alla poltrona..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setQuickBookModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={qbIsSubmitting}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{qbIsSubmitting ? 'Registrazione...' : 'Inserisci nel Planning'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: MOVE CHAIR / REASSIGN */}
      {moveModalAppointment && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Sposta Poltrona Visita</h3>
              <button
                type="button"
                onClick={() => setMoveModalAppointment(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Sposta <strong>{moveModalAppointment.patientFirstName} {moveModalAppointment.patientLastName}</strong> su una poltrona o reparto differente:
            </p>

            <div className="space-y-2">
              {chairs.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleMoveChair(moveModalAppointment.id, c.id)}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-left transition text-xs flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-purple-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.department} • {c.defaultOperator}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. INTEGRATED PATIENT CLINICAL RECORD MODAL */}
      {selectedClinicalPatient && (
        <PatientClinicalRecordModal
          patient={selectedClinicalPatient}
          onClose={() => setSelectedClinicalPatient(null)}
          onSave={updated => {
            savePatientRecord(updated);
            setSelectedClinicalPatient(updated);
          }}
        />
      )}

      {/* 8. INTEGRATED TWILIO DIRECT SMS DISPATCH MODAL */}
      {smsModalAppointment && (
        <StudioSendSmsModal
          isOpen={Boolean(smsModalAppointment)}
          onClose={() => setSmsModalAppointment(null)}
          appointment={smsModalAppointment}
          studioName={activeStudio?.name}
        />
      )}
    </div>
  );
};
