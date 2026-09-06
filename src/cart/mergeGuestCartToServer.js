// packages/core/src/cart/mergeGuestCartToServer.js
//
// Ported from client/src/provider/GlobalProvider.jsx's
// mergeGuestCartToServer(). Same two-step strategy: try the bulk
// migrateGuestCart endpoint first, and if that call itself fails (not
// individual items — the whole request), fall back to adding each guest
// cart item one at a time via addTocart, swallowing per-item failures so
// one bad item doesn't block the rest from migrating.
//
// Deliberately excludes: reading/clearing localStorage, toasts, and
// re-fetching the server cart afterward — those are UI/storage concerns
// each app already owns (client's GlobalProvider clears LS_GUEST_CART and
// calls fetchCartItem(); mobile should clear its AsyncStorage guest-cart
// key and refresh its own cart view the same way, using this function's
// return value to decide what happened).
//
// @param {object} params
// @param {object} params.apiClient
// @param {object} params.endpoints
// @param {Array} params.guestCartItems - [{ productId, quantity, priceOption }]
// @returns {{ migratedCount: number, usedFallback: boolean }}
//   migratedCount is always guestCartItems.length when the bulk endpoint
//   succeeds (server is trusted to have migrated all of them); when
//   falling back to per-item calls, it's the count that actually
//   succeeded individually.
export async function mergeGuestCartToServer({ apiClient, endpoints, guestCartItems }) {
  if (!guestCartItems || guestCartItems.length === 0) {
    return { migratedCount: 0, usedFallback: false };
  }

  try {
    await apiClient({
      ...endpoints.migrateGuestCart,
      data: { guestCartItems },
    });
    return { migratedCount: guestCartItems.length, usedFallback: false };
  } catch {
    let migratedCount = 0;
    for (const item of guestCartItems) {
      try {
        await apiClient({
          ...endpoints.addTocart,
          data: {
            productId: item.productId,
            quantity: item.quantity,
            priceOption: item.priceOption || 'regular',
          },
        });
        migratedCount += 1;
      } catch {
        // Same as the original: one item failing doesn't stop the rest.
      }
    }
    return { migratedCount, usedFallback: true };
  }
}
