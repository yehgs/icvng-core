// packages/core/src/checkout/computeCheckoutTotals.js
//
// Ported from client/src/pages/CheckoutPage.jsx's subtotal/total/
// payableTotal calculation. This decides not just what a customer owes,
// but which payment path even gets used — fullyCoveredByGiftCard is what
// routes an order through the bank-transfer endpoint even when the
// customer picked Paystack/Stripe, because a 100%-gift-card order has
// nowhere to go through either gateway (see
// buildBankTransferOrderPayload.js's own comment for why). Getting this
// wrong isn't just a display bug — it can send a real charge attempt for
// an order that should have been free.

/**
 * @param {Array} cartItem - server cart array, each item shaped like
 *   { productId: { price } | string, selectedPrice, quantity }
 * @param {number} shippingCost
 * @param {{ appliedAmount: number } | null} [giftCardApplied]
 * @returns {{
 *   subtotal: number, shippingCost: number, total: number,
 *   giftCardDiscount: number, payableTotal: number,
 *   fullyCoveredByGiftCard: boolean
 * }}
 */
export function computeCheckoutTotals(cartItem, shippingCost, giftCardApplied = null) {
  const subtotal = cartItem.reduce(
    (sum, item) => sum + (item.selectedPrice || item.productId?.price || 0) * item.quantity,
    0,
  );
  const total = subtotal + shippingCost;
  const giftCardDiscount = giftCardApplied?.appliedAmount || 0;
  const payableTotal = Math.max(0, total - giftCardDiscount);
  const fullyCoveredByGiftCard = Boolean(giftCardApplied) && payableTotal <= 0;

  return { subtotal, shippingCost, total, giftCardDiscount, payableTotal, fullyCoveredByGiftCard };
}
