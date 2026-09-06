// packages/core/src/catalog/sortCategoriesByName.js
//
// Ported from client/src/components/CategoryFilterSection.jsx — categories
// come back from GET /api/category/get in whatever order the DB returns
// them; the storefront always presents them alphabetically. A one-line
// rule, but still a "which order does the user see things in" decision
// that both platforms need to make the same way.
export function sortCategoriesByName(categories = []) {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

export default sortCategoriesByName;
