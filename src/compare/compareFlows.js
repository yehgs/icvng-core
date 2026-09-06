// packages/core/src/compare/compareFlows.js
//
// Ported from client/src/components/CompareButton.jsx — structurally
// identical to ../wishlist/wishlistFlows.js, with one difference worth
// keeping explicit: the guest-side toggle enforces a 4-item cap (only on
// the local/guest path — a logged-in user's server-side compare list has
// no such limit encoded here, matching the original exactly).

const MAX_GUEST_COMPARE_ITEMS = 4;

/**
 * @returns {{ success: true, isInCompare: boolean } | { success: false }}
 */
export async function checkCompareStatus({ apiClient, endpoints, productId }) {
  try {
    const res = await apiClient({ ...endpoints.checkCompare(productId) });
    return { success: true, isInCompare: Boolean(res.data?.isInCompare) };
  } catch {
    return { success: false };
  }
}

/**
 * @returns {{ success: true, added: boolean } | { success: false, message: string }}
 */
export async function toggleCompareOnServer({ apiClient, endpoints, productId }) {
  try {
    const res = await apiClient({ ...endpoints.toggleCompare, data: { productId } });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Failed to update compare list' };
    }
    return { success: true, added: res.data.action === 'added' };
  } catch (err) {
    return { success: false, message: err?.response?.data?.message || 'Failed to update compare list' };
  }
}

/**
 * Pure toggle over a guest compare list, enforcing the same 4-item cap the
 * original's guest branch does.
 * @param {Array} list current guest compare list (full product objects)
 * @param {object} product full product object (must have _id)
 * @returns {{ list: Array, added: boolean, capReached?: true }}
 *   capReached is set (and list/added unchanged from input) when adding
 *   would exceed the cap — the caller shows its own "max 4 products"
 *   message, same as the original's toast.error.
 */
export function toggleCompareGuest(list, product) {
  const already = list.some((i) => i._id === product._id);
  if (already) {
    return { list: list.filter((i) => i._id !== product._id), added: false };
  }
  if (list.length >= MAX_GUEST_COMPARE_ITEMS) {
    return { list, added: false, capReached: true };
  }
  return { list: [...list, product], added: true };
}

export { MAX_GUEST_COMPARE_ITEMS };
