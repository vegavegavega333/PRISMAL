import React, { useState } from 'react';
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_LAST_UPDATED,
  GDPR_PURPOSES,
  FULL_PRIVACY_POLICY_SECTIONS,
} from '../../data/gdprPolicy';
import {
  ShieldCheck,
  X,
  FileText,
  Printer,
  CheckCircle2,
  Lock,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface GdprPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioName?: string;
  studioAddress?: string;
  studioEmail?: string;
  studioPhone?: string;
  onAcceptAndClose?: () => void;
  showAcceptButton?: boolean;
}

export const GdprPolicyModal: React.FC<GdprPolicyModalProps> = ({
  isOpen,
  onClose,
  studioName = 'Studio Odontoiatrico PRISMAL',
  studioAddress,
  studioEmail,
  studioPhone,
  onAcceptAndClose,
  showAcceptButton = false,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'full' | 'rights'>('summary');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gdpr-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="gdpr-modal-title" className="text-base font-extrabold tracking-tight">
                  Informativa sul Trattamento dei Dati Personali e Sanitari
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500 text-white uppercase tracking-wider">
                  {CURRENT_PRIVACY_POLICY_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>GDPR (Reg. UE 2016/679) & D.Lgs. 196/2003</span>
                <span>•</span>
                <span>Aggiornato al: {PRIVACY_POLICY_LAST_UPDATED}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Stampa informativa"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Chiudi finestra informativa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Info Header Banner */}
        <div className="px-6 py-3 bg-sky-50/80 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span className="font-semibold text-slate-900">Titolare del Trattamento:</span>
            <span className="font-bold text-sky-950">{studioName}</span>
            {studioAddress && <span className="text-slate-500 hidden sm:inline">({studioAddress})</span>}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            {studioEmail && <span>Email: <strong className="text-slate-800">{studioEmail}</strong></span>}
            {studioPhone && <span>Tel: <strong className="text-slate-800">{studioPhone}</strong></span>}
          </div>
        </div>

        {/* Tab selection */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sintesi e Finalità (Art. 13)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('full')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'full'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Articoli di Legge Integrali
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rights')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'rights'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            I Tuoi Diritti (Artt. 15-22)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed max-h-[55vh]">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 text-xs">
                    Consenso Informato Trasparente e a Norma di Legge
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    La presente informativa descrive chiaramente come {studioName} tratta i tuoi dati personali e sensibili per erogare le prestazioni sanitarie odontoiatriche in conformità al Regolamento UE 2016/679 (GDPR). Nessun dato viene ceduto a terzi per scopi promozionali.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Finalità del Trattamento e Basi Giuridiche
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {GDPR_PURPOSES.map(purpose => (
                    <div
                      key={purpose.id}
                      className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{purpose.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                          {purpose.mandatory ? 'Obbligatorio per le Cure' : 'Facoltativo'}
                        </span>
                      </div>
                      <div className="text-[10px] text-sky-700 font-mono font-semibold">
                        Base Giuridica: {purpose.legalBasis}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {purpose.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 text-slate-600 text-[11px] space-y-1.5">
                <span className="font-bold text-slate-800 block">Tracciamento e Conservazione del Consenso:</span>
                <p>
                  Ad ogni registrazione o prenotazione viene generata una marcatura temporale esatta (ISO 8601) associata alla versione dell'informativa <strong>{CURRENT_PRIVACY_POLICY_VERSION}</strong>. Tale prova è custodita nel registro dei consensi dello studio per fini probatori (Art. 7.1 GDPR).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'full' && (
            <div className="space-y-4">
              {FULL_PRIVACY_POLICY_SECTIONS.map((section, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-bold text-slate-900 text-xs">{section.title}</h5>
                    {section.articleRef && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                        {section.articleRef}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rights' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs">I Diritti del Paziente (Artt. 15-22 GDPR)</h4>
                  <p className="text-[11px] text-indigo-900/80 mt-0.5">
                    Il paziente può esercitare in qualsiasi momento i seguenti diritti inviando una comunicazione a {studioEmail || 'contatti dello studio'}:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <span className="font-bold text-slate-900 block">Art. 15 - Diritto di Accesso</span>
                  <p className="text-[11px] text-slate-600">
                    Ottenere la conferma dell'esistenza di dati personali e riceverne copia integrale (compresa la cartella clinica).
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <span className="font-bold text-slate-900 block">Art. 16 - Rettifica Dati</span>
                  <p className="text-[11px] text-slate-600">
                    Aggiornamento tempestivo di recapiti telefonici, indirizzo o anamnesi medica incompleta.
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <span className="font-bold text-slate-900 block">Art. 17 - Cancellazione & Oblio</span>
                  <p className="text-[11px] text-slate-600">
                    Cancellazione dei dati non più necessari, fatti salvi i vincoli di legge di conservazione della cartella clinica.
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <span className="font-bold text-slate-900 block">Art. 20 - Portabilità Fascicolo</span>
                  <p className="text-[11px] text-slate-600">
                    Esportazione del fascicolo in formato strutturato e leggibile da elaboratore (JSON interoperabile).
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1 sm:col-span-2">
                  <span className="font-bold text-slate-900 block">Opposizione Sistema Tessera Sanitaria (DM MEF 19/10/2020)</span>
                  <p className="text-[11px] text-slate-600">
                    Il paziente può chiedere in ogni momento di non inviare le spese odontoiatriche all'Agenzia delle Entrate per il 730 precompilato.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium">
            Versione in vigore: <strong className="text-slate-800">{CURRENT_PRIVACY_POLICY_VERSION}</strong> • Certificato ID: GDPR-{studioName.slice(0, 4).toUpperCase()}-2026
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Chiudi
            </button>
            {showAcceptButton && onAcceptAndClose && (
              <button
                type="button"
                onClick={onAcceptAndClose}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accetta e Continua</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
