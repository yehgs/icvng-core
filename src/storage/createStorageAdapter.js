// packages/core/src/storage/createStorageAdapter.js
//
// core never touches localStorage/window/AsyncStorage directly — every app
// that consumes this package hands it an adapter matching this shape at
// setup time. That's the one seam that differs between web and mobile;
// everything downstream (Axios, guest cart, language persistence) is
// written against this interface instead of a specific storage API.
//
// Web (client/admin):
//   createStorageAdapter({
//     getItem: (k) => Promise.resolve(localStorage.getItem(k)),
//     setItem: (k, v) => Promise.resolve(localStorage.setItem(k, v)),
//     removeItem: (k) => Promise.resolve(localStorage.removeItem(k)),
//   })
//
// Mobile — access/refresh tokens should go through expo-secure-store
// (encrypted keychain/keystore), NOT AsyncStorage:
//   import * as SecureStore from 'expo-secure-store';
//   createStorageAdapter(SecureStore) // already exposes getItemAsync etc.,
//   so wrap those to match getItem/setItem/removeItem naming below.
//
// Guest cart / language / other non-token data on mobile can safely use
// AsyncStorage instead — pass a separate adapter instance for that.

export function createStorageAdapter({ getItem, setItem, removeItem }) {
  if (
    typeof getItem !== 'function' ||
    typeof setItem !== 'function' ||
    typeof removeItem !== 'function'
  ) {
    throw new Error(
      '[icvng-core] createStorageAdapter requires getItem, setItem, and removeItem functions',
    );
  }
  // Every method is normalized to return a Promise, even if the underlying
  // implementation (e.g. web's synchronous localStorage) is sync — so
  // consuming code never has to special-case either platform.
  return {
    getItem: async (key) => getItem(key),
    setItem: async (key, value) => setItem(key, value),
    removeItem: async (key) => removeItem(key),
  };
}
