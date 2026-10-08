import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Studio } from '../../types';
import { PrismalLogo, PrismalHeroBrand } from '../PrismalLogo';
import { LocationPickerModal } from './LocationPickerModal';
import { PatientRatingModal } from './PatientRatingModal';
import {
  Search,
  MapPin,
  Sparkles,
  Star,
  Phone,
  ArrowRight,
  Compass,
  X,
  CheckCircle2,
  Shield,
  Smile,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface DentalSearchEngineProps {
  onOpenAuthModal: () => void;
  onStartRegistration: () => void;
  onOpenSaasShowcase: () => void;
}

// Haversine distance calculator in Kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const CITY_COORDINATES: Record<string, { name: string; lat: number; lon: number }> = {
  dello: { name: 'Dello (BS)', lat: 45.4206, lon: 10.0528 },
  brescia: { name: 'Brescia (BS)', lat: 45.5416, lon: 10.2118 },
  bergamo: { name: 'Bergamo (BG)', lat: 45.6983, lon: 9.6773 },
  cremona: { name: 'Cremona (CR)', lat: 45.1332, lon: 10.0275 },
  milano: { name: 'Milano (MI)', lat: 45.4642, lon: 9.19 },
  monza: { name: 'Monza (MB)', lat: 45.5845, lon: 9.2744 },
  verona: { name: 'Verona (VR)', lat: 45.4384, lon: 10.9916 },
  bologna: { name: 'Bologna (BO)', lat: 44.4949, lon: 11.3426 },
  torino: { name: 'Torino (TO)', lat: 45.0703, lon: 7.6869 },
  roma: { name: 'Roma (RM)', lat: 41.9028, lon: 12.4964 },
  napoli: { name: 'Napoli (NA)', lat: 40.8518, lon: 14.2681 },
  firenze: { name: 'Firenze (FI)', lat: 43.7696, lon: 11.2558 },
  padova: { name: 'Padova (PD)', lat: 45.4064, lon: 11.8768 },
  genova: { name: 'Genova (GE)', lat: 44.4056, lon: 8.9463 },
  bari: { name: 'Bari (BA)', lat: 41.1171, lon: 16.8719 },
  palermo: { name: 'Palermo (PA)', lat: 38.1157, lon: 13.3615 },
  catania: { name: 'Catania (CT)', lat: 37.5079, lon: 15.0873 },
};

// Recognized clinical dental treatment queries
const DENTAL_PRACTICE_KEYWORDS = [
  'igiene', 'pulizia', 'sbiancamento', 'visita', 'controllo', 'ortodonzia',
  'invisalign', 'allineatori', 'impianto', 'implantologia', 'carie',
  'devitalizzazion', 'otturazion', 'urgenza', 'dolore', 'estrazione',
  'protesi', 'gnatologia', 'pedodonzia', 'bambini', 'chirurgia', 'parodonto'
];

// Standard authentic dental practice quick-select buttons
const POPULAR_PROCEDURES = [
  { label: 'Igiene & Pulizia', query: 'igiene' },
  { label: 'Sbiancamento Dentale', query: 'sbiancamento' },
  { label: 'Prima Visita & Check-up', query: 'visita' },
  { label: 'Ortodonzia & Allineatori', query: 'ortodonzia' },
  { label: 'Implantologia & Chirurgia', query: 'implantologia' },
  { label: 'Cura Carie & Devitalizzazioni', query: 'carie' },
  { label: 'Pronto Soccorso Dentale', query: 'urgenza' },
];

export const DentalSearchEngine: React.FC<DentalSearchEngineProps> = ({
  onOpenAuthModal,
  onStartRegistration,
  onOpenSaasShowcase,
}) => {
  const { studios, setPatientViewingSlug, setCurrentStudioId, setCurrentRole, logSearchQuery } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({
    lat: 45.4642,
    lon: 9.19,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'distance' | 'rating'>('recommended');

  // Post-visit patient rating modal state
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    token?: string | null;
    initialStars?: number | null;
  }>({
    isOpen: false,
    token: null,
    initialStars: null,
  });

  // Check URL parameters on mount: if user arrived via review email from prismaldental@gmail.com
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const valutaToken = params.get('valuta_token') || params.get('rate_token');
    const stelle = params.get('stelle');
    if (valutaToken) {
      setRatingModal({
        isOpen: true,
        token: valutaToken,
        initialStars: stelle ? parseInt(stelle, 10) : 5,
      });
      // Clean up URL query parameters without reloading
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Instant, frictionless network-based IP geolocation (Zero browser permission prompts or lockouts)
  const handleDetectNetworkLocation = async () => {
    setIsLocating(true);
    setLocationStatus('Rilevamento posizione tramite rete IP...');

    try {
      let detectedCity = '';
      let lat = 45.4642;
      let lon = 9.19;

      // Primary provider: ipapi.co
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data && (data.city || data.region)) {
            detectedCity = data.city || data.region;
            if (typeof data.latitude === 'number') lat = data.latitude;
            if (typeof data.longitude === 'number') lon = data.longitude;
          }
        }
      } catch {
        // Fallback provider if blocked or rate-limited
        try {
          const res2 = await fetch('https://freeipapi.com/api/json');
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && data2.cityName) {
              detectedCity = data2.cityName;
              if (typeof data2.latitude === 'number') lat = data2.latitude;
              if (typeof data2.longitude === 'number') lon = data2.longitude;
            }
          }
        } catch {
          // ignore fallback error
        }
      }

      if (detectedCity) {
        const cleanName = `${detectedCity} (Rete IP)`;
        setLocationQuery(cleanName);
        setUserCoords({ lat, lon });
        setSortBy('distance');
        setIsLocationModalOpen(false);
        setLocationStatus(`Posizione rilevata con successo: ${detectedCity}`);
        setTimeout(() => setLocationStatus(null), 4000);
      } else {
        setLocationStatus('Impossibile rilevare la posizione dalla rete. Scegli una città dalla lista.');
        setIsLocationModalOpen(true);
        setTimeout(() => setLocationStatus(null), 4000);
      }
    } catch {
      setLocationStatus('Errore durante la connessione al server di posizione. Seleziona la tua città.');
      setIsLocationModalOpen(true);
      setTimeout(() => setLocationStatus(null), 4000);
    } finally {
      setIsLocating(false);
    }
  };

  // Update user coordinates when city is typed
  useEffect(() => {
    const clean = locationQuery.toLowerCase().trim();
    for (const [cityName, cityData] of Object.entries(CITY_COORDINATES)) {
      if (clean.includes(cityName)) {
        setUserCoords({ lat: cityData.lat, lon: cityData.lon });
        break;
      }
    }
  }, [locationQuery]);

  // Debounced search query logging
  useEffect(() => {
    if (!searchQuery.trim() && !locationQuery.trim()) return;
    const timer = setTimeout(() => {
      logSearchQuery(searchQuery, locationQuery, searchResults.length);
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchQuery, locationQuery]);

  // Filter & Rank: All paying clinics are preserved!
  // Searching for a clinical practice boosts relevant/specialized studios to top, without excluding others.
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const loc = locationQuery.toLowerCase().trim();

    // Check if query is a general dental practice
    const isPracticeQuery = q ? DENTAL_PRACTICE_KEYWORDS.some(k => q.includes(k) || k.includes(q)) : false;

    return studios
      .filter(studio => {
        // Exclude suspended clinics
        if (studio.status === 'suspended') return false;

        // If query is NOT a general treatment (e.g. searching a specific clinic name or street), filter by name
        if (q && !isPracticeQuery) {
          const matchName = studio.name.toLowerCase().includes(q);
          const matchCity = (studio.city || '').toLowerCase().includes(q);
          const matchSpecialties = (studio.specialties || []).some(s => s.toLowerCase().includes(q));
          if (!matchName && !matchCity && !matchSpecialties) {
            return false;
          }
        }

        // Location text filter: if user typed a specific city name (and not network wording)
        if (loc && !loc.includes('posizione') && !loc.includes('rete')) {
          const matchCity = (studio.city || '').toLowerCase().includes(loc);
          const matchAddress = (studio.address || '').toLowerCase().includes(loc);
          if (!matchCity && !matchAddress) {
            const cityKey = (studio.city || studio.address || '').toLowerCase().replace(/\s*\([a-z0-9]+\)/i, '').trim();
            const studioLat = studio.latitude || CITY_COORDINATES[cityKey]?.lat || 45.4206;
            const studioLon = studio.longitude || CITY_COORDINATES[cityKey]?.lon || 10.0528;
            const dist = calculateDistanceKm(userCoords.lat, userCoords.lon, studioLat, studioLon);
            if (dist > 300) return false;
          }
        }

        return true;
      })
      .map(studio => {
        const cityKey = (studio.city || studio.address || '').toLowerCase().replace(/\s*\([a-z0-9]+\)/i, '').trim();
        const studioLat = studio.latitude || CITY_COORDINATES[cityKey]?.lat || 45.4206;
        const studioLon = studio.longitude || CITY_COORDINATES[cityKey]?.lon || 10.0528;
        const distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lon, studioLat, studioLon);

        let score = 100;
        if (studio.isSponsored) score += 1000;
        if (studio.subscription?.status === 'active' || studio.plan === 'prismal_prime') score += 200;

        // Specialty relevance matching:
        let specialtyMatch = false;
        let matchedSpecialtyLabel = '';
        if (q) {
          const matchSpec = (studio.specialties || []).find(s => s.toLowerCase().includes(q));
          const matchServ = (studio.visitReasons || []).find(
            vr => vr.name.toLowerCase().includes(q) || (vr.description || '').toLowerCase().includes(q)
          );
          if (matchSpec || matchServ) {
            specialtyMatch = true;
            matchedSpecialtyLabel = matchSpec || matchServ?.name || q;
            // Major boost in relevance so specialized studios appear on top, while others remain visible!
            score += 600;
          }
        }

        // Distance factor
        score -= distanceKm * 2;

        // Verified star rating from post-visit reviews (0 if no reviews yet - NO DEMO DATA)
        const hasVerifiedReviews = typeof studio.reviewsCount === 'number' && studio.reviewsCount > 0 && typeof studio.rating === 'number' && studio.rating > 0;
        const verifiedRating = hasVerifiedReviews ? studio.rating : 0;
        const verifiedReviewsCount = hasVerifiedReviews ? studio.reviewsCount : 0;
        score += verifiedRating * 10;

        return {
          ...studio,
          calculatedDistance: distanceKm,
          calculatedScore: score,
          displayRating: verifiedRating,
          displayReviews: verifiedReviewsCount,
          hasVerifiedReviews,
          specialtyMatch,
          matchedSpecialtyLabel,
        };
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return a.calculatedDistance - b.calculatedDistance;
        }
        if (sortBy === 'rating') {
          // Studios with verified reviews come first by rating, followed by unrated studios
          if (a.hasVerifiedReviews && !b.hasVerifiedReviews) return -1;
          if (!a.hasVerifiedReviews && b.hasVerifiedReviews) return 1;
          return b.displayRating - a.displayRating;
        }

        // Relevance sort: specialized studios first when a practice is searched
        if (a.specialtyMatch && !b.specialtyMatch) return -1;
        if (!a.specialtyMatch && b.specialtyMatch) return 1;

        // Sponsored studios first
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;

        return b.calculatedScore - a.calculatedScore;
      });
  }, [studios, searchQuery, locationQuery, userCoords, sortBy]);

  // Open the real booking flow for the selected studio
  const handleOpenStudioBooking = (studio: Studio) => {
    setPatientViewingSlug(studio.slug);
    setCurrentStudioId(studio.id);
    setCurrentRole('patient');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-purple-600 selection:text-white font-sans flex flex-col justify-between antialiased">
      {/* 1. TOP UTILITY BAR: Clean Logo Mark + Official PRISMAL Wordmark */}
      <nav className="w-full border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Left: Clean Logo Mark + Official PRISMAL Wordmark */}
          <div className="flex items-center flex-shrink-0 cursor-pointer" onClick={() => setSearchQuery('')}>
            <PrismalLogo size="sm" showText={true} showSubtitle={false} />
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Login button */}
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center justify-center"
            >
              Accedi
            </button>

            {/* Register button */}
            <button
              type="button"
              onClick={onStartRegistration}
              className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-950 hover:bg-purple-700 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300 hidden sm:inline" />
              <span className="hidden sm:inline">Registra il tuo Studio</span>
              <span className="sm:hidden">Registrati</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 2. CORE SEARCH SECTION: Clean, spacious, zero overlapping */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8">
        
        {/* HERO: Official PRISMAL Logo Lockup matching user artwork */}
        <div className="flex flex-col items-center justify-center text-center select-none pt-2 sm:pt-4 pb-1">
          <PrismalHeroBrand showSubtitle={true} className="mb-2" />
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-medium mt-1 px-2 leading-relaxed">
            Cerca lo studio dentistico e prenota online in tempo reale.
          </p>
        </div>

        {/* 3. SEARCH BAR CONTAINER: Distinct Mobile Card + Desktop Pill */}
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 sm:gap-4">
          {/* DESKTOP SEARCH BAR (Google / Airbnb round style) */}
          <div className="hidden md:flex items-center w-full h-14 bg-white rounded-full border border-slate-300 hover:border-slate-400 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-100/70 shadow-md transition-all p-2 gap-2">
            {/* Input 1: Procedure or Studio name */}
            <div className="flex-1 min-w-0 h-full flex items-center gap-3 pl-4 pr-2">
              <Search className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Prestazione o studio"
                className="w-full h-full text-sm font-medium text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Subtle Divider */}
            <div className="w-px h-8 bg-slate-200 flex-shrink-0" />

            {/* Input 2: Location with instant auto-detect */}
            <div className="flex-1 min-w-0 h-full flex items-center gap-2.5 px-3">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                title="Scegli la tua città o visualizza opzioni posizione"
                className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
              >
                <MapPin className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={locationQuery}
                onChange={e => setLocationQuery(e.target.value)}
                placeholder="Città"
                className="w-full h-full text-sm font-medium text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
              />

              <button
                type="button"
                onClick={handleDetectNetworkLocation}
                title="Rileva posizione automatica (istante, da rete)"
                className={`p-1.5 rounded-full hover:bg-purple-50 text-slate-400 hover:text-purple-700 transition cursor-pointer flex-shrink-0 ${
                  isLocating ? 'text-purple-600 animate-pulse' : ''
                }`}
              >
                <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>

            {/* Search Action Button */}
            <button
              type="button"
              onClick={() => logSearchQuery(searchQuery, locationQuery, searchResults.length)}
              className="h-10 px-6 rounded-full bg-slate-950 hover:bg-purple-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs flex-shrink-0"
            >
              <span>Cerca</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* MOBILE SEARCH CARD (Clean, spacious, zero compenetration) */}
          <div className="flex flex-col gap-2.5 md:hidden w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5">
            {/* Input 1: Procedure or Studio */}
            <div className="h-12 w-full flex items-center gap-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 transition">
              <Search className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Prestazione o studio"
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-700 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Input 2: Location & Auto Detect */}
            <div className="h-12 w-full flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 transition">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                title="Scegli la tua città"
                className="p-1 text-slate-400 hover:text-purple-600 transition flex-shrink-0"
              >
                <MapPin className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={locationQuery}
                onChange={e => setLocationQuery(e.target.value)}
                placeholder="Città"
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleDetectNetworkLocation}
                title="Rileva posizione automatica (istante, da rete)"
                className={`h-8 px-2.5 rounded-lg text-slate-600 hover:text-purple-700 bg-white border border-slate-200 active:bg-purple-50 transition cursor-pointer flex-shrink-0 flex items-center gap-1.5 ${
                  isLocating ? 'border-purple-500 text-purple-700 bg-purple-50' : ''
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-purple-600' : 'text-purple-600'}`} />
                <span className="text-[11px] font-bold">Rileva</span>
              </button>
            </div>

            {/* Mobile Action Button */}
            <button
              type="button"
              onClick={() => logSearchQuery(searchQuery, locationQuery, searchResults.length)}
              className="h-12 w-full rounded-xl bg-slate-950 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Cerca Studi Dentistici</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {locationStatus && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-center text-purple-800 bg-purple-50 border border-purple-200/80 py-1.5 px-3 rounded-xl font-medium animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
              <span>{locationStatus}</span>
            </div>
          )}

          {/* Quick Procedure Chips: Real authentic clinical practices */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap sm:justify-center no-scrollbar mt-1">
            {POPULAR_PROCEDURES.map((p, idx) => {
              const isSelected = searchQuery.toLowerCase() === p.query;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSearchQuery(isSelected ? '' : p.query)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition cursor-pointer flex-shrink-0 whitespace-nowrap ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. SEARCH RESULTS LISTING */}
        <div className="w-full flex flex-col gap-4 pt-2 sm:pt-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                {searchResults.length === 1
                  ? '1 Studio Odontoiatrico Disponibile'
                  : `${searchResults.length} Studi Odontoiatrici Disponibili`}
              </h2>
            </div>

            {/* Minimalist, ultra-refined Segmented Sort Pill (Font piccolino ed estetico text-[10px]) */}
            <div className="flex items-center p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/70 shadow-2xs gap-0.5">
              <button
                type="button"
                onClick={() => setSortBy('recommended')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[10.5px] transition cursor-pointer flex items-center gap-1 ${
                  sortBy === 'recommended'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" />
                <span>In Evidenza</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('distance')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[10.5px] transition cursor-pointer flex items-center gap-1 ${
                  sortBy === 'distance'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Compass className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-600" />
                <span>Più Vicini</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[10.5px] transition cursor-pointer flex items-center gap-1 ${
                  sortBy === 'rating'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 fill-amber-500" />
                <span>Valutazione</span>
              </button>
            </div>
          </div>

          {/* Results: Minimalist, clean */}
          {searchResults.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl sm:rounded-3xl p-8 border border-slate-200/80 text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-slate-400 flex items-center justify-center border border-slate-200">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                Nessuno studio trovato per "{searchQuery}"
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Tutti gli studi registrati offrono cure odontoiatriche generali. Prova a reimpostare i filtri per vedere tutti gli studi accreditati.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setLocationQuery('');
                }}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer mt-1"
              >
                Mostra Tutti gli Studi
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {searchResults.map(studio => {
                const isSponsored = studio.isSponsored;

                return (
                  <div
                    key={studio.id}
                    className="w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md"
                  >
                    {/* Top/Left: Studio details */}
                    <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                      <img
                        src={studio.logoUrl}
                        alt={studio.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        {/* Amazon-style discreet "Sponsorizzato" text */}
                        {isSponsored && (
                          <span className="text-[10px] font-semibold text-slate-500 tracking-tight">
                            Sponsorizzato
                          </span>
                        )}

                        <h3
                          className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight hover:text-purple-700 transition cursor-pointer truncate"
                          onClick={() => handleOpenStudioBooking(studio)}
                        >
                          {studio.name}
                        </h3>

                        {/* Location, Distance, and Real Verified Star Rating */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{studio.city || studio.address}</span>
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 text-[11px]">
                            {studio.calculatedDistance} km
                          </span>
                          <span>•</span>
                          
                          {/* Real Star Rating: ONLY show when verified reviews exist from real patients */}
                          {studio.hasVerifiedReviews ? (
                            <div className="flex items-center text-slate-800 font-bold gap-1 text-xs" title="Media valutazioni lasciate dai pazienti verificati post-visita">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{studio.displayRating.toFixed(1)}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({studio.displayReviews} {studio.displayReviews === 1 ? 'valutazione' : 'valutazioni'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10.5px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded-md">
                              Nuovo studio accreditato
                            </span>
                          )}
                        </div>

                        {/* Specialties pills with relevance matching */}
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          {studio.specialtyMatch ? (
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                              <span>Specialità di punta: {studio.matchedSpecialtyLabel}</span>
                            </span>
                          ) : searchQuery.trim() && DENTAL_PRACTICE_KEYWORDS.some(k => searchQuery.toLowerCase().includes(k)) ? (
                            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                              ✓ Prestazione disponibile
                            </span>
                          ) : null}

                          {(studio.specialties && studio.specialties.length > 0
                            ? studio.specialties
                            : (studio.visitReasons || []).map(v => v.name)
                          )
                            .slice(0, 3)
                            .map((spec, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                              >
                                {spec}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom/Right Action row */}
                    <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto flex-shrink-0">
                      {studio.phone && (
                        <a
                          href={`tel:${studio.phone}`}
                          className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center flex-shrink-0"
                          title="Chiama lo Studio"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenStudioBooking(studio)}
                        className="flex-1 sm:flex-initial h-10 sm:h-11 px-5 bg-slate-950 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Prenota Visita</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 5. FOOTER: Clean Logo Mark + Official PRISMAL Wordmark */}
      <footer className="w-full border-t border-slate-100 bg-white py-8 sm:py-10 pb-16 mt-auto">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <PrismalLogo size="xs" showText={true} showSubtitle={false} />
            <span className="text-slate-400">© {new Date().getFullYear()}</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-slate-500 hidden sm:inline">Motore di Ricerca Dentistico Italiano</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-medium">
            <button
              type="button"
              onClick={onOpenSaasShowcase}
              className="text-purple-700 hover:text-purple-900 font-bold transition cursor-pointer py-1"
            >
              Area Cliniche & Software
            </button>
            <button
              type="button"
              onClick={onStartRegistration}
              className="text-slate-600 hover:text-slate-950 transition cursor-pointer py-1"
            >
              Registra Clinica Odontoiatrica
            </button>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="text-slate-600 hover:text-slate-950 transition cursor-pointer py-1"
            >
              Accesso Console
            </button>
          </div>
        </div>
      </footer>

      {/* Location Picker & Quick City Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentCity={locationQuery}
        onSelectCity={(cityName, coords) => {
          setLocationQuery(cityName);
          setUserCoords(coords);
          setSortBy('distance');
          setLocationStatus(cityName ? `Posizione impostata: ${cityName}` : null);
          setTimeout(() => setLocationStatus(null), 3500);
        }}
        onDetectAutoLocation={handleDetectNetworkLocation}
        isDetectingAuto={isLocating}
      />

      {/* Post-Visit Patient 5-Star Rating Modal */}
      <PatientRatingModal
        isOpen={ratingModal.isOpen}
        onClose={() => setRatingModal(prev => ({ ...prev, isOpen: false }))}
        token={ratingModal.token}
        initialStars={ratingModal.initialStars}
      />
    </div>
  );
};
