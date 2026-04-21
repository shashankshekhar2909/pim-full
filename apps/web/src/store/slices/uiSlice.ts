import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface Modal {
  id: string;
  type: string;
  props?: Record<string, unknown>;
}

interface UiState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  notifications: Notification[];
  modals: Modal[];
  pageTitle: string;
  isGlobalLoading: boolean;
}

const initialState: UiState = {
  theme: 'light',
  sidebarOpen: true,
  sidebarCollapsed: false,
  notifications: [],
  modals: [],
  pageTitle: 'PIM System',
  isGlobalLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapse(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    addNotification(state, action: PayloadAction<Omit<Notification, 'id'>>) {
      state.notifications.push({
        id: `notif-${Date.now()}-${Math.random()}`,
        ...action.payload,
      });
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearNotifications(state) {
      state.notifications = [];
    },
    openModal(state, action: PayloadAction<Omit<Modal, 'id'>>) {
      state.modals.push({
        id: `modal-${Date.now()}`,
        ...action.payload,
      });
    },
    closeModal(state, action: PayloadAction<string>) {
      state.modals = state.modals.filter((m) => m.id !== action.payload);
    },
    closeAllModals(state) {
      state.modals = [];
    },
    setPageTitle(state, action: PayloadAction<string>) {
      state.pageTitle = action.payload;
    },
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.isGlobalLoading = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapse,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  setPageTitle,
  setGlobalLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
