import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, DentalChair, PatientRecord } from '../../types';
import {
  CLINICAL_DEPARTMENT_TEMPLATES,
  ClinicalDepartmentTemplate,
  getStudioChairs,
  saveStudioChairs,
  createChairFromTemplate,
  resolveAppointmentChair,
  calculateEndTimeSlot,
  CHAIR_COLOR_MAP,
} from '../../data/defaultChairs';
import {
  Clock,
  Plus,
  Settings2,
  Sparkles,
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
  Layers,
  Users,
  Sliders,
  CheckCircle2,
  User,
  Bell,
} from 'lucide-react';
import { StudioWhatsAppModal } from './StudioWhatsAppModal';
import { StudioReminderModal } from './StudioReminderModal';
import { PatientClinicalRecordModal } from './PatientClinicalRecordModal';

interface StudioMultiChairsViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function formatPatientFullName(firstName?: string, lastName?: string): string {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  if (!l || l.toLowerCase() === f.toLowerCase()) return f || 'Paziente';
  return `${f} ${l}`;
}

export const StudioMultiChairsView: React.FC<StudioMultiChairsViewProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const {
    activeStudio,
    appointments,
    updateAppointmentStatus,
    updateAppointmentDetails,
    deleteAppointment,
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
  const [qbPatientEmail, setQbPatientEmail] = useState('');
  const [qbVisitReason, setQbVisitReason] = useState('Terapia Odontoiatrica');
  const [qbDepartment, setQbDepartment] = useState('Conservativa');
  const [qbDuration, setQbDuration] = useState(90); // Default 90 min (1h 30m standard template)
  const [qbNotes, setQbNotes] = useState('');
  const [qbError, setQbError] = useState<string | null>(null);
  const [qbIsSubmitting, setQbIsSubmitting] = useState(false);

  // Edit Appointment modal state
  const [editAppointmentModal, setEditAppointmentModal] = useState<Appointment | null>(null);
  const [editPatientFirstName, setEditPatientFirstName] = useState('');
  const [editPatientLastName, setEditPatientLastName] = useState('');
  const [editPatientPhone, setEditPatientPhone] = useState('');
  const [editPatientEmail, setEditPatientEmail] = useState('');
  const [editChairId, setEditChairId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editVisitReason, setEditVisitReason] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState('');
  const [editDuration, setEditDuration] = useState(90);
  const [editStatus, setEditStatus] = useState<Appointment['status']>('confirmed');
  const [editNotes, setEditNotes] = useState('');
  const [editFeedback, setEditFeedback] = useState<string | null>(null);

  // Patient Clinical Chart, WhatsApp & Reminder modal state
  const [selectedClinicalPatient, setSelectedClinicalPatient] = useState<PatientRecord | null>(null);
  const [whatsAppModalAppointment, setWhatsAppModalAppointment] = useState<Appointment | null>(null);
  const [reminderModalAppointment, setReminderModalAppointment] = useState<Appointment | null>(null);

  // Time slots for clinic day: 08:30 to 19:30 in 30m intervals
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
    chairs.forEach(c => {
      if (c.department) set.add(c.department);
    });
    return Array.from(set);
  }, [chairs]);

  const operatorsList = useMemo(() => {
    const set = new Set<string>();
    chairs.forEach(c => {
      if (c.defaultOperator && c.defaultOperator.trim()) set.add(c.defaultOperator.trim());
    });
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
          sum += (item.durationMinutes || 90);
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

  // Initialize official clinical department templates (7 Poltrone)
  const handleInitializeDepartmentTemplates = () => {
    const generated: DentalChair[] = CLINICAL_DEPARTMENT_TEMPLATES.map((tmpl, idx) => {
      return createChairFromTemplate(tmpl, idx + 1);
    });
    handleSaveChairs(generated);
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

  // Open Edit Appointment Modal
  const handleOpenEditModal = (apt: Appointment) => {
    setEditAppointmentModal(apt);
    setEditPatientFirstName(apt.patientFirstName || '');
    setEditPatientLastName(apt.patientLastName || '');
    setEditPatientPhone(apt.patientPhone || '');
    setEditPatientEmail(apt.patientEmail || '');
    setEditChairId(apt.chairId || (chairs[0]?.id || ''));
    setEditDepartment(apt.department || 'Conservativa');
    setEditVisitReason(apt.visitReasonName || '');
    setEditTimeSlot(apt.timeSlot || '09:00');
    setEditDuration(apt.durationMinutes || 90);
    setEditStatus(apt.status || 'confirmed');
    setEditNotes(apt.notes || '');
    setEditFeedback(null);
  };

  // Save changes to appointment
  const handleSaveAppointmentEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppointmentModal) return;

    const targetChair = chairs.find(c => c.id === editChairId);
    const calculatedEnd = calculateEndTimeSlot(editTimeSlot, editDuration);

    updateAppointmentDetails(editAppointmentModal.id, {
      patientFirstName: editPatientFirstName.trim(),
      patientLastName: editPatientLastName.trim(),
      patientPhone: editPatientPhone.trim(),
      patientEmail: editPatientEmail.trim(),
      chairId: editChairId,
      chairName: targetChair?.name,
      department: editDepartment,
      operatorName: targetChair?.defaultOperator || undefined,
      visitReasonName: editVisitReason,
      timeSlot: editTimeSlot,
      durationMinutes: editDuration,
      endTimeSlot: calculatedEnd,
      status: editStatus,
      notes: editNotes.trim(),
    });

    setEditFeedback('Modifiche salvate con successo!');
    setTimeout(() => {
      setEditAppointmentModal(null);
      setEditFeedback(null);
    }, 900);
  };

  // Delete appointment
  const handleDeleteAppointment = (aptId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa prenotazione dalla poltrona?')) {
      deleteAppointment(aptId);
      setEditAppointmentModal(null);
    }
  };

  // Quick Book submission
  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBookModal || !activeStudio) return;
    setQbError(null);

    const parts = qbPatientName.trim().split(' ').filter(Boolean);
    const firstName = parts[0] || 'Paziente';
    const lastName = parts.slice(1).join(' ').trim();

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
        patientLastName: lastName,
        patientPhone: qbPatientPhone.trim(),
        patientEmail: qbPatientEmail.trim() || undefined,
        visitReasonId: 'vr-chair-booked',
        visitReasonName: qbVisitReason,
        durationMinutes: qbDuration,
        date: selectedDate,
        timeSlot: quickBookModal.timeSlot,
        endTimeSlot: calculatedEnd,
        chairId: quickBookModal.chairId,
        chairName: targetChair?.name,
        operatorName: targetChair?.defaultOperator || undefined,
        department: qbDepartment || targetChair?.department || 'Clinico',
        notes: qbNotes.trim() || undefined,
        status: 'confirmed',
        gdprConsent: true,
        gdprConsentTimestamp: new Date().toISOString(),
      });

      if (created) {
        setQuickBookModal(null);
        setQbPatientName('');
        setQbPatientPhone('');
        setQbPatientEmail('');
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

  // Quick chips for duration presets
  const DURATION_PRESETS = [
    { label: '30m', minutes: 30, desc: 'Controllo rapido' },
    { label: '45m', minutes: 45, desc: 'Igiene / Routine' },
    { label: '60m (1h)', minutes: 60, desc: 'Terapia standard' },
    { label: '90m (1h 30m • Template)', minutes: 90, desc: 'Seduta Completa Standard', isTemplate: true },
    { label: '120m (2h)', minutes: 120, desc: 'Chirurgia complessa' },
    { label: '150m (2h 30m)', minutes: 150, desc: 'Riabilitazione' },
    { label: '180m (3h)', minutes: 180, desc: 'Intervento esteso' },
  ];

  const selectedDateObj = new Date(selectedDate);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4 font-sans animate-fade-in">
      {/* 1. CLINICAL HEADER & TOOLBAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Day info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
              Planning Clinico Multi-Poltrona
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              Gestione Operativa Poltrone & Reparti Clinici
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
            {visibleChairs.length > 0 && (
              <>
                <span>•</span>
                <span className="text-purple-700 font-semibold">
                  {visibleChairs.map(c => c.name).join(', ')}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Right: Date Nav & Config button */}
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
            title="Aggiungi o modifica poltrone e reparti"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Configura Poltrone ({chairs.length})</span>
          </button>
        </div>
      </div>

      {/* 2. EMPTY STATE: NESSUNA POLTRONA CONFIGURATA */}
      {chairs.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-black text-slate-900">
              Nessuna Poltrona Clinica Predefinita
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Non ci sono poltrone o dati fittizi preimpostati. Puoi configurare manualmente le tue poltrone operative oppure inizializzare subito i <strong>7 Reparti Clinici Standard</strong> (Parodontologia, Chirurgia, Conservativa, Endodonzia, Protesi, Ortodonzia, Igiene) con sedute standard preimpostate a <strong>1 ora e mezza</strong>.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleInitializeDepartmentTemplates}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Inizializza Reparti Clinici Standard (7 Poltrone)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const newChair: DentalChair = {
                  id: `chair-${Date.now()}-1`,
                  name: 'Poltrona 1',
                  department: 'Conservativa',
                  defaultOperator: '',
                  color: 'sky',
                  isActive: true,
                };
                handleSaveChairs([newChair]);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>+ Aggiungi Poltrona Singola</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. FILTERS BAR (REPARTO & OPERATORE) */}
      {chairs.length > 0 && (
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
                <option value="all">Tutti i Reparti ({departmentsList.length})</option>
                {departmentsList.map(dep => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </div>

            {/* Operatore Filter */}
            {operatorsList.length > 0 && (
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
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>Clicca su qualsiasi slot per inserire o modificare la durata.</span>
          </div>
        </div>
      )}

      {/* 4. MULTI-CHAIR GRID MATRIX */}
      {chairs.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {visibleChairs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Nessuna poltrona corrisponde ai filtri</h3>
              <p className="text-xs text-slate-500">Reimposta i filtri per visualizzare le poltrone.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterDepartment('all');
                  setFilterOperator('all');
                }}
                className="mt-2 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 text-xs font-bold"
              >
                Azzera Filtri
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[850px]"
                style={{
                  gridTemplateColumns: `72px repeat(${visibleChairs.length}, minmax(220px, 1fr))`,
                  gridTemplateRows: `auto repeat(${TIME_SLOTS.length}, minmax(74px, auto))`,
                }}
              >
                {/* Header Row: Corner (Col 1, Row 1) */}
                <div
                  style={{ gridColumn: 1, gridRow: 1 }}
                  className="p-3 bg-slate-50 border-r border-b border-slate-200 flex items-center justify-center sticky left-0 z-20"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>

                {/* Chair columns: (Col chairIdx + 2, Row 1) */}
                {visibleChairs.map((chair, chairIdx) => {
                  const colors = CHAIR_COLOR_MAP[chair.color] || CHAIR_COLOR_MAP.teal;
                  const chairAppts = appointmentsByChair[chair.id] || [];

                  return (
                    <div
                      key={chair.id}
                      style={{ gridColumn: chairIdx + 2, gridRow: 1 }}
                      className={`p-3.5 border-r border-b border-slate-200 flex flex-col justify-between relative ${colors.bg}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${colors.accent}`} />
                            <h3 className="font-black text-xs text-slate-900 tracking-tight">
                              {chair.name}
                            </h3>
                          </div>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${colors.badgeBg} ${colors.badgeText}`}
                          >
                            {chair.department}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          {chairAppts.length} vis.
                        </span>
                      </div>

                      {chair.defaultOperator && (
                        <p className="text-[10px] text-slate-600 mt-1 truncate font-medium flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{chair.defaultOperator}</span>
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Time Slot Label Column: (Col 1, Row slotIdx + 2) */}
                {TIME_SLOTS.map((timeSlot, slotIdx) => (
                  <div
                    key={`time-label-${timeSlot}`}
                    style={{ gridColumn: 1, gridRow: slotIdx + 2 }}
                    className="p-2 border-r border-b border-slate-200 bg-slate-50/90 font-mono text-[11px] font-bold text-slate-500 text-center flex items-center justify-center sticky left-0 z-10 select-none"
                  >
                    {timeSlot}
                  </div>
                ))}

                {/* Body cells for each chair */}
                {visibleChairs.map((chair, chairIdx) => {
                  const col = chairIdx + 2;
                  const colors = CHAIR_COLOR_MAP[chair.color] || CHAIR_COLOR_MAP.teal;
                  const chairAppts = appointmentsByChair[chair.id] || [];

                  return TIME_SLOTS.map((timeSlot, slotIdx) => {
                    // Check if an appointment starts at this timeSlot
                    const startingItem = chairAppts.find(item => item.appointment.timeSlot === timeSlot);

                    // Check if an appointment covers this timeSlot from earlier
                    const runningItem = chairAppts.find(item => {
                      const start = item.appointment.timeSlot;
                      const end = item.endTime;
                      return timeSlot > start && timeSlot < end;
                    });

                    // If covered by a running appointment, DO NOT render anything:
                    // The starting card already spans across this row!
                    if (runningItem) {
                      return null;
                    }

                    // If an appointment starts here: render clinical card spanning all covered slots!
                    if (startingItem) {
                      const appt = startingItem.appointment;
                      const duration = startingItem.durationMinutes;
                      const endTime = startingItem.endTime;
                      const isUrgent = appt.isUrgent || appt.visitReasonName.toLowerCase().includes('urgenza');

                      // Calculate how many 30m slots this appointment covers
                      const coveredSlots = TIME_SLOTS.filter(s => s >= appt.timeSlot && s < endTime);
                      const spanCount = Math.max(1, coveredSlots.length);

                      return (
                        <div
                          key={`${chair.id}-${timeSlot}`}
                          style={{
                            gridColumn: col,
                            gridRow: `${slotIdx + 2} / span ${spanCount}`,
                          }}
                          className="p-1.5 border-r border-b border-slate-200/90 relative bg-slate-50/20 h-full flex flex-col z-5"
                        >
                          <div
                            onClick={() => handleOpenEditModal(appt)}
                            className={`h-full flex flex-col justify-between rounded-2xl border p-3.5 shadow-xs transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-md ${colors.cardBg} ${colors.cardBorder} ${colors.cardHover}`}
                          >
                            <div>
                              {/* Card Header: Duration & Status Badge */}
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="tabular-nums font-mono text-[11px] font-bold text-slate-900 bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                  {timeSlot} - {endTime} ({duration}m)
                                </span>

                                <div className="flex items-center gap-1">
                                  {isUrgent && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-extrabold text-[9px] animate-pulse">
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
                              <div className="mt-2.5">
                                <h4 className="text-sm font-black text-slate-900 leading-tight">
                                  {formatPatientFullName(appt.patientFirstName, appt.patientLastName)}
                                </h4>
                                <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-snug">
                                  {appt.visitReasonName}
                                </p>
                              </div>

                              {/* Multi-slot indication tag */}
                              {spanCount > 1 && (
                                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                                  <span>Occupa {spanCount} slot (fino alle {endTime})</span>
                                </div>
                              )}

                              {/* Notes if present */}
                              {appt.notes && (
                                <p className="text-[10px] text-slate-500 mt-1.5 italic line-clamp-2">
                                  "{appt.notes}"
                                </p>
                              )}
                            </div>

                            <div>
                              {/* Phone & Operator */}
                              <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-600">
                                <span className="flex items-center gap-1 font-semibold truncate max-w-[130px]">
                                  <Stethoscope className="w-3 h-3 text-slate-500" />
                                  <span className="truncate">{appt.operatorName || chair.defaultOperator || chair.name}</span>
                                </span>
                                {appt.patientPhone && (
                                  <span className="font-mono text-slate-500 flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{appt.patientPhone.slice(-4)}</span>
                                  </span>
                                )}
                              </div>

                              {/* Quick Actions Row */}
                              <div
                                className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1 flex-wrap"
                                onClick={e => e.stopPropagation()}
                              >
                                {/* Open Cartella Clinica */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenClinicalRecord(appt)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/90 hover:bg-white text-slate-800 border border-slate-200 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Apri Cartella Clinica & Odontogramma"
                                >
                                  <HeartPulse className="w-3 h-3 text-sky-600" />
                                  <span>Cartella</span>
                                </button>

                                {/* Send Email / WhatsApp Reminder */}
                                <button
                                  type="button"
                                  onClick={() => setReminderModalAppointment(appt)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Invia Promemoria Email o WhatsApp al paziente"
                                >
                                  <Bell className="w-3 h-3 text-emerald-600" />
                                  <span>Reminder</span>
                                </button>

                                {/* WhatsApp Direct Message */}
                                <button
                                  type="button"
                                  onClick={() => setWhatsAppModalAppointment(appt)}
                                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 transition border border-emerald-200/60 shadow-2xs cursor-pointer"
                                  title="Invia messaggio WhatsApp rapido"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(appt)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Modifica dettagli, durata o poltrona"
                                >
                                  <Edit3 className="w-3 h-3 text-purple-600" />
                                  <span>Modifica</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Empty free slot: Clean click-to-book box
                    return (
                      <div
                        key={`${chair.id}-${timeSlot}`}
                        style={{ gridColumn: col, gridRow: slotIdx + 2 }}
                        className="p-1.5 border-r border-b border-slate-100 hover:bg-slate-50 transition group flex items-center justify-center min-h-[52px]"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setQuickBookModal({
                              isOpen: true,
                              chairId: chair.id,
                              timeSlot,
                            });
                            setQbDepartment(chair.department || 'Conservativa');
                            setQbDuration(90); // Standard 90 min (1h 30m)
                          }}
                          className="w-full h-full py-1.5 px-2 rounded-xl border border-dashed border-slate-200/90 text-[11px] font-semibold text-slate-400 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/60 transition flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 cursor-pointer"
                          title={`Assegna appuntamento su ${chair.name} alle ore ${timeSlot}`}
                        >
                          <Plus className="w-3 h-3 text-slate-400 group-hover:text-purple-600" />
                          <span className="text-[10px]">Slot Libero</span>
                        </button>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: CONFIGURAZIONE POLTRONE & REPARTI CLINICI */}
      {isManageChairsOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[92vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Configurazione Poltrone & Reparti Clinici</h3>
                  <p className="text-xs text-slate-400">
                    Definisci le unità operative dello studio e associa i reparti odontoiatrici
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
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Quick Template Generator Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Inizializzazione Veloce da Template Ufficiali</span>
                  </h4>
                  <p className="text-[11px] text-purple-800">
                    Genera le 7 poltrone dedicate (Parodontologia, Chirurgia, Conservativa, Endodonzia, Protesi, Ortodonzia, Igiene) con seduta standard da 1 ora e mezza.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInitializeDepartmentTemplates}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  Applica 7 Template
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Poltrone Attive ({chairs.length}):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `chair-${Date.now()}`;
                    const newChair: DentalChair = {
                      id: newId,
                      name: `Poltrona ${chairs.length + 1}`,
                      department: 'Conservativa',
                      defaultOperator: '',
                      color: 'sky',
                      isActive: true,
                    };
                    handleSaveChairs([...chairs, newChair]);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Aggiungi Poltrona</span>
                </button>
              </div>

              {/* List of chairs */}
              {chairs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  Nessuna poltrona presente. Clicca su "+ Aggiungi Poltrona" o applica i template clinici standard.
                </div>
              ) : (
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
                            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.accent}`} />
                            <input
                              type="text"
                              value={chair.name}
                              onChange={e => {
                                const updated = [...chairs];
                                updated[index].name = e.target.value;
                                handleSaveChairs(updated);
                              }}
                              className="font-bold text-xs text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 w-32 focus:ring-2 focus:ring-purple-500"
                              placeholder="es. Poltrona 1"
                            />
                            {/* Department selector / input */}
                            <select
                              value={chair.department}
                              onChange={e => {
                                const updated = [...chairs];
                                updated[index].department = e.target.value;
                                // Auto set color if matching a template
                                const found = CLINICAL_DEPARTMENT_TEMPLATES.find(t => t.category === e.target.value);
                                if (found) updated[index].color = found.color;
                                handleSaveChairs(updated);
                              }}
                              className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 flex-1 focus:ring-2 focus:ring-purple-500"
                            >
                              {CLINICAL_DEPARTMENT_TEMPLATES.map(tmpl => (
                                <option key={tmpl.id} value={tmpl.category}>
                                  {tmpl.name} (90 min)
                                </option>
                              ))}
                              <option value="Generale">Reparto Generale Odontoiatrico</option>
                            </select>
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
                              className="text-xs font-semibold bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-slate-700"
                            >
                              <option value="teal">Teal (Parodontologia)</option>
                              <option value="rose">Rosa/Rosso (Chirurgia)</option>
                              <option value="sky">Blu (Conservativa)</option>
                              <option value="purple">Viola (Endodonzia)</option>
                              <option value="amber">Ambra (Protesi)</option>
                              <option value="indigo">Indaco (Ortodonzia)</option>
                              <option value="emerald">Smeraldo (Igiene)</option>
                              <option value="slate">Grigio Slate</option>
                            </select>

                            {/* Delete Chair */}
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
                          </div>
                        </div>

                        {/* Operator Assignment row (Clean text, optional) */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 font-medium">Operatore Assegnato:</span>
                          <input
                            type="text"
                            value={chair.defaultOperator}
                            onChange={e => {
                              const updated = [...chairs];
                              updated[index].defaultOperator = e.target.value;
                              handleSaveChairs(updated);
                            }}
                            className="text-xs text-slate-800 bg-white border border-slate-300 rounded-xl px-2.5 py-1 flex-1 font-semibold focus:ring-2 focus:ring-purple-500"
                            placeholder="es. Dr. Nome Cognome (opzionale)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* 6. MODAL: QUICK BOOK APPOINTMENT IN CHAIR (CON SELETTORE SCORREVOLE) */}
      {quickBookModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[92vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Inserimento Rapido in Poltrona</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {chairs.find(c => c.id === quickBookModal.chairId)?.name} • Inizio ore {quickBookModal.timeSlot} • {selectedDate}
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
            <form onSubmit={handleQuickBookSubmit} className="p-6 space-y-4 overflow-y-auto">
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
                  placeholder="es. Mario Rossi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Patient Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cellulare Paziente (WhatsApp) *
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
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Paziente (opzionale)
                  </label>
                  <input
                    type="email"
                    value={qbPatientEmail}
                    onChange={e => setQbPatientEmail(e.target.value)}
                    placeholder="paziente@email.it"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Clinical Department Template Quick-Select */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Template Reparto Clinico:</span>
                  <span className="text-[11px] font-normal text-slate-500">Imposta 90m (1h 30m)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CLINICAL_DEPARTMENT_TEMPLATES.map(tmpl => {
                    const isSelected = qbDepartment === tmpl.category;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setQbDepartment(tmpl.category);
                          setQbDuration(tmpl.defaultDurationMinutes); // 90 min default
                          setQbVisitReason(tmpl.suggestedProcedures[0] || tmpl.name);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition border cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {tmpl.category}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prestazione / Trattamento */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Prestazione / Trattamento Specifico
                </label>
                <input
                  type="text"
                  value={qbVisitReason}
                  onChange={e => setQbVisitReason(e.target.value)}
                  placeholder="es. Ricostruzione Diretta in Composito"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* DURATION SLIDER (SELETTORE SCORREVOLE) & PRESETS */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-700" />
                    <label className="text-xs font-black text-purple-950">
                      Selettore Durata Seduta
                    </label>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-mono font-bold text-xs shadow-2xs">
                    {qbDuration} min ({Math.floor(qbDuration / 60)}h {qbDuration % 60 ? `${qbDuration % 60}m` : ''})
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={15}
                    max={240}
                    step={15}
                    value={qbDuration}
                    onChange={e => setQbDuration(Number(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-purple-800">
                    <span>15m</span>
                    <span>60m (1h)</span>
                    <span className="font-bold text-purple-900">90m (Standard)</span>
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
                      onClick={() => setQbDuration(preset.minutes)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        qbDuration === preset.minutes
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Calculated Time preview */}
                <div className="pt-2 border-t border-purple-200 flex items-center justify-between text-xs text-purple-900 font-semibold">
                  <span>Occupazione Poltrona:</span>
                  <span className="font-mono font-bold">
                    Dalle {quickBookModal.timeSlot} alle {calculateEndTimeSlot(quickBookModal.timeSlot, qbDuration)}
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
                  value={qbNotes}
                  onChange={e => setQbNotes(e.target.value)}
                  placeholder="Elementi dentali interessati, anestetico, indicazioni per l'assistente..."
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
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{qbIsSubmitting ? 'Registrazione...' : 'Inserisci nel Planning'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: MODIFICA COMPLETA APPUNTAMENTO IN POLTRONA */}
      {editAppointmentModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[92vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Modifica Seduta in Poltrona</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    #{editAppointmentModal.code} • {editAppointmentModal.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditAppointmentModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAppointmentEdits} className="p-6 space-y-4 overflow-y-auto">
              {editFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{editFeedback}</span>
                </div>
              )}

              {/* Patient Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nome Paziente *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientFirstName}
                    onChange={e => setEditPatientFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cognome Paziente *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatientLastName}
                    onChange={e => setEditPatientLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cellulare (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={editPatientPhone}
                    onChange={e => setEditPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Paziente
                  </label>
                  <input
                    type="email"
                    value={editPatientEmail}
                    onChange={e => setEditPatientEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Chair & Department assignment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Poltrona Assegnata
                  </label>
                  <select
                    value={editChairId}
                    onChange={e => setEditChairId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    {chairs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Reparto Clinico
                  </label>
                  <select
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    {CLINICAL_DEPARTMENT_TEMPLATES.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.category}>
                        {tmpl.name}
                      </option>
                    ))}
                    <option value="Generale">Generale</option>
                  </select>
                </div>
              </div>

              {/* Start time & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Orario di Inizio
                  </label>
                  <input
                    type="time"
                    value={editTimeSlot}
                    onChange={e => setEditTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Stato Clinico Seduta
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="confirmed">Confermato</option>
                    <option value="in_progress">In Poltrona (Seduto)</option>
                    <option value="completed">Completato</option>
                    <option value="pending">In Attesa</option>
                    <option value="cancelled">Disdetto</option>
                  </select>
                </div>
              </div>

              {/* SELETTORE SCORREVOLE DURATA */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-700" />
                    <label className="text-xs font-black text-purple-950">
                      Durata Seduta (Selettore Scorrevole)
                    </label>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-mono font-bold text-xs shadow-2xs">
                    {editDuration} min ({Math.floor(editDuration / 60)}h {editDuration % 60 ? `${editDuration % 60}m` : ''})
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min={15}
                  max={240}
                  step={15}
                  value={editDuration}
                  onChange={e => setEditDuration(Number(e.target.value))}
                  className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map(preset => (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => setEditDuration(preset.minutes)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        editDuration === preset.minutes
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-purple-200 flex items-center justify-between text-xs text-purple-900 font-semibold">
                  <span>Nuovo Orario Visita:</span>
                  <span className="font-mono font-bold">
                    Dalle {editTimeSlot} alle {calculateEndTimeSlot(editTimeSlot, editDuration)}
                  </span>
                </div>
              </div>

              {/* Prestazione / Trattamento */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Prestazione / Trattamento Clinico
                </label>
                <input
                  type="text"
                  value={editVisitReason}
                  onChange={e => setEditVisitReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Note Operative Cliniche
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Dettagli per assistente, anestesia, prescrizioni..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Direct WhatsApp, Reminder & Clinical Record actions */}
              <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReminderModalAppointment(editAppointmentModal);
                      setEditAppointmentModal(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Invia Promemoria Email al Paziente"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Invia Reminder Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWhatsAppModalAppointment(editAppointmentModal);
                      setEditAppointmentModal(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenClinicalRecord(editAppointmentModal);
                    setEditAppointmentModal(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                  <span>Cartella Clinica</span>
                </button>
              </div>

              {/* Submit / Delete Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(editAppointmentModal.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Elimina Visita</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAppointmentModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salva Modifiche</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. INTEGRATED PATIENT CLINICAL RECORD MODAL */}
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

      {/* 9. INTEGRATED WHATSAPP DISPATCH MODAL */}
      {whatsAppModalAppointment && (
        <StudioWhatsAppModal
          isOpen={Boolean(whatsAppModalAppointment)}
          onClose={() => setWhatsAppModalAppointment(null)}
          appointment={whatsAppModalAppointment}
          studioName={activeStudio?.name}
        />
      )}

      {/* 10. INTEGRATED CLINICAL REMINDER MODAL (EMAIL & WHATSAPP) */}
      {reminderModalAppointment && (
        <StudioReminderModal
          isOpen={Boolean(reminderModalAppointment)}
          onClose={() => setReminderModalAppointment(null)}
          appointment={reminderModalAppointment}
          studioName={activeStudio?.name}
        />
      )}
    </div>
  );
};
