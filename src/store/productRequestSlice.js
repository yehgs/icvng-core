import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  adminRequests: [],
  userRequests: [],
  currentRequest: null,
  loading: false,
  error: null,
};

const productRequestSlice = createSlice({
  name: 'productRequest',
  initialState,
  reducers: {
    setAdminRequests: (state, action) => {
      state.adminRequests = action.payload;
    },
    setUserRequests: (state, action) => {
      state.userRequests = action.payload;
    },
    setCurrentRequest: (state, action) => {
      state.currentRequest = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    addRequest: (state, action) => {
      state.userRequests.unshift(action.payload);
    },
    updateRequestStatus: (state, action) => {
      // Update in admin requests list
      const adminIndex = state.adminRequests.findIndex(
        (request) => request._id === action.payload._id
      );
      if (adminIndex !== -1) {
        state.adminRequests[adminIndex] = action.payload;
      }

      // Update in user requests list
      const userIndex = state.userRequests.findIndex(
        (request) => request._id === action.payload._id
      );
      if (userIndex !== -1) {
        state.userRequests[userIndex] = action.payload;
      }

      // Update current request if it's the same
      if (
        state.currentRequest &&
        state.currentRequest._id === action.payload._id
      ) {
        state.currentRequest = action.payload;
      }
    },
    removeRequest: (state, action) => {
      state.adminRequests = state.adminRequests.filter(
        (request) => request._id !== action.payload
      );
      state.userRequests = state.userRequests.filter(
        (request) => request._id !== action.payload
      );
      if (state.currentRequest && state.currentRequest._id === action.payload) {
        state.currentRequest = null;
      }
    },
  },
});

export const {
  setAdminRequests,
  setUserRequests,
  setCurrentRequest,
  setLoading,
  setError,
  addRequest,
  updateRequestStatus,
  removeRequest,
} = productRequestSlice.actions;

export default productRequestSlice.reducer;
