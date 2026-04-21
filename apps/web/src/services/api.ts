import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================================
// Base client
// ============================================================

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// Request interceptor — inject JWT
// ============================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// Response interceptor — handle 401 & token refresh
// ============================================================

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onTokenRefreshed(newToken: string): void {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't attempt refresh on the refresh/login endpoints themselves
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request until the refresh completes
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken: string = data.data.tokens.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);

        onTokenRefreshed(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear everything and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// Typed request helpers
// ============================================================

import type {
  ApiSuccessResponse,
  Tenant,
  User,
  Sku,
  Category,
  AttributeDefinition,
  DataImport,
  Report,
  PaginatedResult,
} from '@pim/types';

type ApiData<T> = Promise<ApiSuccessResponse<T>>;

// Auth
export const authApi = {
  login: (credentials: { email: string; password: string; tenantSlug: string }) =>
    apiClient.post<ApiSuccessResponse<{ user: User; tenant: Tenant; tokens: unknown }>>(
      '/auth/login',
      credentials
    ),
  logout: () => apiClient.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
  me: () => apiClient.get<ApiSuccessResponse<User>>('/auth/me'),
};

// Tenants
export const tenantsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiSuccessResponse<PaginatedResult<Tenant>>>('/tenants', { params }),
  get: (tenantId: string) =>
    apiClient.get<ApiSuccessResponse<Tenant>>(`/tenants/${tenantId}`),
  create: (data: unknown) =>
    apiClient.post<ApiSuccessResponse<Tenant>>('/tenants', data),
  update: (tenantId: string, data: unknown) =>
    apiClient.patch<ApiSuccessResponse<Tenant>>(`/tenants/${tenantId}`, data),
  delete: (tenantId: string) =>
    apiClient.delete(`/tenants/${tenantId}`),
};

// Categories
export const categoriesApi = {
  list: (tenantId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiSuccessResponse<PaginatedResult<Category>>>(
      `/tenants/${tenantId}/categories`,
      { params }
    ),
  get: (tenantId: string, categoryId: string) =>
    apiClient.get<ApiSuccessResponse<Category>>(`/tenants/${tenantId}/categories/${categoryId}`),
  create: (tenantId: string, data: unknown) =>
    apiClient.post<ApiSuccessResponse<Category>>(`/tenants/${tenantId}/categories`, data),
  update: (tenantId: string, categoryId: string, data: unknown) =>
    apiClient.patch<ApiSuccessResponse<Category>>(
      `/tenants/${tenantId}/categories/${categoryId}`,
      data
    ),
  delete: (tenantId: string, categoryId: string) =>
    apiClient.delete(`/tenants/${tenantId}/categories/${categoryId}`),
};

// SKUs
export const skusApi = {
  list: (tenantId: string, params?: Record<string, unknown>) =>
    apiClient.get<ApiSuccessResponse<PaginatedResult<Sku>>>(
      `/tenants/${tenantId}/skus`,
      { params }
    ),
  get: (tenantId: string, skuId: string) =>
    apiClient.get<ApiSuccessResponse<Sku>>(`/tenants/${tenantId}/skus/${skuId}`),
  create: (tenantId: string, data: unknown) =>
    apiClient.post<ApiSuccessResponse<Sku>>(`/tenants/${tenantId}/skus`, data),
  update: (tenantId: string, skuId: string, data: unknown) =>
    apiClient.patch<ApiSuccessResponse<Sku>>(`/tenants/${tenantId}/skus/${skuId}`, data),
  delete: (tenantId: string, skuId: string) =>
    apiClient.delete(`/tenants/${tenantId}/skus/${skuId}`),
};

// Data Imports
export const importsApi = {
  list: (tenantId: string) =>
    apiClient.get<ApiSuccessResponse<DataImport[]>>(`/tenants/${tenantId}/imports`),
  get: (tenantId: string, importId: string) =>
    apiClient.get<ApiSuccessResponse<DataImport>>(`/tenants/${tenantId}/imports/${importId}`),
  create: (tenantId: string, data: unknown) =>
    apiClient.post<ApiSuccessResponse<DataImport>>(`/tenants/${tenantId}/imports`, data),
};

// Reports
export const reportsApi = {
  list: (tenantId: string) =>
    apiClient.get<ApiSuccessResponse<Report[]>>(`/tenants/${tenantId}/reports`),
  create: (tenantId: string, data: unknown) =>
    apiClient.post<ApiSuccessResponse<Report>>(`/tenants/${tenantId}/reports`, data),
  download: (tenantId: string, reportId: string) =>
    apiClient.get(`/tenants/${tenantId}/reports/${reportId}/download`, {
      responseType: 'blob',
    }),
};
