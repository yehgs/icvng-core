// packages/core/src/catalog/buildProductSearchParams.js
//
// Ported from the `merged` object construction inside
// client/src/pages/EnhancedShopPage.jsx's fetchProducts(). That page reads
// filter state from Redux's filterSlice (already shared via
// @yehgs/icvng-core/store — same reducer, same shape, on both
// platforms) and turns it into the exact request body sent to
// SummaryApi.searchProduct (POST /api/product/search-product).
//
// This is the one piece of "which products get fetched" logic that lives
// outside the server: the server's CLIENT_VISIBILITY_FILTER (see
// PRODUCT_VISIBILITY_RULES.md §7) decides what's ALLOWED to come back for
// any given query, but WHICH query gets sent — which category, brand,
// price range, sort — is decided here. If mobile builds this payload any
// differently than web, the two platforms can show different results for
// what a user experiences as "the same filter."
//
// Empty-array and empty-string filter values are normalized to `undefined`
// rather than sent as `[]`/`""` — this matches the original exactly and
// matters: the server's search controller treats an explicitly-present
// empty filter differently from an absent one in some cases.
//
// @param {object} filters - matches filterSlice's `activeFilters` shape:
//   { category, subCategory, brand, compatibleSystem, productType,
//     roastLevel, intensity, blend, minPrice, maxPrice, sort }
// @param {object} [options]
// @param {string} [options.search] - free-text search term (empty string ok)
// @param {number} [options.page] - defaults to 1
// @returns {object} the exact `data` payload to pass alongside
//   endpoints.searchProduct to your api client
export function buildProductSearchParams(filters = {}, options = {}) {
  const { search = "", page = 1 } = options;

  let sortValue = filters.sort;
  if (sortValue === "newest") {
    sortValue = "";
  }

  return {
    search,
    page,
    productType:
      filters.productType?.length > 0 ? filters.productType : undefined,
    category: filters.category || undefined,
    subCategory: filters.subCategory || undefined,
    brand: filters.brand?.length > 0 ? filters.brand : undefined,
    compatibleSystem: filters.compatibleSystem || undefined,
    roastLevel: filters.roastLevel?.length > 0 ? filters.roastLevel : undefined,
    intensity: filters.intensity?.length > 0 ? filters.intensity : undefined,
    blend: filters.blend?.length > 0 ? filters.blend : undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    sort: sortValue,
  };
}

export default buildProductSearchParams;
