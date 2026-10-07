/**
 * GDPR & Privacy Policy Constants and Tracking Utilities
 * PRISMAL Dental Cloud - Conforme al Regolamento Generale sulla Protezione dei Dati (Reg. UE 2016/679)
 * e D.Lgs. 196/2003 coordinato con D.Lgs. 101/2018
 */

export const CURRENT_PRIVACY_POLICY_VERSION = 'v2.4-2026.09';
export const PRIVACY_POLICY_LAST_UPDATED = '2026-09-01';

export interface GdprPurposeDefinition {
  id: string;
  code: string;
  name: string;
  legalBasis: string;
  mandatory: boolean;
  description: string;
}

export const GDPR_PURPOSES: GdprPurposeDefinition[] = [
  {
    id: 'sanitary_treatment',
    code: 'ART-9-CURA',
    name: 'Finalità di Diagnosi, Prevenzione e Cura Odontoiatrica',
    legalBasis: 'Art. 9 par. 2 lett. h GDPR & Art. 2-septies D.Lgs. 196/2003',
    mandatory: true,
    description:
      'Trattamento dei dati particolari relativi alla salute (anamnesi, patologie, allergie, farmaci assunti, radiografie digitali, piano di cura) necessario all\'erogazione delle prestazioni odontoiatriche richieste.',
  },
  {
    id: 'appointment_reminders',
    code: 'ART-6-SERVIZIO',
    name: 'Gestione Prenotazione & Promemoria di Visita (SMS / Email)',
    legalBasis: 'Art. 6 par. 1 lett. b GDPR (Esecuzione di misure precontrattuali/contrattuali)',
    mandatory: true,
    description:
      'Invio di notifiche di conferma appuntamento, codice OTP di sicurezza per l\'accesso al fascicolo e promemoria di visita a 24 ore e 1 ora prima dell\'appuntamento per evitare no-show.',
  },
  {
    id: 'fiscal_compliance',
    code: 'ART-6-OBBLIGO',
    name: 'Adempimenti Amministrativi, Fiscali & Sistema Tessera Sanitaria',
    legalBasis: 'Art. 6 par. 1 lett. c GDPR (Obbligo di legge DM MEF 19/10/2020 & DPR 633/72)',
    mandatory: true,
    description:
      'Fatturazione delle prestazioni sanitarie, tenuta dei registri contabili obbligatori e trasmissione telematica dei dati di spesa al Sistema Tessera Sanitaria per il 730 precompilato (fatta salva facoltà di opposizione).',
  },
  {
    id: 'recall_prevention',
    code: 'ART-6-RECALL',
    name: 'Richiami di Prevenzione Periodica e Igiene Orale (Recall)',
    legalBasis: 'Art. 6 par. 1 lett. a GDPR (Consenso facoltativo)',
    mandatory: false,
    description:
      'Invio di avvisi personalizzati a 6 o 12 mesi per controlli semestrali di prevenzione e sedute periodiche di igiene dentale.',
  },
];

export interface PrivacyPolicySection {
  title: string;
  articleRef?: string;
  content: string;
}

export const FULL_PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    title: '1. Titolare del Trattamento',
    articleRef: 'Art. 4 e 13 GDPR',
    content:
      'Il Titolare del trattamento dei dati personali e sanitari è la struttura sanitaria / studio odontoiatrico presso cui si effettua la prenotazione e si ricevono le cure. La piattaforma PRISMAL opera in qualità di Responsabile del Trattamento (Data Processor ex Art. 28 GDPR) conformemente alle istruzioni documentate dello Studio.',
  },
  {
    title: '2. Categorie di Dati Trattati',
    articleRef: 'Artt. 4 e 9 GDPR',
    content:
      'Vengono trattati: (a) Dati anagrafici e identificativi (nome, cognome, data di nascita, codice fiscale, indirizzo); (b) Dati di contatto (recapito telefonico, indirizzo email); (c) Dati particolari relativi alla salute (stato di salute orale, anamnesi medica generale, terapie farmacologiche, allergie, intolleranze, referti radiografici, prescrizioni odontoiatriche, diario clinico).',
  },
  {
    title: '3. Finalità e Basi Giuridiche del Trattamento',
    articleRef: 'Artt. 6 e 9 GDPR',
    content:
      'I dati personali e sanitari sono raccolti ed elaborati per le finalità di diagnosi clinica, prevenzione e terapia odontoiatrica (Art. 9 par. 2 lett. h), gestione delle prenotazioni e comunicazioni urgenti (Art. 6 par. 1 lett. b), e adempimento degli obblighi normativi, fiscali e di trasmissione al Sistema Tessera Sanitaria (Art. 6 par. 1 lett. c). Il consenso del paziente per le finalità di cura è esplicito e documentato.',
  },
  {
    title: '4. Modalità di Trattamento e Sicurezza Tecnologica',
    articleRef: 'Art. 32 GDPR',
    content:
      'Il trattamento avviene con strumenti informatici e telematici dotati di misure di sicurezza allo stato dell\'arte: cifratura dei canali in transito (protocollo TLS 1.3 / HTTPS), crittografia del database, autenticazione a doppio fattore per gli operatori, tracciamento degli accessi e separazione logica dei dati anagrafici da quelli clinici.',
  },
  {
    title: '5. Periodo di Conservazione dei Dati',
    articleRef: 'Art. 5 par. 1 lett. e GDPR',
    content:
      'La cartella clinica odontoiatrica e la relativa documentazione iconografica/radiografica sono conservate a tempo illimitato in quanto costituiscono documento ufficiale di diagnosi e cura secondo le disposizioni deontologiche mediche (FNOMCeO). I dati amministrativo-contabili e le fatture sono conservati per 10 anni (Art. 2220 c.c.). I consensi privacy sono archiviati per la durata del rapporto di cura e per i 5 anni successivi a fini probatori.',
  },
  {
    title: '6. Diritti dell\'Interessato (Paziente)',
    articleRef: 'Artt. 15, 16, 17, 18, 20, 21 GDPR',
    content:
      'In qualsiasi momento il paziente ha diritto di: (a) Accedere ai propri dati e richiedere copia integrale della cartella clinica (Art. 15); (b) Chiedere la rettifica dei dati inesatti (Art. 16); (c) Chiedere la cancellazione o anonimizzazione dei dati non più necessari (Art. 17), fatti salvi gli obblighi inderogabili di conservazione della cartella clinica; (d) Richiedere la portabilità dei dati in formato strutturato interoperabile (JSON/XML) (Art. 20); (e) Esercitare opposizione alla trasmissione dei dati di spesa sanitaria all\'Agenzia delle Entrate (DM MEF 19/10/2020); (f) Proporre reclamo all\'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).',
  },
];
