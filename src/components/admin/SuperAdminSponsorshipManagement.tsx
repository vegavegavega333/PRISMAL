import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Studio } from '../../types';
import { saveStudioToFirestore } from '../../services/firebase';
import {
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  Clock,
  Save,
  Check,
  Search,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const SuperAdminSponsorshipManagement: React.FC = () => {
  const {
    studios,
    setStudios,
    updateStudioProfile,
    superAdminPaymentConfig,
    updateSuperAdminPaymentConfig,
    platformTransactions,
    searchAnalytics,
    clearSearchLogs,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Configurable base prices
  const [weeklyPrice, setWeeklyPrice] = useState<number>(
    superAdminPaymentConfig.sponsorshipWeeklyPrice || 19
  );
  const [monthlyPrice, setMonthlyPrice] = useState<number>(
    superAdminPaymentConfig.sponsorshipMonthlyPrice || 49
  );
  const [quarterlyPrice, setQuarterlyPrice] = useState<number>(
    superAdminPaymentConfig.sponsorshipQuarterlyPrice || 119
  );

  // Save updated pricing configuration
  const handleSavePricingConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSuperAdminPaymentConfig({
      ...superAdminPaymentConfig,
      sponsorshipWeeklyPrice: weeklyPrice,
      sponsorshipMonthlyPrice: monthlyPrice,
      sponsorshipQuarterlyPrice: quarterlyPrice,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Toggle or extend sponsorship on a studio
  const handleToggleSponsorship = (studioId: string) => {
    const target = studios.find(s => s.id === studioId);
    const isNowActive = target ? !target.isSponsored : true;
    const updates = {
      isSponsored: isNowActive,
      sponsoredUntil: isNowActive
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : undefined,
    };

    if (typeof setStudios === 'function') {
      setStudios(prev =>
        prev.map(s => {
          if (s.id === studioId) {
            const up: Studio = { ...s, ...updates };
            saveStudioToFirestore(up).catch(() => {});
            fetch(`/api/studios/${s.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(up),
            }).catch(() => {});
            return up;
          }
          return s;
        })
      );
    } else if (typeof updateStudioProfile === 'function') {
      updateStudioProfile(studioId, updates);
    }
  };

  // Add extra days
  const handleExtendSponsorship = (studioId: string, days: number) => {
    const target = studios.find(s => s.id === studioId);
    const currentExpiry =
      target?.sponsoredUntil && new Date(target.sponsoredUntil).getTime() > Date.now()
        ? new Date(target.sponsoredUntil).getTime()
        : Date.now();
    const newExpiry = new Date(currentExpiry + days * 86400000).toISOString();
    const updates = {
      isSponsored: true,
      sponsoredUntil: newExpiry,
    };

    if (typeof setStudios === 'function') {
      setStudios(prev =>
        prev.map(s => {
          if (s.id === studioId) {
            const up: Studio = { ...s, ...updates };
            saveStudioToFirestore(up).catch(() => {});
            fetch(`/api/studios/${s.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(up),
            }).catch(() => {});
            return up;
          }
          return s;
        })
      );
    } else if (typeof updateStudioProfile === 'function') {
      updateStudioProfile(studioId, updates);
    }
  };

  const activeSponsoredStudios = studios.filter(
    s =>
      Boolean(s.isSponsored) &&
      Boolean(s.sponsoredUntil) &&
      new Date(s.sponsoredUntil).getTime() > Date.now()
  );

  const sponsorshipTransactions = platformTransactions.filter(t => t.type === 'sponsorship');
  const totalSponsorshipRevenue = sponsorshipTransactions.reduce(
    (acc, t) => acc + (t.status === 'completed' ? t.amountTotal : 0),
    0
  );

  const filteredStudios = studios.filter(
    s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Header & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Gestione Sponsorizzazioni & Top Rank PRISMAL</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Imposta le tariffe ufficiali delle sponsorizzazioni e gestisci gli studi posizionati in cima al motore di ricerca.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Studi Sponsorizzati Attivi
          </span>
          <div className="text-3xl font-black text-slate-900 tabular-nums">
            {activeSponsoredStudios.length} <span className="text-sm font-semibold text-slate-400">/ {studios.length} totali</span>
          </div>
          <span className="text-[11px] font-bold text-amber-600 mt-1 inline-block">
            In prima posizione su PRISMAL Search
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Ricavi Totali Sponsorizzazioni
          </span>
          <div className="text-3xl font-black text-emerald-600 font-mono tabular-nums">
            €{totalSponsorshipRevenue.toLocaleString('it-IT')}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 inline-block">
            Accreditati al conto Superadmin
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Transazioni Sponsor Eseguite
          </span>
          <div className="text-3xl font-black text-purple-700 tabular-nums">
            {sponsorshipTransactions.length}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 inline-block">
            Pacchetti attivati dagli studi
          </span>
        </div>
      </div>

      {/* 2. Superadmin Price Configuration Form */}
      <form
        onSubmit={handleSavePricingConfig}
        className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Configurazione Prezzi Ufficiali Pacchetti Sponsor</span>
            </h3>
            <p className="text-xs text-slate-500">
              Modifica i prezzi dei pacchetti acquistabili dagli studi nel loro gestionale.
            </p>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Prezzi Salvati!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salva Tariffe</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-slate-700 block">7 Giorni Sprint</span>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                €
              </div>
              <input
                type="number"
                min="5"
                max="500"
                value={weeklyPrice}
                onChange={e => setWeeklyPrice(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400">Prezzo standard una tantum (+IVA)</p>
          </div>

          <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-purple-950 block">30 Giorni Spotlight (Consigliato)</span>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                €
              </div>
              <input
                type="number"
                min="10"
                max="1000"
                value={monthlyPrice}
                onChange={e => setMonthlyPrice(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
              />
            </div>
            <p className="text-[10px] text-purple-700">Prezzo standard una tantum (+IVA)</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-slate-700 block">90 Giorni Top Rank</span>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                €
              </div>
              <input
                type="number"
                min="20"
                max="2500"
                value={quarterlyPrice}
                onChange={e => setQuarterlyPrice(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400">Prezzo standard una tantum (+IVA)</p>
          </div>
        </div>
      </form>

      {/* 3. Studios Sponsorship Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Stato Sponsorizzazione Studi nel Listing
            </h3>
            <p className="text-xs text-slate-500">
              Visualizza, attiva o prolunga la sponsorizzazione per qualsiasi clinica registrata.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca studio o città..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Studio & Località</th>
                <th className="py-3 px-4">Piano</th>
                <th className="py-3 px-4">Stato Spotlight</th>
                <th className="py-3 px-4">Scadenza</th>
                <th className="py-3 px-5 text-right">Azioni Rapide Superadmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudios.map(studio => {
                const isSponsored =
                  !!studio.isSponsored &&
                  (!studio.sponsoredUntil ||
                    new Date(studio.sponsoredUntil).getTime() > Date.now());

                const daysLeft = studio.sponsoredUntil
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(studio.sponsoredUntil).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : 0;

                return (
                  <tr key={studio.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={studio.logoUrl}
                          alt={studio.name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <strong className="text-slate-900 block font-bold">{studio.name}</strong>
                          <span className="text-slate-400 text-[11px]">{studio.city} • {studio.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="capitalize font-semibold text-slate-600 text-[11px]">
                        {studio.plan.replace('_monthly', '')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {isSponsored ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>In Evidenza</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Standard</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {isSponsored ? (
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {daysLeft > 0 ? `${daysLeft} giorni rimasti` : 'Attiva illimitata'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSponsorship(studio.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSponsored
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                        }`}
                      >
                        {isSponsored ? 'Disattiva' : 'Attiva 30gg'}
                      </button>

                      {isSponsored && (
                        <button
                          type="button"
                          onClick={() => handleExtendSponsorship(studio.id, 30)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          +30gg
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Platform Search Analytics & Demand */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Analisi Ricerche & Domanda Pazienti di Piattaforma (Solo Dati Reali)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Query effettivamente digitate dagli utenti nella barra di ricerca PRISMAL (nessun dato fittizio).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              {searchAnalytics.totalSearches} Ricerche Reali Registrate
            </div>
            {searchAnalytics.totalSearches > 0 && (
              <button
                type="button"
                onClick={clearSearchLogs}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                title="Azzera il registro delle ricerche reali"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Azzera</span>
              </button>
            )}
          </div>
        </div>

        {searchAnalytics.totalSearches === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-1.5">
            <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Nessuna ricerca paziente registrata finora</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              I dati fittizi sono stati rimossi. Non appena i pazienti o visitatori cercheranno prestazioni (es. "igiene", "sbiancamento") o città sul motore di ricerca PRISMAL, le query reali appariranno qui in tempo reale.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Keywords */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Trattamenti & Parole Chiave Top
              </span>
              <div className="space-y-1.5">
                {searchAnalytics.popularKeywords.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Nessun termine registrato</p>
                ) : (
                  searchAnalytics.popularKeywords.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0">
                      <span className="font-semibold text-slate-800 capitalize">
                        {idx + 1}. {item.term}
                      </span>
                      <span className="text-slate-500 bg-white px-2 py-0.5 rounded text-[11px] font-mono">
                        {item.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Cities */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Città con Maggiore Volume
              </span>
              <div className="space-y-1.5">
                {searchAnalytics.popularCities.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Nessuna città registrata</p>
                ) : (
                  searchAnalytics.popularCities.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0">
                      <span className="font-semibold text-slate-800 capitalize">
                        {idx + 1}. {item.city}
                      </span>
                      <span className="text-slate-500 bg-white px-2 py-0.5 rounded text-[11px] font-mono">
                        {item.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Searches Log */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Ultime Ricerche Pazienti
              </span>
              <div className="space-y-1.5">
                {searchAnalytics.recentSearches.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Nessuna ricerca recente</p>
                ) : (
                  searchAnalytics.recentSearches.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="text-xs py-1 border-b border-slate-200/50 last:border-0 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-purple-700 capitalize">"{item.query || 'Tutti gli studi'}"</span>
                        {item.location && <span className="text-slate-500 text-[11px]"> a {item.location}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
