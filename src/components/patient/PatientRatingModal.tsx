import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, X, Sparkles, Building2, Calendar, Loader2 } from 'lucide-react';
import { PrismalLogo } from '../PrismalLogo';
import { useApp } from '../../context/AppContext';

interface PatientRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  initialStars?: number | null;
}

export const PatientRatingModal: React.FC<PatientRatingModalProps> = ({
  isOpen,
  onClose,
  token,
  initialStars,
}) => {
  const { studios, appointments, setStudios } = useApp();
  const [selectedStars, setSelectedStars] = useState<number>(initialStars || 5);
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  // When modal opens with token, fetch/find appointment details
  useEffect(() => {
    if (!isOpen || !token) return;

    if (initialStars && initialStars >= 1 && initialStars <= 5) {
      setSelectedStars(initialStars);
    }

    // Try finding appointment in local state first
    const found = appointments.find(a => a.managementToken === token || a.id === token);
    if (found) {
      setAppointmentData(found);
      if (found.ratingSubmitted) {
        setSelectedStars(found.ratingSubmitted);
        setIsSubmitted(true);
      }
    } else {
      // Fetch from server
      fetch(`/api/appointments?token=${encodeURIComponent(token)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setAppointmentData(data[0]);
            if (data[0].ratingSubmitted) {
              setSelectedStars(data[0].ratingSubmitted);
              setIsSubmitted(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, token, appointments, initialStars]);

  if (!isOpen) return null;

  const targetStudio = studios.find(s => s.id === appointmentData?.studioId);
  const studioDisplayName = targetStudio?.name || appointmentData?.studioName || 'Studio Odontoiatrico';

  const handleSubmitRating = async (starsToSubmit: number) => {
    if (!token) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/appointments/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          stars: starsToSubmit,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(true);
        setSelectedStars(starsToSubmit);

        // Update studio rating in real time in AppContext if returned
        if (typeof setStudios === 'function' && data.studioRating && appointmentData?.studioId) {
          setStudios(prev =>
            prev.map(s =>
              s.id === appointmentData.studioId
                ? { ...s, rating: data.studioRating, reviewsCount: data.reviewsCount }
                : s
            )
          );
        }
      } else {
        setErrorMsg(data.error || 'Impossibile registrare la valutazione. Riprova più tardi.');
      }
    } catch {
      setErrorMsg('Errore di connessione. Riprova tra poco.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative text-slate-900 p-6 sm:p-8 text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PRISMAL Header */}
        <div className="flex flex-col items-center mb-4">
          <PrismalLogo size="sm" showText={true} layout="stacked" showSubtitle={false} />
          <span className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-medium mt-1.5">
            Valutazione Verificata Paziente
          </span>
        </div>

        {isSubmitted ? (
          <div className="py-4 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Valutazione Registrata!
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              Hai assegnato <strong>{selectedStars} stelle</strong> a <strong>{studioDisplayName}</strong>.<br />
              La tua valutazione è stata salvata e aggiorna in tempo reale la media dello studio sul motore di ricerca.
            </p>

            <div className="flex justify-center gap-1.5 py-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= selectedStars
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 text-[11px] font-semibold mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>{studioDisplayName}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Come valuti la tua visita?
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Tocca le stelle per esprimere la tua esperienza. Nessun testo richiesto, solo stelle.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            {/* Interactive Stars Selector */}
            <div className="py-3 px-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => {
                  const isActive = (hoverStars !== null ? star <= hoverStars : star <= selectedStars);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverStars(star)}
                      onMouseLeave={() => setHoverStars(null)}
                      onClick={() => setSelectedStars(star)}
                      className="p-1 text-slate-300 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                      title={`${star} stelle`}
                    >
                      <Star
                        className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                          isActive
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-200 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <span className="text-xs font-bold text-slate-700">
                {(hoverStars || selectedStars) === 1 && '1 stella - Esperienza Insoddisfacente'}
                {(hoverStars || selectedStars) === 2 && '2 stelle - Da migliorare'}
                {(hoverStars || selectedStars) === 3 && '3 stelle - Nella media'}
                {(hoverStars || selectedStars) === 4 && '4 stelle - Molto buona'}
                {(hoverStars || selectedStars) === 5 && '5 stelle - Eccellente'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitRating(selectedStars)}
              className="w-full py-3 rounded-xl bg-slate-950 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Invio valutazione...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Conferma {selectedStars} Stelle</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-400 leading-normal">
              La tua valutazione è collegata alla visita archiviata con OTP e concorre al punteggio medio certificato di PRISMAL.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
