// packages/core/src/checkout/buildOrderItems.js
//
// Ported from client/src/pages/CheckoutPage.jsx's handleSubmit — the exact
// shape every order-creation endpoint (direct bank transfer, Paystack,
// Stripe) expects for list_items.

/**
 * @param {Array} cartItem - server cart array
 * @returns {Array<{productId: string, quantity: number, priceOption: string, selectedPrice: number}>}
 */
export function buildOrderItems(cartItem) {
  return cartItem.map((item) => ({
    productId: item.productId._id,
    quantity: item.quantity,
    priceOption: item.priceOption || 'regular',
    selectedPrice: item.selectedPrice || item.productId.price,
  }));
}
