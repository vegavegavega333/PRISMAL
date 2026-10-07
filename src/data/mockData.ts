import { Studio, Appointment, VisitReason, DayAvailability, BlockedSlot, EmailNotification, PlanPricing, SmartBookingRules } from '../types';

export const DEFAULT_SMART_BOOKING_RULES: SmartBookingRules = {
  enabled: true,
  minNoticeHours: 2, // Minimo 2 ore di preavviso per consentire sanificazione e preparazione sala
  maxAdvanceDays: 60, // Agenda aperta fino a 60 giorni in avanti
  bufferTimeMinutes: 10, // 10 minuti di sanificazione e riordino poltrona tra visite
  emergencySlotsReservedPerDay: 1, // 1 slot giornaliero riservato a urgenze / mal di denti acuto
  maxActiveBookingsPerPatient: 1, // Massimo 1 prenotazione attiva per evitare no-show e spam
  autoConfirmExistingPatients: true, // Convalida istantanea per pazienti storici verificati
  requireApprovalForNewPatients: false, // I nuovi pazienti vengono convalidati via codice OTP
  allowSameDayBookings: true, // Permette prenotazioni in giornata se rispettato l'anticipo minimo
  smartWaitlistEnabled: true, // Lista d'attesa intelligente che riempie gli slot liberati da disdette
  categoryDynamicBuffers: true, // Buffer maggiorato automatico per interventi o prime visite
  lunchBreakProtection: true, // Pausa protetta di 90 minuti tra mattina e pomeriggio
  noShowProtectionStrict: true, // Blocco automatico per contatti con no-show non giustificati
};

export const PLAN_PRICING_OPTIONS: PlanPricing[] = [
  {
    id: 'trial_30d',
    name: '30 Giorni di Prova',
    badge: 'Verifica 0,00€',
    priceMonthly: 0,
    monthlyBookingsLimit: -1,
    monthlySmsLimit: 0,
    operatorsLimit: -1,
    description: 'Prova per 30 giorni tutte le funzionalità cloud di PRISMAL senza spendere 1 centesimo.',
    operators: 'Poltrone Illimitate',
    features: [
      'Appuntamenti e Pazienti ILLIMITATI',
      'Minisito web e triage odontoiatrico guidato',
      'Cartella Clinica & Odontogramma 3D interattivo',
      'Sincronizzazione Outlook e Google Calendar',
      'Regole Smart (sanificazione poltrone, urgenze, waitlist)',
      'Esportazione ponte per gestionali PMS',
      'Zero costi carrier durante i 30 giorni',
    ],
  },
  {
    id: 'prismal_prime',
    name: 'PRISMAL Prime',
    badge: 'Tutto Incluso',
    priceMonthly: 149,
    priceAnnualMonthly: 119,
    monthlyBookingsLimit: -1,
    monthlySmsLimit: 250,
    operatorsLimit: -1,
    description: 'La suite odontoiatrica cloud all-inclusive per il tuo studio.',
    operators: 'Poltrone e Operatori Illimitati',
    recommended: true,
    features: [
      'Tutte le funzionalità dei 30 giorni di prova',
      'Conferme e promemoria con WhatsApp Business Ufficiale',
      'Pacchetto 250 SMS AGCOM/mese con mittente certificato',
      'Centralino Telefonico Vocale AI H24 per lo studio',
      'Poltrone, sale operatorie e collaboratori illimitati',
      'Assistenza prioritaria dedicata',
    ],
  },
];

export const DEFAULT_VISIT_REASONS: VisitReason[] = [
  {
    id: 'vr-1',
    name: 'Igiene Orale & Ablazione Tartufo',
    durationMinutes: 45,
    description: 'Pulizia professionale approfondita, lucidatura e controllo gengivale.',
    category: 'hygiene',
    priceEstimate: '€80 - €100',
    iconName: 'Sparkles',
  },
  {
    id: 'vr-2',
    name: 'Prima Visita Odontoiatrica & Check-up',
    durationMinutes: 30,
    description: 'Esame clinico completo, ortopanoramica e piano di cura personalizzato.',
    category: 'routine',
    priceEstimate: 'Gratuito / da €50',
    iconName: 'Sparkles',
  },
  {
    id: 'vr-3',
    name: 'Controllo Periodico di Routine',
    durationMinutes: 30,
    description: 'Visita periodica di mantenimento per pazienti già in cura presso lo studio.',
    category: 'routine',
    priceEstimate: 'Incluso nel piano',
    iconName: 'CalendarCheck',
  },
  {
    id: 'vr-4',
    name: 'Urgenza Odontoiatrica / Mal di Denti',
    durationMinutes: 45,
    description: 'Gestione immediata di dolore acuto, trauma dentale, ascesso o frattura.',
    category: 'emergency',
    priceEstimate: 'Visita prioritaria',
    iconName: 'AlertTriangle',
  },
  {
    id: 'vr-5',
    name: 'Consulenza Ortodonzia Invisibile',
    durationMinutes: 45,
    description: 'Scansione 3D delle arcate e simulazione digitale dell\'allineamento.',
    category: 'specialist',
    priceEstimate: 'Preventivo gratuito',
    iconName: 'Smile',
  },
  {
    id: 'vr-6',
    name: 'Sbiancamento Dentale Professionale',
    durationMinutes: 60,
    description: 'Trattamento estetico alla lampada LED per un sorriso brillante e naturale.',
    category: 'specialist',
    priceEstimate: '€250 - €350',
    iconName: 'Flame',
  },
];

export const DEFAULT_WEEKLY_AVAILABILITY: DayAvailability[] = [
  {
    dayOfWeek: 1, // Lunedì
    dayName: 'Lunedì',
    isOpen: true,
    morningStart: '09:00',
    morningEnd: '13:00',
    afternoonStart: '14:30',
    afternoonEnd: '19:00',
  },
  {
    dayOfWeek: 2, // Martedì
    dayName: 'Martedì',
    isOpen: true,
    morningStart: '09:00',
    morningEnd: '13:00',
    afternoonStart: '14:30',
    afternoonEnd: '19:00',
  },
  {
    dayOfWeek: 3, // Mercoledì
    dayName: 'Mercoledì',
    isOpen: true,
    morningStart: '09:00',
    morningEnd: '13:00',
    afternoonStart: '14:30',
    afternoonEnd: '19:00',
  },
  {
    dayOfWeek: 4, // Giovedì
    dayName: 'Giovedì',
    isOpen: true,
    morningStart: '09:00',
    morningEnd: '13:00',
    afternoonStart: '14:30',
    afternoonEnd: '19:00',
  },
  {
    dayOfWeek: 5, // Venerdì
    dayName: 'Venerdì',
    isOpen: true,
    morningStart: '09:00',
    morningEnd: '13:00',
    afternoonStart: '14:30',
    afternoonEnd: '18:00',
  },
  {
    dayOfWeek: 6, // Sabato
    dayName: 'Sabato',
    isOpen: false,
    morningStart: '09:00',
    morningEnd: '13:00',
    afternoonStart: '14:00',
    afternoonEnd: '17:00',
  },
  {
    dayOfWeek: 0, // Domenica
    dayName: 'Domenica',
    isOpen: false,
    morningStart: '09:00',
    morningEnd: '13:00',
    afternoonStart: '14:00',
    afternoonEnd: '17:00',
  },
];

// Real registered studio on PRISMAL
export const REAL_STUDIO_PROVA_5: Studio = {
  id: 'studio-1790169305515',
  name: 'prova 5',
  slug: 'prova-5',
  email: 'vega2fast@gmail.com',
  password: 'password123',
  isEmailVerified: true,
  logoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80',
  phone: '3473100353',
  address: 'Via Roma 1',
  city: 'Dello (BS)',
  status: 'approved_demo',
  plan: 'demo_free',
  isSponsored: false,
  rating: 0,
  reviewsCount: 0,
  latitude: 45.4206,
  longitude: 10.0528,
  description: 'Studio odontoiatrico all\'avanguardia per igiene, implantologia, ortodonzia e urgenze dentali.',
  specialties: ['Igiene Orale', 'Impianti', 'Ortodonzia', 'Sbiancamento', 'Urgenze'],
  demoSlotsTotal: 10,
  demoSlotsRemaining: 10,
  createdAt: '2026-09-23T13:15:05.515Z',
  slotDurationMinutes: 30,
  weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  visitReasons: DEFAULT_VISIT_REASONS,
  smartBookingRules: DEFAULT_SMART_BOOKING_RULES,
};

export const INITIAL_STUDIOS: Studio[] = [REAL_STUDIO_PROVA_5];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_BLOCKED_SLOTS: BlockedSlot[] = [];

export const INITIAL_NOTIFICATIONS: EmailNotification[] = [];

