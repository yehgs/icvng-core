// packages/core/src/api/index.js
export { createApiClient, default as createApiClientDefault } from './createApiClient.js';
export { default as endpoints } from './endpoints.js';
// Re-exported here too (also available from the top-level barrel) since
// every createApiClient caller needs a tokenStorage adapter — logically
// part of the same "set up your API layer" step.
export { createStorageAdapter } from '../storage/createStorageAdapter.js';
