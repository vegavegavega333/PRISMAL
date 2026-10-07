/**
 * Real Banking & Card Validation Utilities
 * Implements standard Luhn Modulo-10 algorithm, Card Brand detection,
 * Expiry validation, and Italian Fiscal / VAT format validation.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'postepay' | 'maestro' | 'unknown';

export function detectCardBrand(cardNumber: string): CardBrand {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) {
    // Check if PostePay Evolution / standard (often starts with 4023, 4030, 4230, etc.)
    if (/^4023|^4030|^4230|^4267|^4934/.test(clean)) return 'postepay';
    return 'visa';
  }
  if (/^(5[1-5]|2[2-7])/.test(clean)) {
    if (/^5355|^5356/.test(clean)) return 'postepay';
    return 'mastercard';
  }
  if (/^3[47]/.test(clean)) {
    return 'amex';
  }
  if (/^(50|5[6-8]|6)/.test(clean)) {
    return 'maestro';
  }
  return 'unknown';
}

/**
 * Standard ISO/IEC 7812 Luhn Algorithm (Mod 10 Check)
 * Used by all major banks and card issuers worldwide to prevent fake numbers.
 */
export function validateLuhnCardNumber(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function validateCardExpiry(expiry: string): { isValid: boolean; error?: string } {
  const clean = expiry.replace(/\D/g, '');
  if (clean.length !== 4) {
    return { isValid: false, error: 'Formato scadenza non valido (usa MM/AA).' };
  }

  const month = parseInt(clean.substring(0, 2), 10);
  const yearTwoDigits = parseInt(clean.substring(2, 4), 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Mese di scadenza non valido (01-12).' };
  }

  const now = new Date();
  const currentYearTwoDigits = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1; // 1-indexed

  if (yearTwoDigits < currentYearTwoDigits) {
    return { isValid: false, error: 'La carta inserita risulta scaduta.' };
  }

  if (yearTwoDigits === currentYearTwoDigits && month < currentMonth) {
    return { isValid: false, error: 'La carta inserita risulta scaduta questo mese.' };
  }

  if (yearTwoDigits > currentYearTwoDigits + 20) {
    return { isValid: false, error: 'Anno di scadenza troppo lontano nel tempo.' };
  }

  return { isValid: true };
}

export function validateCardCvc(cvc: string, brand: CardBrand): boolean {
  const clean = cvc.replace(/\D/g, '');
  if (brand === 'amex') {
    return clean.length === 4;
  }
  return clean.length === 3;
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validateItalianVat(vat: string): boolean {
  const clean = vat.replace(/[\s-]/g, '').toUpperCase();
  const rawNumber = clean.startsWith('IT') ? clean.substring(2) : clean;
  if (!/^\d{11}$/.test(rawNumber)) return false;

  // Luhn check for Italian VAT
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(rawNumber.charAt(i), 10);
    if (i % 2 !== 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(rawNumber.charAt(10), 10);
}
