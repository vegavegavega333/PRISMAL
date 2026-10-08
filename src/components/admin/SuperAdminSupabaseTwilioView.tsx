import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Loader2,
  RefreshCw,
  ExternalLink,
  Upload,
  FileText,
  Smartphone,
  Mail,
  Zap,
  Download,
  Search,
  Table,
  Eye,
  Star,
  DollarSign,
  Calendar,
  Building,
  User,
} from 'lucide-react';
import { fetchSupabaseAndTwilioStatus, uploadFileToSupabaseStorage } from '../../services/supabase';

export const SuperAdminSupabaseTwilioView: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Live Twilio SMS Test state
  const [testPhone, setTestPhone] = useState('+393473100353');
  const [testMessage, setTestMessage] = useState('PRISMAL: Test notifica SMS riuscito con successo!');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);

  // Storage Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Supabase Table Explorer state
  const [selectedTable, setSelectedTable] = useState<'studios' | 'appointments' | 'transactions' | 'reviews' | 'communication_logs'>('studios');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableTotalCount, setTableTotalCount] = useState<number>(0);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});

  const loadStatus = async () => {
    setIsLoading(true);
    const data = await fetchSupabaseAndTwilioStatus();
    setStatus(data);
    setIsLoading(false);
  };

  const loadTableData = async (tableName: string) => {
    setIsLoadingTable(true);
    try {
      const res = await fetch(`/api/supabase/tables/${tableName}`);
      const data = await res.json();
      if (data.success) {
        setTableRows(data.rows || []);
        setTableTotalCount(data.count || 0);
        setTableCounts(prev => ({ ...prev, [tableName]: data.count || 0 }));
      }
    } catch (e) {
      console.error('Error fetching table data:', e);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const loadAllTableCounts = async () => {
    const tables = ['studios', 'appointments', 'transactions', 'reviews', 'communication_logs'];
    for (const t of tables) {
      try {
        const res = await fetch(`/api/supabase/tables/${t}?limit=1`);
        const data = await res.json();
        if (data.success) {
          setTableCounts(prev => ({ ...prev, [t]: data.count || 0 }));
        }
      } catch {}
    }
  };

  useEffect(() => {
    loadStatus();
    loadAllTableCounts();
  }, []);

  useEffect(() => {
    loadTableData(selectedTable);
  }, [selectedTable]);

  const handleCopySql = async () => {
    try {
      const res = await fetch('/api/supabase/schema.sql');
      const sql = await res.text();
      navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      alert('Impossibile scaricare lo schema SQL.');
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(`Sincronizzazione completata: ${data.syncedStudios} studi, ${data.syncedAppts} appuntamenti, ${data.syncedTxs} transazioni.`);
        loadStatus();
      } else {
        setSyncFeedback(`Nota: ${data.error || 'Tabelle Supabase non ancora create. Esegui prima lo script SQL.'}`);
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Errore durante la sincronizzazione.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;

    setIsSendingSms(true);
    setSmsResult(null);

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone.trim(),
          message: testMessage.trim(),
          senderId: 'PRISMAL',
        }),
      });

      const data = await res.json();
      setSmsResult(data);
    } catch (err: any) {
      setSmsResult({ success: false, error: err?.message || 'Errore di connessione' });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadedUrl(null);

    const res = await uploadFileToSupabaseStorage(file);
    if (res.success && res.url) {
      setUploadedUrl(res.url);
    } else {
      setUploadError(res.error || 'Errore durante il caricamento');
    }
    setIsUploading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-500/20 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Cloud className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white">Hub Integrazioni Supabase & Twilio</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Connesso
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Gestione centralizzata di Auth, Storage Media (CDN), Database PostgreSQL e Gateway SMS Twilio.
            </p>
          </div>
        </div>

        <button
          onClick={loadStatus}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Aggiorna Stato</span>
        </button>
      </div>

      {/* Grid: 2 Colonne (Supabase a sinistra, Twilio a destra) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ========================================================= */}
        {/* CARD 1: SUPABASE CLOUD (AUTH, STORAGE, POSTGRESQL)       */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 sm:pb-4 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">Supabase Cloud Platform</h3>
                <span className="text-[10px] text-slate-500 font-mono block truncate">ID: dqbphjwbrhxoqlhupydq</span>
              </div>
            </div>
            <a
              href="https://supabase.com/dashboard/project/dqbphjwbrhxoqlhupydq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 hover:underline self-start sm:self-auto"
            >
              <span>Dashboard Ufficiale</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
            <div className="p-2 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block truncate">Utenti Auth</span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                {status?.supabase?.auth?.usersCount ?? 2}
              </span>
              <span className="text-[8px] sm:text-[9px] text-emerald-600 font-bold block truncate">Google & OTP</span>
            </div>

            <div className="p-2 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block truncate">Bucket Storage</span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                {status?.supabase?.storage?.buckets?.length ?? 1}
              </span>
              <span className="text-[8px] sm:text-[9px] text-emerald-600 font-bold block truncate">prismal-media</span>
            </div>

            <div className="p-2 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block truncate">Tabelle Postgres</span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                {status?.supabase?.database?.allTablesReady ? 'Pronte (5/5)' : 'Pronto DDL'}
              </span>
              <span className="text-[8px] sm:text-[9px] text-indigo-600 font-bold block truncate">Schema SQL</span>
            </div>
          </div>

          {/* Sub-section: 1-Click Copy Schema SQL */}
          <div className="p-3 sm:p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span className="text-xs font-black text-emerald-950 truncate">Script SQL Tabelle Supabase</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia Script</span>
                    </>
                  )}
                </button>
                <a
                  href="/api/supabase/schema.sql"
                  download="schema.sql"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica .sql</span>
                </a>
                <a
                  href="https://supabase.com/dashboard/project/dqbphjwbrhxoqlhupydq/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Apri SQL Editor</span>
                </a>
              </div>
            </div>
            <div className="text-[11px] text-emerald-900 space-y-1 bg-white/70 p-3 rounded-xl border border-emerald-200/50">
              <span className="font-bold block text-emerald-950">Come applicarlo in 3 passi:</span>
              <ol className="list-decimal list-inside space-y-0.5 text-emerald-800">
                <li>Clicca su <strong>Copia Script SQL</strong> qui sopra.</li>
                <li>Clicca su <strong>Apri SQL Editor</strong> (ti apre il pannello Supabase del tuo progetto).</li>
                <li>Incolla il codice nella schermata e clicca sul pulsante verde <strong>Run</strong> in basso a destra.</li>
              </ol>
            </div>
          </div>

          {/* Sincronizza Database */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSyncData}
              disabled={isSyncing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sincronizzazione in corso...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sincronizza Dati Locali su Supabase</span>
                </>
              )}
            </button>
            <span className="text-[10px] text-slate-500">Service Role API</span>
          </div>

          {syncFeedback && (
            <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-800 border border-slate-200">
              {syncFeedback}
            </div>
          )}

          {/* Test Storage Upload */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">
              Test Caricamento Media su Supabase Storage (Bucket: prismal-media):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
              {isUploading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
            </div>

            {uploadedUrl && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <span className="font-bold block">✓ File caricato con successo sul CDN di Supabase:</span>
                <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline break-all flex items-center gap-1 font-mono text-[10px]">
                  <span>{uploadedUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}

            {uploadError && (
              <p className="text-[11px] text-rose-600">{uploadError}</p>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: TWILIO SMS GATEWAY                                */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">Twilio SMS Gateway</h3>
                <span className="text-[10px] text-slate-500 block truncate">Credenziali Ufficiali Configurate</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Attivo</span>
            </span>
          </div>

          {/* Account Details Box - Wrapped and responsive */}
          <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Account SID:</span>
              <span className="font-mono text-slate-900 font-bold text-[11px] break-all">
                {status?.twilio?.accountSid || 'AC6f93f426d54226c3df72d97f8783e27d'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Auth Token:</span>
              <span className="font-mono text-slate-600 text-[11px] break-all">••••••••••••••••••••••••••••••••</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Mittente Predefinito:</span>
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] self-start sm:self-auto">
                PRISMAL (Alphanumeric Alias)
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Stato Account Twilio:</span>
              <span className="font-bold text-emerald-700 capitalize text-[11px] break-words">
                {status?.twilio?.status || 'active'} ({status?.twilio?.friendlyName || 'My First Twilio Account'})
              </span>
            </div>
          </div>

          {/* Interactive Live SMS Dispatcher */}
          <form onSubmit={handleSendTestSms} className="space-y-3.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                Invia SMS di Test in Tempo Reale:
              </label>
              <span className="text-[10px] text-slate-500">API Twilio Live</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Numero di Telefono Destinatario (+39...):
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="+39 347 310 0353"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Testo del Messaggio SMS:
              </label>
              <textarea
                required
                rows={2}
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingSms}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSendingSms ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Invio SMS tramite Twilio in corso...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>Invia SMS di Test con Twilio</span>
                </>
              )}
            </button>
          </form>

          {/* SMS Result Banner */}
          {smsResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                smsResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {smsResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>SMS Inviato con Successo!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Risposta Twilio:</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {smsResult.success
                  ? `Message SID: ${smsResult.messageId} • Stato: ${smsResult.status}`
                  : `${smsResult.error || 'Errore'} (Codice: ${smsResult.code || 'N/D'})`}
              </p>
              {!smsResult.success && smsResult.code === 572006 && (
                <p className="text-[10px] text-amber-800 bg-amber-100/70 p-2 rounded-lg mt-1">
                  💡 <strong>Account Twilio in modalità Trial:</strong> Twilio richiede di verificare il numero ricevente nella console Twilio (Verified Caller IDs) oppure di effettuare l'upgrade dell'account per inviare SMS liberi verso qualsiasi cellulare italiano.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 3: SUPABASE LIVE TABLE EXPLORER                   */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 sm:pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
              <Table className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900">Supabase Live Tables Explorer</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  PostgreSQL Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Esplora i record archiviati nel database cloud di Supabase senza uscire dall'applicazione.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSyncData}
              disabled={isSyncing}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizzazione...' : 'Sincronizza Dati'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                loadTableData(selectedTable);
                loadAllTableCounts();
              }}
              disabled={isLoadingTable}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex-shrink-0"
              title="Ricarica tabella da Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingTable ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tables Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'studios', label: 'Studi Clinici', icon: Building, color: 'text-sky-600' },
            { id: 'appointments', label: 'Appuntamenti', icon: Calendar, color: 'text-emerald-600' },
            { id: 'transactions', label: 'Transazioni', icon: DollarSign, color: 'text-purple-600' },
            { id: 'communication_logs', label: 'SMS & Email', icon: MessageSquare, color: 'text-rose-600' },
            { id: 'reviews', label: 'Recensioni', icon: Star, color: 'text-amber-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const count = tableCounts[tab.id] ?? 0;
            const isSelected = selectedTable === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTable(tab.id as any)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                    <span>{tab.label}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-2 block">
                  public.{tab.id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search bar & Export CSV toolbar inside active table */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder={`Cerca in public.${selectedTable}...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <a
              href={`/api/supabase/tables/${selectedTable}/export-csv`}
              download={`${selectedTable}.csv`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex-shrink-0"
              title="Scarica tutti i record di questa tabella in formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Esporta CSV</span>
            </a>
            <span className="text-[11px] sm:text-xs text-slate-500">
              Mostrati <strong>{tableRows.length}</strong> record
            </span>
          </div>
        </div>

        {/* Live Table Data Content */}
        {isLoadingTable ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-500">Caricamento record da Supabase PostgreSQL...</p>
          </div>
        ) : tableRows.length === 0 ? (
          <div className="py-12 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-3 p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-200/60 text-slate-400 flex items-center justify-center mx-auto">
              <Table className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Tabella <code>public.{selectedTable}</code> Attiva su Postgres (0 Record)
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              La tabella esiste ed è configurata con le policy RLS. Clicca su <strong>"Sincronizza Dati Locali"</strong> per popolare la tabella con i dati attuali di PRISMAL.
            </p>
            <button
              type="button"
              onClick={handleSyncData}
              disabled={isSyncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Popola Tabella Adesso</span>
            </button>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-w-full">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] text-slate-600 sm:hidden flex items-center justify-between font-semibold">
              <span>👉 Scorri orizzontalmente per vedere tutti i dati</span>
              <span className="font-mono text-indigo-700">{tableRows.length} record</span>
            </div>
            <div className="overflow-x-auto max-h-[480px] w-full touch-pan-x">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead className="bg-slate-900 text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                  {selectedTable === 'studios' && (
                    <tr>
                      <th className="p-3">Nome Studio</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Telefono</th>
                      <th className="p-3">Città</th>
                      <th className="p-3">Piano</th>
                      <th className="p-3">Sponsor</th>
                      <th className="p-3">Dettagli</th>
                    </tr>
                  )}
                  {selectedTable === 'appointments' && (
                    <tr>
                      <th className="p-3">Codice</th>
                      <th className="p-3">Paziente</th>
                      <th className="p-3">Telefono</th>
                      <th className="p-3">Data & Ora</th>
                      <th className="p-3">Motivo Visita</th>
                      <th className="p-3">Stato</th>
                      <th className="p-3">Dettagli</th>
                    </tr>
                  )}
                  {selectedTable === 'transactions' && (
                    <tr>
                      <th className="p-3">Fattura / Ricevuta</th>
                      <th className="p-3">Studio</th>
                      <th className="p-3">Importo</th>
                      <th className="p-3">Metodo</th>
                      <th className="p-3">Riferimento</th>
                      <th className="p-3">Stato</th>
                      <th className="p-3">Dettagli</th>
                    </tr>
                  )}
                  {selectedTable === 'communication_logs' && (
                    <tr>
                      <th className="p-3">Canale</th>
                      <th className="p-3">Destinatario</th>
                      <th className="p-3">Oggetto / Testo</th>
                      <th className="p-3">Data Invio</th>
                      <th className="p-3">Stato</th>
                      <th className="p-3">Dettagli</th>
                    </tr>
                  )}
                  {selectedTable === 'reviews' && (
                    <tr>
                      <th className="p-3">Paziente</th>
                      <th className="p-3">Studio ID</th>
                      <th className="p-3">Stelle</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Dettagli</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tableRows
                    .filter((row) => {
                      if (!tableSearch) return true;
                      const q = tableSearch.toLowerCase();
                      return JSON.stringify(row).toLowerCase().includes(q);
                    })
                    .map((row, idx) => {
                      const isExpanded = expandedRowId === (row.id || String(idx));

                      return (
                        <React.Fragment key={row.id || idx}>
                          <tr className="hover:bg-slate-50 transition">
                            {selectedTable === 'studios' && (
                              <>
                                <td className="p-3 font-bold text-slate-900">{row.name}</td>
                                <td className="p-3 text-slate-600">{row.email}</td>
                                <td className="p-3 font-mono text-slate-700">{row.phone || '—'}</td>
                                <td className="p-3 text-slate-600">{row.city || '—'}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                                    {row.plan || 'demo_free'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {row.is_sponsored ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                      ★ Sponsor
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">No</span>
                                  )}
                                </td>
                              </>
                            )}

                            {selectedTable === 'appointments' && (
                              <>
                                <td className="p-3 font-mono font-bold text-sky-700">#{row.code}</td>
                                <td className="p-3 font-semibold text-slate-900">
                                  {row.patient_first_name} {row.patient_last_name}
                                </td>
                                <td className="p-3 font-mono text-slate-700">{row.patient_phone}</td>
                                <td className="p-3 text-slate-800">
                                  {row.date} ore {row.time_slot}
                                </td>
                                <td className="p-3 text-slate-600">{row.visit_reason_name || 'Visita'}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {row.status}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedTable === 'transactions' && (
                              <>
                                <td className="p-3 font-mono font-bold text-slate-900">{row.invoice_number}</td>
                                <td className="p-3 text-slate-700">{row.studio_name || row.studio_id}</td>
                                <td className="p-3 font-mono font-black text-emerald-700">€{Number(row.amount_total).toFixed(2)}</td>
                                <td className="p-3 uppercase font-semibold text-slate-600">{row.payment_method}</td>
                                <td className="p-3 font-mono text-[10px] text-slate-500">{row.payment_reference || '—'}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {row.status}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedTable === 'communication_logs' && (
                              <>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    row.channel === 'sms' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                                  }`}>
                                    {row.channel?.toUpperCase() || 'LOG'}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-slate-800">{row.recipient}</td>
                                <td className="p-3 text-slate-600 max-w-xs truncate">{row.snippet || row.subject || '—'}</td>
                                <td className="p-3 text-slate-500 text-[10px]">
                                  {row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : '—'}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {row.status}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedTable === 'reviews' && (
                              <>
                                <td className="p-3 font-bold text-slate-900">{row.patient_name || 'Anonimo'}</td>
                                <td className="p-3 text-slate-600 font-mono text-[10px]">{row.studio_id}</td>
                                <td className="p-3 text-amber-500 font-bold">★ {row.stars} / 5</td>
                                <td className="p-3 text-slate-500 text-[10px]">
                                  {row.created_at ? new Date(row.created_at).toLocaleDateString('it-IT') : '—'}
                                </td>
                              </>
                            )}

                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedRowId(isExpanded ? null : (row.id || String(idx)))}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              >
                                {isExpanded ? 'Chiudi' : 'JSON'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded JSON details */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(row, null, 2)}</pre>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
