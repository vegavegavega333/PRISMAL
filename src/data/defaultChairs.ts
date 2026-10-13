import { DentalChair, Appointment } from '../types';

export interface ClinicalDepartmentTemplate {
  id: string;
  name: string;
  category: string;
  defaultDurationMinutes: number; // Standard 90 min (1h 30m) as requested
  color: 'purple' | 'sky' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'teal' | 'slate';
  description: string;
  suggestedProcedures: string[];
}

/**
 * Official Clinical Department Templates for Dental Practices
 * Default standard session duration: 90 minutes (1 ora e mezza)
 */
export const CLINICAL_DEPARTMENT_TEMPLATES: ClinicalDepartmentTemplate[] = [
  {
    id: 'dept-parodontologia',
    name: 'Reparto Parodontologia',
    category: 'Parodontologia',
    defaultDurationMinutes: 90,
    color: 'teal',
    description: 'Diagnosi e cura delle patologie dei tessuti parodontali, debridement a ultrasuoni e levigatura radicolare.',
    suggestedProcedures: [
      'Levigatura Radicolare per quadrante',
      'Debridement Parodontale ad Ultrasuoni',
      'Terapia Parodontale di Supporto (SPT)',
      'Chirurgia Resettiva / Rigenerativa',
    ],
  },
  {
    id: 'dept-chirurgia',
    name: 'Reparto Chirurgia',
    category: 'Chirurgia',
    defaultDurationMinutes: 90,
    color: 'rose',
    description: 'Chirurgia orale ambulatoriale, implantologia osteointegrata, avulsioni complesse e rigenerazione tissutale guidata.',
    suggestedProcedures: [
      'Inserimento Impianto Dentale Osteointegrato',
      'Estrazione Chirurgica Ottavo / Dente Incluso',
      'Rialzo del Seno Mascellare (Sinus Lift)',
      'Rigenerazione Ossea Guidata (GBR)',
    ],
  },
  {
    id: 'dept-conservativa',
    name: 'Reparto Conservativa',
    category: 'Conservativa',
    defaultDurationMinutes: 90,
    color: 'sky',
    description: 'Restauro degli elementi dentali compromessi da carie o traumi, otturazioni estetiche dirette e intarsi.',
    suggestedProcedures: [
      'Ricostruzione Diretta in Composito',
      'Restauro Estetico Settore Anteriore',
      'Intarsio in Ceramica / Disilicato (Inlay/Onlay)',
      'Sigillatura Solchi e Prevenzione',
    ],
  },
  {
    id: 'dept-endodonzia',
    name: 'Reparto Endodonzia',
    category: 'Endodonzia',
    defaultDurationMinutes: 90,
    color: 'purple',
    description: 'Trattamento e ritrattamento dei canali radicolari, sagomatura Ni-Ti meccanica e sigillatura canalare 3D.',
    suggestedProcedures: [
      'Terapia Canalare Dente Monoradicolato',
      'Terapia Canalare Dente Pluriradicolato',
      'Ritrattamento Endodontico Complesso',
      'Rimozione Perno e Detersione Canalare',
    ],
  },
  {
    id: 'dept-protesi',
    name: 'Reparto Protesi',
    category: 'Protesi',
    defaultDurationMinutes: 90,
    color: 'amber',
    description: 'Riabilitazioni protesiche fisse e mobili, corone in zirconio, ponti, faccette estetiche e impronte digitali 3D.',
    suggestedProcedures: [
      'Preparazione Moncone e Corona in Zirconio',
      'Scansione Ottica 3D e Prova Struttura Protesica',
      'Faccette Estetiche in Ceramica',
      'Protesi Totale Mobile / Scheletrato con Ganci',
    ],
  },
  {
    id: 'dept-ortodonzia',
    name: 'Reparto Ortodonzia & Gnatologia',
    category: 'Ortodonzia e Gnatologia',
    defaultDurationMinutes: 90,
    color: 'indigo',
    description: 'Allineamento dentale, mascherine trasparenti invisibili, terapia funzionale e bite gnatologici per ATM.',
    suggestedProcedures: [
      'Check-up Ortodontico con Scansione Digitale',
      'Applicazione / Monitoraggio Allineatori Invisibili',
      'Apparecchio Fisso Vestibolare / Linguale',
      'Bite Gnatologico per Bruxismo e Disfunzioni ATM',
    ],
  },
  {
    id: 'dept-igiene',
    name: 'Reparto Igiene',
    category: 'Igiene',
    defaultDurationMinutes: 90,
    color: 'emerald',
    description: 'Igiene orale professionale, rimozione tartaro con piezo, air-polishing con glicina e sbiancamento LED.',
    suggestedProcedures: [
      'Ablazione del Tartaro & Deplaquing Professionale',
      'Air-Polishing con Glicina Sub- e Sopragengivale',
      'Fluoroprofilassi e Remineralizzazione',
      'Sbiancamento Dentale Professionale alla Lampada LED',
    ],
  },
];

// No fake default chairs or operators prefilled! Clean empty state by default.
export const DEFAULT_DENTAL_CHAIRS: DentalChair[] = [];

const STORAGE_KEY_PREFIX = 'prismal_dental_chairs_';

/**
 * Loads configured chairs for a studio from localStorage.
 * If empty, returns [] so the user can configure their own chairs without fake data.
 */
export function getStudioChairs(studioId: string): DentalChair[] {
  if (!studioId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${studioId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // If the saved data was the old fake 3 chairs default (Marco Bianchi, Andrea Valenti, Marco Riva, clopt, etc.), purge it completely
        const isOldFakeDefault = parsed.some(c =>
          c.id === 'chair-1' || c.id === 'chair-2' || c.id === 'chair-3' ||
          c.defaultOperator?.includes('Marco Bianchi') ||
          c.defaultOperator?.includes('Andrea Valenti') ||
          c.defaultOperator?.includes('Marco Riva') ||
          c.defaultOperator?.includes('Elena Rossi') ||
          c.defaultOperator?.includes('Simone Bianchi') ||
          c.defaultOperator?.includes('Chiara Galli') ||
          c.notes?.toLowerCase().includes('clopt') ||
          c.notes?.toLowerCase().includes('disinfett')
        );
        if (isOldFakeDefault) {
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}${studioId}`);
          return [];
        }

        return parsed.map(c => ({
          ...c,
          defaultOperator: c.defaultOperator?.includes('Marco Bianchi') ||
            c.defaultOperator?.includes('Andrea Valenti') ||
            c.defaultOperator?.includes('Marco Riva') ||
            c.defaultOperator?.includes('Elena Rossi') ||
            c.defaultOperator?.includes('Chiara Galli') ||
            c.defaultOperator?.includes('Simone Bianchi')
              ? ''
              : c.defaultOperator || '',
          notes: c.notes?.toLowerCase().includes('clopt') ? '' : c.notes || '',
        }));
      }
    }
  } catch (e) {
    console.error('Error loading chairs from localStorage:', e);
  }
  return [];
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
 * Helper to generate a chair from an official department template
 */
export function createChairFromTemplate(template: ClinicalDepartmentTemplate, chairNumber: number): DentalChair {
  return {
    id: `chair-${Date.now()}-${chairNumber}`,
    name: `Poltrona ${chairNumber}`,
    department: template.category,
    defaultOperator: '', // Clean: no fake names
    color: template.color,
    isActive: true,
    notes: template.description,
  };
}

/**
 * Calculates end time given start time string "HH:MM" and duration in minutes
 */
export function calculateEndTimeSlot(startSlot: string, durationMinutes: number = 90): string {
  if (!startSlot || !startSlot.includes(':')) return '10:30';
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
 * Resolves or auto-assigns an appointment to a chair
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

  // If no chairs configured, return an on-the-fly virtual chair
  if (activeChairs.length === 0) {
    const virtualChair: DentalChair = {
      id: appointment.chairId || 'chair-main',
      name: appointment.chairName || 'Poltrona Principale',
      department: appointment.department || 'Generale',
      defaultOperator: appointment.operatorName || '',
      color: 'purple',
      isActive: true,
    };
    const duration = appointment.durationMinutes || 90;
    const endTime = appointment.endTimeSlot || calculateEndTimeSlot(appointment.timeSlot, duration);
    return { chair: virtualChair, durationMinutes: duration, endTime };
  }

  // 1. Explicit chair assignment
  if (appointment.chairId) {
    const matched = activeChairs.find(c => c.id === appointment.chairId);
    if (matched) {
      const duration = appointment.durationMinutes || 90;
      const endTime = appointment.endTimeSlot || calculateEndTimeSlot(appointment.timeSlot, duration);
      return { chair: matched, durationMinutes: duration, endTime };
    }
  }

  // 2. Department-based assignment
  const reasonLower = (appointment.visitReasonName || '').toLowerCase();
  const deptMatch = activeChairs.find(c => {
    const depLower = (c.department || '').toLowerCase();
    if (reasonLower.includes('igiene') || reasonLower.includes('pulizia')) return depLower.includes('igiene');
    if (reasonLower.includes('chirurg') || reasonLower.includes('impiant')) return depLower.includes('chirurg');
    if (reasonLower.includes('ortodon') || reasonLower.includes('invisalign')) return depLower.includes('ortodon');
    if (reasonLower.includes('protesi') || reasonLower.includes('corona')) return depLower.includes('protesi');
    if (reasonLower.includes('endo') || reasonLower.includes('canal')) return depLower.includes('endo');
    if (reasonLower.includes('otturaz') || reasonLower.includes('conserv')) return depLower.includes('conserv');
    if (reasonLower.includes('paro')) return depLower.includes('paro');
    return false;
  });

  const assigned = deptMatch || activeChairs[0];
  const duration = appointment.durationMinutes || 90;
  const endTime = appointment.endTimeSlot || calculateEndTimeSlot(appointment.timeSlot, duration);

  return { chair: assigned, durationMinutes: duration, endTime };
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
