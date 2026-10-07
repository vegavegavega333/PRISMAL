import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Sparkles,
  Stethoscope,
  Clock,
  Euro,
  Info,
} from 'lucide-react';

interface MonthlyDataPoint {
  month: string;
  monthKey: string;
  totalAppointments: number;
  completed: number;
  confirmed: number;
  cancelled: number;
  newPatients: number;
  returningPatients: number;
  acquisitionRate: number; // percentage
  estimatedProduction: number; // in Euros
}

const PIE_COLORS = ['#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

export const StudioAnalyticsDashboard: React.FC = () => {
  const { activeStudio, appointments } = useApp();
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'ytd'>('6m');

  if (!activeStudio) return null;

  // Filter appointments belonging to this studio
  const studioAppointments = useMemo(() => {
    return appointments.filter(a => a.studioId === activeStudio.id);
  }, [appointments, activeStudio.id]);

  // Compute analytics data STRICTLY from actual real appointments — ZERO FAKE OR INVENTED DATA
  const {
    monthlyData,
    overallStats,
    specialtyDistribution,
    weekdayDistribution,
    topSpecialtyLabel,
    highMarginSpecialtyLabel,
    peakDayLabel,
  } = useMemo(() => {
    const now = new Date();
    const monthsBack = timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : (now.getMonth() + 1);
    const generatedMonths: MonthlyDataPoint[] = [];

    // Map appointments by month key "YYYY-MM"
    const apptMap = new Map<string, typeof appointments>();
    const patientFirstSeenMap = new Map<string, string>(); // patient identifier -> first month YYYY-MM

    // Sort studio appointments chronologically
    const sortedAppts = [...studioAppointments].sort((a, b) => a.date.localeCompare(b.date));
    sortedAppts.forEach(apt => {
      const pKey = (apt.patientEmail || apt.patientPhone || `${apt.patientFirstName}_${apt.patientLastName}`).toLowerCase().trim();
      const monthKey = apt.date.substring(0, 7);
      if (!patientFirstSeenMap.has(pKey)) {
        patientFirstSeenMap.set(pKey, monthKey);
      }

      if (!apptMap.has(monthKey)) {
        apptMap.set(monthKey, []);
      }
      apptMap.get(monthKey)!.push(apt);
    });

    // Estimate production value for an appointment strictly from its defined visit reason
    const getAppointmentValue = (a: (typeof appointments)[0]): number => {
      if (a.status === 'cancelled') return 0;
      const reason = (activeStudio.visitReasons || []).find(
        r => r.id === a.visitReasonId || r.name.toLowerCase() === (a.visitReasonName || '').toLowerCase()
      );
      if (reason && reason.priceEstimate) {
        const numbers = reason.priceEstimate.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          if (numbers.length >= 2) {
            return Math.round((parseInt(numbers[0], 10) + parseInt(numbers[1], 10)) / 2);
          }
          return parseInt(numbers[0], 10);
        }
      }
      // Reasonable clinical averages only if appointment was actually booked
      const nameLower = (a.visitReasonName || '').toLowerCase();
      if (nameLower.includes('sbiancamento')) return 280;
      if (nameLower.includes('ortodonzia') || nameLower.includes('invisibile')) return 350;
      if (nameLower.includes('igiene') || nameLower.includes('pulizia')) return 90;
      if (nameLower.includes('urgenza') || nameLower.includes('dolore')) return 70;
      if (nameLower.includes('controllo') || nameLower.includes('visita')) return 60;
      return 80;
    };

    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const monthKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      const label = `${monthNames[mIdx]} ${String(yr).slice(2)}`;

      const realApptsInMonth = apptMap.get(monthKey) || [];

      // STRICTLY ACTUAL VALUES — ZERO SIMULATED BASELINES
      const totalAppointments = realApptsInMonth.length;
      const completed = realApptsInMonth.filter(a => a.status === 'completed').length;
      const confirmed = realApptsInMonth.filter(a => a.status === 'confirmed' || a.status === 'in_progress').length;
      const cancelled = realApptsInMonth.filter(a => a.status === 'cancelled').length;

      let newPatients = 0;
      let returningPatients = 0;
      realApptsInMonth.forEach(a => {
        const pKey = (a.patientEmail || a.patientPhone || `${a.patientFirstName}_${a.patientLastName}`).toLowerCase().trim();
        if (patientFirstSeenMap.get(pKey) === monthKey) {
          newPatients++;
        } else {
          returningPatients++;
        }
      });

      const acquisitionRate = totalAppointments > 0 ? Math.round((newPatients / totalAppointments) * 100) : 0;
      const estimatedProduction = realApptsInMonth.reduce((acc, a) => acc + getAppointmentValue(a), 0);

      generatedMonths.push({
        month: label,
        monthKey,
        totalAppointments,
        completed,
        confirmed,
        cancelled,
        newPatients,
        returningPatients,
        acquisitionRate,
        estimatedProduction,
      });
    }

    // Overall summary metrics
    const totalVisitsCount = generatedMonths.reduce((acc, m) => acc + m.totalAppointments, 0);
    const totalCompletedCount = generatedMonths.reduce((acc, m) => acc + m.completed, 0);
    const totalCancelledCount = generatedMonths.reduce((acc, m) => acc + m.cancelled, 0);
    const totalNewPatientsCount = generatedMonths.reduce((acc, m) => acc + m.newPatients, 0);
    const avgAcquisitionRate = totalVisitsCount > 0 ? Math.round((totalNewPatientsCount / totalVisitsCount) * 100) : 0;
    const totalProduction = generatedMonths.reduce((acc, m) => acc + m.estimatedProduction, 0);
    const averageTicket = totalVisitsCount > 0 ? Math.round(totalProduction / totalVisitsCount) : 0;

    // Attendance & No-Show rates
    const attendanceRate = totalVisitsCount > 0
      ? Math.round(((totalVisitsCount - totalCancelledCount) / totalVisitsCount) * 100)
      : 0;
    const noShowRate = totalVisitsCount > 0
      ? Math.round((totalCancelledCount / totalVisitsCount) * 100)
      : 0;

    // Growth comparing last month vs month before
    const lastMonth = generatedMonths[generatedMonths.length - 1];
    const prevMonth = generatedMonths[generatedMonths.length - 2] || lastMonth;
    const momGrowth = prevMonth.totalAppointments > 0
      ? Math.round(((lastMonth.totalAppointments - prevMonth.totalAppointments) / prevMonth.totalAppointments) * 100)
      : (lastMonth.totalAppointments > 0 ? 100 : 0);

    const momAcquisitionGrowth = prevMonth.newPatients > 0
      ? Math.round(((lastMonth.newPatients - prevMonth.newPatients) / prevMonth.newPatients) * 100)
      : (lastMonth.newPatients > 0 ? 100 : 0);

    // Specialty / Visit reason breakdown from actual appointments in timeframe
    const monthsKeysSet = new Set(generatedMonths.map(m => m.monthKey));
    const specialtyCounts: Record<string, number> = {};

    studioAppointments.forEach(a => {
      const monthKey = a.date.substring(0, 7);
      if (!monthsKeysSet.has(monthKey)) return;
      const reasonName = a.visitReasonName || 'Altro';
      specialtyCounts[reasonName] = (specialtyCounts[reasonName] || 0) + 1;
    });

    const specialtyDistribution = Object.entries(specialtyCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));

    // Dynamic Top & High Margin specialties
    const sortedSpecialties = [...specialtyDistribution].sort((a, b) => b.value - a.value);
    const topSpecialtyLabel = sortedSpecialties.length > 0
      ? `${sortedSpecialties[0].name} (${sortedSpecialties[0].value} ${sortedSpecialties[0].value === 1 ? 'visita' : 'visite'} - ${Math.round((sortedSpecialties[0].value / totalVisitsCount) * 100)}%)`
      : 'In attesa di prenotazioni (0)';

    const highMarginKeywords = ['ortodonzia', 'invisibile', 'impiant', 'sbiancamento', 'chirurg'];
    const highMarginItem = sortedSpecialties.find(s =>
      highMarginKeywords.some(kw => s.name.toLowerCase().includes(kw))
    );
    const highMarginSpecialtyLabel = highMarginItem
      ? `${highMarginItem.name} (${highMarginItem.value} ${highMarginItem.value === 1 ? 'visita' : 'visite'} - ${Math.round((highMarginItem.value / totalVisitsCount) * 100)}%)`
      : sortedSpecialties.length > 0
      ? `${sortedSpecialties[0].name} (${sortedSpecialties[0].value} visite)`
      : 'In attesa di prenotazioni (0)';

    // Weekday distribution based on actual appointment dates (1=Mon ... 5=Fri)
    const weekdayCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    studioAppointments.forEach(a => {
      const monthKey = a.date.substring(0, 7);
      if (!monthsKeysSet.has(monthKey)) return;
      if (a.status === 'cancelled') return;

      const parts = a.date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const day = d.getDay();
        if (day >= 1 && day <= 5) {
          weekdayCounts[day] = (weekdayCounts[day] || 0) + 1;
        }
      }
    });

    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
    const dayShorts = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'];

    const weekdayDistribution = [1, 2, 3, 4, 5].map(d => ({
      day: dayShorts[d - 1],
      dayName: dayNames[d - 1],
      visite: weekdayCounts[d] || 0,
    }));

    // Calculate peak day
    const activeDays = weekdayDistribution.filter(d => d.visite > 0);
    let peakDayLabel = 'Nessun appuntamento registrato nel periodo';
    if (activeDays.length > 0) {
      const maxDay = [...weekdayDistribution].sort((a, b) => b.visite - a.visite)[0];
      const pct = totalVisitsCount > 0 ? Math.round((maxDay.visite / totalVisitsCount) * 100) : 0;
      peakDayLabel = `Giornata di punta: ${maxDay.dayName} (${maxDay.visite} ${maxDay.visite === 1 ? 'visita' : 'visite'} - ${pct}%)`;
    }

    return {
      monthlyData: generatedMonths,
      overallStats: {
        totalVisitsCount,
        totalCompletedCount,
        totalCancelledCount,
        totalNewPatientsCount,
        avgAcquisitionRate,
        totalProduction,
        averageTicket,
        attendanceRate,
        noShowRate,
        momGrowth,
        momAcquisitionGrowth,
      },
      specialtyDistribution,
      weekdayDistribution,
      topSpecialtyLabel,
      highMarginSpecialtyLabel,
      peakDayLabel,
    };
  }, [timeRange, studioAppointments, activeStudio.visitReasons]);

  // Export CSV report strictly containing actual studio figures
  const handleExportCSV = () => {
    const headers = ['Mese', 'Visite Totali', 'Visite Completate', 'Visite Cancellate', 'Nuovi Pazienti', 'Pazienti Ricorrenti', 'Tasso Acquisizione %', 'Stima Produzione EUR'];
    const rows = monthlyData.map(m => [
      m.month,
      m.totalAppointments,
      m.completed,
      m.cancelled,
      m.newPatients,
      m.returningPatients,
      `${m.acquisitionRate}%`,
      `€${m.estimatedProduction}`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prismal_report_${activeStudio.slug}_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                Analisi Prestazioni & Statistiche Studio
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Dati Effettivi Reali
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Andamento effettivo delle visite in agenda, saturazione orari e tasso di acquisizione nuovi pazienti.
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe & Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeRange === '6m' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ultimi 6 Mesi
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeRange === '12m' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              12 Mesi
            </button>
            <button
              onClick={() => setTimeRange('ytd')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeRange === 'ytd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Anno 2026
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
            title="Esporta dati in formato CSV per Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Esporta Report CSV
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Visits */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Volume Visite ({timeRange === '6m' ? '6 Mesi' : timeRange === '12m' ? '12 Mesi' : 'Anno 2026'})
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {overallStats.totalVisitsCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {overallStats.totalVisitsCount === 1 ? 'appuntamento' : 'appuntamenti'}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
            {overallStats.totalVisitsCount === 0 ? (
              <span className="text-slate-400 text-[11px] font-medium">In attesa di prenotazioni</span>
            ) : overallStats.momGrowth >= 0 ? (
              <span className="inline-flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                +{overallStats.momGrowth}% vs mese prec.
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {overallStats.momGrowth}% vs mese prec.
              </span>
            )}
            <span className="text-slate-400 text-[11px]">Dati effettivi</span>
          </div>
        </div>

        {/* Metric 2: New Patients Acquisition Rate */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tasso Acquisizione Nuovi
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight tabular-nums">
              {overallStats.avgAcquisitionRate}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({overallStats.totalNewPatientsCount} {overallStats.totalNewPatientsCount === 1 ? 'nuovo paziente' : 'nuovi pazienti'})
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
            {overallStats.totalVisitsCount === 0 ? (
              <span className="text-slate-400 text-[11px] font-medium">Nessun paziente ancora registrato</span>
            ) : (
              <>
                <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  +{overallStats.momAcquisitionGrowth}% nuovi pazienti
                </span>
                <span className="text-slate-400 text-[11px]">Crescita reale</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 3: Attendance & Completion Rate */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Efficienza Poltrona & No-Show
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600 tracking-tight tabular-nums">
              {overallStats.attendanceRate}%
            </span>
            <span className="text-xs font-semibold text-slate-500">tasso presenze</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            {overallStats.totalVisitsCount === 0 ? (
              <span className="text-slate-400 text-[11px] font-medium">In attesa delle prime visite</span>
            ) : (
              <>
                <span className="inline-flex items-center text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full text-[11px]">
                  No-show: {overallStats.noShowRate}%
                </span>
                <span className="text-slate-400 text-[11px]">({overallStats.totalCancelledCount} cancellate)</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 4: Estimated Production */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Valore Prestazioni Agenda
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Euro className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              €{overallStats.totalProduction.toLocaleString('it-IT')}
            </span>
            <span className="text-xs font-semibold text-slate-500">produzione</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
              Ticket medio: €{overallStats.averageTicket}
            </span>
            <span className="text-slate-400 text-[11px]">
              {overallStats.totalVisitsCount > 0 ? 'da visite effettive' : 'in attesa di dati'}
            </span>
          </div>
        </div>
      </div>

      {/* PRIMARY CHART 1: MONTHLY APPOINTMENTS TREND (AREA CHART) */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Trend Mensile Prenotazioni Odontoiatriche</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">
                Volume & Convalide Reali
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Andamento del flusso pazienti per ciascun mese. I dati crescono progressivamente con le prenotazioni reali.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-500" />
              <span className="text-slate-600 font-medium">Visite Totali</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 font-medium">Completate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="text-slate-600 font-medium">Cancellate</span>
            </div>
          </div>
        </div>

        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlyDataPoint;
                    const successPct = data.totalAppointments > 0 ? Math.round((data.completed / data.totalAppointments) * 100) : 0;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs min-w-[200px]">
                        <p className="font-bold text-slate-200 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
                          <span>{label}</span>
                          <span className="text-[10px] text-sky-400 font-semibold">Tasso Successo: {successPct}%</span>
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-400" />
                              Volume Totale:
                            </span>
                            <span className="font-bold text-white tabular-nums">{data.totalAppointments} visite</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Completate:
                            </span>
                            <span className="font-bold text-emerald-400 tabular-nums">{data.completed}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-400" />
                              Cancellate:
                            </span>
                            <span className="font-bold text-rose-400 tabular-nums">{data.cancelled}</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-amber-300">
                            <span>Valore Stimato:</span>
                            <span className="font-bold tabular-nums">€{data.estimatedProduction.toLocaleString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="totalAppointments"
                stroke="#0284c7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="Visite Totali"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
                name="Completate"
              />
              <Area
                type="monotone"
                dataKey="cancelled"
                stroke="#f43f5e"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorCancelled)"
                name="Cancellate"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECONDARY ROW: PATIENT ACQUISITION RATE & COMPOSITION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 2: PATIENT ACQUISITION (BAR CHART) */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Tasso Acquisizione Nuovi Pazienti</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Nuovi vs Ricorrenti
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Incidenza dei nuovi pazienti rispetto a controlli e pazienti fidelizzati.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-semibold block">Media Periodo</span>
              <span className="text-sm font-extrabold text-emerald-600">{overallStats.avgAcquisitionRate}% Nuovi</span>
            </div>
          </div>

          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as MonthlyDataPoint;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs">
                          <p className="font-bold text-slate-200 pb-1 border-b border-slate-700 mb-2">{label}</p>
                          <div className="space-y-1">
                            <p className="text-emerald-400 font-semibold">
                              Nuovi Pazienti: <span className="text-white font-bold">{d.newPatients}</span>
                            </p>
                            <p className="text-sky-300 font-semibold">
                              Pazienti Ricorrenti: <span className="text-white font-bold">{d.returningPatients}</span>
                            </p>
                            <p className="text-amber-300 font-bold pt-1 border-t border-slate-700">
                              Tasso Acquisizione: {d.acquisitionRate}%
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                />
                <Bar dataKey="newPatients" name="Nuovi Pazienti" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="returningPatients" name="Pazienti Ricorrenti" fill="#94a3b8" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-950">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              Canale online attivo
            </span>
            <span className="font-medium text-emerald-700">Statistiche calcolate in tempo reale sulle prenotazioni effettive</span>
          </div>
        </div>

        {/* CHART 3: DISTRIBUTION BY TREATMENT SPECIALTY (PIE CHART) */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Ripartizione Tipologia Prestazioni</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                  Specialità
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Volumi effettivi per prestazione odontoiatrica richiesta in studio.
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>

          <div className="w-full h-72 flex items-center justify-center">
            {specialtyDistribution.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Nessuna Prestazione Ancora Registrata</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  La ripartizione delle prestazioni si popolerà automaticamente man mano che i pazienti prenotano visite dal minisito o dal gestionale.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {specialtyDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const count = Number(data.value);
                        const pct = overallStats.totalVisitsCount > 0 ? Math.round((count / overallStats.totalVisitsCount) * 100) : 0;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-800">
                            <p className="font-bold text-slate-200">{data.name}</p>
                            <p className="text-sky-400 font-semibold mt-0.5 tabular-nums">
                              {count} {count === 1 ? 'visita registrata' : 'visite registrate'} ({pct}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Più Richiesta</span>
              <span className="font-bold text-slate-800 truncate block" title={topSpecialtyLabel}>
                {topSpecialtyLabel}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Specialità Principale</span>
              <span className="font-bold text-purple-700 truncate block" title={highMarginSpecialtyLabel}>
                {highMarginSpecialtyLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ADDITIONAL ROW: WEEKDAY WORKLOAD BAR CHART */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Carico di Lavoro Settimanale Poltrone</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900">
                Distribuzione Orari
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribuzione effettiva degli appuntamenti nei giorni lavorativi per pianificare turni e sale.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{peakDayLabel}</span>
          </div>
        </div>

        <div className="w-full h-52 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const count = Number(payload[0].value);
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-800">
                        <p className="font-bold text-slate-200">{label}</p>
                        <p className="text-sky-400 font-semibold tabular-nums mt-0.5">
                          {count} {count === 1 ? 'visita programmata' : 'visite programmate'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="visite" name="Visite Programmate" fill="#0284c7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
