import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PatientRecord, ToothStatus, ToothData, TreatmentPlan, TreatmentPlanItem } from '../../types';
import { CURRENT_PRIVACY_POLICY_VERSION } from '../../data/gdprPolicy';
import { isFeatureAllowed } from '../../data/planTierDefinitions';
import { GdprConsentCertificateModal } from '../common/GdprConsentCertificateModal';
import { PaymentCheckoutModal } from '../common/PaymentCheckoutModal';
import {
  X,
  User,
  Phone,
  Mail,
  AlertTriangle,
  HeartPulse,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  MessageCircle,
  Save,
  Plus,
  Trash2,
  Euro,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  Check,
  FileCheck,
  FileCheck2,
} from 'lucide-react';

interface Props {
  patient: PatientRecord;
  onClose: () => void;
  onSave?: (updated: PatientRecord) => void;
}

const TOOTH_STATUS_CONFIG: Record<
  ToothStatus,
  { label: string; color: string; bg: string; border: string; badge: string }
> = {
  healthy: {
    label: 'Sano',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  decay: {
    label: 'Carie Attiva',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-400',
    badge: 'bg-rose-100 text-rose-800 font-bold',
  },
  filled: {
    label: 'Otturato',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-400',
    badge: 'bg-sky-100 text-sky-800',
  },
  crown: {
    label: 'Corona / Capsula',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    badge: 'bg-purple-100 text-purple-800',
  },
  implant: {
    label: 'Impianto Osteointegrato',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    badge: 'bg-amber-100 text-amber-900',
  },
  endodontic: {
    label: 'Devitalizzato / Canalare',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    badge: 'bg-orange-100 text-orange-800',
  },
  missing: {
    label: 'Mancante / Estratto',
    color: 'text-slate-400',
    bg: 'bg-slate-100',
    border: 'border-slate-300 border-dashed',
    badge: 'bg-slate-200 text-slate-600',
  },
};

const COMMON_ALLERGIES = [
  'Penicillina / Amoxicillina',
  'Lattice (Guanti/Diga)',
  'FANS / Aspirina',
  'Anestetici Locali con Adrenalina',
  'Nichel / Metalli',
  'Clorexidina',
];

const COMMON_CONDITIONS = [
  'Ipertensione Arteriosa',
  'Diabete Mellito',
  'Cardiopatie / Valvulopatie',
  'Terapia Anticoagulante (Cardioaspirina, Sintrom, Eliquis)',
  'Asma Bronchiale',
  'Osteoporosi (Bifosfonati)',
  'Fumo (>10 sigarette/die)',
  'Gravidanza / Allattamento',
];

export const PatientClinicalRecordModal: React.FC<Props> = ({ patient, onClose, onSave }) => {
  const { activeStudio, savePatientRecord } = useApp();

  const hasOdontogram = activeStudio ? isFeatureAllowed(activeStudio.plan, 'digitalOdontogram') : false;
  const hasTreatmentPlans = activeStudio ? isFeatureAllowed(activeStudio.plan, 'treatmentPlans') : false;

  const [activeTab, setActiveTab] = useState<'odontogram' | 'anamnesis' | 'diary' | 'treatment_plan' | 'compliance'>(() => {
    return hasOdontogram ? 'odontogram' : 'anamnesis';
  });

  const [showUpgradeCheckout, setShowUpgradeCheckout] = useState(false);
  const [targetUpgradePlan, setTargetUpgradePlan] = useState<'pro_monthly' | 'premium_monthly'>('pro_monthly');

  // Local state for editing patient record
  const [formData, setFormData] = useState<PatientRecord>(() => ({
    ...patient,
    medicalConditions: patient.medicalConditions || [],
    allergiesList: patient.allergiesList || (patient.allergies ? [patient.allergies] : []),
    dentalChart: patient.dentalChart || {},
    treatmentPlans: patient.treatmentPlans || [],
    pastTreatments: patient.pastTreatments || [],
    gdprSanitaryConsent: patient.gdprSanitaryConsent ?? true,
    gdprSanitaryConsentDate: patient.gdprSanitaryConsentDate || (patient.firstVisitDate || new Date().toISOString().split('T')[0]),
    gdprConsentTimestamp: patient.gdprConsentTimestamp || (patient.gdprSanitaryConsentDate ? `${patient.gdprSanitaryConsentDate}T09:00:00.000Z` : patient.createdAt),
    gdprPolicyVersion: patient.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION,
    gdprConsentChannel: patient.gdprConsentChannel || 'desk_intake',
    clinicalInformedConsent: patient.clinicalInformedConsent ?? false,
    clinicalInformedConsentDate: patient.clinicalInformedConsentDate || '',
    tesseraSanitariaOpposizione: patient.tesseraSanitariaOpposizione ?? false,
    recallConsent: patient.recallConsent ?? true,
    recallIntervalMonths: patient.recallIntervalMonths || 6,
    nextRecallDate: patient.nextRecallDate || '',
  }));

  const [showGdprCertModal, setShowGdprCertModal] = useState(false);

  // Selected tooth for editing details
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothNoteInput, setToothNoteInput] = useState<string>('');

  // New diary entry state
  const [newDiaryDate, setNewDiaryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newDiaryTreatment, setNewDiaryTreatment] = useState<string>('');
  const [newDiaryNotes, setNewDiaryNotes] = useState<string>('');

  // Treatment plan builder state
  const [planTitle, setPlanTitle] = useState('Piano di Cura Generale');
  const [newPlanProcedure, setNewPlanProcedure] = useState('');
  const [newPlanTooth, setNewPlanTooth] = useState<number | undefined>(undefined);
  const [newPlanCost, setNewPlanCost] = useState<number>(80);
  const [planDiscount, setPlanDiscount] = useState<number>(0);
  const [savedToast, setSavedToast] = useState(false);

  // Dental arches FDI definition
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // Tooth status update handler
  const handleSetToothStatus = (toothNumber: number, status: ToothStatus) => {
    const current = formData.dentalChart?.[toothNumber] || { status: 'healthy' };
    const updatedChart = {
      ...formData.dentalChart,
      [toothNumber]: {
        ...current,
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    setFormData(prev => ({ ...prev, dentalChart: updatedChart }));
  };

  const handleSaveToothNote = (toothNumber: number) => {
    const current = formData.dentalChart?.[toothNumber] || { status: 'healthy' };
    const updatedChart = {
      ...formData.dentalChart,
      [toothNumber]: {
        ...current,
        notes: toothNoteInput.trim(),
        updatedAt: new Date().toISOString(),
      },
    };
    setFormData(prev => ({ ...prev, dentalChart: updatedChart }));
    setToothNoteInput('');
  };

  // Toggle allergy
  const handleToggleAllergy = (allergy: string) => {
    const current = formData.allergiesList || [];
    const exists = current.includes(allergy);
    const updated = exists ? current.filter(a => a !== allergy) : [...current, allergy];
    setFormData(prev => ({
      ...prev,
      allergiesList: updated,
      allergies: updated.join(', '),
    }));
  };

  // Toggle condition
  const handleToggleCondition = (cond: string) => {
    const current = formData.medicalConditions || [];
    const exists = current.includes(cond);
    const updated = exists ? current.filter(c => c !== cond) : [...current, cond];
    setFormData(prev => ({ ...prev, medicalConditions: updated }));
  };

  // Add clinical diary entry
  const handleAddDiaryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiaryTreatment.trim()) return;

    const newEntry = {
      date: newDiaryDate,
      treatment: newDiaryTreatment.trim(),
      notes: newDiaryNotes.trim(),
      cost: '',
    };

    setFormData(prev => ({
      ...prev,
      pastTreatments: [newEntry, ...(prev.pastTreatments || [])],
      lastVisitDate: newDiaryDate,
    }));

    setNewDiaryTreatment('');
    setNewDiaryNotes('');
  };

  // Treatment plan item addition
  const handleAddTreatmentItem = () => {
    if (!newPlanProcedure.trim()) return;

    const newItem: TreatmentPlanItem = {
      id: `item-${Date.now()}`,
      procedure: newPlanProcedure.trim(),
      tooth: newPlanTooth,
      cost: Number(newPlanCost) || 0,
    };

    const currentPlans = formData.treatmentPlans || [];
    let activePlan = currentPlans[0];

    if (!activePlan) {
      activePlan = {
        id: `plan-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        title: planTitle,
        items: [newItem],
        discountPct: planDiscount,
        total: newItem.cost,
        status: 'draft',
      };
      setFormData(prev => ({ ...prev, treatmentPlans: [activePlan] }));
    } else {
      const updatedItems = [...activePlan.items, newItem];
      const subtotal = updatedItems.reduce((acc, it) => acc + it.cost, 0);
      const total = planDiscount > 0 ? Math.round(subtotal * (1 - planDiscount / 100)) : subtotal;
      const updatedPlan: TreatmentPlan = {
        ...activePlan,
        items: updatedItems,
        total,
      };
      setFormData(prev => ({ ...prev, treatmentPlans: [updatedPlan, ...currentPlans.slice(1)] }));
    }

    setNewPlanProcedure('');
    setNewPlanTooth(undefined);
  };

  // Remove plan item
  const handleRemovePlanItem = (itemId: string) => {
    const currentPlans = formData.treatmentPlans || [];
    if (currentPlans.length === 0) return;
    const plan = currentPlans[0];
    const updatedItems = plan.items.filter(i => i.id !== itemId);
    const subtotal = updatedItems.reduce((acc, it) => acc + it.cost, 0);
    const total = plan.discountPct ? Math.round(subtotal * (1 - plan.discountPct / 100)) : subtotal;

    const updatedPlan: TreatmentPlan = {
      ...plan,
      items: updatedItems,
      total,
    };
    setFormData(prev => ({ ...prev, treatmentPlans: [updatedPlan, ...currentPlans.slice(1)] }));
  };

  // Master save
  const handleSaveAll = async () => {
    await savePatientRecord(formData);
    if (onSave) onSave(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  // WhatsApp quick link
  const cleanPhone = formData.phone.replace(/[^0-9+]/g, '');
  const waUrl = `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : `39${cleanPhone}`}?text=${encodeURIComponent(
    `Gentile ${formData.firstName}, le scriviamo dallo ${activeStudio?.name || 'Studio Odontoiatrico PRISMAL'} in merito al suo percorso di cure dentali.`
  )}`;

  // Clinical risk alert condition
  const hasClinicalAlert = (formData.allergiesList && formData.allergiesList.length > 0) ||
    (formData.medicalConditions && formData.medicalConditions.some(c => c.includes('Anticoagulante') || c.includes('Cardiopatie') || c.includes('Diabete')));

  const activePlan = formData.treatmentPlans?.[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {formData.firstName} {formData.lastName}
                </h3>
                {formData.fiscalCode && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-200 text-slate-800">
                    {formData.fiscalCode}
                  </span>
                )}
                {hasClinicalAlert && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                    <ShieldAlert className="w-3 h-3 text-rose-600" />
                    Allerta Clinica
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {formData.phone}
                </span>
                {formData.email && (
                  <span className="flex items-center gap-1 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {formData.email}
                  </span>
                )}
                <span className="text-slate-400">
                  Visite effettuate: <strong className="text-slate-700">{formData.totalVisits || 0}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
              title="Apri chat WhatsApp con il paziente"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
              title="Stampa scheda cartella clinica"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stampa Cartella</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salva Modifiche</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clinical Alert Warning Banner if present */}
        {hasClinicalAlert && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-950">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Attenzione Clinica:</strong>{' '}
                {formData.allergiesList && formData.allergiesList.length > 0 && `Allergie: ${formData.allergiesList.join(', ')}. `}
                {formData.medicalConditions && formData.medicalConditions.length > 0 && `Condizioni: ${formData.medicalConditions.join(', ')}.`}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('anamnesis')}
              className="text-[11px] font-bold text-rose-700 hover:underline"
            >
              Gestisci Anamnesi →
            </button>
          </div>
        )}

        {/* Success feedback toast */}
        {savedToast && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-6 py-2 text-center flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Cartella clinica sincronizzata e salvata con successo su Firestore!</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 overflow-x-auto bg-white">
          <button
            onClick={() => setActiveTab('odontogram')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'odontogram'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Odontogramma Interattivo FDI</span>
            {!hasOdontogram && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                PRO
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('anamnesis')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'anamnesis'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Anamnesi & Allergie ({formData.allergiesList?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('diary')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'diary'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Diario Clinico & Trattamenti ({formData.pastTreatments?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('treatment_plan')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'treatment_plan'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Euro className="w-3.5 h-3.5" />
            <span>Piano di Cura & Preventivo</span>
            {!hasTreatmentPlans && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                PRO
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'compliance'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Consensi & Normative Sanitarie</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 space-y-6">
          {/* TAB 1: ODONTOGRAMMA INTERATTIVO */}
          {activeTab === 'odontogram' && (
            <div className="space-y-6">
              {/* Status Legend Strip */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 overflow-x-auto text-xs">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider whitespace-nowrap">
                  Legenda Denti:
                </span>
                {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).map(statusKey => {
                  const cfg = TOOTH_STATUS_CONFIG[statusKey];
                  return (
                    <div
                      key={statusKey}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs whitespace-nowrap"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.bg} border ${cfg.border}`} />
                      <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* DENTAL ARCH VISUAL CHART */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-8">
                {/* Upper Jaw (Arcata Superiore) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3 border-b border-slate-100 pb-1">
                    <span>DESTRO (Q1)</span>
                    <span className="text-slate-800 uppercase tracking-wider text-[11px]">Arcata Superiore (Mascella)</span>
                    <span>SINISTRO (Q2)</span>
                  </div>

                  <div className="grid grid-cols-16 gap-1.5 sm:gap-2">
                    {/* Q1: 18 -> 11 */}
                    {upperRight.map(tNum => {
                      const tData = formData.dentalChart?.[tNum] || { status: 'healthy' };
                      const cfg = TOOTH_STATUS_CONFIG[tData.status];
                      const isSelected = selectedTooth === tNum;

                      return (
                        <button
                          key={tNum}
                          onClick={() => {
                            setSelectedTooth(tNum);
                            setToothNoteInput(tData.notes || '');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                            isSelected
                              ? 'ring-2 ring-sky-500 shadow-md scale-105'
                              : 'hover:shadow-sm hover:scale-102'
                          } ${cfg.bg} ${cfg.border}`}
                          title={`Dente ${tNum}: ${cfg.label} ${tData.notes ? `(${tData.notes})` : ''}`}
                        >
                          <span className="text-[10px] font-extrabold text-slate-600">{tNum}</span>
                          <div
                            className={`w-6 h-6 rounded-lg my-1 flex items-center justify-center text-[10px] font-black ${
                              tData.status === 'decay'
                                ? 'bg-rose-500 text-white'
                                : tData.status === 'filled'
                                ? 'bg-sky-500 text-white'
                                : tData.status === 'crown'
                                ? 'bg-purple-500 text-white'
                                : tData.status === 'implant'
                                ? 'bg-amber-500 text-white'
                                : tData.status === 'endodontic'
                                ? 'bg-orange-500 text-white'
                                : tData.status === 'missing'
                                ? 'line-through text-slate-400 bg-slate-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tData.status === 'missing' ? 'X' : tNum % 10}
                          </div>
                          <span className={`text-[9px] font-bold truncate max-w-[40px] ${cfg.color}`}>
                            {cfg.label.slice(0, 5)}
                          </span>
                        </button>
                      );
                    })}

                    {/* Q2: 21 -> 28 */}
                    {upperLeft.map(tNum => {
                      const tData = formData.dentalChart?.[tNum] || { status: 'healthy' };
                      const cfg = TOOTH_STATUS_CONFIG[tData.status];
                      const isSelected = selectedTooth === tNum;

                      return (
                        <button
                          key={tNum}
                          onClick={() => {
                            setSelectedTooth(tNum);
                            setToothNoteInput(tData.notes || '');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                            isSelected
                              ? 'ring-2 ring-sky-500 shadow-md scale-105'
                              : 'hover:shadow-sm hover:scale-102'
                          } ${cfg.bg} ${cfg.border}`}
                          title={`Dente ${tNum}: ${cfg.label} ${tData.notes ? `(${tData.notes})` : ''}`}
                        >
                          <span className="text-[10px] font-extrabold text-slate-600">{tNum}</span>
                          <div
                            className={`w-6 h-6 rounded-lg my-1 flex items-center justify-center text-[10px] font-black ${
                              tData.status === 'decay'
                                ? 'bg-rose-500 text-white'
                                : tData.status === 'filled'
                                ? 'bg-sky-500 text-white'
                                : tData.status === 'crown'
                                ? 'bg-purple-500 text-white'
                                : tData.status === 'implant'
                                ? 'bg-amber-500 text-white'
                                : tData.status === 'endodontic'
                                ? 'bg-orange-500 text-white'
                                : tData.status === 'missing'
                                ? 'line-through text-slate-400 bg-slate-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tData.status === 'missing' ? 'X' : tNum % 10}
                          </div>
                          <span className={`text-[9px] font-bold truncate max-w-[40px] ${cfg.color}`}>
                            {cfg.label.slice(0, 5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lower Jaw (Arcata Inferiore) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3 border-b border-slate-100 pb-1">
                    <span>DESTRO (Q4)</span>
                    <span className="text-slate-800 uppercase tracking-wider text-[11px]">Arcata Inferiore (Mandibola)</span>
                    <span>SINISTRO (Q3)</span>
                  </div>

                  <div className="grid grid-cols-16 gap-1.5 sm:gap-2">
                    {/* Q4: 48 -> 41 */}
                    {lowerRight.map(tNum => {
                      const tData = formData.dentalChart?.[tNum] || { status: 'healthy' };
                      const cfg = TOOTH_STATUS_CONFIG[tData.status];
                      const isSelected = selectedTooth === tNum;

                      return (
                        <button
                          key={tNum}
                          onClick={() => {
                            setSelectedTooth(tNum);
                            setToothNoteInput(tData.notes || '');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                            isSelected
                              ? 'ring-2 ring-sky-500 shadow-md scale-105'
                              : 'hover:shadow-sm hover:scale-102'
                          } ${cfg.bg} ${cfg.border}`}
                          title={`Dente ${tNum}: ${cfg.label} ${tData.notes ? `(${tData.notes})` : ''}`}
                        >
                          <span className="text-[10px] font-extrabold text-slate-600">{tNum}</span>
                          <div
                            className={`w-6 h-6 rounded-lg my-1 flex items-center justify-center text-[10px] font-black ${
                              tData.status === 'decay'
                                ? 'bg-rose-500 text-white'
                                : tData.status === 'filled'
                                ? 'bg-sky-500 text-white'
                                : tData.status === 'crown'
                                ? 'bg-purple-500 text-white'
                                : tData.status === 'implant'
                                ? 'bg-amber-500 text-white'
                                : tData.status === 'endodontic'
                                ? 'bg-orange-500 text-white'
                                : tData.status === 'missing'
                                ? 'line-through text-slate-400 bg-slate-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tData.status === 'missing' ? 'X' : tNum % 10}
                          </div>
                          <span className={`text-[9px] font-bold truncate max-w-[40px] ${cfg.color}`}>
                            {cfg.label.slice(0, 5)}
                          </span>
                        </button>
                      );
                    })}

                    {/* Q3: 31 -> 38 */}
                    {lowerLeft.map(tNum => {
                      const tData = formData.dentalChart?.[tNum] || { status: 'healthy' };
                      const cfg = TOOTH_STATUS_CONFIG[tData.status];
                      const isSelected = selectedTooth === tNum;

                      return (
                        <button
                          key={tNum}
                          onClick={() => {
                            setSelectedTooth(tNum);
                            setToothNoteInput(tData.notes || '');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${
                            isSelected
                              ? 'ring-2 ring-sky-500 shadow-md scale-105'
                              : 'hover:shadow-sm hover:scale-102'
                          } ${cfg.bg} ${cfg.border}`}
                          title={`Dente ${tNum}: ${cfg.label} ${tData.notes ? `(${tData.notes})` : ''}`}
                        >
                          <span className="text-[10px] font-extrabold text-slate-600">{tNum}</span>
                          <div
                            className={`w-6 h-6 rounded-lg my-1 flex items-center justify-center text-[10px] font-black ${
                              tData.status === 'decay'
                                ? 'bg-rose-500 text-white'
                                : tData.status === 'filled'
                                ? 'bg-sky-500 text-white'
                                : tData.status === 'crown'
                                ? 'bg-purple-500 text-white'
                                : tData.status === 'implant'
                                ? 'bg-amber-500 text-white'
                                : tData.status === 'endodontic'
                                ? 'bg-orange-500 text-white'
                                : tData.status === 'missing'
                                ? 'line-through text-slate-400 bg-slate-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tData.status === 'missing' ? 'X' : tNum % 10}
                          </div>
                          <span className={`text-[9px] font-bold truncate max-w-[40px] ${cfg.color}`}>
                            {cfg.label.slice(0, 5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Tooth Inspector Drawer */}
              {selectedTooth ? (
                <div className="p-5 bg-white rounded-3xl border border-sky-200 shadow-sm animate-in fade-in space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm">
                        {selectedTooth}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Gestione Clinica Elemento Dentale {selectedTooth}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Seleziona lo stato attuale e annota eventuali interventi o piani di cura.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTooth(null)}
                      className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                    >
                      Chiudi
                    </button>
                  </div>

                  {/* Status Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).map(sKey => {
                      const cfg = TOOTH_STATUS_CONFIG[sKey];
                      const isCurrent = (formData.dentalChart?.[selectedTooth]?.status || 'healthy') === sKey;

                      return (
                        <button
                          key={sKey}
                          onClick={() => handleSetToothStatus(selectedTooth, sKey)}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                            isCurrent
                              ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-xs'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg} border ${cfg.border}`} />
                          <span className="text-[11px]">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tooth note input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={toothNoteInput}
                      onChange={e => setToothNoteInput(e.target.value)}
                      placeholder="Note cliniche per questo dente: es. otturazione MOD, carie interdentale, impianto Branemark..."
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={() => handleSaveToothNote(selectedTooth)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salva Nota
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 text-sky-950 text-xs flex items-center gap-2 font-medium">
                  <Edit3 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span>
                    Clicca su qualunque elemento dentale (11-48) nella mappa sopra per modificarne lo stato clinico (carie, otturazione, corona, impianto) o aggiungere note terapeutiche specifiche.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANAMNESI MEDICA & ALLERGIE */}
          {activeTab === 'anamnesis' && (
            <div className="space-y-6">
              {/* Allergies Section */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Allergie a Farmaci & Materiali Odontoiatrici</h4>
                    <p className="text-xs text-slate-500">
                      Seleziona le sostanze a cui il paziente ha manifestato reazioni avverse.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {COMMON_ALLERGIES.map(allergy => {
                    const isSelected = formData.allergiesList?.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => handleToggleAllergy(allergy)}
                        className={`p-3 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{allergy}</span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medical Systemic Conditions */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Patologie Sistemiche & Condizioni Mediche</h4>
                    <p className="text-xs text-slate-500">
                      Fattori di rischio da tenere in considerazione prima di anestesie, chirurgie o prescrizioni.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {COMMON_CONDITIONS.map(cond => {
                    const isSelected = formData.medicalConditions?.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => handleToggleCondition(cond)}
                        className={`p-3 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate pr-2">{cond}</span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free Anamnesis Notes */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Note Anamnestiche Libere & Terapie Farmacologiche in Corso</span>
                </h4>
                <textarea
                  rows={4}
                  value={formData.clinicalNotes || ''}
                  onChange={e => setFormData(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                  placeholder="Annotazioni mediche approfondite: es. valori pressori medi, dosaggio farmaci attuali, medico di base Dott. Bianchi..."
                  className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DIARIO CLINICO & TRATTAMENTI */}
          {activeTab === 'diary' && (
            <div className="space-y-6">
              {/* Form to add diary entry */}
              <form onSubmit={handleAddDiaryEntry} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Registra Nuovo Trattamento Clinico</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Esecuzione</label>
                    <input
                      type="date"
                      value={newDiaryDate}
                      onChange={e => setNewDiaryDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Trattamento Effettuato</label>
                    <input
                      type="text"
                      value={newDiaryTreatment}
                      onChange={e => setNewDiaryTreatment(e.target.value)}
                      placeholder="Es: Ablazione tartaro e lucidatura con pasta al fluoro"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Note del Medico & Prescrizioni</label>
                  <textarea
                    rows={2}
                    value={newDiaryNotes}
                    onChange={e => setNewDiaryNotes(e.target.value)}
                    placeholder="Es: Anestesia plessica carbocaina 2% senza vasocostrittore. Nessuna complicanza..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    Aggiungi a Diario Paziente
                  </button>
                </div>
              </form>

              {/* Diary Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>Storico Cronologico Visite & Interventi</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {formData.pastTreatments?.length || 0} prestazioni
                  </span>
                </h4>

                {(!formData.pastTreatments || formData.pastTreatments.length === 0) ? (
                  <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                    Nessun trattamento ancora registrato in cartella.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.pastTreatments.map((entry, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 text-[10px] font-bold">
                              {entry.date}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">{entry.treatment}</span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-slate-600 italic pl-1">"{entry.notes}"</p>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-center">
                          Eseguito
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PIANO DI CURA & PREVENTIVO */}
          {activeTab === 'treatment_plan' && (
            <div className="space-y-6">
              {/* Creator Box */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Euro className="w-4 h-4 text-emerald-600" />
                    <span>Costruzione Piano di Trattamento & Preventivo</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    Stato: <span className="text-amber-700 uppercase font-black">{activePlan?.status || 'Bozza'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Prestazione Odontoiatrica</label>
                    <input
                      type="text"
                      value={newPlanProcedure}
                      onChange={e => setNewPlanProcedure(e.target.value)}
                      placeholder="Es: Corona in Zirconia Ceramica, Otturazione composito..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Elemento Dentale (Opzionale)</label>
                    <input
                      type="number"
                      min={11}
                      max={48}
                      value={newPlanTooth || ''}
                      onChange={e => setNewPlanTooth(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Es: 16"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tariffa (€)</label>
                    <input
                      type="number"
                      min={0}
                      value={newPlanCost}
                      onChange={e => setNewPlanCost(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddTreatmentItem}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi Voce al Preventivo</span>
                  </button>
                </div>
              </div>

              {/* Items List & Summary */}
              {activePlan && activePlan.items.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 text-xs">Voci del Piano di Cura</span>
                    <span className="text-xs text-slate-500 font-semibold">{activePlan.items.length} prestazioni</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {activePlan.items.map((it, idx) => (
                      <div key={it.id || idx} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">{it.procedure}</p>
                            {it.tooth && (
                              <p className="text-[11px] text-sky-600 font-semibold">Elemento dentale: {it.tooth}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-black text-slate-900 tabular-nums">€{it.cost.toFixed(2)}</span>
                          <button
                            onClick={() => handleRemovePlanItem(it.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Rimuovi voce"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Totals */}
                  <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-600">Sconto Studio %:</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={planDiscount}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setPlanDiscount(val);
                          const subtotal = activePlan.items.reduce((acc, it) => acc + it.cost, 0);
                          const total = val > 0 ? Math.round(subtotal * (1 - val / 100)) : subtotal;
                          const updatedPlan = { ...activePlan, discountPct: val, total };
                          setFormData(prev => ({ ...prev, treatmentPlans: [updatedPlan] }));
                        }}
                        className="w-16 px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-center font-bold"
                      />
                    </div>

                    <div className="flex items-baseline gap-2 text-right">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Totale Preventivo:</span>
                      <span className="text-2xl font-black text-slate-900 tabular-nums">
                        €{activePlan.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                  Nessuna voce presente nel piano di cura. Aggiungi la prima prestazione sopra.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CONSENSI & NORMATIVE SANITARIE (GDPR, L. 219/2017, Sistema TS, Recall) */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              {/* Top Banner Normativa Italiana */}
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 p-5 rounded-3xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Conformità Normativa Odontoiatrica Italiana
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Gestione a norma di legge del <strong>Consenso Informato (L. 219/2017)</strong>, della <strong>Privacy Sanitaria (GDPR Reg. UE 2016/679)</strong> e dell'<strong>Opposizione al Sistema Tessera Sanitaria (D.M. 19/10/2020)</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Consenso Informato Clinico (Legge 219/2017) */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Consenso Informato Clinico
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">Legge 22 dicembre 2017, n. 219</span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        formData.clinicalInformedConsent
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {formData.clinicalInformedConsent ? 'Acquisito e Firmato' : 'Da Acquisire'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Il paziente è stato informato in modo completo ed esauriente sulle diagnosi, sui piani di cura proposti, sui benefici attesi, sui rischi prevedibili e sulle eventuali alternative terapeutiche.
                  </p>

                  <div className="pt-2 space-y-3">
                    <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.clinicalInformedConsent || false}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            clinicalInformedConsent: checked,
                            clinicalInformedConsentDate: checked ? (prev.clinicalInformedConsentDate || new Date().toISOString().split('T')[0]) : '',
                          }));
                        }}
                        className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-semibold">
                        Consenso informato alle cure odontoiatriche sottoscritto dal paziente o dal legale rappresentante.
                      </span>
                    </label>

                    {formData.clinicalInformedConsent && (
                      <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-slate-500 font-medium">Data Acquisizione:</span>
                        <input
                          type="date"
                          value={formData.clinicalInformedConsentDate || new Date().toISOString().split('T')[0]}
                          onChange={e => setFormData(prev => ({ ...prev, clinicalInformedConsentDate: e.target.value }))}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Stampa Modulo Consenso Informato</span>
                    </button>
                  </div>
                </div>

                {/* 2. Privacy e Trattamento Dati Sanitari (GDPR) */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Privacy & Dati Sanitari
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">GDPR (UE) 2016/679 • D.Lgs 101/2018</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                      Conforme GDPR
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Trattamento dei dati particolari relativi allo stato di salute necessari per le finalità di diagnosi, prevenzione e cura odontoiatrica presso la clinica.
                  </p>

                  <div className="pt-2 space-y-3">
                    <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.gdprSanitaryConsent !== false}
                        onChange={e => {
                          setFormData(prev => ({
                            ...prev,
                            gdprSanitaryConsent: e.target.checked,
                            gdprSanitaryConsentDate: e.target.checked ? (prev.gdprSanitaryConsentDate || new Date().toISOString().split('T')[0]) : '',
                          }));
                        }}
                        className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-semibold">
                        Informativa privacy sanitaria visionata e consenso espresso al trattamento dei dati di salute.
                      </span>
                    </label>

                    <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Versione Informativa:</span>
                        <span className="font-bold font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          {formData.gdprPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Data & Timestamp:</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px]">
                          {formData.gdprConsentTimestamp
                            ? new Date(formData.gdprConsentTimestamp).toLocaleString('it-IT')
                            : (formData.gdprSanitaryConsentDate || 'Registrato all\'accettazione')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Canale di Acquisizione:</span>
                        <span className="font-semibold text-slate-700 text-[11px]">
                          {formData.gdprConsentChannel === 'online_booking' ? '🌐 Prenotazione Online OTP' : '🏢 Accettazione Desk Clinica'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGdprCertModal(true)}
                        className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Attestato Consenso (Art. 7)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date().toISOString();
                          setFormData(prev => ({
                            ...prev,
                            gdprSanitaryConsent: true,
                            gdprSanitaryConsentDate: now.split('T')[0],
                            gdprConsentTimestamp: now,
                            gdprPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
                            gdprConsentChannel: 'desk_intake',
                          }));
                        }}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Aggiorna alla versione più recente delle condizioni di privacy"
                      >
                        <Check className="w-3.5 h-3.5 text-sky-600" />
                        <span>Aggiorna a {CURRENT_PRIVACY_POLICY_VERSION}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Stampa Copia Cartella per il Paziente (Art. 15 GDPR)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Sistema Tessera Sanitaria (Opposizione) */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Sistema Tessera Sanitaria
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">D.M. 19 Ottobre 2020 e Garante Privacy</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    In base alla legge italiana, il paziente ha la facoltà di opporsi all'invio dei dati delle proprie spese sanitarie all'Agenzia delle Entrate per il modello 730 precompilato.
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tesseraSanitariaOpposizione || false}
                        onChange={e => {
                          setFormData(prev => ({
                            ...prev,
                            tesseraSanitariaOpposizione: e.target.checked,
                          }));
                        }}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">
                          Opposizione all'invio al Sistema TS (Richiesta dal Paziente)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Se spuntato, le spese di questo paziente saranno escluse dalla trasmissione telematica al Sistema TS.
                        </span>
                      </div>
                    </label>

                    {formData.tesseraSanitariaOpposizione && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                        ⚠️ Segnalazione attiva: Sulle fatture emesse verrà apposta la dicitura di opposizione alla trasmissione TS.
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Programma Recall & Igiene Periodica */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Recall Periodico & Igiene
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">Fidelizzazione e continuità terapeutica</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                      Ogni {formData.recallIntervalMonths || 6} mesi
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pianificazione del controllo semestrale o dell'igiene orale periodica con consenso informato a ricevere comunicazioni dallo studio.
                  </p>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700">Intervallo Richiamo:</label>
                      <select
                        value={formData.recallIntervalMonths || 6}
                        onChange={e => {
                          const months = Number(e.target.value);
                          const lastDate = formData.lastVisitDate ? new Date(formData.lastVisitDate) : new Date();
                          const nextDate = new Date(lastDate);
                          nextDate.setMonth(nextDate.getMonth() + months);
                          setFormData(prev => ({
                            ...prev,
                            recallIntervalMonths: months,
                            nextRecallDate: nextDate.toISOString().split('T')[0],
                          }));
                        }}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value={3}>3 Mesi (Parodontale intensivo)</option>
                        <option value={6}>6 Mesi (Igiene & Controllo standard)</option>
                        <option value={12}>12 Mesi (Check-up annuale)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.recallConsent !== false}
                        onChange={e => setFormData(prev => ({ ...prev, recallConsent: e.target.checked }))}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Consenso comunicazioni di recall via WhatsApp / SMS per visite periodiche.</span>
                    </label>

                    {formData.phone && (
                      <a
                        href={`https://wa.me/${formData.phone.replace(/\D/g, '')}?text=Gentile%20${encodeURIComponent(
                          formData.firstName
                        )},%20dallo%20Studio%20Odontoiatrico%20le%20ricordiamo%20che%20%C3%A8%20il%20momento%20per%20il%20suo%20controllo%20periodico%20di%20igiene.%20Pu%C3%B2%20prenotare%20dal%20nostro%20minisito.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Invia Notifica di Richiamo WhatsApp al Paziente</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GDPR Consent Proof Modal */}
      {showGdprCertModal && (
        <GdprConsentCertificateModal
          isOpen={showGdprCertModal}
          onClose={() => setShowGdprCertModal(false)}
          patient={formData}
          studioName={activeStudio?.name}
          studioAddress={activeStudio?.address}
          studioPhone={activeStudio?.phone}
        />
      )}

      {/* Upgrade Checkout Modal */}
      {showUpgradeCheckout && (
        <PaymentCheckoutModal
          isOpen={showUpgradeCheckout}
          onClose={() => setShowUpgradeCheckout(false)}
          targetPlanId={targetUpgradePlan}
          onPaymentSuccess={() => {
            setShowUpgradeCheckout(false);
          }}
        />
      )}
    </div>
  );
};
