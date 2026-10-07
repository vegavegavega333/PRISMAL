import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PatientRecord } from '../../types';
import { CURRENT_PRIVACY_POLICY_VERSION, PRIVACY_POLICY_LAST_UPDATED } from '../../data/gdprPolicy';
import { GdprPolicyModal } from '../common/GdprPolicyModal';
import { GdprConsentCertificateModal } from '../common/GdprConsentCertificateModal';
import {
  ShieldCheck,
  FileText,
  FileCheck2,
  Download,
  Printer,
  UserCheck,
  AlertCircle,
  Lock,
  Database,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  Eye,
  Building,
  Key,
} from 'lucide-react';

export const StudioGdprSuite: React.FC = () => {
  const { activeStudio, patientRecords, appointments, updatePatientRecord } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'consents' | 'informed_templates' | 'register' | 'rights'>('consents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientForPrint, setSelectedPatientForPrint] = useState<PatientRecord | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<'general' | 'surgical' | 'minor'>('general');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [rightModalPatient, setRightModalPatient] = useState<PatientRecord | null>(null);
  const [rightActionType, setRightActionType] = useState<'export' | 'anonymize' | null>(null);

  // GDPR Modals State
  const [selectedCertificatePatient, setSelectedCertificatePatient] = useState<PatientRecord | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  if (!activeStudio) {
    return <div className="p-8 text-center text-slate-500">Nessuno studio attivo selezionato.</div>;
  }

  // Filter studio patient records
  const studioPatients = useMemo(() => {
    return patientRecords.filter(p => p.studioId === activeStudio.id);
  }, [patientRecords, activeStudio.id]);

  // Key GDPR Metrics
  const metrics = useMemo(() => {
    const total = studioPatients.length;
    if (total === 0) {
      return { total: 0, sanitaryConsentCount: 0, sanitaryConsentPct: 100, recallConsentCount: 0, tesseraSanitariaOpposizioneCount: 0 };
    }
    const sanitary = studioPatients.filter(p => p.gdprSanitaryConsent !== false).length;
    const recall = studioPatients.filter(p => p.recallConsent === true).length;
    const opposizione = studioPatients.filter(p => p.tesseraSanitariaOpposizione === true).length;
    const pct = Math.round((sanitary / total) * 100);

    return {
      total,
      sanitaryConsentCount: sanitary,
      sanitaryConsentPct: pct,
      recallConsentCount: recall,
      tesseraSanitariaOpposizioneCount: opposizione,
    };
  }, [studioPatients]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return studioPatients;
    const q = searchTerm.toLowerCase().trim();
    return studioPatients.filter(
      p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.fiscalCode && p.fiscalCode.toLowerCase().includes(q))
    );
  }, [studioPatients, searchTerm]);

  // Export single patient file (Art. 20 Portabilità Dati)
  const handleExportPatientDossier = (patient: PatientRecord) => {
    const patientAppointments = appointments.filter(
      a =>
        a.studioId === activeStudio.id &&
        (a.patientEmail.toLowerCase() === patient.email.toLowerCase() || a.patientPhone === patient.phone)
    );

    const dossier = {
      exportMetadata: {
        regulation: 'GDPR (Regolamento UE 2016/679) - Art. 20 Diritto alla Portabilità',
        generatedAt: new Date().toISOString(),
        issuerStudio: {
          name: activeStudio.name,
          address: activeStudio.address,
          city: activeStudio.city,
          phone: activeStudio.phone,
          email: activeStudio.email,
        },
      },
      patientRegistry: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        fiscalCode: patient.fiscalCode || 'Non fornito',
        birthDate: patient.birthDate || 'Non fornita',
        address: patient.address || 'Non fornito',
        city: patient.city || 'Non fornita',
      },
      consents: {
        sanitaryTreatmentConsent: patient.gdprSanitaryConsent ?? true,
        sanitaryConsentDate: patient.gdprSanitaryConsentDate || patient.createdAt,
        clinicalInformedConsent: patient.clinicalInformedConsent ?? true,
        clinicalInformedConsentDate: patient.clinicalInformedConsentDate || patient.createdAt,
        tesseraSanitariaOpposizione: patient.tesseraSanitariaOpposizione ?? false,
        recallConsent: patient.recallConsent ?? true,
      },
      clinicalHistory: {
        totalVisits: patient.totalVisits,
        firstVisitDate: patient.firstVisitDate,
        lastVisitDate: patient.lastVisitDate,
        allergies: patient.allergies || 'Nessuna allergia segnalata',
        allergiesList: patient.allergiesList || [],
        medicalConditions: patient.medicalConditions || [],
        clinicalNotes: patient.clinicalNotes || '',
        pastTreatments: patient.pastTreatments || [],
        treatmentPlans: patient.treatmentPlans || [],
      },
      appointmentLedger: patientAppointments.map(a => ({
        code: a.code,
        date: a.date,
        timeSlot: a.timeSlot,
        treatment: a.visitReasonName,
        status: a.status,
        notes: a.notes,
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dossier, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fascicolo-sanitario-gdpr-${patient.lastName.toLowerCase()}-${patient.id.slice(0, 6)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportFeedback(`Fascicolo GDPR di ${patient.firstName} ${patient.lastName} esportato con successo.`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  // Toggle patient consent status
  const handleToggleConsent = async (patient: PatientRecord, field: 'gdprSanitaryConsent' | 'recallConsent' | 'tesseraSanitariaOpposizione') => {
    const updated: PatientRecord = {
      ...patient,
      [field]: !patient[field],
      updatedAt: new Date().toISOString(),
    };
    if (field === 'gdprSanitaryConsent') {
      updated.gdprSanitaryConsentDate = new Date().toISOString();
    }
    await updatePatientRecord(updated);
  };

  // Execute Anonymization / Erasure (Art. 17 GDPR)
  const handleConfirmAnonymization = async (patient: PatientRecord) => {
    const anonymized: PatientRecord = {
      ...patient,
      firstName: 'Paziente',
      lastName: `Anonimizzato-${patient.id.slice(-4)}`,
      email: `anonymized-${patient.id.slice(-6)}@gdpr-erased.invalid`,
      phone: '+39 000 0000000',
      fiscalCode: 'ANONIMIZZATO',
      address: '',
      city: '',
      clinicalNotes: '[DATI CLINICI OSCURATI SU RICHIESTA DI DIRITTO ALL\'OBLIO EX ART. 17 GDPR]',
      allergies: 'OSCURATO',
      allergiesList: [],
      medicalConditions: [],
      updatedAt: new Date().toISOString(),
    };

    await updatePatientRecord(anonymized);
    setRightModalPatient(null);
    setRightActionType(null);
    setExportFeedback(`Dati anagrafici del paziente anonimizzati con successo (Art. 17 GDPR).`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Suite GDPR & Privacy Sanitaria Odontoiatrica
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Conforme Reg. UE 2016/679
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Gestione integrata per studi odontoiatrici: consensi sanitari informati (Art. 9), registro dei trattamenti (Art. 30), portabilità fascicolo clinico (Art. 20) e opposizione al Sistema Tessera Sanitaria (DM MEF).
            </p>
          </div>
        </div>

        {/* Top Header Card Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPolicyModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Testo Informativa In Vigore ({CURRENT_PRIVACY_POLICY_VERSION})</span>
          </button>

          {/* Global Compliance Score Widget */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center gap-3 min-w-[180px]">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
              {metrics.sanitaryConsentPct}%
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Indice Conformità</span>
              <span className="text-xs font-extrabold text-slate-800">
                {metrics.sanitaryConsentCount} su {metrics.total} consensi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {exportFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* 4 Navigation Sub-Tabs */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('consents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'consents'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>Registro Consensi Pazienti</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {metrics.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('informed_templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'informed_templates'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-600" />
          <span>Modelli di Consenso Informato</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('register')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'register'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-purple-600" />
          <span>Registro Trattamenti (Art. 30)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'rights'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4 text-indigo-600" />
          <span>Diritti Interessato (Art. 17 & 20)</span>
        </button>
      </div>

      {/* SUB-TAB 1: REGISTRO CONSENSI PAZIENTI */}
      {activeSubTab === 'consents' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cerca per cognome, email o codice fiscale..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Consenso Firmato
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span> Opposizione STS
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Paziente</th>
                    <th className="py-3.5 px-4">Codice Fiscale</th>
                    <th className="py-3.5 px-4">Versione & Timestamp Consenso (Art. 7)</th>
                    <th className="py-3.5 px-4">Consenso Dati Sanitari (Art. 9)</th>
                    <th className="py-3.5 px-4">Consenso Richiami/Recall</th>
                    <th className="py-3.5 px-4">Opposizione Tessera Sanitaria</th>
                    <th className="py-3.5 px-4 text-right">Azioni Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nessun paziente trovato corrispondente ai criteri di ricerca.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map(patient => (
                      <tr key={patient.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{patient.firstName} {patient.lastName}</div>
                          <div className="text-[11px] text-slate-400">{patient.email} · {patient.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          {patient.fiscalCode || <span className="text-slate-300">Non inserito</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {patient.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {patient.gdprConsentTimestamp
                                ? new Date(patient.gdprConsentTimestamp).toLocaleString('it-IT')
                                : (patient.gdprSanitaryConsentDate || 'Data acquisizione')}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-500">
                              {patient.gdprConsentChannel === 'online_booking' ? '🌐 Online (OTP)' : '🏢 Desk Studio'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleConsent(patient, 'gdprSanitaryConsent')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                              patient.gdprSanitaryConsent !== false
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {patient.gdprSanitaryConsent !== false ? '✓ Concesso' : '✗ Negato'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleConsent(patient, 'recallConsent')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                              patient.recallConsent !== false
                                ? 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {patient.recallConsent !== false ? '✓ Abilitato' : 'Disattivato'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleConsent(patient, 'tesseraSanitariaOpposizione')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                              patient.tesseraSanitariaOpposizione
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}
                            title="L'opposizione vieta la trasmissione della spesa al Sistema Tessera Sanitaria per il 730 precompilato"
                          >
                            {patient.tesseraSanitariaOpposizione ? '⚠️ Opposizione Esercitata' : 'Nessuna Opposizione'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCertificatePatient(patient)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Visualizza Attestato e Tracciamento Consenso Privacy (Audit Trail)"
                            >
                              <FileCheck2 className="w-4 h-4 text-emerald-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatientForPrint(patient);
                                setActiveSubTab('informed_templates');
                              }}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                              title="Genera Modulo Consenso Precompilato"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportPatientDossier(patient)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Esporta Fascicolo Portabile (Art. 20)"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MODELLI DI CONSENSO INFORMATO */}
      {activeSubTab === 'informed_templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Generatore Documentale di Consenso Informato
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seleziona un modello clinico conforme alle linee guida FNOMCeO e AIO/ANDI, precompilato con i dati del paziente e dello studio.
                </p>
              </div>

              {/* Template selector pills */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplateType('general')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedTemplateType === 'general'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Generale & Terapia
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateType('surgical')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedTemplateType === 'surgical'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Chirurgia & Impianti
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateType('minor')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedTemplateType === 'minor'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Minori (Genitore/Tutore)
                </button>
              </div>
            </div>

            {/* Patient selector for auto-fill */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Precompila con Paziente:</span>
              <select
                value={selectedPatientForPrint?.id || ''}
                onChange={e => {
                  const p = studioPatients.find(item => item.id === e.target.value);
                  setSelectedPatientForPrint(p || null);
                }}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">-- Seleziona Paziente (opzionale) --</option>
                {studioPatients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.fiscalCode ? `(${p.fiscalCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Preview Card (Printable Apple-clean layout) */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 text-slate-800 space-y-5 text-xs leading-relaxed font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                    {activeStudio.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {activeStudio.address}, {activeStudio.city} · Tel: {activeStudio.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-600" />
                  Stampa / Salva PDF
                </button>
              </div>

              <div className="text-center py-2">
                <h3 className="text-base font-black text-slate-900 uppercase">
                  {selectedTemplateType === 'general' && 'Modulo di Consenso Informato al Trattamento Odontoiatrico & Privacy Sanitaria'}
                  {selectedTemplateType === 'surgical' && 'Consenso Informato Specifico per Chirurgia Orale, Implantologia ed Anestesia'}
                  {selectedTemplateType === 'minor' && 'Consenso Informato per Trattamento Odontoiatrico su Minore di Età'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Conforme alla Legge 219/2017 e al Regolamento Generale sulla Protezione dei Dati (UE) 2016/679 (GDPR)
                </p>
              </div>

              {/* Patient data box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Paziente:</span>
                  <strong className="text-slate-900">{selectedPatientForPrint ? `${selectedPatientForPrint.firstName} ${selectedPatientForPrint.lastName}` : '______________________'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Codice Fiscale:</span>
                  <strong className="text-slate-900">{selectedPatientForPrint?.fiscalCode || '______________________'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Data di Nascita:</span>
                  <span className="text-slate-700">{selectedPatientForPrint?.birthDate || '___/___/______'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Data Rilascio:</span>
                  <span className="text-slate-700">{new Date().toLocaleDateString('it-IT')}</span>
                </div>
              </div>

              <div className="space-y-3 text-[11px] text-slate-700">
                <p>
                  Il/La sottoscritto/a dichiara di essere stato/a informato/a in modo chiaro e comprensibile dal medico odontoiatra curante circa:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>La diagnosi formulata e le possibili opzioni terapeutiche alternative esistenti;</li>
                  <li>Le modalità di esecuzione, i benefici attesi, i tempi stimati e i prevedibili disagi post-operatori;</li>
                  <li>I rischi specifici connessi alla mancata esecuzione del piano terapeutico consigliato;</li>
                  <li>La somministrazione di anestetici locali per il controllo del dolore intra-operatorio.</li>
                </ul>

                <p className="pt-2 font-medium">
                  <strong>Informativa Trattamento Dati Personali (Art. 13 e 14 GDPR):</strong> I dati personali, sanitari e anamnestici raccolti sono trattati per finalità diagnostiche, terapeutiche e di prevenzione sanitaria. Il trattamento avviene con strumenti informatici protetti e ad accesso controllato, nel rispetto del segreto professionale e del vincolo deontologico.
                </p>
              </div>

              {/* Signatures area */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px]">
                <div className="space-y-8">
                  <span>Luogo e Data: {activeStudio.city}, {new Date().toLocaleDateString('it-IT')}</span>
                  <div className="border-t border-slate-300 pt-1 text-slate-500">
                    Firma del Medico Odontoiatra
                  </div>
                </div>
                <div className="space-y-8 text-right">
                  <span>Per accettazione e consenso consapevole</span>
                  <div className="border-t border-slate-300 pt-1 text-slate-500">
                    Firma leggibile del Paziente / Esercente la responsabilità genitoriale
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: REGISTRO DEI TRATTAMENTI (ART. 30 GDPR) */}
      {activeSubTab === 'register' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Registro delle Attività di Trattamento Dati (Art. 30 GDPR)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Documento obbligatorio che censisce i flussi di dati sanitari gestiti dalla clinica {activeStudio.name} e le relative misure di sicurezza adottate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block text-sm">1. Finalità Diagnostica e Terapeutica</span>
              <p className="text-slate-600">
                <strong>Base Giuridica:</strong> Art. 9, par. 2, lett. h) GDPR (Finalità di medicina preventiva, diagnosi medica, assistenza sanitaria).
              </p>
              <p className="text-slate-600">
                <strong>Categorie di Dati:</strong> Dati identificativi, recapiti, dati sanitari anamnestici, cartella clinica, ortopanoramiche, consensi informati.
              </p>
              <p className="text-slate-600">
                <strong>Periodo di Conservazione:</strong> Illimitato per cartelle cliniche e radiografie odontoiatriche (Circolare Ministero Sanità n. 900 2/2/1984).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block text-sm">2. Finalità Amministrativo-Contabile & Sistema Tessera Sanitaria</span>
              <p className="text-slate-600">
                <strong>Base Giuridica:</strong> Art. 6, par. 1, lett. c) GDPR (Obbligo di legge tributario e trasmissione spese sanitarie DM MEF).
              </p>
              <p className="text-slate-600">
                <strong>Categorie di Dati:</strong> Nome, cognome, codice fiscale, importo fattura, modalità di pagamento tracciabile.
              </p>
              <p className="text-slate-600">
                <strong>Periodo di Conservazione:</strong> 10 anni ex art. 2220 del Codice Civile.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block text-sm">3. Promemoria Visite & Recall di Igiene</span>
              <p className="text-slate-600">
                <strong>Base Giuridica:</strong> Legittimo interesse dello studio e consenso esplicito del paziente per il monitoraggio della salute orale.
              </p>
              <p className="text-slate-600">
                <strong>Misure di Riservatezza:</strong> SMS ed email minimali non invasivi senza diagnosi in chiaro, link tokenizzati con cifratura HTTPS.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block text-sm">4. Misure di Sicurezza Tecniche & Organizzative</span>
              <p className="text-slate-600">
                <strong>Crittografia:</strong> Dati sanitari crittografati in transito (TLS 1.3) e a riposo (AES-256 su cloud Firestore).
              </p>
              <p className="text-slate-600">
                <strong>Controllo Accessi:</strong> Autenticazione a due fattori (2FA), ruoli segregati (Super Admin, Studio Admin, Paziente).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DIRITTI DELL'INTERESSATO (ART. 17 E 20) */}
      {activeSubTab === 'rights' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Esercizio dei Diritti dell'Interessato (GDPR)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strumenti per adempiere tempestivamente alle richieste di portabilità dei dati sanitari (Art. 20) e di diritto all'oblio / cancellazione (Art. 17).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box Art. 20 */}
            <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Art. 20 - Diritto alla Portabilità</h4>
                  <p className="text-[11px] text-slate-500">Esportazione strutturata del fascicolo clinico</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consente al paziente di ricevere tutti i propri dati sanitari in formato aperto (JSON/CSV) per trasferirli a un altro studio odontoiatrico o specialista.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('consents')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Seleziona Paziente da Esportare →
                </button>
              </div>
            </div>

            {/* Box Art. 17 */}
            <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Art. 17 - Diritto all'Oblio & Anonimizzazione</h4>
                  <p className="text-[11px] text-slate-500">Cancellazione sicura dei recapiti e oscuramento</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anonimizza in sicurezza nome, email e telefono del paziente mantenendo inalterati esclusivamente i codici visita necessari per i controlli fiscali obbligatori di legge (10 anni).
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('consents')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Gestisci Anonimizzazioni Pazienti →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GDPR Consent Certificate Modal */}
      {selectedCertificatePatient && (
        <GdprConsentCertificateModal
          isOpen={!!selectedCertificatePatient}
          onClose={() => setSelectedCertificatePatient(null)}
          patient={selectedCertificatePatient}
          studioName={activeStudio?.name}
          studioAddress={activeStudio?.address}
          studioPhone={activeStudio?.phone}
        />
      )}

      {/* Full Active GDPR Policy Modal */}
      <GdprPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        studioName={activeStudio?.name}
        studioAddress={activeStudio?.address}
        studioEmail={activeStudio?.email}
        studioPhone={activeStudio?.phone}
      />
    </div>
  );
};
