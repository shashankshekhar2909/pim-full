import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Layout from './components/layout/Layout';
import RequireAuth from './components/auth/RequireAuth';

// Lazy-load pages for route-based code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const SkuDetailPage = lazy(() => import('./pages/SkuDetailPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const ImportProductsPage = lazy(() => import('./pages/ImportProductsPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const PageLoader: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 8 }}>
    <CircularProgress />
  </Box>
);

const App: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — wrapped in Layout */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="skus/:id" element={<SkuDetailPage />} />
                    <Route path="onboarding" element={<OnboardingPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="products/import" element={<ImportProductsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </Layout>
            </RequireAuth>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default App;
