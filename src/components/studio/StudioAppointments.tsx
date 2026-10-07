import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, PatientRecord } from '../../types';
import { PatientClinicalRecordModal } from './PatientClinicalRecordModal';
import { StudioSendSmsModal } from './StudioSendSmsModal';
import {
  Calendar,
  List,
  Search,
  Filter,
  Clock,
  Phone,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Check,
  Sparkles,
  ArrowRight,
  HeartPulse,
} from 'lucide-react';

export const StudioAppointments: React.FC = () => {
  const { activeStudio, appointments, updateAppointmentStatus, patientRecords, savePatientRecord } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedClinicalPatient, setSelectedClinicalPatient] = useState<PatientRecord | null>(null);
  const [smsModalAppointment, setSmsModalAppointment] = useState<Appointment | null>(null);

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
      <div className="p-8 text-center text-slate-500 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs">
        Nessuno studio attivo selezionato.
      </div>
    );
  }

  // Get appointments for this studio
  const studioAppointments = appointments.filter(a => a.studioId === activeStudio.id);
  const pendingAppointments = studioAppointments.filter(a => a.status === 'pending');
  const confirmedAppointments = studioAppointments.filter(a => a.status === 'confirmed');

  // Filter appointments
  const filteredAppointments = studioAppointments.filter(apt => {
    // Status filter
    if (statusFilter !== 'all' && apt.status !== statusFilter) {
      return false;
    }

    // Reason filter
    if (reasonFilter !== 'all' && apt.visitReasonId !== reasonFilter) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const patientName = `${apt.patientFirstName} ${apt.patientLastName}`.toLowerCase();
      const phone = apt.patientPhone.toLowerCase();
      const email = apt.patientEmail.toLowerCase();
      const code = apt.code.toLowerCase();
      if (!patientName.includes(q) && !phone.includes(q) && !email.includes(q) && !code.includes(q)) {
        return false;
      }
    }

    // Date filter
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === 'today') {
      return apt.date === today;
    }

    return true;
  });

  // Sort by date & time (with pending first, then by date)
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    const dA = `${a.date}T${a.timeSlot}`;
    const dB = `${b.date}T${b.timeSlot}`;
    return dA.localeCompare(dB);
  });

  const handleConfirmAppointment = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'confirmed');
    setToastMessage(`Visita con ${apt.patientFirstName} ${apt.patientLastName} confermata con successo! Ora è inserita nel calendario.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCompleteAppointment = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'completed');
    setToastMessage(`Visita #${apt.code} completata! Email di valutazione a stelle inviata a ${apt.patientEmail} da prismaldental@gmail.com`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            In Attesa di Convalida
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Confermato a Calendario
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-300 shadow-xs">
            <Clock className="w-3 h-3 text-sky-600" />
            In Poltrona
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Completato
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            Disdetto
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-4 text-emerald-950 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-1"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* PENDING VISITS CALLOUT BANNER IF ANY */}
      {pendingAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  {pendingAppointments.length} {pendingAppointments.length === 1 ? 'Visita in Attesa di Convalida' : 'Visite in Attesa di Convalida'}
                </h4>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                I pazienti hanno inviato la richiesta online. Clicca <strong>"Conferma Appuntamento"</strong> per approvarli e inserirli immediatamente nel calendario delle visite dello studio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('pending')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold shadow-xs transition"
            >
              Filtra solo in attesa ({pendingAppointments.length})
            </button>
          </div>
        </div>
      )}

      {/* Apple iOS Style Controls and filters bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
        {/* Top bar: Segmented control + search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* iOS Segmented View Mode Toggle */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 self-start">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-slate-500" />
              Vista Elenco
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Vista Griglia Settimanale
            </button>
          </div>

          {/* Search + Reason */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Reason filter */}
            <div className="relative">
              <select
                value={reasonFilter}
                onChange={e => setReasonFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">Tutti i Motivi di Visita</option>
                {activeStudio.visitReasons.map(vr => (
                  <option key={vr.id} value={vr.id}>
                    {vr.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca paziente o codice..."
                className="w-full sm:w-56 pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>
        </div>

        {/* Status Pills iOS Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            Tutti ({studioAppointments.length})
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : pendingAppointments.length > 0
                ? 'bg-amber-50 text-amber-900 border border-amber-300 font-bold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pendingAppointments.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
            In Attesa di Convalida ({pendingAppointments.length})
          </button>

          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'confirmed'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Confermati ({confirmedAppointments.length})
          </button>

          <button
            onClick={() => setDateFilter(prev => (prev === 'today' ? 'all' : 'today'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              dateFilter === 'today'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            Solo Oggi
          </button>
        </div>
      </div>

      {/* Main Appointments Display */}
      {viewMode === 'list' ? (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Visite in Elenco: {sortedAppointments.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Convalida e sincronizzazione istantanea
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {sortedAppointments.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Nessun appuntamento trovato</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Non ci sono visite registrate con i filtri selezionati. I pazienti possono prenotare dal minisito online.
                </p>
              </div>
            ) : (
              sortedAppointments.map(apt => {
                const isPending = apt.status === 'pending';
                return (
                  <div
                    key={apt.id}
                    className={`p-4 sm:p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isPending ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Left: Date & Time Box + Details */}
                    <div className="flex items-start gap-4">
                      {/* Date/Time badge (clean sans typography, unslashed zeros) */}
                      <div className={`w-20 sm:w-24 p-2.5 rounded-2xl text-center flex flex-col justify-center flex-shrink-0 border ${
                        isPending
                          ? 'bg-amber-50 border-amber-200/80 text-amber-950'
                          : 'bg-slate-50 border-slate-200/80 text-slate-900'
                      }`}>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {new Date(apt.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                        </span>
                        <span className="text-base sm:text-lg font-bold text-slate-900 leading-tight tabular-nums">
                          {new Date(apt.date).getDate()}{' '}
                          {new Date(apt.date).toLocaleDateString('it-IT', { month: 'short' })}
                        </span>
                        <span className={`text-xs font-bold mt-0.5 tabular-nums ${isPending ? 'text-amber-800' : 'text-sky-600'}`}>
                          {apt.timeSlot}
                        </span>
                      </div>

                      {/* Patient & Reason */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold tracking-tight bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200/60 tabular-nums">
                            {apt.code}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">
                            {apt.patientFirstName} {apt.patientLastName}
                          </h3>
                          {getStatusBadge(apt.status)}
                        </div>

                        <div className="text-xs font-semibold text-sky-700 mt-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          {apt.visitReasonName}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                          <a
                            href={`tel:${apt.patientPhone}`}
                            className="flex items-center gap-1 hover:text-sky-600 transition tabular-nums"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {apt.patientPhone}
                          </a>
                          <span>•</span>
                          <a
                            href={`mailto:${apt.patientEmail}`}
                            className="flex items-center gap-1 hover:text-sky-600 transition"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {apt.patientEmail}
                          </a>
                        </div>

                        {apt.notes && (
                          <div className="mt-2 text-xs text-slate-700 bg-amber-50/70 border border-amber-200/70 rounded-xl px-3 py-1.5 inline-block">
                            <span className="font-semibold text-amber-900">Nota Paziente:</span>{' '}
                            {apt.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions on appointment */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                      {/* 1. TRIGGER EXPLICIT PER VISITE IN ATTESA (PENDING) */}
                      {apt.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmAppointment(apt)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow-emerald-600/25"
                            title="Convalida e inserisci direttamente nel calendario"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Conferma Appuntamento</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                            className="px-3 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl text-xs font-medium transition"
                          >
                            Rifiuta
                          </button>
                        </div>
                      )}

                      {/* 2. AZIONI PER VISITE CONFERMATE */}
                      {apt.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'in_progress')}
                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold transition"
                          >
                            In Poltrona
                          </button>
                          <button
                            onClick={() => handleCompleteAppointment(apt)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            Completa Visita
                          </button>
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                            className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs transition cursor-pointer"
                          >
                            Disdici
                          </button>
                        </>
                      )}

                      {apt.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteAppointment(apt)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          Segna come Completata
                        </button>
                      )}

                      {apt.status === 'completed' && (
                        <span className="text-xs text-slate-400 font-medium italic">
                          Visita archiviata
                        </span>
                      )}

                      {/* Cartella Clinica & Odontogramma Quick Access */}
                      <button
                        type="button"
                        onClick={() => handleOpenClinicalRecord(apt)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                        title="Apri cartella clinica, odontogramma e anamnesi del paziente"
                      >
                        <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                        <span>Cartella Clinica</span>
                      </button>

                      {/* Invia SMS Twilio Diretto */}
                      <button
                        type="button"
                        onClick={() => setSmsModalAppointment(apt)}
                        title="Invia SMS diretto con Twilio (Promemoria, conferma o urgenza)"
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition ml-1 flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                        <span>SMS Twilio</span>
                      </button>

                      <a
                        href={`https://wa.me/${apt.patientPhone.replace(/\D/g, '')}?text=Gentile%20${encodeURIComponent(
                          apt.patientFirstName
                        )},%20le%20ricordiamo%20il%20suo%20appuntamento%20presso%20${encodeURIComponent(
                          activeStudio.name
                        )}%20per%20il%20giorno%20${apt.date}%20alle%20${apt.timeSlot}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Invia promemoria WhatsApp al paziente"
                        className="p-2 rounded-xl border border-slate-200/80 text-emerald-600 hover:bg-emerald-50 transition ml-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Calendar View Matrix */
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Settimana Corrente • Panoramica Slot
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Gli orari riflettono la disponibilità configurata
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'].map((dayName, idx) => {
              const dayNum = idx + 1;
              const studioDay = activeStudio.weeklyAvailability.find(d => d.dayOfWeek === dayNum);
              return (
                <div key={dayName} className="rounded-2xl border border-slate-200/80 p-3.5 bg-slate-50/50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-2">
                    <span className="font-bold text-xs text-slate-800">{dayName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        studioDay?.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {studioDay?.isOpen ? 'Aperto' : 'Chiuso'}
                    </span>
                  </div>

                  {studioDay?.isOpen ? (
                    <div className="space-y-1.5 text-xs text-slate-600 tabular-nums">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Mattina</span>
                        {studioDay.morningStart} - {studioDay.morningEnd}
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Pomeriggio</span>
                        {studioDay.afternoonStart} - {studioDay.afternoonEnd}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 italic">
                      Studio chiuso
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Invia SMS Paziente Modal */}
      {smsModalAppointment && (
        <StudioSendSmsModal
          isOpen={Boolean(smsModalAppointment)}
          onClose={() => setSmsModalAppointment(null)}
          appointment={smsModalAppointment}
          studioName={activeStudio.name}
          onSmsSent={() => {
            setToastMessage('SMS inviato con successo via Twilio');
            setTimeout(() => setToastMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
};
