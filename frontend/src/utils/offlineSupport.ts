/**
 * Offline support utilities using IndexedDB
 */

const DB_NAME = 'viscept_offline';
const DB_VERSION = 1;
const STORE_NAME = 'diagrams';

/**
 * Initialize offline database
 */
export const initializeOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Save diagram to offline storage
 */
export const saveDiagramOffline = async (
  id: string,
  code: string,
  diagramType: string,
  prompt: string
): Promise<void> => {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.put({
      id,
      code,
      diagramType,
      prompt,
      savedAt: new Date().toISOString(),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

/**
 * Load diagram from offline storage
 */
export const loadDiagramOffline = async (id: string) => {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

/**
 * Get all offline diagrams
 */
export const getAllOfflineDiagrams = async () => {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

/**
 * Delete offline diagram
 */
export const deleteDiagramOffline = async (id: string): Promise<void> => {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

/**
 * Check if online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Register online/offline listeners
 */
export const registerOfflineListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};