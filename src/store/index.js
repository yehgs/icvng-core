// packages/core/src/store/index.js
//
// Every slice ported verbatim from client/src/store/ — none of them touched
// localStorage/window, so no adaptation was needed, just relocation.
// Checked for action-name collisions across all seven slices before doing
// the `export *` below — there are none.
//
// Usage in an app:
//   import { configureStore } from '@reduxjs/toolkit';
//   import { coreReducers } from '@yehgs/icvng-core/store';
//
//   export const store = configureStore({
//     reducer: {
//       ...coreReducers,
//       // app-specific slices (e.g. mobile push-notification prefs) go here
//     },
//   });

import userReducer from "./userSlice.js";
import productReducer from "./productSlice.js";
import cartReducer from "./cartProduct.js";
import addressReducer from "./addressSlice.js";
import orderReducer from "./orderSlice.js";
import filterReducer from "./filterSlice.js";
import productRequestReducer from "./productRequestSlice.js";

export const coreReducers = {
  user: userReducer,
  product: productReducer,
  cartItem: cartReducer,
  addresses: addressReducer,
  orders: orderReducer,
  filter: filterReducer,
  productRequest: productRequestReducer,
};

// Re-export every slice's actions so apps can do
// `import { setUserDetails, handleAddItemCart } from '@yehgs/icvng-core/store'`
// without knowing which file each one lives in.
export * from "./userSlice.js";
export * from "./productSlice.js";
export * from "./cartProduct.js";
export * from "./addressSlice.js";
export * from "./orderSlice.js";
export * from "./filterSlice.js";
export * from "./productRequestSlice.js";
