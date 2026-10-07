export type StudioStatus = 'pending' | 'approved_demo' | 'active_pro' | 'suspended';

export type ThemeMode = 'light' | 'dark' | 'system';

export type PlanType =
  | 'prismal_prime'
  | 'clinical_suite'
  | 'trial_30d'
  | 'demo_free'
  | 'base_monthly'
  | 'pro_monthly'
  | 'premium_monthly'
  | 'base'
  | 'pro'
  | 'premium';

export interface PlanPricing {
  id: PlanType;
  name: string;
  badge: string;
  priceMonthly: number;
  priceAnnualMonthly?: number;
  monthlyBookingsLimit: number; // -1 for unlimited
  monthlySmsLimit: number;
  operatorsLimit: number; // -1 for unlimited
  description: string;
  operators: string;
  features: string[];
  recommended?: boolean;
}

export type PlanFeatureKey =
  | 'onlineBooking'
  | 'otpVerification'
  | 'gdprTracking'
  | 'triageGeneral'
  | 'triageAdvancedAesthetic'
  | 'digitalOdontogram'
  | 'treatmentPlans'
  | 'smartRules'
  | 'pmsIntegrations'
  | 'aiCopilot'
  | 'analyticsDossier'
  | 'prioritySupport';

export interface AddonSlotPackage {
  id: string;
  type: 'appointments' | 'sms';
  name: string;
  quantity: number;
  price: number;
  badge?: string;
  description: string;
}

export interface StudioSubscription {
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'unpaid';
  planId: PlanType;
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: string; // ISO date
  currentPeriodEnd: string; // ISO date
  cancelAtPeriodEnd: boolean;
  paymentMethod?: 'stripe' | 'credit_card' | 'google_pay' | 'paypal' | 'bank_transfer';
  paymentMethodDetails?: {
    brand?: string;
    last4?: string;
    googlePayEmail?: string;
    paypalEmail?: string;
    bankTransferReference?: string;
  };
  monthlyUsedBookings: number;
  extraBookingsPurchased: number;
  monthlyUsedSms: number;
  extraSmsPurchased: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastInvoiceNumber?: string;
}

export interface SuperAdminPaymentConfig {
  bankBeneficiary: string;
  bankIban: string;
  bankSwiftBic: string;
  bankName: string;
  bankPaymentInstructions: string;
  paypalEnabled: boolean;
  paypalMerchantEmail: string;
  paypalClientId?: string;
  paypalPaymentLinkUrl?: string;
  stripeEnabled: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripePaymentLinkUrl?: string;
  stripeConnectAccountId?: string;
  googlePayMerchantId?: string;
  googlePayMerchantName?: string;
  isLiveProductionMode?: boolean;
  fiscalVatNumber: string;
  fiscalCompanyAddress: string;
  fiscalSdiCode: string;
  fiscalTaxRate: number; // 22%
  autoActivateOnPayment: boolean;
  updatedAt?: string;
  sponsorshipWeeklyPrice?: number;
  sponsorshipMonthlyPrice?: number;
  sponsorshipQuarterlyPrice?: number;
}

export interface SponsorshipPackage {
  id: string;
  name: string;
  durationDays: number;
  priceEur: number;
  priceProEur: number;
  priceEnterpriseEur: number;
  tagline: string;
  estimatedImpressionsBoost: string;
  estimatedExtraBookings: string;
  estimatedRevenueBoost: string;
  popular?: boolean;
}

export interface PlatformTransaction {
  id: string;
  invoiceNumber: string;
  studioId: string;
  studioName: string;
  studioEmail: string;
  studioVatOrFiscalCode?: string;
  type: 'trial_verification' | 'subscription_monthly' | 'subscription_annual' | 'addon_slots' | 'addon_sms' | 'sponsorship';
  planId?: PlanType;
  addonId?: string;
  addonDescription?: string;
  sponsorshipPackageId?: string;
  sponsorshipDurationDays?: number;
  amountNet: number;
  amountVat: number;
  amountTotal: number;
  paymentMethod: 'stripe' | 'paypal' | 'bank_transfer' | 'credit_card' | 'google_pay';
  paymentReference: string;
  paymentProofUrl?: string;
  status: 'completed' | 'pending_verification' | 'failed' | 'refunded';
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export type ToothStatus = 'healthy' | 'decay' | 'filled' | 'crown' | 'implant' | 'endodontic' | 'missing';

export interface ToothData {
  status: ToothStatus;
  notes?: string;
  updatedAt?: string;
}

export interface TreatmentPlanItem {
  id: string;
  procedure: string;
  tooth?: number;
  cost: number;
}

export interface TreatmentPlan {
  id: string;
  date: string;
  title: string;
  items: TreatmentPlanItem[];
  discountPct?: number;
  total: number;
  status: 'draft' | 'approved' | 'completed';
  notes?: string;
}

export interface PatientRecord {
  id: string;
  studioId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate?: string;
  fiscalCode?: string;
  address?: string;
  city?: string;
  totalVisits: number;
  firstVisitDate: string;
  lastVisitDate: string;
  pastTreatments: Array<{
    date: string;
    treatment: string;
    notes?: string;
    cost?: string;
  }>;
  clinicalNotes?: string;
  allergies?: string;
  allergiesList?: string[];
  medicalConditions?: string[];
  dentalChart?: Record<number, ToothData>;
  treatmentPlans?: TreatmentPlan[];
  gdprSanitaryConsent?: boolean;
  gdprSanitaryConsentDate?: string;
  gdprConsentTimestamp?: string; // ISO 8601 exact timestamp
  gdprPolicyVersion?: string; // e.g. "v2.4-2026.09"
  gdprConsentChannel?: 'online_booking' | 'desk_intake' | 'digital_kiosk';
  gdprConsentPurposes?: string[];
  gdprConsentProof?: {
    version: string;
    timestamp: string;
    channel: 'online_booking' | 'desk_intake' | 'digital_kiosk';
    purposes: string[];
    userAgent?: string;
  };
  consentHistory?: Array<{
    version: string;
    timestamp: string;
    action: 'granted' | 'revoked' | 'updated';
    channel: string;
    notes?: string;
  }>;
  clinicalInformedConsent?: boolean;
  clinicalInformedConsentDate?: string;
  tesseraSanitariaOpposizione?: boolean;
  recallConsent?: boolean;
  nextRecallDate?: string;
  recallIntervalMonths?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface VisitReason {
  id: string;
  name: string;
  durationMinutes: number;
  description: string;
  category: 'routine' | 'hygiene' | 'emergency' | 'specialist';
  priceEstimate?: string;
  iconName: string;
}

export interface DayAvailability {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  isOpen: boolean;
  morningStart: string; // e.g. "09:00"
  morningEnd: string;   // e.g. "13:00"
  afternoonStart: string; // e.g. "14:30"
  afternoonEnd: string;   // e.g. "19:00"
}

export interface BlockedSlot {
  id: string;
  studioId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string; // e.g. "10:30" (if single slot)
  isAllDay: boolean; // if true, blocks the entire day (ferie, festività, chiusura)
  reasonType: 'ferie' | 'festivita' | 'manutenzione' | 'pausa_personale' | 'chiusura_straordinaria' | 'altro';
  reasonLabel: string;
  createdAt: string;
}

export type IntegrationCategory = 'dental_pms' | 'calendar' | 'messaging' | 'billing' | 'webhook';

export interface SoftwareConnector {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  logoBadge: string;
  badgeColor: string;
  popular?: boolean;
  status: 'disconnected' | 'connected' | 'syncing' | 'error';
  lastSync?: string;
  config: {
    apiUrl?: string;
    apiKey?: string;
    studioIdentifier?: string;
    syncIntervalMinutes?: number;
    bidirectional?: boolean;
    autoExportPatients?: boolean;
    autoSyncCalendar?: boolean;
    webhookSecret?: string;
    [key: string]: any;
  };
}

export interface SmartBookingRules {
  enabled: boolean;
  minNoticeHours: number; // e.g. 2 hours: minimum advance booking notice window
  maxAdvanceDays: number; // e.g. 60 days: maximum booking horizon into the future
  bufferTimeMinutes: number; // e.g. 10 minutes: sanitation & chair prep cushion between visits
  emergencySlotsReservedPerDay: number; // e.g. 1 slot: reserve daily emergency capacity for acute toothache
  maxActiveBookingsPerPatient: number; // e.g. 1 active pending booking to prevent multi-booking spam/no-shows
  autoConfirmExistingPatients: boolean; // instant confirmation for verified return patients
  requireApprovalForNewPatients: boolean; // manual verification required for first-time patients
  allowSameDayBookings: boolean; // whether same day appointments are permitted
  smartWaitlistEnabled?: boolean; // automatic notification/reassignment when an appointment is cancelled
  categoryDynamicBuffers?: boolean; // dynamically adjust buffer time for complex specialist visits
  lunchBreakProtection?: boolean; // automatically shield noon sanitization and staff shift transition
  noShowProtectionStrict?: boolean; // automatically block repeat no-show contact profiles
}

export interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  password?: string;
  isEmailVerified: boolean;
  logoUrl: string;
  phone: string;
  address: string;
  city: string;
  websiteUrl?: string;
  twoFactorEnabled?: boolean;
  smsSenderId?: string;
  integrations?: SoftwareConnector[];
  status: StudioStatus;
  plan: PlanType;
  demoSlotsTotal: number;
  demoSlotsRemaining: number;
  createdAt: string;
  approvedAt?: string;
  slotDurationMinutes: number;
  weeklyAvailability: DayAvailability[];
  visitReasons: VisitReason[];
  smartBookingRules?: SmartBookingRules;
  isSponsored?: boolean;
  sponsoredUntil?: string;
  sponsoredPlanId?: string;
  rating?: number;
  reviewsCount?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
  specialties?: string[];
  nextAvailableSlot?: string;
  smsSettings?: {
    enabled: boolean;
    provider: 'prismal_managed' | 'custom_twilio' | 'skebby';
    monthlyQuota: number;
    quotaUsed: number;
    senderAlias: string;
    customSid?: string;
    customToken?: string;
    customFrom?: string;
    autoReminders24h: boolean;
    autoConfirmationSms: boolean;
    autoCancellationSms: boolean;
  };
  subscription?: StudioSubscription;
}

export interface DentalChair {
  id: string;
  name: string;
  department: string;
  defaultOperator: string;
  color: 'purple' | 'sky' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'teal' | 'slate';
  isActive: boolean;
  notes?: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  code: string;
  studioId: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  patientEmail: string;
  visitReasonId: string;
  visitReasonName: string;
  durationMinutes?: number;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:30"
  endTimeSlot?: string; // e.g. "11:15"
  chairId?: string;
  chairName?: string;
  operatorName?: string;
  department?: string;
  color?: string;
  notes?: string;
  status: AppointmentStatus;
  isUrgent?: boolean;
  gdprConsent: boolean;
  gdprConsentTimestamp: string;
  gdprPolicyVersion?: string; // e.g. "v2.4-2026.09"
  gdprConsentPurposes?: string[];
  gdprConsentChannel?: 'online_booking' | 'desk_intake' | 'digital_kiosk';
  gdprConsentIp?: string;
  gdprConsentUserAgent?: string;
  managementToken: string;
  createdAt: string;
  reminder24hSent?: boolean;
  reminder24hSentAt?: string;
  reminder1hSent?: boolean;
  reminder1hSentAt?: string;
}

export interface EmailNotification {
  id: string;
  studioId: string;
  appointmentId: string;
  recipientType: 'patient' | 'studio';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  sentAt: string;
  managementToken?: string;
  status: 'delivered' | 'read';
  appointmentDetails: {
    code: string;
    patientName: string;
    patientPhone: string;
    patientEmail: string;
    studioName: string;
    studioAddress: string;
    studioCity?: string;
    mapsUrl?: string;
    studioPhone: string;
    date: string;
    timeSlot: string;
    visitReasonName: string;
    notes?: string;
    isUrgent?: boolean;
  };
}

export type EmailLogType = 'auth_otp' | 'booking_confirmation' | 'contact_lead' | 'studio_approval' | 'system_test' | 'sms_confirmation' | 'reminder_24h' | 'reminder_1h';
export type EmailDeliveryStatus = 'delivered' | 'failed' | 'simulated';

export interface EmailLogEntry {
  id: string;
  type: EmailLogType;
  recipient: string;
  recipientName?: string;
  sender: string;
  subject: string;
  snippet?: string;
  htmlContent?: string;
  status: EmailDeliveryStatus;
  error?: string | null;
  timestamp: string;
  meta?: {
    code?: string;
    studioName?: string;
    appointmentCode?: string;
    phone?: string;
    [key: string]: any;
  };
}

export type AppRole = 'landing' | 'super_admin' | 'studio_admin' | 'patient';

export interface AuthSession {
  role: 'super_admin' | 'studio_admin' | 'patient';
  email: string;
  studioId?: string;
  studioName?: string;
  patientName?: string;
}

export interface AuthState {
  currentRole: AppRole;
  currentStudioId: string | null;
  patientViewingSlug: string | null;
  onboardingStep: 'login' | 'verify_email' | 'profile_setup' | 'completed';
  registrationDraftEmail: string;
}

export interface SearchLogEntry {
  id: string;
  query: string;
  location?: string;
  resultsCount: number;
  timestamp: string;
}

export interface SearchAnalyticsSummary {
  totalSearches: number;
  popularKeywords: { term: string; count: number }[];
  popularCities: { city: string; count: number }[];
  recentSearches: SearchLogEntry[];
}

