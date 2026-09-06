// packages/core/src/cart/guestCart.js
//
// Ported from client/src/provider/GlobalProvider.jsx's addToGuestCart /
// updateGuestCartItem / removeFromGuestCart. These are pure array
// transforms — GlobalProvider.jsx wraps them with a localStorage write and
// a `window.dispatchEvent(new CustomEvent('cart-updated'))` call (both
// browser-only) after calling the equivalent of these; that wrapping stays
// in each app, since mobile has neither concept — its state update alone
// triggers a re-render, no DOM event needed.
//
// A guest cart item shape: { productId, quantity, priceOption }
// priceOption defaults to 'regular' everywhere it's compared, matching the
// server's cart schema default.

const normalizeOption = (priceOption) => priceOption || 'regular';

const sameLineItem = (item, productId, priceOption) =>
  item.productId === productId && normalizeOption(item.priceOption) === normalizeOption(priceOption);

/**
 * Adds a product to the guest cart, or increments quantity if the same
 * product + priceOption combination is already present.
 * @param {Array} cart current guest cart array
 * @param {{productId: string, quantity: number, priceOption?: string}} productData
 * @returns {Array} new cart array — never mutates the input
 */
export function addItemToGuestCart(cart, productData) {
  const priceOption = normalizeOption(productData.priceOption);
  const existingIndex = cart.findIndex((i) => sameLineItem(i, productData.productId, priceOption));

  if (existingIndex !== -1) {
    return cart.map((i, idx) =>
      idx === existingIndex ? { ...i, quantity: i.quantity + productData.quantity } : i,
    );
  }
  return [...cart, { ...productData, priceOption }];
}

/**
 * Sets a line item's quantity, or removes it entirely if quantity <= 0
 * (matches the original's delegate-to-remove behavior exactly).
 */
export function updateGuestCartItemQty(cart, productId, quantity, priceOption = 'regular') {
  if (quantity <= 0) {
    return removeGuestCartItem(cart, productId, priceOption);
  }
  return cart.map((i) =>
    sameLineItem(i, productId, priceOption) ? { ...i, quantity } : i,
  );
}

export function removeGuestCartItem(cart, productId, priceOption = 'regular') {
  return cart.filter((i) => !sameLineItem(i, productId, priceOption));
}
