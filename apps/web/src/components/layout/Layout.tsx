import React from 'react';
import { Box, Toolbar } from '@mui/material';
import Header from './Header';
import Navigation from './Navigation';
import { useAppSelector } from '../../store';

interface LayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 64;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen, sidebarCollapsed } = useAppSelector((state) => state.ui);

  const contentMarginLeft = sidebarOpen
    ? sidebarCollapsed
      ? `${DRAWER_COLLAPSED_WIDTH}px`
      : `${DRAWER_WIDTH}px`
    : 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
      <Navigation />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: contentMarginLeft,
          transition: 'margin 0.2s ease',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default Layout;
