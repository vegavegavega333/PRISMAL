import { createClient } from '@supabase/supabase-js';

// Official Supabase Configuration
export const SUPABASE_URL: string =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://dqbphjwbrhxoqlhupydq.supabase.co';
export const SUPABASE_ANON_KEY: string =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4OOKzpH4Bq_e0iEo0ZHv3w_hk7SHqtW';

// Official Stripe Checkout Link provided by the user
export const STRIPE_SUBSCRIPTION_LINK = 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00';

export type UserType = 'studio' | 'patient' | 'super_admin';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Sign in or Register with Google using Supabase Auth client library.
 * Persists the selected user type ('studio' | 'patient' | 'super_admin') and mode ('login' | 'register')
 * so after OAuth redirect the application identifies, routes, and requests relevant data.
 */
export async function signInWithGoogleSupabase(
  userType: UserType = 'studio',
  mode: 'login' | 'register' = 'login'
) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prismal_supabase_user_type', userType);
      localStorage.setItem('prismal_auth_mode', mode);
      localStorage.setItem(
        'prismal_auth_target_role',
        userType === 'patient' ? 'patient' : userType === 'super_admin' ? 'super_admin' : 'studio_admin'
      );
    }

    const redirectTo = typeof window !== 'undefined'
      ? (window.location.origin.endsWith('/') ? window.location.origin : `${window.location.origin}/`)
      : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account consent',
        },
      },
    });

    if (error) {
      console.error('[Supabase Auth] OAuth Error:', error.message);
      return { success: false, error: error.message };
    }

    if (data?.url && typeof window !== 'undefined') {
      const inIframe = window.self !== window.top;
      if (inIframe) {
        // In iframe environment (Cloud Run / AI Studio preview), opening inside iframe gets blocked by Google's X-Frame-Options: SAMEORIGIN.
        // Therefore, open the official classic Google Login window centered on screen!
        const width = 520;
        const height = 640;
        const left = Math.max(0, Math.round(window.screen.width / 2 - width / 2));
        const top = Math.max(0, Math.round(window.screen.height / 2 - height / 2));
        const popup = window.open(
          data.url,
          'GoogleAuthPopup',
          `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,scrollbars=yes`
        );
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // If popup was blocked, open in new tab
          window.open(data.url, '_blank');
        } else {
          // Monitor popup closure to immediately check and sync session in main window
          const checkTimer = setInterval(async () => {
            try {
              if (popup.closed) {
                clearInterval(checkTimer);
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  window.postMessage({
                    type: 'PRISMAL_OAUTH_SUCCESS',
                    session,
                    user: session.user,
                    email: session.user.email,
                  }, '*');
                }
              }
            } catch {
              clearInterval(checkTimer);
            }
          }, 350);
        }
      } else {
        // Direct browser redirect to classic Google screen!
        window.location.href = data.url;
      }
    }

    return { success: true, data, url: data?.url };
  } catch (err: any) {
    console.error('[Google Auth] Unexpected Error:', err);
    return { success: false, error: err?.message || 'Errore durante l\'autenticazione con Google' };
  }
}

/**
 * Get current Supabase session and user details
 */
export async function getSupabaseCurrentUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    return {
      session,
      user: session.user,
      email: session.user.email || '',
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || 'Utente',
      avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
    };
  } catch {
    return null;
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOutSupabase() {
  try {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prismal_supabase_user_type');
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Send Email OTP via Supabase Auth (Zero SMTP setup required!)
 */
export async function sendSupabaseEmailOtp(email: string) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.warn('[Supabase Auth] Email OTP error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Errore invio OTP email con Supabase' };
  }
}

/**
 * Verify Email OTP Token with Supabase Auth
 */
export async function verifySupabaseEmailOtp(email: string, token: string) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, session: data.session, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Codice OTP non valido o scaduto' };
  }
}

/**
 * Upload an image or document to Supabase Storage ('prismal-media' bucket)
 */
export async function uploadFileToSupabaseStorage(
  file: File | Blob,
  fileName?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const name = fileName || (file instanceof File ? file.name : `upload-${Date.now()}.png`);
    const cleanPath = `uploads/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload via client SDK
    const { error } = await supabase.storage
      .from('prismal-media')
      .upload(cleanPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('[Supabase Storage] Client upload error:', error.message);
      // Try backend proxy upload
      const formData = new FormData();
      formData.append('file', file, name);
      const res = await fetch('/api/supabase/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.publicUrl) {
        return { success: true, url: data.publicUrl };
      }
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage.from('prismal-media').getPublicUrl(cleanPath);
    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Errore caricamento file su Supabase' };
  }
}

/**
 * Fetch real-time health and connection status of Supabase and Twilio
 */
export async function fetchSupabaseAndTwilioStatus() {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Impossibile contattare il server Supabase',
    };
  }
}

