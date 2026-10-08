import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dqbphjwbrhxoqlhupydq.supabase.co';
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4OOKzpH4Bq_e0iEo0ZHv3w_hk7SHqtW';
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'sb_secret_BCaubx_jK1SwYtdpuXczpw_98g2UJOF';

let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdminInstance;
}

/**
 * Returns comprehensive status of Supabase services: Auth, Storage, Database
 */
export async function getSupabaseServerStatus() {
  const sb = getSupabaseAdmin();
  let authUsersCount = 0;
  let authError: string | null = null;
  let bucketsList: string[] = [];
  let storageError: string | null = null;
  const tablesStatus: Record<string, boolean> = {
    studios: false,
    appointments: false,
    transactions: false,
    reviews: false,
    communication_logs: false,
  };

  try {
    const { data: users, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) authError = error.message;
    else authUsersCount = users.users.length;
  } catch (e: any) {
    authError = e?.message;
  }

  try {
    const { data: buckets, error } = await sb.storage.listBuckets();
    if (error) storageError = error.message;
    else bucketsList = (buckets || []).map(b => b.name);
  } catch (e: any) {
    storageError = e?.message;
  }

  // Check if tables exist
  for (const table of Object.keys(tablesStatus)) {
    try {
      const { error } = await sb.from(table).select('id').limit(1);
      if (!error) {
        tablesStatus[table] = true;
      }
    } catch {
      tablesStatus[table] = false;
    }
  }

  return {
    url: SUPABASE_URL,
    connected: true,
    auth: {
      active: !authError,
      usersCount: authUsersCount,
      error: authError,
    },
    storage: {
      active: !storageError,
      buckets: bucketsList,
      defaultBucket: 'prismal-media',
      error: storageError,
    },
    database: {
      tables: tablesStatus,
      allTablesReady: Object.values(tablesStatus).every(Boolean),
    },
  };
}

/**
 * Uploads media asset directly to Supabase Storage bucket 'prismal-media'
 */
export async function uploadToSupabaseStorage(
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const sb = getSupabaseAdmin();
  const bucketName = 'prismal-media';

  try {
    // Ensure bucket exists
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.some(b => b.name === bucketName)) {
      await sb.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760,
      });
    }

    const cleanPath = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error } = await sb.storage
      .from(bucketName)
      .upload(cleanPath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: urlData } = sb.storage.from(bucketName).getPublicUrl(cleanPath);
    return {
      success: true,
      publicUrl: urlData.publicUrl,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Errore caricamento su Supabase Storage' };
  }
}

/**
 * Syncs in-memory studios and appointments into Supabase PostgreSQL tables if created
 */
export async function syncRecordToSupabase(table: string, record: any) {
  const sb = getSupabaseAdmin();
  try {
    const { error } = await sb.from(table).upsert(record, { onConflict: 'id' });
    if (error) {
      // If table doesn't exist, ignore quietly
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Delete a record from Supabase PostgreSQL table
 */
export async function deleteRecordFromSupabase(table: string, id: string) {
  const sb = getSupabaseAdmin();
  try {
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch rows and exact count from Supabase PostgreSQL table
 */
export async function fetchTableRowsFromSupabase(table: string, limit = 50) {
  const sb = getSupabaseAdmin();
  try {
    const { data, count, error } = await sb
      .from(table)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message, rows: [], count: 0 };
    }

    return {
      success: true,
      rows: data || [],
      count: count ?? (data?.length || 0),
    };
  } catch (err: any) {
    return { success: false, error: err?.message, rows: [], count: 0 };
  }
}

/**
 * Bulk sync all local records to Supabase PostgreSQL
 */
export async function syncAllDataToSupabase(data: {
  studios: any[];
  appointments: any[];
  transactions: any[];
  emailLogs?: any[];
  reviews?: any[];
}) {
  const sb = getSupabaseAdmin();
  const summary: Record<string, { synced: number; failed: number; error?: string }> = {
    studios: { synced: 0, failed: 0 },
    appointments: { synced: 0, failed: 0 },
    transactions: { synced: 0, failed: 0 },
    communication_logs: { synced: 0, failed: 0 },
    reviews: { synced: 0, failed: 0 },
  };

  // 1. Sync Studios
  for (const s of data.studios || []) {
    if (!s || !s.id) continue;
    try {
      const record = {
        id: s.id,
        name: s.name,
        slug: s.slug || `studio-${s.id}`,
        email: s.email,
        phone: s.phone || null,
        address: s.address || null,
        city: s.city || null,
        website_url: s.websiteUrl || null,
        logo_url: s.logoUrl || null,
        status: s.status || 'approved_demo',
        plan: s.plan || 'demo_free',
        is_sponsored: Boolean(s.isSponsored),
        rating: Number(s.rating) || 5.0,
        reviews_count: Number(s.reviewsCount) || 0,
        latitude: s.latitude ? Number(s.latitude) : null,
        longitude: s.longitude ? Number(s.longitude) : null,
        description: s.description || null,
        specialties: s.specialties || [],
        demo_slots_total: Number(s.demoSlotsTotal) || 10,
        demo_slots_remaining: Number(s.demoSlotsRemaining) || 10,
        slot_duration_minutes: Number(s.slotDurationMinutes) || 30,
        subscription: s.subscription || null,
        smart_booking_rules: s.smartBookingRules || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await sb.from('studios').upsert(record, { onConflict: 'id' });
      if (error) summary.studios.failed++;
      else summary.studios.synced++;
    } catch {
      summary.studios.failed++;
    }
  }

  // 2. Sync Appointments
  for (const a of data.appointments || []) {
    if (!a || !a.id) continue;
    try {
      const record = {
        id: a.id,
        studio_id: a.studioId,
        code: a.code,
        patient_first_name: a.patientFirstName || '',
        patient_last_name: a.patientLastName || '',
        patient_phone: a.patientPhone || '',
        patient_email: a.patientEmail || '',
        date: a.date,
        time_slot: a.timeSlot,
        visit_reason_id: a.visitReasonId || null,
        visit_reason_name: a.visitReasonName || null,
        notes: a.notes || null,
        status: a.status || 'confirmed',
        payment_status: a.paymentStatus || 'unpaid',
        payment_method: a.paymentMethod || null,
        payment_reference: a.paymentReference || null,
        management_token: a.managementToken || null,
        gdpr_consent: a.gdprConsent !== false,
        rating_email_sent: Boolean(a.ratingEmailSent),
        updated_at: new Date().toISOString(),
      };
      const { error } = await sb.from('appointments').upsert(record, { onConflict: 'id' });
      if (error) summary.appointments.failed++;
      else summary.appointments.synced++;
    } catch {
      summary.appointments.failed++;
    }
  }

  // 3. Sync Transactions
  for (const t of data.transactions || []) {
    if (!t || !t.id) continue;
    try {
      const record = {
        id: t.id,
        invoice_number: t.invoiceNumber,
        studio_id: t.studioId || null,
        studio_name: t.studioName || null,
        studio_email: t.studioEmail || null,
        type: t.type || 'subscription_monthly',
        plan_id: t.planId || null,
        amount_net: Number(t.amountNet) || 0,
        amount_vat: Number(t.amountVat) || 0,
        amount_total: Number(t.amountTotal) || 0,
        payment_method: t.paymentMethod || 'stripe',
        payment_reference: t.paymentReference || null,
        status: t.status || 'completed',
        notes: t.notes || null,
        paid_at: t.paidAt || null,
      };
      const { error } = await sb.from('transactions').upsert(record, { onConflict: 'id' });
      if (error) summary.transactions.failed++;
      else summary.transactions.synced++;
    } catch {
      summary.transactions.failed++;
    }
  }

  // 4. Sync Communication Logs
  for (const log of data.emailLogs || []) {
    if (!log || !log.id) continue;
    try {
      const record = {
        id: log.id,
        type: log.type || 'email',
        recipient: log.recipient || '',
        recipient_name: log.recipientName || null,
        sender: log.sender || null,
        subject: log.subject || null,
        snippet: log.snippet || null,
        status: log.status || 'delivered',
        channel: log.type?.includes('sms') ? 'sms' : 'email',
        error: log.error || null,
        meta: log.meta || null,
      };
      const { error } = await sb.from('communication_logs').upsert(record, { onConflict: 'id' });
      if (error) summary.communication_logs.failed++;
      else summary.communication_logs.synced++;
    } catch {
      summary.communication_logs.failed++;
    }
  }

  return { success: true, summary };
}

/**
 * Complete PostgreSQL Schema DDL script for PRISMAL in Supabase
 */
export function getSupabaseSqlSchema(): string {
  return `-- ====================================================================
-- SCHEMA PRISMAL DENTAL CLOUD PER SUPABASE POSTGRESQL
-- Copia e incolla questo script nel "SQL Editor" del tuo pannello Supabase
-- (https://supabase.com/dashboard/project/dqbphjwbrhxoqlhupydq/sql)
-- ====================================================================

-- 1. Tabella Studi Odontoiatrici
CREATE TABLE IF NOT EXISTS public.studios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    website_url TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'approved_demo',
    plan TEXT DEFAULT 'demo_free',
    is_sponsored BOOLEAN DEFAULT false,
    rating NUMERIC(3,2) DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),
    description TEXT,
    specialties TEXT[],
    demo_slots_total INTEGER DEFAULT 10,
    demo_slots_remaining INTEGER DEFAULT 10,
    slot_duration_minutes INTEGER DEFAULT 30,
    subscription JSONB,
    smart_booking_rules JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabella Appuntamenti e Prenotazioni Pazienti
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    studio_id TEXT REFERENCES public.studios(id) ON DELETE CASCADE,
    code TEXT,
    patient_first_name TEXT NOT NULL,
    patient_last_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    visit_reason_id TEXT,
    visit_reason_name TEXT,
    notes TEXT,
    status TEXT DEFAULT 'confirmed',
    payment_status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    payment_reference TEXT,
    management_token TEXT,
    gdpr_consent BOOLEAN DEFAULT true,
    rating_email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabella Transazioni Finanziarie & Fatture
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    studio_id TEXT,
    studio_name TEXT,
    studio_email TEXT,
    type TEXT NOT NULL,
    plan_id TEXT,
    amount_net NUMERIC(10,2) NOT NULL,
    amount_vat NUMERIC(10,2) DEFAULT 0,
    amount_total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 4. Tabella Recensioni Pazienti (1 a 5 stelle)
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    studio_id TEXT REFERENCES public.studios(id) ON DELETE CASCADE,
    appointment_id TEXT,
    patient_name TEXT,
    patient_email TEXT,
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabella Log Comunicazioni (Email & SMS Twilio)
CREATE TABLE IF NOT EXISTS public.communication_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    recipient_name TEXT,
    sender TEXT,
    subject TEXT,
    snippet TEXT,
    status TEXT DEFAULT 'delivered',
    channel TEXT DEFAULT 'email',
    error TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abilita Row Level Security (RLS)
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Pulizia e ricreazione policy idempotente (Rerunnable script compatibile con PostgreSQL standard)
DROP POLICY IF EXISTS "Studi visibili a tutti" ON public.studios;
CREATE POLICY "Studi visibili a tutti" ON public.studios
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Recensioni visibili a tutti" ON public.reviews;
CREATE POLICY "Recensioni visibili a tutti" ON public.reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Accesso totale backend service role su studios" ON public.studios;
CREATE POLICY "Accesso totale backend service role su studios" ON public.studios
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Accesso totale backend service role su appointments" ON public.appointments;
CREATE POLICY "Accesso totale backend service role su appointments" ON public.appointments
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Accesso totale backend service role su transactions" ON public.transactions;
CREATE POLICY "Accesso totale backend service role su transactions" ON public.transactions
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Accesso totale backend service role su communication_logs" ON public.communication_logs;
CREATE POLICY "Accesso totale backend service role su communication_logs" ON public.communication_logs
    FOR ALL USING (auth.role() = 'service_role');
`;
}
