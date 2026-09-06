import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.js',
    'api/index': 'src/api/index.js',
    'store/index': 'src/store/index.js',
    'pricing/index': 'src/pricing/index.js',
    'catalog/index': 'src/catalog/index.js',
    'auth/index': 'src/auth/index.js',
    'cart/index': 'src/cart/index.js',
    'wishlist/index': 'src/wishlist/index.js',
    'compare/index': 'src/compare/index.js',
    'checkout/index': 'src/checkout/index.js',
    'shipping/index': 'src/shipping/index.js',
    'address/index': 'src/address/index.js',
  },
  format: ['esm', 'cjs'],
  dts: false, // plain JS source — add if the package is migrated to TS later
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ['axios', '@reduxjs/toolkit'],
});
