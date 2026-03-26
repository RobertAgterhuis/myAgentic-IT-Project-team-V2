type StorageRecord = Record<string, string>;

function createStub() {
  return () => undefined;
}

function createStorage(): Storage {
  let store: StorageRecord = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

function ensureStorage(name: 'localStorage' | 'sessionStorage') {
  const current = window[name];
  if (
    current &&
    typeof current.getItem === 'function' &&
    typeof current.setItem === 'function' &&
    typeof current.removeItem === 'function' &&
    typeof current.clear === 'function'
  ) {
    return;
  }

  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value: createStorage(),
  });
}

ensureStorage('localStorage');
ensureStorage('sessionStorage');

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: createStub(),
      removeEventListener: createStub(),
      addListener: createStub(),
      removeListener: createStub(),
      dispatchEvent: createStub(),
    }),
  });
}
