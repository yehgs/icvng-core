// packages/core/src/pricing/deliveryCategories.js
// Single source of truth — previously duplicated (and already drifting in
// comments, see git history) between client/src/config/deliveryCategories.js
// and admin/src/config/deliveryCategories.js. Must still be kept in sync with
// server/controllers/product.controller.js's own copy of this rule.

//
// MUST stay in sync with icvng-admin/src/config/deliveryCategories.js and
// icvng-server/controllers/product.controller.js (isMachineType /
// FIVE_WEEK_DELIVERY_SLUGS).
//
// Controls which products show 5-week delivery pricing vs 2-week ("3-week"
// in the DB/admin — same field, price3weeksDelivery) delivery pricing.
//
// A product is treated as "5-week only" if EITHER signal says so:
//   - productType === "MACHINE" (the explicit product type field), OR
//   - its category slug is one of FIVE_WEEK_DELIVERY_SLUGS
//
// Both signals are checked (not just one) because data quality on either
// field alone isn't fully reliable — e.g. a capsule machine's coffee-pod
// variant might get tagged productType "COFFEE", or a product might not
// have its category populated with a slug on a given API response. Treating
// it as five-week-only if EITHER field indicates it errs on the side of
// showing the correct delivery price rather than silently hiding a machine
// product because one of the two signals was missed.
//
// The second argument accepts THREE shapes, because client/mobile and admin
// each have a different one on hand at their respective call sites:
//   - a plain slug string, e.g. "coffee-maker" (admin's ProductForm.jsx and
//     manualOrderRules.js only have a selected category's slug, not the
//     full category object)
//   - a category object with a .slug property, or an array of either
//     (client/mobile's product API responses embed the full category)
//   - null/undefined (fine — falls through to the productType check alone)
// Silently treating an unrecognized shape as "no match" would be exactly
// the kind of one-signal-missed bug §2 of PRODUCT_VISIBILITY_RULES.md
// documents (a Tassimo machine mis-tagged productType "COFFEE" whose
// category-based signal got dropped) — so this stays deliberately
// permissive rather than assuming one call site's shape.

export const FIVE_WEEK_DELIVERY_SLUGS = ["capsule-machine", "coffee-maker"];

const slugMatches = (slug) =>
  typeof slug === "string" && FIVE_WEEK_DELIVERY_SLUGS.includes(slug);

const categoryMatchesFiveWeekSlug = (category) => {
  if (!category) return false;
  const cats = Array.isArray(category) ? category : [category];
  return cats.some((cat) => {
    if (!cat) return false;
    if (typeof cat === "string") return slugMatches(cat);
    if (typeof cat === "object" && cat.slug) return slugMatches(cat.slug);
    return false;
  });
};

/**
 * Returns true if the product should display 5-week delivery pricing
 * instead of 2-week ("3-week") delivery pricing.
 *
 * @param {string|null|undefined} productType e.g. "MACHINE", "COFFEE", ...
 * @param {object|string|Array|null} [category] either a plain category slug
 *   string, a category object (or array of either) with a .slug property —
 *   whichever shape the caller already has on hand — or omitted entirely.
 * @returns {boolean}
 */
export const isFiveWeekDeliveryCategory = (productType, category = null) =>
  productType === "MACHINE" || categoryMatchesFiveWeekSlug(category);
