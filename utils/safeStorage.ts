
export type StorageBackend = 'localStorage' | 'memory';

export interface SafeStorage {
  backend: StorageBackend;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

const createMemoryStorage = (): SafeStorage => {
  const store = new Map<string, string>();

  return {
    backend: 'memory',
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
};

const createSafeStorage = (): SafeStorage => {
  // Check for SSR or missing window
  if (typeof window === 'undefined') {
    return createMemoryStorage();
  }

  try {
    const testKey = '__smartblo_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    
    // If we reach here, localStorage is available
    return {
      backend: 'localStorage',
      getItem(key: string) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem(key: string, value: string) {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // Ignore quota exceeded or other errors
        }
      },
      removeItem(key: string) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore
        }
      },
      clear() {
        try {
          window.localStorage.clear();
        } catch {
          // Ignore
        }
      },
    };
  } catch (e) {
    // SecurityError or other issues -> Fallback
    console.warn("Storage access blocked (iframe/privacy). Using memory fallback.");
    return createMemoryStorage();
  }
};

export const safeStorage = createSafeStorage();
