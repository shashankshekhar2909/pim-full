import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Sku, SkuWithDetails } from '@pim/types';
import { apiClient } from '../../services/api';

interface ProductState {
  currentSku: SkuWithDetails | null;
  compareList: Sku[];
  favorites: Sku[];
  history: Sku[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  currentSku: null,
  compareList: [],
  favorites: [],
  history: [],
  isLoading: false,
  error: null,
};

export const fetchSku = createAsyncThunk(
  'product/fetchSku',
  async (params: { tenantId: string; skuId: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/tenants/${params.tenantId}/skus/${params.skuId}`
      );
      return response.data.data as SkuWithDetails;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(error.response?.data?.error?.message ?? 'Failed to fetch SKU');
    }
  }
);

export const fetchFavorites = createAsyncThunk(
  'product/fetchFavorites',
  async (params: { tenantId: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/tenants/${params.tenantId}/users/${params.userId}/favorites`
      );
      return response.data.data as Sku[];
    } catch (err: unknown) {
      return rejectWithValue('Failed to fetch favorites');
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    clearCurrentSku(state) {
      state.currentSku = null;
    },
    addToCompare(state, action: PayloadAction<Sku>) {
      if (state.compareList.length >= 4) return;
      const exists = state.compareList.some((s) => s.id === action.payload.id);
      if (!exists) {
        state.compareList.push(action.payload);
      }
    },
    removeFromCompare(state, action: PayloadAction<string>) {
      state.compareList = state.compareList.filter((s) => s.id !== action.payload);
    },
    clearCompareList(state) {
      state.compareList = [];
    },
    addToHistory(state, action: PayloadAction<Sku>) {
      // Keep last 10 viewed SKUs
      state.history = [
        action.payload,
        ...state.history.filter((s) => s.id !== action.payload.id),
      ].slice(0, 10);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSku.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSku.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSku = action.payload;
      })
      .addCase(fetchSku.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchFavorites.fulfilled, (state, action) => {
      state.favorites = action.payload;
    });
  },
});

export const {
  clearCurrentSku,
  addToCompare,
  removeFromCompare,
  clearCompareList,
  addToHistory,
  clearError,
} = productSlice.actions;

export default productSlice.reducer;
