import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Live Stripe credentials
const DEFAULT_STRIPE_PUB = 'pk_live_51UMolsGZdInBu3L6hnCFD4UKP4wk41WFvpYz4EF6AE9utRMVX8jUuvpEDWQrzjgOitoCse3vaYDFA1qcSjSTzWUC00gWdanaaf';
const DEFAULT_PAYPAL_CLIENT_ID = 'AQKfg-vXKYLiOA0oMsKgVPFwJAPVk5wIrP-hHCLyC0-wJZQP5-zJVPLx0293EW_fG6M9mdDoCnV0Zfxa';
const DEFAULT_PAYPAL_SECRET = 'EEAZgISLy1_4SAfuU8Edr2gLwmqZx3gn6wtsRzl39Kbvhhjg38_Kjox1EBLvByC8ItHmEUS2m1AtkfKY';
const DEFAULT_STRIPE_LINK = 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00';

let cachedPayPalToken: { token: string; expiresAt: number; baseUrl: string } | null = null;

/**
 * Returns a configured Stripe instance using available Secret/Restricted Key.
 */
export function getStripeInstance(customKey?: string): Stripe | null {
  const key = (
    customKey ||
    process.env.STRIPE_SECRET_KEY ||
    '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'
  ).trim();

  if (!key || (!key.startsWith('sk_') && !key.startsWith('rk_'))) {
    return null;
  }

  try {
    return new Stripe(key, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  } catch (err) {
    console.error('[Payments] Errore inizializzazione Stripe:', err);
    return null;
  }
}

/**
 * Creates a Stripe PaymentIntent for Payment Element checkout
 */
export async function createStripePaymentIntent(params: {
  amountEur: number;
  studioId?: string;
  studioName?: string;
  studioEmail?: string;
  planId?: string;
  appointmentId?: string;
  description?: string;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripeInstance();
  if (!stripe) {
    throw new Error('Gateway Stripe non configurato sul server');
  }

  const amountCents = Math.max(100, Math.round(params.amountEur * 100));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    description: params.description || `PRISMAL • Pagamento ${params.planId || 'Servizio Odontoiatrico'}`,
    receipt_email: params.studioEmail || undefined,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      studioId: params.studioId || '',
      studioName: params.studioName || '',
      planId: params.planId || '',
      appointmentId: params.appointmentId || '',
      ...(params.metadata || {}),
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: params.amountEur,
    currency: 'eur',
  };
}

/**
 * Authenticates with PayPal REST API using Client ID + Secret.
 * Tries sandbox first if configured or fallback, otherwise live.
 */
export async function getPayPalAccessToken(customClientId?: string, customSecret?: string): Promise<{ token: string; baseUrl: string }> {
  const now = Date.now();
  if (cachedPayPalToken && cachedPayPalToken.expiresAt > now + 60000) {
    return { token: cachedPayPalToken.token, baseUrl: cachedPayPalToken.baseUrl };
  }

  const clientId = (customClientId || process.env.PAYPAL_CLIENT_ID || DEFAULT_PAYPAL_CLIENT_ID).trim();
  const secret = (customSecret || process.env.PAYPAL_SECRET || DEFAULT_PAYPAL_SECRET).trim();

  if (!clientId || !secret) {
    throw new Error('Credenziali PayPal mancanti sul server');
  }

  const authHeader = 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64');
  const preferredMode = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';

  const urlsToTry = preferredMode === 'live'
    ? ['https://api-m.paypal.com', 'https://api-m.sandbox.paypal.com']
    : ['https://api-m.sandbox.paypal.com', 'https://api-m.paypal.com'];

  let lastError: any = null;

  for (const baseUrl of urlsToTry) {
    try {
      const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (res.ok) {
        const data = await res.json();
        const expiresIn = (data.expires_in || 3600) * 1000;
        cachedPayPalToken = {
          token: data.access_token,
          expiresAt: now + expiresIn,
          baseUrl,
        };
        return { token: data.access_token, baseUrl };
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError = errData;
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw new Error(`Autenticazione PayPal fallita: ${JSON.stringify(lastError?.error_description || lastError?.message || lastError)}`);
}

/**
 * Creates a PayPal Order via REST API v2
 */
export async function createPayPalOrder(params: {
  amountEur: number;
  description?: string;
  customId?: string;
  referenceId?: string;
}) {
  const { token, baseUrl } = await getPayPalAccessToken();
  const valueFormatted = (Math.max(1, params.amountEur)).toFixed(2);

  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId || `prismal-${Date.now()}`,
          description: params.description || 'PRISMAL Dental Cloud',
          custom_id: params.customId || '',
          amount: {
            currency_code: 'EUR',
            value: valueFormatted,
          },
        },
      ],
      application_context: {
        brand_name: 'PRISMAL Dental Cloud',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    }),
  });

  const orderData = await res.json();
  if (!res.ok) {
    console.error('[Payments] Errore creazione ordine PayPal:', orderData);
    throw new Error(orderData.message || 'Errore nella creazione ordine PayPal');
  }

  return {
    orderId: orderData.id,
    status: orderData.status,
    links: orderData.links,
  };
}

/**
 * Captures an approved PayPal Order via REST API v2
 */
export async function capturePayPalOrder(orderId: string) {
  const { token, baseUrl } = await getPayPalAccessToken();

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const captureData = await res.json();
  if (!res.ok) {
    console.error('[Payments] Errore cattura ordine PayPal:', captureData);
    throw new Error(captureData.message || captureData.details?.[0]?.description || 'Errore cattura ordine PayPal');
  }

  const purchaseUnit = captureData.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];
  const payer = captureData.payer;

  return {
    success: captureData.status === 'COMPLETED',
    orderId: captureData.id,
    captureId: capture?.id || captureData.id,
    status: captureData.status,
    amount: parseFloat(capture?.amount?.value || '0'),
    currency: capture?.amount?.currency_code || 'EUR',
    payerEmail: payer?.email_address,
    payerName: payer?.name?.given_name ? `${payer.name.given_name} ${payer.name.surname || ''}`.trim() : undefined,
    customId: purchaseUnit?.custom_id,
    raw: captureData,
  };
}

/**
 * Verifies a Stripe PaymentIntent directly from Stripe API
 */
export async function verifyStripePaymentIntent(paymentIntentId: string) {
  const stripe = getStripeInstance();
  if (!stripe) {
    throw new Error('Gateway Stripe non configurato sul server');
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    success: pi.status === 'succeeded',
    status: pi.status,
    amount: (pi.amount || 0) / 100,
    currency: pi.currency,
    paymentIntentId: pi.id,
    metadata: pi.metadata,
    customerEmail: pi.receipt_email,
  };
}

/**
 * Retrieves PayPal order details from PayPal REST API v2
 */
export async function getPayPalOrderDetails(orderId: string) {
  const { token, baseUrl } = await getPayPalAccessToken();

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const orderData = await res.json();
  if (!res.ok) {
    throw new Error(orderData.message || 'Errore nel recupero dell\'ordine PayPal');
  }

  return {
    orderId: orderData.id,
    status: orderData.status,
    amount: parseFloat(orderData.purchase_units?.[0]?.amount?.value || '0'),
    currency: orderData.purchase_units?.[0]?.amount?.currency_code || 'EUR',
    isCompleted: orderData.status === 'COMPLETED',
  };
}

/**
 * Returns safe public client-side keys and configuration.
 * Never leaks server secret keys.
 */
export function getSafePublicPaymentConfig(serverConfig?: any) {
  return {
    stripePublishableKey:
      serverConfig?.stripePublishableKey ||
      process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
      DEFAULT_STRIPE_PUB,
    paypalClientId:
      serverConfig?.paypalClientId ||
      process.env.VITE_PAYPAL_CLIENT_ID ||
      DEFAULT_PAYPAL_CLIENT_ID,
    stripePaymentLinkUrl:
      serverConfig?.stripePaymentLinkUrl ||
      process.env.STRIPE_SUBSCRIPTION_LINK ||
      DEFAULT_STRIPE_LINK,
    stripeEnabled: serverConfig?.stripeEnabled !== false,
    paypalEnabled: serverConfig?.paypalEnabled !== false,
    bankBeneficiary: serverConfig?.bankBeneficiary || 'Diego Raimondi - PRISMAL Cloud Suite',
    bankIban: serverConfig?.bankIban || '',
    bankSwiftBic: serverConfig?.bankSwiftBic || '',
    bankName: serverConfig?.bankName || '',
    bankPaymentInstructions: serverConfig?.bankPaymentInstructions || '',
  };
}
