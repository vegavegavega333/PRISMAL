import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { PlatformTransaction } from '../../types';

interface StripePaymentFormProps {
  amountEur: number;
  studioId: string;
  studioName: string;
  studioEmail: string;
  planId?: string;
  appointmentId?: string;
  description?: string;
  onSuccess: (tx: PlatformTransaction) => void;
  onError?: (err: string) => void;
}

const DEFAULT_STRIPE_PUB =
  'pk_live_51UMolsGZdInBu3L6hnCFD4UKP4wk41WFvpYz4EF6AE9utRMVX8jUuvpEDWQrzjgOitoCse3vaYDFA1qcSjSTzWUC00gWdanaaf';

const stripePromise = loadStripe(
  ((import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string) || DEFAULT_STRIPE_PUB
);

/**
 * Inner form where Elements context is available
 */
const CheckoutInnerForm: React.FC<{
  amountEur: number;
  studioId: string;
  studioName: string;
  studioEmail: string;
  planId?: string;
  onSuccess: (tx: PlatformTransaction) => void;
}> = ({ amountEur, studioId, studioName, studioEmail, planId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
          receipt_email: studioEmail || undefined,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setErrorMessage(error.message || 'La carta è stata rifiutata o i dati inseriti non sono validi.');
        } else {
          setErrorMessage(error.message || 'Si è verificato un errore imprevisto durante il pagamento.');
        }
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        // Confirm and fulfill via official server-side Stripe verification
        const confirmRes = await fetch('/api/payments/stripe/confirm-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            studioId,
            studioName,
            studioEmail,
            planId,
          }),
        });

        const confirmData = await confirmRes.json();
        if (confirmData.success && confirmData.transaction) {
          onSuccess(confirmData.transaction);
        } else {
          setErrorMessage(confirmData.error || 'Transazione non confermata da Stripe. Il piano non è stato attivato.');
        }
      } else {
        setErrorMessage('Il pagamento non risulta confermato da Stripe. Nessun addebito registrato.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore di connessione durante la conferma del pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-white rounded-xl border border-slate-200">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Autorizzazione bancaria 3D Secure in corso...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Conferma e Paga €{amountEur.toFixed(2)} in Sicurezza</span>
          </>
        )}
      </button>

      <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
        <Lock className="w-3 h-3 text-emerald-600" />
        Crittografia bancaria Stripe Elements • Protocollo SCA / 3D Secure 2.0
      </p>
    </form>
  );
};

export const StripePaymentElementForm: React.FC<StripePaymentFormProps> = ({
  amountEur,
  studioId,
  studioName,
  studioEmail,
  planId,
  appointmentId,
  description,
  onSuccess,
  onError,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingSecret, setIsLoadingSecret] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingSecret(true);
    setInitError(null);

    fetch('/api/payments/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountEur,
        studioId,
        studioName,
        studioEmail,
        planId,
        appointmentId,
        description,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setInitError(data.error || 'Impossibile inizializzare il pagamento Stripe');
          if (onError) onError(data.error || 'Errore');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setInitError(err?.message || 'Errore di connessione con il server per Stripe');
        if (onError) onError(err?.message || 'Errore');
      })
      .finally(() => {
        if (isMounted) setIsLoadingSecret(false);
      });

    return () => {
      isMounted = false;
    };
  }, [amountEur, studioId, planId, appointmentId]);

  if (isLoadingSecret) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
        <p className="text-xs text-slate-600 font-medium">
          Inizializzazione sessione protetta Stripe Elements...
        </p>
      </div>
    );
  }

  if (initError || !clientSecret) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Stripe Elements non disponibile al momento</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          {initError || 'Impossibile ottenere il clientSecret da Stripe.'}
        </p>
        <p className="text-[11px] text-slate-600">
          Puoi comunque completare l'abbonamento con 1 click tramite il link ufficiale di Stripe Checkout:
        </p>
        <a
          href="https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
        >
          <span>Paga su buy.stripe.com</span>
        </a>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#059669',
            borderRadius: '12px',
            fontSizeBase: '13px',
          },
        },
      }}
    >
      <CheckoutInnerForm
        amountEur={amountEur}
        studioId={studioId}
        studioName={studioName}
        studioEmail={studioEmail}
        planId={planId}
        onSuccess={onSuccess}
      />
    </Elements>
  );
};
