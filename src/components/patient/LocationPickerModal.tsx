import React, { useState } from 'react';
import { MapPin, X, Search, Compass, Wifi, Check, Sparkles, Loader2 } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  onSelectCity: (cityName: string, coords: { lat: number; lon: number }) => void;
  onDetectAutoLocation: () => Promise<void>;
  isDetectingAuto: boolean;
}

export const POPULAR_LOCATIONS: { name: string; label: string; province: string; lat: number; lon: number; tag?: string }[] = [
  { name: 'Dello (BS)', label: 'Dello', province: 'BS', lat: 45.4206, lon: 10.0528, tag: 'Sede Centro Dello' },
  { name: 'Brescia (BS)', label: 'Brescia', province: 'BS', lat: 45.5416, lon: 10.2118 },
  { name: 'Milano (MI)', label: 'Milano', province: 'MI', lat: 45.4642, lon: 9.19 },
  { name: 'Bergamo (BG)', label: 'Bergamo', province: 'BG', lat: 45.6983, lon: 9.6773 },
  { name: 'Cremona (CR)', label: 'Cremona', province: 'CR', lat: 45.1332, lon: 10.0275 },
  { name: 'Verona (VR)', label: 'Verona', province: 'VR', lat: 45.4384, lon: 10.9916 },
  { name: 'Monza (MB)', label: 'Monza', province: 'MB', lat: 45.5845, lon: 9.2744 },
  { name: 'Pavia (PV)', label: 'Pavia', province: 'PV', lat: 45.1847, lon: 9.1582 },
  { name: 'Mantova (MN)', label: 'Mantova', province: 'MN', lat: 45.1564, lon: 10.7914 },
  { name: 'Piacenza (PC)', label: 'Piacenza', province: 'PC', lat: 45.0526, lon: 9.6929 },
  { name: 'Bologna (BO)', label: 'Bologna', province: 'BO', lat: 44.4949, lon: 11.3426 },
  { name: 'Torino (TO)', label: 'Torino', province: 'TO', lat: 45.0703, lon: 7.6869 },
  { name: 'Roma (RM)', label: 'Roma', province: 'RM', lat: 41.9028, lon: 12.4964 },
  { name: 'Firenze (FI)', label: 'Firenze', province: 'FI', lat: 43.7696, lon: 11.2558 },
  { name: 'Genova (GE)', label: 'Genova', province: 'GE', lat: 44.4056, lon: 8.9463 },
  { name: 'Padova (PD)', label: 'Padova', province: 'PD', lat: 45.4064, lon: 11.8768 },
  { name: 'Napoli (NA)', label: 'Napoli', province: 'NA', lat: 40.8518, lon: 14.2681 },
  { name: 'Bari (BA)', label: 'Bari', province: 'BA', lat: 41.1171, lon: 16.8719 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentCity,
  onSelectCity,
  onDetectAutoLocation,
  isDetectingAuto,
}) => {
  const [filterText, setFilterText] = useState('');

  if (!isOpen) return null;

  const filteredLocations = POPULAR_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(filterText.toLowerCase()) ||
    loc.province.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col relative text-slate-900">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/70 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Seleziona o Rileva la tua Posizione
              </h3>
              <p className="text-xs text-slate-500">
                Ordina gli studi dentistici per chilometri e distanza effettiva
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Main Action: Instant 1-Click Auto Network Location */}
          <div>
            <button
              type="button"
              onClick={async () => {
                await onDetectAutoLocation();
                onClose();
              }}
              disabled={isDetectingAuto}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-60 group"
            >
              {isDetectingAuto ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                  <span>Rilevamento posizione in corso...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Rileva Posizione Automatica (Rete / Wi-Fi)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-1.5">
              Istantanea, sicura e senza dover concedere permessi hardware al browser
            </p>
          </div>

          <div className="relative flex items-center my-1">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              oppure seleziona una città
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Filter Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Cerca comune o provincia (es. Brescia, Dello, Cremona, Milano)..."
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Hubs Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Città e Zone Principali:
              </span>
              {currentCity && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCity('', { lat: 45.4642, lon: 9.19 });
                    onClose();
                  }}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-800 underline cursor-pointer"
                >
                  Azzera filtro città
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredLocations.map(loc => {
                const isSelected = currentCity.toLowerCase().includes(loc.label.toLowerCase());
                return (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => {
                      onSelectCity(loc.name, { lat: loc.lat, lon: loc.lon });
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 text-purple-900 ring-2 ring-purple-200'
                        : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-purple-700' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold truncate">
                          {loc.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold ml-1">
                        {loc.province}
                      </span>
                    </div>

                    {loc.tag && (
                      <span className="text-[9px] font-bold text-purple-700 mt-1 truncate">
                        ★ {loc.tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 text-center text-[11px] text-slate-500">
          Il calcolo chilometrico viene aggiornato istantaneamente su tutte le schede dei dentisti.
        </div>
      </div>
    </div>
  );
};
