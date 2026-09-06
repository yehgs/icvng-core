// packages/core/src/checkout/bankTransferOrder.js
//
// Ported from client/src/pages/CheckoutPage.jsx's handleSubmit — the
// bank-transfer branch specifically, because it's the one payment path
// that needs no gateway SDK at all (no Stripe.js, no Paystack redirect),
// so it's fully portable as-is. This is also the path a 100%-gift-card
// order goes through regardless of what the customer picked — see the
// comment on `fullyCoveredByGiftCard` in computeCheckoutTotals.js: neither
// Paystack (requires a non-zero charge) nor Stripe (not wired for gift
// cards) can process a zero-remainder order, so it always routes here.
//
// The server independently re-resolves and validates bank details from
// its own settings — it never trusts bankDetails.bankName/accountName/
// accountNumber from the client for the actual order record. Only
// `reference` is used as submitted. Matches the original's own comment on
// this exactly.

/**
 * @param {object} params
 * @param {object} params.apiClient
 * @param {object} params.endpoints
 * @param {Array} params.orderItems - from buildOrderItems()
 * @param {string} params.addressId
 * @param {number} params.subtotal
 * @param {number} params.total
 * @param {number} params.shippingCost
 * @param {string} params.shippingMethodId
 * @param {object} params.bankTransferDetails - from
 *   endpoints.getBankTransferAvailability's response
 *   ({ bankName, accountName, accountNumber, currencyCode })
 * @param {string} params.userId - for building the reference string
 * @param {string} [params.customerNotes]
 * @param {{ code: string } | null} [params.giftCardApplied]
 * @param {boolean} params.fullyCoveredByGiftCard - from computeCheckoutTotals
 * @returns {{ success: true, order: object, fullyCoveredByGiftCard: boolean, bankDetails: object } | { success: false, message: string }}
 */
export async function submitBankTransferOrder({
  apiClient,
  endpoints,
  orderItems,
  addressId,
  subtotal,
  total,
  shippingCost,
  shippingMethodId,
  bankTransferDetails,
  userId,
  customerNotes,
  giftCardApplied,
  fullyCoveredByGiftCard,
}) {
  const bankDetails = {
    bankName: bankTransferDetails?.bankName || '',
    accountName: bankTransferDetails?.accountName || '',
    accountNumber: bankTransferDetails?.accountNumber || '',
    reference: `ICOFFEE-${Date.now()}-${userId}`,
  };

  try {
    const res = await apiClient({
      ...endpoints.directBankTransferOrder,
      data: {
        list_items: orderItems,
        addressId,
        subTotalAmt: subtotal,
        totalAmt: total,
        shippingCost,
        shippingMethodId,
        currency: bankTransferDetails?.currencyCode || 'NGN',
        bankDetails,
        customerNotes,
        ...(giftCardApplied && { giftCardCode: giftCardApplied.code }),
      },
    });

    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Could not place order' };
    }

    return {
      success: true,
      order: res.data.data,
      fullyCoveredByGiftCard,
      bankDetails,
    };
  } catch (err) {
    return { success: false, message: err?.response?.data?.message || err.message };
  }
}
