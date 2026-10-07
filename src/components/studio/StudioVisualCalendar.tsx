import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, PatientRecord } from '../../types';
import { PatientClinicalRecordModal } from './PatientClinicalRecordModal';
import { StudioSendSmsModal } from './StudioSendSmsModal';
import { StudioMultiChairsView } from './StudioMultiChairsView';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Plus,
  MessageSquare,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Check,
  Filter,
  HeartPulse,
  Mail,
  AlertCircle,
  Search,
  Flame,
  Smartphone,
  Layers,
} from 'lucide-react';

export const StudioVisualCalendar: React.FC = () => {
  const {
    activeStudio,
    appointments,
    blockedSlots,
    updateAppointmentStatus,
    blockSingleSlot,
    unblockSlot,
    isDayBlocked,
    patientRecords,
    savePatientRecord,
    createDirectAppointment,
  } = useApp();

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // View style: 'chairs' (Multi-unit Dental Chairs & Operators) vs 'grid' vs 'timeline' vs 'month'
  const [viewStyle, setViewStyle] = useState<'chairs' | 'timeline' | 'grid' | 'month'>('chairs');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'confirmed' | 'free'>('all');

  // Month grid search and quick filters
  const [monthFilterStatus, setMonthFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'urgent'>('all');
  const [monthSearchQuery, setMonthSearchQuery] = useState('');
  const [monthBatchToast, setMonthBatchToast] = useState<string | null>(null);

  // Active patient modal for Cartella Clinica & Odontogramma
  const [selectedClinicalPatient, setSelectedClinicalPatient] = useState<PatientRecord | null>(null);

  // SMS Modal State
  const [smsModalAppointment, setSmsModalAppointment] = useState<Appointment | null>(null);

  // New quick-add appointment modal state
  const [quickAddSlot, setQuickAddSlot] = useState<string | null>(null);
  const [quickPatientName, setQuickPatientName] = useState('');
  const [quickPatientPhone, setQuickPatientPhone] = useState('');
  const [quickPatientEmail, setQuickPatientEmail] = useState('');
  const [quickReason, setQuickReason] = useState('Prima Visita Odontoiatrica & Check-up');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [quickAddSuccess, setQuickAddSuccess] = useState<string | null>(null);
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);

  const handleOpenClinicalRecord = (apt: Appointment) => {
    if (!activeStudio) return;
    const pKey = (apt.patientEmail || apt.patientPhone).toLowerCase().trim();
    const existing = patientRecords.find(
      p => p.studioId === activeStudio.id &&
      ((p.email && p.email.toLowerCase().trim() === pKey) || (p.phone && p.phone.trim() === apt.patientPhone.trim()))
    );

    if (existing) {
      setSelectedClinicalPatient(existing);
    } else {
      // Create draft record
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
            notes: apt.notes,
          },
        ],
        clinicalNotes: '',
        allergiesList: [],
        medicalConditions: [],
        dentalChart: {},
        treatmentPlans: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSelectedClinicalPatient(draft);
    }
  };

  if (!activeStudio) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Nessuno studio attivo selezionato.
      </div>
    );
  }

  const selectedDateObj = new Date(selectedDate);
  const dayOfWeek = selectedDateObj.getDay();
  const studioDayAvailability = activeStudio.weeklyAvailability.find(d => d.dayOfWeek === dayOfWeek);
  const slotDuration = activeStudio.slotDurationMinutes || 30;

  // Generate slots for this day
  const generateTimeSlots = (startStr: string, endStr: string): string[] => {
    if (!startStr || !endStr) return [];
    const slots: string[] = [];
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + slotDuration <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      currentMinutes += slotDuration;
    }
    return slots;
  };

  const morningSlots = studioDayAvailability?.isOpen
    ? generateTimeSlots(studioDayAvailability.morningStart, studioDayAvailability.morningEnd)
    : [];

  const afternoonSlots = studioDayAvailability?.isOpen
    ? generateTimeSlots(studioDayAvailability.afternoonStart, studioDayAvailability.afternoonEnd)
    : [];

  const allDaySlots = [...morningSlots, ...afternoonSlots];

  // Appointments for this specific date
  const dateAppointments = appointments.filter(
    a => a.studioId === activeStudio.id && a.date === selectedDate && a.status !== 'cancelled'
  );

  // Blocked slots for this date
  const dateBlockedSlots = blockedSlots.filter(
    b => b.studioId === activeStudio.id && b.date === selectedDate
  );

  const isDayBlockedAllDay = dateBlockedSlots.some(b => b.isAllDay);

  // Stats for the day
  const confirmedCount = dateAppointments.filter(a => a.status === 'confirmed').length;
  const pendingCount = dateAppointments.filter(a => a.status === 'pending').length;
  const freeSlotsCount = isDayBlockedAllDay
    ? 0
    : Math.max(0, allDaySlots.length - dateAppointments.length - dateBlockedSlots.length);

  // Calculate occupation percentage
  const occupationRate = allDaySlots.length > 0
    ? Math.round(((dateAppointments.length + dateBlockedSlots.length) / allDaySlots.length) * 100)
    : 0;

  // Weekdays strip centered around selectedDate (Apple Calendar week pill slider)
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate);
    // Find Monday of current week
    const currentDay = current.getDay();
    const diff = current.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(current.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      // Check count of appointments on this day
      const count = appointments.filter(
        a => a.studioId === activeStudio.id && a.date === dateStr && a.status !== 'cancelled'
      ).length;
      const hasPending = appointments.some(
        a => a.studioId === activeStudio.id && a.date === dateStr && a.status === 'pending'
      );

      days.push({
        dateStr,
        dayNumber: d.getDate(),
        dayShort: d.toLocaleDateString('it-IT', { weekday: 'short' }),
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isSelected: dateStr === selectedDate,
        appointmentCount: count,
        hasPending,
      });
    }
    return days;
  }, [selectedDate, appointments, activeStudio.id]);

  // Week range text
  const weekRangeText = useMemo(() => {
    if (weekDays.length < 7) return '';
    const first = new Date(weekDays[0].dateStr);
    const last = new Date(weekDays[6].dateStr);
    const firstFmt = first.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    const lastFmt = last.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${firstFmt} – ${lastFmt}`;
  }, [weekDays]);

  // Date and Week/Month navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handlePrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handlePrevMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleBatchConfirmMonthPending = () => {
    if (!activeStudio) return;
    const current = new Date(selectedDate);
    const yearMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const pendingInMonth = appointments.filter(
      a => a.studioId === activeStudio.id && a.date.startsWith(yearMonth) && a.status === 'pending'
    );
    pendingInMonth.forEach(a => updateAppointmentStatus(a.id, 'confirmed'));
    setMonthBatchToast(`Convalidate con successo ${pendingInMonth.length} visite nel mese!`);
    setTimeout(() => setMonthBatchToast(null), 3500);
  };

  const handleBatchConfirmDayPending = (dateStr: string) => {
    if (!activeStudio) return;
    const pendingOnDay = appointments.filter(
      a => a.studioId === activeStudio.id && a.date === dateStr && a.status === 'pending'
    );
    pendingOnDay.forEach(a => updateAppointmentStatus(a.id, 'confirmed'));
    setMonthBatchToast(`Convalidate con successo ${pendingOnDay.length} visite del giorno!`);
    setTimeout(() => setMonthBatchToast(null), 3500);
  };

  // Full Month Calculation for Vista Mese
  const monthData = useMemo(() => {
    const current = new Date(selectedDate);
    const year = current.getFullYear();
    const month = current.getMonth();
    const todayStr = new Date().toISOString().split('T')[0];

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let firstDayWeekday = firstDayOfMonth.getDay() - 1;
    if (firstDayWeekday === -1) firstDayWeekday = 6; // Monday = 0, Sunday = 6

    const totalDays = lastDayOfMonth.getDate();
    const days = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const padDate = new Date(year, month - 1, dayNum);
      const dateStr = padDate.toISOString().split('T')[0];
      const dAppointments = appointments.filter(
        a => a.studioId === activeStudio?.id && a.date === dateStr && a.status !== 'cancelled'
      );
      const isBlocked = activeStudio ? isDayBlocked(activeStudio.id, dateStr) : false;
      const urgentCount = dAppointments.filter(
        a => a.isUrgent || a.visitReasonName.toLowerCase().includes('urgenza')
      ).length;
      const hasSearchMatch =
        monthSearchQuery.trim() !== '' &&
        dAppointments.some(a =>
          (
            a.patientFirstName +
            ' ' +
            a.patientLastName +
            ' ' +
            a.visitReasonName +
            ' ' +
            a.timeSlot +
            ' ' +
            a.patientPhone
          )
            .toLowerCase()
            .includes(monthSearchQuery.toLowerCase().trim())
        );

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isBlocked,
        appointments: dAppointments,
        confirmedCount: dAppointments.filter(a => a.status === 'confirmed').length,
        pendingCount: dAppointments.filter(a => a.status === 'pending').length,
        urgentCount,
        hasSearchMatch,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = curDate.toISOString().split('T')[0];
      const dAppointments = appointments.filter(
        a => a.studioId === activeStudio?.id && a.date === dateStr && a.status !== 'cancelled'
      );
      const isBlocked = activeStudio ? isDayBlocked(activeStudio.id, dateStr) : false;
      const urgentCount = dAppointments.filter(
        a => a.isUrgent || a.visitReasonName.toLowerCase().includes('urgenza')
      ).length;
      const hasSearchMatch =
        monthSearchQuery.trim() !== '' &&
        dAppointments.some(a =>
          (
            a.patientFirstName +
            ' ' +
            a.patientLastName +
            ' ' +
            a.visitReasonName +
            ' ' +
            a.timeSlot +
            ' ' +
            a.patientPhone
          )
            .toLowerCase()
            .includes(monthSearchQuery.toLowerCase().trim())
        );

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isBlocked,
        appointments: dAppointments,
        confirmedCount: dAppointments.filter(a => a.status === 'confirmed').length,
        pendingCount: dAppointments.filter(a => a.status === 'pending').length,
        urgentCount,
        hasSearchMatch,
      });
    }

    // Next month padding days to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const padDate = new Date(year, month + 1, i);
      const dateStr = padDate.toISOString().split('T')[0];
      const dAppointments = appointments.filter(
        a => a.studioId === activeStudio?.id && a.date === dateStr && a.status !== 'cancelled'
      );
      const isBlocked = activeStudio ? isDayBlocked(activeStudio.id, dateStr) : false;
      const urgentCount = dAppointments.filter(
        a => a.isUrgent || a.visitReasonName.toLowerCase().includes('urgenza')
      ).length;
      const hasSearchMatch =
        monthSearchQuery.trim() !== '' &&
        dAppointments.some(a =>
          (
            a.patientFirstName +
            ' ' +
            a.patientLastName +
            ' ' +
            a.visitReasonName +
            ' ' +
            a.timeSlot +
            ' ' +
            a.patientPhone
          )
            .toLowerCase()
            .includes(monthSearchQuery.toLowerCase().trim())
        );

      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isBlocked,
        appointments: dAppointments,
        confirmedCount: dAppointments.filter(a => a.status === 'confirmed').length,
        pendingCount: dAppointments.filter(a => a.status === 'pending').length,
        urgentCount,
        hasSearchMatch,
      });
    }

    // Month totals for current active studio
    const currentMonthVisits = appointments.filter(a => {
      if (a.studioId !== activeStudio?.id || a.status === 'cancelled') return false;
      const aDate = new Date(a.date);
      return aDate.getFullYear() === year && aDate.getMonth() === month;
    });

    const urgentVisits = currentMonthVisits.filter(
      a => a.isUrgent || a.visitReasonName.toLowerCase().includes('urgenza')
    ).length;
    const workingDays = days.filter(d => d.isCurrentMonth && !d.isBlocked);
    const activeDaysWithVisits = days.filter(d => d.isCurrentMonth && d.appointments.length > 0).length;
    const occupancyRate =
      workingDays.length > 0 ? Math.round((activeDaysWithVisits / workingDays.length) * 100) : 0;

    return {
      year,
      month,
      monthName: firstDayOfMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
      days,
      totalVisits: currentMonthVisits.length,
      confirmedVisits: currentMonthVisits.filter(a => a.status === 'confirmed').length,
      pendingVisits: currentMonthVisits.filter(a => a.status === 'pending').length,
      urgentVisits,
      occupancyRate,
    };
  }, [selectedDate, appointments, activeStudio?.id, monthSearchQuery, isDayBlocked]);

  // Global pending appointments across all dates for this studio
  const allPendingStudioAppointments = appointments.filter(
    a => a.studioId === activeStudio.id && a.status === 'pending'
  );

  return (
    <div className="space-y-5">
      {/* PENDING APPOINTMENTS ALERT BANNER IF ANY */}
      {allPendingStudioAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/95 via-orange-50/80 to-amber-50/95 border border-amber-300/90 rounded-3xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-950">
                  {allPendingStudioAppointments.length} {allPendingStudioAppointments.length === 1 ? 'Visita in Attesa di Convalida' : 'Visite in Attesa di Convalida'}
                </h4>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5">
                Conferma le visite richieste per inserirle subito nel calendario dello studio.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {allPendingStudioAppointments.map(apt => (
              <div
                key={apt.id}
                className="bg-white/95 backdrop-blur-xs border border-amber-200/80 rounded-2xl p-2.5 px-3.5 flex items-center gap-3 shadow-xs"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {apt.patientFirstName} {apt.patientLastName}
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    {apt.date} • {apt.timeSlot} ({apt.visitReasonName})
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(apt.date);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                    title="Visualizza questo giorno a calendario"
                  >
                    Vedi
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Conferma</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. APPLE STYLE MAIN HEADER & WEEK STRIP */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        {/* Top bar: Date title, View toggles & Quick actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight capitalize">
                {selectedDateObj.toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {selectedDateObj.getFullYear()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>{allDaySlots.length} slot totali</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">{freeSlotsCount} liberi</span>
              <span>•</span>
              <span>Occupazione: <strong>{occupationRate}%</strong></span>
            </p>
          </div>

          {/* Controls: Segmented Apple-style toggles & navigation */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Style Segmented Control */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 flex-wrap">
              <button
                type="button"
                onClick={() => setViewStyle('chairs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  viewStyle === 'chairs'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Poltrone & Reparti</span>
              </button>
              <button
                type="button"
                onClick={() => setViewStyle('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  viewStyle === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Griglia Giorno</span>
              </button>
              <button
                type="button"
                onClick={() => setViewStyle('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  viewStyle === 'timeline'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewStyle('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  viewStyle === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Vista Mese</span>
              </button>
            </div>

            {/* Date Nav Buttons */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              {viewStyle === 'month' ? (
                <>
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
                    title="Mese precedente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-white transition"
                  >
                    Oggi
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
                    title="Mese successivo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handlePrevDay}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
                    title="Giorno precedente (-1 g)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-white transition"
                  >
                    Oggi
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
                    title="Giorno successivo (+1 g)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Date Picker Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* 2. APPLE WEEK HORIZONTAL SELECTOR STRIP WITH WEEK-BY-WEEK NAVIGATION ARROWS */}
        <div className="pt-4">
          <div className="flex items-center justify-between pb-2.5 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer"
              title="Sposta alla settimana precedente (-7 giorni)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Settimana Prec.</span>
            </button>

            <span className="text-xs font-extrabold text-slate-800 tracking-tight">
              📅 {weekRangeText}
            </span>

            <button
              type="button"
              onClick={handleNextWeek}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer"
              title="Sposta alla settimana successiva (+7 giorni)"
            >
              <span className="text-[11px] font-bold">Settimana Succ.</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDays.map(day => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex flex-col items-center py-2.5 px-1 rounded-2xl transition relative group ${
                  day.isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                  day.isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {day.dayShort}
                </span>
                <span className={`text-base font-extrabold mt-0.5 ${
                  day.isSelected ? 'text-white' : 'text-slate-900'
                }`}>
                  {day.dayNumber}
                </span>

                {/* Appointment activity indicator dot */}
                <div className="mt-1.5 flex items-center gap-1 h-2">
                  {day.appointmentCount > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        day.hasPending ? 'bg-amber-400' : day.isSelected ? 'bg-sky-400' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                  {day.appointmentCount > 1 && (
                    <span
                      className={`text-[9px] font-bold leading-none tabular-nums ${
                        day.isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {day.appointmentCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. MINIMAL COLOR LEGEND & STATUS FILTER BAR */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Legend Items */}
          <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <span>Confermato ({confirmedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100" />
              <span>In Attesa ({pendingCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 ring-2 ring-slate-100" />
              <span>Libero ({freeSlotsCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-2 ring-slate-100" />
              <span>Bloccato ({dateBlockedSlots.length})</span>
            </div>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-1 bg-slate-100/70 p-0.5 rounded-lg text-[11px] font-semibold self-start sm:self-auto">
            {(['all', 'pending', 'confirmed', 'free'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-md transition capitalize ${
                  filterMode === mode
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode === 'all' ? 'Tutti' : mode === 'pending' ? 'Pending' : mode === 'confirmed' ? 'Confermati' : 'Liberi'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. MAIN SLOTS DISPLAY: VISTA MESE vs SLOTS COMPACT GRID vs TIMELINE */}
      {viewStyle === 'month' ? (
        /* VISTA MENSILE INTERATTIVA CON CONTROLLO VISITE */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
            {/* Header Mese con Navigazione e KPI */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 capitalize">
                    {monthData.monthName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Panoramica mensile di tutte le visite fissate per {activeStudio.name}
                  </p>
                </div>
              </div>

              {/* Month stats pills & Nav buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                  {monthData.totalVisits} {monthData.totalVisits === 1 ? 'visita' : 'visite'} nel mese
                </span>
                {monthData.pendingVisits > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchConfirmMonthPending}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    title="Conferma tutte le visite in attesa di questo mese in un clic"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Conferma tutte ({monthData.pendingVisits})</span>
                  </button>
                )}
                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                    title="Mese precedente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition cursor-pointer"
                  >
                    Oggi
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                    title="Mese successivo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Batch confirmation feedback toast */}
            {monthBatchToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{monthBatchToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMonthBatchToast(null)}
                  className="text-emerald-600 hover:text-emerald-900 cursor-pointer font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Month Search & Status Filters toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 pb-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={monthSearchQuery}
                  onChange={e => setMonthSearchQuery(e.target.value)}
                  placeholder="Cerca paziente, prestazione o orario..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
                {monthSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMonthSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMonthFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    monthFilterStatus === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Tutti</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMonthFilterStatus('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    monthFilterStatus === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Da confermare ({monthData.pendingVisits})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMonthFilterStatus('confirmed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    monthFilterStatus === 'confirmed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confermati</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMonthFilterStatus('urgent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    monthFilterStatus === 'urgent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Urgenze</span>
                </button>
              </div>
            </div>

            {/* 7 Columns Day Names */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-extrabold text-slate-400 uppercase tracking-wider py-1">
              <div><span className="sm:hidden">Lun</span><span className="hidden sm:inline">Lunedì</span></div>
              <div><span className="sm:hidden">Mar</span><span className="hidden sm:inline">Martedì</span></div>
              <div><span className="sm:hidden">Mer</span><span className="hidden sm:inline">Mercoledì</span></div>
              <div><span className="sm:hidden">Gio</span><span className="hidden sm:inline">Giovedì</span></div>
              <div><span className="sm:hidden">Ven</span><span className="hidden sm:inline">Venerdì</span></div>
              <div><span className="sm:hidden">Sab</span><span className="hidden sm:inline">Sabato</span></div>
              <div><span className="sm:hidden">Dom</span><span className="hidden sm:inline">Domenica</span></div>
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthData.days.map(day => {
                const dayVisits = day.appointments;
                const hasVisits = dayVisits.length > 0;
                const hasPending = day.pendingCount > 0;
                const hasUrgent = day.urgentCount > 0;

                // Filtering condition
                const matchesFilter =
                  monthFilterStatus === 'all'
                    ? true
                    : monthFilterStatus === 'pending'
                    ? day.pendingCount > 0
                    : monthFilterStatus === 'confirmed'
                    ? day.confirmedCount > 0
                    : day.urgentCount > 0;

                const isDimmed = !matchesFilter || (monthSearchQuery.trim() !== '' && !day.hasSearchMatch);

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`min-h-[74px] sm:min-h-[96px] p-1.5 sm:p-2.5 rounded-2xl border text-left flex flex-col justify-between transition relative cursor-pointer active:scale-98 ${
                      day.isSelected
                        ? 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-300 shadow-xs'
                        : day.hasSearchMatch
                        ? 'bg-sky-50/50 border-sky-400 ring-2 ring-sky-200 shadow-xs'
                        : hasUrgent && monthFilterStatus === 'urgent'
                        ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-200'
                        : hasPending && monthFilterStatus === 'pending'
                        ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
                        : day.isCurrentMonth
                        ? 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                        : 'bg-slate-50/50 border-slate-100 opacity-40 hover:opacity-75'
                    } ${isDimmed ? 'opacity-35 grayscale-20' : ''}`}
                  >
                    {/* Top row: day number & today indicator */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-black w-6 h-6 rounded-full flex items-center justify-center ${
                          day.isToday
                            ? 'bg-sky-600 text-white shadow-xs'
                            : day.isSelected
                            ? 'bg-sky-100 text-sky-900 font-extrabold'
                            : 'text-slate-800'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      <div className="flex items-center gap-1">
                        {hasUrgent && (
                          <span
                            className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center"
                            title={`${day.urgentCount} urgenze in questa data`}
                          >
                            <Flame className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {hasVisits && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              hasPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {dayVisits.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle preview: appointments list (on desktop/tablet) or dots (on mobile) */}
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {/* Mobile dot indicator */}
                      <div className="flex items-center gap-1 sm:hidden">
                        {dayVisits.slice(0, 3).map((a, idx) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              a.isUrgent ? 'bg-rose-500' : a.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Desktop chips */}
                      <div className="hidden sm:block space-y-1">
                        {dayVisits.slice(0, 2).map(a => {
                          const isMatch =
                            monthSearchQuery.trim() !== '' &&
                            (
                              a.patientFirstName +
                              ' ' +
                              a.patientLastName +
                              ' ' +
                              a.visitReasonName +
                              ' ' +
                              a.timeSlot +
                              ' ' +
                              a.patientPhone
                            )
                              .toLowerCase()
                              .includes(monthSearchQuery.toLowerCase().trim());

                          return (
                            <div
                              key={a.id}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${
                                isMatch
                                  ? 'bg-sky-200 text-sky-950 font-bold border border-sky-300'
                                  : a.status === 'pending'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                              title={`${a.timeSlot} - ${a.patientFirstName} ${a.patientLastName} (${a.visitReasonName})`}
                            >
                              <span className="font-mono font-bold text-[9px] text-slate-500">{a.timeSlot}</span>
                              <span className="truncate">{a.patientLastName}</span>
                            </div>
                          );
                        })}
                        {dayVisits.length > 2 && (
                          <span className="text-[10px] font-bold text-slate-400 pl-1">
                            +{dayVisits.length - 2} altre
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selected Day subtle indicator */}
                    {day.isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-600 self-center mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dettaglio del giorno selezionato nel mese */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 capitalize">
                    Visite di {selectedDateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h4>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {dateAppointments.length} {dateAppointments.length === 1 ? 'visita' : 'visite'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clicca su qualsiasi data del mese sopra per visualizzare il riepilogo orario.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewStyle('grid')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Apri Griglia Oraria Giorno</span>
                </button>
              </div>
            </div>

            {dateAppointments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Nessuna visita programmata per questa data.</p>
                <p className="text-xs text-slate-400">Tutti gli slot dello studio sono liberi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dateAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          ore {apt.timeSlot}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apt.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {apt.status === 'confirmed' ? 'Confermato' : 'In Attesa'}
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <h5 className="text-sm font-bold text-slate-900">
                          {apt.patientFirstName} {apt.patientLastName}
                        </h5>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          {apt.visitReasonName}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${apt.patientPhone}`} className="hover:underline">{apt.patientPhone}</a>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenClinicalRecord(apt)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-sky-700 hover:bg-sky-50 transition flex items-center gap-1 cursor-pointer"
                      >
                        <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                        <span>Cartella</span>
                      </button>

                      {apt.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Conferma</span>
                        </button>
                      ) : (
                        <a
                          href={`https://wa.me/${apt.patientPhone.replace(/\D/g, '')}?text=Gentile%20${encodeURIComponent(apt.patientFirstName)},%20le%20ricordiamo%20il%20suo%20appuntamento%20per%20il%20${apt.date}%20ore%20${apt.timeSlot}.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : viewStyle === 'chairs' ? (
        /* VISTA PLANNING CLINICO MULTI-POLTRONA E REPARTI (CLID, CLOPD, PARODONTOLOGIA) */
        <StudioMultiChairsView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ) : (
        /* VISTA GIORNALIERA: GRIGLIA COMPATTA O TIMELINE ORARIA */
        <>
          {/* Studio Closed Alert */}
          {!studioDayAvailability?.isOpen && (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Studio Chiuso</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                In base all'orario settimanale, lo studio è chiuso di {selectedDateObj.toLocaleDateString('it-IT', { weekday: 'long' })}.
              </p>
            </div>
          )}

          {/* Whole Day Blocked Alert */}
          {isDayBlockedAllDay && (
            <div className="p-8 rounded-3xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
              <Lock className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="text-base font-bold text-amber-900">Intera Giornata Bloccata</h3>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                Questa giornata è stata bloccata per ferie, festività o chiusura straordinaria.
              </p>
            </div>
          )}

          {/* 4. MAIN SLOTS DISPLAY: COMPACT GRID OR TIMELINE */}
          {studioDayAvailability?.isOpen && !isDayBlockedAllDay && (
        <>
          {viewStyle === 'grid' ? (
            /* COMPACT APPLE GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {allDaySlots.map(timeSlot => {
                const appointment = dateAppointments.find(a => a.timeSlot === timeSlot);
                const blocked = dateBlockedSlots.find(b => b.timeSlot === timeSlot);

                const isConfirmed = appointment?.status === 'confirmed';
                const isPending = appointment?.status === 'pending';
                const isBlocked = !!blocked;
                const isFree = !appointment && !isBlocked;

                if (filterMode === 'pending' && !isPending) return null;
                if (filterMode === 'confirmed' && !isConfirmed) return null;
                if (filterMode === 'free' && !isFree) return null;

                // 1. VERDE: CONFERMATO
                if (isConfirmed && appointment) {
                  return (
                    <div
                      key={timeSlot}
                      className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Left color bar accent */}
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />

                      <div className="pl-1">
                        <div className="flex items-center justify-between">
                          <span className="tabular-nums text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            {timeSlot}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Confermato
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {appointment.patientFirstName} {appointment.patientLastName}
                          </h4>
                          <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                            {appointment.visitReasonName}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {appointment.patientPhone}
                          </p>
                        </div>
                      </div>

                      {/* Apple-style subtle actions bar */}
                      <div className="mt-3 pt-2 pl-1 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenClinicalRecord(appointment)}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 transition flex items-center gap-1"
                          title="Apri cartella clinica & odontogramma"
                        >
                          <HeartPulse className="w-3 h-3 text-sky-600" />
                          <span>Cartella</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          Completa
                        </button>
                        <a
                          href={`https://wa.me/${appointment.patientPhone.replace(/\D/g, '')}?text=Gentile%20${encodeURIComponent(
                            appointment.patientFirstName
                          )},%20le%20ricordiamo%20il%20suo%20appuntamento%20confermato%20per%20oggi%20alle%20${timeSlot}.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setSmsModalAppointment(appointment)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1 cursor-pointer"
                          title="Invia SMS istantaneo al paziente con Twilio"
                        >
                          <Smartphone className="w-3 h-3 text-purple-600" />
                          <span>SMS</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // 2. GIALLO: IN ATTESA (PENDING)
                if (isPending && appointment) {
                  return (
                    <div
                      key={timeSlot}
                      className="p-4 rounded-2xl bg-amber-50/50 border border-amber-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-400" />

                      <div className="pl-1">
                        <div className="flex items-center justify-between">
                          <span className="tabular-nums text-xs font-bold text-amber-900 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {timeSlot}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            In Attesa
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {appointment.patientFirstName} {appointment.patientLastName}
                          </h4>
                          <p className="text-[11px] text-amber-900 mt-0.5 truncate">
                            {appointment.visitReasonName}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            <span className="tabular-nums">{appointment.patientPhone}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions: Accept or Decline */}
                      <div className="mt-3 pt-2 pl-1 border-t border-amber-200/60 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                          title="Conferma appuntamento e inserisci nel calendario"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Conferma Visita</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="py-1.5 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                        >
                          Rifiuta
                        </button>
                      </div>
                    </div>
                  );
                }

                // 3. GRIGIO: BLOCCATO
                if (isBlocked && blocked) {
                  return (
                    <div
                      key={timeSlot}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 opacity-75 flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-slate-300" />

                      <div className="pl-1">
                        <div className="flex items-center justify-between">
                          <span className="tabular-nums text-xs font-bold text-slate-500">
                            {timeSlot}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
                            Bloccato
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{blocked.reasonLabel || 'Chiuso'}</span>
                        </p>
                      </div>

                      <div className="mt-3 pt-2 pl-1 border-t border-slate-200/80 flex justify-end">
                        <button
                          type="button"
                          onClick={() => unblockSlot(blocked.id)}
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Sblocca</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // 4. BIANCO: LIBERO
                return (
                  <div
                    key={timeSlot}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="tabular-nums text-xs font-bold text-slate-700 group-hover:text-slate-900 transition">
                          {timeSlot}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200/60">
                          Libero
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Slot online per pazienti
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => blockSingleSlot(selectedDate, timeSlot, 'Pausa / Impegno')}
                        className="text-[11px] text-slate-400 hover:text-slate-700 transition"
                      >
                        Blocca
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickAddSlot(timeSlot)}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Aggiungi</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* APPLE TIMELINE HOUR-BY-HOUR VIEW */
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {allDaySlots.map(timeSlot => {
                const appointment = dateAppointments.find(a => a.timeSlot === timeSlot);
                const blocked = dateBlockedSlots.find(b => b.timeSlot === timeSlot);

                const isConfirmed = appointment?.status === 'confirmed';
                const isPending = appointment?.status === 'pending';
                const isBlocked = !!blocked;
                const isFree = !appointment && !isBlocked;

                if (filterMode === 'pending' && !isPending) return null;
                if (filterMode === 'confirmed' && !isConfirmed) return null;
                if (filterMode === 'free' && !isFree) return null;

                return (
                  <div
                    key={timeSlot}
                    className="p-3.5 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition group"
                  >
                    {/* Time indicator column */}
                    <div className="w-16 flex-shrink-0">
                      <span className="tabular-nums text-xs sm:text-sm font-bold text-slate-700">
                        {timeSlot}
                      </span>
                    </div>

                    {/* Content pill */}
                    <div className="flex-1 min-w-0">
                      {isConfirmed && appointment && (
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <div className="truncate">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {appointment.patientFirstName} {appointment.patientLastName}
                            </span>
                            <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
                              — {appointment.visitReasonName}
                            </span>
                          </div>
                        </div>
                      )}

                      {isPending && appointment && (
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
                          <div className="truncate">
                            <span className="text-xs sm:text-sm font-bold text-amber-950">
                              {appointment.patientFirstName} {appointment.patientLastName}
                            </span>
                            <span className="text-xs text-amber-800 ml-2 font-semibold">
                              (In attesa di conferma)
                            </span>
                          </div>
                        </div>
                      )}

                      {isBlocked && blocked && (
                        <div className="flex items-center gap-3 text-slate-400">
                          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-xs italic">
                            Slot bloccato: {blocked.reasonLabel || 'Pausa'}
                          </span>
                        </div>
                      )}

                      {isFree && (
                        <div className="flex items-center gap-3 text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />
                          <span className="text-xs text-slate-400">Slot libero disponibile</span>
                        </div>
                      )}
                    </div>

                    {/* Actions column */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isConfirmed && appointment && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenClinicalRecord(appointment)}
                            className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 transition flex items-center gap-1"
                            title="Apri cartella clinica & odontogramma"
                          >
                            <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                            <span className="hidden sm:inline">Cartella</span>
                          </button>
                          <a
                            href={`https://wa.me/${appointment.patientPhone.replace(/\D/g, '')}?text=Gentile%20${encodeURIComponent(
                              appointment.patientFirstName
                            )},%20le%20ricordiamo%20il%20suo%20appuntamento%20confermato%20per%20oggi%20alle%20${timeSlot}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setSmsModalAppointment(appointment)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1 cursor-pointer"
                            title="Invia SMS istantaneo al paziente con Twilio"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                            <span className="hidden sm:inline">SMS</span>
                          </button>
                        </>
                      )}

                      {isPending && appointment && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                            title="Conferma appuntamento e inserisci nel calendario"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Conferma Visita</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                          >
                            Rifiuta
                          </button>
                        </div>
                      )}

                      {isBlocked && blocked && (
                        <button
                          type="button"
                          onClick={() => unblockSlot(blocked.id)}
                          className="text-xs text-sky-600 hover:text-sky-800 font-semibold"
                        >
                          Sblocca
                        </button>
                      )}

                      {isFree && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => blockSingleSlot(selectedDate, timeSlot, 'Pausa')}
                            className="text-xs text-slate-400 hover:text-slate-600 hidden sm:inline"
                          >
                            Blocca
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickAddSlot(timeSlot)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-sky-600 hover:bg-sky-50 transition"
                          >
                            + Prenota
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  )}

      {/* 5. QUICK ADD APPOINTMENT MODAL */}
      {quickAddSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inserisci Visita in Agenda</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Slot: <strong className="text-sky-600">{quickAddSlot}</strong> • {selectedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddSlot(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {quickAddError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {quickAddError}
              </div>
            )}

            {quickAddSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                {quickAddSuccess}
              </div>
            )}

            {/* Quick patient selector from existing patients */}
            {patientRecords.filter(p => p.studioId === activeStudio.id).length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Seleziona Paziente Esistente (Opzionale)
                </label>
                <select
                  onChange={e => {
                    const selectedId = e.target.value;
                    if (!selectedId) return;
                    const pat = patientRecords.find(p => p.id === selectedId);
                    if (pat) {
                      setQuickPatientName(`${pat.firstName} ${pat.lastName}`);
                      setQuickPatientPhone(pat.phone || '');
                      setQuickPatientEmail(pat.email || '');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Seleziona da anagrafica studio --</option>
                  {patientRecords
                    .filter(p => p.studioId === activeStudio.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome e Cognome Paziente *
                </label>
                <input
                  type="text"
                  required
                  value={quickPatientName}
                  onChange={e => setQuickPatientName(e.target.value)}
                  placeholder="es. Mario Rossi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Telefono Paziente *
                </label>
                <input
                  type="tel"
                  required
                  value={quickPatientPhone}
                  onChange={e => setQuickPatientPhone(e.target.value)}
                  placeholder="es. 340 1234567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Paziente (Opzionale)
                </label>
                <input
                  type="email"
                  value={quickPatientEmail}
                  onChange={e => setQuickPatientEmail(e.target.value)}
                  placeholder="mario.rossi@email.it"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Prestazione / Motivo
                </label>
                <select
                  value={quickReason}
                  onChange={e => setQuickReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {(activeStudio.visitReasons && activeStudio.visitReasons.length > 0
                    ? activeStudio.visitReasons
                    : [
                        { id: 'vr-1', name: 'Prima Visita Odontoiatrica & Check-up' },
                        { id: 'vr-2', name: 'Igiene Orale & Ablazione Tartufo' },
                        { id: 'vr-3', name: 'Controllo Periodico' },
                        { id: 'vr-4', name: 'Urgenza Odontoiatrica' },
                      ]
                  ).map(vr => (
                    <option key={vr.id} value={vr.name}>
                      {vr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickAddSlot(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isSubmittingQuickAdd}
                onClick={async () => {
                  setQuickAddError(null);
                  if (!quickPatientName.trim() || !quickPatientPhone.trim()) {
                    setQuickAddError('Inserisci nome e telefono del paziente.');
                    return;
                  }
                  const parts = quickPatientName.trim().split(' ');
                  const firstName = parts[0] || 'Paziente';
                  const lastName = parts.slice(1).join(' ') || '';

                  setIsSubmittingQuickAdd(true);
                  try {
                    await createDirectAppointment({
                      studioId: activeStudio.id,
                      date: selectedDate,
                      timeSlot: quickAddSlot,
                      patientFirstName: firstName,
                      patientLastName: lastName,
                      patientEmail: quickPatientEmail.trim() || `${firstName.toLowerCase()}@paziente.it`,
                      patientPhone: quickPatientPhone.trim(),
                      visitReasonId: 'vr-direct',
                      visitReasonName: quickReason,
                      notes: 'Aggiunta diretta da calendario studio',
                      status: 'confirmed',
                    });

                    setQuickAddSuccess(`Visita inserita per ${quickPatientName} alle ${quickAddSlot}!`);
                    setTimeout(() => {
                      setQuickAddSlot(null);
                      setQuickPatientName('');
                      setQuickPatientPhone('');
                      setQuickPatientEmail('');
                      setQuickAddSuccess(null);
                    }, 1200);
                  } catch {
                    setQuickAddError('Errore durante l\'inserimento dell\'appuntamento.');
                  } finally {
                    setIsSubmittingQuickAdd(false);
                  }
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmittingQuickAdd ? 'Salvataggio...' : 'Conferma Visita in Agenda'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cartella Clinica & Odontogramma Modal */}
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

      {/* Twilio SMS Dispatch Modal */}
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
