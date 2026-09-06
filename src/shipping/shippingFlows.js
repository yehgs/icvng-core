// packages/core/src/shipping/shippingFlows.js
//
// Ported from client/src/pages/CheckoutPage.jsx's loadShipping(). Three
// pieces: building the request payload (cart -> shipping-relevant item
// data), the display sort order (pickup methods always last, then
// cheapest first), and the "keep the customer's choice selected across
// refreshes if it's still available" reconciliation that runs every time
// the cart changes (quantity edits can change eligibility/free-shipping
// thresholds without the customer having touched shipping at all).
//
// Also fixes a pre-existing bug ported straight into this extraction: the
// original called a hardcoded '/api/shipping/calculate-checkout' URL
// directly instead of using SummaryApi.calculateShippingCost, which
// already points at the exact same path — this now goes through
// endpoints.calculateShippingCost like every other call in this codebase.

/**
 * @param {Array} cartItem - server cart array
 * @returns {Array<{productId, quantity, category, weight, name, priceOption, selectedPrice}>}
 */
export function buildShippingItems(cartItem) {
  return cartItem.map((item) => ({
    productId: item.productId._id,
    quantity: item.quantity,
    category: item.productId.category?._id || item.productId.category,
    weight: item.productId.weight || 1,
    name: item.productId.name,
    priceOption: item.priceOption || 'regular',
    selectedPrice: item.selectedPrice || item.productId.price,
  }));
}

/**
 * @param {object} params
 * @param {object} params.apiClient
 * @param {object} params.endpoints
 * @param {string} params.addressId
 * @param {Array} params.cartItem
 * @param {number} params.orderValue - subtotal
 * @returns {{ success: true, methods: Array } | { success: false, message: string }}
 */
export async function calculateShipping({ apiClient, endpoints, addressId, cartItem, orderValue }) {
  if (!addressId || cartItem.length === 0) {
    return { success: true, methods: [] };
  }
  const items = buildShippingItems(cartItem);
  const totalWeight = items.reduce((sum, i) => sum + (i.weight || 1) * i.quantity, 0);

  try {
    const res = await apiClient({
      ...endpoints.calculateShippingCost,
      data: { addressId, items, orderValue, totalWeight },
    });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Could not load shipping options' };
    }
    return { success: true, methods: sortShippingMethods(res.data.data?.methods || []) };
  } catch {
    return { success: false, message: 'Could not load shipping options' };
  }
}

/**
 * Pickup methods always sort last regardless of cost; everything else
 * sorts cheapest first.
 */
export function sortShippingMethods(methods) {
  return [...methods].sort((a, b) => {
    if (a.type === 'pickup' && b.type !== 'pickup') return 1;
    if (b.type === 'pickup' && a.type !== 'pickup') return -1;
    return a.cost - b.cost;
  });
}

/**
 * Keep the previously-selected method if it's still in the fresh list
 * (matched by `code`, since cost/eligibility can change under the same
 * method); otherwise fall back to the first (cheapest non-pickup, given
 * the sort above) available method, or null if there are none.
 */
export function reconcileSelectedShippingMethod(methods, previousSelected) {
  const stillAvailable = previousSelected
    ? methods.find((m) => m.code === previousSelected.code)
    : null;
  return stillAvailable || methods[0] || null;
}
