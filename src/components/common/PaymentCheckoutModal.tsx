import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PlanType, AddonSlotPackage, PlatformTransaction, SponsorshipPackage } from '../../types';
import {
  PLAN_TIERS_CONFIG,
  DEFAULT_SUPERADMIN_PAYMENT_CONFIG,
  PRISMAL_PRIME_PRICE_MONTHLY,
  PRISMAL_PRIME_PRICE_ANNUAL_MONTHLY,
} from '../../data/planTierDefinitions';
import {
  ShieldCheck,
  CreditCard,
  Building,
  CheckCircle2,
  X,
  Lock,
  ArrowRight,
  FileText,
  Download,
  AlertTriangle,
  Loader2,
  Sparkles,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Settings,
  Wallet,
  Globe,
} from 'lucide-react';
import { loadScript } from '@paypal/paypal-js';
import { StripePaymentElementForm } from './StripePaymentElementForm';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlanId?: PlanType;
  isTrialVerification?: boolean;
  targetAddon?: AddonSlotPackage;
  targetSponsorship?: SponsorshipPackage;
  billingCycle?: 'monthly' | 'annual';
  initialPaymentMethod?: 'stripe' | 'paypal' | 'bank_transfer' | 'google_pay' | 'credit_card';
  overrideStudio?: any;
  onPaymentSuccess?: (transaction: PlatformTransaction) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  targetPlanId,
  isTrialVerification,
  targetAddon,
  targetSponsorship,
  billingCycle = 'monthly',
  initialPaymentMethod = 'stripe',
  overrideStudio,
  onPaymentSuccess,
}) => {
  const { activeStudio, superAdminPaymentConfig, processStudioPayment, setCurrentRole } = useApp();
  const currentStudio = overrideStudio || activeStudio;

  const normalizeMethod = (m?: string): 'stripe' | 'paypal' | 'bank_transfer' => {
    if (m === 'paypal') return 'paypal';
    if (m === 'bank_transfer') return 'bank_transfer';
    return 'stripe';
  };

  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'bank_transfer'>(normalizeMethod(initialPaymentMethod));
  const [stripeSubTab, setStripeSubTab] = useState<'card_element' | 'hosted_checkout'>('card_element');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<PlatformTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bank Transfer receipt & CRO
  const [bankReceiptNotes, setBankReceiptNotes] = useState('');
  const [paypalTransactionId, setPaypalTransactionId] = useState('');
  const [stripeSessionIdInput, setStripeSessionIdInput] = useState('');
  const [showStripeSessionVerify, setShowStripeSessionVerify] = useState(false);

  // Fiscal / Invoicing fields
  const [vatNumber, setVatNumber] = useState('');
  const [sdiCode, setSdiCode] = useState('0000000');

  // PayPal buttons mount ref
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPaypalSdkLoaded, setIsPaypalSdkLoaded] = useState(false);
  const [paypalLoadError, setPaypalLoadError] = useState<string | null>(null);

  const config = superAdminPaymentConfig || DEFAULT_SUPERADMIN_PAYMENT_CONFIG;

  // Sync initial payment method when opened and check for Stripe redirect session_id
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod(normalizeMethod(initialPaymentMethod));
      setErrorMessage(null);

      const params = new URLSearchParams(window.location.search);
      const sessId = params.get('session_id');
      if (sessId && sessId.startsWith('cs_')) {
        handleVerifyStripeSession(sessId);
      }
    }
  }, [isOpen, initialPaymentMethod]);

  // Lock body and html scroll and handle Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Determine item and pricing
  let itemName = '';
  let itemDescription = '';
  let netPrice = 0;
  let isRecurring = false;

  const isTrial = isTrialVerification || targetPlanId === 'trial_30d';

  if (isTrial) {
    isRecurring = true;
    itemName = '30 Giorni di Prova Gratuita • PRISMAL Prime';
    netPrice = 0;
    itemDescription = `Verifica con autorizzazione antifrode a 0,00€ (nessun addebito odierno). Accesso completo alla piattaforma cloud. Tra 30 giorni rinnovo a €${PRISMAL_PRIME_PRICE_MONTHLY}/mese, disattivabile prima della scadenza con 1 click.`;
  } else if (targetPlanId) {
    const tier = PLAN_TIERS_CONFIG[targetPlanId] || PLAN_TIERS_CONFIG.prismal_prime;
    isRecurring = true;
    itemName = `Abbonamento ${tier.name}`;
    if (billingCycle === 'annual') {
      netPrice = tier.priceAnnualMonthly * 12;
      itemDescription = `Licenza annuale (€${tier.priceAnnualMonthly}/mese con fatturazione annuale) • Risparmio di oltre 360€/anno`;
    } else {
      netPrice = tier.priceMonthly;
      itemDescription = `Abbonamento mensile ricorrente (€${tier.priceMonthly}/mese) • Rinnovo automatico disattivabile in qualsiasi momento con 1 click`;
    }
  } else if (targetAddon) {
    isRecurring = false;
    itemName = targetAddon.name;
    netPrice = targetAddon.price;
    itemDescription = `${targetAddon.description} • Attivazione immediata sul mese corrente`;
  } else if (targetSponsorship) {
    isRecurring = false;
    itemName = `Sponsorizzazione PRISMAL Search • ${targetSponsorship.name}`;
    netPrice = targetSponsorship.priceEnterpriseEur || targetSponsorship.priceProEur || targetSponsorship.priceEur;
    itemDescription = `Posizionamento garantito in cima ai risultati di ricerca per ${targetSponsorship.durationDays} giorni con badge In Evidenza • ${targetSponsorship.tagline}`;
  }

  const vatRate = config.fiscalTaxRate || 22;
  const vatAmount = isTrial ? 0 : Math.round(netPrice * (vatRate / 100) * 100) / 100;
  const totalAmount = isTrial ? 0 : Math.round((netPrice + vatAmount) * 100) / 100;

  // Real PayPal SDK Loader when client ID is provided
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'paypal') return;

    if (config.paypalClientId && config.paypalClientId.trim().length > 10) {
      let isMounted = true;
      setIsPaypalSdkLoaded(false);
      setPaypalLoadError(null);

      loadScript({
        clientId: config.paypalClientId.trim(),
        currency: 'EUR',
        intent: 'capture',
      })
        .then((paypal) => {
          if (!isMounted || !paypal || !paypal.Buttons) return;
          setIsPaypalSdkLoaded(true);

          if (paypalContainerRef.current) {
            paypalContainerRef.current.innerHTML = '';
            paypal.Buttons({
              createOrder: async (_data, actions) => {
                try {
                  const res = await fetch('/api/payments/paypal/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      amountEur: totalAmount > 0 ? totalAmount : 1,
                      description: itemName,
                      studioId: currentStudio.id,
                      planId: targetPlanId || 'prismal_prime',
                    }),
                  });
                  const json = await res.json();
                  if (json.success && json.orderId) {
                    return json.orderId;
                  }
                } catch (e) {
                  console.warn('[PayPal] Fallback creazione ordine client-side:', e);
                }

                return actions.order.create({
                  intent: 'CAPTURE',
                  purchase_units: [
                    {
                      amount: {
                        value: (totalAmount > 0 ? totalAmount : 1).toFixed(2),
                        currency_code: 'EUR',
                      },
                      description: itemName,
                    },
                  ],
                });
              },
              onApprove: async (data, actions) => {
                let capturedTx: any = null;
                try {
                  const res = await fetch('/api/payments/paypal/capture-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: data.orderID,
                      studioId: currentStudio.id,
                      planId: targetPlanId || 'prismal_prime',
                    }),
                  });
                  const json = await res.json();
                  if (json.success && json.transaction) {
                    capturedTx = json.transaction;
                    setCompletedTransaction(capturedTx);
                    if (onPaymentSuccess) onPaymentSuccess(capturedTx);
                    return;
                  }
                } catch (e) {
                  console.warn('[PayPal] Fallback cattura ordine client-side:', e);
                }

                if (actions.order) {
                  const captureDetails = await actions.order.capture();
                  const realOrderId = captureDetails.id;
                  const payerEmail = captureDetails.payer?.email_address || 'payer@paypal.com';

                  const tx = await processStudioPayment({
                    studioId: currentStudio.id,
                    studioName: currentStudio.name,
                    studioEmail: currentStudio.email,
                    studioVatOrFiscalCode: vatNumber.trim() || undefined,
                    type: isTrial ? 'trial_verification' : 'subscription_monthly',
                    planId: isTrial ? 'prismal_prime' : (targetPlanId || 'prismal_prime'),
                    amountNet: netPrice,
                    amountVat: vatAmount,
                    amountTotal: totalAmount,
                    paymentMethod: 'paypal',
                    paymentReference: `PAYPAL-${realOrderId}`,
                    status: 'completed',
                    notes: `Pagamento PayPal verificato (ID: ${realOrderId}, Payer: ${payerEmail})`,
                  });

                  setCompletedTransaction(tx);
                  if (onPaymentSuccess) onPaymentSuccess(tx);
                }
              },
              onError: (err) => {
                console.error('PayPal Smart Buttons error:', err);
                setPaypalLoadError('Si è verificato un errore durante la connessione con PayPal. Riprova.');
              },
            }).render(paypalContainerRef.current);
          }
        })
        .catch((err) => {
          console.warn('Could not load official PayPal SDK with configured client ID:', err);
          if (isMounted) {
            setPaypalLoadError('Impossibile inizializzare PayPal SDK. Verifica il Client ID nel pannello Super Admin.');
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, paymentMethod, config.paypalClientId, totalAmount, itemName]);

  if (!isOpen || !currentStudio) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Real Stripe Checkout execution
  const handleStripeCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    const directUrl = config.stripePaymentLinkUrl || 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00';

    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: currentStudio.id,
          planId: isTrial ? 'trial_30d' : (targetPlanId || 'prismal_prime'),
          billingCycle,
          returnUrl: window.location.origin + window.location.pathname,
        }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
        return;
      }

      if (directUrl) {
        window.location.href = directUrl;
        return;
      }

      if (data.notConfigured) {
        setErrorMessage(
          'Il gateway di pagamento Stripe non è ancora configurato con una chiave API o un link di pagamento attivo nel pannello Super Admin.'
        );
        return;
      }

      setErrorMessage(data.error || 'Errore nella connessione con il gateway di pagamento Stripe');
    } catch (err: any) {
      if (directUrl) {
        window.location.href = directUrl;
        return;
      }
      setErrorMessage(err?.message || 'Impossibile contattare il server dei pagamenti.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Strict verification of Stripe Checkout session directly against Stripe API
  const handleVerifyStripeSession = async (sessionIdToVerify?: string) => {
    const sId = (sessionIdToVerify || stripeSessionIdInput).trim();
    if (!sId) {
      setErrorMessage('Inserisci l\'ID della Sessione di Pagamento Stripe (es. cs_live_... o cs_test_...).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/payments/verify-checkout-session?session_id=${encodeURIComponent(sId)}`);
      const data = await res.json();

      if (!data.success || !data.transaction) {
        setErrorMessage(data.message || data.error || 'La sessione non risulta completata o pagata su Stripe. Il piano non è stato attivato.');
        return;
      }

      setCompletedTransaction(data.transaction);
      if (onPaymentSuccess) onPaymentSuccess(data.transaction);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore durante la verifica con il gateway Stripe.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Bank Transfer (Bonifico SEPA)
  const handleSubmitBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.bankIban || config.bankIban.trim().length < 10) {
      setErrorMessage(
        'Le coordinate bancarie (IBAN) non sono state ancora configurate dal Super Admin. Inseriscile nel pannello Super Admin > Gateway Pagamenti.'
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const orderRef = `BON-${(currentStudio.slug || 'studio').toUpperCase()}-${Date.now().toString().slice(-6)}`;

    try {
      const transaction: PlatformTransaction = await processStudioPayment({
        studioId: currentStudio.id,
        studioName: currentStudio.name,
        studioEmail: currentStudio.email,
        studioVatOrFiscalCode: vatNumber.trim() || undefined,
        type: isTrial
          ? 'trial_verification'
          : targetPlanId
          ? billingCycle === 'annual'
            ? 'subscription_annual'
            : 'subscription_monthly'
          : targetAddon
          ? targetAddon.type === 'sms'
            ? 'addon_sms'
            : 'addon_slots'
          : 'sponsorship',
        planId: isTrial ? 'prismal_prime' : (targetPlanId || 'prismal_prime'),
        addonId: targetAddon?.id,
        addonDescription: targetAddon ? `${targetAddon.name} (${targetAddon.quantity} slot)` : undefined,
        sponsorshipPackageId: targetSponsorship?.id,
        sponsorshipDurationDays: targetSponsorship?.durationDays,
        amountNet: netPrice,
        amountVat: vatAmount,
        amountTotal: totalAmount,
        paymentMethod: 'bank_transfer',
        paymentReference: orderRef,
        status: 'pending_verification',
        notes: bankReceiptNotes.trim()
          ? `Disposto bonifico bancario SEPA. Riferimento/CRO: ${bankReceiptNotes.trim()}`
          : 'Ordine con bonifico bancario SEPA in attesa di accredito.',
      });

      setCompletedTransaction(transaction);
      if (onPaymentSuccess) {
        onPaymentSuccess(transaction);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Si è verificato un errore durante la registrazione dell\'ordine.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Verify and capture PayPal Order directly via backend REST API before activating
  const handleConfirmManualPayPal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOrderId = paypalTransactionId.trim();
    if (!cleanOrderId) {
      setErrorMessage('Inserisci il codice identificativo dell\'ordine PayPal (Order ID).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: cleanOrderId,
          studioId: currentStudio.id,
          planId: isTrial ? 'trial_30d' : (targetPlanId || 'prismal_prime'),
          type: targetSponsorship ? 'sponsorship' : isTrial ? 'trial_verification' : 'subscription_monthly',
          sponsorshipPackageId: targetSponsorship?.id,
          sponsorshipDurationDays: targetSponsorship?.durationDays,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.transaction) {
        setErrorMessage(data.error || 'Ordine PayPal non trovato o non completato con successo. Il piano o la sponsorizzazione non possono essere attivati.');
        return;
      }

      setCompletedTransaction(data.transaction);
      if (onPaymentSuccess) onPaymentSuccess(data.transaction);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore nella verifica dell\'ordine con PayPal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isStripeConfigured =
    Boolean(config.stripePaymentLinkUrl && config.stripePaymentLinkUrl.trim().length > 5) ||
    Boolean(config.stripePublishableKey && config.stripePublishableKey.startsWith('pk_'));

  const paypalDirectLink =
    config.paypalPaymentLinkUrl ||
    (config.paypalMerchantEmail
      ? `https://www.paypal.com/paypalme/${config.paypalMerchantEmail.split('@')[0]}/${(totalAmount > 0 ? totalAmount : 1).toFixed(0)}EUR`
      : 'https://www.paypal.com');

  const isPayPalConfigured =
    Boolean(config.paypalPaymentLinkUrl && config.paypalPaymentLinkUrl.trim().length > 5) ||
    Boolean(config.paypalClientId && config.paypalClientId.trim().length > 10) ||
    Boolean(config.paypalMerchantEmail && config.paypalMerchantEmail.includes('@'));

  const isBankConfigured = Boolean(config.bankIban && config.bankIban.trim().length > 10);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fade-in font-sans"
    >
      {/* Floating Overlay Close 'X' Button - ALWAYS VISIBLE AT TOP RIGHT OF VIEWPORT */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Annulla e Chiudi Pagamento"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[10000] px-3.5 py-2 rounded-full bg-slate-900/90 hover:bg-rose-600 text-white border border-white/20 shadow-2xl backdrop-blur-md cursor-pointer transition flex items-center gap-2 group"
      >
        <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
        <span className="text-xs font-bold">Chiudi (Esc)</span>
      </button>

      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative max-h-[90vh] transition-all duration-200 z-[9999]">
        {/* Fixed Top Header with VISIBLE Close Button */}
        <div className="shrink-0 bg-slate-900 border-b border-slate-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-400/30">
              <Lock className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                {completedTransaction
                  ? 'Conferma Ordine & Ricevuta'
                  : isTrial
                  ? 'Attiva 30 Giorni di Prova Gratuita'
                  : 'Checkout Sicuro & Attivazione'}
              </h2>
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Transazione Protetta SSL 256-bit • Server Sicuro</span>
              </span>
            </div>
          </div>

          {/* Big, Visible, Touch-Friendly Close Button in Header */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra di pagamento"
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white flex items-center gap-1.5 text-xs font-bold transition cursor-pointer border border-white/15 shadow-xs"
          >
            <X className="w-4 h-4 text-slate-200" />
            <span>Chiudi</span>
          </button>
        </div>

        {/* Content Body - The ONLY element that scrolls */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6">
          {/* COMPLETED SUCCESS STATE */}
          {completedTransaction ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {completedTransaction.status === 'pending_verification'
                    ? 'Ordine Registrato con Successo (In Attesa di Bonifico)'
                    : 'Pagamento Ricevuto & Piano Attivato!'}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {completedTransaction.status === 'pending_verification'
                    ? `Abbiamo generato la fattura pro-forma ${completedTransaction.invoiceNumber}. Non appena il bonifico bancario verrà accreditato, l'amministratore confermerà l'attivazione definitiva.`
                    : `La ricevuta fiscale ${completedTransaction.invoiceNumber} è stata emessa ed è scaricabile. Tutte le funzionalità di PRISMAL Prime sono ora operative.`}
                </p>
              </div>

              {/* Receipt Summary Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Numero Ricevuta / Fattura:</span>
                  <strong className="text-slate-900 font-mono">{completedTransaction.invoiceNumber}</strong>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Riferimento Gateway:</span>
                  <span className="text-slate-800 font-mono text-[11px]">{completedTransaction.paymentReference}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Metodo di Pagamento:</span>
                  <span className="text-slate-800 font-semibold uppercase">
                    {completedTransaction.paymentMethod === 'stripe'
                      ? 'Stripe Checkout (Carte, Apple & Google Pay)'
                      : completedTransaction.paymentMethod === 'paypal'
                      ? 'PayPal'
                      : completedTransaction.paymentMethod === 'bank_transfer'
                      ? 'Bonifico Bancario SEPA'
                      : 'Pagamento Elettronico'}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 text-sm font-bold text-slate-900">
                  <span>Totale:</span>
                  <span className="text-emerald-700 font-black text-base">€{completedTransaction.amountTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* CHECKOUT FORM */
            <div className="space-y-6">
              {/* Order Summary Box */}
              <div className="bg-gradient-to-br from-purple-50/70 to-sky-50/70 border border-purple-200/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-900">{itemName}</span>
                    {isRecurring && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                        Ricorrente Mensile
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{itemDescription}</p>
                </div>

                <div className="sm:text-right flex-shrink-0 bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-purple-100">
                  <div className="text-xl font-black text-slate-900">
                    €{totalAmount.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    (€{netPrice.toFixed(2)} + IVA 22%)
                  </div>
                </div>
              </div>

              {/* Payment Method Selector Tabs: Stripe, PayPal, Bonifico */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Metodo di Pagamento Ufficiale
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Stripe Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('stripe');
                      setErrorMessage(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      paymentMethod === 'stripe'
                        ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-black text-xs tracking-tight">
                        <ShieldCheck className={`w-4 h-4 ${paymentMethod === 'stripe' ? 'text-emerald-400' : 'text-slate-700'}`} />
                        <span>Stripe Checkout</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        paymentMethod === 'stripe' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        PCI-DSS
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className={`text-[10px] block ${paymentMethod === 'stripe' ? 'text-slate-300' : 'text-slate-500'}`}>
                        Carte, Apple & Google Pay
                      </span>
                    </div>
                  </button>

                  {/* PayPal Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('paypal');
                      setErrorMessage(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      paymentMethod === 'paypal'
                        ? 'border-[#003087] bg-sky-50 ring-2 ring-sky-200 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-black text-xs text-sky-950 tracking-tight">
                        <Globe className="w-4 h-4 text-sky-600" />
                        <span>PayPal</span>
                      </div>
                      <span className="text-[9px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                        Link Diretto
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-[10px] text-slate-500 block">
                        diegoraimondi7
                      </span>
                    </div>
                  </button>

                  {/* Bonifico Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('bank_transfer');
                      setErrorMessage(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-black text-xs text-indigo-950 tracking-tight">
                        <Building className={`w-4 h-4 ${paymentMethod === 'bank_transfer' ? 'text-indigo-700' : 'text-slate-500'}`} />
                        <span>Bonifico</span>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
                        SEPA
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-[10px] text-slate-500 block">
                        IBAN Diretto
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* METHOD 1: STRIPE OFFICIAL CHECKOUT (CARTE + APPLE PAY + GOOGLE PAY) */}
              {paymentMethod === 'stripe' && (
                <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white text-xs shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shadow-xs">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <strong className="text-white block font-bold text-sm">Stripe Gateway Ufficiale</strong>
                        <span className="text-[11px] text-slate-300">
                          Carte di Credito/Debito, Apple Pay, Google Pay
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                      PCI-DSS & 3D Secure
                    </span>
                  </div>

                  {/* Sub-selector: In-app Stripe Elements vs Fullscreen Stripe Checkout */}
                  <div className="grid grid-cols-2 gap-2 bg-white/10 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setStripeSubTab('card_element')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        stripeSubTab === 'card_element'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Carta Qui (Stripe Elements)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStripeSubTab('hosted_checkout')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        stripeSubTab === 'hosted_checkout'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Stripe Hosted Checkout</span>
                    </button>
                  </div>

                  {/* Tab A: Embedded Stripe Payment Element */}
                  {stripeSubTab === 'card_element' ? (
                    <div className="space-y-3">
                      <StripePaymentElementForm
                        amountEur={totalAmount > 0 ? totalAmount : 149}
                        studioId={currentStudio.id}
                        studioName={currentStudio.name}
                        studioEmail={currentStudio.email}
                        planId={isTrial ? 'trial_30d' : (targetPlanId || 'prismal_prime')}
                        description={itemName}
                        onSuccess={(tx) => {
                          setCompletedTransaction(tx);
                          if (onPaymentSuccess) onPaymentSuccess(tx);
                        }}
                        onError={(err) => {
                          setErrorMessage(err);
                        }}
                      />
                    </div>
                  ) : (
                    /* Tab B: Hosted Stripe Checkout Link */
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/10">
                        La transazione viene completata sulla pagina protetta ufficiale di <strong>Stripe Checkout</strong> con reindirizzamento sicuro. Al termine del pagamento, verrai riportato automaticamente su PRISMAL con il tuo account attivo.
                      </p>

                      <button
                        type="button"
                        onClick={handleStripeCheckout}
                        disabled={isProcessing}
                        className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-black transition shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                            <span>Connessione a Stripe in corso...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Apri Stripe Checkout (€{totalAmount.toFixed(2)})</span>
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </button>

                      <div className="flex flex-col gap-2 pt-2 px-1">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                          <a
                            href={config.stripePaymentLinkUrl || 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Link Diretto: buy.stripe.com/00w00j7ab8LY4on0Xc7IY00</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setShowStripeSessionVerify(!showStripeSessionVerify)}
                            className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                          >
                            {showStripeSessionVerify ? 'Nascondi verifica' : 'Verifica Session ID di ritorno da Stripe'}
                          </button>
                        </div>

                        {showStripeSessionVerify && (
                          <div className="pt-2 border-t border-white/10 space-y-1.5">
                            <span className="text-[10px] text-slate-300 block">
                              Inserisci il Session ID rilasciato da Stripe (es. cs_live_...) per verificare l'effettivo addebito:
                            </span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={stripeSessionIdInput}
                                onChange={(e) => setStripeSessionIdInput(e.target.value)}
                                placeholder="cs_live_... o cs_test_..."
                                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white font-mono focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleVerifyStripeSession()}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verifica su Stripe'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 2: PAYPAL FAST CHECKOUT */}
              {paymentMethod === 'paypal' && (
                <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-sky-200 shadow-xs flex items-center justify-center">
                        <Globe className="w-5 h-5 text-sky-700" />
                      </div>
                      <div>
                        <strong className="text-slate-900 block font-bold text-sm">PayPal - Conto Diego Raimondi</strong>
                        <span className="text-[11px] text-slate-600">
                          Beneficiario: {config.paypalMerchantEmail || 'diegoraimondi7@gmail.com'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full">
                      Link Diretto
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-sky-200/70">
                    Paga in sicurezza accedendo direttamente al conto PayPal ufficiale di Diego Raimondi ({config.paypalMerchantEmail || 'diegoraimondi7@gmail.com'}). L'importo di <strong>€{totalAmount.toFixed(2)}</strong> viene accreditato istantaneamente sul saldo.
                  </p>

                  {/* Official PayPal Buttons Container if Client ID is configured */}
                  {config.paypalClientId && config.paypalClientId.trim().length > 10 && (
                    <div className="bg-white p-4 rounded-xl border border-sky-200">
                      <div ref={paypalContainerRef} id="paypal-button-container" className="min-h-[45px]" />
                    </div>
                  )}

                  {/* Direct PayPal Link Option */}
                  {paypalDirectLink && (
                    <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">Paga tramite link PayPal ufficiale:</span>
                          <span className="text-[10px] text-slate-500">Beneficiario: {config.paypalMerchantEmail || 'diegoraimondi7@gmail.com'}</span>
                        </div>
                        <a
                          href={paypalDirectLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-[#0070ba] hover:bg-[#003087] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Apri PayPal.com (€{totalAmount.toFixed(2)})</span>
                        </a>
                      </div>

                      <form onSubmit={handleConfirmManualPayPal} className="pt-3 border-t border-slate-100 space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Inserisci l'ID Ordine PayPal (Order ID rilasciato al checkout) per la cattura e verifica ufficiale:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={paypalTransactionId}
                            onChange={(e) => setPaypalTransactionId(e.target.value)}
                            placeholder="es. 5O190127TN364715T o ID Ordine PayPal"
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <button
                            type="submit"
                            disabled={isProcessing}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verifica con PayPal'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {!config.paypalMerchantEmail && !config.paypalClientId && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Configurazione Gateway PayPal Richiesta</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Il Super Admin deve inserire l'indirizzo email del conto PayPal o il link PayPal.me nel pannello di amministrazione.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setCurrentRole('super_admin');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-xs"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configura PayPal in Super Admin</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 4: BONIFICO BANCARIO SEPA */}
              {paymentMethod === 'bank_transfer' && (
                <form onSubmit={handleSubmitBankTransfer} className="space-y-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-indigo-950 font-bold flex items-center gap-1.5 text-xs">
                      <Building className="w-4 h-4 text-indigo-700" />
                      Coordinate Bancarie Ufficiali per l'Accredito
                    </strong>
                    <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                      SEPA Credit Transfer
                    </span>
                  </div>

                  {isBankConfigured ? (
                    <div className="bg-white rounded-xl border border-indigo-200 p-3.5 space-y-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Intestatario Beneficiario:</span>
                        <strong className="text-slate-900 text-xs">{config.bankBeneficiary || 'Diego Raimondi - PRISMAL Cloud'}</strong>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">IBAN Ufficiale:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(config.bankIban, 'iban')}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'iban' ? 'Copiato!' : 'Copia IBAN'}</span>
                          </button>
                        </div>
                        <div className="font-bold text-slate-900 text-xs tracking-wider bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1 font-mono">
                          {config.bankIban}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">BIC / SWIFT:</span>
                          <strong className="text-slate-800 font-bold font-mono">{config.bankSwiftBic || 'BCITITMM'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Istituto Bancario:</span>
                          <strong className="text-slate-800">{config.bankName || 'Banca Popolare'}</strong>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Causale Obbligatoria Bonifico:</span>
                        <div className="text-xs font-bold text-indigo-950 bg-indigo-50 p-2 rounded-lg border border-indigo-200 mt-0.5 font-mono">
                          PRISMAL-{(currentStudio.slug || 'studio').toUpperCase()}-{targetPlanId ? targetPlanId.toUpperCase() : 'PRIME'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>IBAN Ufficiale in Attesa di Inserimento</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Il Super Admin deve inserire l'IBAN aziendale nella sezione Super Admin &gt; Gateway Pagamenti.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setCurrentRole('super_admin');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-xs"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Inserisci IBAN in Super Admin</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Numero CRO / Note Contabile Bonifico Disposto *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankReceiptNotes}
                      onChange={(e) => setBankReceiptNotes(e.target.value)}
                      placeholder="es. CRO: 0123456789 o Bonifico disposto tramite home banking"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generazione fattura pro-forma...</span>
                      </>
                    ) : (
                      <>
                        <Building className="w-4 h-4 text-indigo-300" />
                        <span>Conferma Ordine Bonifico SEPA (€{totalAmount.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Fiscal & Electronic Invoicing Details */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs space-y-3">
                <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                  Dati di Fatturazione Elettronica Studio (SDI / PEC)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Partita IVA o Codice Fiscale Studio
                    </label>
                    <input
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
                      placeholder="es. IT01234567890"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Codice Destinatario SDI (o 0000000)
                    </label>
                    <input
                      type="text"
                      value={sdiCode}
                      onChange={(e) => setSdiCode(e.target.value.toUpperCase())}
                      placeholder="0000000 o Codice Univoco"
                      maxLength={7}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Attenzione:</strong> {errorMessage}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Bottom Action Bar with Cancel / Dismiss Button (NEVER SCROLLS) */}
        <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 bg-white text-xs font-bold text-slate-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Annulla e Chiudi</span>
          </button>

          {!completedTransaction && (
            <div className="text-[11px] text-slate-500 text-center sm:text-right">
              Totale da corrispondere: <strong className="text-slate-900 font-bold">€{totalAmount.toFixed(2)}</strong>
            </div>
          )}

          {completedTransaction && (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Chiudi Finestra</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
