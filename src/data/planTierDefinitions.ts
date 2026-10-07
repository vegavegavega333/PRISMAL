import { PlanType, PlanFeatureKey, AddonSlotPackage, SuperAdminPaymentConfig, Studio, Appointment, SponsorshipPackage } from '../types';

export const DEFAULT_SPONSORSHIP_PACKAGES: SponsorshipPackage[] = [
  {
    id: 'spons_7d',
    name: '7 Giorni Sprint',
    durationDays: 7,
    priceEur: 19,
    priceProEur: 14,
    priceEnterpriseEur: 9,
    tagline: 'Visibilità immediata per riempire rapidamente gli slot liberi della settimana.',
    estimatedImpressionsBoost: '+350% ricerche',
    estimatedExtraBookings: '12 - 18 visite stimate',
    estimatedRevenueBoost: '€1.200 - €1.800',
    popular: false,
  },
  {
    id: 'spons_30d',
    name: '30 Giorni Spotlight',
    durationDays: 30,
    priceEur: 49,
    priceProEur: 39,
    priceEnterpriseEur: 29,
    tagline: 'Top rank costante in prima pagina nella tua città per un mese intero.',
    estimatedImpressionsBoost: '+650% ricerche',
    estimatedExtraBookings: '35 - 55 visite stimate',
    estimatedRevenueBoost: '€3.500 - €5.500',
    popular: true,
  },
  {
    id: 'spons_90d',
    name: '90 Giorni Top Rank',
    durationDays: 90,
    priceEur: 119,
    priceProEur: 99,
    priceEnterpriseEur: 79,
    tagline: 'Dominanza locale garantita per un trimestre con badge sponsorizzato continuo.',
    estimatedImpressionsBoost: '+950% ricerche',
    estimatedExtraBookings: '110 - 160 visite stimate',
    estimatedRevenueBoost: '€11.000 - €16.000',
    popular: false,
  },
];

// Single official plan: PRISMAL Prime
export const PRISMAL_PRIME_PRICE_MONTHLY = 149; // 149€/mese (benchmark di mercato per suite odontoiatrica cloud completa con 3D odontogramma e Twilio)
export const PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY = 119; // 119€/mese fatturati annualmente (1.428€/anno, risparmio del 20% / 360€)
export const TRIAL_DAYS_DEFAULT = 30;

// Legacy export aliases for backwards compatibility
export const CLINICAL_SUITE_PRICE_MONTHLY = PRISMAL_PRIME_PRICE_MONTHLY;
export const CLINICAL_SUITE_PRICE_ANNUAL_MONTHLY = PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY;

export interface PlanFeatureMatrix {
  id: PlanType;
  name: string;
  badge: string;
  priceMonthly: number;
  priceAnnualMonthly: number;
  monthlyBookingsLimit: number; // -1 for unlimited
  monthlySmsLimit: number;
  operatorsLimit: number; // -1 for unlimited
  description: string;
  operators: string;
  features: string[];
  recommended?: boolean;
  featureFlags: Record<PlanFeatureKey, boolean>;
  trialZeroCostFeatures: string[];
  paidExclusiveFeatures: string[];
}

// Single comprehensive plan definition: PRISMAL Prime
export const PRISMAL_PRIME_CONFIG: PlanFeatureMatrix = {
  id: 'prismal_prime',
  name: 'PRISMAL Prime',
  badge: 'Prime All-Inclusive',
  priceMonthly: PRISMAL_PRIME_PRICE_MONTHLY,
  priceAnnualMonthly: PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY,
  monthlyBookingsLimit: -1, // Prenotazioni illimitate per tutti
  monthlySmsLimit: 250, // 250 SMS inclusi nel piano a pagamento
  operatorsLimit: -1, // Poltrone e operatori illimitati
  description: 'La suite odontoiatrica cloud all-inclusive: agenda multi-poltrona illimitata, triage per i pazienti, odontogramma 3D, sincronizzazione Outlook/Google Calendar e gestione completa.',
  operators: 'Poltrone e Operatori Illimitati',
  features: [
    'Appuntamenti e Pazienti ILLIMITATI (zero limiti di capienza)',
    'Minisito web e triage odontoiatrico guidato per i pazienti',
    'Cartella Clinica & Odontogramma Digitale 3D interattivo',
    'Piani di Trattamento e Preventivi odontoiatrici con firme',
    'Sincronizzazione Microsoft 365, Outlook e Google Calendar',
    'Regole Smart (anticipo minimo, buffer sanificazione, slot urgenze, waitlist)',
    'Esportazione ponte per gestionali PMS (XDent, OrisDent, AlfaDoc, ecc.)',
    'Suite GDPR Sanitaria con registro consensi e privacy',
    'Conferme e promemoria automatici via WhatsApp Business Ufficiale',
    'Pacchetto 250 SMS AGCOM/mese con mittente certificato',
    'Centralino Telefonico Vocale AI H24 con assistente dedicato',
    'Poltrone, sale operatorie e collaboratori illimitati',
  ],
  recommended: true,
  featureFlags: {
    onlineBooking: true,
    otpVerification: true,
    gdprTracking: true,
    triageGeneral: true,
    triageAdvancedAesthetic: true,
    digitalOdontogram: true,
    treatmentPlans: true,
    smartRules: true,
    pmsIntegrations: true,
    aiCopilot: true,
    analyticsDossier: true,
    prioritySupport: true,
  },
  // Funzionalità attive nei 30 giorni di prova a costo zero per PRISMAL
  trialZeroCostFeatures: [
    'Triage odontoiatrico guidato per il paziente (urgenze, igiene, estetica)',
    'Minisito web dello studio e link di prenotazione online 24/7',
    'Prenotazioni e anagrafiche pazienti ILLIMITATE',
    'Agenda digitale cloud multi-poltrona e gestione ferie',
    'Cartella Clinica & Odontogramma Digitale 3D',
    'Piani di trattamento e preventivi odontoiatrici',
    'Sincronizzazione automatica Microsoft 365, Outlook e Google Calendar via feed iCal',
    'Regole Smart (anticipo minimo, buffer sanificazione, slot urgenze, smart waitlist)',
    'Esportazione ponte verso software gestionali PMS (XDent, OrisDent, AlfaDoc)',
    'Notifiche email automatiche illimitate (conferme e promemoria)',
    'Suite di conformità GDPR Sanitaria Reg. UE 2016/679',
  ],
  // Servizi a valore aggiunto sbloccati con il piano a pagamento attivo (costi vivi di telecomunicazione/carrier)
  paidExclusiveFeatures: [
    'Conferme e Promemoria istantanei via WhatsApp Business API Ufficiale (Twilio Cloud)',
    'Pacchetto 250 SMS Promemoria/mese con Mittente Alfanumerico Certificato AGCOM',
    'Centralino Telefonico Vocale AI Dedicato per lo Studio H24 (Integrazione Twilio Voice)',
    'Assistenza Prioritaria Diretta con Operatore Dedicato',
  ],
};

// Aliases for backwards compatibility
export const CLINICAL_SUITE_CONFIG = PRISMAL_PRIME_CONFIG;

// All legacy plan types map cleanly to the unified PRISMAL Prime
export const PLAN_TIERS_CONFIG: Record<PlanType, PlanFeatureMatrix> = {
  prismal_prime: PRISMAL_PRIME_CONFIG,
  clinical_suite: PRISMAL_PRIME_CONFIG,
  trial_30d: {
    ...PRISMAL_PRIME_CONFIG,
    id: 'trial_30d',
    name: '30 Giorni di Prova Gratuita',
    badge: 'Prova 30 Giorni (0,00€)',
    priceMonthly: 0,
    priceAnnualMonthly: 0,
  },
  demo_free: {
    ...PRISMAL_PRIME_CONFIG,
    id: 'demo_free',
    name: '30 Giorni di Prova Gratuita',
    badge: 'Prova 30 Giorni (0,00€)',
    priceMonthly: 0,
    priceAnnualMonthly: 0,
  },
  base_monthly: PRISMAL_PRIME_CONFIG,
  pro_monthly: PRISMAL_PRIME_CONFIG,
  premium_monthly: PRISMAL_PRIME_CONFIG,
  base: PRISMAL_PRIME_CONFIG,
  pro: PRISMAL_PRIME_CONFIG,
  premium: PRISMAL_PRIME_CONFIG,
};

export const ADDON_SLOT_PACKAGES: AddonSlotPackage[] = [
  {
    id: 'addon-sms-150',
    type: 'sms',
    name: '+150 SMS Extra AGCOM',
    quantity: 150,
    price: 15,
    badge: '150 SMS',
    description: 'Pacchetto SMS con mittente alfanumerico certificato per promemoria e conferme.',
  },
  {
    id: 'addon-sms-500',
    type: 'sms',
    name: '+500 SMS Extra AGCOM',
    quantity: 500,
    price: 39,
    badge: '500 SMS',
    description: 'Plafond esteso per cliniche e studi ad alto volume di visite mensili.',
  },
];

export const DEFAULT_SUPERADMIN_PAYMENT_CONFIG: SuperAdminPaymentConfig = {
  bankBeneficiary: 'Diego Raimondi - PRISMAL Cloud Suite',
  bankIban: '',
  bankSwiftBic: '',
  bankName: '',
  bankPaymentInstructions: 'Indicare nella causale del bonifico il nome dello studio dentistico o il codice fattura.',
  paypalEnabled: true,
  paypalMerchantEmail: 'diegoraimondi7@gmail.com',
  paypalClientId: '',
  paypalPaymentLinkUrl: 'https://www.paypal.com/paypalme/diegoraimondi7',
  stripeEnabled: true,
  stripePublishableKey: '',
  stripeSecretKey: '',
  stripePaymentLinkUrl: 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00',
  stripeConnectAccountId: '',
  googlePayMerchantId: '',
  googlePayMerchantName: 'PRISMAL Dental Suite',
  isLiveProductionMode: true,
  fiscalVatNumber: '',
  fiscalCompanyAddress: '',
  fiscalSdiCode: '0000000',
  fiscalTaxRate: 22,
  autoActivateOnPayment: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Checks whether a specific clinical or software feature is enabled for a given plan.
 * All clinical features are 100% unlocked in PRISMAL Prime (both trial and active).
 */
export function isFeatureAllowed(_plan: PlanType, _feature: PlanFeatureKey): boolean {
  return true;
}

/**
 * Helper to get the status of the studio's 30-day trial or paid subscription
 */
export function getStudioTrialStatus(studio: Studio | null): {
  isTrialing: boolean;
  isPaidActive: boolean;
  hasConnectedCard: boolean;
  daysRemaining: number;
  renewalDateStr: string;
  cancelAtPeriodEnd: boolean;
  cardLast4?: string;
  cardBrand?: string;
} {
  if (!studio) {
    return {
      isTrialing: false,
      isPaidActive: false,
      hasConnectedCard: false,
      daysRemaining: 0,
      renewalDateStr: '',
      cancelAtPeriodEnd: false,
    };
  }

  const sub = studio.subscription;
  const cardLast4 = sub?.paymentMethodDetails?.last4;
  const cardBrand = sub?.paymentMethodDetails?.brand || (sub?.paymentMethod === 'google_pay' ? 'Google Pay' : sub?.paymentMethod === 'paypal' ? 'PayPal' : 'Carta');
  const hasConnectedCard = !!cardLast4 || sub?.paymentMethod === 'credit_card' || sub?.paymentMethod === 'google_pay' || sub?.paymentMethod === 'paypal';

  const isPaidActive = sub?.status === 'active' && !sub?.cancelAtPeriodEnd && (sub?.lastPaymentAmount || 0) > 0;
  
  // Trialing if marked trialing or if status is not explicitly cancelled and trial period is running
  const isTrialing = sub?.status === 'trialing' || (!isPaidActive && hasConnectedCard && !sub?.cancelAtPeriodEnd);

  const endMs = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : Date.now() + 30 * 86400000;
  const daysRemaining = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
  const renewalDateStr = sub?.currentPeriodEnd 
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date(Date.now() + 30 * 86400000).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  return {
    isTrialing,
    isPaidActive,
    hasConnectedCard,
    daysRemaining,
    renewalDateStr,
    cancelAtPeriodEnd: !!sub?.cancelAtPeriodEnd,
    cardLast4,
    cardBrand,
  };
}

/**
 * Calculates monthly booking usage and capacity for a studio (Unlimited in PRISMAL Prime)
 */
export function getStudioQuotaStatus(_studio: Studio, _appointments: Appointment[]): {
  planName: string;
  isDemo: boolean;
  isUnlimited: boolean;
  totalLimit: number;
  used: number;
  remaining: number;
  pctUsed: number;
  isExhausted: boolean;
  extraPurchased: number;
  smsTotalLimit: number;
  smsUsed: number;
  smsRemaining: number;
  smsPctUsed: number;
} {
  return {
    planName: PRISMAL_PRIME_CONFIG.name,
    isDemo: false,
    isUnlimited: true,
    totalLimit: -1,
    used: 0,
    remaining: 99999,
    pctUsed: 0,
    isExhausted: false,
    extraPurchased: 0,
    smsTotalLimit: 250,
    smsUsed: 0,
    smsRemaining: 250,
    smsPctUsed: 0,
  };
}
