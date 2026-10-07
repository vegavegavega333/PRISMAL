import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { VisitReason, Appointment, Studio } from '../../types';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  Flame,
  Smile,
  CalendarPlus,
  ExternalLink,
  Lock,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  WifiOff,
  Download,
  FileText,
  Search,
} from 'lucide-react';
import { DEFAULT_WEEKLY_AVAILABILITY, DEFAULT_VISIT_REASONS, DEFAULT_SMART_BOOKING_RULES } from '../../data/mockData';
import { CURRENT_PRIVACY_POLICY_VERSION, PRIVACY_POLICY_LAST_UPDATED } from '../../data/gdprPolicy';
import { getStudioQuotaStatus } from '../../data/planTierDefinitions';
import { GdprPolicyModal } from '../common/GdprPolicyModal';
import { GdprConsentCertificateModal } from '../common/GdprConsentCertificateModal';
import { useOfflineQueue, enqueueOfflineBooking } from '../../services/offlineQueue';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const PatientBookingView: React.FC = () => {
  const {
    studios,
    patientViewingSlug,
    authSession,
    appointments,
    bookAppointment,
    isSlotBlocked,
    isDayBlocked,
    setActivePatientToken,
    setCurrentRole,
    exitPatientMinisite,
    sendPatientVerificationCode,
    verifyPatientEmailCode,
  } = useApp();

  const [fetchedStudio, setFetchedStudio] = useState<Studio | null>(null);

  // URL takes first priority for studio slug
  const resolvedSlug = useMemo(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/(?:punti|studio|prenota|booking)\/([^/?#]+)/i)
        || window.location.hash.match(/#\/(?:punti|studio|prenota|booking)\/([^/?#]+)/i);
      if (match) return decodeURIComponent(match[1].trim());
      const param = new URLSearchParams(window.location.search).get('studio')
        || new URLSearchParams(window.location.search).get('booking');
      if (param) return decodeURIComponent(param.trim());
    }
    if (patientViewingSlug && patientViewingSlug.trim()) {
      return patientViewingSlug.trim();
    }
    return '';
  }, [patientViewingSlug]);

  const cleanSlug = resolvedSlug.toLowerCase();

  const [isLoadingStudio, setIsLoadingStudio] = useState<boolean>(() => {
    if (!cleanSlug) return false;
    return !studios.some(s => s.slug.trim().toLowerCase() === cleanSlug || s.id === resolvedSlug);
  });

  useEffect(() => {
    if (!cleanSlug) return;
    let isCancelled = false;
    const fetchMissingStudio = async () => {
      try {
        const res = await fetch(`/api/studios/${encodeURIComponent(cleanSlug)}`);
        if (res.ok) {
          const remoteStudio = await res.json();
          if (!isCancelled && remoteStudio && remoteStudio.id) {
            setFetchedStudio(remoteStudio);
          }
        }
      } catch {
      } finally {
        if (!isCancelled) {
          setIsLoadingStudio(false);
        }
      }
    };
    fetchMissingStudio();
    return () => {
      isCancelled = true;
    };
  }, [cleanSlug]);

  const studio = useMemo(() => {
    if (cleanSlug) {
      const matched =
        studios.find(s => s.slug.trim().toLowerCase() === cleanSlug) ||
        studios.find(s => s.id === resolvedSlug || s.id === cleanSlug);

      if (fetchedStudio && (fetchedStudio.slug.toLowerCase() === cleanSlug || fetchedStudio.id === resolvedSlug || fetchedStudio.id === cleanSlug)) {
        if (!matched || (matched.status === 'pending' && fetchedStudio.status !== 'pending')) {
          return fetchedStudio;
        }
      }

      if (matched) return matched;
      if (fetchedStudio) return fetchedStudio;
      return null;
    }

    return (
      studios.find(s => s.slug === 'studio-demo') ||
      (studios.length > 0 ? studios[0] : null)
    );
  }, [studios, cleanSlug, resolvedSlug, fetchedStudio]);

  useEffect(() => {
    if (studio && studio.name) {
      document.title = `Prenota Visita | ${studio.name}`;
    } else if (cleanSlug) {
      document.title = `Prenotazione Studio | PRISMAL`;
    } else {
      document.title = 'Prenotazione Visita Odontoiatrica | PRISMAL';
    }
    return () => {
      document.title = 'PRISMAL Dental Cloud | Gestionale Odontoiatrico Intelligente';
    };
  }, [studio, cleanSlug]);

  // Steps: 1 = Prestazione, 2 = Data e Ora, 3 = I Tuoi Dati, 4 = Verifica OTP, 5 = Conferma
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form selections
  const [selectedReason, setSelectedReason] = useState<VisitReason | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [gdprConsentError, setGdprConsentError] = useState<string | null>(null);
  const [showGdprPolicyModal, setShowGdprPolicyModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // OTP Verification state
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  // Result after booking
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);

  // Offline capability hook
  const { isOnline } = useOfflineQueue();

  // Smart Booking Rules active for studio
  const smartRules = useMemo(() => {
    return studio?.smartBookingRules || DEFAULT_SMART_BOOKING_RULES;
  }, [studio]);

  // Copy link feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Calendar month state
  const [calendarOffsetMonth, setCalendarOffsetMonth] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const studioWeeklyAvailability = useMemo(() => {
    return studio?.weeklyAvailability && Array.isArray(studio.weeklyAvailability) && studio.weeklyAvailability.length > 0
      ? studio.weeklyAvailability
      : DEFAULT_WEEKLY_AVAILABILITY;
  }, [studio]);

  const studioVisitReasons = useMemo(() => {
    return studio?.visitReasons && Array.isArray(studio.visitReasons) && studio.visitReasons.length > 0
      ? studio.visitReasons
      : DEFAULT_VISIT_REASONS;
  }, [studio]);

  // Available slots for selected date (enforcing Smart Booking Rules)
  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate || !studio) return [];

    if (isDayBlocked(studio.id, selectedDate)) {
      return [];
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Smart Rule: allowSameDayBookings
    if (smartRules.enabled && !smartRules.allowSameDayBookings && selectedDate === todayStr) {
      return [];
    }

    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    const studioDay = studioWeeklyAvailability.find(d => d.dayOfWeek === dayOfWeek);

    if (!studioDay || !studioDay.isOpen) return [];

    const slots: string[] = [];
    const slotDuration = studio.slotDurationMinutes || 30;

    const parseMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const formatMinutes = (totalMins: number) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    if (studioDay.morningStart && studioDay.morningEnd) {
      let current = parseMinutes(studioDay.morningStart);
      const end = parseMinutes(studioDay.morningEnd);
      while (current + slotDuration <= end) {
        slots.push(formatMinutes(current));
        current += slotDuration;
      }
    }

    if (studioDay.afternoonStart && studioDay.afternoonEnd) {
      let current = parseMinutes(studioDay.afternoonStart);
      const end = parseMinutes(studioDay.afternoonEnd);
      while (current + slotDuration <= end) {
        slots.push(formatMinutes(current));
        current += slotDuration;
      }
    }

    const bookedOnDate = appointments
      .filter(a => a.studioId === studio.id && a.date === selectedDate && a.status !== 'cancelled')
      .map(a => a.timeSlot);

    let freeSlots = slots.filter(
      s => !bookedOnDate.includes(s) && !isSlotBlocked(studio.id, selectedDate, s)
    );

    // Smart Rule: minNoticeHours for same-day
    if (smartRules.enabled && selectedDate === todayStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const minNoticeMinutes = (smartRules.minNoticeHours || 2) * 60;
      freeSlots = freeSlots.filter(s => parseMinutes(s) >= currentMinutes + minNoticeMinutes);
    }

    // Smart Rule: emergencySlotsReservedPerDay
    // If not an emergency appointment and emergency reserve > 0, keep emergency capacity reserved
    const isEmergency =
      selectedReason?.category === 'emergency' ||
      selectedReason?.name.toLowerCase().includes('urgenza');

    if (
      smartRules.enabled &&
      !isEmergency &&
      smartRules.emergencySlotsReservedPerDay > 0 &&
      freeSlots.length > smartRules.emergencySlotsReservedPerDay
    ) {
      freeSlots = freeSlots.slice(0, freeSlots.length - smartRules.emergencySlotsReservedPerDay);
    }

    return freeSlots;
  }, [
    selectedDate,
    studio,
    studioWeeklyAvailability,
    appointments,
    isSlotBlocked,
    isDayBlocked,
    smartRules,
    selectedReason,
  ]);

  // Calendar days (enforcing Smart Booking Rules max advance horizon)
  const calendarDays = useMemo(() => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + calendarOffsetMonth, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    const days: { dateStr: string; dayNum: number; isAvailable: boolean; isPast: boolean; isBlockedDay: boolean }[] = [];

    const todayDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      const studioDay = studioWeeklyAvailability.find(sd => sd.dayOfWeek === dayOfWeek);

      const isPast = d < todayDateObj;
      const dayIsBlocked = studio ? isDayBlocked(studio.id, dateStr) : false;

      // Smart Rule: allowSameDayBookings
      const diffTime = d.getTime() - todayDateObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isToday = diffDays === 0;
      const isSameDayBlocked = smartRules.enabled && !smartRules.allowSameDayBookings && isToday;

      const isAvailable = !isPast && !isSameDayBlocked && !!studioDay?.isOpen && !dayIsBlocked;

      days.push({
        dateStr,
        dayNum: i,
        isAvailable,
        isPast,
        isBlockedDay: dayIsBlocked,
      });
    }

    return {
      monthLabel: targetMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
      firstDayOffset: firstDayOfWeek,
      days,
    };
  }, [calendarOffsetMonth, studio, studioWeeklyAvailability, isDayBlocked, smartRules]);

  // Step 3 submission: Validate inputs and trigger real OTP email dispatch
  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setOtpError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst || !cleanLast) {
      setBookingError('Inserisci nome e cognome.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 6) {
      setBookingError('Inserisci un recapito telefonico valido.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setBookingError('Inserisci un indirizzo email valido.');
      return;
    }
    if (!gdprConsent) {
      setGdprConsentError('Il consenso al trattamento dei dati sanitari (GDPR) è obbligatorio per procedere.');
      setBookingError('È necessario esprimere il consenso obbligatorio al trattamento dei dati sanitari (GDPR) per procedere.');
      return;
    }

    // Smart Rule: Anti-Spam / Anti-No-Show check
    if (smartRules.enabled && studio) {
      const activePending = appointments.filter(
        a =>
          a.studioId === studio.id &&
          a.status === 'pending' &&
          (a.patientEmail.toLowerCase().trim() === cleanEmail ||
            a.patientPhone.trim() === cleanPhone)
      );
      if (activePending.length >= (smartRules.maxActiveBookingsPerPatient || 1)) {
        setBookingError(
          `Hai già una prenotazione attiva (#${activePending[0].code} del ${activePending[0].date}) presso questo studio. Per evitare sovrapposizioni o no-show, gestisci o modifica la prenotazione esistente oppure contatta la segreteria dello studio.`
        );
        return;
      }
    }

    // Offline capability: If user's device is currently offline
    if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      if (!selectedReason || !studio) return;
      const isUrgent =
        selectedReason.category === 'emergency' ||
        selectedReason.name.toLowerCase().includes('urgenza');

      const consentTimestamp = new Date().toISOString();
      const queued = enqueueOfflineBooking(studio.id, studio.name, {
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        visitReasonId: selectedReason.id,
        visitReasonName: selectedReason.name,
        patientFirstName: cleanFirst,
        patientLastName: cleanLast,
        patientPhone: cleanPhone,
        patientEmail: cleanEmail,
        notes: notes.trim(),
        isUrgent,
        gdprConsent: true,
      });

      const provisionalAppointment: Appointment = {
        id: queued.id,
        code: queued.generatedCode,
        studioId: studio.id,
        patientFirstName: cleanFirst,
        patientLastName: cleanLast,
        patientPhone: cleanPhone,
        patientEmail: cleanEmail,
        visitReasonId: selectedReason.id,
        visitReasonName: selectedReason.name,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        notes: notes.trim(),
        status: 'pending',
        isUrgent,
        gdprConsent: true,
        gdprConsentTimestamp: consentTimestamp,
        gdprPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
        gdprConsentChannel: 'online_booking',
        managementToken: queued.managementToken,
        createdAt: queued.queuedAt,
      };

      setIsOfflineQueued(true);
      setConfirmedAppointment(provisionalAppointment);
      setStep(5);
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendPatientVerificationCode(cleanEmail);
      if (res.success) {
        setVerificationCodeInput('');
        setResendCooldown(60);
        setStep(4);
      } else {
        setBookingError(res.error || 'Impossibile inviare il codice email. Verifica l\'indirizzo.');
      }
    } catch {
      setBookingError('Errore di connessione al servizio email.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 4 resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError('');
    setResendFeedback(null);
    try {
      const res = await sendPatientVerificationCode(email.trim().toLowerCase());
      if (res.success) {
        setResendCooldown(60);
        setResendFeedback('Nuovo codice inviato via email!');
        setTimeout(() => setResendFeedback(null), 4000);
      } else {
        setOtpError(res.error || 'Errore durante l\'invio del codice.');
      }
    } catch {
      setOtpError('Errore di connessione.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 4 submission: Verify OTP and finalize booking
  const handleVerifyOtpAndConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio || !selectedReason) return;
    setOtpError('');

    const cleanCode = verificationCodeInput.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setOtpError('Inserisci il codice di 6 cifre ricevuto via email.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const verifyRes = await verifyPatientEmailCode(email.trim().toLowerCase(), cleanCode);
      if (!verifyRes.success) {
        setOtpError(verifyRes.error || 'Codice errato o scaduto. Controlla l\'email ricevuta.');
        setIsVerifyingOtp(false);
        return;
      }

      // Code is valid! Proceed to create appointment immediately
      setIsSubmittingBooking(true);
      const isUrgent = selectedReason.category === 'emergency' || selectedReason.name.toLowerCase().includes('urgenza');
      const consentTimestamp = new Date().toISOString();

      const result = bookAppointment(studio.slug, {
        patientFirstName: firstName.trim(),
        patientLastName: lastName.trim(),
        patientPhone: phone.trim(),
        patientEmail: email.trim().toLowerCase(),
        visitReasonId: selectedReason.id,
        visitReasonName: selectedReason.name,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        notes: notes.trim(),
        isUrgent,
        gdprConsent: true,
        gdprConsentTimestamp: consentTimestamp,
        gdprPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
        gdprConsentChannel: 'online_booking',
      });

      if (result.success && result.appointment) {
        // Dispatch to server in background
        fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...result.appointment,
            studioName: studio.name,
            studioAddress: studio.address,
            studioCity: studio.city,
            studioPhone: studio.phone,
            studioEmail: studio.email,
          }),
        }).catch(err => console.warn('Appointment server sync warning:', err));

        setConfirmedAppointment(result.appointment);
        setStep(5);
      } else {
        setOtpError(result.error || 'Impossibile registrare la prenotazione. Riprova.');
      }
    } catch {
      setOtpError('Errore durante la verifica del codice.');
    } finally {
      setIsVerifyingOtp(false);
      setIsSubmittingBooking(false);
    }
  };

  const getReasonIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-sky-600" />;
      case 'CalendarCheck':
        return <CalendarCheck className="w-5 h-5 text-emerald-600" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'Smile':
        return <Smile className="w-5 h-5 text-indigo-600" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-600" />;
      default:
        return <Calendar className="w-5 h-5 text-slate-600" />;
    }
  };

  const getGoogleCalendarUrl = (apt: Appointment) => {
    const title = encodeURIComponent(`Visita Dentistica: ${apt.visitReasonName} - ${studio?.name || 'Studio'}`);
    const details = encodeURIComponent(
      `Prenotazione #${apt.code}\nPaziente: ${apt.patientFirstName} ${apt.patientLastName}\nStudio: ${studio?.name}\nIndirizzo: ${studio?.address}, ${studio?.city}\nTelefono: ${studio?.phone}`
    );
    const location = encodeURIComponent(`${studio?.address || ''}, ${studio?.city || ''}`);
    const startDate = apt.date.replace(/-/g, '');
    const startTime = apt.timeSlot.replace(':', '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startDate}T${startTime}00Z/${startDate}T${startTime}00Z`;
  };

  const downloadIcsFile = (apt: Appointment) => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PRISMAL//Appointment Booking//IT
BEGIN:VEVENT
SUMMARY:Visita Dentistica - ${apt.visitReasonName}
DESCRIPTION:Studio: ${studio?.name}\\nCodice: ${apt.code}
LOCATION:${studio?.address || ''}, ${studio?.city || ''}
DTSTART:${apt.date.replace(/-/g, '')}T${apt.timeSlot.replace(':', '')}00Z
DTEND:${apt.date.replace(/-/g, '')}T${apt.timeSlot.replace(':', '')}00Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `appuntamento-${apt.code}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Top navigation bar
  const renderTopBar = () => (
    <nav aria-label="Navigazione portale" className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs sticky top-0 z-50 border-b border-slate-800">
      <div className="flex items-center gap-3">
        {authSession?.role === 'super_admin' ? (
          <button
            onClick={() => setCurrentRole('super_admin')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </button>
        ) : authSession?.role === 'studio_admin' ? (
          <button
            onClick={() => exitPatientMinisite(studio?.slug)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Torna al Gestionale</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setCurrentRole('landing');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>PRISMAL Search</span>
          </button>
        )}
        <span className="text-slate-400 font-medium border-l border-slate-800 pl-3">
          {studio?.name || 'Studio'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <PWAInstallButton compact />
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium border border-slate-700 transition cursor-pointer"
          title="Copia link della pagina"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">Copiato!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copia Link</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );

  if (isLoadingStudio && !studio) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Caricamento studio...</p>
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {renderTopBar()}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-lg">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900">Studio Odontoiatrico Non Trovato</h2>
            <p className="text-xs text-slate-500 mt-2">
              Il link utilizzato non corrisponde a nessuno studio attivo.
            </p>
            <div className="mt-6">
              <button
                onClick={() => exitPatientMinisite()}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
              >
                Torna al Portale
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (studio.status === 'pending' && authSession?.role !== 'super_admin' && authSession?.studioId !== studio.id) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {renderTopBar()}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-lg">
            <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900">Studio in Fase di Attivazione</h2>
            <p className="text-xs text-slate-500 mt-2">
              Il minisito di prenotazione per <strong>{studio.name}</strong> è in attesa di validazione.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const quota = getStudioQuotaStatus(studio, appointments);
  if (quota.isExhausted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {renderTopBar()}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-lg">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900">{studio.name}</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Le prenotazioni online per questo ciclo sono temporaneamente sospese per raggiungimento capienza dello studio.
              <br />
              Per fissare subito una visita contatta direttamente la clinica:
            </p>
            <a
              href={`tel:${studio.phone}`}
              className="mt-4 inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Phone className="w-4 h-4" />
              Chiama lo Studio ({studio.phone})
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      {renderTopBar()}

      {/* Studio Header: Clean, modern, medical */}
      <header className="bg-white border-b border-slate-200/80 py-5">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
          <img
            src={studio.logoUrl}
            alt={studio.name}
            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate">
              {studio.name}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {studio.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {studio.address ? `${studio.address}, ${studio.city}` : studio.city}
                </span>
              )}
              {studio.phone && studio.phone !== '+39' && (
                <span className="hidden sm:inline text-slate-400">· {studio.phone}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Step Tracker (Minimalist 4 steps) */}
      {step < 5 && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs font-bold">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-sky-600' : step > 1 ? 'text-slate-700' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? 'bg-sky-600 text-white' : step > 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {step > 1 ? '✓' : '1'}
              </span>
              <span className="hidden sm:inline">Visita</span>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className={`flex items-center gap-2 ${step === 2 ? 'text-sky-600' : step > 2 ? 'text-slate-700' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? 'bg-sky-600 text-white' : step > 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {step > 2 ? '✓' : '2'}
              </span>
              <span className="hidden sm:inline">Data & Ora</span>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className={`flex items-center gap-2 ${step === 3 ? 'text-sky-600' : step > 3 ? 'text-slate-700' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? 'bg-sky-600 text-white' : step > 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {step > 3 ? '✓' : '3'}
              </span>
              <span className="hidden sm:inline">Dati</span>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className={`flex items-center gap-2 ${step === 4 ? 'text-sky-600' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 4 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                4
              </span>
              <span className="hidden sm:inline">Verifica OTP</span>
            </div>
          </div>
        </div>
      )}

      {/* Offline capability status banner */}
      {!isOnline && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-950 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold">Modalità Offline Attiva</p>
                <p className="text-amber-800">
                  La connessione internet è temporaneamente assente. Puoi continuare la prenotazione: la richiesta verrà salvata in memoria sul dispositivo e inviata automaticamente appena riappare la rete.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 mt-4">

        {/* STEP 1: PRESTAZIONE (Clean, modern cards) */}
        {step === 1 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Seleziona la Prestazione
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Scegli il tipo di visita desiderata per visualizzare le prime disponibilità.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {studioVisitReasons.map(vr => {
                const isSelected = selectedReason?.id === vr.id;
                return (
                  <button
                    key={vr.id}
                    type="button"
                    onClick={() => {
                      setSelectedReason(vr);
                      setStep(2);
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 group cursor-pointer ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform">
                      {getReasonIcon(vr.iconName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">{vr.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{vr.description}</p>
                      <span className="text-[11px] font-semibold text-slate-400 mt-2 block">
                        {vr.durationMinutes} minuti
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: DATA & ORARIO (Combined seamless view) */}
        {step === 2 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Modifica Visita
                </button>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Scegli Data e Ora
                </h2>
              </div>
              {selectedReason && (
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-xl">
                  {selectedReason.name}
                </span>
              )}
            </div>

            {/* Calendar Controls */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 capitalize">
                  {calendarDays.monthLabel}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={calendarOffsetMonth === 0}
                    onClick={() => setCalendarOffsetMonth(prev => prev - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={calendarOffsetMonth >= 2}
                    onClick={() => setCalendarOffsetMonth(prev => prev + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 uppercase">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mer</span>
                <span>Gio</span>
                <span>Ven</span>
                <span>Sab</span>
                <span>Dom</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calendarDays.firstDayOffset }).map((_, i) => (
                  <div key={`offset-${i}`} className="h-9" />
                ))}

                {calendarDays.days.map(d => {
                  const isSelected = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      disabled={!d.isAvailable}
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setSelectedTimeSlot('');
                      }}
                      className={`h-9 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-xs'
                          : d.isAvailable
                          ? 'bg-white hover:bg-sky-50 text-slate-800 border border-slate-200'
                          : 'bg-transparent text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <span>{d.dayNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Picker (Appears as soon as date is selected) */}
            {selectedDate && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Orari Disponibili per{' '}
                    {new Date(selectedDate).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="text-xs text-slate-400">{availableSlotsForDate.length} slot liberi</span>
                </div>

                {availableSlotsForDate.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    Nessuno slot orario disponibile per questa data. Seleziona un altro giorno dal calendario.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableSlotsForDate.map(slot => {
                      const isSelected = selectedTimeSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-xs scale-102'
                              : 'bg-slate-50 hover:bg-sky-50 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedDate && selectedTimeSlot ? (
                  <>
                    Scelto: <strong>{new Date(selectedDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</strong> alle <strong>{selectedTimeSlot}</strong>
                  </>
                ) : (
                  'Seleziona giorno e orario'
                )}
              </span>

              <button
                disabled={!selectedDate || !selectedTimeSlot}
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Continua
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: I TUOI DATI (Minimal, ultra-clean) */}
        {step === 3 && (
          <form
            onSubmit={handleProceedToOtp}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Modifica Orario
                </button>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  I Tuoi Dati
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inserisci i tuoi recapiti. Riceverai un codice email per confermare la visita.
                </p>
              </div>
            </div>

            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {bookingError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="es. Mario"
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cognome *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="es. Rossi"
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Numero di Telefono *
                </label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="es. 340 1234567"
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email (per codice OTP e conferma) *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="mario.rossi@email.it"
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Note per lo studio (Opzionale)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="es. prima visita di controllo, dolore dente..."
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Privacy and Non-Invasive Notification Guarantee Badge */}
              <div className="sm:col-span-2 p-3 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-slate-700">
                <ShieldCheck className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">Garanzia di Riservatezza & Notifiche</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    La conferma di prenotazione e i promemoria (24h e 1h prima) arriveranno <strong>esclusivamente alla tua email personale</strong> verificata con codice OTP e al tuo numero di cellulare. Nessuna informazione o notifica di altri utenti viene mai inoltrata al paziente.
                  </p>
                </div>
              </div>

              {/* GDPR Privacy & Mandatory Sanitary Consent Card */}
              <div
                className={`sm:col-span-2 p-4 rounded-2xl border transition-all ${
                  gdprConsent
                    ? 'bg-emerald-50/70 border-emerald-300/80 shadow-xs'
                    : gdprConsentError
                    ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="gdpr-sanitary-consent-checkbox"
                    required
                    checked={gdprConsent}
                    onChange={e => {
                      setGdprConsent(e.target.checked);
                      if (e.target.checked) {
                        setGdprConsentError(null);
                        setBookingError(null);
                      }
                    }}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="space-y-1.5 flex-1">
                    <label
                      htmlFor="gdpr-sanitary-consent-checkbox"
                      className="block text-xs text-slate-800 leading-relaxed cursor-pointer font-medium"
                    >
                      <span className="font-bold text-slate-900 block sm:inline">
                        Consenso Obbligatorio Trattamento Dati Sanitari (GDPR Reg. UE 2016/679) *
                      </span>{' '}
                      Dichiaro di aver preso visione dell'<strong>Informativa sulla Privacy ({CURRENT_PRIVACY_POLICY_VERSION})</strong> e acconsento in modo esplicito, libero e consapevole al trattamento dei miei dati personali e dei dati particolari sullo stato di salute necessari per le finalità di diagnosi, prevenzione e cura odontoiatrica (Art. 9 par. 2 lett. h GDPR), gestione della prenotazione e promemoria visita.
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setShowGdprPolicyModal(true)}
                        className="text-sky-600 hover:text-sky-800 font-bold underline flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Leggi Informativa Privacy Completa (Versione {CURRENT_PRIVACY_POLICY_VERSION})</span>
                      </button>

                      <span className="text-slate-500 font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                        🔒 Tracciamento ISO 8601 & Versione {CURRENT_PRIVACY_POLICY_VERSION}
                      </span>
                    </div>

                    {gdprConsentError && (
                      <p className="text-rose-700 font-bold text-xs pt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{gdprConsentError}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSendingOtp}
                className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Invio codice in corso...</span>
                  </>
                ) : (
                  <>
                    <span>Continua e Ricevi Codice</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SCHERMATA DEDICATA VERIFICA CODICE OTP */}
        {step === 4 && (
          <div className="max-w-md mx-auto animate-in fade-in zoom-in-98">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Inserisci il Codice di Verifica
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Abbiamo inviato un codice di sicurezza a 6 cifre a:
                </p>
                <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">
                  {email}
                </p>
              </div>

              {otpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                  {otpError}
                </div>
              )}

              {resendFeedback && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                  {resendFeedback}
                </div>
              )}

              <form onSubmit={handleVerifyOtpAndConfirmBooking} className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    required
                    value={verificationCodeInput}
                    onChange={e => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-52 mx-auto py-3 px-4 text-center font-mono font-black text-2xl tracking-[0.4em] bg-slate-50 border-2 border-slate-300 focus:border-sky-600 focus:bg-white rounded-2xl text-slate-900 focus:outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Controlla la posta in arrivo (e la cartella Spam se necessario).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verificationCodeInput.length !== 6 || isVerifyingOtp || isSubmittingBooking}
                  className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifyingOtp || isSubmittingBooking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifica e registrazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Conferma Prenotazione</span>
                    </>
                  )}
                </button>
              </form>

              {/* Offline fallback button in Step 4 if connection is absent */}
              {!isOnline && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
                  <p className="text-amber-900 font-semibold flex items-center gap-1.5">
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    Connessione assente: salva senza attendere il codice email
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Se non riesci a ricevere il codice email per via della linea, puoi mettere subito la richiesta in coda offline sul dispositivo. Verrà trasmessa appena torna la connessione.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedReason || !studio) return;
                      const isUrgent =
                        selectedReason.category === 'emergency' ||
                        selectedReason.name.toLowerCase().includes('urgenza');

                      const queued = enqueueOfflineBooking(studio.id, studio.name, {
                        date: selectedDate,
                        timeSlot: selectedTimeSlot,
                        visitReasonId: selectedReason.id,
                        visitReasonName: selectedReason.name,
                        patientFirstName: firstName.trim(),
                        patientLastName: lastName.trim(),
                        patientPhone: phone.trim(),
                        patientEmail: email.trim().toLowerCase(),
                        notes: notes.trim(),
                        isUrgent,
                        gdprConsent: true,
                      });

                      const provisionalAppointment: Appointment = {
                        id: queued.id,
                        code: queued.generatedCode,
                        studioId: studio.id,
                        patientFirstName: firstName.trim(),
                        patientLastName: lastName.trim(),
                        patientPhone: phone.trim(),
                        patientEmail: email.trim().toLowerCase(),
                        visitReasonId: selectedReason.id,
                        visitReasonName: selectedReason.name,
                        date: selectedDate,
                        timeSlot: selectedTimeSlot,
                        notes: notes.trim(),
                        status: 'pending',
                        isUrgent,
                        gdprConsent: true,
                        gdprConsentTimestamp: new Date().toISOString(),
                        managementToken: queued.managementToken,
                        createdAt: queued.queuedAt,
                      };

                      setIsOfflineQueued(true);
                      setConfirmedAppointment(provisionalAppointment);
                      setStep(5);
                    }}
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    ⚡ Metti in Coda Offline Subito
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2 text-xs">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  className="text-sky-600 hover:text-sky-800 font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {resendCooldown > 0 ? (
                    `Reinvia codice tra ${resendCooldown}s`
                  ) : (
                    'Non hai ricevuto l\'email? Reinvia codice'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Modifica dati o email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PRENOTAZIONE CONFERMATA (Clean, beautiful Apple-style ticket) */}
        {step === 5 && confirmedAppointment && (
          <div className="max-w-lg mx-auto animate-in fade-in zoom-in-98 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8 text-center space-y-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
                isOfflineQueued || confirmedAppointment.code.startsWith('OFF-')
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}>
                {isOfflineQueued || confirmedAppointment.code.startsWith('OFF-') ? (
                  <WifiOff className="w-8 h-8" />
                ) : (
                  <CheckCircle2 className="w-9 h-9" />
                )}
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {isOfflineQueued || confirmedAppointment.code.startsWith('OFF-')
                    ? 'Prenotazione in Coda Offline!'
                    : 'Prenotazione Confermata!'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isOfflineQueued || confirmedAppointment.code.startsWith('OFF-')
                    ? 'Salvata sul tuo dispositivo in modalità offline protetta.'
                    : `Ti aspettiamo presso ${studio.name}.`}
                </p>
              </div>

              {/* Minimal Clean Ticket Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isOfflineQueued || confirmedAppointment.code.startsWith('OFF-')
                      ? 'Codice Provvisorio Offline:'
                      : 'Codice Visita:'}
                  </span>
                  <span className="font-mono text-sm font-black text-sky-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                    #{confirmedAppointment.code}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Quando:</span>
                    <strong className="text-sm font-bold text-slate-900">
                      {new Date(confirmedAppointment.date).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}{' '}
                      alle ore {confirmedAppointment.timeSlot}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Prestazione:</span>
                    <strong className="text-slate-800">{confirmedAppointment.visitReasonName}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Paziente:</span>
                    <span className="text-slate-800 font-semibold">{confirmedAppointment.patientFirstName} {confirmedAppointment.patientLastName}</span>
                  </div>

                  {studio.address && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Dove:</span>
                      <span className="text-slate-800">{studio.address}, {studio.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Clean Actions */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {studio.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([studio.name, studio.address, studio.city].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    Apri Mappa
                  </a>
                )}

                <a
                  href={getGoogleCalendarUrl(confirmedAppointment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-sky-600" />
                  Google Calendar
                </a>
              </div>

              <div className="pt-2 text-xs text-slate-500 space-y-1">
                {isOfflineQueued || confirmedAppointment.code.startsWith('OFF-') ? (
                  <div className="font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl py-2.5 px-3.5 text-left space-y-1">
                    <p className="flex items-center gap-1.5">
                      <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Richiesta registrata in locale (Offline)</span>
                    </p>
                    <p className="text-[11px] text-amber-800 font-normal">
                      Non appena il tuo telefono si ricollegherà a Internet (Wi-Fi o 4G/5G), la richiesta verrà inviata in automatico allo studio e riceverai l'email di conferma all'indirizzo: <strong>{confirmedAppointment.patientEmail}</strong>.
                    </p>
                  </div>
                ) : (
                  <p className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl py-2 px-3">
                    ✓ Email di conferma inviata alla tua casella verificata: <strong>{confirmedAppointment.patientEmail}</strong>
                  </p>
                )}

                {/* GDPR Consent Verification Badge */}
                <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950 text-left">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <strong className="text-emerald-950 font-bold">Consenso Privacy Sanitaria Registrato</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900">
                        {confirmedAppointment.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Tracciamento del consenso archiviato con marcatura temporale certificata del{' '}
                      <strong>
                        {new Date(confirmedAppointment.gdprConsentTimestamp || new Date().toISOString()).toLocaleString('it-IT')}
                      </strong>{' '}
                      nel registro di trattamento a norma di legge (Art. 7 GDPR).
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowGdprPolicyModal(true)}
                        className="text-[11px] font-bold text-sky-700 hover:text-sky-900 underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Rileggi Informativa Privacy Accettata</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCertificateModal(true)}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline inline-flex items-center gap-1 cursor-pointer bg-white/70 px-2 py-0.5 rounded-md border border-emerald-300"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Visualizza / Stampa Certificato di Consenso (PDF)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">
                  Promemoria non invasivo: riceverai un promemoria via email e SMS <strong>24 ore prima</strong> e <strong>1 ora prima</strong> dell'appuntamento.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmedAppointment.managementToken) {
                      setActivePatientToken(confirmedAppointment.managementToken);
                    }
                  }}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  Gestisci o Disdici
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSelectedReason(null);
                    setSelectedDate('');
                    setSelectedTimeSlot('');
                    setConfirmedAppointment(null);
                    setGdprConsent(false);
                    setGdprConsentError(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Nuova Prenotazione
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentRole('landing');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/');
                    }
                  }}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Torna alla Ricerca</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* GDPR Privacy Policy Modal */}
      <GdprPolicyModal
        isOpen={showGdprPolicyModal}
        onClose={() => setShowGdprPolicyModal(false)}
        studioName={studio?.name}
        studioAddress={studio?.address}
        studioEmail={studio?.email}
        studioPhone={studio?.phone}
        showAcceptButton={!gdprConsent && step === 3}
        onAcceptAndClose={() => {
          setGdprConsent(true);
          setGdprConsentError(null);
          setBookingError(null);
          setShowGdprPolicyModal(false);
        }}
      />

      {/* GDPR Consent Certificate Modal */}
      {showCertificateModal && confirmedAppointment && (
        <GdprConsentCertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          appointment={confirmedAppointment}
          patient={{
            id: `p-${confirmedAppointment.id}`,
            studioId: confirmedAppointment.studioId,
            firstName: confirmedAppointment.patientFirstName,
            lastName: confirmedAppointment.patientLastName,
            phone: confirmedAppointment.patientPhone,
            email: confirmedAppointment.patientEmail,
            totalVisits: 1,
            firstVisitDate: confirmedAppointment.date,
            lastVisitDate: confirmedAppointment.date,
            pastTreatments: [],
            createdAt: confirmedAppointment.createdAt,
            gdprSanitaryConsent: confirmedAppointment.gdprConsent,
            gdprConsentTimestamp: confirmedAppointment.gdprConsentTimestamp,
            gdprPolicyVersion: confirmedAppointment.gdprPolicyVersion,
            gdprConsentChannel: confirmedAppointment.gdprConsentChannel,
            gdprConsentPurposes: confirmedAppointment.gdprConsentPurposes,
          }}
          studioName={studio?.name}
          studioAddress={studio?.address}
          studioPhone={studio?.phone}
        />
      )}
    </div>
  );
};
