// packages/core/src/checkout/gatewayOrder.js
//
// Ported from client/src/pages/CheckoutPage.jsx's handleSubmit — the
// Paystack/Stripe branch's REQUEST-BUILDING half. What happens after the
// server responds still has one genuinely platform-specific step, but
// it's smaller than it first looked:
//   - web: `await stripe.redirectToCheckout({ sessionId: res.data.id })`
//     (Stripe.js) or `window.location.href = res.data.paymentUrl`
//     (Paystack) — see CheckoutPage.jsx itself, unchanged.
//   - mobile: BOTH gateways return a hosted checkout page URL (normalized
//     here as `checkoutUrl`) — Stripe's Checkout Session response has
//     always included a `url` field alongside the `id` web uses, it was
//     just never consumed. That means mobile does NOT need
//     @stripe/stripe-react-native's native Payment Sheet (which needs a
//     PaymentIntent client secret — a different Stripe integration than
//     the Checkout Sessions this server creates) — opening `checkoutUrl`
//     in an in-app browser (expo-web-browser) works for both gateways the
//     same way. See icvng-mobile/src/checkout/openGatewayCheckout.js.
//
// submitGatewayOrder() also returns the raw server response (`data`)
// unmodified, in case a caller needs a field this doesn't normalize.

/**
 * @param {object} params
 * @param {object} params.apiClient
 * @param {object} params.endpoints
 * @param {'stripe'|'paystack'} params.paymentMethod
 * @param {Array} params.orderItems
 * @param {string} params.addressId
 * @param {number} params.subtotal
 * @param {number} params.total
 * @param {number} params.shippingCost
 * @param {string} params.shippingMethodId
 * @param {string} params.currency - the shopper's selected display currency
 * @param {number} [params.convertedSubtotal] - subtotal in `currency`, if
 *   different from NGN (the storage currency) — pass subtotal itself when
 *   currency === 'NGN'
 * @param {number} [params.convertedShipping]
 * @param {number} [params.convertedTotal]
 * @param {number} [params.exchangeRate] - rate used for the conversion above
 * @param {string} [params.customerNotes]
 * @param {{ code: string } | null} [params.giftCardApplied]
 * @returns {{ success: true, data: object } | { success: false, message: string }}
 */
export async function submitGatewayOrder({
  apiClient,
  endpoints,
  paymentMethod,
  orderItems,
  addressId,
  subtotal,
  total,
  shippingCost,
  shippingMethodId,
  currency,
  convertedSubtotal = subtotal,
  convertedShipping = shippingCost,
  convertedTotal = total,
  exchangeRate = 1,
  customerNotes,
  giftCardApplied,
}) {
  const endpoint = paymentMethod === 'stripe' ? endpoints.payment_url : endpoints.paystackPaymentController;
  const isNgn = currency === 'NGN';

  try {
    const res = await apiClient({
      ...endpoint,
      data: {
        list_items: orderItems,
        addressId,
        subTotalAmt: isNgn ? subtotal : convertedSubtotal,
        totalAmt: isNgn ? total : convertedTotal,
        shippingCost: isNgn ? shippingCost : convertedShipping,
        originalAmounts: { subTotalAmt: subtotal, shippingCost, totalAmt: total },
        exchangeRateInfo: { rate: exchangeRate, fromCurrency: 'NGN', toCurrency: currency },
        shippingMethodId,
        currency,
        paymentMethod,
        customerNotes,
        ...(giftCardApplied && { giftCardCode: giftCardApplied.code }),
      },
    });

    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Could not start payment' };
    }
    // Both gateways return a hosted checkout page URL, just under
    // different field names (Stripe: `url`, Paystack: `paymentUrl`) — web
    // only uses Stripe's `id` (for stripe.redirectToCheckout) and
    // Paystack's `paymentUrl` today, but Stripe's response has always
    // also included `url`, a hosted checkout link identical in kind to
    // Paystack's. Normalized here as `checkoutUrl` so a caller (mobile,
    // specifically — see ../../../icvng-mobile/src/checkout/openGatewayCheckout.js)
    // can open either gateway's payment page the same way, without
    // needing @stripe/stripe-react-native's native Payment Sheet (which
    // needs a PaymentIntent client secret, not a Checkout Session — a
    // different Stripe integration than what this server exposes today).
    const checkoutUrl = paymentMethod === 'stripe' ? res.data.url : res.data.paymentUrl;
    return { success: true, data: res.data, checkoutUrl };
  } catch (err) {
    return { success: false, message: err?.response?.data?.message || err.message };
  }
}
