import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Box, CircularProgress } from '@mui/material';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Wraps protected routes. Redirects to /login if the user is not
 * authenticated, preserving the intended destination in location state
 * so the login page can redirect back after successful login.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
