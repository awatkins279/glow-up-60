import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const DB = 'glow-up-60';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

/**
 * Web: IndexedDB (hundreds of MB, survives offline, fine for photo data URLs).
 * Falls back to localStorage when IndexedDB is unavailable (private mode on old Safari).
 */
const webStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const v = await tx<string | undefined>('readonly', (s) => s.get(name));
      if (v !== undefined) return v;
    } catch {
      /* fall through */
    }
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await tx('readwrite', (s) => s.put(value, name));
      return;
    } catch {
      /* fall through */
    }
    try {
      localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: async (name) => {
    try {
      await tx('readwrite', (s) => s.delete(name));
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

const nativeStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

export const appStorage: StateStorage = Platform.OS === 'web' && typeof indexedDB !== 'undefined' ? webStorage : nativeStorage;
