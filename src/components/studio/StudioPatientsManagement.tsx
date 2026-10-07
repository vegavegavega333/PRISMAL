import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PatientRecord } from '../../types';
import { PatientClinicalRecordModal } from './PatientClinicalRecordModal';
import { GdprConsentCertificateModal } from '../common/GdprConsentCertificateModal';
import { StudioSendSmsModal } from './StudioSendSmsModal';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../../data/gdprPolicy';
import {
  Users,
  Search,
  Download,
  Phone,
  Mail,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  UserCheck,
  CheckCircle2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  X,
  HeartPulse,
  Activity,
  User,
  Filter,
  Smartphone,
} from 'lucide-react';

export const StudioPatientsManagement: React.FC = () => {
  const {
    activeStudio,
    appointments,
    patientRecords,
    savePatientRecord,
    createDirectPatient,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<'all' | 'alerts' | 'recurring' | 'new'>('all');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active patient modal for Cartella Clinica & Odontogramma
  const [selectedClinicalPatient, setSelectedClinicalPatient] = useState<PatientRecord | null>(null);

  // SMS Dispatch Modal state
  const [smsTargetPatient, setSmsTargetPatient] = useState<PatientRecord | null>(null);

  // New patient modal state
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFiscalCode, setNewFiscalCode] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newAllergies, setNewAllergies] = useState<string[]>([]);
  const [newConditions, setNewConditions] = useState<string[]>([]);
  const [newClinicalNotes, setNewClinicalNotes] = useState('');
  const [newGdprConsent, setNewGdprConsent] = useState(false);
  const [addPatientError, setAddPatientError] = useState<string | null>(null);
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Active patient for GDPR Consent Certificate / Proof Modal
  const [selectedGdprPatient, setSelectedGdprPatient] = useState<PatientRecord | null>(null);

  // Internal notes storage fallback
  const [internalNotes, setInternalNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`prismal_notes_${activeStudio?.id}`) || '{}');
    } catch {
      return {};
    }
  });

  if (!activeStudio) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white/80 rounded-3xl border border-slate-200">
        Nessuno studio selezionato.
      </div>
    );
  }

  const studioAppointments = appointments.filter(a => a.studioId === activeStudio.id);
  const studioPatientRecords = patientRecords.filter(p => p.studioId === activeStudio.id);

  // Unify patient records with appointments:
  // Any appointment patient is guaranteed to be mapped to a PatientRecord.
  const unifiedPatients = useMemo(() => {
    const map = new Map<string, PatientRecord>();

    // 1. First load existing saved patient records
    studioPatientRecords.forEach(pr => {
      const key = (pr.email || pr.phone).toLowerCase().trim();
      map.set(key, pr);
    });

    // 2. Overlay / supplement with appointments
    studioAppointments.forEach(apt => {
      const key = (apt.patientEmail || apt.patientPhone).toLowerCase().trim();
      const existing = map.get(key);

      const aptSummary = {
        date: apt.date,
        treatment: apt.visitReasonName,
        notes: apt.notes,
        cost: '',
      };

      if (existing) {
        // Keep visits count coherent
        const past = existing.pastTreatments || [];
        const alreadyHasApt = past.some(p => p.date === apt.date && p.treatment === apt.visitReasonName);
        if (!alreadyHasApt) {
          existing.pastTreatments = [aptSummary, ...past];
        }
        existing.totalVisits = Math.max(existing.totalVisits || 0, existing.pastTreatments.length);
        if (apt.date > existing.lastVisitDate) existing.lastVisitDate = apt.date;
        if (!existing.firstVisitDate || apt.date < existing.firstVisitDate) existing.firstVisitDate = apt.date;
      } else {
        // Construct clean PatientRecord
        const newRecord: PatientRecord = {
          id: `p-${apt.id}`,
          studioId: activeStudio.id,
          firstName: apt.patientFirstName,
          lastName: apt.patientLastName,
          phone: apt.patientPhone,
          email: apt.patientEmail,
          totalVisits: 1,
          firstVisitDate: apt.date,
          lastVisitDate: apt.date,
          pastTreatments: [aptSummary],
          clinicalNotes: internalNotes[key] || '',
          allergiesList: [],
          medicalConditions: [],
          dentalChart: {},
          treatmentPlans: [],
          createdAt: apt.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        map.set(key, newRecord);
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0));
  }, [studioPatientRecords, studioAppointments, activeStudio.id, internalNotes]);

  // Filter patients by search query and tags
  const filteredPatients = useMemo(() => {
    return unifiedPatients.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.fiscalCode && p.fiscalCode.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const hasAlert =
        (p.allergiesList && p.allergiesList.length > 0) ||
        (p.medicalConditions && p.medicalConditions.some(c => c.toLowerCase().includes('anticoagulante') || c.toLowerCase().includes('cardio') || c.toLowerCase().includes('diabete')));

      if (filterTag === 'alerts') return hasAlert;
      if (filterTag === 'recurring') return (p.totalVisits || 0) > 1;
      if (filterTag === 'new') return (p.totalVisits || 0) <= 1;

      return true;
    });
  }, [unifiedPatients, searchTerm, filterTag]);

  // Quick stats
  const totalPatientsCount = unifiedPatients.length;
  const recurringPatientsCount = unifiedPatients.filter(p => (p.totalVisits || 0) > 1).length;
  const patientsWithAlertsCount = unifiedPatients.filter(
    p => (p.allergiesList && p.allergiesList.length > 0) || (p.medicalConditions && p.medicalConditions.length > 0)
  ).length;

  // Handle Save Note
  const handleSaveNote = (key: string, text: string) => {
    const updated = { ...internalNotes, [key]: text };
    setInternalNotes(updated);
    try {
      localStorage.setItem(`prismal_notes_${activeStudio.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Create New Direct Patient
  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddPatientError(null);

    if (!newFirstName.trim() || !newLastName.trim()) {
      setAddPatientError('Nome e cognome sono obbligatori.');
      return;
    }
    if (!newPhone.trim()) {
      setAddPatientError('Il recapito telefonico è obbligatorio.');
      return;
    }
    if (!newGdprConsent) {
      setAddPatientError('Il consenso al trattamento dei dati sanitari (GDPR) è obbligatorio per salvare l\'anagrafica del paziente.');
      return;
    }

    setIsSavingPatient(true);
    try {
      const consentTimestamp = new Date().toISOString();
      const created = await createDirectPatient({
        studioId: activeStudio.id,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        fiscalCode: newFiscalCode.trim().toUpperCase(),
        birthDate: newBirthDate,
        address: newAddress.trim(),
        city: newCity.trim(),
        allergiesList: newAllergies,
        medicalConditions: newConditions,
        clinicalNotes: newClinicalNotes.trim(),
        gdprSanitaryConsent: true,
        gdprSanitaryConsentDate: consentTimestamp.split('T')[0],
        gdprConsentTimestamp: consentTimestamp,
        gdprPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
        gdprConsentChannel: 'desk_intake',
        gdprConsentPurposes: ['sanitary_treatment', 'appointment_reminders', 'fiscal_compliance'],
        clinicalInformedConsent: false,
        tesseraSanitariaOpposizione: false,
        recallConsent: true,
        recallIntervalMonths: 6,
        totalVisits: 0,
        pastTreatments: [],
      });

      setIsAddPatientOpen(false);
      // Reset form
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewEmail('');
      setNewFiscalCode('');
      setNewBirthDate('');
      setNewAddress('');
      setNewCity('');
      setNewAllergies([]);
      setNewConditions([]);
      setNewClinicalNotes('');
      setNewGdprConsent(false);

      // Open their Cartella Clinica immediately so doctor can begin odontogram
      setSelectedClinicalPatient(created);
    } catch {
      setAddPatientError('Errore durante il salvataggio del paziente.');
    } finally {
      setIsSavingPatient(false);
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (unifiedPatients.length === 0) {
      setExportToast({
        type: 'error',
        message: 'Nessun paziente da esportare. Le anagrafiche compariranno non appena riceverai prenotazioni o inserirai un nuovo paziente.',
      });
      setTimeout(() => setExportToast(null), 4000);
      return;
    }

    const headers = [
      'Nome e Cognome',
      'Codice Fiscale',
      'Telefono',
      'Email',
      'Visite Totali',
      'Prima Visita',
      'Ultima Visita',
      'Allergie Registrate',
      'Condizioni Mediche',
      'Note Cliniche',
    ];

    const rows = unifiedPatients.map(p => {
      const allergiesStr = (p.allergiesList || []).join('; ');
      const conditionsStr = (p.medicalConditions || []).join('; ');
      const note = p.clinicalNotes || internalNotes[(p.email || p.phone).toLowerCase()] || '';

      return [
        `"${(`${p.firstName} ${p.lastName}`).replace(/"/g, '""')}"`,
        `"${(p.fiscalCode || '').replace(/"/g, '""')}"`,
        `"${(p.phone || '').replace(/"/g, '""')}"`,
        `"${(p.email || '').replace(/"/g, '""')}"`,
        p.totalVisits || 0,
        p.firstVisitDate || '',
        p.lastVisitDate || '',
        `"${allergiesStr.replace(/"/g, '""')}"`,
        `"${conditionsStr.replace(/"/g, '""')}"`,
        `"${note.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cartelle_pazienti_${activeStudio.slug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportToast({
      type: 'success',
      message: `File CSV con ${unifiedPatients.length} pazienti esportato con successo!`,
    });
    setTimeout(() => setExportToast(null), 4000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Feedback */}
      {exportToast && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            exportToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {exportToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <span>{exportToast.message}</span>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Anagrafica Pazienti & Cartelle Cliniche
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Archivio storico con Odontogramma digitale FDI, anamnesi medica, diario clinico e piani di cura.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Direct Odontogram 3D Button */}
          <button
            type="button"
            onClick={() => {
              if (unifiedPatients.length > 0) {
                setSelectedClinicalPatient(unifiedPatients[0]);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="Apri l'Odontogramma 3D digitale interattivo"
          >
            <HeartPulse className="w-4 h-4 text-sky-200" />
            <span>Odontogramma 3D Digitale</span>
          </button>

          {/* Add Direct Patient Button */}
          <button
            type="button"
            onClick={() => setIsAddPatientOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Paziente</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200/80 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Esporta CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Pazienti Unici</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalPatientsCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">in anagrafica studio</span>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Pazienti Ricorrenti</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
            {recurringPatientsCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {totalPatientsCount > 0 ? `${Math.round((recurringPatientsCount / totalPatientsCount) * 100)}% fidelizzazione` : 'in attesa'}
          </span>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Visite Totali Eseguite</span>
          <div className="text-2xl font-bold text-sky-600 mt-1 tabular-nums">
            {studioAppointments.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">in agenda studio</span>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Allerte Cliniche Attive</span>
          <div className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">
            {patientsWithAlertsCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">allergie / terapie a rischio</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cerca per nome, telefono, codice fiscale..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterTag('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              filterTag === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tutti ({unifiedPatients.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('alerts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1 ${
              filterTag === 'alerts'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Con Allerte ({patientsWithAlertsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('recurring')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              filterTag === 'recurring'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ricorrenti ({recurringPatientsCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTag('new')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              filterTag === 'new'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Nuovi ({totalPatientsCount - recurringPatientsCount})
          </button>
        </div>
      </div>

      {/* Patient Directory List */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Nessun paziente trovato</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Non ci sono pazienti che corrispondono ai criteri. Clicca su "+ Nuovo Paziente" per registrare una nuova cartella clinica.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPatients.map(patient => {
              const isExpanded = expandedPatientId === patient.id;
              const noteKey = (patient.email || patient.phone).toLowerCase().trim();
              const hasAlert =
                (patient.allergiesList && patient.allergiesList.length > 0) ||
                (patient.medicalConditions &&
                  patient.medicalConditions.some(
                    c =>
                      c.toLowerCase().includes('anticoagulante') ||
                      c.toLowerCase().includes('cardio') ||
                      c.toLowerCase().includes('diabete')
                  ));

              const cleanPhone = (patient.phone || '').replace(/\D/g, '');
              const waLink = `https://wa.me/${cleanPhone.startsWith('39') ? cleanPhone : `39${cleanPhone}`}?text=Gentile%20${encodeURIComponent(
                patient.firstName
              )},%20le%20scriviamo%20dallo%20Studio%20in%20merito%20al%20suo%20piano%20di%20cura.`;

              return (
                <div key={patient.id || patient.email || patient.phone} className="p-5 hover:bg-slate-50/70 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Patient identity */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center flex-shrink-0 border border-slate-200/80">
                        {patient.firstName.charAt(0)}
                        {patient.lastName.charAt(0)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900">
                            {patient.firstName} {patient.lastName}
                          </h4>

                          {patient.fiscalCode && (
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                              {patient.fiscalCode}
                            </span>
                          )}

                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 tabular-nums">
                            {patient.totalVisits || 0} {(patient.totalVisits || 0) === 1 ? 'visita' : 'visite'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGdprPatient(patient);
                            }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition cursor-pointer ${
                              patient.gdprSanitaryConsent !== false
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                            }`}
                            title="Visualizza certificato di consenso GDPR e versione informativa"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>
                              GDPR {patient.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION}
                            </span>
                          </button>

                          {hasAlert && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Alert Clinico</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                          {patient.phone && (
                            <a
                              href={`tel:${patient.phone}`}
                              className="flex items-center gap-1 hover:text-sky-600 transition tabular-nums"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {patient.phone}
                            </a>
                          )}
                          {patient.email && (
                            <>
                              <span>•</span>
                              <a
                                href={`mailto:${patient.email}`}
                                className="flex items-center gap-1 hover:text-sky-600 transition"
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {patient.email}
                              </a>
                            </>
                          )}
                          {patient.lastVisitDate && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400">
                                Ultima visita: <strong className="text-slate-700">{patient.lastVisitDate}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Quick Alerts Preview if any */}
                        {patient.allergiesList && patient.allergiesList.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-rose-700">Allergie:</span>
                            {patient.allergiesList.map((a, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions on Patient */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                      {/* WhatsApp Quick Link */}
                      {cleanPhone && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition text-xs font-semibold flex items-center gap-1"
                          title="Invia messaggio WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      {/* Direct Twilio SMS Quick Dispatch */}
                      {cleanPhone && (
                        <button
                          type="button"
                          onClick={() => setSmsTargetPatient(patient)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Invia SMS istantaneo al paziente con Twilio (promemoria, conferme, avvisi)"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                          <span>SMS</span>
                        </button>
                      )}

                      {/* Primary: Open Cartella Clinica & Odontogramma */}
                      <button
                        type="button"
                        onClick={() => setSelectedClinicalPatient(patient)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <HeartPulse className="w-3.5 h-3.5 text-sky-200" />
                        <span>Cartella Clinica & Odontogramma</span>
                      </button>

                      {/* Expand History Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedPatientId(isExpanded ? null : patient.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <span>{isExpanded ? 'Chiudi' : 'Storico & Note'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Treatment History and Internal Notes */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
                      {/* Past Treatments History */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span>Storico Prestazioni ({patient.pastTreatments?.length || 0})</span>
                        </h5>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {(!patient.pastTreatments || patient.pastTreatments.length === 0) ? (
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-400">
                              Nessun trattamento registrato per questo paziente.
                            </div>
                          ) : (
                            patient.pastTreatments.map((apt, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-slate-800">{apt.treatment}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Data: {apt.date}
                                  </div>
                                  {apt.notes && (
                                    <div className="text-[10px] text-slate-400 italic mt-0.5">
                                      Nota: "{apt.notes}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Studio Internal Clinical Notes */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span>Note Interne dello Studio (Riservate allo Staff)</span>
                        </h5>

                        <textarea
                          rows={4}
                          value={patient.clinicalNotes || internalNotes[noteKey] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            handleSaveNote(noteKey, val);
                            savePatientRecord({
                              ...patient,
                              clinicalNotes: val,
                            });
                          }}
                          placeholder="Inserisci annotazioni riservate allo staff: es. preferenza anestesia senza adrenalina, paziente ansioso, richieste particolari..."
                          className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                        />
                        <p className="text-[10px] text-slate-400">
                          Le note vengono sincronizzate in tempo reale nel database clinico dello studio.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: CARTELLA CLINICA & ODONTOGRAMMA (FDI 11-48, Anamnesi, Diario, Piani di Cura) */}
      {selectedClinicalPatient && (
        <PatientClinicalRecordModal
          patient={selectedClinicalPatient}
          onClose={() => setSelectedClinicalPatient(null)}
          onSave={updated => {
            setSelectedClinicalPatient(updated);
          }}
        />
      )}

      {/* MODAL: NUOVO PAZIENTE DIRETTO */}
      {isAddPatientOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Registra Nuovo Paziente</h3>
                  <p className="text-xs text-slate-500">Inserisci l'anagrafica e le informazioni cliniche di base</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPatientOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addPatientError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {addPatientError}
              </div>
            )}

            <form onSubmit={handleCreatePatientSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={e => setNewFirstName(e.target.value)}
                    placeholder="es. Giulia"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                    placeholder="es. Bianchi"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="es. 348 1234567"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="giulia.bianchi@email.it"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    value={newFiscalCode}
                    onChange={e => setNewFiscalCode(e.target.value.toUpperCase())}
                    placeholder="RSSMRA85M01H501Z"
                    className="w-full px-3.5 py-2.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data di Nascita
                  </label>
                  <input
                    type="date"
                    value={newBirthDate}
                    onChange={e => setNewBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    placeholder="Via Roma 12"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Città
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    placeholder="Milano"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Allergies & Risks Quick Check */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Allergie Note
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Lattice', 'Penicillina', 'FANS / Aspirina', 'Anestetico con Adrenalina', 'Nichel'].map(allergy => {
                    const selected = newAllergies.includes(allergy);
                    return (
                      <button
                        type="button"
                        key={allergy}
                        onClick={() => {
                          if (selected) {
                            setNewAllergies(newAllergies.filter(a => a !== allergy));
                          } else {
                            setNewAllergies([...newAllergies, allergy]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          selected
                            ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{allergy}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medical conditions */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Condizioni Mediche di Rilievo
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Terapia Anticoagulante', 'Cardiopatie', 'Diabete Mellito', 'Ipertensione', 'Osteoporosi (Bifosfonati)'].map(condition => {
                    const selected = newConditions.includes(condition);
                    return (
                      <button
                        type="button"
                        key={condition}
                        onClick={() => {
                          if (selected) {
                            setNewConditions(newConditions.filter(c => c !== condition));
                          } else {
                            setNewConditions([...newConditions, condition]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          selected
                            ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{condition}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Note Cliniche Iniziali (Opzionali)
                </label>
                <textarea
                  rows={2}
                  value={newClinicalNotes}
                  onChange={e => setNewClinicalNotes(e.target.value)}
                  placeholder="Annotazioni dello staff clinico..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Mandatory GDPR Consent Checkbox Card */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  newGdprConsent
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newGdprConsent}
                    onChange={e => {
                      setNewGdprConsent(e.target.checked);
                      if (e.target.checked) setAddPatientError(null);
                    }}
                    required
                    className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div className="space-y-0.5 flex-1">
                    <span className="font-bold text-slate-900 block">
                      Consenso al Trattamento Dati Sanitari GDPR (Versione {CURRENT_PRIVACY_POLICY_VERSION}) *
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Confermo di aver raccolto il consenso informato scritto o telematico del paziente a norma del Regolamento UE 2016/679. Verranno archiviati la marcatura temporale certificata e la versione in vigore ({CURRENT_PRIVACY_POLICY_VERSION}).
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddPatientOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSavingPatient}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSavingPatient ? 'Salvataggio...' : 'Crea e Apri Odontogramma'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GDPR Consent Certificate Modal */}
      {selectedGdprPatient && (
        <GdprConsentCertificateModal
          isOpen={!!selectedGdprPatient}
          onClose={() => setSelectedGdprPatient(null)}
          patient={selectedGdprPatient}
          studioName={activeStudio?.name}
          studioAddress={activeStudio?.address}
          studioPhone={activeStudio?.phone}
        />
      )}

      {/* Direct Twilio SMS Modal */}
      {smsTargetPatient && (
        <StudioSendSmsModal
          isOpen={Boolean(smsTargetPatient)}
          onClose={() => setSmsTargetPatient(null)}
          patientPhone={smsTargetPatient.phone}
          patientName={`${smsTargetPatient.firstName} ${smsTargetPatient.lastName}`}
          studioName={activeStudio?.name}
        />
      )}
    </div>
  );
};
