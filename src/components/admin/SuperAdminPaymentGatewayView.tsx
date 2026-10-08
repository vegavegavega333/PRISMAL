import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SuperAdminPaymentConfig, PlatformTransaction } from '../../types';
import { DEFAULT_SUPERADMIN_PAYMENT_CONFIG, PRISMAL_PRIME_PRICE_MONTHLY } from '../../data/planTierDefinitions';
import {
  CreditCard,
  Building,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Search,
  DollarSign,
  ShieldCheck,
  Check,
  Download,
  Filter,
  Users,
  Sparkles,
  Zap,
  Lock,
  ArrowUpRight,
  ExternalLink,
  FileText,
  Wallet,
  Globe,
  Loader2,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const SuperAdminPaymentGatewayView: React.FC = () => {
  const {
    superAdminPaymentConfig,
    updateSuperAdminPaymentConfig,
    platformTransactions,
    approvePendingTransaction,
    deletePlatformTransaction,
    clearAllPlatformTransactions,
    studios,
  } = useApp();

  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const config = superAdminPaymentConfig || DEFAULT_SUPERADMIN_PAYMENT_CONFIG;

  // Form State
  const [bankBeneficiary, setBankBeneficiary] = useState(config.bankBeneficiary);
  const [bankIban, setBankIban] = useState(config.bankIban);
  const [bankSwiftBic, setBankSwiftBic] = useState(config.bankSwiftBic);
  const [bankName, setBankName] = useState(config.bankName);
  const [bankInstructions, setBankInstructions] = useState(config.bankPaymentInstructions);

  const [paypalEnabled, setPaypalEnabled] = useState(config.paypalEnabled ?? true);
  const [paypalMerchantEmail, setPaypalMerchantEmail] = useState(config.paypalMerchantEmail);
  const [paypalClientId, setPaypalClientId] = useState(config.paypalClientId || '');
  const [paypalPaymentLinkUrl, setPaypalPaymentLinkUrl] = useState(config.paypalPaymentLinkUrl || '');

  const [stripeEnabled, setStripeEnabled] = useState(config.stripeEnabled ?? true);
  const [stripePublishableKey, setStripePublishableKey] = useState(config.stripePublishableKey || '');
  const [stripeSecretKey, setStripeSecretKey] = useState(config.stripeSecretKey || '');
  const [stripePaymentLinkUrl, setStripePaymentLinkUrl] = useState(config.stripePaymentLinkUrl || 'https://buy.stripe.com/00w00j7ab8LY4on0Xc7IY00');
  const [stripeConnectAccountId, setStripeConnectAccountId] = useState(config.stripeConnectAccountId || '');
  const [googlePayMerchantName, setGooglePayMerchantName] = useState(config.googlePayMerchantName || 'PRISMAL Dental Suite');
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeConnectError, setStripeConnectError] = useState<string | null>(null);

  const [fiscalVatNumber, setFiscalVatNumber] = useState(config.fiscalVatNumber);
  const [fiscalCompanyAddress, setFiscalCompanyAddress] = useState(config.fiscalCompanyAddress);
  const [fiscalSdiCode, setFiscalSdiCode] = useState(config.fiscalSdiCode);
  const [fiscalTaxRate, setFiscalTaxRate] = useState(config.fiscalTaxRate || 22);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sectionSaveMessage, setSectionSaveMessage] = useState<string | null>(null);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [stripeVerifyResult, setStripeVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending_verification'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Reusable Save All Function
  const saveAll = () => {
    const updated: SuperAdminPaymentConfig = {
      bankBeneficiary: bankBeneficiary.trim(),
      bankIban: bankIban.trim().toUpperCase(),
      bankSwiftBic: bankSwiftBic.trim().toUpperCase(),
      bankName: bankName.trim(),
      bankPaymentInstructions: bankInstructions.trim(),
      paypalEnabled,
      paypalMerchantEmail: paypalMerchantEmail.trim(),
      paypalClientId: paypalClientId.trim(),
      paypalPaymentLinkUrl: paypalPaymentLinkUrl.trim(),
      stripeEnabled,
      stripePublishableKey: stripePublishableKey.trim(),
      stripeSecretKey: stripeSecretKey.trim(),
      stripePaymentLinkUrl: stripePaymentLinkUrl.trim(),
      stripeConnectAccountId: stripeConnectAccountId.trim(),
      googlePayMerchantName: googlePayMerchantName.trim(),
      fiscalVatNumber: fiscalVatNumber.trim().toUpperCase(),
      fiscalCompanyAddress: fiscalCompanyAddress.trim(),
      fiscalSdiCode: fiscalSdiCode.trim().toUpperCase() || '0000000',
      fiscalTaxRate: Number(fiscalTaxRate) || 22,
      autoActivateOnPayment: true,
      updatedAt: new Date().toISOString(),
    };

    updateSuperAdminPaymentConfig(updated);
    setSaveSuccess(true);
    setSectionSaveMessage('Configurazione salvata con successo!');
    setTimeout(() => {
      setSaveSuccess(false);
      setSectionSaveMessage(null);
    }, 3500);
  };

  // Handle Save Gateway Config Form Submit
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAll();
  };

  // Live Verification of Stripe Secret Key via API
  const handleVerifyStripeKey = async () => {
    if (!stripeSecretKey.trim()) {
      setStripeVerifyResult({ success: false, message: 'Inserisci prima la Stripe Secret Key nel campo sk_live_... sopra.' });
      return;
    }

    setIsVerifyingStripe(true);
    setStripeVerifyResult(null);

    try {
      const res = await fetch('/api/admin/stripe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: stripeSecretKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStripeVerifyResult({ success: true, message: data.message });
        saveAll(); // Auto-save when verification succeeds!
      } else {
        setStripeVerifyResult({ success: false, message: data.error || 'Verifica Stripe fallita. Controlla la chiave.' });
      }
    } catch (err: any) {
      setStripeVerifyResult({ success: false, message: err?.message || 'Errore di connessione al server per la verifica Stripe.' });
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const handleStartStripeConnect = async () => {
    setIsConnectingStripe(true);
    setStripeConnectError(null);
    try {
      const res = await fetch('/api/payments/stripe-connect/create-account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
          refreshUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        if (data.accountId) {
          setStripeConnectAccountId(data.accountId);
        }
        window.location.href = data.url;
        return;
      }
      setStripeConnectError(data.error || 'Impossibile avviare la procedura Stripe Connect. Verifica la chiave API segreta sk_...');
    } catch (err: any) {
      setStripeConnectError(err?.message || 'Errore di connessione al server');
    } finally {
      setIsConnectingStripe(false);
    }
  };

  // Financial Metrics
  const completedTransactions = platformTransactions.filter(t => t.status === 'completed');
  const pendingTransactions = platformTransactions.filter(t => t.status === 'pending_verification');

  const totalCollectedRevenue = completedTransactions.reduce((acc, t) => acc + (t.amountTotal || 0), 0);

  // MRR estimation based on real active paying studios (verified gateway payments)
  const activePaidStudios = studios.filter(
    s => s.subscription?.status === 'active' && (s.subscription?.lastPaymentAmount || 0) > 0
  );
  const estimatedMrr = activePaidStudios.reduce((acc, s) => {
    return acc + (s.subscription?.lastPaymentAmount || 0);
  }, 0);

  // Filtered transactions
  const filteredTransactions = platformTransactions.filter(t => {
    if (filterStatus === 'completed' && t.status !== 'completed') return false;
    if (filterStatus === 'pending_verification' && t.status !== 'pending_verification') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        t.studioName.toLowerCase().includes(q) ||
        t.invoiceNumber.toLowerCase().includes(q) ||
        t.paymentReference.toLowerCase().includes(q) ||
        (t.addonDescription || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-full overflow-x-hidden">
      {/* Top Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md border border-slate-800">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>MRR (Ricorrenti)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
            €{estimatedMrr.toLocaleString('it-IT')}
            <span className="text-xs text-slate-300 font-normal ml-1">/mese</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {activePaidStudios.length} {activePaidStudios.length === 1 ? 'studio con abbonamento attivo' : 'studi con abbonamento attivo'}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Totale Incassato</span>
              <DollarSign className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              €{totalCollectedRevenue.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {completedTransactions.length} pagamenti completati con successo
            </p>
          </div>
          {(totalCollectedRevenue > 0 || platformTransactions.length > 0) && (
            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline self-start cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Azzera incassi a €0,00</span>
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Bonifici in Verifica</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600">
            {pendingTransactions.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {pendingTransactions.length > 0 ? 'Richiede verifica contabile' : 'Tutti i bonifici verificati'}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Canali di Incasso Attivi</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded-lg text-xs bg-purple-100 text-purple-800 font-bold">Carta</span>
            <span className="px-2 py-0.5 rounded-lg text-xs bg-sky-100 text-sky-800 font-bold">PayPal</span>
            <span className="px-2 py-0.5 rounded-lg text-xs bg-indigo-100 text-indigo-800 font-bold">IBAN</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Flussi crittografati SSL 256-bit
          </p>
        </div>
      </div>

      {/* GATEWAY CONFIGURATION FORM */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              Configurazione Incassi Superadmin
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Coordinate Bancarie & Portali di Ricezione Pagamenti
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              I dati impostati qui vengono mostrati istantaneamente a tutti gli studi dentistici al momento dell'iscrizione, rinnovo abbonamento o acquisto slot aggiuntivi.
            </p>
          </div>

          {saveSuccess && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-bounce-subtle">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Impostazioni di Pagamento Salvate!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SEZIONE 1: BONIFICO BANCARIO & IBAN */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <Building className="w-4 h-4 text-indigo-700" />
                <span>Coordinate Bonifico Bancario SEPA</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Intestatario / Beneficiario del Conto (Opzionale)
                </label>
                <input
                  type="text"
                  value={bankBeneficiary}
                  onChange={e => setBankBeneficiary(e.target.value)}
                  placeholder="es. PRISMAL Cloud S.r.l."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  IBAN Ufficiale per gli Accrediti (Opzionale)
                </label>
                <input
                  type="text"
                  value={bankIban}
                  onChange={e => setBankIban(e.target.value.toUpperCase())}
                  placeholder="IT00 X 00000 00000 000000000000"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    BIC / SWIFT (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={bankSwiftBic}
                    onChange={e => setBankSwiftBic(e.target.value.toUpperCase())}
                    placeholder="BCITITMM"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Istituto Bancario (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="Intesa Sanpaolo / UniCredit"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Istruzioni Bonifico per gli Studi
                </label>
                <textarea
                  rows={2}
                  value={bankInstructions}
                  onChange={e => setBankInstructions(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-indigo-100">
                <span className="text-[10px] text-slate-500">I campi bonifico sono facoltativi.</span>
                <button
                  type="button"
                  onClick={saveAll}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva Coordinate Bonifico</span>
                </button>
              </div>
            </div>

            {/* SEZIONE 2: STRIPE GATEWAY */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>Stripe Gateway Ufficiale (Carte, Apple Pay & Google Pay)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripeEnabled}
                      onChange={e => setStripeEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500"
                    />
                    <span className="text-xs font-bold text-emerald-400">Abilita</span>
                  </label>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Stripe gestisce al 100% le certificazioni di sicurezza bancaria PCI-DSS Livello 1 e 3D Secure 2.0. Consente agli studi di pagare con <strong>qualsiasi carta di credito/debito</strong>, <strong>Apple Pay</strong> e <strong>Google Pay</strong> con accredito diretto sul tuo conto bancario senza alcun canone fisso.
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-200 mb-1">
                      Link Diretto Stripe Checkout (Consigliato - es. buy.stripe.com)
                    </label>
                    <input
                      type="url"
                      value={stripePaymentLinkUrl}
                      onChange={e => setStripePaymentLinkUrl(e.target.value)}
                      placeholder="https://buy.stripe.com/..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Crea un Payment Link su stripe.com per PRISMAL Prime (€149/mese) e incollalo qui: reindirizzerà subito i clienti a pagare con Google Pay e Carta.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Stripe Secret Key (sk_live_...)
                      </label>
                      <input
                        type="password"
                        value={stripeSecretKey}
                        onChange={e => {
                          setStripeSecretKey(e.target.value);
                          setStripeVerifyResult(null);
                        }}
                        placeholder="sk_live_..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Stripe Publishable Key (pk_live_...)
                      </label>
                      <input
                        type="text"
                        value={stripePublishableKey}
                        onChange={e => setStripePublishableKey(e.target.value)}
                        placeholder="pk_live_..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Stripe Live Verification & Save Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyStripeKey}
                        disabled={isVerifyingStripe || !stripeSecretKey}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isVerifyingStripe ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifica Connessione Stripe in corso...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>Verifica & Sincronizza API Live</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={saveAll}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3 h-3 text-slate-400" />
                        <span>Salva Stripe</span>
                      </button>
                    </div>

                    {stripePaymentLinkUrl && (
                      <a
                        href={stripePaymentLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                        <span>Testa Checkout (€149/m)</span>
                      </a>
                    )}
                  </div>

                  {/* Verification Feedback Banner */}
                  {stripeVerifyResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        stripeVerifyResult.success
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      {stripeVerifyResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold block">
                          {stripeVerifyResult.success
                            ? '✓ Stripe Sincronizzato & Attivo'
                            : 'Verifica Fallita'}
                        </span>
                        <span className="text-[11px] opacity-90">{stripeVerifyResult.message}</span>
                      </div>
                    </div>
                  )}

                  {/* Stripe Connect Account */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Stripe Connect Account ID (acct_...)
                      </label>
                      {stripeSecretKey && (
                        <button
                          type="button"
                          onClick={handleStartStripeConnect}
                          disabled={isConnectingStripe}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer disabled:opacity-50"
                        >
                          {isConnectingStripe ? 'Avvio...' : '🔗 Collega Conto Bancario con Stripe Connect'}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={stripeConnectAccountId}
                      onChange={e => setStripeConnectAccountId(e.target.value)}
                      placeholder="acct_..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                    {stripeConnectError && (
                      <p className="text-[10px] text-rose-400">{stripeConnectError}</p>
                    )}
                    <span className="text-[10px] text-slate-400 block">
                      Permette di ricevere gli incassi direttamente sul tuo conto bancario collegato tramite Stripe Connect Express.
                    </span>
                  </div>
                </div>
              </div>

              {/* SEZIONE 3: PAYPAL */}
              <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-950 font-bold text-sm">
                    <div className="w-6 h-6 rounded-md bg-[#003087] text-white flex items-center justify-center">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <span>PayPal Business</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paypalEnabled}
                      onChange={e => setPaypalEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600"
                    />
                    <span className="text-xs font-bold text-slate-700">Abilita</span>
                  </label>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email Conto Business PayPal del Superadmin *
                    </label>
                    <input
                      type="email"
                      required={paypalEnabled}
                      value={paypalMerchantEmail}
                      onChange={e => setPaypalMerchantEmail(e.target.value)}
                      placeholder="prismaldental@gmail.com"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Link Diretto Pagamento PayPal (es. paypal.me/prismaldental o PayPal Checkout URL)
                    </label>
                    <input
                      type="url"
                      value={paypalPaymentLinkUrl}
                      onChange={e => setPaypalPaymentLinkUrl(e.target.value)}
                      placeholder="https://paypal.me/..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      PayPal Client ID (per pulsanti ufficiali Smart Buttons su developer.paypal.com)
                    </label>
                    <input
                      type="text"
                      value={paypalClientId}
                      onChange={e => setPaypalClientId(e.target.value)}
                      placeholder="Client ID da PayPal Developer Dashboard"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">I pagamenti arrivano sul tuo conto PayPal</span>
                    <button
                      type="button"
                      onClick={saveAll}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salva PayPal</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dati Fiscali Fatturazione Elettronica */}
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                    <FileText className="w-4 h-4 text-purple-700" />
                    <span>Dati Fiscali Emittente Fattura (Superadmin)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Facoltativo
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-100/60 border border-purple-200/80 text-[11px] text-purple-900 leading-relaxed">
                  💡 <strong>Non hai ancora la Partita IVA?</strong> Nessun problema: puoi ricevere pagamenti regolarmente come persona fisica o ditta individuale in apertura. Lascia il campo vuoto o indica il tuo Codice Fiscale.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Partita IVA o Codice Fiscale (Opzionale)
                    </label>
                    <input
                      type="text"
                      value={fiscalVatNumber}
                      onChange={e => setFiscalVatNumber(e.target.value.toUpperCase())}
                      placeholder="IT12345678901 o Codice Fiscale"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Aliquota IVA (%) (Opzionale)
                    </label>
                    <input
                      type="number"
                      value={fiscalTaxRate}
                      onChange={e => setFiscalTaxRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sede Legale o Indirizzo di Residenza (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={fiscalCompanyAddress}
                    onChange={e => setFiscalCompanyAddress(e.target.value)}
                    placeholder="es. Via Roma 1, Milano (MI) o lascia vuoto"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">I dati fiscali possono essere aggiornati in qualsiasi momento.</span>
                  <button
                    type="button"
                    onClick={saveAll}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salva Dati Fiscali</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={saveAll}
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salva Tutte le Coordinate Pagamento</span>
            </button>
          </div>
        </form>
      </div>

      {/* TRANSACTIONS & RECURRING BILLING AUDIT TRAIL */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Registro Transazioni & Incassi Studi</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {platformTransactions.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Storico in tempo reale di tutti gli abbonamenti attivati, rinnovi e acquisti di slot aggiuntivi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cerca studio o fattura..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition ${filterStatus === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
              >
                Tutti
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1 rounded-lg transition ${filterStatus === 'completed' ? 'bg-white shadow-xs text-emerald-800 font-bold' : 'text-slate-600'}`}
              >
                Completati
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending_verification')}
                className={`px-3 py-1 rounded-lg transition ${filterStatus === 'pending_verification' ? 'bg-white shadow-xs text-amber-800 font-bold' : 'text-slate-600'}`}
              >
                Bonifici da Verificare
              </button>
            </div>

            {(platformTransactions.length > 0 || totalCollectedRevenue > 0) && (
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition ml-auto"
                title="Azzera tutte le transazioni registrate e reimposta l'incasso a 0€"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Azzera Tutti gli Incassi (0€)</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Nessuna transazione trovata con i filtri correnti.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Fattura / ID</th>
                  <th className="p-3.5">Studio Medico</th>
                  <th className="p-3.5">Servizio / Pacchetto</th>
                  <th className="p-3.5">Metodo</th>
                  <th className="p-3.5">Importo Totale</th>
                  <th className="p-3.5">Stato</th>
                  <th className="p-3.5 text-right">Azioni Superadmin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {t.invoiceNumber}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-900">
                      {t.studioName}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {t.studioEmail}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">
                        {t.type === 'subscription_monthly' && 'Abbonamento Mensile'}
                        {t.type === 'subscription_annual' && 'Abbonamento Annuale'}
                        {t.type === 'addon_slots' && 'Slot Appuntamenti Extra'}
                        {t.type === 'addon_sms' && 'Pacchetto SMS Extra'}
                      </span>
                      {t.addonDescription && (
                        <span className="block text-[10px] text-purple-700 font-medium">
                          {t.addonDescription}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 font-medium">
                        {t.paymentMethod === 'credit_card' && '💳 Carta di Credito'}
                        {t.paymentMethod === 'paypal' && '🅿️ PayPal'}
                        {t.paymentMethod === 'bank_transfer' && '🏛️ Bonifico SEPA'}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      €{t.amountTotal.toFixed(2)}
                      <span className="block text-[10px] font-normal text-slate-400">
                        (€{t.amountNet.toFixed(2)} + IVA)
                      </span>
                    </td>

                    <td className="p-3.5">
                      {t.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Accreditato
                        </span>
                      )}
                      {t.status === 'pending_verification' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          Bonifico in Attesa
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status === 'pending_verification' && (
                          <button
                            type="button"
                            onClick={() => approvePendingTransaction(t.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition shadow-2xs"
                          >
                            Approva
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deletePlatformTransaction(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Elimina questa transazione"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Confirmation Modal to Clear All Transactions */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Azzera Tutti gli Incassi?
                </h3>
                <p className="text-xs text-slate-500">
                  Operazione contabile Super Admin
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              Confermando, tutte le {platformTransactions.length} transazioni registrate (incluse transazioni demo di prova) verranno eliminate definitivamente. Il <strong>Totale Incassato</strong> tornerà a <strong>€0,00</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                disabled={isClearingAll}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsClearingAll(true);
                  try {
                    await clearAllPlatformTransactions();
                  } finally {
                    setIsClearingAll(false);
                    setShowClearConfirmModal(false);
                  }
                }}
                disabled={isClearingAll}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {isClearingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Azzera a €0,00</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
