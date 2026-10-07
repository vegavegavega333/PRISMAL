import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside standalone app, do not show button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={
          className ||
          `flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs cursor-pointer ${
            compact ? 'text-[11px] py-1 px-2' : ''
          }`
        }
        title="Installa l'app sul tuo telefono per un accesso istantaneo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installa App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={
            className ||
            `flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer ${
              compact ? 'text-[11px] py-1 px-2' : ''
            }`
          }
          title="Aggiungi alla schermata Home di iPhone"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-600" />
          <span>Aggiungi a Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Installa su iPhone o iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Puoi usare PRISMAL come una vera app nativa, veloce e senza barre del browser:
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    1
                  </div>
                  <p className="text-slate-700">
                    Tocca il pulsante <strong className="inline-flex items-center gap-1 text-slate-900"><Share2 className="w-3 h-3 text-sky-600" /> Condividi</strong> in basso nella barra di Safari.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    2
                  </div>
                  <p className="text-slate-700">
                    Scorri le opzioni verso il basso e tocca <strong className="inline-flex items-center gap-1 text-slate-900"><PlusSquare className="w-3 h-3 text-sky-600" /> Aggiungi a schermata Home</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    3
                  </div>
                  <p className="text-slate-700">
                    Tocca <strong>Aggiungi</strong> in alto a destra. L'icona apparirà tra le tue app!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Ho Capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
