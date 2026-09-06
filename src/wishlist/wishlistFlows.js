// packages/core/src/wishlist/wishlistFlows.js
//
// Ported from client/src/components/WishlistButton.jsx. Three pieces:
//   - checkWishlistStatus: the on-mount server check for a logged-in user
//   - toggleWishlistOnServer: the logged-in toggle mutation
//   - toggleWishlistGuest: the pure guest-side array toggle (no storage —
//     the caller reads/writes localStorage or AsyncStorage around this,
//     same separation of concerns as ../cart/guestCart.js)
//
// Deliberately excluded: toasts (the exact message text embeds the
// product name and, on web, goes through i18n's t() — neither belongs in
// a platform-agnostic module), the module-level statusCache (that's a
// component-lifetime optimization each app's own button component should
// keep, not shared state), and updateWishlistCount()'s DOM CustomEvent
// (web-only, same as cart's triggerCartUpdate()).

/**
 * @returns {{ success: true, isInWishlist: boolean } | { success: false }}
 *   Mirrors the original's silent catch: a failed check just means "don't
 *   trust/cache this result," not an error to surface to the shopper.
 */
export async function checkWishlistStatus({ apiClient, endpoints, productId }) {
  try {
    const res = await apiClient({ ...endpoints.checkWishlist(productId) });
    return { success: true, isInWishlist: Boolean(res.data?.isInWishlist) };
  } catch {
    return { success: false };
  }
}

/**
 * @returns {{ success: true, added: boolean } | { success: false, message: string }}
 */
export async function toggleWishlistOnServer({ apiClient, endpoints, productId }) {
  try {
    const res = await apiClient({ ...endpoints.toggleWishlist, data: { productId } });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Failed to update wishlist' };
    }
    return { success: true, added: res.data.action === 'added' };
  } catch (err) {
    return { success: false, message: err?.response?.data?.message || 'Failed to update wishlist' };
  }
}

/**
 * Pure toggle over a guest wishlist array (full product objects, same as
 * the original — the guest wishlist stores whole products so it can render
 * without a server round trip).
 * @param {Array} list current guest wishlist
 * @param {object} product full product object (must have _id)
 * @returns {{ list: Array, added: boolean }}
 */
export function toggleWishlistGuest(list, product) {
  const already = list.some((i) => i._id === product._id);
  if (already) {
    return { list: list.filter((i) => i._id !== product._id), added: false };
  }
  return { list: [...list, product], added: true };
}
