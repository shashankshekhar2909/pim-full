import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Sku, SearchFilters, Facet, SearchSortField, SearchSortOrder } from '@pim/types';
import { apiClient } from '../../services/api';

interface SearchState {
  query: string;
  filters: SearchFilters;
  sortBy: SearchSortField;
  sortOrder: SearchSortOrder;
  results: Sku[];
  facets: Facet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  took: number | null;
}

const initialState: SearchState = {
  query: '',
  filters: {},
  sortBy: 'relevance',
  sortOrder: 'desc',
  results: [],
  facets: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  isLoading: false,
  error: null,
  took: null,
};

export const performSearch = createAsyncThunk(
  'search/perform',
  async (
    params: {
      tenantId: string;
      query?: string;
      filters?: SearchFilters;
      sortBy?: SearchSortField;
      sortOrder?: SearchSortOrder;
      page?: number;
      limit?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const { tenantId, ...searchParams } = params;
      const response = await apiClient.get(`/tenants/${tenantId}/search`, {
        params: searchParams,
      });
      return response.data.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(error.response?.data?.error?.message ?? 'Search failed');
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
      state.page = 1;
    },
    setFilter(state, action: PayloadAction<{ key: string; value: unknown }>) {
      state.filters[action.payload.key] = action.payload.value;
      state.page = 1;
    },
    removeFilter(state, action: PayloadAction<string>) {
      delete state.filters[action.payload];
      state.page = 1;
    },
    clearFilters(state) {
      state.filters = {};
      state.page = 1;
    },
    setSort(state, action: PayloadAction<{ sortBy: SearchSortField; sortOrder: SearchSortOrder }>) {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setLimit(state, action: PayloadAction<number>) {
      state.limit = action.payload;
      state.page = 1;
    },
    clearResults(state) {
      state.results = [];
      state.facets = [];
      state.total = 0;
      state.page = 1;
      state.query = '';
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(performSearch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.results = action.payload.items;
        state.facets = action.payload.facets ?? [];
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
        state.took = action.payload.took ?? null;
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setQuery,
  setFilter,
  removeFilter,
  clearFilters,
  setSort,
  setPage,
  setLimit,
  clearResults,
} = searchSlice.actions;

export default searchSlice.reducer;
