import { createSlice } from '@reduxjs/toolkit';

const initialValue = {
  allCategory: [],
  loadingCategory: false,
  allSubCategory: [],
  allBrands: [],
  allTags: [],
  allAttributes: [],
  product: [],
  categoryStructure: [],
  loadingCategoryStructure: false,
  coffeeRoastAreas: [],
  compatibleSystemStructure: [],
  loadingCompatibleStructure: false,
};

const productSlice = createSlice({
  name: 'product',
  initialState: initialValue,
  reducers: {
    setAllCategory: (state, action) => {
      state.allCategory = [...action.payload];
    },
    setLoadingCategory: (state, action) => {
      state.loadingCategory = action.payload;
    },
    setAllSubCategory: (state, action) => {
      state.allSubCategory = [...action.payload];
    },
    setAllBrands: (state, action) => {
      state.allBrands = [...action.payload];
    },
    setAllTags: (state, action) => {
      state.allTags = [...action.payload];
    },
    setAllAttributes: (state, action) => {
      state.allAttributes = [...action.payload];
    },
    setLoadingCategoryStructure: (state, action) => {
      state.loadingCategoryStructure = action.payload;
    },
    setCategoryStructure: (state, action) => {
      state.categoryStructure = action.payload;
    },
    setCoffeeRoastAreas: (state, action) => {
      state.coffeeRoastAreas = action.payload;
    },
    setCompatibleSystemStructure: (state, action) => {
      state.compatibleSystemStructure = action.payload;
    },
    setLoadingCompatibleStructure: (state, action) => {
      state.loadingCompatibleStructure = action.payload;
    },
  },
});

export const {
  setAllCategory,
  setAllSubCategory,
  setLoadingCategory,
  setAllBrands,
  setAllTags,
  setAllAttributes,
  setCategoryStructure,
  setLoadingCategoryStructure,
  setCoffeeRoastAreas,
  setCompatibleSystemStructure,
  setLoadingCompatibleStructure,
} = productSlice.actions;

export default productSlice.reducer;
