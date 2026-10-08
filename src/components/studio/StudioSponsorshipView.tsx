import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SponsorshipPackage } from '../../types';
import { DEFAULT_SPONSORSHIP_PACKAGES } from '../../data/planTierDefinitions';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';
import {
  Sparkles,
  Check,
  CheckCircle2,
  Search,
  MapPin,
  Activity,
  ArrowRight,
  ShieldCheck,
  Eye,
  Award,
} from 'lucide-react';

export const StudioSponsorshipView: React.FC = () => {
  const { activeStudio, searchAnalytics } = useApp();

  const [selectedPackage, setSelectedPackage] = useState<SponsorshipPackage>(DEFAULT_SPONSORSHIP_PACKAGES[1]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPkg, setCheckoutPkg] = useState<SponsorshipPackage | null>(null);

  if (!activeStudio) return null;

  const isPrime = true;

  // Check if currently sponsored
  const isCurrentlySponsored =
    !!activeStudio.isSponsored &&
    (!activeStudio.sponsoredUntil || new Date(activeStudio.sponsoredUntil).getTime() > Date.now());

  const daysRemaining = activeStudio.sponsoredUntil
    ? Math.max(0, Math.ceil((new Date(activeStudio.sponsoredUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleStartCheckout = (pkg: SponsorshipPackage) => {
    setCheckoutPkg(pkg);
    setShowCheckoutModal(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      {/* 1. Header & Live Sponsorship Status */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>PRISMAL Spotlight</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sponsorizzazione & Posizionamento Studio
          </h1>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Mostra <strong>{activeStudio.name}</strong> al primo posto nella ricerca pazienti a <strong>{activeStudio.city}</strong> e zone limitrofe.
          </p>
        </div>

        {/* Current status pill */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex-shrink-0 text-left md:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Stato Attuale:
          </span>
          {isCurrentlySponsored ? (
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Attiva</span>
              </span>
              <p className="text-[11px] font-semibold text-slate-600">
                Scade tra <strong>{daysRemaining} giorni</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                <span>Posizionamento Standard</span>
              </span>
              <p className="text-[10px] text-slate-500">
                Ordinamento organico per distanza e orari
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Pochi punti chiave essenziali (No spam, no finto ROI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">1° Risultato Garantito</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Il tuo studio appare sempre in cima alla lista per chi cerca dentisti nella tua area.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Badge Studio in Evidenza</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Etichetta professionale che attira lo sguardo dei pazienti su smartphone e computer.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Priorità Urgenze e Nuovi Pazienti</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Maggiore probabilità di contatto immediato da parte di pazienti con bisogno tempestivo.
            </p>
          </div>
        </div>
      </div>

      {/* 3. The 3 Sponsorship Packages */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">
          Pacchetti di Sponsorizzazione Disponibili
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_SPONSORSHIP_PACKAGES.map(pkg => {
            const isSelected = selectedPackage.id === pkg.id;
            const price = pkg.priceProEur || pkg.priceEur;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`bg-white rounded-2xl p-5 border-2 transition-all flex flex-col justify-between cursor-pointer relative ${
                  isSelected
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                    Consigliato
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                      {pkg.durationDays} Giorni
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Tariffa Riservata Studio
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mt-2.5">{pkg.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{pkg.tagline}</p>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">€{price}</span>
                    <span className="text-[10px] text-slate-400">una tantum</span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span>Primo posto nella ricerca locale</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span>Badge visivo "In Evidenza"</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span>Attivazione immediata</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleStartCheckout(pkg);
                  }}
                  className={`mt-5 w-full py-2.5 rounded-xl font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-700 hover:bg-purple-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Attiva Sponsorizzazione (€{price})</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Search Analytics compatta e reale */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Ricerche Pazienti nella tua Area</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Query recenti registrate nel motore di ricerca PRISMAL.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>{searchAnalytics.totalSearches} Ricerche Totali</span>
          </div>
        </div>

        {searchAnalytics.totalSearches === 0 ? (
          <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
            Nessuna ricerca paziente registrata al momento. Le query reali effettuate dai pazienti sul portale appariranno qui automaticamente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Prestazioni più cercate</span>
              <div className="space-y-1">
                {searchAnalytics.popularKeywords.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-800 capitalize">{item.term}</span>
                    <span className="text-slate-500 text-[11px]">{item.count} ric.</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Comuni e Aree più attive</span>
              <div className="space-y-1">
                {searchAnalytics.popularCities.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-800 capitalize">{item.city}</span>
                    <span className="text-slate-500 text-[11px]">{item.count} ric.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Checkout Modal */}
      {showCheckoutModal && checkoutPkg && (
        <PaymentCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => {
            setShowCheckoutModal(false);
            setCheckoutPkg(null);
          }}
          targetSponsorship={checkoutPkg}
          onPaymentSuccess={() => {
            setShowCheckoutModal(false);
            setCheckoutPkg(null);
          }}
        />
      )}
    </div>
  );
};
