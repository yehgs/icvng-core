// packages/core/src/api/createApiClient.js
//
// Ported from client/src/utils/Axios.js. The auth/refresh-token flow is
// unchanged; the two things that were browser-only (localStorage,
// window.location.hostname) are now supplied by the caller:
//
//   - tokenStorage: a storage adapter (see ../storage/createStorageAdapter.js)
//     for accesstoken / refreshToken. Web passes a localStorage wrapper;
//     mobile should pass one backed by expo-secure-store.
//   - getExtraHeaders(): an async function returning headers to merge into
//     every request. This is where the web/mobile split on country
//     detection lives — web returns { 'X-Storefront-Host': window.location.host },
//     mobile returns { 'X-App-Country': <selected country code> } (see
//     server/middleware/countryDetect.js step 3). core stays agnostic of
//     which one applies.
//
// Everything else — the interceptor order, the 401-triggers-refresh-once
// logic via `_retry`, the accessToken/accesstoken response-shape fallback —
// matches the original exactly.

import axios from 'axios';
import endpoints from './endpoints.js';

export function createApiClient({ baseURL, tokenStorage, getExtraHeaders }) {
  if (!baseURL) {
    throw new Error('[icvng-core] createApiClient requires a baseURL');
  }
  if (!tokenStorage) {
    throw new Error('[icvng-core] createApiClient requires a tokenStorage adapter');
  }

  const client = axios.create({
    baseURL,
    withCredentials: true,
  });

  client.interceptors.request.use(
    async (config) => {
      const accessToken = await tokenStorage.getItem('accesstoken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      if (typeof getExtraHeaders === 'function') {
        const extra = await getExtraHeaders();
        if (extra) {
          Object.assign(config.headers, extra);
        }
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await client({
        ...endpoints.refreshToken,
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      // Server returns either data.accessToken or data.accesstoken — handle both
      const token =
        response.data?.data?.accessToken || response.data?.data?.accesstoken;

      if (token) {
        await tokenStorage.setItem('accesstoken', token);
      }
      return token || null;
    } catch (error) {
      console.error('Token refresh failed:', error?.response?.status);
      return null;
    }
  };

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originRequest = error.config;

      if (error.response?.status === 401 && !originRequest._retry) {
        originRequest._retry = true;

        const refreshToken = await tokenStorage.getItem('refreshToken');
        if (refreshToken) {
          const newAccessToken = await refreshAccessToken(refreshToken);
          if (newAccessToken) {
            originRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return client(originRequest);
          }
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export { endpoints };
export default createApiClient;
