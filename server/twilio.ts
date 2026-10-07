import dotenv from 'dotenv';

dotenv.config();

export interface TwilioSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: number;
  simulated?: boolean;
  status: string;
}

/**
 * Normalizes phone number to E.164 international format (default +39 for Italy)
 */
export function formatPhoneNumberE164(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9+]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.startsWith('00')) {
      clean = '+' + clean.slice(2);
    } else if (clean.startsWith('39') && clean.length > 9) {
      clean = '+' + clean;
    } else {
      clean = '+39' + clean;
    }
  }
  return clean;
}

/**
 * Sends a real SMS via Twilio REST API
 */
export async function sendTwilioSms(to: string, body: string, customFrom?: string): Promise<TwilioSendResult> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || 'AC6f93f426d54226c3df72d97f8783e27d').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || 'c858347a68e8a07db529d523a01a5926').trim();
  const from = customFrom || process.env.TWILIO_FROM || 'PRISMAL';

  if (!accountSid || !authToken) {
    return {
      success: false,
      error: 'Credenziali Twilio mancanti sul server',
      status: 'missing_credentials',
    };
  }

  const formattedTo = formatPhoneNumberE164(to);
  if (!formattedTo || formattedTo.length < 8) {
    return {
      success: false,
      error: `Numero destinatario non valido: ${to}`,
      status: 'invalid_recipient',
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', from);
  params.append('Body', body);

  try {
    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (res.ok) {
      return {
        success: true,
        messageId: data.sid,
        status: data.status || 'queued',
      };
    } else {
      console.warn('[Twilio API Error]:', data.code, data.message);
      return {
        success: false,
        code: data.code,
        error: data.message || `Errore Twilio HTTP ${res.status}`,
        status: 'failed',
      };
    }
  } catch (err: any) {
    console.error('[Twilio Network Error]:', err);
    return {
      success: false,
      error: err?.message || 'Errore di rete durante la connessione a Twilio',
      status: 'network_error',
    };
  }
}

/**
 * Checks Twilio Account status and configuration
 */
export async function getTwilioAccountDetails() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || 'AC6f93f426d54226c3df72d97f8783e27d').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || 'c858347a68e8a07db529d523a01a5926').trim();

  if (!accountSid || !authToken) {
    return { configured: false, error: 'Credenziali non configurate' };
  }

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const [accRes, numRes] = await Promise.all([
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        headers: { 'Authorization': authHeader },
      }),
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
        headers: { 'Authorization': authHeader },
      }),
    ]);

    const accData = await accRes.json();
    const numData = await numRes.json();

    if (!accRes.ok) {
      return { configured: false, error: accData.message || 'Errore autenticazione Twilio' };
    }

    return {
      configured: true,
      accountSid,
      friendlyName: accData.friendly_name,
      status: accData.status,
      type: accData.type,
      activeNumbers: (numData.incoming_phone_numbers || []).map((n: any) => n.phone_number),
      defaultSender: process.env.TWILIO_FROM || 'PRISMAL',
    };
  } catch (err: any) {
    return { configured: false, error: err?.message || 'Errore connessione Twilio' };
  }
}
