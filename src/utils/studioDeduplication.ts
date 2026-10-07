import { Studio } from '../types';

/**
 * Normalizes Italian and international phone numbers for strict uniqueness comparison.
 * Removes country prefix (+39/39), spaces, dashes, parentheses and non-numeric symbols.
 */
export function normalizeStudioPhone(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('39') && clean.length > 9) {
    clean = clean.slice(2);
  }
  return clean;
}

/**
 * Normalizes studio email addresses (lowercase, trimmed).
 */
export function normalizeStudioEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Strict deduplication of studios.
 * Guarantees that:
 * 1. No two studios share the same phone number
 * 2. No two studios share the same email address
 * 3. No two studios share the same ID
 * When duplicate records exist (e.g. 'prova 5' with multiple IDs), they are merged into
 * a single canonical record preserving the most active subscription and credentials.
 */
export function deduplicateStudios(studios: Studio[]): Studio[] {
  if (!Array.isArray(studios)) return [];

  const result: Studio[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (const studio of studios) {
    if (!studio || !studio.id) continue;

    const emailNorm = normalizeStudioEmail(studio.email);
    const phoneNorm = normalizeStudioPhone(studio.phone);

    const isDuplicate =
      seenIds.has(studio.id) ||
      (emailNorm !== '' && seenEmails.has(emailNorm)) ||
      (phoneNorm.length >= 6 && seenPhones.has(phoneNorm));

    if (isDuplicate) {
      // Find the existing studio to merge attributes
      const existingIdx = result.findIndex(
        ex =>
          ex.id === studio.id ||
          (emailNorm !== '' && normalizeStudioEmail(ex.email) === emailNorm) ||
          (phoneNorm.length >= 6 && normalizeStudioPhone(ex.phone) === phoneNorm)
      );

      if (existingIdx !== -1) {
        const existing = result[existingIdx];
        // Merge attributes prioritizing active subscription and non-empty fields
        const preferredStatus =
          existing.status === 'active_pro' || studio.status === 'active_pro'
            ? 'active_pro'
            : existing.status === 'approved_demo' || studio.status === 'approved_demo'
            ? 'approved_demo'
            : existing.status || studio.status;

        const canonicalId =
          existing.id === 'studio-1790169305515' || studio.id === 'studio-1790169305515'
            ? 'studio-1790169305515'
            : existing.id || studio.id;

        result[existingIdx] = {
          ...studio,
          ...existing,
          id: canonicalId,
          status: preferredStatus,
          subscription: existing.subscription || studio.subscription,
          phone: existing.phone || studio.phone,
          email: existing.email || studio.email,
          password: existing.password || studio.password,
        };
      }
      continue;
    }

    seenIds.add(studio.id);
    if (emailNorm) seenEmails.add(emailNorm);
    if (phoneNorm.length >= 6) seenPhones.add(phoneNorm);
    result.push(studio);
  }

  return result;
}

/**
 * Checks if a candidate studio phone or email is already in use by another studio.
 */
export function findDuplicateStudio(
  studios: Studio[],
  candidate: { email?: string; phone?: string; excludeId?: string }
): { isDuplicate: boolean; field?: 'email' | 'phone'; existingStudio?: Studio } {
  const normEmail = normalizeStudioEmail(candidate.email);
  const normPhone = normalizeStudioPhone(candidate.phone);

  for (const s of studios) {
    if (candidate.excludeId && s.id === candidate.excludeId) continue;

    if (normEmail && normalizeStudioEmail(s.email) === normEmail) {
      return { isDuplicate: true, field: 'email', existingStudio: s };
    }

    if (normPhone && normPhone.length >= 6 && normalizeStudioPhone(s.phone) === normPhone) {
      return { isDuplicate: true, field: 'phone', existingStudio: s };
    }
  }

  return { isDuplicate: false };
}
