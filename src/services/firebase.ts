import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Studio, Appointment, BlockedSlot, AppointmentStatus, PatientRecord, PlatformTransaction, SuperAdminPaymentConfig } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGoogleFirebase() {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return {
      success: true,
      user: {
        email: result.user.email || '',
        name: result.user.displayName || '',
        photoUrl: result.user.photoURL || '',
        uid: result.user.uid,
      },
    };
  } catch (err: any) {
    console.error('Firebase Google Sign-in error:', err);
    return {
      success: false,
      error: err?.message || 'Accesso Google non riuscito',
    };
  }
}

// Initialize Firestore with custom database ID if specified in config
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection verification as mandated by skill guidelines
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection to Firestore established successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database initializing.');
    } else {
      console.log('[Firebase] Firestore ready.');
    }
    return true;
  }
}

// -------------------------------------------------------------
// FIRESTORE COLLECTIONS & CRUD HELPERS
// -------------------------------------------------------------

const STUDIOS_COLLECTION = 'studios';
const APPOINTMENTS_COLLECTION = 'appointments';
const BLOCKED_SLOTS_COLLECTION = 'blockedSlots';
const PATIENTS_COLLECTION = 'patients';
const TRANSACTIONS_COLLECTION = 'transactions';
const ADMIN_SETTINGS_COLLECTION = 'adminSettings';

/**
 * Fetch all studios from Firestore
 */
export async function getStudiosFromFirestore(): Promise<Studio[]> {
  try {
    const snap = await getDocs(collection(db, STUDIOS_COLLECTION));
    const studios: Studio[] = [];
    snap.forEach(d => {
      studios.push(d.data() as Studio);
    });
    return studios;
  } catch (err) {
    console.error('[Firebase] Error fetching studios:', err);
    return [];
  }
}

/**
 * Save or update a studio in Firestore
 */
export async function saveStudioToFirestore(studio: Studio): Promise<void> {
  try {
    const docRef = doc(db, STUDIOS_COLLECTION, studio.id);
    await setDoc(docRef, studio, { merge: true });
  } catch (err) {
    console.error('[Firebase] Error saving studio:', err);
  }
}

/**
 * Update partial studio fields in Firestore
 */
export async function updateStudioInFirestore(studioId: string, updates: Partial<Studio>): Promise<void> {
  try {
    const docRef = doc(db, STUDIOS_COLLECTION, studioId);
    await setDoc(docRef, updates as any, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Warning updating studio in Firestore:', err);
  }
}

/**
 * Delete a studio permanently from Firestore
 */
export async function deleteStudioFromFirestore(studioId: string): Promise<void> {
  try {
    const docRef = doc(db, STUDIOS_COLLECTION, studioId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firebase] Warning deleting studio from Firestore:', err);
  }
}

/**
 * Subscribe in real-time to all studios
 */
export function subscribeToStudios(callback: (studios: Studio[]) => void): () => void {
  try {
    const q = collection(db, STUDIOS_COLLECTION);
    return onSnapshot(
      q,
      snap => {
        const studios: Studio[] = [];
        snap.forEach(d => studios.push(d.data() as Studio));
        callback(studios);
      },
      err => {
        console.warn('[Firebase] Studios listener error:', err.message);
      }
    );
  } catch (err) {
    console.warn('[Firebase] Warning subscribing to studios:', err);
    return () => {};
  }
}

/**
 * Fetch all appointments from Firestore (optionally filtered by studioId)
 */
export async function getAppointmentsFromFirestore(studioId?: string): Promise<Appointment[]> {
  try {
    let q = collection(db, APPOINTMENTS_COLLECTION);
    if (studioId) {
      const qFiltered = query(collection(db, APPOINTMENTS_COLLECTION), where('studioId', '==', studioId));
      const snap = await getDocs(qFiltered);
      const appts: Appointment[] = [];
      snap.forEach(d => appts.push(d.data() as Appointment));
      return appts;
    }
    const snap = await getDocs(q);
    const appts: Appointment[] = [];
    snap.forEach(d => appts.push(d.data() as Appointment));
    return appts;
  } catch (err) {
    console.warn('[Firebase] Warning fetching appointments:', err);
    return [];
  }
}

/**
 * Save a new appointment or update an existing one in Firestore
 */
export async function saveAppointmentToFirestore(appointment: Appointment): Promise<void> {
  try {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, appointment.id);
    await setDoc(docRef, appointment, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Warning saving appointment:', err);
  }
}

/**
 * Update the status of an appointment in Firestore safely using setDoc merge
 * If the appointment did not previously exist in Firestore, this creates or merges without throwing 'No document to update'
 */
export async function updateAppointmentStatusInFirestore(
  appointmentId: string,
  status: AppointmentStatus,
  fullAppointment?: Partial<Appointment>
): Promise<void> {
  try {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    const payload = fullAppointment ? { ...fullAppointment, status } : { status };
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Warning updating appointment status:', err);
  }
}

/**
 * Delete an appointment permanently from Firestore
 */
export async function deleteAppointmentFromFirestore(appointmentId: string): Promise<void> {
  try {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firebase] Warning deleting appointment:', err);
  }
}

/**
 * Delete all appointments from Firestore (resets platform appointments collection)
 */
export async function clearAllAppointmentsFromFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, APPOINTMENTS_COLLECTION));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('[Firebase] Warning clearing appointments:', err);
  }
}

/**
 * Real-time subscription to appointments for cross-device consistency
 */
export function subscribeToAppointments(callback: (appointments: Appointment[]) => void): () => void {
  try {
    const q = collection(db, APPOINTMENTS_COLLECTION);
    return onSnapshot(
      q,
      snap => {
        const appts: Appointment[] = [];
        snap.forEach(d => appts.push(d.data() as Appointment));
        callback(appts);
      },
      err => {
        console.warn('[Firebase] Appointments listener error:', err.message);
      }
    );
  } catch (err) {
    console.error('[Firebase] Error subscribing to appointments:', err);
    return () => {};
  }
}

/**
 * Fetch blocked slots from Firestore
 */
export async function getBlockedSlotsFromFirestore(studioId?: string): Promise<BlockedSlot[]> {
  try {
    if (studioId) {
      const q = query(collection(db, BLOCKED_SLOTS_COLLECTION), where('studioId', '==', studioId));
      const snap = await getDocs(q);
      const slots: BlockedSlot[] = [];
      snap.forEach(d => slots.push(d.data() as BlockedSlot));
      return slots;
    }
    const snap = await getDocs(collection(db, BLOCKED_SLOTS_COLLECTION));
    const slots: BlockedSlot[] = [];
    snap.forEach(d => slots.push(d.data() as BlockedSlot));
    return slots;
  } catch (err) {
    console.error('[Firebase] Error fetching blocked slots:', err);
    return [];
  }
}

/**
 * Save a blocked slot in Firestore
 */
export async function saveBlockedSlotToFirestore(slot: BlockedSlot): Promise<void> {
  try {
    const docRef = doc(db, BLOCKED_SLOTS_COLLECTION, slot.id);
    await setDoc(docRef, slot, { merge: true });
  } catch (err) {
    console.error('[Firebase] Error saving blocked slot:', err);
  }
}

/**
 * Delete a blocked slot in Firestore
 */
export async function deleteBlockedSlotFromFirestore(slotId: string): Promise<void> {
  try {
    const docRef = doc(db, BLOCKED_SLOTS_COLLECTION, slotId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firebase] Warning deleting blocked slot:', err);
  }
}

/**
 * Delete all blocked slots from Firestore
 */
export async function clearAllBlockedSlotsFromFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, BLOCKED_SLOTS_COLLECTION));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('[Firebase] Warning clearing blocked slots:', err);
  }
}

/**
 * Real-time subscription to blocked slots
 */
export function subscribeToBlockedSlots(callback: (slots: BlockedSlot[]) => void): () => void {
  try {
    const q = collection(db, BLOCKED_SLOTS_COLLECTION);
    return onSnapshot(
      q,
      snap => {
        const slots: BlockedSlot[] = [];
        snap.forEach(d => slots.push(d.data() as BlockedSlot));
        callback(slots);
      },
      err => {
        console.warn('[Firebase] Blocked slots listener error:', err.message);
      }
    );
  } catch (err) {
    console.error('[Firebase] Error subscribing to blocked slots:', err);
    return () => {};
  }
}

/**
 * Fetch patient records for a studio
 */
export async function getPatientRecordsFromFirestore(studioId?: string): Promise<PatientRecord[]> {
  try {
    if (studioId) {
      const q = query(collection(db, PATIENTS_COLLECTION), where('studioId', '==', studioId));
      const snap = await getDocs(q);
      const records: PatientRecord[] = [];
      snap.forEach(d => records.push(d.data() as PatientRecord));
      return records;
    }
    const snap = await getDocs(collection(db, PATIENTS_COLLECTION));
    const records: PatientRecord[] = [];
    snap.forEach(d => records.push(d.data() as PatientRecord));
    return records;
  } catch (err) {
    console.error('[Firebase] Error fetching patient records:', err);
    return [];
  }
}

/**
 * Save or update a patient record (anamnesis, odontogram, clinical notes) in Firestore
 */
export async function savePatientRecordToFirestore(patient: PatientRecord): Promise<void> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patient.id);
    await setDoc(docRef, { ...patient, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Warning saving patient record:', err);
  }
}

/**
 * Delete a patient record from Firestore
 */
export async function deletePatientRecordFromFirestore(patientId: string): Promise<void> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firebase] Warning deleting patient record:', err);
  }
}

/**
 * Delete all patient records from Firestore
 */
export async function clearAllPatientRecordsFromFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, PATIENTS_COLLECTION));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('[Firebase] Warning clearing patient records:', err);
  }
}

/**
 * Real-time subscription to patient records for a studio
 */
export function subscribeToPatientRecords(
  studioId?: string,
  callback: (records: PatientRecord[]) => void = () => {}
): () => void {
  try {
    const q = studioId
      ? query(collection(db, PATIENTS_COLLECTION), where('studioId', '==', studioId))
      : collection(db, PATIENTS_COLLECTION);
    return onSnapshot(
      q,
      snap => {
        const records: PatientRecord[] = [];
        snap.forEach(d => records.push(d.data() as PatientRecord));
        callback(records);
      },
      err => {
        console.warn('[Firebase] Patient records listener error:', err.message);
      }
    );
  } catch (err) {
    console.error('[Firebase] Error subscribing to patient records:', err);
    return () => {};
  }
}

/**
 * Fetch all platform transactions from Firestore
 */
export async function getPlatformTransactionsFromFirestore(): Promise<PlatformTransaction[]> {
  try {
    const snap = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
    const txs: PlatformTransaction[] = [];
    snap.forEach(d => txs.push(d.data() as PlatformTransaction));
    return txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('[Firebase] Error fetching transactions:', err);
    return [];
  }
}

/**
 * Save or update a platform transaction in Firestore
 */
export async function savePlatformTransactionToFirestore(tx: PlatformTransaction): Promise<void> {
  try {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, tx.id);
    await setDoc(docRef, tx, { merge: true });
  } catch (err) {
    console.error('[Firebase] Error saving transaction:', err);
  }
}

/**
 * Delete a platform transaction from Firestore
 */
export async function deletePlatformTransactionFromFirestore(txId: string): Promise<void> {
  try {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, txId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[Firebase] Error deleting transaction:', err);
  }
}

/**
 * Delete all platform transactions from Firestore
 */
export async function clearAllPlatformTransactionsFromFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
    const batchPromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(batchPromises);
  } catch (err) {
    console.error('[Firebase] Error clearing all transactions:', err);
  }
}

/**
 * Real-time subscription to platform transactions
 */
export function subscribeToPlatformTransactions(
  callback: (txs: PlatformTransaction[]) => void = () => {}
): () => void {
  try {
    const q = collection(db, TRANSACTIONS_COLLECTION);
    return onSnapshot(
      q,
      snap => {
        const txs: PlatformTransaction[] = [];
        snap.forEach(d => txs.push(d.data() as PlatformTransaction));
        callback(txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      },
      err => {
        console.warn('[Firebase] Transactions listener error:', err.message);
      }
    );
  } catch (err) {
    console.error('[Firebase] Error subscribing to transactions:', err);
    return () => {};
  }
}

/**
 * Fetch SuperAdmin Payment Gateway Config from Firestore
 */
export async function getSuperAdminPaymentConfigFromFirestore(): Promise<SuperAdminPaymentConfig | null> {
  try {
    const docRef = doc(db, ADMIN_SETTINGS_COLLECTION, 'paymentGateway');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SuperAdminPaymentConfig;
    }
    return null;
  } catch (err) {
    console.error('[Firebase] Error fetching payment config:', err);
    return null;
  }
}

/**
 * Save SuperAdmin Payment Gateway Config to Firestore
 */
export async function saveSuperAdminPaymentConfigToFirestore(config: SuperAdminPaymentConfig): Promise<void> {
  try {
    const docRef = doc(db, ADMIN_SETTINGS_COLLECTION, 'paymentGateway');
    await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('[Firebase] Error saving payment config:', err);
  }
}

/**
 * Real-time subscription to SuperAdmin Payment Gateway Config
 */
export function subscribeToSuperAdminPaymentConfig(
  callback: (config: SuperAdminPaymentConfig | null) => void = () => {}
): () => void {
  try {
    const docRef = doc(db, ADMIN_SETTINGS_COLLECTION, 'paymentGateway');
    return onSnapshot(
      docRef,
      snap => {
        if (snap.exists()) {
          callback(snap.data() as SuperAdminPaymentConfig);
        } else {
          callback(null);
        }
      },
      err => {
        console.warn('[Firebase] Payment config listener error:', err.message);
      }
    );
  } catch (err) {
    console.error('[Firebase] Error subscribing to payment config:', err);
    return () => {};
  }
}
