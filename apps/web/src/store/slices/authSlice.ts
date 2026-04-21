import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, Tenant, AuthTokens } from '@pim/types';
import { apiClient } from '../../services/api';

// ============================================================
// State shape
// ============================================================

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tenant: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ============================================================
// Async thunks
// ============================================================

export const login = createAsyncThunk(
  'auth/login',
  async (
    credentials: { email: string; password: string; tenantSlug: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { user, tenant, tokens } = response.data.data;

      // Persist tokens to localStorage
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      return { user, tenant, tokens } as { user: User; tenant: Tenant; tokens: AuthTokens };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      return rejectWithValue(
        error.response?.data?.error?.message ?? 'Login failed'
      );
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Ignore errors — we always want to clear local state
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
});

export const refreshTokens = createAsyncThunk(
  'auth/refreshTokens',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return rejectWithValue('No refresh token');

      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { tokens } = response.data.data;

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      return tokens as AuthTokens;
    } catch (err: unknown) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return rejectWithValue('Session expired');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.data as User;
    } catch (err: unknown) {
      return rejectWithValue('Failed to fetch user');
    }
  }
);

// ============================================================
// Slice
// ============================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setTokens(state, action: PayloadAction<AuthTokens>) {
      state.tokens = action.payload;
      state.isAuthenticated = true;
    },
    hydrateAuth(
      state,
      action: PayloadAction<{ user: User; tenant: Tenant; tokens: AuthTokens }>
    ) {
      state.user = action.payload.user;
      state.tenant = action.payload.tenant;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    // login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.tenant = null;
      state.tokens = null;
      state.isAuthenticated = false;
    });

    // refreshTokens
    builder
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.tokens = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(refreshTokens.rejected, (state) => {
        state.user = null;
        state.tenant = null;
        state.tokens = null;
        state.isAuthenticated = false;
      });

    // fetchCurrentUser
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setTokens, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
