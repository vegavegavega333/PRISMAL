import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Eye,
  Clock,
  Key,
  Calendar,
  Building2,
  Trash2,
  X,
  Radio,
  ArrowUpRight,
  Inbox,
  Check,
} from 'lucide-react';
import { EmailLogEntry, EmailLogType, EmailDeliveryStatus } from '../../types';

interface EmailLogApiResponse {
  success: boolean;
  logs: EmailLogEntry[];
  smtpConfigured: boolean;
  smtpSender: string;
  summary?: {
    total: number;
    delivered: number;
    failed: number;
    authOtp: number;
    contactLeads: number;
    bookingConfirmations: number;
    studioApproval: number;
  };
}

export const CommunicationLogView: React.FC = () => {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(true);
  const [smtpSender, setSmtpSender] = useState<string>('prismaldental@gmail.com');
  const [selectedLog, setSelectedLog] = useState<EmailLogEntry | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | EmailLogType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EmailDeliveryStatus>('all');

  // Test email modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('prismaldental@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch logs from server
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/email-logs');
      if (res.ok) {
        const data: EmailLogApiResponse = await res.json();
        setLogs(data.logs || []);
        setSmtpConfigured(data.smtpConfigured);
        if (data.smtpSender) setSmtpSender(data.smtpSender);
      }
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch =
        log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.recipientName && log.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.snippet && log.snippet.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.meta?.studioName && log.meta.studioName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (typeFilter !== 'all' && log.type !== typeFilter) return false;
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;

      return true;
    });
  }, [logs, searchQuery, typeFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const delivered = logs.filter(l => l.status === 'delivered').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const authOtp = logs.filter(l => l.type === 'auth_otp').length;
    const confirmations = logs.filter(
      l => l.type === 'booking_confirmation' || l.type === 'contact_lead' || l.type === 'studio_approval'
    ).length;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100;

    return { total, delivered, failed, authOtp, confirmations, deliveryRate };
  }, [logs]);

  // Send real test email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/email-logs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testEmailAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `Email di test recapitata con successo a ${testEmailAddress}!`,
        });
        fetchLogs();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Errore durante l\'invio del test.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Errore di connessione col server.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Clear logs handler
  const handleClearLogs = async () => {
    if (!window.confirm('Sei sicuro di voler svuotare lo storico del registro comunicazioni?')) {
      return;
    }
    try {
      await fetch('/api/admin/email-logs/clear', { method: 'POST' });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Badge helper
  const getTypeBadge = (type: EmailLogType) => {
    switch (type) {
      case 'auth_otp':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Key className="w-3 h-3 text-purple-600" />
            <span>Auth OTP (Studio)</span>
          </span>
        );
      case 'booking_confirmation':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Calendar className="w-3 h-3 text-emerald-600" />
            <span>Conferma Prenotazione</span>
          </span>
        );
      case 'contact_lead':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Mail className="w-3 h-3 text-amber-600" />
            <span>Richiesta Demo / Lead</span>
          </span>
        );
      case 'studio_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Building2 className="w-3 h-3 text-sky-600" />
            <span>Attivazione Studio</span>
          </span>
        );
      case 'system_test':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Send className="w-3 h-3 text-slate-500" />
            <span>Test Diagnostico</span>
          </span>
        );
      case 'reminder_24h':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600" />
            <span>Promemoria 24h</span>
          </span>
        );
      case 'reminder_1h':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>Promemoria 1h</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status: EmailDeliveryStatus, error?: string | null) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Consegnata</span>
          </span>
        );
      case 'failed':
        return (
          <span
            title={error || 'Errore di consegna'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-xs"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Invio Fallito</span>
          </span>
        );
      case 'simulated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Simulata (Locale)</span>
          </span>
        );
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with SMTP Health & Test Dispatch */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-purple-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              <span>Audit & Controllo Notifiche di Sistema</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Communication Log • Monitoraggio Consegna Email
            </h2>
            <p className="text-purple-200 text-sm mt-1 max-w-2xl">
              Registro in tempo reale di tutte le comunicazioni e-mail inviate: codici OTP di autenticazione per gli studi, conferme di prenotazione per i pazienti e notifiche richieste demo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live SMTP Status indicator */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-slate-300 block text-[10px] font-medium uppercase">Canale SMTP Ufficiale</span>
                <span className="font-bold text-white font-mono">{smtpSender}</span>
              </div>
            </div>

            {/* Test Email Button */}
            <button
              id="btn-open-test-email-modal"
              onClick={() => {
                setTestResult(null);
                setIsTestModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Invia Email di Test</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              title="Aggiorna registro"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/15 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Emails */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Email Tracciate
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500">comunicazioni</span>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Tasso di Consegna
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900">{stats.deliveryRate}%</span>
            <span className="text-xs text-emerald-700 font-medium">
              ({stats.delivered} riuscite, {stats.failed} errori)
            </span>
          </div>
        </div>

        {/* Auth OTP emails */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Codici OTP Inviati
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-900">{stats.authOtp}</span>
            <span className="text-xs text-indigo-600">verifiche studi</span>
          </div>
        </div>

        {/* Booking / Lead Confirmations */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Conferme & Notifiche
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900">{stats.confirmations}</span>
            <span className="text-xs text-amber-600">prenotazioni & lead</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tutti ({logs.length})
          </button>
          <button
            onClick={() => setTypeFilter('auth_otp')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'auth_otp'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Auth OTP ({logs.filter(l => l.type === 'auth_otp').length})
          </button>
          <button
            onClick={() => setTypeFilter('booking_confirmation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'booking_confirmation'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Conferme Prenotazione ({logs.filter(l => l.type === 'booking_confirmation').length})
          </button>
          <button
            onClick={() => setTypeFilter('contact_lead')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'contact_lead'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Richieste Demo ({logs.filter(l => l.type === 'contact_lead').length})
          </button>
          <button
            onClick={() => setTypeFilter('system_test')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'system_test'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Test Sistema ({logs.filter(l => l.type === 'system_test').length})
          </button>
        </div>

        {/* Status filter & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Tutti gli stati</option>
            <option value="delivered">Solo Consegnate</option>
            <option value="failed">Solo Errori</option>
            <option value="simulated">Solo Simulate</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cerca email, oggetto o codice..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              title="Svuota registro comunicazioni"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Nessuna comunicazione trovata</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Non ci sono email corrispondenti ai criteri di ricerca attuali. Prova a modificare i filtri o invia un'email di test.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition"
            >
              Ripristina Filtri
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Data & Ora</th>
                  <th className="py-3.5 px-4">Tipo Comunicazione</th>
                  <th className="py-3.5 px-4">Destinatario</th>
                  <th className="py-3.5 px-4">Oggetto / Dettagli</th>
                  <th className="py-3.5 px-4">Stato Consegna</th>
                  <th className="py-3.5 px-4 text-right">Dettagli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map(log => {
                  const { date, time } = formatDateTime(log.timestamp);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-purple-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{date}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{time}</div>
                      </td>

                      {/* Type badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getTypeBadge(log.type)}
                      </td>

                      {/* Recipient */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 font-mono text-xs">
                          {log.recipient}
                        </div>
                        {log.recipientName && log.recipientName !== log.recipient && (
                          <div className="text-[11px] text-slate-500">
                            {log.recipientName}
                          </div>
                        )}
                        {log.meta?.studioName && (
                          <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
                            Studio: {log.meta.studioName}
                          </div>
                        )}
                      </td>

                      {/* Subject and code */}
                      <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                        <div className="font-semibold text-slate-800 truncate" title={log.subject}>
                          {log.subject}
                        </div>
                        {log.meta?.code && (
                          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-mono font-bold">
                            <span>OTP: {log.meta.code}</span>
                          </div>
                        )}
                        {log.snippet && !log.meta?.code && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {log.snippet}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status, log.error)}
                        {log.error && (
                          <div className="text-[10px] text-rose-600 truncate max-w-[140px] mt-1" title={log.error}>
                            {log.error}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 group-hover:bg-purple-600 group-hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Vedi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Dettagli Comunicazione</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Delivery Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Esito Invio</span>
                  <div className="mt-1">{getStatusBadge(selectedLog.status, selectedLog.error)}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Tipologia</span>
                  <div className="mt-1">{getTypeBadge(selectedLog.type)}</div>
                </div>
              </div>

              {/* Message Headers Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-500 w-28">Destinatario:</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {selectedLog.recipient}
                        {selectedLog.recipientName && (
                          <span className="text-slate-500 font-sans font-normal ml-2">
                            ({selectedLog.recipientName})
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-500">Mittente:</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">{selectedLog.sender}</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-500">Oggetto:</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{selectedLog.subject}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-500">Data & Ora:</td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {new Date(selectedLog.timestamp).toLocaleString('it-IT')}
                      </td>
                    </tr>
                    {selectedLog.meta?.code && (
                      <tr className="bg-purple-50/40">
                        <td className="py-2.5 px-4 font-semibold text-purple-700">Codice OTP:</td>
                        <td className="py-2.5 px-4 font-mono font-black text-purple-700 text-sm tracking-wider">
                          {selectedLog.meta.code}
                        </td>
                      </tr>
                    )}
                    {selectedLog.meta?.studioName && (
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-slate-500">Studio:</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {selectedLog.meta.studioName}
                        </td>
                      </tr>
                    )}
                    {selectedLog.error && (
                      <tr className="bg-rose-50">
                        <td className="py-2.5 px-4 font-semibold text-rose-700">Errore:</td>
                        <td className="py-2.5 px-4 font-mono text-rose-700 text-[11px]">
                          {selectedLog.error}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Email Content Preview */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Anteprima Messaggio Trasmesso
                </h4>
                {selectedLog.htmlContent ? (
                  <div
                    className="p-4 rounded-2xl border border-slate-200 bg-white text-xs max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedLog.htmlContent }}
                  />
                ) : (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-700 leading-relaxed">
                    {selectedLog.snippet || selectedLog.subject}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-700">
                <Send className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Invia Email di Test</h3>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="mt-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Invia un messaggio diagnostico reale attraverso il server SMTP Gmail collegato (<strong>{smtpSender}</strong>) per validare la consegna e verificare il recapito in posta in arrivo.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Indirizzo Email Destinatario
                </label>
                <input
                  type="email"
                  required
                  value={testEmailAddress}
                  onChange={e => setTestEmailAddress(e.target.value)}
                  placeholder="es. prismaldental@gmail.com o la tua email"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-5 py-2 text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSendingTest && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSendingTest ? 'Spedizione in corso...' : 'Invia Subito'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
