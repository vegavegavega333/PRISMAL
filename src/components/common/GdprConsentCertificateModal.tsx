import React from 'react';
import { PatientRecord, Appointment } from '../../types';
import { CURRENT_PRIVACY_POLICY_VERSION, GDPR_PURPOSES } from '../../data/gdprPolicy';
import {
  ShieldCheck,
  X,
  FileCheck2,
  Printer,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Building,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface GdprConsentCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  studioName?: string;
  studioAddress?: string;
  studioPhone?: string;
  appointment?: Appointment;
}

export const GdprConsentCertificateModal: React.FC<GdprConsentCertificateModalProps> = ({
  isOpen,
  onClose,
  patient,
  studioName = 'Studio Odontoiatrico PRISMAL',
  studioAddress,
  studioPhone,
  appointment,
}) => {
  if (!isOpen) return null;

  const version = patient.gdprPolicyVersion || appointment?.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION;
  const rawTimestamp =
    patient.gdprConsentTimestamp ||
    appointment?.gdprConsentTimestamp ||
    patient.gdprSanitaryConsentDate ||
    patient.createdAt ||
    new Date().toISOString();

  let formattedDate = rawTimestamp;
  try {
    const d = new Date(rawTimestamp);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  } catch {
    formattedDate = rawTimestamp;
  }

  const channel = patient.gdprConsentChannel || (appointment ? 'online_booking' : 'desk_intake');
  const channelLabel =
    channel === 'online_booking'
      ? 'Prenotazione Online con Verifica OTP (Minisito Paziente)'
      : channel === 'digital_kiosk'
      ? 'Totem / Kiosk Digitale Accettazione'
      : 'Accettazione e Desk Studio Medico';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gdpr-cert-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden">
        {/* Certificate Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white flex items-center justify-between gap-4 border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="gdpr-cert-title" className="text-base font-extrabold tracking-tight">
                  Attestato di Consenso Privacy Sanitaria (GDPR)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider">
                  Valido
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Certificazione di conformità ex Artt. 7 & 9 Regolamento UE 2016/679
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-xl transition cursor-pointer"
              title="Stampa attestato"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-xl transition cursor-pointer"
              aria-label="Chiudi attestato"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* Studio & Patient Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Titolare del Trattamento (Studio)
              </span>
              <p className="font-bold text-slate-900 text-sm">{studioName}</p>
              {studioAddress && <p className="text-[11px] text-slate-500">{studioAddress}</p>}
              {studioPhone && <p className="text-[11px] text-slate-500">Tel: {studioPhone}</p>}
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Interessato (Paziente)
              </span>
              <p className="font-bold text-slate-900 text-sm">{patient.firstName} {patient.lastName}</p>
              <p className="text-[11px] text-slate-500">CF: {patient.fiscalCode || 'Non specificato'}</p>
              <p className="text-[11px] text-slate-500">{patient.email} · {patient.phone}</p>
            </div>
          </div>

          {/* Proof Details Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
              <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Dati di Tracciamento del Consenso Informato
              </span>
              <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                PROVA ARCHIVIATA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Versione Informativa Accettata:</span>
                <span className="font-bold font-mono text-emerald-900 text-sm bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  {version}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Data e Ora di Acquisizione (Timestamp):</span>
                <span className="font-bold font-mono text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  {formattedDate}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Canale di Acquisizione:</span>
                <span className="font-semibold text-slate-800">{channelLabel}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Stato Giuridico:</span>
                <span className="font-bold text-emerald-700">Consenso Esplicito Valido (Art. 7 GDPR)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-200/60 text-[10px] text-slate-500 font-mono">
              Marcatura ISO 8601: <span className="text-slate-700 font-bold">{rawTimestamp}</span>
            </div>
          </div>

          {/* Authorized Purposes */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Finalità Espressamente Autorizzate
            </h4>
            <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {GDPR_PURPOSES.map(p => (
                <div key={p.id} className="p-3 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({p.code})</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{p.legalBasis}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Compliance Guarantee */}
          <div className="p-3 bg-slate-100/80 rounded-2xl border border-slate-200 text-[11px] text-slate-600">
            Il presente certificato costituisce prova documentale a norma dell'Art. 7, paragrafo 1 del Regolamento UE 2016/679 («Qualora il trattamento sia basato sul consenso, il titolare del trattamento deve essere in grado di dimostrare che l'interessato ha prestato il proprio consenso»).
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Archivio Digitale Clinica • PRISMAL Cloud Dental Suite
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Stampa Certificato</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
