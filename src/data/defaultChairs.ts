import { DentalChair, Appointment } from '../types';

export const DEFAULT_DENTAL_CHAIRS: DentalChair[] = [
  {
    id: 'chair-1',
    name: 'Poltrona 1',
    department: 'Parodontologia & Chirurgia',
    defaultOperator: 'Dott. Diego Raimondi',
    color: 'purple',
    isActive: true,
    notes: 'Dotata di microscopio operatorio, piezo-surgery e kit implantare avanzato.',
  },
  {
    id: 'chair-2',
    name: 'Poltrona 2',
    department: 'Conservativa & Endodonzia',
    defaultOperator: 'Dott. Andrea Valenti',
    color: 'sky',
    isActive: true,
    notes: 'Unità operativa per restauri estetici, endodonzia meccanica e sagomatura canalare.',
  },
  {
    id: 'chair-3',
    name: 'Poltrona 3',
    department: 'CLOPD - Protesi Dentaria',
    defaultOperator: 'Dott. Marco Riva (Tutor CLOPD)',
    color: 'amber',
    isActive: true,
    notes: 'Reparto Protesi fissa e mobile, riabilitazioni complesse e impronte digitali 3D.',
  },
  {
    id: 'chair-4',
    name: 'Poltrona 4',
    department: 'Ortodonzia & Gnatologia',
    defaultOperator: 'Dott.ssa Elena Rossi',
    color: 'rose',
    isActive: true,
    notes: 'Allineatori invisibili, apparecchi fissi, terapia miofunzionale e bite gnatologici.',
  },
  {
    id: 'chair-5',
    name: 'Poltrona 5',
    department: 'CLID 1 - Igiene & Terapia Parodontale',
    defaultOperator: 'Dott.ssa Chiara Galli (Igienista CLID)',
    color: 'emerald',
    isActive: true,
    notes: 'Reparto Igiene Dentale: debridement parodontale, levigatura radicolare e air-polishing.',
  },
  {
    id: 'chair-6',
    name: 'Poltrona 6',
    department: 'CLID 2 - Prevenzione & Sbiancamento',
    defaultOperator: 'Dott. Simone Bianchi (Igienista CLID)',
    color: 'teal',
    isActive: true,
    notes: 'Ablazione tartaro, fluoroprofilassi, sigillature solchi e sbiancamento LED.',
  },
];

const STORAGE_KEY_PREFIX = 'prismal_dental_chairs_';

/**
 * Loads configured chairs for a studio from localStorage or returns official defaults
 */
export function getStudioChairs(studioId: string): DentalChair[] {
  if (!studioId) return DEFAULT_DENTAL_CHAIRS;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${studioId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading chairs from localStorage:', e);
  }
  return DEFAULT_DENTAL_CHAIRS;
}

/**
 * Persists chairs configuration for a specific studio
 */
export function saveStudioChairs(studioId: string, chairs: DentalChair[]): void {
  if (!studioId) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${studioId}`, JSON.stringify(chairs));
  } catch (e) {
    console.error('Error saving chairs to localStorage:', e);
  }
}

/**
 * Calculates end time given start time string "HH:MM" and duration in minutes
 */
export function calculateEndTimeSlot(startSlot: string, durationMinutes: number = 45): string {
  if (!startSlot || !startSlot.includes(':')) return '10:00';
  const [hStr, mStr] = startSlot.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return startSlot;

  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Resolves or auto-assigns an appointment to a realistic chair based on visit reason or appointment data
 */
export function resolveAppointmentChair(
  appointment: Appointment,
  chairs: DentalChair[]
): {
  chair: DentalChair;
  durationMinutes: number;
  endTime: string;
} {
  const activeChairs = chairs.filter(c => c.isActive);
  const fallbackChair = activeChairs[0] || DEFAULT_DENTAL_CHAIRS[0];

  // 1. Explicit chair assignment
  if (appointment.chairId) {
    const matched = activeChairs.find(c => c.id === appointment.chairId);
    if (matched) {
      const duration = appointment.durationMinutes || getEstimatedDuration(appointment.visitReasonName);
      const endTime = appointment.endTimeSlot || calculateEndTimeSlot(appointment.timeSlot, duration);
      return { chair: matched, durationMinutes: duration, endTime };
    }
  }

  // 2. Intelligent clinical triage assignment based on visit reason
  const reasonLower = (appointment.visitReasonName || '').toLowerCase();
  let targetId = 'chair-1';

  if (reasonLower.includes('igiene') || reasonLower.includes('pulizia') || reasonLower.includes('tartaro')) {
    targetId = 'chair-5'; // CLID 1
  } else if (reasonLower.includes('sbiancamento') || reasonLower.includes('prevenzione')) {
    targetId = 'chair-6'; // CLID 2
  } else if (reasonLower.includes('protesi') || reasonLower.includes('corona') || reasonLower.includes('ponte') || reasonLower.includes('intarsio')) {
    targetId = 'chair-3'; // CLOPD Protesi
  } else if (reasonLower.includes('ortodonzia') || reasonLower.includes('invisalign') || reasonLower.includes('apparecchio') || reasonLower.includes('bite')) {
    targetId = 'chair-4'; // Ortodonzia
  } else if (reasonLower.includes('otturazione') || reasonLower.includes('conservativa') || reasonLower.includes('devitalizzazione') || reasonLower.includes('carie')) {
    targetId = 'chair-2'; // Conservativa & Endo
  } else if (reasonLower.includes('urgenza') || reasonLower.includes('parodont') || reasonLower.includes('impianto') || reasonLower.includes('estrazione')) {
    targetId = 'chair-1'; // Parodontologia & Chirurgia
  } else {
    // Round robin hash by appointment code/id
    const charCode = (appointment.code || appointment.id || '1').charCodeAt(0);
    const chairIndex = charCode % activeChairs.length;
    targetId = activeChairs[chairIndex]?.id || 'chair-1';
  }

  const assignedChair = activeChairs.find(c => c.id === targetId) || fallbackChair;
  const duration = appointment.durationMinutes || getEstimatedDuration(appointment.visitReasonName);
  const endTime = appointment.endTimeSlot || calculateEndTimeSlot(appointment.timeSlot, duration);

  return { chair: assignedChair, durationMinutes: duration, endTime };
}

export function getEstimatedDuration(visitReasonName?: string): number {
  if (!visitReasonName) return 45;
  const r = visitReasonName.toLowerCase();
  if (r.includes('chirurgia') || r.includes('impianto') || r.includes('levigatura')) return 90;
  if (r.includes('protesi') || r.includes('corona') || r.includes('riabilitazione')) return 90;
  if (r.includes('sbiancamento')) return 60;
  if (r.includes('igiene')) return 45;
  if (r.includes('urgenza')) return 45;
  if (r.includes('prima visita') || r.includes('controllo')) return 30;
  return 45;
}

export const CHAIR_COLOR_MAP: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
    cardBg: string;
    cardBorder: string;
    cardHover: string;
  }
> = {
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-300',
    text: 'text-purple-900',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    accent: 'bg-purple-600',
    cardBg: 'bg-gradient-to-br from-purple-50/90 to-purple-100/60',
    cardBorder: 'border-purple-300 hover:border-purple-400',
    cardHover: 'hover:shadow-md hover:ring-1 hover:ring-purple-300',
  },
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-300',
    text: 'text-sky-900',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    accent: 'bg-sky-600',
    cardBg: 'bg-gradient-to-br from-sky-50/90 to-sky-100/60',
    cardBorder: 'border-sky-300 hover:border-sky-400',
    cardHover: 'hover:shadow-md hover:ring-1 hover:ring-sky-300',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-300',
    text: 'text-amber-900',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    accent: 'bg-amber-600',
    cardBg: 'bg-gradient-to-br from-amber-50/90 to-amber-100/60',
    cardBorder: 'border-amber-300 hover:border-amber-400',
    cardHover: 'hover:shadow-md hover:ring-1 hover:ring-amber-300',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-300',
    text: 'text-rose-900',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    accent: 'bg-rose-600',
    cardBg: 'bg-gradient-to-br from-rose-50/90 to-rose-100/60',
    cardBorder: 'border-rose-300 hover:border-rose-400',
    cardHover: 'hover:shadow-md hover:ring-1 hover:ring-rose-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-300',
    text: 'text-emerald-900',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    accent: 'bg-emerald-600',
    cardBg: 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/60',
    cardBorder: 'border-emerald-300 hover:border-emerald-400',
    cardHover: 'hover:shadow-md hover:ring-1 hover:ring-emerald-300',
  },
  teal: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-300',
    text: 'text-teal-900',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    accent: 'bg-teal-600',
    cardBg: 'bg-gradient-to-br from-teal-50/90 to-teal-100/60',
    cardBorder: 'border-teal-300 hover:border-teal-400',
    cardHover: 'hover:shadow-md hover:ring-1 hover:ring-teal-300',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-300',
    text: 'text-indigo-900',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    accent: 'bg-indigo-600',
    cardBg: 'bg-gradient-to-br from-indigo-50/90 to-indigo-100/60',
    cardBorder: 'border-indigo-300 hover:border-indigo-400',
    cardHover: 'hover:shadow-md hover:ring-1 hover:ring-indigo-300',
  },
  slate: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-300',
    text: 'text-slate-900',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    accent: 'bg-slate-600',
    cardBg: 'bg-slate-50',
    cardBorder: 'border-slate-300',
    cardHover: 'hover:shadow-md',
  },
};
