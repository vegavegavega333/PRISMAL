import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, Studio } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  CalendarPlus,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Info,
  FileText,
} from 'lucide-react';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../../data/gdprPolicy';
import { GdprPolicyModal } from '../common/GdprPolicyModal';
import { GdprConsentCertificateModal } from '../common/GdprConsentCertificateModal';

interface PatientBookingManagementProps {
  onBackToBooking?: () => void;
}

export const PatientBookingManagement: React.FC<PatientBookingManagementProps> = ({
  onBackToBooking,
}) => {
  const {
    activePatientToken,
    appointments,
    studios,
    cancelAppointmentByToken,
    rescheduleAppointmentByToken,
    isSlotBlocked,
    isDayBlocked,
  } = useApp();

  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('10:00');
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showGdprPolicyModal, setShowGdprPolicyModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const [remoteAppt, setRemoteAppt] = useState<Appointment | null>(null);
  const [remoteStudio, setRemoteStudio] = useState<Studio | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!activePatientToken) return false;
    return !appointments.some(a => a.managementToken === activePatientToken);
  });

  React.useEffect(() => {
    if (!activePatientToken) return;
    const local = appointments.find(a => a.managementToken === activePatientToken);
    if (!local) {
      setIsLoading(true);
      fetch(`/api/appointments?token=${encodeURIComponent(activePatientToken)}`)
        .then(res => res.json())
        .then(list => {
          if (Array.isArray(list) && list.length > 0) {
            setRemoteAppt(list[0]);
            if (list[0].studioId) {
              fetch(`/api/studios/${encodeURIComponent(list[0].studioId)}`)
                .then(r => r.json())
                .then(st => setRemoteStudio(st))
                .catch(() => {});
            }
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [activePatientToken, appointments]);

  // Find appointment by management token, fallback to remote fetch or active appointment
  const appointment = appointments.find(a => a.managementToken === activePatientToken) || remoteAppt || (activePatientToken ? null : appointments[0]);
  const studio = appointment ? (studios.find(s => s.id === appointment.studioId) || remoteStudio) : null;

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm mt-12 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm font-bold text-slate-700">Caricamento appuntamento in corso...</p>
      </div>
    );
  }

  if (!appointment || !studio) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm mt-12">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Prenotazione non trovata</h2>
        <p className="text-xs text-slate-500 mt-1">
          Il link di gestione non è valido o l'appuntamento è scaduto.
        </p>
        {onBackToBooking && (
          <button
            onClick={onBackToBooking}
            className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
          >
            Torna alla Pagina Principale
          </button>
        )}
      </div>
    );
  }

  const handleCancel = async () => {
    const res = cancelAppointmentByToken(appointment.managementToken, cancelReason);
    setShowCancelModal(false);
    setActionFeedback({
      message: res.message,
      type: res.success ? 'success' : 'error',
    });
    try {
      await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: appointment.managementToken, reason: cancelReason }),
      });
      if (remoteAppt) {
        setRemoteAppt(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch {}
  };

  const handleReschedule = async () => {
    if (!newDate || !newTimeSlot) return;
    const res = rescheduleAppointmentByToken(appointment.managementToken, newDate, newTimeSlot);
    setShowRescheduleModal(false);
    setActionFeedback({
      message: res.message,
      type: res.success ? 'success' : 'error',
    });
    try {
      await fetch('/api/appointments/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: appointment.managementToken, newDate, newTimeSlot }),
      });
      if (remoteAppt) {
        setRemoteAppt(prev => prev ? { ...prev, date: newDate, timeSlot: newTimeSlot, status: 'confirmed' } : null);
      }
    } catch {}
  };

  // Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent(`Visita Dentistica: ${appointment.visitReasonName} - ${studio.name}`);
    const details = encodeURIComponent(
      `Prenotazione #${appointment.code}\nPaziente: ${appointment.patientFirstName} ${appointment.patientLastName}\nStudio: ${studio.name}\nIndirizzo: ${studio.address}, ${studio.city}\nTelefono: ${studio.phone}`
    );
    const location = encodeURIComponent(`${studio.address}, ${studio.city}`);
    const startDate = appointment.date.replace(/-/g, '');
    const startTime = appointment.timeSlot.replace(':', '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startDate}T${startTime}00Z/${startDate}T${startTime}00Z`;
  };

  // Download .ics file
  const downloadIcsFile = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PRISMAL//Appointment Booking//IT
BEGIN:VEVENT
SUMMARY:Visita Dentistica - ${appointment.visitReasonName}
DESCRIPTION:Studio: ${studio.name}\\nCodice: ${appointment.code}\\nNote: ${appointment.notes || 'Nessuna'}
LOCATION:${studio.address}, ${studio.city}
DTSTART:${appointment.date.replace(/-/g, '')}T${appointment.timeSlot.replace(':', '')}00Z
DTEND:${appointment.date.replace(/-/g, '')}T${appointment.timeSlot.replace(':', '')}00Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `appuntamento-${appointment.code}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = () => {
    switch (appointment.status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Confermato dallo Studio (Verde)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            In Attesa di Conferma (Giallo)
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Prenotazione Disdetta
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {appointment.status}
          </span>
        );
    }
  };

  const commonTimeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Top brand header */}
        <div className="flex items-center justify-between">
          {onBackToBooking && (
            <button
              onClick={onBackToBooking}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna al Minisito
            </button>
          )}

          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Portale Paziente • Nessun Login Richiesto
          </span>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold border flex items-center gap-2 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Main Appointment Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 text-white p-6 sm:p-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/10 text-sky-300 border border-white/10">
                #{appointment.code}
              </span>
              {getStatusBadge()}
            </div>

            <h1 className="text-xl sm:text-2xl font-black">{appointment.visitReasonName}</h1>
            {((studio.address && studio.address.trim()) || (studio.city && studio.city.trim())) ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([studio.name, studio.address?.trim(), studio.city?.trim()].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-300 hover:text-sky-200 hover:underline mt-1 transition"
                title="Apri su Google Maps"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{studio.name} — {[studio.address?.trim(), studio.city?.trim()].filter(Boolean).join(', ')}</span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/10">Mappa ↗</span>
              </a>
            ) : (
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                {studio.name}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Date & Time Highlights */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sky-600 shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Visita</span>
                  <strong className="text-xs text-slate-900 font-bold block">{appointment.date}</strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sky-600 shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Orario</span>
                  <strong className="text-xs text-slate-900 font-bold block">{appointment.timeSlot}</strong>
                </div>
              </div>
            </div>

            {/* Patient Info Details */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Dati Intestatario Prenotazione
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden p-3 bg-white space-y-2">
                <div className="flex justify-between pb-1.5">
                  <span className="text-slate-500">Paziente:</span>
                  <strong className="text-slate-900 font-semibold">
                    {appointment.patientFirstName} {appointment.patientLastName}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Recapito Telefonico:</span>
                  <span className="text-slate-800">{appointment.patientPhone}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-800">{appointment.patientEmail}</span>
                </div>
                {appointment.notes && (
                  <div className="pt-1.5">
                    <span className="text-slate-500 block mb-0.5">Note fornite:</span>
                    <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg text-[11px]">
                      "{appointment.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* GDPR Consent & Legal Tracking Card */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Tracciamento Privacy & Consenso Sanitario (GDPR)</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {appointment.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION}
                </span>
              </h4>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <strong className="text-emerald-950 font-bold text-xs">
                        Consenso Sanitario Regolamento UE 2016/679
                      </strong>
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Concesso & Tracciato
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 space-y-1 pt-1">
                      <div className="flex justify-between border-b border-emerald-100 pb-1">
                        <span className="text-slate-500">Data e Ora Consenso:</span>
                        <strong className="text-slate-900 font-mono text-[11px]">
                          {new Date(appointment.gdprConsentTimestamp || appointment.createdAt).toLocaleString('it-IT')}
                        </strong>
                      </div>
                      <div className="flex justify-between border-b border-emerald-100 py-1">
                        <span className="text-slate-500">Versione Informativa:</span>
                        <span className="font-mono text-emerald-900 font-bold">
                          {appointment.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-100 py-1">
                        <span className="text-slate-500">Canale di Acquisizione:</span>
                        <span className="text-slate-800">
                          {appointment.gdprConsentChannel === 'online_booking'
                            ? '🌐 Prenotazione Online Verificata (OTP)'
                            : '🏢 Accettazione Desk Clinica'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Basi Giuridiche:</span>
                        <span className="text-slate-800 text-right">
                          Art. 9 par. 2 lett. h & Art. 6 par. 1 lett. b
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="flex-1 min-w-[140px] py-2 px-3 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Certificato di Consenso (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGdprPolicyModal(true)}
                    className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Informativa Privacy</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Integration Buttons */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Aggiungi al Tuo Calendario Personale
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition shadow-xs"
                >
                  <CalendarPlus className="w-4 h-4 text-sky-600" />
                  Google Calendar
                </a>

                <button
                  type="button"
                  onClick={downloadIcsFile}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition shadow-xs"
                >
                  <Calendar className="w-4 h-4 text-slate-700" />
                  Apple iCal / Outlook (.ics)
                </button>
              </div>
            </div>

            {/* Actions: Reschedule / Cancel */}
            {appointment.status !== 'cancelled' && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Gestione Prenotazione
                </h4>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRescheduleModal(true)}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 text-sky-600" />
                    Richiedi Modifica Orario
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Disdici Appuntamento
                  </button>
                </div>
              </div>
            )}

            {/* Clinic contacts */}
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 text-xs space-y-1 text-sky-950">
              <span className="font-bold block">Contatti Diretti dello Studio</span>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                Telefono Segreteria: <strong>{studio.phone}</strong>
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                Email: <strong>{studio.email}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">
                Sei sicuro di voler annullare?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La disdetta libererà immediatamente il tuo posto per altri pazienti e invierà una notifica alla segreteria dello studio.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo della cancellazione (opzionale)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="es. Imprevisto lavorativo o sintomo risolto"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Mantieni Appuntamento
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm"
              >
                Conferma Disdetta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">
                Seleziona Nuova Data e Orario
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lo studio riceverà la tua richiesta di spostamento e confermerà il nuovo slot.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nuova Data
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nuovo Orario Desiderato
                </label>
                <select
                  value={newTimeSlot}
                  onChange={e => setNewTimeSlot(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {commonTimeSlots.map(time => (
                    <option key={time} value={time}>
                      Ore {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                disabled={!newDate}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold disabled:opacity-50 shadow-sm"
              >
                Invia Spostamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GDPR Privacy Policy Modal */}
      <GdprPolicyModal
        isOpen={showGdprPolicyModal}
        onClose={() => setShowGdprPolicyModal(false)}
        studioName={studio?.name}
        studioAddress={studio?.address}
        studioEmail={studio?.email}
        studioPhone={studio?.phone}
      />

      {/* GDPR Consent Certificate Modal */}
      {showCertificateModal && appointment && (
        <GdprConsentCertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          appointment={appointment}
          patient={{
            id: `p-${appointment.id}`,
            studioId: appointment.studioId,
            firstName: appointment.patientFirstName,
            lastName: appointment.patientLastName,
            phone: appointment.patientPhone,
            email: appointment.patientEmail,
            totalVisits: 1,
            firstVisitDate: appointment.date,
            lastVisitDate: appointment.date,
            pastTreatments: [],
            createdAt: appointment.createdAt,
            gdprSanitaryConsent: appointment.gdprConsent,
            gdprConsentTimestamp: appointment.gdprConsentTimestamp,
            gdprPolicyVersion: appointment.gdprPolicyVersion,
            gdprConsentChannel: appointment.gdprConsentChannel,
            gdprConsentPurposes: appointment.gdprConsentPurposes,
          }}
          studioName={studio?.name}
          studioAddress={studio?.address}
          studioPhone={studio?.phone}
        />
      )}
    </div>
  );
};
