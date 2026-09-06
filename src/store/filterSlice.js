import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Selected filters
  activeFilters: {
    productType: [],
    category: "",
    categoryName: "",
    categorySlug: "",
    subCategory: "",
    subCategoryName: "",
    subCategorySlug: "",
    brand: [],
    brandNames: [],
    brandSlugs: [],
    compatibleSystem: "",
    compatibleSystemName: "",
    compatibleSystemSlug: "",
    roastLevel: [],
    intensity: [],
    blend: [],
    minPrice: "",
    maxPrice: "",
    sort: "newest",
    search: "",
  },
  // Filter data
  filterData: {
    categories: [],
    subCategories: [],
    brands: [],
    categoryMap: {}, // id -> name mapping
    subCategoryMap: {}, // id -> name mapping
    brandMap: {}, // id -> name mapping
    isLoading: false,
  },
  // URL state
  urlState: {
    isUrlFilterActive: false,
    isLoading: false,
    activeUrl: "",
    sourceUrl: "",
    breadcrumbs: [
      { label: "Home", url: "/" },
      { label: "Shop", url: "/shop" },
    ],
    pageTitle: "Shop",
  },
  // UI state
  uiState: {
    expandedSections: {
      productType: false,
      category: true,
      subCategory: false,
      brand: false,
      compatibleSystem: false,
      roastLevel: false,
      intensity: false,
      blend: false,
      price: false,
    },
    isFilterOpen: false, // For mobile filter drawer
  },
};

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    // Set all active filters at once
    setActiveFilters: (state, action) => {
      state.activeFilters = {
        ...state.activeFilters,
        ...action.payload,
      };
    },

    // In your reducers:
    setUrlLoading: (state, action) => {
      state.urlState.isLoading = action.payload;
    },

    // Set a single filter value
    setFilter: (state, action) => {
      const { filterType, value } = action.payload;

      if (Array.isArray(state.activeFilters[filterType])) {
        // Handle array filter values (checkbox groups)
        if (state.activeFilters[filterType].includes(value)) {
          state.activeFilters[filterType] = state.activeFilters[
            filterType
          ].filter((item) => item !== value);
        } else {
          state.activeFilters[filterType] = [
            ...state.activeFilters[filterType],
            value,
          ];
        }
      } else {
        // Handle single filter values (radios, selects)
        state.activeFilters[filterType] = value;
      }
    },

    // Clear a single filter
    clearFilter: (state, action) => {
      const filterType = action.payload;

      if (Array.isArray(state.activeFilters[filterType])) {
        state.activeFilters[filterType] = [];
      } else if (filterType === "priceRange") {
        state.activeFilters.minPrice = "";
        state.activeFilters.maxPrice = "";
      } else if (filterType === "compatibleSystem") {
        state.activeFilters.compatibleSystem = "";
        state.activeFilters.compatibleSystemName = "";
        state.activeFilters.compatibleSystemSlug = "";
      } else {
        state.activeFilters[filterType] = "";
      }
    },

    // Reset all filters to default
    resetFilters: (state) => {
      state.activeFilters = {
        ...initialState.activeFilters,
        search: state.activeFilters.search,
      };
    },

    // Set compatible system filter
    setCompatibleSystemFilter: (state, action) => {
      const { compatibleSystemId, compatibleSystemName, compatibleSystemSlug } =
        action.payload;
      state.activeFilters.compatibleSystem = compatibleSystemId || "";
      state.activeFilters.compatibleSystemName = compatibleSystemName || "";
      state.activeFilters.compatibleSystemSlug = compatibleSystemSlug || "";
    },

    // Set category and related filters
    setCategoryFilter: (state, action) => {
      const { categoryId, categoryName, categorySlug } = action.payload;
      state.activeFilters.category = categoryId || "";
      state.activeFilters.categoryName = categoryName || "";
      state.activeFilters.categorySlug = categorySlug || "";

      // Clear subcategory when category changes
      if (
        state.activeFilters.subCategory &&
        state.activeFilters.category !== categoryId
      ) {
        state.activeFilters.subCategory = "";
        state.activeFilters.subCategoryName = "";
        state.activeFilters.subCategorySlug = "";
      }

      // Set URL filter active state if category is selected
      state.urlState.isUrlFilterActive =
        Boolean(categoryId) || Boolean(state.activeFilters.brand.length);
    },

    // Set subcategory filters
    setSubCategoryFilter: (state, action) => {
      const { subCategoryId, subCategoryName, subCategorySlug } =
        action.payload;
      state.activeFilters.subCategory = subCategoryId || "";
      state.activeFilters.subCategoryName = subCategoryName || "";
      state.activeFilters.subCategorySlug = subCategorySlug || "";

      // Set URL filter active state if subcategory is selected
      state.urlState.isUrlFilterActive =
        Boolean(subCategoryId) ||
        Boolean(state.activeFilters.category) ||
        Boolean(state.activeFilters.brand.length);
    },

    // Set brand filters (can be multiple)
    setBrandFilter: (state, action) => {
      const { brandId, brandName, brandSlug, replace = false } = action.payload;

      if (replace) {
        state.activeFilters.brand = brandId ? [brandId] : [];
        state.activeFilters.brandNames = brandName ? [brandName] : [];
        state.activeFilters.brandSlugs = brandSlug ? [brandSlug] : [];
      } else if (brandId) {
        // Add to existing brands if not already included
        if (!state.activeFilters.brand.includes(brandId)) {
          state.activeFilters.brand.push(brandId);
          if (brandName) state.activeFilters.brandNames.push(brandName);
          if (brandSlug) state.activeFilters.brandSlugs.push(brandSlug);
        }
      }

      // Set URL filter active state if brand is selected
      state.urlState.isUrlFilterActive =
        Boolean(state.activeFilters.brand.length) ||
        Boolean(state.activeFilters.category) ||
        Boolean(state.activeFilters.subCategory);
    },

    // Remove a specific brand
    removeBrandFilter: (state, action) => {
      const { brandId } = action.payload;
      const index = state.activeFilters.brand.indexOf(brandId);

      if (index !== -1) {
        state.activeFilters.brand.splice(index, 1);
        state.activeFilters.brandNames.splice(index, 1);
        state.activeFilters.brandSlugs.splice(index, 1);

        // Update URL filter active state
        state.urlState.isUrlFilterActive =
          Boolean(state.activeFilters.brand.length) ||
          Boolean(state.activeFilters.category) ||
          Boolean(state.activeFilters.subCategory);
      }
    },

    // Set price range
    setPriceRange: (state, action) => {
      const { min, max } = action.payload;
      state.activeFilters.minPrice = min;
      state.activeFilters.maxPrice = max;
    },

    // Set search term
    setSearchTerm: (state, action) => {
      state.activeFilters.search = action.payload;
    },

    // Filter data management
    setFilterCategories: (state, action) => {
      state.filterData.categories = action.payload;

      // Update category map
      const catMap = {};
      action.payload.forEach((cat) => {
        catMap[cat._id] = cat.name;
      });
      state.filterData.categoryMap = catMap;
    },

    setFilterSubCategories: (state, action) => {
      state.filterData.subCategories = action.payload;

      // Update subcategory map
      const subCatMap = {};
      action.payload.forEach((subCat) => {
        subCatMap[subCat._id] = subCat.name;
      });
      state.filterData.subCategoryMap = subCatMap;
    },

    setFilterBrands: (state, action) => {
      state.filterData.brands = action.payload;

      // Update brand map
      const brandMap = {};
      action.payload.forEach((brand) => {
        brandMap[brand._id] = brand.name;
      });
      state.filterData.brandMap = brandMap;
    },

    setFilterLoading: (state, action) => {
      state.filterData.isLoading = action.payload;
    },

    // URL state management
    setUrlFilterActive: (state, action) => {
      state.urlState.isUrlFilterActive = action.payload;
    },

    setBreadcrumbs: (state, action) => {
      state.urlState.breadcrumbs = action.payload;
    },

    setPageTitle: (state, action) => {
      state.urlState.pageTitle = action.payload;
    },

    // UI state management
    toggleExpandedSection: (state, action) => {
      const section = action.payload;
      state.uiState.expandedSections[section] =
        !state.uiState.expandedSections[section];
    },

    setExpandedSection: (state, action) => {
      const { section, isExpanded } = action.payload;
      state.uiState.expandedSections[section] = isExpanded;
    },

    toggleFilterDrawer: (state) => {
      state.uiState.isFilterOpen = !state.uiState.isFilterOpen;
    },

    setFilterDrawer: (state, action) => {
      state.uiState.isFilterOpen = action.payload;
    },

    // Set filters from URL - critical for preserving URL navigation
    setFiltersFromUrl: (state, action) => {
      const { urlFilters, displayNames } = action.payload;

      // Update filter values without triggering navigation
      if (urlFilters.category !== undefined) {
        state.activeFilters.category = urlFilters.category || "";
      }

      if (urlFilters.categorySlug !== undefined) {
        state.activeFilters.categorySlug = urlFilters.categorySlug || "";
      }

      if (displayNames.categoryName !== undefined) {
        state.activeFilters.categoryName = displayNames.categoryName || "";
      }

      if (urlFilters.subCategory !== undefined) {
        state.activeFilters.subCategory = urlFilters.subCategory || "";
      }

      if (urlFilters.subcategorySlug !== undefined) {
        state.activeFilters.subCategorySlug = urlFilters.subcategorySlug || "";
      }

      if (displayNames.subcategoryName !== undefined) {
        state.activeFilters.subCategoryName =
          displayNames.subcategoryName || "";
      }

      // Handle brand as an array
      if (urlFilters.brand) {
        state.activeFilters.brand = urlFilters.brand || [];
      }

      if (displayNames.brandName) {
        state.activeFilters.brandNames = displayNames.brandName
          ? [displayNames.brandName]
          : [];
      }

      if (urlFilters.brandSlug) {
        state.activeFilters.brandSlugs = urlFilters.brandSlug
          ? [urlFilters.brandSlug]
          : [];
      }

      // Update URL state
      if (displayNames.pageTitle) {
        state.urlState.pageTitle = displayNames.pageTitle;
      }

      if (displayNames.breadcrumbs) {
        state.urlState.breadcrumbs = displayNames.breadcrumbs;
      }

      // Set URL filter active state
      state.urlState.isUrlFilterActive =
        Boolean(urlFilters.category) ||
        Boolean(urlFilters.subCategory) ||
        Boolean(urlFilters.brand && urlFilters.brand.length);
    },
  },
});

export const {
  setActiveFilters,
  setFilter,
  setUrlLoading,
  setUrlFilterActive,
  clearFilter,
  resetFilters,
  setCategoryFilter,
  setSubCategoryFilter,
  setCompatibleSystemFilter,
  setBrandFilter,
  removeBrandFilter,
  setPriceRange,
  setSearchTerm,
  setFilterCategories,
  setFilterSubCategories,
  setFilterBrands,
  setFilterLoading,
  setBreadcrumbs,
  setPageTitle,
  toggleExpandedSection,
  setExpandedSection,
  toggleFilterDrawer,
  setFilterDrawer,
  setFiltersFromUrl,
} = filterSlice.actions;

export default filterSlice.reducer;
