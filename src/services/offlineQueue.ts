import { useState, useEffect, useCallback } from 'react';

export interface OfflineQueuedBooking {
  id: string;
  queuedAt: string;
  studioId: string;
  studioName: string;
  bookingData: {
    date: string;
    timeSlot: string;
    visitReasonId: string;
    visitReasonName: string;
    patientFirstName: string;
    patientLastName: string;
    patientPhone: string;
    patientEmail: string;
    notes?: string;
    isUrgent?: boolean;
    gdprConsent?: boolean;
  };
  retryCount: number;
  status: 'queued' | 'syncing' | 'synced' | 'error';
  lastError?: string;
  generatedCode: string;
  managementToken: string;
}

const STORAGE_KEY = 'prismal_offline_booking_queue_v1';
const EVENT_NAME = 'prismal_offline_queue_changed';

export function getOfflineBookings(): OfflineQueuedBooking[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveOfflineBookings(items: OfflineQueuedBooking[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
  } catch (err) {
    console.warn('[OFFLINE QUEUE] Failed to save queue to localStorage:', err);
  }
}

export function enqueueOfflineBooking(
  studioId: string,
  studioName: string,
  bookingData: OfflineQueuedBooking['bookingData']
): OfflineQueuedBooking {
  const existing = getOfflineBookings();
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  const generatedCode = `OFF-${randomChars}`;
  const managementToken = `tok-off-${Date.now()}-${randomChars.toLowerCase()}`;

  const newEntry: OfflineQueuedBooking = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    queuedAt: new Date().toISOString(),
    studioId,
    studioName,
    bookingData,
    retryCount: 0,
    status: 'queued',
    generatedCode,
    managementToken,
  };

  const updated = [newEntry, ...existing];
  saveOfflineBookings(updated);
  return newEntry;
}

export function removeOfflineBooking(id: string) {
  const existing = getOfflineBookings();
  const updated = existing.filter(item => item.id !== id);
  saveOfflineBookings(updated);
}

export function updateOfflineBookingStatus(
  id: string,
  status: OfflineQueuedBooking['status'],
  errorMsg?: string
) {
  const existing = getOfflineBookings();
  const updated = existing.map(item => {
    if (item.id === id) {
      return {
        ...item,
        status,
        retryCount: status === 'error' ? item.retryCount + 1 : item.retryCount,
        lastError: errorMsg,
      };
    }
    return item;
  });
  saveOfflineBookings(updated);
}

// Global Hook for UI components to monitor offline status & queue state
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [queuedBookings, setQueuedBookings] = useState<OfflineQueuedBooking[]>(getOfflineBookings);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    syncedCount: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => setQueuedBookings(getOfflineBookings());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(EVENT_NAME, handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(EVENT_NAME, handleQueueChange);
    };
  }, []);

  const triggerSync = useCallback(
    async (
      syncExecutor: (item: OfflineQueuedBooking) => Promise<{ success: boolean; error?: string }>
    ) => {
      if (!isOnline) {
        return { success: false, syncedCount: 0, message: 'Dispositivo ancora offline' };
      }

      const queue = getOfflineBookings().filter(q => q.status !== 'synced');
      if (queue.length === 0) {
        return { success: true, syncedCount: 0, message: 'Nessuna prenotazione in sospeso' };
      }

      setIsSyncing(true);
      let successCount = 0;

      for (const item of queue) {
        updateOfflineBookingStatus(item.id, 'syncing');
        try {
          const res = await syncExecutor(item);
          if (res.success) {
            updateOfflineBookingStatus(item.id, 'synced');
            successCount++;
            // Clean up synced item after a short delay
            setTimeout(() => {
              removeOfflineBooking(item.id);
            }, 3000);
          } else {
            updateOfflineBookingStatus(item.id, 'error', res.error || 'Errore durante la sincronizzazione');
          }
        } catch (err: any) {
          updateOfflineBookingStatus(item.id, 'error', err?.message || 'Errore di rete');
        }
      }

      setIsSyncing(false);
      setLastSyncResult({
        success: successCount > 0,
        syncedCount: successCount,
        timestamp: new Date().toLocaleTimeString('it-IT'),
      });

      return { success: true, syncedCount: successCount };
    },
    [isOnline]
  );

  return {
    isOnline,
    queuedBookings,
    queuedCount: queuedBookings.filter(b => b.status !== 'synced').length,
    isSyncing,
    triggerSync,
    lastSyncResult,
  };
}
