// packages/core/src/cart/serverCart.js
//
// Ported from client/src/provider/GlobalProvider.jsx's fetchCartItem /
// updateCartItem / deleteCartItem, plus the logged-in branch of
// CardProduct.jsx's quick-add-to-cart handler (addToGuestCart's sibling
// for a signed-in shopper). This is the piece flagged as missing in the
// previous pass — until now, a logged-in mobile user's "Add to cart" tap
// still landed in the local guest cart instead of their account.
//
// Same design as the rest of core's flow modules: no Redux dependency,
// no toasts — these return data, the caller dispatches
// handleAddItemCart(cart) and shows its own UI feedback. Mutations that
// succeed refetch the cart server-side and include the fresh array in
// their return value, matching the original's own "mutate, then refetch"
// pattern, so a caller never has to remember to call fetch separately.

/**
 * @returns {Array} the cart array on success, or [] on failure — matches
 *   the original's silent catch (no error surfaced for a background
 *   cart-refresh call).
 */
export async function fetchServerCart({ apiClient, endpoints }) {
  try {
    const res = await apiClient({ ...endpoints.getCartItem });
    return res.data?.success ? res.data.data : [];
  } catch {
    return [];
  }
}

/**
 * @returns {{ success: true, message: string, cart: Array } | { success: false, message: string }}
 */
export async function addToServerCart({ apiClient, endpoints, productId, quantity, priceOption = 'regular' }) {
  try {
    const res = await apiClient({
      ...endpoints.addTocart,
      data: { productId, quantity, priceOption },
    });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Could not add to cart' };
    }
    const cart = await fetchServerCart({ apiClient, endpoints });
    return { success: true, message: res.data.message, cart };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Setting quantity <= 0 removes the item — matches the original's
 * delegate-to-delete behavior exactly.
 * @returns {{ success: true, cart: Array } | { success: false, message: string }}
 */
export async function updateServerCartItemQty({ apiClient, endpoints, cartItemId, quantity }) {
  if (quantity <= 0) {
    return removeServerCartItem({ apiClient, endpoints, cartItemId });
  }
  try {
    const res = await apiClient({
      ...endpoints.updateCartItemQty,
      data: { _id: cartItemId, qty: quantity },
    });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Could not update quantity' };
    }
    const cart = await fetchServerCart({ apiClient, endpoints });
    return { success: true, cart };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * @returns {{ success: true, message: string, cart: Array } | { success: false, message: string }}
 */
export async function removeServerCartItem({ apiClient, endpoints, cartItemId }) {
  try {
    const res = await apiClient({
      ...endpoints.deleteCartItem,
      data: { _id: cartItemId },
    });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Could not remove item' };
    }
    const cart = await fetchServerCart({ apiClient, endpoints });
    return { success: true, message: res.data.message, cart };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
