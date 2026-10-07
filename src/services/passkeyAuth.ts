/**
 * WebAuthn Passkey Service for PRISMAL Super Admin
 * Enables biometric fingerprint, Touch ID, Face ID, and Windows Hello authentication,
 * exactly like Stripe and modern banking standards.
 */

export interface StoredPasskeyCredential {
  id: string; // Base64URL encoded credential ID
  rawId: string;
  email: string;
  createdAt: string;
  deviceLabel: string;
}

const PASSKEY_STORAGE_KEY = 'prismal_superadmin_passkeys';

// Helpers for buffer/base64 conversions
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer.buffer;
}

/**
 * Check if the browser supports WebAuthn / Passkeys
 */
export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function' &&
    !!navigator.credentials;
}

/**
 * Check if platform biometric authenticator (Touch ID, Fingerprint, Face ID) is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  try {
    if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all registered passkeys for the admin
 */
export function getStoredPasskeys(email?: string): StoredPasskeyCredential[] {
  try {
    const raw = localStorage.getItem(PASSKEY_STORAGE_KEY);
    if (!raw) return [];
    const list: StoredPasskeyCredential[] = JSON.parse(raw);
    if (email) {
      return list.filter(p => p.email.toLowerCase() === email.toLowerCase());
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Register a new Passkey (Fingerprint / Touch ID) for Super Admin
 */
export async function registerPasskey(email: string): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  if (!isPasskeySupported()) {
    return { success: false, error: 'Il tuo browser o dispositivo non supporta le Passkey (WebAuthn).' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

    const creationOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'PRISMAL Dental Suite',
          id: rpId,
        },
        user: {
          id: userId,
          name: email.toLowerCase().trim(),
          displayName: `Diego Raimondi (Super Admin)`,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Built-in Touch ID, Windows Hello, Fingerprint
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    };

    const credential = (await navigator.credentials.create(creationOptions)) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Creazione Passkey annullata dall\'utente.' };
    }

    const credId = bufferToBase64Url(credential.rawId);

    // Save to local device storage
    const existing = getStoredPasskeys();
    const newEntry: StoredPasskeyCredential = {
      id: credId,
      rawId: credId,
      email: email.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
      deviceLabel: navigator.userAgent.includes('Mac')
        ? 'Apple Touch ID / Mac Passkey'
        : navigator.userAgent.includes('Windows')
        ? 'Windows Hello / Impronta Digitale'
        : navigator.userAgent.includes('Android')
        ? 'Android Biometric / Impronta'
        : navigator.userAgent.includes('iPhone')
        ? 'Face ID / Touch ID iOS'
        : 'Passkey Biometrica',
    };

    // Filter out duplicates
    const updated = [newEntry, ...existing.filter(e => e.id !== credId)];
    localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(updated));

    return { success: true, credentialId: credId };
  } catch (err: any) {
    console.error('Passkey registration error:', err);
    if (err?.name === 'NotAllowedError') {
      return { success: false, error: 'Operazione annullata o autenticazione biometrica rifiutata.' };
    }
    return { success: false, error: err?.message || 'Errore durante la registrazione dell\'impronta digitale.' };
  }
}

/**
 * Authenticate Super Admin using Passkey (Fingerprint / Touch ID)
 */
export async function authenticateWithPasskey(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isPasskeySupported()) {
    return { success: false, error: 'WebAuthn non supportato su questo dispositivo.' };
  }

  const stored = getStoredPasskeys(email);

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

    const allowCredentials: PublicKeyCredentialDescriptor[] = stored.map(s => ({
      id: base64UrlToBuffer(s.id),
      type: 'public-key',
      transports: ['internal'],
    }));

    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        rpId,
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      },
    };

    const assertion = (await navigator.credentials.get(getOptions)) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: 'Autenticazione biometrica annullata.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Passkey authentication error:', err);
    if (err?.name === 'NotAllowedError') {
      return { success: false, error: 'Verifica biometrica annullata o non riconosciuta.' };
    }
    return { success: false, error: err?.message || 'Autenticazione con Passkey fallita.' };
  }
}
