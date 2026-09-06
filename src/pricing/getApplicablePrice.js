// packages/core/src/pricing/getApplicablePrice.js
// Ported verbatim from client/src/utils/getApplicablePrice.js — pure
// function, no changes needed for RN.

// src/utils/getApplicablePrice.js
//
// The single source of truth for "which ONE price does a shopper actually
// see for this product" — see PRODUCT_VISIBILITY_RULES.md §3a in the
// server repo for the full write-up. Extracted here so ComparePage.jsx and
// ProductAdmin.jsx don't each grow their own copy of this priority logic
// (CardProduct.jsx, ProductDisplayPage.jsx, and Search.jsx implement the
// same rule inline for their own display needs, predating this shared
// helper — if you're touching the rule itself, keep all five in sync).
//
// Priority (never both a regular price and a delivery price at once):
//   1. Stock available (warehouse OR partner) → regular price (btcPrice),
//      "1-3 business days" — same label regardless of which stock source,
//      per the "Regular Price" glossary entry in PRODUCT_VISIBILITY_RULES.md §1.
//   2. No stock at all → the ONE delivery price matching this product's
//      category (§2): price5weeksDelivery for Machine/coffee-maker/
//      capsule-machine, price3weeksDelivery for everything else. The
//      regular price is never shown here even if btcPrice is set.
//   3. Neither applies → null (not purchasable — same "no price to show"
//      state PRODUCT_VISIBILITY_RULES.md §3/§4 already cover).

import { isFiveWeekDeliveryCategory } from './deliveryCategories.js';

/**
 * @param {object} product Full product document (or a plain object with
 *   the same shape) — needs at least btcPrice, price, price3weeksDelivery,
 *   price5weeksDelivery, productType, category, warehouseStock,
 *   partnerStock.
 * @returns {{ price: number, key: "regular"|"3weeks"|"5weeks", label: string, deliveryText: string } | null}
 */
export function getApplicablePrice(product) {
  if (!product) return null;

  const primaryPrice =
    product.btcPrice && product.btcPrice > 0 ? product.btcPrice : product.price;

  const onlineStock = product.warehouseStock?.onlineStock || 0;
  const isPartnerProduct = product.partnerStock?.enabled === true;
  const partnerQty = product.partnerStock?.quantity || 0;
  const hasAvailableStock = onlineStock > 0 || (isPartnerProduct && partnerQty > 0);

  if (primaryPrice > 0 && hasAvailableStock) {
    return {
      price: primaryPrice,
      key: "regular",
      label: "Regular Price",
      deliveryText: "1-3 business days",
    };
  }

  const showFiveWeekDelivery = isFiveWeekDeliveryCategory(
    product.productType,
    product.category,
  );

  if (showFiveWeekDelivery) {
    if (product.price5weeksDelivery > 0) {
      return {
        price: product.price5weeksDelivery,
        key: "5weeks",
        label: "5 Weeks Delivery",
        deliveryText: "~5 weeks (special order)",
      };
    }
  } else if (product.price3weeksDelivery > 0) {
    return {
      price: product.price3weeksDelivery,
      key: "3weeks",
      // Shown to shoppers as "2 weeks" — the backend field/key remains
      // price3weeksDelivery/"3weeks"; this is a display-label-only quirk,
      // see PRODUCT_VISIBILITY_RULES.md §1.
      label: "2 Weeks Delivery",
      deliveryText: "~2 weeks (special order)",
    };
  }

  return null;
}

export default getApplicablePrice;
