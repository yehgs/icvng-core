// packages/core/src/checkout/giftCard.js
//
// Ported from client/src/pages/CheckoutPage.jsx's handleApplyGiftCard.
// The server is the source of truth on validity/remaining balance — this
// just wraps the call; the returned `data` shape (code, appliedAmount,
// remainderToPay, currency) is exactly what computeCheckoutTotals expects
// as its giftCardApplied argument.

/**
 * @returns {{ success: true, data: { code: string, appliedAmount: number, remainderToPay: number, currency: string } } | { success: false, message: string }}
 */
export async function applyGiftCard({ apiClient, endpoints, code, orderAmount }) {
  const trimmed = code?.trim();
  if (!trimmed) {
    return { success: false, message: 'Enter a gift card code' };
  }
  try {
    const res = await apiClient({
      ...endpoints.validateGiftCard,
      data: { code: trimmed, orderAmount },
    });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Invalid gift card' };
    }
    return { success: true, data: res.data.data };
  } catch (err) {
    return { success: false, message: err?.response?.data?.message || err.message };
  }
}
