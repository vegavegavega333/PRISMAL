import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { formatPhoneNumberE164, sendTwilioWhatsApp } from './twilio';

dotenv.config();

export interface WhatsAppGatewayConfig {
  provider: 'meta_cloud' | 'evolution_api' | 'twilio' | 'simulation';
  senderName: string; // e.g. "PRISMAL - Studio Odontoiatrico"
  senderNumber: string; // Dedicated non-personal number e.g. "+39 02 1234567" or "+1 415 523 8886"
  
  // Meta WhatsApp Cloud API credentials (Free 1,000 conversations/mo)
  metaCloud: {
    phoneNumberId: string;
    accessToken: string;
    wabaId?: string;
    verifyToken: string;
  };

  // Evolution API credentials (GitHub Open Source multi-device QR code)
  evolutionApi: {
    apiUrl: string; // e.g. "https://api.my-evolution.up.railway.app" or "http://localhost:8080"
    apiKey: string;
    instanceName: string; // e.g. "prismal-studio"
  };

  // Twilio credentials
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
}

const CONFIG_FILE_PATH = path.resolve(process.cwd(), '.prismal_data', 'whatsapp_config.json');

// Default initial config with sensible presets
const DEFAULT_CONFIG: WhatsAppGatewayConfig = {
  provider: 'meta_cloud',
  senderName: 'PRISMAL - Segreteria Odontoiatrica',
  senderNumber: '+39 02 8900 1234',
  metaCloud: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_CLOUD_API_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'prismal_webhook_secret_2026',
  },
  evolutionApi: {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.EVOLUTION_INSTANCE || 'prismal-bot',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'AC6f93f426d54226c3df72d97f8783e27d',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'c858347a68e8a07db529d523a01a5926',
    fromNumber: process.env.TWILIO_WHATSAPP_FROM || '+14155238886',
  },
};

/**
 * Loads current WhatsApp gateway configuration
 */
export function getWhatsAppConfig(): WhatsAppGatewayConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('[WhatsApp Config Read Error]:', err);
  }
  return DEFAULT_CONFIG;
}

/**
 * Saves WhatsApp gateway configuration
 */
export function saveWhatsAppConfig(newConfig: Partial<WhatsAppGatewayConfig>): WhatsAppGatewayConfig {
  try {
    const current = getWhatsAppConfig();
    const merged: WhatsAppGatewayConfig = {
      ...current,
      ...newConfig,
      metaCloud: { ...current.metaCloud, ...(newConfig.metaCloud || {}) },
      evolutionApi: { ...current.evolutionApi, ...(newConfig.evolutionApi || {}) },
      twilio: { ...current.twilio, ...(newConfig.twilio || {}) },
    };

    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.error('[WhatsApp Config Save Error]:', err);
    throw err;
  }
}

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'meta_cloud' | 'evolution_api' | 'twilio' | 'simulation';
  messageId?: string;
  status: string;
  error?: string;
  details?: any;
}

/**
 * Sends a message automatically via Meta WhatsApp Cloud API (Graph API)
 */
export async function sendMetaCloudWhatsApp(
  toPhone: string,
  messageText: string,
  overrideConfig?: Partial<WhatsAppGatewayConfig['metaCloud']>
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig().metaCloud;
  const phoneNumberId = overrideConfig?.phoneNumberId || config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = overrideConfig?.accessToken || config.accessToken || process.env.WHATSAPP_CLOUD_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return {
      success: false,
      provider: 'meta_cloud',
      status: 'missing_credentials',
      error: 'Phone Number ID o Access Token Meta non configurati. Inseriscili nel pannello impostazioni WhatsApp di PRISMAL.',
    };
  }

  // Clean phone number (must be international without leading + for Meta)
  const cleanPhone = toPhone.replace(/[^0-9]/g, '');
  const recipient = cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`;

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: true,
          body: messageText,
        },
      }),
    });

    const data = await res.json();

    if (res.ok && data.messages?.[0]?.id) {
      return {
        success: true,
        provider: 'meta_cloud',
        messageId: data.messages[0].id,
        status: 'sent',
        details: data,
      };
    } else {
      const errorMsg = data.error?.message || `Meta Cloud API HTTP ${res.status}`;
      return {
        success: false,
        provider: 'meta_cloud',
        status: 'failed',
        error: errorMsg,
        details: data,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      provider: 'meta_cloud',
      status: 'network_error',
      error: err?.message || 'Errore di connessione a Meta Graph API',
    };
  }
}

/**
 * Sends a message automatically via Evolution API (GitHub open-source agent)
 */
export async function sendEvolutionWhatsApp(
  toPhone: string,
  messageText: string,
  overrideConfig?: Partial<WhatsAppGatewayConfig['evolutionApi']>
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig().evolutionApi;
  const rawUrl = overrideConfig?.apiUrl || config.apiUrl || 'http://localhost:8080';
  const apiKey = overrideConfig?.apiKey || config.apiKey;
  const instance = overrideConfig?.instanceName || config.instanceName || 'prismal-bot';

  const baseUrl = rawUrl.replace(/\/+$/, '');
  const cleanPhone = toPhone.replace(/[^0-9]/g, '');
  const recipient = cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`;

  if (!apiKey) {
    return {
      success: false,
      provider: 'evolution_api',
      status: 'missing_credentials',
      error: 'API Key di Evolution API mancante. Inseriscila nel configuratore di PRISMAL.',
    };
  }

  const endpoint = `${baseUrl}/message/sendText/${instance}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: recipient,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: true,
        },
        textMessage: {
          text: messageText,
        },
      }),
    });

    const data = await res.json();
    if (res.ok) {
      return {
        success: true,
        provider: 'evolution_api',
        messageId: data.key?.id || data.messageId || 'evo-' + Date.now(),
        status: 'sent',
        details: data,
      };
    } else {
      return {
        success: false,
        provider: 'evolution_api',
        status: 'failed',
        error: data.message || `Evolution API HTTP ${res.status}`,
        details: data,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      provider: 'evolution_api',
      status: 'network_error',
      error: `Impossibile raggiungere Evolution API su ${baseUrl}: ${err?.message}`,
    };
  }
}

/**
 * High-level unified dispatcher that handles 100% background automated sending
 */
export async function dispatchAutomatedWhatsApp(
  toPhone: string,
  messageText: string,
  forcedProvider?: WhatsAppGatewayConfig['provider']
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  const provider = forcedProvider || config.provider;

  // 1. Meta WhatsApp Cloud API
  if (provider === 'meta_cloud' && config.metaCloud.accessToken && config.metaCloud.phoneNumberId) {
    return await sendMetaCloudWhatsApp(toPhone, messageText);
  }

  // 2. Evolution API (GitHub)
  if (provider === 'evolution_api' && config.evolutionApi.apiKey) {
    return await sendEvolutionWhatsApp(toPhone, messageText);
  }

  // 3. Twilio WhatsApp
  if (provider === 'twilio' || (config.twilio.accountSid && config.twilio.authToken)) {
    const twRes = await sendTwilioWhatsApp(toPhone, messageText, config.twilio.fromNumber);
    return {
      success: twRes.success,
      provider: 'twilio',
      messageId: twRes.messageId,
      status: twRes.status,
      error: twRes.error,
    };
  }

  // 4. If credentials are not yet entered, simulate and log clearly
  return {
    success: true,
    provider: 'simulation',
    messageId: 'sim-' + Date.now(),
    status: 'simulated',
    details: {
      note: 'Gateway non configurato. I messaggi sono simulati e registrati nel log di audit.',
    },
  };
}
