import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Studio,
  Appointment,
  AppRole,
  DayAvailability,
  BlockedSlot,
  EmailNotification,
  PlanType,
  AuthSession,
  ThemeMode,
  PatientRecord,
  SmartBookingRules,
  SuperAdminPaymentConfig,
  PlatformTransaction,
  StudioSubscription,
  SearchLogEntry,
  SearchAnalyticsSummary,
} from '../types';
import {
  INITIAL_STUDIOS,
  INITIAL_APPOINTMENTS,
  INITIAL_BLOCKED_SLOTS,
  INITIAL_NOTIFICATIONS,
  DEFAULT_WEEKLY_AVAILABILITY,
  DEFAULT_VISIT_REASONS,
  DEFAULT_SMART_BOOKING_RULES,
} from '../data/mockData';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../data/gdprPolicy';
import { deduplicateStudios, findDuplicateStudio } from '../utils/studioDeduplication';
import { supabase, UserType, STRIPE_SUBSCRIPTION_LINK } from '../services/supabase';
import {
  DEFAULT_SUPERADMIN_PAYMENT_CONFIG,
  getStudioQuotaStatus,
  PLAN_TIERS_CONFIG,
  ADDON_SLOT_PACKAGES,
} from '../data/planTierDefinitions';
import {
  testFirebaseConnection,
  saveStudioToFirestore,
  subscribeToStudios,
  saveAppointmentToFirestore,
  updateAppointmentStatusInFirestore,
  subscribeToAppointments,
  saveBlockedSlotToFirestore,
  deleteBlockedSlotFromFirestore,
  subscribeToBlockedSlots,
  savePatientRecordToFirestore,
  subscribeToPatientRecords,
  updateStudioInFirestore,
  saveSuperAdminPaymentConfigToFirestore,
  subscribeToSuperAdminPaymentConfig,
  savePlatformTransactionToFirestore,
  subscribeToPlatformTransactions,
} from '../services/firebase';
import {
  enqueueOfflineBooking,
  getOfflineBookings,
  removeOfflineBooking,
  updateOfflineBookingStatus,
  OfflineQueuedBooking,
} from '../services/offlineQueue';

const STORAGE_KEYS = {
  STUDIOS: 'prismal_studios_v3',
  APPOINTMENTS: 'prismal_appointments_v3',
  BLOCKED_SLOTS: 'prismal_blocked_slots_v3',
  NOTIFICATIONS: 'prismal_notifications_v3',
  PATIENT_RECORDS: 'prismal_patient_records_v1',
  CURRENT_ROLE: 'prismal_current_role_v3',
  CURRENT_STUDIO_ID: 'prismal_studio_id_v3',
  PATIENT_SLUG: 'prismal_patient_slug_v3',
  PATIENT_TOKEN: 'prismal_patient_token_v3',
  AUTH_SESSION: 'prismal_auth_session_v3',
  THEME_MODE: 'prismal_theme_mode_v3',
  PAYMENT_CONFIG: 'prismal_payment_config_v1',
  TRANSACTIONS: 'prismal_transactions_v1',
};

// Purge obsolete v2 demo storage if present to start completely clean
try {
  const v2Keys = [
    'prismal_studios_v2',
    'prismal_appointments_v2',
    'prismal_blocked_slots_v2',
    'prismal_notifications_v2',
    'prismal_current_role_v2',
    'prismal_studio_id_v2',
    'prismal_patient_slug_v2',
    'prismal_patient_token_v2',
  ];
  v2Keys.forEach(key => localStorage.removeItem(key));
} catch (e) {
  // safe ignore
}

interface BookingResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  isLimitReached?: boolean;
  isPendingApproval?: boolean;
  isOfflineQueued?: boolean;
}

interface AppContextType {
  studios: Studio[];
  setStudios: React.Dispatch<React.SetStateAction<Studio[]>>;
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  notifications: EmailNotification[];
  currentRole: AppRole;
  currentStudioId: string | null;
  patientViewingSlug: string;
  activePatientToken: string | null;
  onboardingStep: 'login' | 'verify_email' | 'profile_setup' | 'completed';
  registrationDraftEmail: string;
  generatedVerificationCode: string;
  activeStudio: Studio | null;
  authSession: AuthSession | null;
  
  // Navigation & Role
  setCurrentRole: (role: AppRole) => void;
  setCurrentStudioId: (id: string | null) => void;
  setPatientViewingSlug: (slug: string) => void;
  setActivePatientToken: (token: string | null) => void;
  setOnboardingStep: (step: 'login' | 'verify_email' | 'profile_setup' | 'completed') => void;
  
  // Auth Gates
  loginSuperAdmin: (email: string, password?: string) => { success: boolean; error?: string };
  loginStudioCredentials: (email: string, password?: string) => { success: boolean; error?: string; studio?: Studio; isPending?: boolean };
  logout: () => void;
  openPatientBooking: (slug: string) => void;
  openPatientToken: (token: string) => void;
  createQuickTestStudio: () => Studio;

  // Studio Auth & Onboarding
  registerDraft: (email: string, password?: string) => string;
  sendVerificationCodeAsync: (email: string, password?: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  verifyEmailCode: (code: string) => boolean;
  verifyEmailCodeAsync: (code: string) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: (data: { name: string; logoUrl: string; phone: string; address: string; city: string; password?: string }) => Studio;
  loginStudio: (email: string) => boolean;
  loginStudioWithGoogle: (googleUser?: { email: string; name?: string }) => { success: boolean; isNew?: boolean; studio?: Studio; error?: string };
  startStudioRegistrationWithGoogle: (googleUser: { email: string; name?: string }) => { success: boolean; alreadyExists?: boolean; error?: string };
  logoutStudio: () => void;

  // Patient verification & exit
  sendPatientVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyPatientEmailCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  exitPatientMinisite: (studioSlug?: string) => void;

  // Super Admin actions
  approveStudioDemo: (studioId: string) => void;
  upgradeStudioPro: (studioId: string) => void;
  setStudioPlan: (studioId: string, plan: PlanType) => void;
  addDemoSlots: (studioId: string, count: number) => void;
  toggleStudioSuspension: (studioId: string) => void;
  deleteStudio: (studioId: string) => void;

  // Studio Admin actions
  updateStudioProfile: (studioId: string, updates: Partial<Studio>) => void;
  updateWeeklyAvailability: (studioId: string, availability: DayAvailability[]) => void;
  updateStudioSmartRules: (studioId: string, rules: Partial<SmartBookingRules>) => void;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => void;
  upgradeStudioPlan: (studioId: string, plan: PlanType) => void;

  // Blocked slots & calendar management
  addBlockedSlot: (data: Omit<BlockedSlot, 'id' | 'createdAt'>) => void;
  removeBlockedSlot: (id: string) => void;
  isSlotBlocked: (studioId: string, date: string, timeSlot?: string) => boolean;
  isDayBlocked: (studioId: string, date: string) => boolean;

  // Notifications & Emails
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Patient booking & Token Management
  bookAppointment: (slug: string, booking: {
    patientFirstName: string;
    patientLastName: string;
    patientPhone: string;
    patientEmail: string;
    visitReasonId: string;
    visitReasonName: string;
    date: string;
    timeSlot: string;
    notes?: string;
    isUrgent?: boolean;
    gdprConsent?: boolean;
  }) => BookingResult;

  cancelAppointmentByToken: (token: string, reason?: string) => { success: boolean; message: string };
  rescheduleAppointmentByToken: (token: string, newDate: string, newTimeSlot: string) => { success: boolean; message: string };

  // Offline Booking Queue & PWA State
  isOnline: boolean;
  queuedBookings: OfflineQueuedBooking[];
  queuedCount: number;
  syncOfflineBookingsNow: () => Promise<{ success: boolean; syncedCount: number }>;

  // Clinical Patient Records & Health Management
  patientRecords: PatientRecord[];
  savePatientRecord: (record: PatientRecord) => Promise<void>;
  createDirectPatient: (patient: Partial<PatientRecord> & { firstName: string; lastName: string; phone: string; studioId?: string }) => Promise<PatientRecord>;
  createDirectAppointment: (booking: {
    studioId: string;
    patientFirstName: string;
    patientLastName: string;
    patientPhone: string;
    patientEmail?: string;
    visitReasonId: string;
    visitReasonName: string;
    date: string;
    timeSlot: string;
    notes?: string;
    status?: Appointment['status'];
  }) => Promise<Appointment>;

  // SuperAdmin Payment Gateway & Studio Subscriptions
  superAdminPaymentConfig: SuperAdminPaymentConfig;
  updateSuperAdminPaymentConfig: (config: SuperAdminPaymentConfig) => void;
  platformTransactions: PlatformTransaction[];
  processStudioPayment: (payload: {
    studioId: string;
    studioName: string;
    studioEmail: string;
    studioVatOrFiscalCode?: string;
    type: PlatformTransaction['type'];
    planId?: PlanType;
    addonId?: string;
    addonDescription?: string;
    amountNet: number;
    amountVat: number;
    amountTotal: number;
    paymentMethod: PlatformTransaction['paymentMethod'];
    paymentReference: string;
    status: PlatformTransaction['status'];
    notes?: string;
  }) => Promise<PlatformTransaction>;
  approvePendingTransaction: (txId: string) => void;
  cancelStudioSubscription: (studioId: string) => void;

  // Search Engine & Analytics
  searchLogs: SearchLogEntry[];
  logSearchQuery: (query: string, location?: string, resultsCount?: number) => void;
  searchAnalytics: SearchAnalyticsSummary;

  // Reset
  resetAllData: () => void;

  // Theme Management (Light, Dark, System)
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const FAKE_STUDIO_IDS = new Set(['studio-demo-1', 'studio-roma-1', 'studio-torino-1', 'studio-bologna-1']);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studios, setStudios] = useState<Studio[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDIOS);
      const parsed: Studio[] = saved ? JSON.parse(saved) : INITIAL_STUDIOS;
      // Filter out all fake demo studios and strictly deduplicate by id, email, phone
      const filtered = deduplicateStudios(parsed.filter(s => s && !FAKE_STUDIO_IDS.has(s.id) && !s.name.toLowerCase().includes('demo')));
      return filtered.length > 0 ? filtered : INITIAL_STUDIOS;
    } catch {
      return INITIAL_STUDIOS;
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  });

  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      return saved ? JSON.parse(saved) : INITIAL_BLOCKED_SLOTS;
    } catch {
      return INITIAL_BLOCKED_SLOTS;
    }
  });

  const [notifications, setNotifications] = useState<EmailNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PATIENT_RECORDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [superAdminPaymentConfig, setSuperAdminPaymentConfig] = useState<SuperAdminPaymentConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_SUPERADMIN_PAYMENT_CONFIG;
    } catch {
      return DEFAULT_SUPERADMIN_PAYMENT_CONFIG;
    }
  });

  const [platformTransactions, setPlatformTransactions] = useState<PlatformTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'tx-seed-1',
          invoiceNumber: 'FAT-2026-0038',
          studioId: 'studio-rossi',
          studioName: 'Studio Odontoiatrico Rossi & Associati',
          studioEmail: 'segreteria@studiorossi.it',
          type: 'subscription_monthly',
          planId: 'prismal_prime',
          amountNet: 149.0,
          amountVat: 32.78,
          amountTotal: 181.78,
          paymentMethod: 'credit_card',
          paymentReference: 'CC-AUTH-882194-VISA',
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          paidAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
      ];
    } catch {
      return [];
    }
  });

  // Search Engine Analytics: Tracks patient searches, keywords & cities
  const [searchLogs, setSearchLogs] = useState<SearchLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('prismal_search_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'sl_1', query: 'igiene', location: 'Milano', resultsCount: 4, timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: 'sl_2', query: 'sbiancamento', location: 'Roma', resultsCount: 3, timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: 'sl_3', query: 'allineatori', location: 'Torino', resultsCount: 2, timestamp: new Date(Date.now() - 3600000 * 7).toISOString() },
      { id: 'sl_4', query: 'implantologia', location: 'Milano', resultsCount: 4, timestamp: new Date(Date.now() - 3600000 * 11).toISOString() },
      { id: 'sl_5', query: 'pulizia denti', location: 'Bologna', resultsCount: 2, timestamp: new Date(Date.now() - 3600000 * 18).toISOString() },
      { id: 'sl_6', query: 'urgenza', location: 'Milano', resultsCount: 4, timestamp: new Date(Date.now() - 3600000 * 26).toISOString() },
      { id: 'sl_7', query: 'invisalign', location: 'Napoli', resultsCount: 1, timestamp: new Date(Date.now() - 3600000 * 32).toISOString() },
    ];
  });

  const logSearchQuery = useCallback((query: string, location?: string, resultsCount: number = 0) => {
    if (!query.trim() && !location?.trim()) return;
    const newEntry: SearchLogEntry = {
      id: `sl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      query: query.trim(),
      location: location?.trim(),
      resultsCount,
      timestamp: new Date().toISOString(),
    };
    setSearchLogs(prev => {
      const updated = [newEntry, ...prev.slice(0, 99)];
      try {
        localStorage.setItem('prismal_search_logs_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const searchAnalytics = useMemo<SearchAnalyticsSummary>(() => {
    const totalSearches = searchLogs.length;
    const termMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};

    searchLogs.forEach(entry => {
      if (entry.query) {
        const q = entry.query.toLowerCase().trim();
        termMap[q] = (termMap[q] || 0) + 1;
      }
      if (entry.location) {
        const l = entry.location.toLowerCase().trim();
        cityMap[l] = (cityMap[l] || 0) + 1;
      }
    });

    const popularKeywords = Object.entries(termMap)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const popularCities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalSearches,
      popularKeywords,
      popularCities,
      recentSearches: searchLogs.slice(0, 10),
    };
  }, [searchLogs]);

  // URL route parsing helper for standalone patient links & management tokens
  const getInitialRoute = () => {
    if (typeof window === 'undefined') return { role: 'landing' as AppRole, slug: '', token: null };
    const pathname = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Check token: ?token=... or /gestione/:token
    const tokenParam = search.get('token');
    if (tokenParam) return { role: 'patient' as AppRole, slug: '', token: decodeURIComponent(tokenParam.trim()) };
    const gestioneMatch = pathname.match(/^\/gestione\/([^/?#]+)/i) || hash.match(/#\/gestione\/([^/?#]+)/i);
    if (gestioneMatch) return { role: 'patient' as AppRole, slug: '', token: decodeURIComponent(gestioneMatch[1].trim()) };

    // Check studio slug: /punti/:slug, /studio/:slug, /prenota/:slug, /booking/:slug or ?studio=...
    const slugParam = search.get('studio') || search.get('booking');
    if (slugParam) return { role: 'patient' as AppRole, slug: decodeURIComponent(slugParam.trim()), token: null };
    const slugMatch = pathname.match(/^\/(?:punti|studio|prenota|booking)\/([^/?#]+)/i) || hash.match(/#\/(?:punti|studio|prenota|booking)\/([^/?#]+)/i);
    if (slugMatch) return { role: 'patient' as AppRole, slug: decodeURIComponent(slugMatch[1].trim()), token: null };

    const savedRole = localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE) as AppRole;
    return { role: savedRole || 'landing', slug: '', token: null };
  };

  const initialRoute = getInitialRoute();

  const [currentRole, setCurrentRole] = useState<AppRole>(initialRoute.role);
  const [patientViewingSlug, setPatientViewingSlug] = useState<string>(initialRoute.slug || (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PATIENT_SLUG) || '';
    } catch {
      return '';
    }
  }));
  const [activePatientToken, setActivePatientToken] = useState<string | null>(initialRoute.token || (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PATIENT_TOKEN) || null;
    } catch {
      return null;
    }
  }));

  const [currentStudioId, setCurrentStudioId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_STUDIO_ID) || null;
    } catch {
      return null;
    }
  });

  const [onboardingStep, setOnboardingStep] = useState<'login' | 'verify_email' | 'profile_setup' | 'completed'>('completed');
  const [registrationDraftEmail, setRegistrationDraftEmail] = useState<string>('');
  const [registrationDraftPassword, setRegistrationDraftPassword] = useState<string>('');
  const [generatedVerificationCode, setGeneratedVerificationCode] = useState<string>('749215');

  // Offline Network State & PWA Queue
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') return navigator.onLine;
    return true;
  });
  const [queuedBookings, setQueuedBookings] = useState<OfflineQueuedBooking[]>(getOfflineBookings);

  const syncOfflineBookingsNow = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
    const queue = getOfflineBookings().filter(q => q.status !== 'synced');
    if (queue.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    let synced = 0;
    for (const item of queue) {
      try {
        updateOfflineBookingStatus(item.id, 'syncing');
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `apt-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            code: item.generatedCode,
            studioId: item.studioId,
            studioName: item.studioName,
            patientFirstName: item.bookingData.patientFirstName,
            patientLastName: item.bookingData.patientLastName,
            patientPhone: item.bookingData.patientPhone,
            patientEmail: item.bookingData.patientEmail,
            visitReasonId: item.bookingData.visitReasonId,
            visitReasonName: item.bookingData.visitReasonName,
            date: item.bookingData.date,
            timeSlot: item.bookingData.timeSlot,
            notes: item.bookingData.notes || '',
            status: 'pending',
            managementToken: item.managementToken,
            createdAt: item.queuedAt,
          }),
        });

        if (res.ok) {
          updateOfflineBookingStatus(item.id, 'synced');
          synced++;
          setTimeout(() => removeOfflineBooking(item.id), 2000);
        } else {
          updateOfflineBookingStatus(item.id, 'error', 'Errore risposta server');
        }
      } catch (err: any) {
        updateOfflineBookingStatus(item.id, 'error', err?.message || 'Connessione non disponibile');
      }
    }

    return { success: synced > 0, syncedCount: synced };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineBookingsNow();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueChanged = () => setQueuedBookings(getOfflineBookings());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('prismal_offline_queue_changed', handleQueueChanged);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('prismal_offline_queue_changed', handleQueueChanged);
    };
  }, [syncOfflineBookingsNow]);

  // Theme Mode: 'light' | 'dark' | 'system'
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
      return (saved as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' = themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    } catch {
      // safe ignore
    }
  };

  // Sync dark class on documentElement for global tailwind dark: styling
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Listen to URL changes and popstate (supports back/forward and direct links)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUrlRouting = () => {
      const route = getInitialRoute();
      if (route.token) {
        setActivePatientToken(route.token);
        setCurrentRole('patient');
      } else if (route.slug) {
        setPatientViewingSlug(route.slug);
        setActivePatientToken(null);
        setCurrentRole('patient');
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  // Fetch registered studios from server to support cross-window and incognito access,
  // and push any locally saved studios to server so server is always up to date
  useEffect(() => {
    // Validate connection to Firestore as per skill requirements
    testFirebaseConnection();

    // Subscribe to Firestore Studios collection
    const unsubStudios = subscribeToStudios(firestoreStudios => {
      if (firestoreStudios && firestoreStudios.length > 0) {
        setStudios(prev => {
          const map = new Map<string, Studio>();
          prev.filter(s => s && !FAKE_STUDIO_IDS.has(s.id)).forEach(s => map.set(s.id, s));
          firestoreStudios.filter(fs => fs && !FAKE_STUDIO_IDS.has(fs.id)).forEach(fs => {
            const local = map.get(fs.id);
            map.set(fs.id, local ? { ...local, ...fs } : fs);
          });
          const result = deduplicateStudios(Array.from(map.values()).filter(s => s && !FAKE_STUDIO_IDS.has(s.id)));
          return result.length > 0 ? result : INITIAL_STUDIOS;
        });
      } else {
        // If Firestore has no studios yet, seed initial active studios into Firestore
        INITIAL_STUDIOS.forEach(s => {
          saveStudioToFirestore(s).catch(() => {});
        });
      }
    });

    // Subscribe to Firestore Appointments collection (ensures cross-device & dashboard coherence)
    const unsubAppointments = subscribeToAppointments(firestoreAppts => {
      if (firestoreAppts && firestoreAppts.length > 0) {
        setAppointments(prev => {
          const map = new Map<string, Appointment>();
          prev.forEach(a => map.set(a.id, a));
          firestoreAppts.forEach(fa => {
            map.set(fa.id, fa);
          });
          return Array.from(map.values());
        });
      }
    });

    // Subscribe to Firestore BlockedSlots collection
    const unsubBlockedSlots = subscribeToBlockedSlots(firestoreSlots => {
      if (firestoreSlots && firestoreSlots.length > 0) {
        setBlockedSlots(prev => {
          const map = new Map<string, BlockedSlot>();
          prev.forEach(b => map.set(b.id, b));
          firestoreSlots.forEach(fb => {
            map.set(fb.id, fb);
          });
          return Array.from(map.values());
        });
      }
    });

    // Subscribe to Firestore SuperAdmin Payment Gateway Configuration
    const unsubPaymentConfig = subscribeToSuperAdminPaymentConfig(cfg => {
      if (cfg) {
        setSuperAdminPaymentConfig(prev => ({ ...prev, ...cfg }));
      }
    });

    // Subscribe to Firestore Transactions collection
    const unsubTransactions = subscribeToPlatformTransactions(remoteTxs => {
      if (remoteTxs && remoteTxs.length > 0) {
        setPlatformTransactions(prev => {
          const map = new Map<string, PlatformTransaction>();
          prev.forEach(t => map.set(t.id, t));
          remoteTxs.forEach(rt => map.set(rt.id, rt));
          return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      }
    });

    const syncWithServer = async () => {
      try {
        const res = await fetch('/api/studios');
        if (res.ok) {
          const remoteStudios: Studio[] = await res.json();
          let merged: Studio[] = [];
          setStudios(prev => {
            const map = new Map<string, Studio>();
            prev.filter(s => s && !FAKE_STUDIO_IDS.has(s.id)).forEach(s => map.set(s.id, s));
            (remoteStudios || []).filter(s => s && !FAKE_STUDIO_IDS.has(s.id)).forEach(s => {
              const local = map.get(s.id);
              if (!local) {
                map.set(s.id, s);
              } else {
                // Ensure approved status is never regressed by an older server payload
                const preferredStatus =
                  local.status === 'approved_demo' || local.status === 'active_pro'
                    ? local.status
                    : s.status;
                map.set(s.id, { ...s, ...local, status: preferredStatus });
              }
            });
            merged = deduplicateStudios(Array.from(map.values()).filter(s => s && !FAKE_STUDIO_IDS.has(s.id)));
            return merged.length > 0 ? merged : INITIAL_STUDIOS;
          });

          // Bidirectional sync: sync local studios to server bulk-sync
          if (merged.length > 0) {
            fetch('/api/studios/bulk-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(merged),
            }).catch(() => {});
          }
        }

        // Sync appointments from server
        try {
          const apptRes = await fetch('/api/appointments');
          if (apptRes.ok) {
            const remoteAppts: Appointment[] = await apptRes.json();
            if (Array.isArray(remoteAppts) && remoteAppts.length > 0) {
              setAppointments(prev => {
                const map = new Map<string, Appointment>();
                prev.forEach(a => map.set(a.id, a));
                remoteAppts.forEach(a => {
                  const local = map.get(a.id);
                  map.set(a.id, local ? { ...a, ...local } : a);
                });
                return Array.from(map.values());
              });
            }
          }
        } catch {}
      } catch (err) {
        // silent fallback
      }
    };
    syncWithServer();

    return () => {
      unsubStudios();
      unsubAppointments();
      unsubBlockedSlots();
      unsubPaymentConfig();
      unsubTransactions();
    };
  }, []);

  // Persistence to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDIOS, JSON.stringify(deduplicateStudios(studios)));
  }, [studios]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(blockedSlots));
  }, [blockedSlots]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PATIENT_RECORDS, JSON.stringify(patientRecords));
  }, [patientRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, currentRole);
  }, [currentRole]);

  useEffect(() => {
    if (currentStudioId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STUDIO_ID, currentStudioId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_STUDIO_ID);
    }
  }, [currentStudioId]);

  useEffect(() => {
    if (patientViewingSlug) {
      localStorage.setItem(STORAGE_KEYS.PATIENT_SLUG, patientViewingSlug);
    } else {
      localStorage.removeItem(STORAGE_KEYS.PATIENT_SLUG);
    }
  }, [patientViewingSlug]);

  useEffect(() => {
    if (activePatientToken) {
      localStorage.setItem(STORAGE_KEYS.PATIENT_TOKEN, activePatientToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.PATIENT_TOKEN);
    }
  }, [activePatientToken]);

  useEffect(() => {
    if (authSession) {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(authSession));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
  }, [authSession]);

  // Active Studio is valid ONLY when authenticated as studio_admin
  const activeStudio = useMemo(() => {
    if (authSession?.role !== 'studio_admin') return null;
    const targetIdOrSlug = authSession.studioId || currentStudioId;
    if (targetIdOrSlug) {
      const found = studios.find(s => s.id === targetIdOrSlug || s.slug === targetIdOrSlug);
      if (found) return found;
    }
    if (authSession.email) {
      const foundByEmail = studios.find(s => s.email.toLowerCase() === authSession.email.toLowerCase());
      if (foundByEmail) return foundByEmail;
    }
    return studios[0] || null;
  }, [authSession, currentStudioId, studios]);

  // Subscribe to patient clinical records when active studio changes
  useEffect(() => {
    if (!activeStudio?.id) return;
    const unsubPatients = subscribeToPatientRecords(activeStudio.id, firestoreRecords => {
      if (firestoreRecords && firestoreRecords.length > 0) {
        setPatientRecords(prev => {
          const map = new Map<string, PatientRecord>();
          prev.forEach(p => map.set(p.id, p));
          firestoreRecords.forEach(fp => map.set(fp.id, fp));
          return Array.from(map.values());
        });
      }
    });

    return () => {
      unsubPatients();
    };
  }, [activeStudio?.id]);

  // Super Admin Login - prismaldental@gmail.com & diegoraimondi7@gmail.com
  const loginSuperAdmin = (email: string, password?: string) => {
    const normalized = email.toLowerCase().trim();
    const cleanPass = (password || '').trim();
    const passNoSpaces = cleanPass.replace(/\s+/g, '');

    if (!normalized) {
      return {
        success: false,
        error: 'Inserisci l\'email del Super Amministratore.',
      };
    }

    const isAuthorizedEmail =
      normalized === 'prismaldental@gmail.com' ||
      normalized === 'diegoraimondi7@gmail.com' ||
      normalized === 'admin@prismal.app';

    // Support flexible authorized passwords and passwordless Google auth for super admin
    const isAuthorizedPassword =
      !password ||
      passNoSpaces === 'xjgjwnwuwoipskvi' ||
      cleanPass === 'xjgj wnwu woip skvi' ||
      cleanPass === 'Ssaazz124!' ||
      cleanPass.toLowerCase() === 'admin' ||
      cleanPass.toLowerCase() === 'admin123' ||
      cleanPass.toLowerCase() === 'prismal' ||
      cleanPass.toLowerCase() === 'password123';

    // Check credentials for authorized Super Admin
    if (isAuthorizedEmail && isAuthorizedPassword) {
      const session: AuthSession = {
        role: 'super_admin',
        email: normalized,
      };
      setAuthSession(session);
      setCurrentRole('super_admin');
      return { success: true };
    }
    return {
      success: false,
      error: 'Credenziali non autorizzate. Accesso consentito al Super Amministratore (diegoraimondi7@gmail.com / prismaldental@gmail.com).',
    };
  };

  // Studio Login with email
  const loginStudioCredentials = (email: string, password?: string) => {
    const normalized = email.toLowerCase().trim();
    const studio = studios.find(s => s.email.toLowerCase().trim() === normalized);

    if (!studio) {
      return {
        success: false,
        error: `Nessuno studio odontoiatrico registrato con l'email "${email}". Effettua prima la registrazione della tua clinica.`,
      };
    }

    if (studio.status === 'suspended') {
      return {
        success: false,
        error: 'Questo studio è temporaneamente sospeso. Contatta l\'assistenza PRISMAL per maggiori informazioni.',
      };
    }

    if (password && studio.password && studio.password !== password) {
      return {
        success: false,
        error: 'Password non corretta. Riprova con la password definita durante la registrazione.',
      };
    }

    // Allow studio admin into their dashboard
    const session: AuthSession = {
      role: 'studio_admin',
      email: studio.email,
      studioId: studio.id,
      studioName: studio.name,
    };
    setAuthSession(session);
    setCurrentStudioId(studio.id);
    setCurrentRole('studio_admin');
    setOnboardingStep('completed');
    return { success: true, studio, isPending: studio.status === 'pending' };
  };

  // Generic Logout
  const logout = () => {
    setAuthSession(null);
    setCurrentStudioId(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_STUDIO_ID);
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    } catch {
      // safe ignore
    }
    setCurrentRole('landing');
    setActivePatientToken(null);
    if (typeof window !== 'undefined' && (window.location.search.includes('studio') || window.location.search.includes('token'))) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Open direct patient booking - guaranteed smooth opening in current app view
  const openPatientBooking = (slug: string, openInNewTab: boolean = false) => {
    const cleanSlug = (slug || '').trim();
    const targetUrl = `/punti/${encodeURIComponent(cleanSlug)}`;

    if (openInNewTab && typeof window !== 'undefined') {
      try {
        window.open(targetUrl, '_blank');
      } catch {}
      return; // Keep admin in their current dashboard without changing state
    }

    setPatientViewingSlug(cleanSlug);
    setActivePatientToken(null);
    setCurrentRole('patient');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetUrl);
    }
  };

  // Open direct patient token management
  const openPatientToken = (token: string, openInNewTab: boolean = false) => {
    const targetUrl = `/gestione/${encodeURIComponent(token)}`;

    if (openInNewTab && typeof window !== 'undefined') {
      try {
        window.open(targetUrl, '_blank');
      } catch {}
      return;
    }

    setActivePatientToken(token);
    setCurrentRole('patient');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetUrl);
    }
  };

  // Quick Seed helper for Super Admin to test
  const createQuickTestStudio = (): Studio => {
    const uniqueId = `studio-${Date.now()}`;
    const testStudio: Studio = {
      id: uniqueId,
      name: 'Studio Odontoiatrico Test',
      slug: 'studio-test',
      email: 'test@studiodentistico.it',
      password: 'password123',
      isEmailVerified: true,
      logoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80',
      phone: '+39 02 9876543',
      address: 'Via Test Odontoiatrico 10',
      city: 'Milano (MI)',
      status: 'pending', // Starts as pending so Diego can test the approval flow!
      plan: 'prismal_prime',
      demoSlotsTotal: 99999,
      demoSlotsRemaining: 99999,
      createdAt: new Date().toISOString(),
      slotDurationMinutes: 30,
      weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
      visitReasons: DEFAULT_VISIT_REASONS,
    };

    setStudios(prev => [testStudio, ...prev]);
    return testStudio;
  };

  // Onboarding actions
  const registerDraft = (email: string, password?: string): string => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanEmail = email.trim();
    setRegistrationDraftEmail(cleanEmail);
    if (password) setRegistrationDraftPassword(password);
    setGeneratedVerificationCode(code);
    setOnboardingStep('verify_email');

    // Call server to send real email with verification code
    fetch('/api/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code }),
    }).catch(err => {
      console.warn('Could not dispatch email through backend:', err);
    });

    return code;
  };

  const sendVerificationCodeAsync = async (email: string, password?: string): Promise<{ success: boolean; code?: string; error?: string }> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanEmail = email.trim();
    setRegistrationDraftEmail(cleanEmail);
    if (password) setRegistrationDraftPassword(password);
    setGeneratedVerificationCode(code);

    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Impossibile inviare il codice email.' };
      }
      setOnboardingStep('verify_email');
      return { success: true, code };
    } catch {
      setOnboardingStep('verify_email');
      return { success: true, code };
    }
  };

  const verifyEmailCode = (code: string): boolean => {
    const trimmed = code.trim();
    if (generatedVerificationCode && trimmed === generatedVerificationCode) {
      setOnboardingStep('profile_setup');
      return true;
    }
    return false;
  };

  const verifyEmailCodeAsync = async (code: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = code.trim();
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationDraftEmail, code: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOnboardingStep('profile_setup');
        return { success: true };
      }
      // Check local match as fallback
      if (generatedVerificationCode && trimmed === generatedVerificationCode) {
        setOnboardingStep('profile_setup');
        return { success: true };
      }
      return { success: false, error: data.error || 'Codice errato o scaduto. Verifica la tua email.' };
    } catch {
      if (generatedVerificationCode && trimmed === generatedVerificationCode) {
        setOnboardingStep('profile_setup');
        return { success: true };
      }
      return { success: false, error: 'Codice non valido o connessione non riuscita.' };
    }
  };

  const completeOnboarding = (data: {
    name: string;
    logoUrl?: string;
    phone?: string;
    address?: string;
    city?: string;
    websiteUrl?: string;
    password?: string;
    email?: string;
    plan?: PlanType;
    description?: string;
  }): Studio => {
    const baseSlug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'nuovo-studio';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (studios.some(s => s.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    // Strict cleaning: NO dummy fallback addresses or phones
    const cleanedPhone = data.phone ? data.phone.trim() : '';
    const finalPhone = cleanedPhone === '+39' ? '' : cleanedPhone;
    const targetEmail = data.email?.trim() || registrationDraftEmail || 'studio@prismal.app';

    // Strict uniqueness check across all studios
    const dupCheck = findDuplicateStudio(studios, { email: targetEmail, phone: finalPhone });
    if (dupCheck.isDuplicate) {
      if (dupCheck.field === 'email') {
        throw new Error(`Uno studio con l'email ${targetEmail} è già registrato.`);
      } else {
        throw new Error(`Uno studio con il numero di telefono ${finalPhone} è già registrato.`);
      }
    }

    const newStudio: Studio = {
      id: `studio-${Date.now()}`,
      name: data.name.trim(),
      slug: uniqueSlug,
      email: targetEmail,
      password: data.password || registrationDraftPassword || 'password123',
      isEmailVerified: true,
      logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80',
      phone: finalPhone,
      address: data.address ? data.address.trim() : '',
      city: data.city ? data.city.trim() : '',
      websiteUrl: data.websiteUrl ? data.websiteUrl.trim() : '',
      twoFactorEnabled: false,
      status: 'pending', // Pending Super Admin approval
      plan: data.plan || 'prismal_prime',
      demoSlotsTotal: 99999,
      demoSlotsRemaining: 99999,
      createdAt: new Date().toISOString(),
      slotDurationMinutes: 30,
      weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
      visitReasons: DEFAULT_VISIT_REASONS,
    };

    setStudios(prev => deduplicateStudios([newStudio, ...prev]));
    setCurrentStudioId(newStudio.id);
    setOnboardingStep('completed');

    // Establish studio_admin session immediately
    const session: AuthSession = {
      role: 'studio_admin',
      email: newStudio.email,
      studioId: newStudio.id,
      studioName: newStudio.name,
    };
    setAuthSession(session);

    // Sync with server store
    try {
      fetch('/api/studios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudio),
      }).catch(() => {});
    } catch {}

    return newStudio;
  };

  const loginStudio = (email: string): boolean => {
    const res = loginStudioCredentials(email);
    return res.success;
  };

  const loginStudioWithGoogle = (googleUser?: { email: string; name?: string }): { success: boolean; isNew?: boolean; studio?: Studio; error?: string } => {
    const userEmail = (googleUser?.email || '').trim().toLowerCase();
    if (!userEmail) {
      return { success: false, error: 'Account Google non specificato.' };
    }

    const existingStudio = studios.find(s => s.email.toLowerCase() === userEmail);

    if (!existingStudio) {
      // STRICT: If the studio is NOT registered in the database, DO NOT create it and DO NOT log in!
      return {
        success: false,
        error: `Nessuno studio odontoiatrico associato all'account Google "${userEmail}". Effettua prima la registrazione della tua clinica.`,
      };
    }

    if (existingStudio.status === 'suspended') {
      return {
        success: false,
        error: 'Questo studio è temporaneamente sospeso. Contatta l\'assistenza PRISMAL per maggiori informazioni.',
      };
    }

    setCurrentStudioId(existingStudio.id);
    setAuthSession({
      role: 'studio_admin',
      studioId: existingStudio.id,
      email: existingStudio.email,
      name: existingStudio.name,
    });
    setOnboardingStep('completed');
    setCurrentRole('studio_admin');
    return { success: true, isNew: false, studio: existingStudio };
  };

  const startStudioRegistrationWithGoogle = (googleUser: { email: string; name?: string }): { success: boolean; alreadyExists?: boolean; error?: string } => {
    const userEmail = (googleUser?.email || '').trim().toLowerCase();
    if (!userEmail || !userEmail.includes('@')) {
      return { success: false, error: 'Indirizzo email Google non valido.' };
    }

    const existingStudio = studios.find(s => s.email.toLowerCase() === userEmail);
    if (existingStudio) {
      return {
        success: false,
        alreadyExists: true,
        error: `Esiste già uno studio odontoiatrico registrato con l'account Google "${userEmail}". Effettua l'accesso.`,
      };
    }

    // Set registration draft with verified email from Google
    setRegistrationDraftEmail(userEmail);
    setRegistrationDraftPassword('GoogleAuth_Verified');
    
    // Jump straight to Step 3 (profile_setup) so the user enters their actual studio details (Name, Phone, Address, City)
    setOnboardingStep('profile_setup');
    return { success: true };
  };

  // Supabase Auth Integration: Listen for OAuth Redirect / Session
  useEffect(() => {
    const handleSupabaseSession = (sessionUser: any) => {
      if (!sessionUser) return;
      const email = (sessionUser.email || '').trim().toLowerCase();
      const name = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || email;
      const userType = (localStorage.getItem('prismal_supabase_user_type') as UserType) || 'studio';

      if (userType === 'super_admin' || email === 'diegoraimondi7@gmail.com') {
        const res = loginSuperAdmin(email);
        if (res.success) {
          console.log('[Supabase Auth] Logged in as Super Admin:', email);
        }
      } else if (userType === 'patient') {
        setCurrentRole('patient');
        setAuthSession({
          role: 'patient',
          email,
          patientName: name,
        });
        console.log('[Supabase Auth] Logged in as Patient:', email);
      } else {
        // Studio login or registration
        const studioRes = loginStudioWithGoogle({ email, name });
        if (!studioRes.success) {
          // If not registered yet, start onboarding
          startStudioRegistrationWithGoogle({ email, name });
          setRegistrationDraftEmail(email);
          setOnboardingStep('profile_setup');
          setCurrentRole('studio_admin');
        }
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSupabaseSession(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        handleSupabaseSession(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [studios]);

  const sendPatientVerificationCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanEmail = email.trim();
    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Impossibile inviare il codice email al paziente.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Errore di connessione con il servizio di posta.' };
    }
  };

  const verifyPatientEmailCode = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim();
    const trimmed = code.trim();
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Codice errato o scaduto. Verifica la tua email.' };
    } catch {
      return { success: true };
    }
  };

  const exitPatientMinisite = (targetSlug?: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
    // If user was logged in as super_admin, return back to super_admin console
    if (authSession?.role === 'super_admin') {
      setCurrentRole('super_admin');
      return;
    }

    const slugToFind = (targetSlug || patientViewingSlug || '').toLowerCase().trim();
    const targetStudio = studios.find(s => s.slug.toLowerCase().trim() === slugToFind) || activeStudio || studios[0];

    if (targetStudio) {
      setCurrentStudioId(targetStudio.id);
      setAuthSession({
        role: 'studio_admin',
        studioId: targetStudio.id,
        email: targetStudio.email,
        name: targetStudio.name,
      });
      setOnboardingStep('completed');
      setCurrentRole('studio_admin');
    } else {
      setCurrentRole('landing');
    }
  };

  const logoutStudio = () => {
    logout();
  };


  // Super Admin actions
  const approveStudioDemo = (studioId: string) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const updated: Studio = {
            ...s,
            status: 'approved_demo',
            plan: 'trial_30d',
            demoSlotsTotal: 99999,
            demoSlotsRemaining: 99999,
            approvedAt: new Date().toISOString(),
          };
          fetch(`/api/studios/${studioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const upgradeStudioPro = (studioId: string) => {
    upgradeStudioPlan(studioId, 'prismal_prime');
  };

  const setStudioPlan = (studioId: string, plan: PlanType) => {
    upgradeStudioPlan(studioId, plan);
  };

  const upgradeStudioPlan = (studioId: string, plan: PlanType) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const updated: Studio = {
            ...s,
            status: plan === 'trial_30d' || plan === 'demo_free' ? 'approved_demo' : 'active_pro',
            plan,
            demoSlotsTotal: 99999,
            demoSlotsRemaining: 99999,
            approvedAt: s.approvedAt || new Date().toISOString(),
          };
          saveStudioToFirestore(updated).catch(() => {});
          fetch(`/api/studios/${studioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const addDemoSlots = (studioId: string, count: number) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const updated = {
            ...s,
            demoSlotsTotal: s.demoSlotsTotal + count,
            demoSlotsRemaining: s.demoSlotsRemaining + count,
          };
          saveStudioToFirestore(updated).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const toggleStudioSuspension = (studioId: string) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const nextStatus = s.status === 'suspended' ? (s.plan === 'demo_free' ? 'approved_demo' : 'active_pro') : 'suspended';
          const updated = { ...s, status: nextStatus };
          saveStudioToFirestore(updated).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const deleteStudio = (studioId: string) => {
    setStudios(prev => prev.filter(s => s.id !== studioId));
    setAppointments(prev => prev.filter(a => a.studioId !== studioId));
    setBlockedSlots(prev => prev.filter(b => b.studioId !== studioId));
    setNotifications(prev => prev.filter(n => n.studioId !== studioId));
    if (currentStudioId === studioId) {
      const remaining = studios.filter(s => s.id !== studioId);
      setCurrentStudioId(remaining.length > 0 ? remaining[0].id : null);
    }
    // Delete from backend store and Firestore
    try {
      fetch(`/api/studios/${studioId}`, {
        method: 'DELETE',
      }).catch(err => console.error('Error deleting studio from server:', err));
    } catch (e) {
      console.error(e);
    }
  };

  // SuperAdmin Payment Gateway & Subscriptions
  const updateSuperAdminPaymentConfig = (newCfg: SuperAdminPaymentConfig) => {
    setSuperAdminPaymentConfig(newCfg);
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_CONFIG, JSON.stringify(newCfg));
      saveSuperAdminPaymentConfigToFirestore(newCfg).catch(() => {});
      fetch('/api/admin/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg),
      }).catch(() => {});
    } catch (e) {
      console.error('Error saving payment config:', e);
    }
  };

  const processStudioPayment = async (payload: {
    studioId: string;
    studioName: string;
    studioEmail: string;
    studioVatOrFiscalCode?: string;
    type: PlatformTransaction['type'];
    planId?: PlanType;
    addonId?: string;
    addonDescription?: string;
    amountNet: number;
    amountVat: number;
    amountTotal: number;
    paymentMethod: PlatformTransaction['paymentMethod'];
    paymentReference: string;
    status: PlatformTransaction['status'];
    notes?: string;
  }): Promise<PlatformTransaction> => {
    const progressive = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `FAT-2026-${progressive}`;
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newTx: PlatformTransaction = {
      id: txId,
      invoiceNumber,
      studioId: payload.studioId,
      studioName: payload.studioName,
      studioEmail: payload.studioEmail,
      studioVatOrFiscalCode: payload.studioVatOrFiscalCode,
      type: payload.type,
      planId: payload.planId,
      addonId: payload.addonId,
      addonDescription: payload.addonDescription,
      amountNet: payload.amountNet,
      amountVat: payload.amountVat,
      amountTotal: payload.amountTotal,
      paymentMethod: payload.paymentMethod,
      paymentReference: payload.paymentReference,
      status: payload.status,
      createdAt: nowIso,
      paidAt: payload.status === 'completed' ? nowIso : undefined,
      notes: payload.notes,
    };

    setPlatformTransactions(prev => {
      const updated = [newTx, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    savePlatformTransactionToFirestore(newTx).catch(() => {});

    // Sync to backend store
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx),
    }).catch(() => {});

    // Update Studio Plan and Addon Quotas
    setStudios(prev =>
      prev.map(s => {
        if (s.id === payload.studioId) {
          let updatedPlan = s.plan;
          let extraAppts = s.subscription?.extraBookingsPurchased || 0;
          let extraSms = s.subscription?.extraSmsPurchased || 0;

          if (payload.planId) {
            updatedPlan = payload.planId;
          }

          if (payload.type === 'addon_slots' && payload.addonId) {
            const pack = ADDON_SLOT_PACKAGES.find(p => p.id === payload.addonId);
            if (pack && pack.type === 'appointments') {
              extraAppts += pack.quantity;
            }
          }

          if (payload.type === 'addon_sms' && payload.addonId) {
            const pack = ADDON_SLOT_PACKAGES.find(p => p.id === payload.addonId);
            if (pack && pack.type === 'sms') {
              extraSms += pack.quantity;
            }
          }

          const isPaymentCompleted = payload.status === 'completed';

          // SECURITY: Only activate the plan or sponsorship if payment was ACTUALLY verified and completed by the gateway!
          if (!isPaymentCompleted) {
            // Payment is pending (e.g. Bank Transfer SEPA) or unverified: do NOT activate plan or sponsorship!
            return s;
          }

          let updatedStudio: Studio;

          if (payload.type === 'sponsorship') {
            const duration = (payload as any).sponsorshipDurationDays || 30;
            const currentExpiry = s.sponsoredUntil && new Date(s.sponsoredUntil).getTime() > Date.now()
              ? new Date(s.sponsoredUntil).getTime()
              : Date.now();
            const newExpiry = new Date(currentExpiry + duration * 86400000).toISOString();
            updatedStudio = {
              ...s,
              isSponsored: true,
              sponsoredUntil: newExpiry,
              sponsoredPlanId: (payload as any).sponsorshipPackageId,
            };
          } else {
            const isTrial = payload.type === 'trial_verification';
            const updatedSubscription: StudioSubscription = {
              status: isTrial ? 'trialing' : 'active',
              planId: 'prismal_prime',
              billingCycle: payload.type === 'subscription_annual' ? 'annual' : 'monthly',
              currentPeriodStart: nowIso,
              currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
              cancelAtPeriodEnd: false,
              paymentMethod: payload.paymentMethod,
              paymentMethodDetails: {
                brand: payload.paymentMethod === 'stripe' ? 'Stripe (Carta / Wallet)' : payload.paymentMethod === 'google_pay' ? 'Google Pay' : payload.paymentMethod === 'paypal' ? 'PayPal' : payload.paymentMethod === 'credit_card' ? 'Visa' : 'Bonifico SEPA',
                last4: payload.paymentReference ? payload.paymentReference.slice(-4) : '4242',
                googlePayEmail: payload.paymentMethod === 'google_pay' ? (payload.studioEmail || 'studio@gmail.com') : undefined,
                paypalEmail: payload.paymentMethod === 'paypal' ? (payload.studioEmail || 'billing@paypal.com') : undefined,
                bankTransferReference: payload.paymentMethod === 'bank_transfer' ? payload.paymentReference : undefined,
              },
              monthlyUsedBookings: s.subscription?.monthlyUsedBookings || 0,
              extraBookingsPurchased: extraAppts,
              monthlyUsedSms: s.subscription?.monthlyUsedSms || 0,
              extraSmsPurchased: extraSms,
              lastPaymentDate: nowIso,
              lastPaymentAmount: payload.amountTotal,
              lastInvoiceNumber: invoiceNumber,
            };

            updatedStudio = {
              ...s,
              status: 'active_pro',
              plan: 'prismal_prime',
              demoSlotsTotal: 99999,
              demoSlotsRemaining: 99999,
              subscription: updatedSubscription,
            };
          }

          saveStudioToFirestore(updatedStudio).catch(() => {});
          fetch(`/api/studios/${s.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedStudio),
          }).catch(() => {});

          return updatedStudio;
        }
        return s;
      })
    );

    return newTx;
  };

  const approvePendingTransaction = (txId: string) => {
    setPlatformTransactions(prev => {
      const updated = prev.map(t => {
        if (t.id === txId) {
          const approved: PlatformTransaction = {
            ...t,
            status: 'completed',
            paidAt: new Date().toISOString(),
          };

          // Activate studio plan if needed
          if (t.planId) {
            setStudios(sList =>
              sList.map(s => {
                if (s.id === t.studioId) {
                  const up: Studio = {
                    ...s,
                    status: 'active_pro',
                    plan: t.planId!,
                    demoSlotsRemaining: 99999,
                    demoSlotsTotal: 99999,
                  };
                  saveStudioToFirestore(up).catch(() => {});
                  return up;
                }
                return s;
              })
            );
          }

          // Activate sponsorship if needed
          if (t.type === 'sponsorship') {
            const duration = t.sponsorshipDurationDays || 30;
            setStudios(sList =>
              sList.map(s => {
                if (s.id === t.studioId) {
                  const currentExpiry = s.sponsoredUntil && new Date(s.sponsoredUntil).getTime() > Date.now()
                    ? new Date(s.sponsoredUntil).getTime()
                    : Date.now();
                  const newExpiry = new Date(currentExpiry + duration * 86400000).toISOString();
                  const up: Studio = {
                    ...s,
                    isSponsored: true,
                    sponsoredUntil: newExpiry,
                    sponsoredPlanId: t.sponsorshipPackageId,
                  };
                  saveStudioToFirestore(up).catch(() => {});
                  return up;
                }
                return s;
              })
            );
          }

          return approved;
        }
        return t;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    fetch(`/api/transactions/${txId}/approve`, { method: 'POST' }).catch(() => {});
  };

  const cancelStudioSubscription = (studioId: string) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const sub = s.subscription || {
            status: 'active' as const,
            planId: s.plan,
            billingCycle: 'monthly' as const,
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
            cancelAtPeriodEnd: true,
            monthlyUsedBookings: 0,
            extraBookingsPurchased: 0,
            monthlyUsedSms: 0,
            extraSmsPurchased: 0,
          };
          const updatedStudio: Studio = {
            ...s,
            subscription: {
              ...sub,
              cancelAtPeriodEnd: true,
            },
          };
          saveStudioToFirestore(updatedStudio).catch(() => {});
          fetch(`/api/studios/${s.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedStudio),
          }).catch(() => {});
          return updatedStudio;
        }
        return s;
      })
    );
  };

  // Studio Admin actions
  const updateStudioProfile = (studioId: string, updates: Partial<Studio>) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const updated = { ...s, ...updates };
          saveStudioToFirestore(updated).catch(() => {});
          fetch(`/api/studios/${studioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const updateWeeklyAvailability = (studioId: string, availability: DayAvailability[]) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const updated = { ...s, weeklyAvailability: availability };
          saveStudioToFirestore(updated).catch(() => {});
          fetch(`/api/studios/${studioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const updateStudioSmartRules = (studioId: string, rules: Partial<SmartBookingRules>) => {
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studioId) {
          const currentRules = s.smartBookingRules || DEFAULT_SMART_BOOKING_RULES;
          const updated: Studio = {
            ...s,
            smartBookingRules: { ...currentRules, ...rules },
          };
          saveStudioToFirestore(updated).catch(() => {});
          fetch(`/api/studios/${studioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const updateAppointmentStatus = (appointmentId: string, status: Appointment['status']) => {
    setAppointments(prev =>
      prev.map(a => (a.id === appointmentId ? { ...a, status } : a))
    );
    updateAppointmentStatusInFirestore(appointmentId, status).catch(() => {});
    fetch(`/api/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  // Blocked slots management
  const addBlockedSlot = (data: Omit<BlockedSlot, 'id' | 'createdAt'>) => {
    const newBlock: BlockedSlot = {
      ...data,
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setBlockedSlots(prev => [newBlock, ...prev]);
    saveBlockedSlotToFirestore(newBlock).catch(() => {});
  };

  const removeBlockedSlot = (id: string) => {
    setBlockedSlots(prev => prev.filter(b => b.id !== id));
    deleteBlockedSlotFromFirestore(id).catch(() => {});
  };

  const isDayBlocked = (studioId: string, date: string): boolean => {
    return blockedSlots.some(b => b.studioId === studioId && b.date === date && b.isAllDay);
  };

  const isSlotBlocked = (studioId: string, date: string, timeSlot?: string): boolean => {
    // 1. Day blocked entirely
    if (isDayBlocked(studioId, date)) return true;
    // 2. Specific time slot blocked
    if (timeSlot) {
      return blockedSlots.some(b => b.studioId === studioId && b.date === date && b.timeSlot === timeSlot);
    }
    return false;
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, status: 'read' } : n))
    );
  };

  const clearNotifications = () => {
    if (currentStudioId) {
      setNotifications(prev => prev.filter(n => n.studioId !== currentStudioId));
    }
  };

  // Patient Booking
  const bookAppointment = (
    slug: string,
    booking: {
      patientFirstName: string;
      patientLastName: string;
      patientPhone: string;
      patientEmail: string;
      visitReasonId: string;
      visitReasonName: string;
      date: string;
      timeSlot: string;
      notes?: string;
      isUrgent?: boolean;
      gdprConsent?: boolean;
      gdprConsentTimestamp?: string;
      gdprPolicyVersion?: string;
      gdprConsentChannel?: 'online_booking' | 'desk_intake' | 'digital_kiosk';
    }
  ): BookingResult => {
    const studio = studios.find(s => s.slug === slug);
    if (!studio) {
      return { success: false, error: 'Studio non trovato.' };
    }

    // Security check: Studio must be approved by Super Admin
    if (studio.status === 'pending') {
      return {
        success: false,
        isPendingApproval: true,
        error: 'Questo studio non è ancora stato approvato dal team PRISMAL. Le prenotazioni sono temporaneamente bloccate.',
      };
    }

    if (studio.status === 'suspended') {
      return {
        success: false,
        error: 'Le prenotazioni online per questo studio sono temporaneamente sospese.',
      };
    }

    // Tiered Quota & Plan Limit Check (Demo slots, Monthly Plan Quota, Addon Slots)
    const quota = getStudioQuotaStatus(studio, appointments);
    if (quota.isExhausted) {
      return {
        success: false,
        isLimitReached: true,
        error: quota.isDemo
          ? 'Periodo di prova di 30 giorni terminato per questo studio. Per continuare a ricevere prenotazioni online è necessario attivare l\'abbonamento PRISMAL Prime.'
          : `Limite mensile di prenotazioni (${quota.totalLimit} appuntamenti) raggiunto per questo studio per il mese in corso. Lo studio può effettuare l'upgrade a PRISMAL Prime o acquistare un pacchetto di slot aggiuntivi per sbloccare immediatamente nuove prenotazioni.`,
      };
    }

    // Check if slot or day is blocked manually by studio
    if (isSlotBlocked(studio.id, booking.date, booking.timeSlot)) {
      return {
        success: false,
        error: 'La data o l\'orario selezionato è stato riservato o bloccato dallo studio. Seleziona un altro orario disponibile.',
      };
    }

    const randomCodeNumber = Math.floor(1000 + Math.random() * 9000);
    const managementToken = `mgmt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const isUrgent = !!booking.isUrgent || booking.visitReasonName.toLowerCase().includes('urgenza');

    const consentTimestamp = booking.gdprConsentTimestamp || new Date().toISOString();
    const policyVersion = booking.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION;
    const consentChannel = booking.gdprConsentChannel || 'online_booking';

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      code: `PRS-${randomCodeNumber}`,
      studioId: studio.id,
      patientFirstName: booking.patientFirstName,
      patientLastName: booking.patientLastName,
      patientPhone: booking.patientPhone,
      patientEmail: booking.patientEmail,
      visitReasonId: booking.visitReasonId,
      visitReasonName: booking.visitReasonName,
      date: booking.date,
      timeSlot: booking.timeSlot,
      notes: booking.notes || '',
      status: 'pending', // Per Master Spec: "Salva la richiesta con stato In Attesa (Giallo)"
      isUrgent,
      gdprConsent: booking.gdprConsent ?? true,
      gdprConsentTimestamp: consentTimestamp,
      gdprPolicyVersion: policyVersion,
      gdprConsentChannel: consentChannel,
      gdprConsentPurposes: ['sanitary_treatment', 'appointment_reminders', 'fiscal_compliance'],
      managementToken,
      createdAt: new Date().toISOString(),
    };

    // Deduct demo slot if on demo plan or update monthly usage counter
    setStudios(prev =>
      prev.map(s => {
        if (s.id === studio.id) {
          if (s.plan === 'demo_free') {
            const remaining = Math.max(0, s.demoSlotsRemaining - 1);
            return {
              ...s,
              demoSlotsRemaining: remaining,
            };
          } else {
            const sub = s.subscription || {
              status: 'active' as const,
              planId: s.plan,
              billingCycle: 'monthly' as const,
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
              cancelAtPeriodEnd: false,
              monthlyUsedBookings: 0,
              extraBookingsPurchased: 0,
              monthlyUsedSms: 0,
              extraSmsPurchased: 0,
            };
            return {
              ...s,
              subscription: {
                ...sub,
                monthlyUsedBookings: (sub.monthlyUsedBookings || 0) + 1,
              },
            };
          }
        }
        return s;
      })
    );

    setAppointments(prev => [newAppointment, ...prev]);
    saveAppointmentToFirestore(newAppointment).catch(err => {
      console.warn('Error saving appointment to Firestore:', err);
    });

    // AUTOMATIC EMAIL NOTIFICATION SYSTEM:
    const fullStudioAddress = [studio.address?.trim(), studio.city?.trim()].filter(Boolean).join(', ');
    const mapsUrl = fullStudioAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([studio.name, fullStudioAddress].join(', '))}` : undefined;

    // 1. Email to Patient with key details + Unique Management Link
    const patientEmailNotification: EmailNotification = {
      id: `notif-pat-${Date.now()}`,
      studioId: studio.id,
      appointmentId: newAppointment.id,
      recipientType: 'patient',
      recipientEmail: booking.patientEmail,
      recipientName: `${booking.patientFirstName} ${booking.patientLastName}`,
      subject: `Conferma Prenotazione #${newAppointment.code} - ${studio.name}`,
      sentAt: new Date().toISOString(),
      managementToken,
      status: 'delivered',
      appointmentDetails: {
        code: newAppointment.code,
        patientName: `${booking.patientFirstName} ${booking.patientLastName}`,
        patientPhone: booking.patientPhone,
        patientEmail: booking.patientEmail,
        studioName: studio.name,
        studioAddress: fullStudioAddress,
        studioCity: studio.city?.trim(),
        mapsUrl,
        studioPhone: studio.phone,
        date: booking.date,
        timeSlot: booking.timeSlot,
        visitReasonName: booking.visitReasonName,
        notes: booking.notes,
        isUrgent,
      },
    };

    // 2. Email / Alert to Clinic
    const studioEmailNotification: EmailNotification = {
      id: `notif-stu-${Date.now()}`,
      studioId: studio.id,
      appointmentId: newAppointment.id,
      recipientType: 'studio',
      recipientEmail: studio.email,
      recipientName: studio.name,
      subject: isUrgent
        ? `🚨 NUOVA RICHIESTA URGENTE: ${booking.patientFirstName} ${booking.patientLastName} (#${newAppointment.code})`
        : `Nuova Prenotazione Ricevuta: ${booking.patientFirstName} ${booking.patientLastName} (#${newAppointment.code})`,
      sentAt: new Date().toISOString(),
      status: 'delivered',
      appointmentDetails: {
        code: newAppointment.code,
        patientName: `${booking.patientFirstName} ${booking.patientLastName}`,
        patientPhone: booking.patientPhone,
        patientEmail: booking.patientEmail,
        studioName: studio.name,
        studioAddress: fullStudioAddress,
        studioCity: studio.city?.trim(),
        mapsUrl,
        studioPhone: studio.phone,
        date: booking.date,
        timeSlot: booking.timeSlot,
        visitReasonName: booking.visitReasonName,
        notes: booking.notes,
        isUrgent,
      },
    };

    setNotifications(prev => [patientEmailNotification, studioEmailNotification, ...prev]);

    // Automatically link / create persistent PatientRecord in Firestore
    const pKey = (newAppointment.patientEmail || newAppointment.patientPhone).toLowerCase().trim();
    const existingPatient = patientRecords.find(p =>
      p.studioId === studio.id &&
      ((p.email && p.email.toLowerCase().trim() === pKey) || p.phone.trim() === newAppointment.patientPhone.trim())
    );

    if (existingPatient) {
      const updated: PatientRecord = {
        ...existingPatient,
        totalVisits: (existingPatient.totalVisits || 0) + 1,
        lastVisitDate: newAppointment.date,
        gdprSanitaryConsent: true,
        gdprSanitaryConsentDate: existingPatient.gdprSanitaryConsentDate || new Date().toISOString().split('T')[0],
        gdprConsentTimestamp: existingPatient.gdprConsentTimestamp || consentTimestamp,
        gdprPolicyVersion: existingPatient.gdprPolicyVersion || policyVersion,
        gdprConsentChannel: existingPatient.gdprConsentChannel || consentChannel,
        pastTreatments: [
          {
            date: newAppointment.date,
            treatment: newAppointment.visitReasonName,
            notes: newAppointment.notes,
          },
          ...(existingPatient.pastTreatments || []),
        ],
      };
      savePatientRecord(updated).catch(() => {});
    } else {
      createDirectPatient({
        studioId: studio.id,
        firstName: booking.patientFirstName,
        lastName: booking.patientLastName,
        phone: booking.patientPhone,
        email: booking.patientEmail || '',
        totalVisits: 1,
        firstVisitDate: booking.date,
        lastVisitDate: booking.date,
        gdprSanitaryConsent: true,
        gdprSanitaryConsentDate: new Date().toISOString().split('T')[0],
        gdprConsentTimestamp: consentTimestamp,
        gdprPolicyVersion: policyVersion,
        gdprConsentChannel: consentChannel,
        gdprConsentPurposes: ['sanitary_treatment', 'appointment_reminders', 'fiscal_compliance'],
        gdprConsentProof: {
          version: policyVersion,
          timestamp: consentTimestamp,
          channel: consentChannel,
          purposes: ['sanitary_treatment', 'appointment_reminders', 'fiscal_compliance'],
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'PRISMAL Client',
        },
        consentHistory: [
          {
            version: policyVersion,
            timestamp: consentTimestamp,
            action: 'granted',
            channel: consentChannel,
            notes: `Consenso espresso in fase di registrazione prenotazione #${newAppointment.code}`,
          },
        ],
        pastTreatments: [
          {
            date: booking.date,
            treatment: booking.visitReasonName,
            notes: booking.notes,
          },
        ],
      }).catch(() => {});
    }

    // Dispatch to server for persistence, real SMTP confirmation email to patient, studio notification, and SMS dispatch
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newAppointment,
        studioName: studio.name,
        studioAddress: studio.address,
        studioCity: studio.city,
        studioPhone: studio.phone,
        studioEmail: studio.email,
      }),
    }).catch(err => {
      console.warn('Network error saving appointment to server:', err);
    });

    return {
      success: true,
      appointment: newAppointment,
    };
  };

  // Patient Self-Service Cancellation via Token
  const cancelAppointmentByToken = (token: string, reason?: string) => {
    const apt = appointments.find(a => a.managementToken === token);
    if (!apt) {
      return { success: false, message: 'Appuntamento non trovato o link di gestione non valido.' };
    }
    if (apt.status === 'cancelled') {
      return { success: false, message: 'L\'appuntamento risulta già disdetto.' };
    }

    setAppointments(prev =>
      prev.map(a => (a.id === apt.id ? { ...a, status: 'cancelled' } : a))
    );
    updateAppointmentStatusInFirestore(apt.id, 'cancelled').catch(() => {});

    // If on demo plan, we can restore the slot
    const studio = studios.find(s => s.id === apt.studioId);
    if (studio && studio.plan === 'demo_free' && studio.demoSlotsRemaining < studio.demoSlotsTotal) {
      setStudios(prev =>
        prev.map(s => (s.id === studio.id ? { ...s, demoSlotsRemaining: s.demoSlotsRemaining + 1 } : s))
      );
    }

    // Add cancellation notification
    if (studio) {
      const cancelNotif: EmailNotification = {
        id: `notif-cancel-${Date.now()}`,
        studioId: studio.id,
        appointmentId: apt.id,
        recipientType: 'studio',
        recipientEmail: studio.email,
        recipientName: studio.name,
        subject: `⚠️ Appuntamento Annullato dal Paziente: ${apt.patientFirstName} ${apt.patientLastName} (#${apt.code})`,
        sentAt: new Date().toISOString(),
        status: 'delivered',
        appointmentDetails: {
          code: apt.code,
          patientName: `${apt.patientFirstName} ${apt.patientLastName}`,
          patientPhone: apt.patientPhone,
          patientEmail: apt.patientEmail,
          studioName: studio.name,
          studioAddress: `${studio.address}, ${studio.city}`,
          studioPhone: studio.phone,
          date: apt.date,
          timeSlot: apt.timeSlot,
          visitReasonName: apt.visitReasonName,
          notes: `Disdetto dal paziente. Motivo: ${reason || 'Nessun motivo specificato'}`,
        },
      };
      setNotifications(prev => [cancelNotif, ...prev]);
    }

    // Call server to persist cancellation and notify studio
    fetch('/api/appointments/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, reason }),
    }).catch(() => {});

    return { success: true, message: 'Prenotazione annullata con successo.' };
  };

  // Patient Self-Service Rescheduling via Token
  const rescheduleAppointmentByToken = (token: string, newDate: string, newTimeSlot: string) => {
    const apt = appointments.find(a => a.managementToken === token);
    if (!apt) {
      return { success: false, message: 'Appuntamento non trovato.' };
    }

    if (isSlotBlocked(apt.studioId, newDate, newTimeSlot)) {
      return { success: false, message: 'La nuova data o orario selezionato non è disponibile.' };
    }

    setAppointments(prev =>
      prev.map(a => (a.id === apt.id ? { ...a, date: newDate, timeSlot: newTimeSlot, status: 'confirmed' } : a))
    );
    saveAppointmentToFirestore({ ...apt, date: newDate, timeSlot: newTimeSlot, status: 'confirmed' }).catch(() => {});

    // Call server to persist reschedule
    fetch('/api/appointments/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newDate, newTimeSlot }),
    }).catch(() => {});

    return { success: true, message: 'Appuntamento riprogrammato con successo! Lo studio confermerà a breve.' };
  };

  // Clinical Patient Records & Health Management Implementation
  const savePatientRecord = async (record: PatientRecord): Promise<void> => {
    const updatedRecord = { ...record, updatedAt: new Date().toISOString() };
    setPatientRecords(prev => {
      const exists = prev.some(p => p.id === record.id);
      if (exists) {
        return prev.map(p => (p.id === record.id ? updatedRecord : p));
      }
      return [updatedRecord, ...prev];
    });
    await savePatientRecordToFirestore(updatedRecord);
  };

  const createDirectPatient = async (
    patientData: Partial<PatientRecord> & { firstName: string; lastName: string; phone: string; studioId?: string }
  ): Promise<PatientRecord> => {
    const sId = patientData.studioId || activeStudio?.id || 'studio-demo-1';
    const consentTime = patientData.gdprConsentTimestamp || new Date().toISOString();
    const policyVer = patientData.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION;
    const consentChan = patientData.gdprConsentChannel || 'desk_intake';

    const newRecord: PatientRecord = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studioId: sId,
      firstName: patientData.firstName.trim(),
      lastName: patientData.lastName.trim(),
      phone: patientData.phone.trim(),
      email: patientData.email?.trim() || '',
      birthDate: patientData.birthDate || '',
      fiscalCode: patientData.fiscalCode?.toUpperCase().trim() || '',
      address: patientData.address || '',
      city: patientData.city || '',
      totalVisits: patientData.totalVisits || 0,
      firstVisitDate: patientData.firstVisitDate || new Date().toISOString().split('T')[0],
      lastVisitDate: patientData.lastVisitDate || new Date().toISOString().split('T')[0],
      pastTreatments: patientData.pastTreatments || [],
      clinicalNotes: patientData.clinicalNotes || '',
      allergies: patientData.allergies || '',
      allergiesList: patientData.allergiesList || [],
      medicalConditions: patientData.medicalConditions || [],
      dentalChart: patientData.dentalChart || {},
      treatmentPlans: patientData.treatmentPlans || [],
      gdprSanitaryConsent: patientData.gdprSanitaryConsent ?? true,
      gdprSanitaryConsentDate: patientData.gdprSanitaryConsentDate || new Date().toISOString().split('T')[0],
      gdprConsentTimestamp: consentTime,
      gdprPolicyVersion: policyVer,
      gdprConsentChannel: consentChan,
      gdprConsentPurposes: patientData.gdprConsentPurposes || ['sanitary_treatment', 'appointment_reminders', 'fiscal_compliance'],
      gdprConsentProof: patientData.gdprConsentProof || {
        version: policyVer,
        timestamp: consentTime,
        channel: consentChan,
        purposes: ['sanitary_treatment', 'appointment_reminders', 'fiscal_compliance'],
      },
      consentHistory: patientData.consentHistory || [
        {
          version: policyVer,
          timestamp: consentTime,
          action: 'granted',
          channel: consentChan,
          notes: 'Registrazione anagrafica paziente',
        },
      ],
      clinicalInformedConsent: patientData.clinicalInformedConsent ?? false,
      clinicalInformedConsentDate: patientData.clinicalInformedConsentDate || '',
      tesseraSanitariaOpposizione: patientData.tesseraSanitariaOpposizione ?? false,
      recallConsent: patientData.recallConsent ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePatientRecord(newRecord);
    return newRecord;
  };

  const createDirectAppointment = async (booking: {
    studioId: string;
    patientFirstName: string;
    patientLastName: string;
    patientPhone: string;
    patientEmail?: string;
    visitReasonId: string;
    visitReasonName: string;
    date: string;
    timeSlot: string;
    notes?: string;
    status?: Appointment['status'];
  }): Promise<Appointment> => {
    const randomCodeNumber = Math.floor(1000 + Math.random() * 9000);
    const managementToken = `mgmt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const isUrgent = booking.visitReasonName.toLowerCase().includes('urgenza');

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      code: `PRS-${randomCodeNumber}`,
      studioId: booking.studioId,
      patientFirstName: booking.patientFirstName.trim(),
      patientLastName: booking.patientLastName.trim(),
      patientPhone: booking.patientPhone.trim(),
      patientEmail: booking.patientEmail?.trim() || '',
      visitReasonId: booking.visitReasonId,
      visitReasonName: booking.visitReasonName,
      date: booking.date,
      timeSlot: booking.timeSlot,
      notes: booking.notes || '',
      status: booking.status || 'confirmed',
      isUrgent,
      gdprConsent: true,
      gdprConsentTimestamp: new Date().toISOString(),
      managementToken,
      createdAt: new Date().toISOString(),
    };

    setAppointments(prev => [newAppointment, ...prev]);
    saveAppointmentToFirestore(newAppointment).catch(err => {
      console.warn('Error saving direct appointment to Firestore:', err);
    });

    // Also link / update patient record
    const pKey = (newAppointment.patientEmail || newAppointment.patientPhone).toLowerCase().trim();
    const existingPatient = patientRecords.find(p => 
      p.studioId === booking.studioId && 
      ((p.email && p.email.toLowerCase().trim() === pKey) || p.phone.trim() === newAppointment.patientPhone.trim())
    );

    if (existingPatient) {
      const updated: PatientRecord = {
        ...existingPatient,
        totalVisits: (existingPatient.totalVisits || 0) + 1,
        lastVisitDate: newAppointment.date,
        pastTreatments: [
          {
            date: newAppointment.date,
            treatment: newAppointment.visitReasonName,
            notes: newAppointment.notes,
          },
          ...(existingPatient.pastTreatments || []),
        ],
      };
      savePatientRecord(updated).catch(() => {});
    } else {
      // Create new patient record automatically for this direct appointment
      createDirectPatient({
        studioId: booking.studioId,
        firstName: booking.patientFirstName,
        lastName: booking.patientLastName,
        phone: booking.patientPhone,
        email: booking.patientEmail || '',
        totalVisits: 1,
        firstVisitDate: booking.date,
        lastVisitDate: booking.date,
        pastTreatments: [
          {
            date: booking.date,
            treatment: booking.visitReasonName,
            notes: booking.notes,
          },
        ],
      }).catch(() => {});
    }

    return newAppointment;
  };

  const resetAllData = () => {
    setStudios(INITIAL_STUDIOS);
    setAppointments(INITIAL_APPOINTMENTS);
    setBlockedSlots(INITIAL_BLOCKED_SLOTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCurrentStudioId('studio-rossi');
    setPatientViewingSlug('studio-rossi');
    setActivePatientToken(null);
    setOnboardingStep('completed');
    localStorage.removeItem(STORAGE_KEYS.STUDIOS);
    localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
    localStorage.removeItem(STORAGE_KEYS.BLOCKED_SLOTS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  };

  return (
    <AppContext.Provider
      value={{
        studios,
        setStudios,
        appointments,
        blockedSlots,
        notifications,
        currentRole,
        currentStudioId,
        patientViewingSlug,
        activePatientToken,
        onboardingStep,
        registrationDraftEmail,
        generatedVerificationCode,
        activeStudio,
        authSession,
        setCurrentRole,
        setCurrentStudioId,
        setPatientViewingSlug,
        setActivePatientToken,
        setOnboardingStep,
        loginSuperAdmin,
        loginStudioCredentials,
        logout,
        openPatientBooking,
        openPatientToken,
        createQuickTestStudio,
        registerDraft,
        sendVerificationCodeAsync,
        verifyEmailCode,
        verifyEmailCodeAsync,
        completeOnboarding,
        loginStudio,
        loginStudioWithGoogle,
        startStudioRegistrationWithGoogle,
        logoutStudio,
        sendPatientVerificationCode,
        verifyPatientEmailCode,
        exitPatientMinisite,
        approveStudioDemo,
        upgradeStudioPro,
        setStudioPlan,
        upgradeStudioPlan,
        addDemoSlots,
        toggleStudioSuspension,
        deleteStudio,
        updateStudioProfile,
        updateWeeklyAvailability,
        updateAppointmentStatus,
        addBlockedSlot,
        removeBlockedSlot,
        isSlotBlocked,
        isDayBlocked,
        markNotificationRead,
        clearNotifications,
        bookAppointment,
        cancelAppointmentByToken,
        rescheduleAppointmentByToken,
        patientRecords,
        savePatientRecord,
        createDirectPatient,
        createDirectAppointment,
        superAdminPaymentConfig,
        updateSuperAdminPaymentConfig,
        platformTransactions,
        processStudioPayment,
        approvePendingTransaction,
        cancelStudioSubscription,
        searchLogs,
        logSearchQuery,
        searchAnalytics,
        resetAllData,
        themeMode,
        resolvedTheme,
        setThemeMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

